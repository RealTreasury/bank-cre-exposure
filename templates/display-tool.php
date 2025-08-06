    <div class="report-container">
        <div class="report-header">
            <h1>Commercial Real Estate Exposure Report</h1>
            <div class="subtitle">Top US Banks by Total Assets - Live Data</div>
            <div class="subtitle">Data refreshed from FDIC & FFIEC APIs</div>
            <div class="api-status">
                <span class="status-indicator loading" id="apiStatus"></span>
                <span id="apiStatusText">Connecting to APIs...</span>
            </div>
            
            <div class="conditions-box">
                <h3>Risk Assessment Criteria</h3>
                <div class="condition-grid">
                    <div class="condition-item">Net Loans & Leases to Assets ≥ 70%</div>
                    <div class="condition-item">Non-Current Assets to Total Assets ≥ 2%</div>
                    <div class="condition-item">C&D Loans to Tier 1 Cap + Allowance ≥ 100%</div>
                    <div class="condition-item">CRE Loans to Tier 1 Cap + Allowance ≥ 300%</div>
                </div>
            </div>
        </div>

        <div class="stats-section">
            <div class="stat-card">
                <div class="stat-number loading" id="statBanksCount">--</div>
                <div class="stat-label">Banks Meeting Criteria</div>
            </div>
            <div class="stat-card">
                <div class="stat-number loading" id="statHighestCRE">--.--</div>
                <div class="stat-label">Highest CRE Ratio</div>
            </div>
            <div class="stat-card">
                <div class="stat-number loading" id="statLargestAssets">--</div>
                <div class="stat-label">Largest Bank Assets</div>
            </div>
            <div class="stat-card">
                <div class="stat-number loading" id="statHighRiskCount">--</div>
                <div class="stat-label">Banks > 400% CRE</div>
            </div>
            <div class="stat-card">
                <div class="stat-number loading" id="statTenYear">--.--%</div>
                <div class="stat-label">10-Year Treasury</div>
            </div>
        </div>

        <div class="report-content">
            <div class="loading-overlay show" id="loadingOverlay">
                <div class="loading-spinner"></div>
            </div>
            
            <div class="filters">
                <input type="text" id="searchBox" class="search-box" placeholder="Search bank names...">
                <button class="filter-btn active" onclick="filterTable('all', event)">All Banks</button>
                <button class="filter-btn" onclick="filterTable('high', event)">High Risk (>400%)</button>
                <button class="filter-btn" onclick="filterTable('medium', event)">Medium Risk (300-400%)</button>
                <button class="filter-btn" onclick="filterTable('large', event)">Large Banks (>$100B)</button>
                <button class="refresh-btn" onclick="refreshData()" id="refreshBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                    Refresh Data
                </button>
            </div>

            <div class="error-message" id="errorMessage"></div>

            <div class="table-container">
                <table id="bankTable">
                    <thead>
                        <tr>
                            <th onclick="sortTable(0)">Assets Rank</th>
                            <th onclick="sortTable(1)">CRE Rank</th>
                            <th onclick="sortTable(2)">Bank Name</th>
                            <th onclick="sortTable(3)">Total Assets ($000)</th>
                            <th onclick="sortTable(4)">Net Loans & Leases to Assets (%)</th>
                            <th onclick="sortTable(5)">Non-Curr Assets to Total Assets (%)</th>
                            <th onclick="sortTable(6)">C&D Loans to Tier 1 Cap + Allowance (%)</th>
                            <th onclick="sortTable(7)">CRE Loans to Tier 1 Cap + Allowance (%)</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        <!-- Data will be populated here -->
                    </tbody>
                </table>
            </div>
        </div>

        <div class="report-footer">
            <strong>Source:</strong> FDIC API & FFIEC CDR Public Data | Live data connection<br>
            <strong>Risk Categories:</strong> High Risk (>400%), Medium Risk (300-400%), Low Risk (<300%)<br>
            <strong>Last Updated:</strong> <span id="lastUpdated">--</span>
        </div>
    </div>

