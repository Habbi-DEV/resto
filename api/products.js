import supabase from './db-client.js';

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
    if (req.method === 'GET') {
      let q = supabase.from('products').select('*').order('category_id').order('name');
      if (req.query.category_id) q = q.eq('category_id', Number(req.query.category_id));
      if (req.query.available === '1') q = q.eq('is_available', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!(await requireStaff(req, res))) return;
      const { name, description, price, category_id, image_url, stock, is_available } = req.body || {};
      if (!name || price == null || isNaN(Number(price))) {
        return res.status(400).json({ error: 'Product name and a valid price are required' });
      }
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: String(name).trim(),
          description: description || '',
          price: Number(price),
          category_id: category_id ? Number(category_id) : null,
          image_url: image_url || '',
          stock: Number(stock) || 0,
          is_available: is_available !== false,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      if (!(await requireStaff(req, res))) return;
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (fields.price != null) fields.price = Number(fields.price);
      if (fields.stock != null) fields.stock = Number(fields.stock);
      const { data, error } = await supabase
        .from('products')
        .update(fields)
        .eq('id', Number(id))
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      if (!(await requireStaff(req, res))) return;
      const { id } = req.body || {};
      const { error } = await supabase.from('products').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('products API error:', err);
    res.status(500).json({ error: err.message });
  }
}
