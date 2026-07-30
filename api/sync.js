export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = 'http://198.54.114.177/api/sync.php';
  
  try {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Host': 'multiforteresources.com',
        'User-Agent': 'Vercel Serverless Proxy'
      }
    };

    if (req.method === 'POST' || req.method === 'PUT') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const apiRes = await fetch(targetUrl, options);
    const contentType = apiRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const body = await apiRes.text();
    return res.status(apiRes.status).send(body);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Proxy connection to cPanel failed: ' + error.message
    });
  }
}
