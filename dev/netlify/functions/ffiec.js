// /netlify/functions/ffiec.js
const axios = require('axios');

const http = axios.create({
  baseURL: 'https://api.ffiec.gov',
  timeout: 15000,
  validateStatus: (s) => s >= 200 && s < 300,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'RealTreasury/1.0 (+https://realtreasury.com)',
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
  if (!periods.length) return requested;
  if (!requested) return periods[0];

  // If the requested period is listed first it likely hasn't been released yet.
  if (periods[0] === requested) {
    return periods[1] || periods[0];
  }

  if (periods.includes(requested)) {
    return requested;
  }

  // Fallback to the latest period earlier than the request.
  const prior = periods.find((p) => p < requested);
  return prior || periods[0];
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

function toIsoDate(d) {
  if (!d) return undefined;
  // Accept already-ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  // Try to coerce common formats; if fail, return undefined to omit
  const maybe = new Date(d);
  if (!isNaN(maybe)) {
    const y = maybe.getUTCFullYear();
    const m = String(maybe.getUTCMonth() + 1).padStart(2, '0');
    const day = String(maybe.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return undefined;
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

    // Choose ONE identifier unless your endpoint supports both.
    const useRssd = rssd || undefined;
    const useCert = !useRssd ? cert : undefined;

    // Use the public institutions search endpoint which requires no auth.
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
  } catch (err) {
    const status = err.response?.status || 500;
    const mapped = status >= 500 ? 502 : status;
    return {
      statusCode: mapped,
      headers,
      body: JSON.stringify({
        message: 'FFIEC API request failed',
        status,
        hint: status >= 500
          ? 'Likely a transient upstream error or unsupported parameter combination. Try fewer params or a recent date.'
          : 'Check parameter names and value formats (IDs, REPORT_DATE as YYYY-MM-DD).',
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
