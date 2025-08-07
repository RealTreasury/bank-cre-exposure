// API Configuration
const API_CONFIG = {
    // Default Netlify URL - can be overridden by WordPress
    NETLIFY_BASE_URL: window.bce_netlify_url || 'https://stirring-pixie-0b3931.netlify.app'
};

// Global variables
let bankData = [];
let isLoading = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bank CRE Exposure tool initializing...');
    console.log('Netlify URL configured as:', API_CONFIG.NETLIFY_BASE_URL);
    loadBankData();
});

// Main function to load bank data
async function loadBankData() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    updateAPIStatus('loading', 'Connecting to data sources...');

    try {
        console.log('Starting data fetch...');
        const result = await fetchBankData();
        
        if (result.success) {
            bankData = result.data;
            displayBankData(bankData);
            updateStatistics(bankData);
            
            const statusMessage = result.isMock 
                ? `Using ${result.source} data (${bankData.length} records)` 
                : `Live data loaded (${bankData.length} records)`;
            
            updateAPIStatus('connected', statusMessage);
        } else {
            throw new Error(result.error || 'Failed to load data');
        }

        updateLastUpdated();

    } catch (error) {
        console.error('Error loading bank data:', error);
        handleDataLoadError(error);
    } finally {
        isLoading = false;
        showLoading(false);
        document.getElementById('refreshBtn')?.classList.remove('loading');
    }
}

// Enhanced data fetching with better error handling
async function fetchBankData() {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Data fetch attempt ${attempt}/${maxRetries}`);
            
            const url = `${API_CONFIG.NETLIFY_BASE_URL}/.netlify/functions/ffiec?top=100`;
            console.log('Fetching from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Add timeout
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.warn('Non-JSON response:', text.substring(0, 500));
                throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
            }

            const data = await response.json();
            console.log('🔍 Raw API Response:', {
                dataType: typeof data,
                isArray: Array.isArray(data),
                hasNumberedKeys: typeof data['0'] !== 'undefined',
                hasMeta: !!data._meta,
                keys: Object.keys(data).slice(0, 10), // First 10 keys
                sampleRecord: data['0'] || data[0] || 'Not found'
            });

            return processAPIResponse(data);

        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error.message);
            lastError = error;
            
            if (attempt < maxRetries) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // All attempts failed, return error
    return {
        success: false,
        error: lastError?.message || 'Failed to fetch data after multiple attempts',
        data: [],
        isMock: false
    };
}

// Process API response and normalize data
function processAPIResponse(rawData) {
    try {
        // Handle different response structures
        let records = [];
        let isMock = false;
        let source = 'unknown';

        if (Array.isArray(rawData)) {
            records = rawData;
            source = 'array';
        } else if (rawData && typeof rawData === 'object') {
            if (rawData._meta) {
                isMock = rawData._meta.source?.includes('mock') || false;
                source = rawData._meta.source || 'api';
            }
            
            if (Array.isArray(rawData.data)) {
                records = rawData.data;
            } else if (Array.isArray(rawData.results)) {
                records = rawData.results;
            } else if (rawData.error) {
                throw new Error(rawData.error);
            } else {
                // Try to find array data in the object
                const arrayKey = Object.keys(rawData).find(key => Array.isArray(rawData[key]));
                if (arrayKey) {
                    records = rawData[arrayKey];
                }
            }
        }

        if (!records || records.length === 0) {
            console.warn('No records found in response, using fallback data');
            records = generateClientSideMockData();
            isMock = true;
            source = 'client_fallback';
        }

        // Normalize and process bank data
        const banks = records.map((item, index) => {
            const bank = {
                name: item.bank_name || item.BANK_NAME || item.name || `Bank ${index + 1}`,
                assets: Number(item.total_assets ?? item.TOTAL_ASSETS ?? item.assets ?? 0),
                netLoansToAssets: Number(item.net_loans_assets ?? item.NET_LOANS_ASSETS ?? item.netLoansToAssets ?? 0),
                nonCurrToAssets: Number(item.noncurrent_assets_pct ?? item.NONCURRENT_ASSETS_PCT ?? item.nonCurrToAssets ?? 0),
                cdLoansRatio: Number(item.cd_to_tier1 ?? item.CD_TO_TIER1 ?? item.cdLoansRatio ?? 0),
                creLoansRatio: Number(item.cre_to_tier1 ?? item.CRE_TO_TIER1 ?? item.creLoansRatio ?? 0)
            };

            // Validate data
            if (bank.assets <= 0 && bank.creLoansRatio <= 0) {
                console.warn('Invalid bank data detected:', bank.name);
            }

            return bank;
        }).filter(bank => bank.assets > 0 || bank.creLoansRatio > 0); // Filter out completely invalid records

        // Add rankings and risk classifications
        addBankRankingsAndRisk(banks);

        return {
            success: true,
            data: banks,
            isMock: isMock,
            source: source,
            recordCount: banks.length
        };

    } catch (error) {
        console.error('Error processing API response:', error);
        return {
            success: false,
            error: `Data processing error: ${error.message}`,
            data: [],
            isMock: false
        };
    }
}

// Add rankings and risk classification to bank data
function addBankRankingsAndRisk(banks) {
    // Sort by assets for asset ranking
    const sortedByAssets = [...banks].sort((a, b) => b.assets - a.assets);
    sortedByAssets.forEach((bank, index) => {
        bank.assetsRank = index + 1;
    });

    // Sort by CRE ratio for CRE ranking  
    const sortedByCRE = [...banks].sort((a, b) => b.creLoansRatio - a.creLoansRatio);
    sortedByCRE.forEach((bank, index) => {
        bank.creRank = index + 1;
    });

    // Risk classification
    banks.forEach(bank => {
        if (bank.creLoansRatio > 400) {
            bank.riskLevel = 'high';
        } else if (bank.creLoansRatio >= 300) {
            bank.riskLevel = 'medium';
        } else {
            bank.riskLevel = 'low';
        }
    });
}

// Client-side fallback data
function generateClientSideMockData() {
    return [
        {
            bank_name: "JPMorgan Chase Bank, National Association",
            total_assets: 3200000000,
            net_loans_assets: 65.5,
            noncurrent_assets_pct: 0.8,
            cd_to_tier1: 45.2,
            cre_to_tier1: 180.3
        },
        {
            bank_name: "Bank of America, National Association",
            total_assets: 2500000000,
            net_loans_assets: 68.2,
            noncurrent_assets_pct: 1.1,
            cd_to_tier1: 52.1,
            cre_to_tier1: 205.7
        },
        {
            bank_name: "Wells Fargo Bank, National Association",
            total_assets: 1900000000,
            net_loans_assets: 70.1,
            noncurrent_assets_pct: 1.3,
            cd_to_tier1: 65.8,
            cre_to_tier1: 275.4
        },
        {
            bank_name: "Citibank, National Association",
            total_assets: 1700000000,
            net_loans_assets: 62.3,
            noncurrent_assets_pct: 0.9,
            cd_to_tier1: 38.7,
            cre_to_tier1: 165.2
        },
        {
            bank_name: "U.S. Bank National Association",
            total_assets: 550000000,
            net_loans_assets: 72.8,
            noncurrent_assets_pct: 1.8,
            cd_to_tier1: 89.3,
            cre_to_tier1: 345.6
        },
        {
            bank_name: "Truist Bank",
            total_assets: 460000000,
            net_loans_assets: 74.2,
            noncurrent_assets_pct: 2.1,
            cd_to_tier1: 95.7,
            cre_to_tier1: 398.4
        }
    ];
}

// Handle data loading errors
function handleDataLoadError(error) {
    console.error('Data load error:', error);
    
    let errorMessage = 'Failed to load bank data. ';
    let suggestions = [];

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += 'Network connection issue.';
        suggestions.push('Check your internet connection');
        suggestions.push('Verify Netlify function URL is accessible');
    } else if (error.message.includes('HTTP 4')) {
        errorMessage += 'Server configuration issue.';
        suggestions.push('Check Netlify function deployment');
        suggestions.push('Verify environment variables are set');
    } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out.';
        suggestions.push('Try refreshing the page');
        suggestions.push('Check if FFIEC API is responding slowly');
    } else {
        errorMessage += error.message;
    }

    updateAPIStatus('error', errorMessage);
    showError(errorMessage + '\n\nSuggestions:\n• ' + suggestions.join('\n• '));
    
    // Load fallback data so the interface isn't completely broken
    console.log('Loading fallback data due to error');
    bankData = addBankRankingsAndRisk(generateClientSideMockData().map(item => ({
        name: item.bank_name,
        assets: item.total_assets,
        netLoansToAssets: item.net_loans_assets,
        nonCurrToAssets: item.noncurrent_assets_pct,
        cdLoansRatio: item.cd_to_tier1,
        creLoansRatio: item.cre_to_tier1
    })));
    
    displayBankData(bankData);
    updateStatistics(bankData);
}

// Display bank data in table
function displayBankData(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No data available</td></tr>';
        return;
    }

    // Sort by CRE ratio descending for display
    const sortedData = [...data].sort((a, b) => b.creLoansRatio - a.creLoansRatio);

    sortedData.forEach(bank => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank-cell">${bank.assetsRank || 'N/A'}</td>
            <td class="rank-cell">${bank.creRank || 'N/A'}</td>
            <td class="bank-name" title="${bank.name}">${bank.name}</td>
            <td class="number-format">${formatNumber(bank.assets)}</td>
            <td class="number-format">${bank.netLoansToAssets.toFixed(2)}</td>
            <td class="number-format">${bank.nonCurrToAssets.toFixed(2)}</td>
            <td class="number-format">${bank.cdLoansRatio.toFixed(2)}</td>
            <td class="number-format">
                <span class="${bank.riskLevel || 'low'}-risk">${bank.creLoansRatio.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(row);
    });

    console.log(`Displayed ${sortedData.length} banks in table`);
}

// Update statistics
function updateStatistics(data) {
    if (!data || data.length === 0) {
        console.warn('No data for statistics update');
        return;
    }

    try {
        // Banks meeting criteria
        const banksCount = data.filter(bank => 
            bank.netLoansToAssets >= 70 || 
            bank.nonCurrToAssets >= 2 ||
            bank.cdLoansRatio >= 100 ||
            bank.creLoansRatio >= 300
        ).length;

        // Highest CRE ratio
        const highestCRE = Math.max(...data.map(bank => bank.creLoansRatio));

        // Largest bank assets
        const largestAssets = Math.max(...data.map(bank => bank.assets));

        // High risk count
        const highRiskCount = data.filter(bank => bank.creLoansRatio > 400).length;

        // Update UI elements
        updateStatElement('statBanksCount', banksCount);
        updateStatElement('statHighestCRE', highestCRE.toFixed(2) + '%');
        updateStatElement('statLargestAssets', formatLargeNumber(largestAssets));
        updateStatElement('statHighRiskCount', highRiskCount);

        // Optional 10-year element
        const tenYearEl = document.getElementById('statTenYear');
        if (tenYearEl) {
            updateStatElement('statTenYear', 'N/A');
        }

        console.log('Statistics updated:', { banksCount, highestCRE, largestAssets, highRiskCount });
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Helper function to update stat elements
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        element.classList.remove('loading');
    }
}

// Refresh data
function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
    }
    console.log('Manual data refresh triggered');
    loadBankData();
}

// Search functionality
const searchBox = document.getElementById('searchBox');
if (searchBox) {
    searchBox.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#bankTable tbody tr');
        
        let visibleCount = 0;
        rows.forEach(row => {
            if (row.cells.length > 2) {
                const bankName = row.cells[2].textContent.toLowerCase();
                const isVisible = bankName.includes(searchTerm);
                row.style.display = isVisible ? '' : 'none';
                if (isVisible) visibleCount++;
            }
        });
        
        console.log(`Search "${searchTerm}": ${visibleCount} visible results`);
    });
}

// Filter functionality
function filterTable(filterType, e) {
    const rows = document.querySelectorAll('#bankTable tbody tr');
    const buttons = document.querySelectorAll('.filter-btn');
    
    // Update active button
    buttons.forEach(btn => btn.classList.remove('active'));
    if (e && e.target) {
        e.target.classList.add('active');
    }
    
    let visibleCount = 0;
    rows.forEach(row => {
        if (row.cells.length < 8) return;
        
        const creRatioElement = row.cells[7].querySelector('span');
        const creRatio = creRatioElement ? parseFloat(creRatioElement.textContent) : 0;
        const assets = parseInt(row.cells[3].textContent.replace(/,/g, '')) || 0;
        
        let isVisible = false;
        switch(filterType) {
            case 'all':
                isVisible = true;
                break;
            case 'high':
                isVisible = creRatio > 400;
                break;
            case 'medium':
                isVisible = creRatio >= 300 && creRatio <= 400;
                break;
            case 'large':
                isVisible = assets > 100000000;
                break;
        }
        
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });
    
    console.log(`Filter "${filterType}": ${visibleCount} visible results`);
}

// Sort functionality
let sortOrder = {};
function sortTable(columnIndex) {
    const table = document.getElementById('bankTable');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;
    
    const isNumeric = columnIndex > 2;
    
    // Toggle sort order
    sortOrder[columnIndex] = sortOrder[columnIndex] === 'asc' ? 'desc' : 'asc';
    const order = sortOrder[columnIndex];
    
    rows.sort((a, b) => {
        if (a.cells.length <= columnIndex || b.cells.length <= columnIndex) return 0;
        
        let aVal = a.cells[columnIndex].textContent.trim();
        let bVal = b.cells[columnIndex].textContent.trim();
        
        // Handle special case for CRE ratio column
        if (columnIndex === 7) {
            const aSpan = a.cells[columnIndex].querySelector('span');
            const bSpan = b.cells[columnIndex].querySelector('span');
            aVal = aSpan ? aSpan.textContent : aVal;
            bVal = bSpan ? bSpan.textContent : bVal;
        }
        
        if (isNumeric) {
            aVal = parseFloat(aVal.replace(/[$,]/g, '')) || 0;
            bVal = parseFloat(bVal.replace(/[$,]/g, '')) || 0;
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
            return order === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
        }
    });
    
    rows.forEach(row => tbody.appendChild(row));
    console.log(`Table sorted by column ${columnIndex} (${order})`);
}

// Utility functions
function formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    return Number(num).toLocaleString();
}

function formatLargeNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return '$0';
    
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + formatNumber(num);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
}

function updateAPIStatus(status, message) {
    const indicator = document.getElementById('apiStatus');
    const text = document.getElementById('apiStatusText');
    
    if (indicator) {
        indicator.classList.remove('connected', 'loading', 'error');
        indicator.classList.add(status);
    }
    
    if (text) {
        text.textContent = message;
    }
    
    console.log('API Status:', status, '-', message);
}

function updateLastUpdated() {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const element = document.getElementById('lastUpdated');
    if (element) {
        element.textContent = formatted;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = message.replace(/\n/g, '<br>');
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 10000); // Show for 10 seconds
    }
    
    console.error('User Error:', message);
}
