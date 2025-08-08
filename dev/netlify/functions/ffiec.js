const axios = require('axios');

const API_URL = 'https://api.ffiec.gov/public/v2/ubpr/financials';

// Simple mock response used when credentials are missing or the API fails.
function buildMockData(limit) {
  return {
    mock: true,
    data: Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      message: 'Mock FFIEC data'
    }))
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const params = event.queryStringParameters || {};

  // Health check endpoint
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: 'ok' }),
    };
  }

  const top = parseInt(params.top, 10) || 10;

  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD;
  const token = process.env.FFIEC_TOKEN;

  // If any credentials are missing, return mock data immediately.
  if (!username || !password || !token) {
    console.warn('FFIEC credentials missing. Using mock data.');
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(buildMockData(top)),
    };
  }

  const auth = Buffer.from(`${username}:${password}${token}`).toString('base64');
  const url = `${API_URL}?top=${top}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    const message = error.response?.status
      ? `FFIEC API error: ${error.response.status}`
      : `FFIEC API request failed: ${error.message}`;
    console.error(message);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(buildMockData(top)),
    };
  }
};
