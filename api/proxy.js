module.exports = async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  try {
    const r = await fetch(decodeURIComponent(url));
    const data = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'max-age=30');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Proxy fetch failed' });
  }
};
