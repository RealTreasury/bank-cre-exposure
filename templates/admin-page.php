<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e('Bank CRE Exposure Tool', 'bank-cre-exposure'); ?></h1>
    <p><?php esc_html_e('Use the shortcode', 'bank-cre-exposure'); ?> <code>[bank_cre_exposure]</code> <?php esc_html_e('to embed the report.', 'bank-cre-exposure'); ?></p>
    <h2><?php esc_html_e('Connectivity Tests', 'bank-cre-exposure'); ?></h2>
    <p><?php esc_html_e('Verify connectivity to backend services.', 'bank-cre-exposure'); ?></p>
    <p>
        <button id="bce-test-netlify" class="button"><?php esc_html_e('Test Netlify', 'bank-cre-exposure'); ?></button>
        <button id="bce-test-ffiec" class="button"><?php esc_html_e('Test FFIEC API', 'bank-cre-exposure'); ?></button>
    </p>
    <pre id="bce-test-results" style="background:#fff; padding:10px; max-height:300px; overflow:auto;"></pre>
</div>

