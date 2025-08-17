// Admin scripts for Bank CRE Exposure plugin - FIXED VERSION

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Bank CRE Admin interface loaded');

    await populateReportingPeriodDropdown();

    const testNetlifyBtn = document.getElementById('bce-test-netlify');
    if (testNetlifyBtn) {
        testNetlifyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            testNetlify();
        });
    }

    const testFfiecBtn = document.getElementById('bce-test-ffiec');
    if (testFfiecBtn) {
        testFfiecBtn.addEventListener('click', function(e) {
            e.preventDefault();
            testFFIEC();
        });
    }

    const updateBtn = document.getElementById('bce-update-data');
    if (updateBtn) {
        updateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            updateData();
        });
    }

    const comprehensiveBtn = document.getElementById('bce-comprehensive-test');
    if (comprehensiveBtn) {
        comprehensiveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            runComprehensiveTest();
        });
    }
});

function showStatus(message, isLoading = false, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = `notice notice-${type}`;
        
        if (isLoading) {
            statusDiv.innerHTML = `${message} <div class="spinner"></div>`;
        } else {
            statusDiv.innerHTML = message;
        }
        
        console.log(`Status (${type}):`, message);
    }
}

function showResult(message) {
    const resultDiv = document.getElementById('bce-test-result');
    if (resultDiv) {
        resultDiv.textContent = message;
    }
}

function getNetlifyUrl() {
    const netlifyUrl = bce_data?.netlify_url;
    if (!netlifyUrl) {
        throw new Error('Missing Netlify URL. Please configure it in the settings above.');
    }
    return netlifyUrl;
}

// Determine the latest released quarter end
function latestReleasedQuarterEnd(today = new Date()) {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth() + 1;
    let yy = y, mm = 3, dd = 31;
    if (m >= 10)      { mm = 6; dd = 30; }
    else if (m >= 7)  { mm = 3; dd = 31; }
    else if (m >= 4)  { mm = 3; dd = 31; }
    else              { yy = y - 1; mm = 12; dd = 31; }
    const iso = `${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    return (iso === '2025-06-30') ? '2025-03-31' : iso;
}

// helper: generate last 12 quarter-end dates (newest first)
function generateQuarterEnds() {
    const today = new Date(latestReleasedQuarterEnd());
    const quarters = ['12-31', '09-30', '06-30', '03-31'];
    const dates = [];
    for (let y = today.getFullYear(); dates.length < 12; y--) {
        for (const q of quarters) {
            const iso = `${y}-${q}`;
            if (new Date(iso) <= today) dates.push(iso);
            if (dates.length >= 12) break;
        }
    }
    return dates;
}

async function populateReportingPeriodDropdown() {
    const sel = document.getElementById('bce-reporting-period');
    if (!sel) return;
    sel.innerHTML = '';

    let periods = [];
    try {
        const netlifyUrl = getNetlifyUrl();
        const res = await fetch(netlifyUrl + '/.netlify/functions/ffiec?list_periods=true', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        if (Array.isArray(data.periods) && data.periods.length > 0) {
            periods = data.periods; // already newest → oldest
        }
    } catch (err) {
        console.error('Failed to load reporting periods:', err);
    }

    if (periods.length === 0) {
        periods = generateQuarterEnds(); // fallback if server returns no periods
    }

    periods.forEach(iso => {
        const opt = document.createElement('option');
        opt.value = iso; // submit ISO YYYY-MM-DD
        const [y, m, d] = iso.split('-');
        opt.textContent = `${m}/${d}/${y}`; // human-friendly label
        sel.appendChild(opt);
    });
}

function getSelectedPeriod() {
    const period = document.getElementById('bce-reporting-period')?.value || '';
    if (period === '2025-06-30') {
        showStatus('Latest available data is 2025-03-31; 2025-06-30 not yet released.', false, 'warning');
        return '2025-03-31';
    }
    return period;
}

async function testNetlify() {
    try {
        showStatus('Testing Netlify connection...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        console.log('Testing Netlify URL:', netlifyUrl);

        // Test basic connectivity
        const healthUrl = netlifyUrl + '/.netlify/functions/ffiec?test=true';
        console.log('Health check URL:', healthUrl);
        
        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });
        
        console.log('Response status:', response.status);
        
        const text = await response.text();
        console.log('Raw response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON parse error:', e);
            throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        // Analyze the response
        let statusMessage = `✅ Netlify connection successful (${response.status})`;
        let resultMessage = 'Netlify connection test passed:\n' + JSON.stringify(data, null, 2);
        let statusType = 'success';
        
        if (data.status === 'API_ERROR') {
            statusMessage = '⚠️ Netlify works but FFIEC API is unreachable';
            statusType = 'warning';
        } else if (data.status === 'HEALTHY') {
            statusMessage = '✅ Netlify and FFIEC API connection successful';
            statusType = 'success';
        }

        showStatus(statusMessage, false, statusType);
        showResult(resultMessage);
        
    } catch (error) {
        console.error('Netlify test error:', error);
        showStatus('❌ ' + error.message, false, 'error');
        showResult('Error details:\n' + error.message);
    }
}

async function testFFIEC() {
    try {
        showStatus('Testing FFIEC API via Netlify...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        
        // First check credentials
        const testUrl = netlifyUrl + '/.netlify/functions/ffiec?test=true';
        const testResponse = await fetch(testUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(20000)
        });
        
        if (!testResponse.ok) {
            throw new Error(`Credentials test failed: HTTP ${testResponse.status}`);
        }
        
        const testData = await testResponse.json();
        console.log('FFIEC credentials test:', testData);
        
        if (testData.status === 'CREDENTIALS_MISSING') {
            showStatus('❌ FFIEC credentials not configured', false, 'error');
            let errorMsg = 'FFIEC API test failed - Missing credentials:\n' + JSON.stringify(testData, null, 2);
            errorMsg += '\n\nTo fix this:\n1. Go to Netlify Dashboard\n2. Site settings > Environment variables\n3. Add these variables:';
            if (testData.missing) {
                testData.missing.forEach(variable => {
                    errorMsg += `\n   • ${variable}`;
                });
            }
            showResult(errorMsg);
            return;
        }
        
        // Now try to get actual data (small sample to test API)
        showStatus('Testing FFIEC API with real data request...', true);

        const period = getSelectedPeriod();
        const dataUrl = netlifyUrl + '/.netlify/functions/ffiec?top=3' +
            (period ? `&reporting_period=${encodeURIComponent(period)}` : '');
        const dataResponse = await fetch(dataUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(45000) // FFIEC can be slow
        });
        
        const text = await dataResponse.text();
        console.log('FFIEC data response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
        }

        // Check for API errors (no more mock data)
        if (!dataResponse.ok || data.error) {
            const errorDetails = data.error ? 
                `API Error: ${data.message}\n${data.details || ''}` : 
                `HTTP ${dataResponse.status}: ${text}`;
            
            showStatus('❌ FFIEC API test failed', false, 'error');
            showResult('FFIEC API Error:\n' + errorDetails);
            return;
        }

        // Validate we got real data
        let statusMessage = '✅ FFIEC API test successful';
        let statusType = 'success';
        let recordCount = 0;
        
        if (Array.isArray(data.data)) {
            recordCount = data.data.length;
            
            // Check if this looks like real data
            const firstRecord = data.data[0];
            if (firstRecord && firstRecord.total_assets > 0) {
                statusMessage += ` - Got ${recordCount} real bank records`;
            } else {
                statusType = 'warning';
                statusMessage = '⚠️ FFIEC API returned data but values may be incomplete';
            }
        } else {
            statusType = 'warning';
            statusMessage = '⚠️ FFIEC API returned unexpected data format';
        }
        
        showStatus(statusMessage, false, statusType);
        
        // Show sample data for verification
        const resultData = {
            recordCount: recordCount,
            dataSource: data._meta?.source || 'unknown',
            reportingPeriod: data._meta?.reportingPeriod || 'unknown',
            sampleRecord: recordCount > 0 ? data.data[0] : 'None',
            metadata: data._meta || 'None'
        };
        
        showResult('FFIEC API test result:\n' + JSON.stringify(resultData, null, 2));
        
    } catch (error) {
        console.error('FFIEC test error:', error);
        showStatus('❌ FFIEC API test failed: ' + error.message, false, 'error');
        
        let errorDetails = 'Error details:\n' + error.message;
        if (error.message.includes('timeout')) {
            errorDetails += '\n\nThe FFIEC API can be slow. Try increasing the timeout or check if the API is experiencing issues.';
        }
        showResult(errorDetails);
    }
}

async function updateData() {
    try {
        showStatus('Fetching fresh bank data from FFIEC...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        const period = getSelectedPeriod();
        const url = netlifyUrl + '/.netlify/functions/ffiec?top=50' +
            (period ? `&reporting_period=${encodeURIComponent(period)}` : ''); // Smaller batch for testing

        console.log('Fetching bank data from:', url);

        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(60000) // Longer timeout for data update
        });
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
        }

        // Handle API errors (no mock data)
        if (!response.ok || data.error) {
            const errorDetails = data.error ? 
                `${data.message}\n${data.details || ''}` : 
                `HTTP ${response.status}: ${text}`;
            throw new Error(errorDetails);
        }

        // Analyze the data
        let recordCount = 0;
        let dataSource = 'unknown';
        
        if (Array.isArray(data.data)) {
            recordCount = data.data.length;
            dataSource = data._meta?.source || 'api';
        } else {
            throw new Error('Invalid data format returned from API');
        }

        let statusMessage = `✅ Data update successful (${recordCount} records)`;
        let statusType = 'success';

        // Verify we got real data, not mock
        if (dataSource.includes('real_data')) {
            statusMessage = `✅ Successfully fetched ${recordCount} real bank records`;
        } else if (dataSource === 'sample_data') {
            statusType = 'warning';
            const meta = data._meta || {};
            const errorInfo = meta.error ? `, error: ${meta.error}` : '';
            statusMessage = `⚠️ Using sample data (${recordCount} records${errorInfo})`;
        } else {
            statusType = 'warning';
            statusMessage = `⚠️ Data retrieved but source unclear (${recordCount} records, source: ${dataSource})`;
        }

        showStatus(statusMessage, false, statusType);
        
        // Show comprehensive results
        const resultData = {
            success: true,
            recordCount: recordCount,
            dataSource: dataSource,
            reportingPeriod: data._meta?.reportingPeriod || 'unknown',
            timestamp: data._meta?.timestamp || new Date().toISOString(),
            sampleBanks: recordCount > 0 ? data.data.slice(0, 3).map(bank => ({
                name: bank.bank_name,
                assets: bank.total_assets,
                cre_ratio: bank.cre_to_tier1
            })) : [],
            metadata: data._meta || {}
        };
        
        showResult('Data update completed:\n' + JSON.stringify(resultData, null, 2));
        
    } catch (error) {
        console.error('Data update error:', error);
        showStatus('❌ Data update failed: ' + error.message, false, 'error');
        
        let errorDetails = 'Error details:\n' + error.message;
        if (error.message.includes('CREDENTIALS_MISSING')) {
            errorDetails += '\n\nPlease configure FFIEC credentials in Netlify environment variables.';
        } else if (error.message.includes('timeout')) {
            errorDetails += '\n\nThe FFIEC API is taking too long to respond. Try again or check API status.';
        }
        showResult(errorDetails);
    }
}

async function runComprehensiveTest() {
    try {
        showStatus('Running comprehensive diagnostic...', true);
        showResult('');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };
        
        // Test 1: Basic connectivity
        try {
            const netlifyUrl = getNetlifyUrl();
            results.netlifyUrl = netlifyUrl;
            
            const basicResponse = await fetch(
                netlifyUrl + '/.netlify/functions/ffiec?test=true',
                { method: 'GET', signal: AbortSignal.timeout(10000) }
            );
            
            results.tests.push({
                test: 'Basic Netlify Connectivity',
                status: basicResponse.ok ? 'PASS' : 'FAIL',
                details: `HTTP ${basicResponse.status}`
            });
        } catch (error) {
            results.tests.push({
                test: 'Basic Netlify Connectivity', 
                status: 'FAIL',
                error: error.message
            });
        }
        
        // Test 2: Function availability & credentials
        try {
            const netlifyUrl = getNetlifyUrl();
            const functionResponse = await fetch(netlifyUrl + '/.netlify/functions/ffiec?test=true', {
                method: 'GET',
                signal: AbortSignal.timeout(15000)
            });
            
            const functionData = await functionResponse.json();
            
            results.tests.push({
                test: 'Netlify Function & Credentials',
                status: functionResponse.ok && functionData.status === 'CREDENTIALS_AVAILABLE' ? 'PASS' : 'FAIL',
                details: functionData.status || 'Unknown',
                credentialStatus: functionData.env || {}
            });
            
        } catch (error) {
            results.tests.push({
                test: 'Netlify Function & Credentials',
                status: 'FAIL', 
                error: error.message
            });
        }
        
        // Test 3: FFIEC API Data Retrieval
        try {
            const netlifyUrl = getNetlifyUrl();
            const period = getSelectedPeriod();
            const dataUrl = netlifyUrl + '/.netlify/functions/ffiec?top=2' +
                (period ? `&reporting_period=${encodeURIComponent(period)}` : '');
            const dataResponse = await fetch(dataUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(30000)
            });
            
            const dataText = await dataResponse.text();
            let dataResult;
            
            try {
                dataResult = JSON.parse(dataText);
            } catch (e) {
                throw new Error(`Invalid JSON: ${dataText.substring(0, 100)}...`);
            }
            
            let testStatus = 'FAIL';
            let testDetails = 'Unknown error';
            
            if (dataResponse.ok && !dataResult.error) {
                const recordCount = Array.isArray(dataResult.data) ? dataResult.data.length : 0;
                if (recordCount > 0) {
                    testStatus = 'PASS';
                    testDetails = `${recordCount} records retrieved`;
                } else {
                    testDetails = 'No records returned';
                }
            } else if (dataResult.error) {
                testDetails = `API Error: ${dataResult.message}`;
            } else {
                testDetails = `HTTP ${dataResponse.status}`;
            }
            
            results.tests.push({
                test: 'FFIEC API Data Retrieval',
                status: testStatus,
                details: testDetails,
                dataSource: dataResult._meta?.source || 'unknown',
                hasRealData: !!(dataResult._meta?.source && dataResult._meta.source.includes('real_data'))
            });
            
        } catch (error) {
            results.tests.push({
                test: 'FFIEC API Data Retrieval',
                status: 'FAIL',
                error: error.message
            });
        }
        
        // Test 4: WordPress integration
        results.tests.push({
            test: 'WordPress Integration',
            status: typeof bce_data !== 'undefined' ? 'PASS' : 'FAIL',
            details: typeof bce_data !== 'undefined' ? 'Plugin data available' : 'Plugin data missing'
        });
        
        // Determine overall status
        const passedTests = results.tests.filter(t => t.status === 'PASS').length;
        const totalTests = results.tests.length;
        
        let overallStatus = 'success';
        let statusMessage = `✅ Comprehensive test completed (${passedTests}/${totalTests} tests passed)`;
        
        if (passedTests === 0) {
            overallStatus = 'error';
            statusMessage = `❌ All tests failed (0/${totalTests})`;
        } else if (passedTests < totalTests) {
            overallStatus = 'warning';
            statusMessage = `⚠️ Some tests failed (${passedTests}/${totalTests} passed)`;
        }
        
        showStatus(statusMessage, false, overallStatus);
        showResult('Comprehensive Test Results:\n' + JSON.stringify(results, null, 2));
        
    } catch (error) {
        console.error('Comprehensive test error:', error);
        showStatus('❌ Comprehensive test failed: ' + error.message, false, 'error');
        showResult('Error details:\n' + error.message);
    }
}
