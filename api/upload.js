const store = require('./store');

module.exports = async (req, res) => {
  store.handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = store.parseBody(req);
    // Support data URL direct uploads (zero S3/storage requirement for Vercel)
    if (body.data) {
      return res.status(200).json({
        url: body.data,
        name: body.name || 'attachment',
        size: body.size || body.data.length,
        mimetype: body.type || 'image/png'
      });
    }

    // Default mock response if raw upload
    res.status(200).json({
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      name: 'uploaded-file.jpg',
      size: 1024,
      mimetype: 'image/jpeg'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
