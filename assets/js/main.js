/**
 * Bank CRE Exposure front-end.
 * Fetches FFIEC bank data and FRED market data via Netlify functions.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadBanksViaNetlify().catch(err => showError(err.message || 'Unknown error'));
  fetchMarketData().catch(err => console.error('Error fetching market data:', err));
});

async function loadBanksViaNetlify() {
  try {
    const base = window.bce_data?.netlify_url; // e.g., https://your-site.netlify.app
    if (!base) throw new Error('Missing Netlify URL (bce_data.netlify_url)');

    const periodsRes = await fetch(
      `${base}/.netlify/functions/ffiec?list_periods=true`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }
    );
    const periods = await periodsRes.json();
    const rp = (periods?.periods?.[0]) || '2024-09-30';

    const url = `${base}/.netlify/functions/ffiec?reporting_period=${encodeURIComponent(rp)}&top=100`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`FFIEC HTTP ${res.status}`);

    const { data = [] } = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No bank records returned from API');
    }
    renderBanks(data);
  } catch (e) {
    console.error('FFIEC load failed:', e);
    showError('FFIEC load failed: ' + e.message);
  }
}

async function fetchMarketData() {
  try {
    const r = await fetch('/.netlify/functions/fred?series_id=DGS10&limit=30&sort_order=desc');
    if (!r.ok) throw new Error('FRED request failed');
    const json = await r.json();
    const observations = json?.observations || [];
    const last = observations[observations.length - 1];
    const el = document.getElementById('market10y');
    if (el && last?.value) el.textContent = last.value;
  } catch (e) {
    console.error('Error fetching market data:', e);
  }
}

function renderBanks(banks) {
  const tbody = document.getElementById('bankTableBody');
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

