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

  const queryParams = event.queryStringParameters || {};
  const isTest = queryParams.test === 'true';
  const envStatus = {
    FFIEC_USERNAME: !!username,
    FFIEC_PASSWORD: !!password,
    FFIEC_TOKEN: !!token,
    hasAllCredentials: !!(username && password && token)
  };

  console.log('Environment check:', envStatus);

  // Handle test mode with clearer messaging
  if (isTest) {
    if (!username || !password || !token) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          status: 'CREDENTIALS_MISSING',
          env: envStatus,
          error: 'FFIEC credentials not configured in Netlify environment',
          message: 'Set FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN in Netlify dashboard'
        })
      };
    }

    // Test with actual FFIEC API call
    try {
      const testResult = await testFFIECConnection(username, password, token);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          status: 'SUCCESS',
          env: envStatus,
          ffiecTest: testResult
        })
      };
    } catch (error) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          status: 'API_ERROR',
          env: envStatus,
          error: error.message
        })
      };
    }
  }

  // For actual data requests, clearly indicate when using mock data
  if (!username || !password || !token) {
    console.log('Using mock data due to missing credentials');
    const mockData = generateMockData();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isMockData: true,
        status: 'USING_MOCK_DATA',
        reason: 'FFIEC credentials not configured',
        data: mockData,
        message: 'Configure FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN in Netlify to get real data'
      })
    };
  }

  // Try to fetch real FFIEC data
  try {
    const realData = await fetchRealFFIECData(username, password, token, queryParams);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isMockData: false,
        status: 'SUCCESS',
        data: realData,
        recordCount: realData.length
      })
    };
  } catch (error) {
    console.error('FFIEC API failed, using mock data:', error);
    const mockData = generateMockData();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isMockData: true,
        status: 'API_FALLBACK',
        error: error.message,
        data: mockData,
        message: 'FFIEC API failed, using mock data'
      })
    };
  }
};

async function testFFIECConnection(username, password, token) {
  const authString = `${username}:${password}${token}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  // Test with a simple institution lookup
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'cdr.ffiec.gov',
      port: 443,
      path: '/public/api/v1/institutions?limit=1',
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Bank-CRE-Tool/1.0)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: true,
            statusCode: res.statusCode,
            sampleData: parsed
          });
        } catch (e) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: 'Invalid JSON response',
            rawResponse: data.substring(0, 500)
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

async function fetchRealFFIECData(username, password, token, queryParams) {
  const authString = `${username}:${password}${token}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
  
  const top = queryParams.top || 100;
  const date = queryParams.date || '20240930';

  // Try the public UBPR API endpoint
  const params = new URLSearchParams({
    'as_of': '2024-09-30',
    'top': top,
    'sort': 'assets',
    'order': 'desc'
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ffiec.gov',
      port: 443,
      path: `/public/v2/ubpr/financials?${params.toString()}`,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Bank-CRE-Tool/1.0)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data && Array.isArray(parsed.data)) {
            resolve(parsed.data);
          } else if (Array.isArray(parsed)) {
            resolve(parsed);
          } else {
            reject(new Error('Unexpected response format from FFIEC API'));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON from FFIEC: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function generateMockData() {
  return [
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
}
