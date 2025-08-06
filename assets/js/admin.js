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
            runTest('bce_test_ffiec');
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

const NETLIFY_URL = "https://stirring-pixie-0b3931.netlify.app";

async function updateData() {
    try {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = 'Updating data... <div class="spinner"></div>';
        }

        const netlifyUrl = NETLIFY_URL;
        if (!netlifyUrl) {
            throw new Error('Missing Netlify URL.');
        }

        const response = await fetch(netlifyUrl + '/.netlify/functions/ffiec', {
            method: 'POST'
        });
        const data = await response.json();

        if (statusDiv) {
            statusDiv.textContent = 'Update successful';
        }
        console.log(data);
    } catch (error) {
        console.error(error);
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = 'Update failed: ' + error.message;
        }
    }
}

async function testNetlify() {
    try {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = 'Testing Netlify... <div class="spinner"></div>';
        }

        const netlifyUrl = NETLIFY_URL;
        if (!netlifyUrl) {
            throw new Error('Missing Netlify URL.');
        }

        const response = await fetch(netlifyUrl + '/.netlify/functions/fred');
        await response.json();

        if (statusDiv) {
            statusDiv.textContent = 'Netlify test successful';
        }
    } catch (error) {
        console.error(error);
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = 'Netlify test failed: ' + error.message;
        }
    }
}

function runTest(action) {
    var $out = jQuery('#bce-test-result');
    $out.text('Running ' + action + '...');
    wp.ajax.post(action).done(function(resp){
        var text = JSON.stringify(resp, null, 2);
        $out.text('Success:\n' + text);
    }).fail(function(resp){
        var data = resp && resp.responseJSON ? resp.responseJSON : resp;
        var text = JSON.stringify(data, null, 2);
        $out.text('Error:\n' + text);
    });
}

