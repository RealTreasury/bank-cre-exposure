const https = require('https');
const axios = require('axios');
const { parseStringPromise, processors } = require('xml2js');
const stripPrefix = processors.stripPrefix;

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

exports.handler = async (event, context) => {
  // Set longer timeout for this function
  context.callbackWaitsForEmptyEventLoop = false;
  
  console.log('FFIEC function request:', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters,
    headers: event.headers
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const isTest = queryParams.test === 'true';

    // Get credentials from environment variables
    const credentials = {
      username: process.env.FFIEC_USERNAME,
      password: process.env.FFIEC_PASSWORD,
      token: process.env.FFIEC_TOKEN
    };

    const envStatus = {
      FFIEC_USERNAME: !!credentials.username,
      FFIEC_PASSWORD: !!credentials.password,
      FFIEC_TOKEN: !!credentials.token,
      hasAllCredentials: !!(credentials.username && credentials.password && credentials.token)
    };

    console.log('Environment check:', envStatus);

    // Handle test requests
    if (isTest) {
      return handleTestRequest(credentials, envStatus);
    }

    // Handle data requests
    return await handleDataRequest(credentials, envStatus, queryParams);

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function handleTestRequest(credentials, envStatus) {
  if (!envStatus.hasAllCredentials) {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: true,
        status: 'CREDENTIALS_MISSING',
        env: envStatus,
        message: 'Configure FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN in Netlify environment variables',
        instructions: 'Go to Netlify Dashboard > Site settings > Environment variables'
      })
    };
  }

  return testFFIECConnection(credentials.username, credentials.password, credentials.token)
    .then(testResult => ({
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: true,
        status: 'SUCCESS',
        env: envStatus,
        ffiecTest: testResult,
        timestamp: new Date().toISOString()
      })
    }))
    .catch(error => ({
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: true,
        status: 'API_ERROR',
        env: envStatus,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }));
}

async function handleDataRequest(credentials, envStatus, queryParams) {
  // For data requests, try real API first, fallback to mock
  if (!envStatus.hasAllCredentials) {
    console.log('Missing credentials, using mock data');
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...generateMockData(),
        _meta: {
          source: 'mock',
          reason: 'Missing FFIEC credentials',
          timestamp: new Date().toISOString()
        }
      })
    };
  }

  try {
    console.log('Attempting to fetch real FFIEC data...');
    const realData = await fetchFFIECData(credentials.username, credentials.password, credentials.token, queryParams);
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...realData,
        _meta: {
          source: 'ffiec_api',
          timestamp: new Date().toISOString(),
          queryParams: queryParams
        }
      })
    };
  } catch (error) {
    console.error('FFIEC API failed:', error.message);
    console.log('Falling back to mock data');
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...generateMockData(),
        _meta: {
          source: 'mock_fallback',
          reason: 'FFIEC API failed: ' + error.message,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
}

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

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Connection timeout after 30 seconds'));
    });

    req.end();
  });
}

async function soapRequest(action, body, authHeader) {
  const url = 'https://cdr.ffiec.gov/public/PWS/WebServices/RetrievalService.asmx';
  const envelope = `<?xml version="1.0" encoding="utf-8"?>\n<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ret="https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService">\n  <soap:Body>\n    <ret:${action}>\n      ${body}\n    </ret:${action}>\n  </soap:Body>\n</soap:Envelope>`;
  const headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': `https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService/${action}`,
    'Authorization': authHeader
  };
  const response = await axios.post(url, envelope, { headers, timeout: 30000 });
  return parseStringPromise(response.data, {
    explicitArray: false,
    tagNameProcessors: [stripPrefix]
  });
}

async function retrieveInstitutions(period, authHeader, limit) {
  const body = `<ret:reportingPeriod>${period}</ret:reportingPeriod>`;
  const parsed = await soapRequest('RetrieveUBPRInstitutions', body, authHeader);
  let list = parsed?.Envelope?.Body?.RetrieveUBPRInstitutionsResponse?.RetrieveUBPRInstitutionsResult?.UBPRInstitution || [];
  if (!Array.isArray(list)) list = [list];
  const mapped = list
    .map(inst => ({
      idrssd: inst.ID_RSSD || inst.IDRSSD || inst.ID,
      name: inst.NAME || inst.Name || inst.InstNm,
      assets: Number(inst.ASSET || inst.TotalAssets || 0)
    }))
    .filter(i => i.idrssd && i.name)
    .sort((a, b) => b.assets - a.assets);
  return mapped.slice(0, limit);
}

async function retrieveUBPRData(period, ids, authHeader) {
  const chunkSize = 50;
  const results = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const idXml = chunk.map(id => `<ret:int>${id}</ret:int>`).join('');
    const body = `<ret:reportingPeriod>${period}</ret:reportingPeriod><ret:idrssdList>${idXml}</ret:idrssdList>`;
    const parsed = await soapRequest('RetrieveUBPRData', body, authHeader);
    let data = parsed?.Envelope?.Body?.RetrieveUBPRDataResponse?.RetrieveUBPRDataResult?.UBPRData || [];
    if (!Array.isArray(data)) data = [data];
    results.push(...data);
  }
  return results;
}

function transformUBPRData(insts, ubprRaw) {
  const codeMap = {
    UBPR2170: 'total_assets',
    UBPR2122: 'net_loans_assets',
    UBPR2107: 'noncurrent_assets_pct',
    UBPR6648: 'cd_to_tier1',
    UBPR6649: 'cre_to_tier1'
  };
  const dataMap = new Map();
  ubprRaw.forEach(item => {
    const id = item.ID_RSSD || item.IDRSSD || item.ID;
    let entries = item.UBPRItem || item.Item || [];
    if (!Array.isArray(entries)) entries = [entries];
    const obj = {};
    entries.forEach(e => {
      const code = e.UBPRCode || e.Code || e.Item || e.ID;
      if (!codeMap[code]) return;
      let val = null;
      for (const key of ['DollarAmt','Amount','Ratio','Value','Data','_']) {
        if (e[key] !== undefined) {
          const num = Number(e[key]);
          if (!isNaN(num)) { val = num; break; }
        }
      }
      if (val !== null) obj[codeMap[code]] = val;
    });
    dataMap.set(String(id), obj);
  });
  return insts.map(inst => {
    const data = dataMap.get(String(inst.idrssd)) || {};
    return {
      bank_name: inst.name,
      total_assets: Number(inst.assets),
      net_loans_assets: data.net_loans_assets ?? null,
      noncurrent_assets_pct: data.noncurrent_assets_pct ?? null,
      cd_to_tier1: data.cd_to_tier1 ?? null,
      cre_to_tier1: data.cre_to_tier1 ?? null
    };
  });
}

function getLatestReportingPeriod() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) * 3 + 3;
  const year = now.getFullYear();
  const month = String(quarter).padStart(2, '0');
  const day = new Date(year, quarter, 0).getDate();
  return `${year}${month}${String(day).padStart(2, '0')}`;
}

async function fetchFFIECData(username, password, token, queryParams) {
  const authHeader = `Basic ${Buffer.from(`${username}:${password}${token}`).toString('base64')}`;
  const top = Math.min(parseInt(queryParams.top) || 100, 500);
  const period = queryParams.reportingPeriod || getLatestReportingPeriod();
  const institutions = await retrieveInstitutions(period, authHeader, top * 2);
  const selected = institutions.slice(0, top);
  const ids = selected.map(i => i.idrssd);
  const ubprRaw = await retrieveUBPRData(period, ids, authHeader);
  const data = transformUBPRData(selected, ubprRaw).sort((a, b) => b.total_assets - a.total_assets);
  return { data, recordCount: data.length };
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
