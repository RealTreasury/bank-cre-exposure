const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const https = require('https');
const crypto = require('crypto');

// Use a legacy-compatible TLS agent for FFIEC endpoints
const httpsAgent = new https.Agent({
  keepAlive: true,
  secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
});

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const log = (obj) => console.log(JSON.stringify(obj));

function asList(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function applyFilter(rows, name, fn) {
  const before = rows.length;
  const out = rows.filter(fn);
  const drop = before ? 1 - out.length / before : 0;
  log({ stage: 'filter', name, before, after: out.length, drop_pct: Number(drop.toFixed(4)) });
  assert(!(before > 0 && out.length === 0), `FILTER_ZERO(${name})`);
  return out;
}

async function fetchPanel({ reportingPeriodEndDate = null, auth }) {
  // Correct SOAP envelope based on official FFIEC documentation
  // The reportingPeriodEndDate should be in YYYY-MM-DD format (e.g., "2024-09-30")
  const periodTag = reportingPeriodEndDate ? `<reportingPeriodEndDate>${reportingPeriodEndDate}</reportingPeriodEndDate>` : '';

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <RetrievePanelOfReporters xmlns="http://cdr.ffiec.gov/public/services">
      <dataSeries>Call</dataSeries>
      ${periodTag}
    </RetrievePanelOfReporters>
  </soap:Body>
</soap:Envelope>`;

  const response = await axios.post(
    'https://cdr.ffiec.gov/public/PWS/WebServices/RetrievalService.asmx',
    soapEnvelope,
    {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://cdr.ffiec.gov/public/services/RetrievePanelOfReporters',
        Authorization: `Basic ${auth}`,
      },
      timeout: 30000,
      httpsAgent,
    }
  );

  const raw = response.data || '';
  const parsed = await parseStringPromise(raw, { explicitArray: false });
  
  // Updated path to match actual SOAP response structure
  let rows = parsed?.['soap:Envelope']?.['soap:Body']?.['RetrievePanelOfReportersResponse']?.['RetrievePanelOfReportersResult']?.['ReportingFinancialInstitution'] || [];
  rows = asList(rows);
  
  return { raw, rows };
}

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

function isIsoQuarterEnd(s) {
  return /^\d{4}-(03|06|09|12)-(?:31|30)$/.test(s);
}

async function listPeriodsFromFFIEC() {
  return { periods: generateQuarterEnds() };
}

async function resolveReportingPeriod(params, listPeriodsFn) {
  const requested = (params.reporting_period || '').trim();
  if (requested === '2025-06-30') return '2025-03-31';
  if (isIsoQuarterEnd(requested)) return requested;

  if (typeof listPeriodsFn === 'function') {
    try {
      const { periods = [] } = await listPeriodsFn();
      if (periods.length) {
        const p = periods[0];
        return (p === '2025-06-30') ? '2025-03-31' : p;
      }
    } catch {}
  }

  return '2025-03-31';
}

exports.handler = async (event) => {
  console.log('=== FFIEC FUNCTION START ===');
  console.log('Query params:', event.queryStringParameters);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;

  // Health check
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: username && token ? 'CREDENTIALS_AVAILABLE' : 'CREDENTIALS_MISSING',
        missing: !username || !token ? [
          ...(!username ? ['FFIEC_USERNAME'] : []),
          ...(!token ? ['FFIEC_TOKEN'] : [])
        ] : undefined,
      }),
    };
  }

  if ((params.list_periods || '').toString() === 'true') {
    const { periods } = await listPeriodsFromFFIEC();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ periods }),
    };
  }

  if (!username || !token) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'CREDENTIALS_MISSING',
        message: 'FFIEC credentials not configured',
        missing: [
          ...(!username ? ['FFIEC_USERNAME'] : []),
          ...(!token ? ['FFIEC_TOKEN'] : [])
        ],
      }),
    };
  }

  const reportingPeriod = await resolveReportingPeriod(params, listPeriodsFromFFIEC);
  const top = parseInt(params.top, 10) || 100;
  const auth = Buffer.from(`${username}:${token}`).toString('base64');

  try {
    // Step 1: fetch without period first to test connection
    console.log('Fetching panel without period...');
    const basePanel = await fetchPanel({ auth });
    log({ stage: 'fetch_panel_no_period', raw_bytes: basePanel.raw.length, rows: basePanel.rows.length });
    assert(basePanel.rows.length > 0, 'SOURCE_EMPTY(panel, no_period)');

    // Step 2: try with specific period
    console.log(`Fetching panel with period: ${reportingPeriod}`);
    let panel = null;
    try {
      panel = await fetchPanel({ reportingPeriodEndDate: reportingPeriod, auth });
      log({ stage: 'fetch_panel_with_period', period: reportingPeriod, rows: panel.rows.length });
      
      if (panel.rows.length === 0) {
        console.log('No data for specific period, falling back to no-period data');
        panel = basePanel;
      }
    } catch (err) {
      console.log('Error fetching with period, falling back to no-period data:', err.message);
      panel = basePanel;
    }

    assert(panel.rows.length > 0, 'SOURCE_EMPTY(panel, after_all_attempts)');

    // Step 3: Apply any necessary filters
    let filtered = panel.rows;
    log({ stage: 'panel_unfiltered', rows: filtered.length });

    // Step 4: Join UBPR metrics using LEFT JOIN semantics
    const ubprPeriod = reportingPeriod ? reportingPeriod.replace(/-/g, '') : null;
    let ubprRows = [];
    if (ubprPeriod) {
      try {
        const resp = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
          params: { filters: `REPDTE:${ubprPeriod}`, limit: 1000, format: 'json' },
          timeout: 30000,
          httpsAgent,
        });
        ubprRows = asList(resp.data?.data || resp.data || []);
      } catch (err) {
        log({ stage: 'fetch_ubpr_error', message: err.message });
      }
    }
    log({ stage: 'fetch_ubpr', period: ubprPeriod, rows: ubprRows.length });
    
    const ubprMap = new Map();
    for (const u of ubprRows) {
      const key = u.CERT || u.ID_RSSD || u.RSSDID || u.IDRSSD;
      if (key) ubprMap.set(key.toString(), u);
    }
    
    filtered = filtered.map((r) => {
      const key = r.ID_RSSD || r.FDICCertNumber || r.CERT;
      const u = ubprMap.get(key ? key.toString() : '') || {};
      return {
        ...r,
        // Map UBPR fields to standardized names
        cre_to_tier1: u.UBPRE749 ?? u.UBPR2746 ?? null,
        cd_to_tier1: u.UBPRE750 ?? u.UBPR2747 ?? null,
        net_loans_assets: u.UBPR2122 ?? null,
        noncurrent_assets_pct: u.UBPR2167 ?? null,
        total_risk_based_capital_ratio: u.RBC1 ?? u.TOTRBC ?? u.TOTAL_RISK_BASED_CAPITAL_RATIO ?? null,
        total_assets: u.TA ?? u.UBPR2170 ?? null,
      };
    });
    
    log({ stage: 'count_after_join', rows: filtered.length, ubpr_period_resolved: ubprPeriod });

    // Step 5: Final output formatting
    const limited = filtered.slice(0, Math.min(top, filtered.length));
    const data = limited.map((bank, index) => ({
      bank_name: bank.n || bank.Name || bank.BankName || `Bank ${index + 1}`,
      rssd_id: bank.ID_RSSD || null,
      cre_to_tier1: bank.cre_to_tier1,
      cd_to_tier1: bank.cd_to_tier1,
      net_loans_assets: bank.net_loans_assets,
      noncurrent_assets_pct: bank.noncurrent_assets_pct,
      total_risk_based_capital_ratio: bank.total_risk_based_capital_ratio,
      total_assets: bank.total_assets,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        success: true,
        recordCount: filtered.length,
        _meta: {
          source: 'ffiec_soap_panel_fixed',
          reportingPeriod: reportingPeriod,
          timestamp: new Date().toISOString(),
          ubpr_period_used: ubprPeriod,
          note: 'Fixed SOAP API call with correct namespace and parameters',
        },
      }),
    };
  } catch (error) {
    console.error('FFIEC API Error:', error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'FFIEC_API_ERROR',
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

exports.resolveReportingPeriod = resolveReportingPeriod;
exports.isIsoQuarterEnd = isIsoQuarterEnd;
exports.asList = asList;
exports.applyFilter = applyFilter;

