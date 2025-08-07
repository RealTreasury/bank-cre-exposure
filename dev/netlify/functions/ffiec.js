const axios = require('axios');

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Function to get the latest reporting period (e.g., previous quarter-end)
function getLatestReportingPeriod() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-11

    // Determine the last completed quarter
    let lastQuarterMonth, lastQuarterYear;
    if (month < 3) { // Q1 -> prev Q4
        lastQuarterMonth = 12;
        lastQuarterYear = year - 1;
    } else if (month < 6) { // Q2 -> Q1
        lastQuarterMonth = 3;
        lastQuarterYear = year;
    } else if (month < 9) { // Q3 -> Q2
        lastQuarterMonth = 6;
        lastQuarterYear = year;
    } else { // Q4 -> Q3
        lastQuarterMonth = 9;
        lastQuarterYear = year;
    }
    
    // Format to YYYY-MM-DD
    const day = new Date(lastQuarterYear, lastQuarterMonth, 0).getDate();
    return `${lastQuarterYear}-${String(lastQuarterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


exports.handler = async (event, context) => {
  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Get credentials from environment variables
  const { FFIEC_USERNAME, FFIEC_PASSWORD, FFIEC_TOKEN } = process.env;

  // Check if credentials are set
  const hasAllCredentials = FFIEC_USERNAME && FFIEC_PASSWORD && FFIEC_TOKEN;

  // Handle a test request for the admin diagnostic tool
  if (event.queryStringParameters && event.queryStringParameters.test === 'true') {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: hasAllCredentials ? 'CREDENTIALS_SET' : 'CREDENTIALS_MISSING',
        message: hasAllCredentials ? 'Netlify function is active and credentials are in place.' : 'FFIEC credentials are NOT configured in Netlify environment variables.'
      })
    };
  }
  
  // If credentials are not available, return mock data
  if (!hasAllCredentials) {
    console.warn("FFIEC credentials not set. Returning mock data.");
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
          data: generateMockData(),
         _meta: { source: 'mock_fallback', reason: 'Missing FFIEC credentials' }
      })
    };
  }

  // Construct the API request
  const asOfDate = getLatestReportingPeriod();
  const top = event.queryStringParameters?.top || '100';
  const apiUrl = `https://api.ffiec.gov/public/v2/ubpr/financials?as_of=${asOfDate}&top=${top}&sort=assets&order=desc`;

  // Create authentication header
  const authString = `${FFIEC_USERNAME}:${FFIEC_PASSWORD}${FFIEC_TOKEN}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      timeout: 45000 // 45-second timeout
    });

    // The REST API directly returns the array we need in `response.data.data`
    const transformedData = transformData(response.data.data);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          data: transformedData,
          _meta: { source: 'ffiec_api', as_of: asOfDate, count: transformedData.length }
      })
    };

  } catch (error) {
    console.error('Error fetching from FFIEC API:', error.response ? error.response.data : error.message);
    
    // If the API call fails, fallback to mock data
    return {
      statusCode: 200, // Return 200 to not break the frontend, but provide mock data and error info
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: generateMockData(),
        _meta: { 
            source: 'mock_fallback', 
            reason: 'FFIEC API call failed',
            error: error.message 
        }
      })
    };
  }
};

// Standardizes field names to match what the frontend expects
function transformData(apiData) {
    if (!Array.isArray(apiData)) return [];
    return apiData.map(item => ({
        bank_name: item.bank_name,
        total_assets: item.total_assets,
        net_loans_assets: item.net_loans_assets,
        noncurrent_assets_pct: item.noncurrent_assets_pct,
        cd_to_tier1: item.cd_to_tier1,
        cre_to_tier1: item.cre_to_tier1
    }));
}


// Mock data for fallback
function generateMockData() {
  return [
    { bank_name: "JPMorgan Chase Bank (Mock)", total_assets: 3200000, net_loans_assets: 65.5, noncurrent_assets_pct: 0.8, cd_to_tier1: 45.2, cre_to_tier1: 180.3 },
    { bank_name: "Bank of America (Mock)", total_assets: 2500000, net_loans_assets: 68.2, noncurrent_assets_pct: 1.1, cd_to_tier1: 52.1, cre_to_tier1: 205.7 },
    { bank_name: "Wells Fargo Bank (Mock)", total_assets: 1900000, net_loans_assets: 70.1, noncurrent_assets_pct: 1.3, cd_to_tier1: 65.8, cre_to_tier1: 275.4 }
  ];
}

