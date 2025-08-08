const axios = require('axios');

exports.handler = async (event) => {
  console.log('=== FFIEC DIAGNOSTIC START ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  console.log('Query params:', params);

  // Log any FFIEC-related environment variables
  console.log(
    'All environment variables starting with FFIEC:',
    Object.keys(process.env)
      .filter((key) => key.startsWith('FFIEC'))
      .map((key) => ({
        [key]: process.env[key] ? `${process.env[key].substring(0, 3)}...` : 'undefined',
      }))
  );

  // Environment check
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD;
  const token = process.env.FFIEC_TOKEN;

  console.log('Environment variables check:', {
    hasUsername: !!username,
    hasPassword: !!password,
    hasToken: !!token,
    usernameLength: username ? username.length : 0,
    passwordLength: password ? password.length : 0,
    tokenLength: token ? token.length : 0,
  });

  // FAIL FAST if credentials missing
  if (!username || !password || !token) {
    const error = {
      error: 'CREDENTIALS_MISSING',
      message: 'Environment variables not configured',
      missing: {
        FFIEC_USERNAME: !username,
        FFIEC_PASSWORD: !password,
        FFIEC_TOKEN: !token,
      },
    };
    console.log('ERROR - Missing credentials:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(error),
    };
  }

  // Health check endpoint
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'CREDENTIALS_AVAILABLE',
        message: 'All environment variables are configured',
      }),
    };
  }

  // Test basic internet connectivity
  try {
    await axios.get('https://httpbin.org/get', { timeout: 5000 });
    console.log('Internet connectivity: OK');
  } catch (error) {
    console.log('Internet connectivity: FAILED', error.message);
  }

  // Build auth header
  const authString = `${username}:${password}${token}`;
  const authHeader = Buffer.from(authString).toString('base64');
  console.log('Auth string length:', authString.length);
  console.log('Auth header (first 20 chars):', authHeader.substring(0, 20) + '...');

  // Try multiple endpoints with detailed logging
  const endpoints = [
    'https://cdr.ffiec.gov/public/PWS/UBPR/Search',
    'https://cdr.ffiec.gov/public/PWS/CallReport/Search',
    'https://api.ffiec.gov/public/v2/ubpr/financials',
  ];

  const top = parseInt(params.top, 10) || 10;

  for (const endpoint of endpoints) {
    try {
      console.log(`\n--- TRYING ENDPOINT: ${endpoint} ---`);

      const requestConfig = {
        method: 'GET',
        url: endpoint,
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      // Add different params for different endpoints
      if (endpoint.includes('api.ffiec.gov')) {
        requestConfig.params = {
          as_of: '2024-09-30',
          top: top,
          sort: 'assets',
          order: 'desc',
        };
      } else {
        requestConfig.params = {
          reporting_period: '2024-09-30',
          limit: top,
          sort_by: 'total_assets',
          sort_order: 'desc',
        };
      }

      console.log('Request config:', JSON.stringify(requestConfig, null, 2));

      const response = await axios(requestConfig);

      console.log('SUCCESS! Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data type:', typeof response.data);
      console.log('Response data (first 500 chars):', JSON.stringify(response.data).substring(0, 500));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          endpoint_used: endpoint,
          response_status: response.status,
          data_type: typeof response.data,
          data: response.data,
        }),
      };
    } catch (error) {
      console.log(`FAILED - ${endpoint}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        code: error.code,
        config: error.config
          ? {
              url: error.config.url,
              method: error.config.method,
              params: error.config.params,
            }
          : 'no config',
      });

      // Continue to next endpoint
    }
  }

  // All endpoints failed
  const finalError = {
    error: 'ALL_ENDPOINTS_FAILED',
    message: 'All FFIEC endpoints returned errors',
    endpoints_tried: endpoints,
    check_logs: 'See function logs for detailed error information',
  };

  console.log('FINAL ERROR:', finalError);

  return {
    statusCode: 500,
    headers,
    body: JSON.stringify(finalError),
  };
};

