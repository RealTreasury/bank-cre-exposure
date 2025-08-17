// /netlify/functions/ffiec.js
const axios = require('axios');
const toYYYYMMDD = (iso) => (iso ? iso.replace(/-/g, '') : iso);

// FFIEC authentication
// Official requirement: Basic Auth with username + SECURITY TOKEN (token is used as the "password").
// Primary env vars: FFIEC_USERNAME / FFIEC_TOKEN
// Fallbacks for local scripts: PWS_USERNAME / PWS_TOKEN
const username =
  process.env.FFIEC_USERNAME ||
  process.env.PWS_USERNAME ||
  '';
const token =
  process.env.FFIEC_TOKEN ||
  process.env.PWS_TOKEN ||
  // last-resort compatibility: allow FFIEC_PASSWORD if someone mis-labeled the token
  process.env.FFIEC_PASSWORD ||
  '';

function buildAuthHeader(u, t) {
  if (!u || !t) return null;
  const auth = Buffer.from(`${u}:${t}`).toString('base64');
  return `Basic ${auth}`;
}

const authHeader = buildAuthHeader(username, token);
const authHeaders = authHeader ? { Authorization: authHeader } : {};

const http = axios.create({
  baseURL: 'https://api.ffiec.gov',
  timeout: 15000,
  validateStatus: (s) => s >= 200 && s < 300,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'RealTreasury/1.0 (+https://realtreasury.com)',
    ...authHeaders,
  },
  httpAgent: false,
  httpsAgent: false,
});

// ----- utility helpers used by both the handler and tests -----
function asList(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function applyFilter(list, name, predicate) {
  const filtered = list.filter(predicate);
  if (!filtered.length) {
    throw new Error(`FILTER_ZERO(${name})`);
  }
  return filtered;
}

async function resolveReportingPeriod(params = {}, fetchPeriods) {
  const requested = params.reporting_period;
  const { periods = [] } = (await fetchPeriods()) || {};
  // Sort periods from newest to oldest based on actual date values
  const sorted = [...periods].sort((a, b) => new Date(b) - new Date(a));
  if (!sorted.length) return requested;
  if (!requested) return sorted[0];

  // If the requested period is listed first it likely hasn't been released yet.
  if (sorted[0] === requested) {
    return sorted[1] || sorted[0];
  }

  if (sorted.includes(requested)) {
    return requested;
  }

  // Fallback to the latest period earlier than the request.
  const prior = sorted.find((p) => new Date(p) < new Date(requested));
  return prior || sorted[0];
}

async function withRetry(fn, { tries = 3, baseMs = 600 } = {}) {
  let err;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      err = e;
      const status = e.response?.status;
      const retryable = !status || (status >= 500 && status < 600);
      if (!retryable || i === tries - 1) break;
      const delay = baseMs * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw err;
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

async function fetchPanel({ endpoint, params }) {
  const safeParams = cleanParams(params);
  // Force JSON responses for public v2 endpoints
  if (endpoint.startsWith('/public/v2') && !('format' in safeParams)) {
    safeParams.format = 'json';
  }
  // Map top -> limit for public endpoints
  if ('top' in safeParams && !('limit' in safeParams)) {
    safeParams.limit = safeParams.top;
    delete safeParams.top;
  }
  console.log('FFIEC request', { endpoint, params: safeParams });

  return await withRetry(async () => {
    try {
      const res = await http.get(endpoint, { params: safeParams });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.error('FFIEC error', {
        status,
        data: typeof data === 'string' ? data.slice(0, 500) : data,
        url: http.defaults.baseURL + endpoint,
        params: safeParams,
      });
      throw err;
    }
  });
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
    const q = event.queryStringParameters || {};
    const cert = q.cert?.trim();
    const rssd = q.rssd?.trim();

    // Handle request for available reporting periods
    if (q.list_periods === 'true') {
      const data = await fetchPanel({ endpoint: '/public/v2/ubpr/periods', params: {} });
      const periods = Array.isArray(data?.periods) ? data.periods : [];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods }),
      };
    }

    // Choose ONE identifier unless the endpoint supports both.
    const useRssd = rssd || undefined;
    const useCert = !useRssd ? cert : undefined;

    // When an ID is provided, call the institutions search endpoint
    if (useCert || useRssd) {
      const endpoint = '/public/v2/institutions/search';
      const data = await fetchPanel({
        endpoint,
        params: {
          ...(useCert ? { CERT: useCert } : {}),
          ...(useRssd ? { ID_RSSD: useRssd } : {}),
        },
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    // Otherwise fetch UBPR financial data for a reporting period
    const reportingPeriod = await resolveReportingPeriod(
      { reporting_period: q.reporting_period },
      async () => fetchPanel({ endpoint: '/public/v2/ubpr/periods', params: {} })
    );
    const top = Math.min(parseInt(q.top || '50', 10), 100);
    const params = {
      limit: top,
      filters: `REPDTE:${toYYYYMMDD(reportingPeriod)}`,
    };
    console.log('Calling UBPR financials', { params });
    const ubpr = await fetchPanel({
      endpoint: '/public/v2/ubpr/financials',
      params,
    });

    const rows = Array.isArray(ubpr?.data) ? ubpr.data : asList(ubpr);
    const data = rows.map((r) => ({
      bank_name: r.NAME || r.BankName || r.Name || null,
      rssd_id: r.ID_RSSD || r.IDRSSD || r.RSSD_ID || r.RSSD || null,
      cre_to_tier1: r.CRETOTIER1 ?? null,
      cd_to_tier1: r.CDTOTIER1 ?? null,
      net_loans_assets: r.NLLR ?? null,
      noncurrent_assets_pct: r.NONCURRASSETS ?? null,
      total_risk_based_capital_ratio: r.TOTRBC || r.TOTRBCAP || r.TOTRISKBASEDCAP || r.TOTRBCAP || r.TOTRBC_RATIO || null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        _meta: {
          reportingPeriod,
          source: 'real_data',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const text = err.response?.data || err.message;
    let hint = 'Check parameter names and value formats. Ensure REPDTE is a real released quarter.';
    if (status === 401 || status === 403) {
      hint = 'Auth failed (only needed for legacy PWS). Public UBPR v2 endpoints typically do not require Basic auth.';
    } else if (status >= 500) {
      hint = 'Upstream FFIEC service error or unsupported param combo. Try a smaller limit or an earlier period.';
    }
    console.error('UBPR error', { status, text });
    return {
      statusCode: status >= 500 ? 502 : status,
      headers,
      body: JSON.stringify({
        message: 'FFIEC API request failed',
        status,
        hint,
      }),
    };
  }
};

// Expose helpers for unit tests
exports.resolveReportingPeriod = resolveReportingPeriod;
exports.asList = asList;
exports.applyFilter = applyFilter;

/*
Debug notes:

1) Start minimal:
curl -i "https://api.ffiec.gov/<REPLACE-WITH-FFIEC-ROUTE>?ID_RSSD=480228&REPORT_DATE=2024-12-31"

2) If that works, add your other filters one by one.

3) Common pitfalls:
   - REPORT_DATE must be YYYY-MM-DD.
   - Use either CERT or ID_RSSD, not both.
   - Remove empty/undefined params (cleanParams does this).
   - Large pulls can time out; paginate if the endpoint supports it.
*/
