(function($){
    async function updateData() {
        try {
            const statusDiv = document.getElementById('status');
            if (statusDiv) {
                statusDiv.innerHTML = 'Updating data... <div class="spinner"></div>';
            }

            // The hardcoded Netlify URL
            const netlifyUrl = "https://stirring-pixie-0b3931.netlify.app";

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
    function runTest(action){
        var $out = $('#bce-test-result');
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
    $(function(){
        $('#bce-test-netlify').on('click', function(e){
            e.preventDefault();
            runTest('bce_test_netlify');
        });
        $('#bce-test-ffiec').on('click', function(e){
            e.preventDefault();
            runTest('bce_test_ffiec');
        });
        $('#bce-update-data').on('click', function(e){
            e.preventDefault();
            updateData();
        });
    });
})(jQuery);
