// Replace dev/netlify/functions/ffiec.js with this
const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  
  // Check credentials first
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;
  
  if (!username || !token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'MISSING_CREDENTIALS',
        message: 'FFIEC_USERNAME and FFIEC_TOKEN environment variables are required',
        instructions: 'Set these in your Netlify dashboard under Site settings > Environment variables'
      })
    };
  }

  try {
    // Health check
    if (params.test === 'true') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'CREDENTIALS_AVAILABLE',
          message: 'Function has credentials and is ready',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Periods list
    if (params.list_periods === 'true') {
      const periods = generatePeriods();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods })
      };
    }

    // Main data fetch - REAL DATA ONLY
    const reportingPeriod = params.reporting_period || generatePeriods()[0];
    const limit = Math.min(parseInt(params.top, 10) || 100, 500);

    console.log(`Fetching real FFIEC data for period: ${reportingPeriod}, limit: ${limit}`);

    const data = await fetchFFIECData(username, token, reportingPeriod, limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        _meta: {
          reportingPeriod,
          source: 'ffiec_real_api',
          count: data.length,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('FFIEC API Error:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'FFIEC_API_FAILED',
        message: error.message,
        details: 'Check FFIEC credentials and API status',
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function fetchFFIECData(username, token, reportingPeriod, limit) {
  const auth = Buffer.from(`${username}:${token}`).toString('base64');
  const repdte = reportingPeriod.replace(/-/g, '');
  
  console.log(`Making FFIEC API request for REPDTE: ${repdte}`);
  
  const response = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'User-Agent': 'BankCREExposure/1.0'
    },
    params: {
      filters: `REPDTE:${repdte}`,
      limit: Math.min(limit, 500),
      format: 'json'
    },
    timeout: 30000
  });

  let rawData = response.data;
  if (!Array.isArray(rawData)) {
    rawData = rawData.data || [];
  }

  if (rawData.length === 0) {
    throw new Error(`No bank data available for reporting period ${reportingPeriod}. Try a different period or check FFIEC data availability.`);
  }

  console.log(`Successfully retrieved ${rawData.length} bank records from FFIEC`);

  // Transform to required format
  return rawData.map(bank => ({
    bank_name: bank.NAME || bank.INSTNAME || 'Unknown Bank',
    rssd_id: bank.IDRSSD || bank.ID_RSSD || '',
    total_assets: parseNumber(bank.TA) || parseNumber(bank.ASSET),
    cre_to_tier1: parseNumber(bank.UBPR3535),
    cd_to_tier1: parseNumber(bank.UBPR3536), 
    net_loans_assets: parseNumber(bank.UBPR2122),
    noncurrent_assets_pct: parseNumber(bank.UBPR5411),
    total_risk_based_capital_ratio: parseNumber(bank.UBPR7206),
    state: bank.STNAME || bank.STATE,
    city: bank.CITY
  })).filter(bank => bank.total_assets > 0); // Only return banks with valid asset data
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function generatePeriods() {
  const quarters = ['12-31', '09-30', '06-30', '03-31'];
  const periods = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear; year >= currentYear - 3; year--) {
    for (const quarter of quarters) {
      periods.push(`${year}-${quarter}`);
    }
  }
  
  return periods.slice(0, 12);
}
