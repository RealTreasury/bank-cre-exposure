// Netlify function for FFIEC UBPR data
const axios = require('axios');

const UBPR_BASE = 'https://api.ffiec.gov/public/v2/ubpr';

function getAuthConfig() {
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;
  if (!username || !token) return null;
  return { auth: { username, password: token } };
}

function latestReleasedQuarterEnd(today = new Date()) {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  let yy = y, mm = 3, dd = 31;
  if (m >= 10)      { mm = 6; dd = 30; }
  else if (m >= 7)  { mm = 3; dd = 31; }
  else if (m >= 4)  { mm = 3; dd = 31; }
  else              { yy = y - 1; mm = 12; dd = 31; }
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function generatePeriodsFallback() {
  const periods = [];
  const today = new Date(latestReleasedQuarterEnd());
  const quarters = ['12-31', '09-30', '06-30', '03-31'];
  for (let y = today.getFullYear(); periods.length < 12; y--) {
    for (const q of quarters) {
      const iso = `${y}-${q}`;
      if (new Date(iso) <= today) periods.push(iso);
      if (periods.length >= 12) break;
    }
  }
  return periods;
}

async function fetchUBPR(endpoint, params = {}) {
  const auth = getAuthConfig();
  if (!auth) throw new Error('Missing credentials');
  const url = `${UBPR_BASE}${endpoint}`;
  try {
    const res = await axios.get(url, { ...auth, params, timeout: 30000 });
    return res.data;
  } catch (error) {
    console.error('UBPR API error:', error.message);
    throw error;
  }
}

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

  try {
    const qs = event.queryStringParameters || {};
    const auth = getAuthConfig();

    if (qs.test === 'true') {
      if (!auth) {
        const missing = [];
        if (!process.env.FFIEC_USERNAME) missing.push('FFIEC_USERNAME');
        if (!process.env.FFIEC_TOKEN) missing.push('FFIEC_TOKEN');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'CREDENTIALS_MISSING', missing }),
        };
      }
      try {
        await fetchUBPR('/periods', { top: 1 });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'CREDENTIALS_AVAILABLE' }),
        };
      } catch (err) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'API_ERROR', message: err.message }),
        };
      }
    }

    if (qs.list_periods === 'true') {
      if (auth) {
        try {
          const data = await fetchUBPR('/periods', { format: 'json' });
          const periods = Array.isArray(data?.data)
            ? data.data.map(p => p.period_end_date).filter(Boolean)
            : [];
          if (periods.length) {
            return { statusCode: 200, headers, body: JSON.stringify({ periods }) };
          }
        } catch (err) {
          console.warn('Period list fetch failed:', err.message);
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods: generatePeriodsFallback() }),
      };
    }

    const reportingPeriod = qs.reporting_period || latestReleasedQuarterEnd();
    const top = parseInt(qs.top, 10) || 100;

    try {
      const resp = await fetchUBPR('/financials', {
        period_end_date: reportingPeriod,
        top,
        format: 'json',
      });
      const rows = Array.isArray(resp?.data) ? resp.data : [];

      const data = rows.slice(0, top).map(r => ({
        bank_name: r.INSTNAME || r.BKNAME || r.name || null,
        rssd_id: r.ID_RSSD || r.IDRSSD || r.ID_Rssd || null,
        total_assets: r.ASSET != null ? Number(r.ASSET) : null,
        cre_to_tier1: r.UBPRCD173 != null ? Number(r.UBPRCD173) : null,
        cd_to_tier1: r.UBPRCD177 != null ? Number(r.UBPRCD177) : null,
        net_loans_assets: r.UBPRLD01 != null ? Number(r.UBPRLD01) : null,
        noncurrent_assets_pct: r.UBPRFD12 != null ? Number(r.UBPRFD12) : null,
        total_risk_based_capital_ratio:
          r.UBPR9950 != null ? Number(r.UBPR9950) : null,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data,
          _meta: {
            reportingPeriod,
            source: 'ubpr_real_data',
            count: data.length,
            timestamp: new Date().toISOString(),
          },
        }),
      };
    } catch (err) {
      console.error('Data fetch error:', err.message);
      const sampleData = [
        {
          bank_name: 'First National Bank',
          rssd_id: '123456',
          total_assets: 5000000,
          cre_to_tier1: 325.5,
          cd_to_tier1: 97.65,
          net_loans_assets: 72.3,
          noncurrent_assets_pct: 1.8,
          total_risk_based_capital_ratio: 14.5,
        },
        {
          bank_name: 'Regional Trust Company',
          rssd_id: '234567',
          total_assets: 3500000,
          cre_to_tier1: 412.7,
          cd_to_tier1: 123.81,
          net_loans_assets: 68.9,
          noncurrent_assets_pct: 2.1,
          total_risk_based_capital_ratio: 13.2,
        },
        {
          bank_name: 'Community Savings Bank',
          rssd_id: '345678',
          total_assets: 1200000,
          cre_to_tier1: 285.3,
          cd_to_tier1: 85.59,
          net_loans_assets: 75.6,
          noncurrent_assets_pct: 1.2,
          total_risk_based_capital_ratio: 15.8,
        },
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: sampleData,
          _meta: {
            reportingPeriod,
            source: 'sample_data',
            error: err.message,
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};

exports.fetchUBPR = fetchUBPR;
exports.generatePeriodsFallback = generatePeriodsFallback;
