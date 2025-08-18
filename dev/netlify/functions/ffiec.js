// FIXED Netlify function for FFIEC UBPR data
const axios = require('axios');

const UBPR_BASE = 'https://api.ffiec.gov/public/v2/ubpr';

function getAuthHeaders() {
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;
  if (!username || !token) return null;
  
  // FIXED: Proper HTTP Basic authentication
  const credentials = Buffer.from(`${username}:${token}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'BankCREExposure/1.0'
  };
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

async function fetchUBPR(endpoint, params = {}, retries = 3) {
  const headers = getAuthHeaders();
  if (!headers) {
    throw new Error('CREDENTIALS_MISSING');
  }
  
  const url = `${UBPR_BASE}${endpoint}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`FFIEC API attempt ${attempt}/${retries}: ${url}`);
      
      const response = await axios.get(url, {
        headers,
        params,
        timeout: 45000,
        validateStatus: (status) => status < 500
      });
      
      console.log(`FFIEC API success: ${response.status}`);
      return response.data;
      
    } catch (error) {
      console.error(`FFIEC API attempt ${attempt} failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('INVALID_CREDENTIALS');
      }
      
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw new Error(`CLIENT_ERROR: ${error.response.status} ${error.response.statusText}`);
      }
      
      if (attempt === retries) {
        throw new Error(`API_UNAVAILABLE: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
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
    
    if (qs.test === 'true') {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        const missing = [];
        if (!process.env.FFIEC_USERNAME) missing.push('FFIEC_USERNAME');
        if (!process.env.FFIEC_TOKEN) missing.push('FFIEC_TOKEN');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'CREDENTIALS_MISSING', 
            missing,
            env: {
              hasUsername: !!process.env.FFIEC_USERNAME,
              hasToken: !!process.env.FFIEC_TOKEN
            }
          }),
        };
      }
      
      try {
        await fetchUBPR('/periods', { format: 'json', limit: 1 });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'HEALTHY' }),
        };
      } catch (error) {
        let status = 'API_ERROR';
        if (error.message === 'CREDENTIALS_MISSING') status = 'CREDENTIALS_MISSING';
        if (error.message === 'INVALID_CREDENTIALS') status = 'INVALID_CREDENTIALS';
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status,
            message: error.message,
            details: error.toString()
          }),
        };
      }
    }

    if (qs.list_periods === 'true') {
      try {
        const data = await fetchUBPR('/periods', { format: 'json' });
        const periods = Array.isArray(data?.periods) 
          ? data.periods.map(p => p.period_end_date || p).filter(Boolean)
          : [];
        
        if (periods.length > 0) {
          const sortedPeriods = periods
            .map(p => typeof p === 'string' ? p : p.toString())
            .filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p))
            .sort((a, b) => new Date(b) - new Date(a));
          
          return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ periods: sortedPeriods }) 
          };
        }
      } catch (error) {
        console.warn('Period list fetch failed:', error.message);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods: generatePeriodsFallback() }),
      };
    }

    const reportingPeriod = qs.reporting_period || latestReleasedQuarterEnd();
    const top = Math.min(parseInt(qs.top, 10) || 100, 500);

    try {
      const periodFormatted = reportingPeriod.replace(/-/g, '');
      
      console.log(`Fetching UBPR data for period: ${reportingPeriod} (${periodFormatted}), limit: ${top}`);
      
      const response = await fetchUBPR('/financials', {
        filters: `REPDTE:${periodFormatted}`,
        limit: top,
        format: 'json'
      });
      
      const rows = Array.isArray(response?.data) ? response.data : 
                   Array.isArray(response) ? response : [];

      console.log(`UBPR API returned ${rows.length} records`);

      const data = rows.slice(0, top).map(r => {
        const bankName = r.INSTNAME || r.NAME || r.BKNAME || r.name || null;
        const rssdId = r.ID_RSSD || r.IDRSSD || r.ID_Rssd || r.RSSD_ID || null;
        const totalAssets = r.ASSET || r.TA || null;
        
        const creToTier1 = r.UBPRCD173 || r.UBPR_CD173 || null;
        const cdToTier1 = r.UBPRCD177 || r.UBPR_CD177 || null;
        const netLoansAssets = r.UBPRLD01 || r.UBPR_LD01 || null;
        const noncurrentAssetsPct = r.UBPRFD12 || r.UBPR_FD12 || null;
        const totalRiskCapitalRatio = r.UBPR9950 || r.UBPR_9950 || null;

        return {
          bank_name: bankName,
          rssd_id: rssdId ? String(rssdId) : null,
          total_assets: totalAssets != null ? Number(totalAssets) : null,
          cre_to_tier1: creToTier1 != null ? Number(creToTier1) : null,
          cd_to_tier1: cdToTier1 != null ? Number(cdToTier1) : null,
          net_loans_assets: netLoansAssets != null ? Number(netLoansAssets) : null,
          noncurrent_assets_pct: noncurrentAssetsPct != null ? Number(noncurrentAssetsPct) : null,
          total_risk_based_capital_ratio: totalRiskCapitalRatio != null ? Number(totalRiskCapitalRatio) : null,
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data,
          _meta: {
            reportingPeriod,
            source: 'ffiec_ubpr_v2_real_data',
            count: data.length,
            timestamp: new Date().toISOString(),
            apiEndpoint: '/v2/ubpr/financials'
          },
        }),
      };
    } catch (error) {
      console.error('UBPR data fetch error:', error.message);
      
      const sampleData = [
        {
          bank_name: 'First National Bank (Sample)',
          rssd_id: '123456',
          total_assets: 5000000,
          cre_to_tier1: 325.5,
          cd_to_tier1: 97.65,
          net_loans_assets: 72.3,
          noncurrent_assets_pct: 1.8,
          total_risk_based_capital_ratio: 14.5,
        },
        {
          bank_name: 'Regional Trust Company (Sample)',
          rssd_id: '234567',
          total_assets: 3500000,
          cre_to_tier1: 412.7,
          cd_to_tier1: 123.81,
          net_loans_assets: 68.9,
          noncurrent_assets_pct: 2.1,
          total_risk_based_capital_ratio: 13.2,
        }
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: sampleData,
          _meta: {
            reportingPeriod,
            source: 'sample_data_api_error',
            error: error.message,
            timestamp: new Date().toISOString(),
            note: 'Real API failed, returning sample data'
          },
        }),
      };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

exports.fetchUBPR = fetchUBPR;
exports.generatePeriodsFallback = generatePeriodsFallback;
exports.getAuthHeaders = getAuthHeaders;

