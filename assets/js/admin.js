// Admin scripts for Bank CRE Exposure plugin

document.addEventListener('DOMContentLoaded', function() {
    console.log('Bank CRE Admin interface loaded');
    
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

    // Add a comprehensive test button
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
        
        // Add styling based on type
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

async function testNetlify() {
    try {
        showStatus('Testing Netlify connection...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        console.log('Testing Netlify URL:', netlifyUrl);

        // Test basic connectivity first
        const healthUrl = netlifyUrl + '/.netlify/functions/ffiec?test=true';
        console.log('Health check URL:', healthUrl);
        
        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            // Add timeout
            signal: AbortSignal.timeout(15000)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        const contentType = response.headers.get('content-type') || '';
        console.log('Content-Type:', contentType);
        
        const text = await response.text();
        console.log('Raw response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON parse error:', e);
            data = { 
                rawResponse: text,
                parseError: e.message,
                contentType: contentType
            };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        // Analyze the response
        let statusMessage = `✅ Netlify connection successful (${response.status})`;
        let resultMessage = 'Netlify connection test passed:\n' + JSON.stringify(data, null, 2);
        let statusType = 'success';
        
        if (data.status === 'CREDENTIALS_MISSING') {
            statusMessage = '⚠️ Netlify works but FFIEC credentials missing';
            statusType = 'warning';
            resultMessage += '\n\n⚠️ FFIEC credentials not configured in Netlify environment variables.';
        } else if (data.status === 'API_ERROR') {
            statusMessage = '⚠️ Netlify works but FFIEC API issue';
            statusType = 'warning';
        }

        showStatus(statusMessage, false, statusType);
        showResult(resultMessage);
        
    } catch (error) {
        console.error('Netlify test error:', error);
        
        let errorMessage = 'Netlify connection failed: ' + error.message;
        let suggestions = [];
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            suggestions.push('Check if the Netlify URL is correct');
            suggestions.push('Verify the Netlify site is deployed and accessible');
            suggestions.push('Check for CORS issues');
        } else if (error.message.includes('timeout')) {
            suggestions.push('Netlify function may be taking too long to respond');
            suggestions.push('Check Netlify function logs for errors');
        } else if (error.message.includes('404')) {
            suggestions.push('Netlify function may not be deployed');
            suggestions.push('Check that /functions/ffiec exists in your Netlify deployment');
        }
        
        const fullMessage = errorMessage + (suggestions.length > 0 ? '\n\nSuggestions:\n• ' + suggestions.join('\n• ') : '');
        
        showStatus('❌ ' + errorMessage, false, 'error');
        showResult('Error details:\n' + fullMessage);
    }
}

async function testFFIEC() {
    try {
        showStatus('Testing FFIEC API via Netlify...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        
        // First check if we can get test results
        const testUrl = netlifyUrl + '/.netlify/functions/ffiec?test=true';
        const testResponse = await fetch(testUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(20000)
        });
        
        if (!testResponse.ok) {
            throw new Error(`Test request failed: ${testResponse.status}`);
        }
        
        const testData = await testResponse.json();
        console.log('FFIEC test data:', testData);
        
        if (testData.status === 'CREDENTIALS_MISSING') {
            showStatus('❌ FFIEC credentials not configured', false, 'error');
            showResult('FFIEC API test failed:\n' + JSON.stringify(testData, null, 2) + 
                '\n\nTo fix this:\n1. Go to Netlify Dashboard\n2. Site settings > Environment variables\n3. Add: FFIEC_USERNAME, FFIEC_PASSWORD, FFIEC_TOKEN');
            return;
        }
        
        if (testData.status === 'API_ERROR') {
            showStatus('❌ FFIEC API connection failed', false, 'error');
            showResult('FFIEC API test failed:\n' + JSON.stringify(testData, null, 2));
            return;
        }
        
        // Now try to get actual data
        const dataUrl = netlifyUrl + '/.netlify/functions/ffiec?top=5';
        const dataResponse = await fetch(dataUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(30000)
        });
        
        const text = await dataResponse.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { rawResponse: text };
        }

        if (!dataResponse.ok) {
            throw new Error(`HTTP ${dataResponse.status}: ${JSON.stringify(data)}`);
        }

        // Check if we got real data or mock data
        let statusMessage = '✅ FFIEC API test successful';
        let statusType = 'success';
        
        if (data._meta && data._meta.source && data._meta.source.includes('mock')) {
            statusMessage = '⚠️ FFIEC API returned mock data';
            statusType = 'warning';
        }
        
        showStatus(`${statusMessage} (${dataResponse.status})`, false, statusType);
        showResult('FFIEC API test result:\n' + JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('FFIEC test error:', error);
        showStatus('❌ FFIEC API test failed: ' + error.message, false, 'error');
        showResult('Error details:\n' + error.message);
    }
}

async function updateData() {
    try {
        showStatus('Updating bank data...', true);
        showResult('');

        const netlifyUrl = getNetlifyUrl();
        const url = netlifyUrl + '/.netlify/functions/ffiec?top=100';
        
        console.log('Fetching bank data from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(45000) // Longer timeout for data update
        });
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { rawResponse: text.substring(0, 1000) + '...' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        // Analyze the data
        let recordCount = 0;
        let dataSource = 'unknown';
        
        if (Array.isArray(data)) {
            recordCount = data.length;
            dataSource = 'direct array';
        } else if (data._meta) {
            dataSource = data._meta.source || 'api';
            if (Array.isArray(data.data)) recordCount = data.data.length;
        } else if (data.data && Array.isArray(data.data)) {
            recordCount = data.data.length;
            dataSource = 'data array';
        }

        let statusMessage = `✅ Data update successful (${recordCount} records)`;
        let statusType = 'success';
        
        if (dataSource.includes('mock')) {
            statusMessage = `⚠️ Data update completed with mock data (${recordCount} records)`;
            statusType = 'warning';
        }

        showStatus(statusMessage, false, statusType);
        
        // Show abbreviated results for readability
        const resultData = {
            recordCount: recordCount,
            dataSource: dataSource,
            sampleRecord: recordCount > 0 ? (Array.isArray(data) ? data[0] : data.data?.[0] || 'N/A') : 'None',
            _meta: data._meta || 'None'
        };
        
        showResult('Data update completed:\n' + JSON.stringify(resultData, null, 2));
        
    } catch (error) {
        console.error('Data update error:', error);
        showStatus('❌ Data update failed: ' + error.message, false, 'error');
        showResult('Error details:\n' + error.message);
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
            
            const basicResponse = await fetch(netlifyUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            
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
        
        // Test 2: Function availability
        try {
            const netlifyUrl = getNetlifyUrl();
            const functionResponse = await fetch(netlifyUrl + '/.netlify/functions/ffiec?test=true', {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            
            const functionData = await functionResponse.json();
            
            results.tests.push({
                test: 'Netlify Function Availability',
                status: functionResponse.ok ? 'PASS' : 'FAIL',
                details: functionData.status || 'Unknown'
            });
            
            results.ffiecCredentials = functionData.env || {};
            
        } catch (error) {
            results.tests.push({
                test: 'Netlify Function Availability',
                status: 'FAIL', 
                error: error.message
            });
        }
        
        // Test 3: Data retrieval
        try {
            const netlifyUrl = getNetlifyUrl();
            const dataResponse = await fetch(netlifyUrl + '/.netlify/functions/ffiec?top=3', {
                method: 'GET',
                signal: AbortSignal.timeout(15000)
            });
            
            const dataResult = await dataResponse.json();
            let recordCount = 0;
            
            if (Array.isArray(dataResult)) {
                recordCount = dataResult.length;
            } else if (dataResult.data && Array.isArray(dataResult.data)) {
                recordCount = dataResult.data.length;
            }
            
            results.tests.push({
                test: 'Data Retrieval',
                status: recordCount > 0 ? 'PASS' : 'FAIL',
                details: `${recordCount} records retrieved`,
                dataSource: dataResult._meta?.source || 'unknown'
            });
            
        } catch (error) {
            results.tests.push({
                test: 'Data Retrieval',
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
            statusMessage = `❌ All tests failed (${passedTests}/${totalTests})`;
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
