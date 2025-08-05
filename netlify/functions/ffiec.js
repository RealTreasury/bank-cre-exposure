const https = require('https');

exports.handler = async (event) => {
  // Get credentials from environment variables
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD; 
  const token = process.env.FFIEC_TOKEN;

  if (!username || !password || !token) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'FFIEC credentials not configured',
        details: 'Please set FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN environment variables'
      })
    };
  }

  // Parse the endpoint from query parameters
  const { endpoint = 'UBPR/Search', ...params } = event.queryStringParameters || {};

  // Create Basic Auth header
  const authString = `${username}:${password}${token}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  // Default parameters for UBPR search
  const defaultParams = {
    date: '2024-09-30',
    top: '100',
    orderBy: 'assets',
    orderDirection: 'desc'
  };

  // Merge with provided parameters
  const finalParams = { ...defaultParams, ...params };
  
  // Build query string
  const queryString = new URLSearchParams(finalParams).toString();
  const path = `/public/PWS/${endpoint}?${queryString}`;

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
          // If not JSON, return raw data
          responseBody = { rawData: data };
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
          error: 'Failed to connect to FFIEC API',
          details: error.message 
        })
      });
    });

    req.end();
  });
};

