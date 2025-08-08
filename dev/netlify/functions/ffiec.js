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
  // Default parameters for UBPR search
  const searchParams = {
    // Reporting period - use latest available (Q3 2024)
    reporting_period: '2024-09-30',
    // Number of institutions to return
    limit: params.top || 100,
    // Sort by total assets descending
    sort_by: 'total_assets',
    sort_order: 'desc',
    // Include key CRE metrics
    metrics: [
      'total_assets',
      'net_loans_assets', 
      'noncurrent_assets_pct',
      'cd_to_tier1',
      'cre_to_tier1'
    ].join(','),
    ...params
  };

  const url = `${PWS_BASE_URL}/UBPR/Search`;
  
  console.log('Making UBPR search request to:', url);
  console.log('Search parameters:', searchParams);

  const response = await axios.get(url, {
    headers,
    params: searchParams,
    timeout: 30000 // 30 second timeout
  });

  return response.data;
}

exports.handler = async (event) => {
  console.log('FFIEC function called with event:', event);

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

    // Test the credentials with a simple request
    try {
      const headers = getAuthHeaders(username, password, token);
      
      // Try a simple institution lookup as a test
      const testUrl = `${PWS_BASE_URL}/Institution/Find/628`;
      await axios.get(testUrl, { 
        headers, 
        timeout: 10000 
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'OK',
          message: 'FFIEC credentials are valid and API is accessible',
          endpoint: PWS_BASE_URL
        })
      };
    } catch (error) {
      console.error('FFIEC test request failed:', error.message);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'API_ERROR',
          message: 'FFIEC API connection failed',
          error: error.message,
          endpoint: PWS_BASE_URL
        })
      };
    }
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
        source: 'ffiec_pws_api',
        timestamp: new Date().toISOString(),
        endpoint: PWS_BASE_URL,
        record_count: Array.isArray(data) ? data.length : (data.data ? data.data.length : 0)
      },
      data: Array.isArray(data) ? data : data.data || data
    };

    console.log(`Successfully fetched ${response._meta.record_count} records from FFIEC PWS`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('FFIEC PWS API error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

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
