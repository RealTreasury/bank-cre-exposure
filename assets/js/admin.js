(function($){
    function handleTest(action, label){
        var $results = $('#bce-test-results');
        $results.text('Testing ' + label + '...');
        wp.ajax.post(action).done(function(response){
            var body = response.body;
            if (typeof body !== 'string'){
                body = JSON.stringify(body);
            }
            $results.text(label + ' success (HTTP ' + response.status + ')\n' + body);
        }).fail(function(error){
            var message = (error.responseJSON && (error.responseJSON.data && (error.responseJSON.data.message || error.responseJSON.data))) || error.statusText || 'Unknown error';
            $results.text(label + ' error: ' + message);
        });
    }

    $(function(){
        $('#bce-test-netlify').on('click', function(e){
            e.preventDefault();
            handleTest('bce_test_netlify', 'Netlify');
        });
        $('#bce-test-ffiec').on('click', function(e){
            e.preventDefault();
            handleTest('bce_test_ffiec', 'FFIEC API');
        });
    });
})(jQuery);
