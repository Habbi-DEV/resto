import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Invalid session' });

    const { fileName, fileBase64, contentType } = req.body || {};
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'fileName and fileBase64 are required' });

    const safeName = `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const buffer = Buffer.from(fileBase64, 'base64');

    const EXT_MIME = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
      tiff: 'image/tiff', tif: 'image/tiff', avif: 'image/avif',
      heic: 'image/heic', heif: 'image/heif',
    };
    const ext = fileName.split('.').pop()?.toLowerCase();
    const resolvedType = contentType || EXT_MIME[ext] || 'application/octet-stream';

    const { error } = await supabase.storage
      .from('menu-images')
      .upload(safeName, buffer, { contentType: resolvedType, upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(safeName);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload API error:', err);
    res.status(500).json({ error: err.message });
  }
}