const axios = require('axios');

// Correct FFIEC PWS API base URL
const PWS_BASE_URL = 'https://cdr.ffiec.gov/public/PWS';

// Mock response when credentials are missing or API fails
function buildMockData(limit) {
  const mockBanks = [
    {
      bank_name: "JPMorgan Chase Bank, National Association",
      total_assets: 3200000000,
      net_loans_assets: 65.5,
      noncurrent_assets_pct: 0.8,
      cd_to_tier1: 45.2,
      cre_to_tier1: 180.3
    },
    {
      bank_name: "Bank of America, National Association", 
      total_assets: 2500000000,
      net_loans_assets: 68.2,
      noncurrent_assets_pct: 1.1,
      cd_to_tier1: 52.1,
      cre_to_tier1: 205.7
    },
    {
      bank_name: "Wells Fargo Bank, National Association",
      total_assets: 1900000000,
      net_loans_assets: 70.1,
      noncurrent_assets_pct: 1.3,
      cd_to_tier1: 65.8,
      cre_to_tier1: 275.4
    },
    {
      bank_name: "Citibank, National Association",
      total_assets: 1700000000,
      net_loans_assets: 62.3,
      noncurrent_assets_pct: 0.9,
      cd_to_tier1: 38.7,
      cre_to_tier1: 165.2
    },
    {
      bank_name: "U.S. Bank National Association",
      total_assets: 550000000,
      net_loans_assets: 72.8,
      noncurrent_assets_pct: 1.8,
      cd_to_tier1: 89.3,
      cre_to_tier1: 345.6
    }
  ];

  return {
    _meta: {
      source: 'mock_data',
      timestamp: new Date().toISOString(),
      record_count: Math.min(limit, mockBanks.length)
    },
    data: mockBanks.slice(0, limit)
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function getAuthHeaders(username, password, token) {
  const authString = `${username}:${password}${token}`;
  const encoded = Buffer.from(authString).toString('base64');
  return {
    'Authorization': `Basic ${encoded}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

async function searchUBPR(headers, params = {}) {
  // Try multiple FFIEC endpoints to find working one
  const endpoints = [
    `${PWS_BASE_URL}/UBPR/Search`,
    `${PWS_BASE_URL}/CallReport/Search`,
    'https://api.ffiec.gov/public/v2/ubpr/financials'
  ];

  const searchParams = {
    reporting_period: '2024-09-30',
    limit: params.top || 100,
    sort_by: 'total_assets',
    sort_order: 'desc',
    top: params.top || 100,
    as_of: '2024-09-30'
  };

  let lastError;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const response = await axios.get(endpoint, {
        headers: endpoint.includes('api.ffiec.gov') ? { 'Accept': 'application/json' } : headers,
        params: searchParams,
        timeout: 30000
      });

      console.log(`Success with endpoint: ${endpoint}`);
      return response.data;
    } catch (error) {
      console.warn(`Endpoint ${endpoint} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError;
}

exports.handler = async (event) => {
  console.log('FFIEC function called with event:', JSON.stringify(event, null, 2));

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 204, 
      headers: CORS_HEADERS, 
      body: '' 
    };
  }

  const params = event.queryStringParameters || {};
  console.log('Query parameters:', params);

  // Health check endpoint
  if (params.test === 'true') {
    const username = process.env.FFIEC_USERNAME;
    const password = process.env.FFIEC_PASSWORD;
    const token = process.env.FFIEC_TOKEN;

    if (!username || !password || !token) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'CREDENTIALS_MISSING',
          message: 'FFIEC credentials not configured in environment variables',
          env: {
            FFIEC_USERNAME: !!username,
            FFIEC_PASSWORD: !!password,
            FFIEC_TOKEN: !!token
          }
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        status: 'OK',
        message: 'FFIEC credentials are configured',
        endpoint: PWS_BASE_URL
      })
    };
  }

  // Main data request
  const top = parseInt(params.top, 10) || 100;
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD; 
  const token = process.env.FFIEC_TOKEN;

  // If credentials are missing, return mock data
  if (!username || !password || !token) {
    console.warn('FFIEC credentials missing. Using mock data.');
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(buildMockData(top))
    };
  }

  try {
    const headers = getAuthHeaders(username, password, token);
    const data = await searchUBPR(headers, { top });
    
    // Add metadata
    const response = {
      _meta: {
        source: 'ffiec_api',
        timestamp: new Date().toISOString(),
        endpoint: PWS_BASE_URL,
        record_count: Array.isArray(data) ? data.length : (data.data ? data.data.length : 0)
      },
      data: Array.isArray(data) ? data : data.data || data
    };

    console.log(`Successfully fetched ${response._meta.record_count} records from FFIEC`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('FFIEC API error:', error.message);
    
    // Return mock data on API failure
    const mockResponse = buildMockData(top);
    mockResponse._meta.source = 'mock_data_fallback';
    mockResponse._meta.error = error.message;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(mockResponse)
    };
  }
};
