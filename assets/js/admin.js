// Admin scripts for Bank CRE Exposure plugin

document.addEventListener('DOMContentLoaded', function() {
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
});

function showStatus(message, isLoading = false) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        if (isLoading) {
            statusDiv.innerHTML = message + ' <div class="spinner"></div>';
        } else {
            statusDiv.innerHTML = message;
        }
    }
}

function showResult(message) {
    const resultDiv = document.getElementById('bce-test-result');
    if (resultDiv) {
        resultDiv.textContent = message;
    }
}

async function testNetlify() {
    try {
        showStatus('Testing Netlify connection...', true);
        showResult('');

        const netlifyUrl = bce_data.netlify_url;
        if (!netlifyUrl) {
            throw new Error('Missing Netlify URL. Please configure it in the settings above.');
        }

        // Test FFIEC proxy endpoint
        const response = await fetch(netlifyUrl + '/.netlify/functions/ffiec?test=true', {
            method: 'GET'
        });
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { rawResponse: text };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        showStatus(`✅ Netlify connection successful (${response.status})`, false);
        showResult('Netlify connection test passed:\n' + JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error(error);
        showStatus('❌ Netlify connection failed: ' + error.message, false);
        showResult('Error details:\n' + error.message);
    }
}

async function testFFIEC() {
    try {
        showStatus('Testing FFIEC API via Netlify...', true);
        showResult('');

        const netlifyUrl = bce_data.netlify_url;
        if (!netlifyUrl) {
            throw new Error('Missing Netlify URL. Please configure it in the settings above.');
        }

        const response = await fetch(netlifyUrl + '/.netlify/functions/ffiec?top=5', {
            method: 'GET'
        });
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { rawResponse: text };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        showStatus(`✅ FFIEC API test successful (${response.status})`, false);
        showResult('FFIEC API test passed:\n' + JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error(error);
        showStatus('❌ FFIEC API test failed: ' + error.message, false);
        showResult('Error details:\n' + error.message);
    }
}

async function updateData() {
    try {
        showStatus('Updating bank data...', true);
        showResult('');

        const netlifyUrl = bce_data.netlify_url;
        if (!netlifyUrl) {
            throw new Error('Missing Netlify URL. Please configure it in the settings above.');
        }

        const response = await fetch(netlifyUrl + '/.netlify/functions/ffiec?top=100', {
            method: 'GET'
        });
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { rawResponse: text };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        showStatus(`✅ Data update successful (${response.status})`, false);
        showResult('Data update completed:\n' + JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error(error);
        showStatus('❌ Data update failed: ' + error.message, false);
        showResult('Error details:\n' + error.message);
    }
}
