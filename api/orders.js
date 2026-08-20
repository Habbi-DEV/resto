import supabase from './db-client.js';

const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'];
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
const TAX_RATE = 0.10; // 10% VAT

async function requireStaff(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ------------------------------------------------------------- GET
    if (req.method === 'GET') {
      const { id, status, order_type, limit } = req.query;

      if (id) {
        const { data: order, error } = await supabase
          .from('orders').select('*').eq('id', Number(id)).single();
        if (error || !order) return res.status(404).json({ error: 'Order not found' });
        const { data: items } = await supabase
          .from('order_items').select('*').eq('order_id', order.id).order('id');
        return res.status(200).json({ ...order, items });
      }

      let q = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(limit) || 50, 200));
      if (status && status !== 'all') q = q.eq('status', status);
      if (order_type && order_type !== 'all') q = q.eq('order_type', order_type);
      const { data, error } = await q;
      if (error) throw error;

      // Attach line items to every order in one round-trip
      const ids = (data || []).map((o) => o.id);
      let items = [];
      if (ids.length) {
        const { data: it } = await supabase
          .from('order_items').select('*').in('order_id', ids).order('id');
        items = it || [];
      }
      const byOrder = {};
      for (const it of items) (byOrder[it.order_id] ||= []).push(it);
      return res.status(200).json((data || []).map((o) => ({ ...o, items: byOrder[o.id] || [] })));
    }

    // ------------------------------------------------------------ POST
    // Public: both the customer e-menu and the cashier register place orders.
    if (req.method === 'POST') {
      const body = req.body || {};
      const {
        order_type, table_number,
        customer_name, customer_phone, delivery_address,
        notes, payment_method, items,
      } = body;

      if (!ORDER_TYPES.includes(order_type)) {
        return res.status(400).json({ error: 'Invalid order type' });
      }
      if (order_type === 'dine_in' && !table_number) {
        return res.status(400).json({ error: 'A table number is required for dine-in orders' });
      }
      if (order_type === 'delivery' && (!customer_name || !customer_phone || !delivery_address)) {
        return res.status(400).json({ error: 'Delivery orders require customer name, phone and address' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'The order must contain at least one item' });
      }

      const ids = [...new Set(items.map((i) => Number(i.product_id)))];
      const { data: products, error: pErr } = await supabase
        .from('products').select('*').in('id', ids);
      if (pErr) throw pErr;
      const byId = Object.fromEntries((products || []).map((p) => [p.id, p]));

      const rows = [];
      let subtotal = 0;
      for (const it of items) {
        const p = byId[Number(it.product_id)];
        if (!p) return res.status(400).json({ error: 'Unknown product in cart' });
        if (!p.is_available) return res.status(400).json({ error: `"${p.name}" is currently unavailable` });
        const quantity = Math.max(1, Math.min(99, parseInt(it.quantity, 10) || 1));
        const line_total = Math.round(p.price * quantity * 100) / 100;
        subtotal += line_total;
        // line_total is NOT sent: it's a Postgres generated column
        // (unit_price * quantity, stored) — inserting a value for it fails.
        rows.push({ product_id: p.id, product_name: p.name, unit_price: p.price, quantity });
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const tax_amount = Math.round(subtotal * TAX_RATE * 100) / 100;
      const total = Math.round((subtotal + tax_amount) * 100) / 100;

      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          order_type,
          status: 'pending',
          table_number: order_type === 'dine_in' ? Number(table_number) : null,
          customer_name: order_type === 'delivery' ? String(customer_name).trim() : null,
          customer_phone: order_type === 'delivery' ? String(customer_phone).trim() : null,
          delivery_address: order_type === 'delivery' ? String(delivery_address).trim() : null,
          notes: notes ? String(notes).trim() : null,
          payment_method: payment_method === 'cash' ? 'cash' : 'card',
          subtotal, tax_amount, total,
        })
        .select()
        .single();
      if (oErr) throw oErr;

      const { data: savedItems, error: iErr } = await supabase
        .from('order_items')
        .insert(rows.map((r) => ({ ...r, order_id: order.id })))
        .select();
      if (iErr) throw iErr;

      // Stock decrement + audit trail (mirrors the SQL trigger in schema.sql)
      //
      // PERFORMANCE FIX: this used to run as a sequential for-loop — 2
      // awaited round-trips per cart line item (update, then insert), one
      // after another. For an order with 3 items that's 6 chained network
      // calls before the response could return. Under 100 concurrent users
      // this queued up and pushed P95 latency to ~20s.
      //
      // Now all the stock updates + inventory log inserts for this order are
      // fired in parallel with Promise.all, so an order's total extra work is
      // ~1 round-trip instead of 2*N chained ones.
      await Promise.all(
        rows.flatMap((r) => {
          const p = byId[r.product_id];
          const newStock = Math.max(0, (p.stock ?? 0) - r.quantity);
          return [
            supabase.from('products').update({ stock: newStock }).eq('id', p.id),
            supabase.from('inventory_logs').insert({
              product_id: p.id,
              change: -r.quantity,
              reason: 'sale',
              notes: `Sold in order #${order.id + 1000}`,
            }),
          ];
        })
      ).catch((err) => {
        // The order and its items are already committed at this point — a
        // stock/log side-effect failure shouldn't fail the whole request and
        // make the customer think their order wasn't placed. Log it instead
        // so it can be investigated/reconciled.
        console.error(`Stock/inventory update failed for order #${order.id}:`, err);
      });

      // Dine-in seats the table
      if (order_type === 'dine_in') {
        await supabase.from('tables').update({ status: 'occupied' }).eq('table_number', Number(table_number));
      }

      return res.status(201).json({ ...order, items: savedItems });
    }

    // ------------------------------------------------------------- PUT
    // Staff only: advance / cancel an order.
    if (req.method === 'PUT') {
      if (!(await requireStaff(req, res))) return;
      const { id, status } = req.body || {};
      if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

      const { data: existing } = await supabase
        .from('orders').select('*').eq('id', Number(id)).single();
      if (!existing) return res.status(404).json({ error: 'Order not found' });

      const { data, error } = await supabase
        .from('orders').update({ status }).eq('id', Number(id)).select().single();
      if (error) throw error;

      if (['completed', 'cancelled'].includes(status) && existing.table_number) {
        await supabase.from('tables').update({ status: 'available' }).eq('table_number', existing.table_number);
      }
      return res.status(200).json(data);
    }

    // ---------------------------------------------------------- DELETE
    if (req.method === 'DELETE') {
      if (!(await requireStaff(req, res))) return;
      const { id } = req.body || {};
      await supabase.from('order_items').delete().eq('order_id', Number(id));
      const { error } = await supabase.from('orders').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders API error:', err);
    res.status(500).json({ error: err.message });
  }
}