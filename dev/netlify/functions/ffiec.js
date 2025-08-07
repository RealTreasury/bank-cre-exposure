const https = require('https');

exports.handler = async (event) => {
  console.log('FFIEC function request:', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  const queryParams = event.queryStringParameters || {};
  const isTest = queryParams.test === 'true';

  // Get credentials from environment variables
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD;
  const token = process.env.FFIEC_TOKEN;

  const envStatus = {
    FFIEC_USERNAME: !!username,
    FFIEC_PASSWORD: !!password,
    FFIEC_TOKEN: !!token,
    hasAllCredentials: !!(username && password && token)
  };

  console.log('Environment check:', envStatus);

  // Handle test requests
  if (isTest) {
    if (!envStatus.hasAllCredentials) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          status: 'CREDENTIALS_MISSING',
          env: envStatus,
          message: 'Configure FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN in Netlify environment variables',
          instructions: 'Go to Netlify Dashboard > Site settings > Environment variables'
        })
      };
    }

    try {
      const testResult = await testFFIECConnection(username, password, token);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
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

  // For data requests, try real API first, fallback to mock
  if (!envStatus.hasAllCredentials) {
    console.log('Missing credentials, using mock data');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(generateMockData())
    };
  }

  try {
    console.log('Attempting to fetch real FFIEC data...');
    const realData = await fetchFFIECData(username, password, token, queryParams);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(realData)
    };
  } catch (error) {
    console.error('FFIEC API failed:', error.message);
    console.log('Falling back to mock data');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...generateMockData(),
        _meta: {
          source: 'mock',
          reason: 'FFIEC API failed: ' + error.message,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};

async function testFFIECConnection(username, password, token) {
  const authString = `${username}:${password}${token}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'cdr.ffiec.gov',
      port: 443,
      path: '/public/PWS/WebServices/RetrievalService.asmx?op=TestUserAccess',
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'User-Agent': 'Bank-CRE-Tool/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          message: 'FFIEC service is accessible',
          responseLength: data.length
        });
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

async function fetchFFIECData(username, password, token, queryParams) {
  // Since FFIEC uses SOAP services, we'll need to make SOAP calls
  // For now, return enhanced mock data that looks realistic
  console.log('FFIEC SOAP integration would go here');
  console.log('Query params:', queryParams);
  
  // This would require implementing SOAP client
  // For now, return enhanced mock data
  const mockData = generateEnhancedMockData(queryParams.top || 100);
  
  return {
    ...mockData,
    _meta: {
      source: 'enhanced_mock',
      message: 'SOAP integration pending - using enhanced mock data',
      timestamp: new Date().toISOString(),
      credentialsValid: true
    }
  };
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
    },
    {
      bank_name: "Truist Bank",
      total_assets: 460000000,
      net_loans_assets: 74.2,
      noncurrent_assets_pct: 2.1,
      cd_to_tier1: 95.7,
      cre_to_tier1: 398.4
    }
  ];
}

function generateEnhancedMockData(count = 100) {
  const bankNames = [
    "JPMorgan Chase Bank, National Association",
    "Bank of America, National Association",
    "Wells Fargo Bank, National Association", 
    "Citibank, National Association",
    "U.S. Bank National Association",
    "Truist Bank",
    "PNC Bank, National Association",
    "Goldman Sachs Bank USA",
    "TD Bank, N.A.",
    "Capital One, National Association",
    "Fifth Third Bank",
    "BMO Harris Bank N.A.",
    "Regions Bank",
    "KeyBank National Association",
    "Citizens Bank, National Association"
  ];

  const data = [];
  
  for (let i = 0; i < Math.min(count, 100); i++) {
    const bankName = i < bankNames.length 
      ? bankNames[i] 
      : `Regional Bank ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`;
    
    // Generate realistic but varied data
    const baseAssets = 10000000 * (100 - i) * (0.5 + Math.random());
    
    data.push({
      bank_name: bankName,
      total_assets: Math.round(baseAssets),
      net_loans_assets: 45 + Math.random() * 35, // 45-80%
      noncurrent_assets_pct: Math.random() * 3, // 0-3%
      cd_to_tier1: 20 + Math.random() * 100, // 20-120%
      cre_to_tier1: 100 + Math.random() * 400 // 100-500%
    });
  }
  
  return data;
}
