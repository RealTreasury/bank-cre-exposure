/**
 * Bank CRE Exposure front-end.
 * Fetches FFIEC bank data and FRED market data via Netlify functions.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadBanksViaNetlify().catch(err => showError(err.message || 'Unknown error'));
  fetchMarketData().catch(err => console.error('Error fetching market data:', err));
});

// Determine the latest released quarter end based on today's date
function latestReleasedQuarterEnd(today = new Date()) {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  let yy = y, mm = 3, dd = 31;
  if (m >= 10)      { mm = 6; dd = 30; }
  else if (m >= 7)  { mm = 3; dd = 31; }
  else if (m >= 4)  { mm = 3; dd = 31; }
  else              { yy = y - 1; mm = 12; dd = 31; }
  const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return (iso === '2025-06-30') ? '2025-03-31' : iso;
}

// Retrieve safe reporting period from Netlify or compute fallback
async function getReportingPeriod() {
  const base = window.bce_data?.netlify_url || '';
  try {
    const r = await fetch(
      `${base}/.netlify/functions/ffiec?list_periods=true`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.periods) && j.periods.length) {
        const p = j.periods[0];
        return (p === '2025-06-30') ? '2025-03-31' : p;
      }
    }
  } catch (_) {}
  return latestReleasedQuarterEnd();
}

async function loadBanksViaNetlify() {
  try {
    const base = window.bce_data?.netlify_url; // e.g., https://your-site.netlify.app
    if (!base) throw new Error('Missing Netlify URL (bce_data.netlify_url)');

    const rp = await getReportingPeriod();
    const url = `${base}/.netlify/functions/ffiec?reporting_period=${encodeURIComponent(rp)}&top=100`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`FFIEC HTTP ${res.status}`);

    const { data = [], _meta = {} } = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No bank records returned from API');
    }
    const display = document.getElementById('reportingPeriodDisplay');
    if (display) display.textContent = _meta.reportingPeriod || rp;
    renderBanks(data);
  } catch (e) {
    console.error('FFIEC load failed:', e);
    showError('FFIEC load failed: ' + e.message);
  }
}

async function fetchMarketData() {
  try {
    const netlify = (window.bce_data && window.bce_data.netlify_url) || '';
    if (!netlify) throw new Error('Missing Netlify URL (bce_data.netlify_url)');

    const r = await fetch(
      `${netlify}/.netlify/functions/fred?series_id=DGS10&limit=30&sort_order=desc`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!r.ok) throw new Error('FRED request failed');
    const json = await r.json();
    const observations = json?.observations || [];
    const last = observations[observations.length - 1];

    const el = document.getElementById('market10y');
    if (el && last?.value != null) el.textContent = last.value;
  } catch (e) {
    console.error('Error fetching market data:', e);
  }
}

function renderBanks(banks) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  banks.forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${b.bank_name ?? ''}</td>
      <td>${b.rssd_id ?? ''}</td>
      <td>${b.cre_to_tier1 ?? '—'}</td>
      <td>${b.cd_to_tier1 ?? '—'}</td>
      <td>${b.net_loans_assets ?? '—'}</td>
      <td>${b.noncurrent_assets_pct ?? '—'}</td>
      <td>${b.total_risk_based_capital_ratio != null ? Number(b.total_risk_based_capital_ratio).toFixed(2) : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showError(message) {
  const div = document.getElementById('errorMessage');
  if (div) {
    div.textContent = message;
    div.style.display = 'block';
  }
  console.error('Error:', message);
}

