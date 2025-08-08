const axios = require('axios');

// Generate last 12 quarter-end dates (newest → oldest)
function generateQuarterEnds() {
  const today = new Date();
  const quarters = ['12-31', '09-30', '06-30', '03-31'];
  const periods = [];
  for (let y = today.getFullYear(); periods.length < 12; y--) {
    for (const q of quarters) {
      const candidate = `${y}-${q}`;
      if (new Date(candidate) <= today) periods.push(candidate);
      if (periods.length >= 12) break;
    }
  }
  return periods;
}

exports.handler = async (event) => {
  console.log('=== FFIEC FUNCTION START ===');
  console.log('Query params:', event.queryStringParameters);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const params = event.queryStringParameters || {};
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;

  console.log('Environment check:', {
    hasUsername: !!username,
    hasToken: !!token,
  });

  // Credentials check
  if (!username || !token) {
    const missing = [];
    if (!username) missing.push('FFIEC_USERNAME');
    if (!token) missing.push('FFIEC_TOKEN');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'CREDENTIALS_MISSING',
        message: `Missing environment variables: ${missing.join(', ')}`,
        missing,
        env: {
          hasUsername: !!username,
          hasToken: !!token,
        },
      }),
    };
  }

  // Health check
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'CREDENTIALS_AVAILABLE',
        service: 'REST_BASIC_AUTH',
        endpoint: 'https://cdr.ffiec.gov/public/PWS/UBPR/Search',
        authMethod: 'HTTP Basic',
        env: {
          hasUsername: true,
          hasToken: true,
        },
      }),
    };
  }

  const periods = generateQuarterEnds();

  if ((params.list_periods || '').toString() === 'true') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ periods }),
    };
  }

  let reportingPeriod = (params.reporting_period || '').trim();
  if (reportingPeriod) {
    if (!periods.includes(reportingPeriod)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'INVALID_INPUT',
          message: 'reporting_period must be one of the last 12 valid ISO quarter-end dates',
          validPeriods: periods,
        }),
      };
    }
  } else {
    reportingPeriod = periods[0];
  }

  const limit = parseInt(params.top, 10) || 50;

  const authHeader = Buffer.from(`${username}:${token}`).toString('base64');

  try {
    const response = await axios.get('https://cdr.ffiec.gov/public/PWS/UBPR/Search', {
      params: {
        reporting_period: reportingPeriod,
        limit,
        sort_by: 'total_assets',
        sort_order: 'desc',
        metrics: 'bank_name,total_assets,net_loans_assets,noncurrent_assets_pct,cd_to_tier1,cre_to_tier1',
      },
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    const data = Array.isArray(response.data?.data) ? response.data.data : [];

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        data,
        _meta: {
          source: 'ffiec_rest_api_real_data',
          recordCount: data.length,
          reportingPeriod,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('FFIEC API Error:', error);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;

    return {
      statusCode: status,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'FFIEC_API_ERROR',
        message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

