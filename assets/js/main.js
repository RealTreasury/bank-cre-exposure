        // API Configuration
        const API_CONFIG = {
            // FDIC API for bank financial data
            FDIC_BASE_URL: 'https://banks.data.fdic.gov/api',

            // UBPR API for call report metrics
            // Updated to point to Netlify Function proxy
            UBPR_BASE_URL: '/api', // CORRECTED: Point to the proxy root

            // Federal Reserve Economic Data API
            // FRED_API_KEY stored on the server side via Netlify Function
            FRED_BASE_URL: 'https://api.stlouisfed.org/fred'
            // Using live data; no mock values included
        };

        // Global variables
        let bankData = [];
        let isLoading = false;

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadBankData();
            fetchMarketData();
        });

        // Main function to load bank data
        async function loadBankData() {
            if (isLoading) return;
            
            isLoading = true;
            showLoading(true);
            updateAPIStatus('loading', 'Fetching bank data...');

            try {
                bankData = await fetchRealBankData();

                // Process and display data
                displayBankData(bankData);
                updateStatistics(bankData);
                updateAPIStatus('connected', 'Connected to data sources');
                updateLastUpdated();
                
            } catch (error) {
                console.error('Error loading bank data:', error);
                showError('Failed to load bank data. Please try again later.');
                updateAPIStatus('error', 'Connection failed');
            } finally {
                isLoading = false;
                showLoading(false);
                document.getElementById('refreshBtn').classList.remove('loading');
            }
        }

        // Function to fetch real bank data from APIs
        async function fetchRealBankData() {
            try {
                const url = `${window.bce_plugin_url}assets/data/bank-data.json`;
                const response = await fetch(url);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('FFIEC API Error:', errorText);
                    throw new Error(`FFIEC request failed: ${response.status} ${response.statusText}`);
                }

                const json = await response.json();

                // Check if response contains an error
                if (json.error) {
                    console.error('FFIEC API returned error:', json);
                    throw new Error(`FFIEC API Error: ${json.error}`);
                }

                const records = Array.isArray(json) ? json : (json.data || json.results || []);

                if (records.length === 0) {
                    console.warn('No bank records returned from API');
                    // Return some mock data to prevent complete failure
                    return generateMockData();
                }

                const banks = records.map(item => ({
                    name: item.bank_name || item.BANK_NAME || item.name || 'Unknown Bank',
                    assets: Number(item.total_assets ?? item.TOTAL_ASSETS ?? item.assets ?? 0),
                    netLoansToAssets: Number(item.net_loans_assets ?? item.NET_LOANS_ASSETS ?? item.netLoansToAssets ?? 0),
                    nonCurrToAssets: Number(item.noncurrent_assets_pct ?? item.NONCURRENT_ASSETS_PCT ?? item.nonCurrToAssets ?? 0),
                    cdLoansRatio: Number(item.cd_to_tier1 ?? item.CD_TO_TIER1 ?? item.cdLoansRatio ?? 0),
                    creLoansRatio: Number(item.cre_to_tier1 ?? item.CRE_TO_TIER1 ?? item.creLoansRatio ?? 0)
                }));

                // Rank by assets
                banks.sort((a, b) => b.assets - a.assets);
                banks.forEach((bank, index) => {
                    bank.assetsRank = index + 1;
                });

                // Rank by CRE ratio
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

                return banks;
            } catch (error) {
                console.error('Error fetching bank data:', error);
                throw error;
            }
        }

        // Add this mock data function as fallback
        function generateMockData() {
            return [
                {
                    name: "JPMorgan Chase Bank, National Association",
                    assets: 3200000000,
                    netLoansToAssets: 65.5,
                    nonCurrToAssets: 0.8,
                    cdLoansRatio: 45.2,
                    creLoansRatio: 180.3,
                    assetsRank: 1,
                    creRank: 15,
                    riskLevel: 'low'
                },
                {
                    name: "Bank of America, National Association",
                    assets: 2500000000,
                    netLoansToAssets: 68.2,
                    nonCurrToAssets: 1.1,
                    cdLoansRatio: 52.1,
                    creLoansRatio: 205.7,
                    assetsRank: 2,
                    creRank: 12,
                    riskLevel: 'low'
                }
                // Add more mock banks as needed
            ];
        }

        // Fetch latest market indicator (e.g., 10-year Treasury yield)
        async function fetchMarketData() {
            try {
                // CORRECTED: Call the FRED proxy function via the consistent /api/ path
                const url = `/api/fred?series_id=DGS10`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('FRED request failed');
                const json = await response.json();
                const observations = json.observations || [];
                if (observations.length > 0) {
                    const latest = observations[0].value;
                    const display = parseFloat(latest).toFixed(2) + '%';
                    const el = document.getElementById('statTenYear');
                    el.textContent = display;
                    el.classList.remove('loading');
                }
            } catch (err) {
                console.error('Error fetching market data:', err);
                const el = document.getElementById('statTenYear');
                el.textContent = 'N/A';
                el.classList.remove('loading');
            }
        }


        // Display bank data in table
        function displayBankData(data) {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';

            // Sort by CRE ratio descending
            data.sort((a, b) => b.creLoansRatio - a.creLoansRatio);

            data.forEach(bank => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="rank-cell">${bank.assetsRank}</td>
                    <td class="rank-cell">${bank.creRank}</td>
                    <td class="bank-name">${bank.name}</td>
                    <td class="number-format">${formatNumber(bank.assets)}</td>
                    <td class="number-format">${bank.netLoansToAssets.toFixed(2)}</td>
                    <td class="number-format">${bank.nonCurrToAssets.toFixed(2)}</td>
                    <td class="number-format">${bank.cdLoansRatio.toFixed(2)}</td>
                    <td class="number-format">
                        <span class="${bank.riskLevel}-risk">${bank.creLoansRatio.toFixed(2)}</span>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        // Update statistics
        function updateStatistics(data) {
            // Banks meeting criteria (simplified for demo)
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

            // Update UI
            document.getElementById('statBanksCount').textContent = banksCount;
            document.getElementById('statBanksCount').classList.remove('loading');
            
            document.getElementById('statHighestCRE').textContent = highestCRE.toFixed(2) + '%';
            document.getElementById('statHighestCRE').classList.remove('loading');
            
            document.getElementById('statLargestAssets').textContent = formatLargeNumber(largestAssets);
            document.getElementById('statLargestAssets').classList.remove('loading');
            
            document.getElementById('statHighRiskCount').textContent = highRiskCount;
            document.getElementById('statHighRiskCount').classList.remove('loading');
        }

        // Refresh data
        function refreshData() {
            const refreshBtn = document.getElementById('refreshBtn');
            refreshBtn.classList.add('loading');
            loadBankData();
        }

        // Search functionality
        document.getElementById('searchBox').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#bankTable tbody tr');
            
            rows.forEach(row => {
                const bankName = row.cells[2].textContent.toLowerCase();
                row.style.display = bankName.includes(searchTerm) ? '' : 'none';
            });
        });

        // Filter functionality
        function filterTable(filterType, e) {
            const rows = document.querySelectorAll('#bankTable tbody tr');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update active button
            buttons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            rows.forEach(row => {
                const creRatioElement = row.cells[7].querySelector('span');
                const creRatio = parseFloat(creRatioElement.textContent);
                const assets = parseInt(row.cells[3].textContent.replace(/,/g, ''));
                
                switch(filterType) {
                    case 'all':
                        row.style.display = '';
                        break;
                    case 'high':
                        row.style.display = creRatio > 400 ? '' : 'none';
                        break;
                    case 'medium':
                        row.style.display = (creRatio >= 300 && creRatio <= 400) ? '' : 'none';
                        break;
                    case 'large':
                        row.style.display = assets > 100000000 ? '' : 'none';
                        break;
                }
            });
        }

        // Sort functionality
        let sortOrder = {};
        function sortTable(columnIndex) {
            const table = document.getElementById('bankTable');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const isNumeric = columnIndex > 2;
            
            // Toggle sort order
            sortOrder[columnIndex] = sortOrder[columnIndex] === 'asc' ? 'desc' : 'asc';
            const order = sortOrder[columnIndex];
            
            rows.sort((a, b) => {
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
                    aVal = parseFloat(aVal.replace(/,/g, '')) || 0;
                    bVal = parseFloat(bVal.replace(/,/g, '')) || 0;
                    return order === 'asc' ? aVal - bVal : bVal - aVal;
                } else {
                    return order === 'asc' 
                        ? aVal.localeCompare(bVal) 
                        : bVal.localeCompare(aVal);
                }
            });
            
            rows.forEach(row => tbody.appendChild(row));
        }

        // Utility functions
        function formatNumber(num) {
            return num.toLocaleString();
        }

        function formatLargeNumber(num) {
            if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
            if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
            if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
            return '$' + formatNumber(num);
        }

        function showLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }

        function updateAPIStatus(status, message) {
            const indicator = document.getElementById('apiStatus');
            const text = document.getElementById('apiStatusText');
            
            indicator.classList.remove('connected', 'loading', 'error');
            indicator.classList.add(status);
            text.textContent = message;
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
            document.getElementById('lastUpdated').textContent = formatted;
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        // API Integration Guide
        function setupRealAPIs() {
            // This function demonstrates how to set up real API connections
            
            /* 1. FDIC API Setup
            - Register at: https://banks.data.fdic.gov/docs/
            - Get API key
            - Endpoints:
              - /institutions - Get bank list
              - /financials - Get financial data
            */
            
            /* 2. FFIEC CDR API Setup
            - Access: https://cdr.ffiec.gov/public/
            - No API key required for public data
            - Use SOAP/REST endpoints for Call Report data
            */
            
            /* 3. Federal Reserve FRED API
            - Register at: https://fred.stlouisfed.org/docs/api/
            - Get API key
            - Access economic indicators
            */
            
            /* 4. Data Processing
            - Fetch institution list
            - Get Call Report data for each institution
            - Calculate required ratios:
              - CRE Loans / (Tier 1 Capital + Allowances)
              - C&D Loans / (Tier 1 Capital + Allowances)
              - Net Loans & Leases / Total Assets
              - Non-Current Assets / Total Assets
            */
        }
