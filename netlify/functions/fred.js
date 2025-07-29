exports.handler = async (event) => {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'FRED_API_KEY not configured' })
    };
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  params.set('api_key', apiKey);
  params.set('file_type', 'json');

  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: response.ok ? 200 : response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
