<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e('Bank CRE Exposure Tool', 'bank-cre-exposure'); ?></h1>
    <p><?php esc_html_e('Use the shortcode', 'bank-cre-exposure'); ?> <code>[bank_cre_exposure]</code> <?php esc_html_e('to embed the report.', 'bank-cre-exposure'); ?></p>

    <h2><?php esc_html_e('Settings', 'bank-cre-exposure'); ?></h2>
    <form method="post" action="options.php">
        <?php settings_fields('bce_settings'); ?>
        <table class="form-table" role="presentation">
            <tr>
                <th scope="row"><label for="BCE_NETLIFY_URL"><?php esc_html_e('Netlify URL', 'bank-cre-exposure'); ?></label></th>
                <td>
                    <input type="url" name="BCE_NETLIFY_URL" id="BCE_NETLIFY_URL" value="<?php echo esc_attr($netlify_url); ?>" class="regular-text" />
                    <p class="description"><?php esc_html_e('Base URL of your Netlify deployment.', 'bank-cre-exposure'); ?></p>
                </td>
            </tr>
        </table>
        <?php submit_button(); ?>
    </form>

    <h2><?php esc_html_e('Connection Status', 'bank-cre-exposure'); ?></h2>
    <p><?php esc_html_e('API credentials are managed in your Netlify environment. Test the connections below:', 'bank-cre-exposure'); ?></p>
    
    <div class="notice notice-info">
        <p><strong><?php esc_html_e('Note:', 'bank-cre-exposure'); ?></strong> 
        <?php esc_html_e('Credentials (FFIEC_USERNAME, FFIEC_PASSWORD, FFIEC_TOKEN) should be configured as environment variables in your Netlify deployment, not in WordPress.', 'bank-cre-exposure'); ?>
        </p>
    </div>

    <h2><?php esc_html_e('Connectivity Tests', 'bank-cre-exposure'); ?></h2>
    <p>
        <button id="bce-test-netlify" class="button button-primary"><?php esc_html_e('Test Netlify Connection', 'bank-cre-exposure'); ?></button>
        <button id="bce-test-ffiec" class="button"><?php esc_html_e('Test FFIEC API', 'bank-cre-exposure'); ?></button>
        <button id="bce-update-data" class="button">Update Data</button>
    </p>
    <div id="status" style="margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; display: none;"></div>
    <pre id="bce-test-result" style="background:#fff;border:1px solid #ccc;padding:1em;max-height:300px;overflow:auto;"></pre>
</div>

<style>
.spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
