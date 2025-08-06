(function($){
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
    });
})(jQuery);
