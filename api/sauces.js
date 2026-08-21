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
      let q = supabase.from('sauces').select('*').order('sort_order').order('name');
      // The public e-menu only ever asks for active=1; staff screens fetch
      // everything (including hidden sauces) so they can toggle them back on.
      if (req.query.active === '1') q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!(await requireStaff(req, res))) return;
      const { name, price, sort_order } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Sauce name is required' });
      const { data, error } = await supabase
        .from('sauces')
        .insert({
          name: String(name).trim(),
          price: Number(price) || 0,
          sort_order: Number(sort_order) || 0,
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
      const { data, error } = await supabase
        .from('sauces')
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
      const { error } = await supabase.from('sauces').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('sauces API error:', err);
    res.status(500).json({ error: err.message });
  }
}
