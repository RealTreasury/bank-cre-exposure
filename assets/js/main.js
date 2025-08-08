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
    const base = window.bce_data?.netlify_url || '';
    if (!base) throw new Error('Missing Netlify URL (bce_data.netlify_url)');

    const periods = await fetch(
      `${base}/.netlify/functions/ffiec?list_periods=true`,
      { signal: AbortSignal.timeout(15000) }
    ).then(r => r.json());
    const rp = (periods?.periods?.[0]) || '2024-09-30';

    const res = await fetch(
      `${base}/.netlify/functions/ffiec?reporting_period=${encodeURIComponent(rp)}&top=100`,
      { signal: AbortSignal.timeout(45000) }
    );
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
  if (!tbody) {
    console.log('Bank data:', banks);
    return;
  }
  tbody.innerHTML = '';
  banks.forEach((bank, index) => {
    const row = document.createElement('tr');
    const name = bank.bank_name || bank.name || '';
    const rssd = bank.rssd || bank.ID_Rssd || '';
    row.innerHTML = `<td>${index + 1}</td><td>${name}</td><td>${rssd}</td>`;
    tbody.appendChild(row);
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

