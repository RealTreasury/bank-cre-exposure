const https = require('https');

exports.handler = async (event) => {
  console.log('FFIEC function request:', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: ''
    };
  }

  // Get credentials from environment variables
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD;
  const token = process.env.FFIEC_TOKEN;

  if (!username || !password || !token) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          error: 'FFIEC credentials not configured',
          details: 'Please set FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN environment variables'
        })
      };
  }

  // Create Basic Auth header
  const authString = `${username}:${password}${token}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  // Build query parameters for UBPR search
  const queryParams = event.queryStringParameters || {};
  const params = new URLSearchParams({
    date: queryParams.date || '2024-09-30',
    top: queryParams.top || '100',
    orderBy: queryParams.orderBy || 'assets',
    orderDirection: queryParams.orderDirection || 'desc'
  });

  const path = `/public/PWS/UBPR/Search?${params.toString()}`;

  // Make the request to FFIEC API
  return new Promise((resolve) => {
    const options = {
      hostname: 'cdr.ffiec.gov',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Handle different response types
        let responseBody;
        try {
          responseBody = JSON.parse(data);
        } catch (e) {
          // If not JSON, return error
          responseBody = { 
            error: 'Invalid JSON response from FFIEC API', 
            statusCode: res.statusCode,
            rawData: data.substring(0, 500) // First 500 chars for debugging
          };
        }

          resolve({
            statusCode: res.statusCode,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
          },
          body: JSON.stringify({
            error: 'Failed to connect to FFIEC API',
            details: error.message
          })
        });
      });

    req.end();
  });
};

