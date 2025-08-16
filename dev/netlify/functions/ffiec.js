const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const axios = require('axios');
const { parseStringPromise } = require('xml2js');

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

async function fetchPanel({ period = null, page = 1, pageSize = 500, auth }) {
  const periodTag = period ? `<ReportingPeriod>${period}</ReportingPeriod>` : '';
  const pageTags = `<PageNumber>${page}</PageNumber><MaxReturnRows>${pageSize}</MaxReturnRows>`;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <RetrievePanelOfReporters xmlns="http://cdr.ffiec.gov/public/PWS/">
      ${periodTag}
      ${pageTags}
    </RetrievePanelOfReporters>
  </soap:Body>
</soap:Envelope>`;

  const response = await axios.post(
    'https://cdr.ffiec.gov/public/PWS/WebServices/RetrievePanelOfReporters.asmx',
    soapEnvelope,
    {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://cdr.ffiec.gov/public/PWS/RetrievePanelOfReporters',
        Authorization: `Basic ${auth}`,
      },
      timeout: 30000,
    }
  );

  const raw = response.data || '';
  const parsed = await parseStringPromise(raw, { explicitArray: false });
  let rows =
    parsed?.['soap:Envelope']?.['soap:Body']?.['RetrievePanelOfReportersResponse']?.['RetrievePanelOfReportersResult']?.['diffgr:diffgram']?.['DocumentElement']?.['Reporter'] || [];
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
        status: username && token ? 'CREDENTIALS_AVAILABLE' : 'MISSING_CREDENTIALS',
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

  const reportingPeriod = await resolveReportingPeriod(params, listPeriodsFromFFIEC);
  const top = parseInt(params.top, 10) || 100;
  const auth = Buffer.from(`${username}:${token || ''}`).toString('base64');

  try {
    // Step 1: fetch without period
    const basePanel = await fetchPanel({ auth });
    log({ stage: 'fetch_panel_no_period', raw_bytes: basePanel.raw.length, rows: basePanel.rows.length });
    assert(basePanel.rows.length > 0, 'SOURCE_EMPTY(panel, no_period)');

    // Step 2: try period variants
    const variants = [reportingPeriod, reportingPeriod.replace(/-/g, ''), reportingPeriod.slice(0, 7).replace('-', '')];
    let chosenPeriod = null;
    let panel = null;
    for (const per of variants) {
      const p = await fetchPanel({ period: per, auth });
      log({ stage: 'fetch_panel_period', period: per, rows: p.rows.length });
      if (p.rows.length > 0) {
        chosenPeriod = per;
        panel = p;
        break;
      }
    }
    if (!panel) {
      panel = basePanel;
      assert(panel.rows.length > 0, 'SOURCE_EMPTY(panel, all_period_formats_failed)');
    }

    // Step 4: pagination
    let allRows = [...panel.rows];
    let page = 2;
    while (true) {
      const r = await fetchPanel({ period: chosenPeriod, page, auth });
      const batch = asList(r.rows);
      log({ stage: 'panel_page', page, batch: batch.length });
      if (batch.length === 0) break;
      allRows.push(...batch);
      if (batch.length < 500) break;
      page += 1;
    }
    panel.rows = allRows;
    log({ stage: 'panel_after_pagination', rows: panel.rows.length });
    assert(panel.rows.length > 0, 'PAGINATION_EMPTY(panel)');

    // Step 5: no filters yet
    let filtered = panel.rows;
    log({ stage: 'panel_unfiltered', rows: filtered.length });
    assert(filtered.length > 0, 'FILTERS_ACCIDENTALLY_ZEROED(panel)');

    // Step 6-7: join UBPR metrics using LEFT JOIN semantics
    const ubprPeriod = chosenPeriod ? chosenPeriod.replace(/-/g, '') : null;
    let ubprRows = [];
    if (ubprPeriod) {
      try {
        const resp = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
          params: { filters: `REPDTE:${ubprPeriod}`, limit: 1000, format: 'json' },
          timeout: 30000,
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
      const key = r.ID_Rssd || r.RSSD_ID || r.Id_Rssd || r.CERT || r.Cert;
      const u = ubprMap.get(key ? key.toString() : '') || {};
      return {
        ...r,
        ubpr_roe: u.ROE ?? null,
        ubpr_nim: u.NIM ?? null,
        total_risk_based_capital_ratio:
          u.RBC1 ?? u.TOTRBC ?? u.TOTAL_RISK_BASED_CAPITAL_RATIO ?? null,
      };
    });
    log({ stage: 'count_after_join', rows: filtered.length, ubpr_period_resolved: ubprPeriod });

    // Step 9: final output
    const sample_before = panel.rows.slice(0, 5).map((r) => r.Name || r.BankName || r.bank_name || '');
    const sample_after = filtered.slice(0, 5).map((r) => r.Name || r.BankName || r.bank_name || '');
    const limited = filtered.slice(0, Math.min(top, filtered.length));
    const data = limited.map((bank, index) => ({
      bank_name: bank.Name || bank.BankName || `Bank ${index + 1}`,
      rssd_id: bank.ID_Rssd || bank.RSSD_ID || bank.Id_Rssd || null,
      ubpr_roe: bank.ubpr_roe ?? null,
      ubpr_nim: bank.ubpr_nim ?? null,
      total_risk_based_capital_ratio:
        bank.total_risk_based_capital_ratio ?? null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        success: true,
        recordCount: filtered.length,
        dataSource: 'ffiec_soap_panel',
        reportingPeriod: chosenPeriod || 'unspecified',
        timestamp: new Date().toISOString(),
        sampleBanks_preJoin: sample_before,
        sampleBanks: sample_after,
        metadata: {
          note: 'Panel verified; UBPR left-joined with null-safe fields',
          period_used_for_ubpr: ubprPeriod || null,
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
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

exports.resolveReportingPeriod = resolveReportingPeriod;
exports.isIsoQuarterEnd = isIsoQuarterEnd;
exports.asList = asList;
exports.applyFilter = applyFilter;

