const https = require('https');

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

  const queryString = params.toString();
  const path = `/fred/series/observations?${queryString}`;

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.stlouisfed.org',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let responseBody;
        try {
          responseBody = JSON.parse(data);
        } catch (e) {
          responseBody = { error: 'Invalid JSON response', rawData: data };
        }

        resolve({
          statusCode: res.statusCode,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(responseBody)
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Failed to connect to FRED API',
          details: error.message 
        })
      });
    });

    req.end();
  });
};
