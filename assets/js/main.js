// Replace assets/js/main.js with this
document.addEventListener('DOMContentLoaded', function() {
  console.log('Bank CRE Plugin loaded');
  loadBankData();
});

async function loadBankData() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorDiv = document.getElementById('errorMessage');
  const statusIndicator = document.getElementById('apiStatus');
  const statusText = document.getElementById('apiStatusText');
  
  // Show loading
  if (loadingOverlay) loadingOverlay.classList.add('show');
  if (statusIndicator) {
    statusIndicator.className = 'status-indicator loading';
  }
  if (statusText) {
    statusText.textContent = 'Loading bank data...';
  }
  
  try {
    // Get Netlify URL from WordPress
    const netlifyUrl = window.bce_data?.netlify_url;
    if (!netlifyUrl) {
      throw new Error('Netlify URL not configured. Check WordPress admin settings.');
    }
    
    console.log('Using Netlify URL:', netlifyUrl);
    
    // Get latest reporting period
    const period = await getLatestPeriod(netlifyUrl);
    console.log('Using reporting period:', period);
    
    // Update display
    const periodDisplay = document.getElementById('reportingPeriodDisplay');
    if (periodDisplay) {
      periodDisplay.textContent = formatPeriod(period);
    }
    
    // Fetch bank data
    const url = `${netlifyUrl}/.netlify/functions/ffiec?reporting_period=${period}&top=100`;
    console.log('Fetching data from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API Response:', result);
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('Invalid data format received from API');
    }
    
    if (result.data.length === 0) {
      throw new Error('No bank data available for the selected reporting period');
    }
    
    // Update status indicator
    if (statusIndicator && statusText) {
      statusIndicator.className = 'status-indicator connected';
      statusText.textContent = `Live FFIEC Data (${result.data.length} banks)`;
    }
    
    // Render the data
    renderBankData(result.data);
    updateStats(result.data);
    
    console.log(`Successfully loaded ${result.data.length} banks`);
    
  } catch (error) {
    console.error('Failed to load bank data:', error);
    
    // Update status indicator
    if (statusIndicator && statusText) {
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Connection Failed';
    }
    
    // Show error message
    showError(error.message);
  } finally {
    // Hide loading overlay
    if (loadingOverlay) {
      loadingOverlay.classList.remove('show');
    }
  }
}

async function getLatestPeriod(netlifyUrl) {
  try {
    const response = await fetch(`${netlifyUrl}/.netlify/functions/ffiec?list_periods=true`);
    if (response.ok) {
      const data = await response.json();
      if (data.periods && data.periods.length > 0) {
        return data.periods[0];
      }
    }
  } catch (error) {
    console.warn('Failed to fetch periods from API:', error.message);
  }
  
  // Fallback to latest quarter
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month >= 10) return `${year}-09-30`;
  if (month >= 7) return `${year}-06-30`;
  if (month >= 4) return `${year}-03-31`;
  return `${year - 1}-12-31`;
}

function formatPeriod(period) {
  if (!period) return 'Unknown';
  const [year, month, day] = period.split('-');
  return `${month}/${day}/${year}`;
}

function renderBankData(banks) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) {
    console.error('Table body element not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  // Sort banks by total assets (descending)
  const sortedBanks = banks.sort((a, b) => (b.total_assets || 0) - (a.total_assets || 0));
  
  sortedBanks.forEach((bank, index) => {
    const row = createBankRow(bank, index + 1);
    tbody.appendChild(row);
  });
  
  console.log(`Rendered ${banks.length} bank rows`);
}

function createBankRow(bank, assetRank) {
  const tr = document.createElement('tr');
  
  // Calculate CRE rank
  const creRank = calculateCRERank(bank.cre_to_tier1);
  
  tr.innerHTML = `
    <td class="rank-cell">${assetRank}</td>
    <td class="rank-cell">${creRank}</td>
    <td class="bank-name">${bank.bank_name || 'Unknown Bank'}</td>
    <td class="number-format">${formatNumber(bank.total_assets)}</td>
    <td class="number-format">${formatPercent(bank.net_loans_assets)}</td>
    <td class="number-format">${formatPercent(bank.noncurrent_assets_pct)}</td>
    <td class="number-format">${formatPercent(bank.cd_to_tier1)}</td>
    <td class="number-format ${getCREClass(bank.cre_to_tier1)}">${formatPercent(bank.cre_to_tier1)}</td>
    <td class="number-format">${formatPercent(bank.total_risk_based_capital_ratio)}</td>
  `;
  
  return tr;
}

function calculateCRERank(creRatio) {
  if (!creRatio) return '—';
  // This is a simplified ranking - in real implementation you'd rank against all banks
  if (creRatio >= 400) return '🔴 High';
  if (creRatio >= 300) return '🟡 Med';
  return '🟢 Low';
}

function getCREClass(ratio) {
  if (!ratio) return '';
  if (ratio >= 400) return 'high-risk';
  if (ratio >= 300) return 'medium-risk';
  return 'low-risk';
}

function formatNumber(num) {
  if (!num) return '—';
  return new Intl.NumberFormat('en-US').format(num);
}

function formatPercent(num) {
  if (!num && num !== 0) return '—';
  return num.toFixed(2) + '%';
}

function updateStats(banks) {
  const validBanks = banks.filter(b => b.cre_to_tier1);
  
  // Banks meeting criteria (simplified)
  const meetingCriteria = validBanks.filter(b => 
    b.cre_to_tier1 >= 300 || 
    b.net_loans_assets >= 70 || 
    b.noncurrent_assets_pct >= 2
  ).length;
  
  // Highest CRE ratio
  const highestCRE = Math.max(...validBanks.map(b => b.cre_to_tier1 || 0));
  
  // Largest bank assets
  const largestAssets = Math.max(...banks.map(b => b.total_assets || 0));
  
  // High risk count
  const highRiskCount = validBanks.filter(b => b.cre_to_tier1 >= 400).length;
  
  // Update stat cards
  updateStatCard('statBanksCount', meetingCriteria);
  updateStatCard('statHighestCRE', highestCRE.toFixed(2) + '%');
  updateStatCard('statLargestAssets', formatNumber(largestAssets));
  updateStatCard('statHighRiskCount', highRiskCount);
  
  // Update last updated time
  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated) {
    lastUpdated.textContent = new Date().toLocaleString();
  }
}

function updateStatCard(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
    element.classList.remove('loading');
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = `Error: ${message}`;
    errorDiv.style.display = 'block';
  }
  
  console.error('Bank data error:', message);
}

// Refresh function
function refreshData() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.classList.add('loading');
  }
  
  loadBankData().finally(() => {
    if (refreshBtn) {
      refreshBtn.classList.remove('loading');
    }
  });
}

// Make refresh function globally available
window.refreshData = refreshData;
