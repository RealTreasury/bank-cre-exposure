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
                    <p class="description"><?php esc_html_e('Base URL of your Netlify deployment (e.g., https://your-site.netlify.app)', 'bank-cre-exposure'); ?></p>
                </td>
            </tr>
        </table>
        <?php submit_button(); ?>
    </form>

    <div class="notice notice-info">
        <h3><?php esc_html_e('Setup Instructions', 'bank-cre-exposure'); ?></h3>
        <ol>
            <li><strong>Deploy to Netlify:</strong> Deploy the /dev directory contents to a Netlify site</li>
            <li><strong>Configure Environment Variables:</strong> In Netlify Dashboard > Site settings > Environment variables, add:
                <ul style="margin-top: 10px;">
                    <li><code>FFIEC_USERNAME</code> - Your FFIEC Public Web Service username</li>
                    <li><code>FFIEC_PASSWORD</code> - Your FFIEC Public Web Service password</li>
                    <li><code>FFIEC_TOKEN</code> - Your FFIEC Public Web Service security token</li>
                </ul>
            </li>
            <li><strong>Get FFIEC Credentials:</strong> 
                <ol>
                    <li>Register at <a href="https://cdr.ffiec.gov/public/" target="_blank">FFIEC CDR Public Data Distribution</a></li>
                    <li>Request access to the Public Web Service (PWS) API</li>
                    <li>Obtain your username, password, and security token</li>
                    <li>Note: The security token is appended to your password during authentication</li>
                </ol>
            </li>
            <li><strong>Update Netlify URL:</strong> Enter your Netlify site URL above and save</li>
            <li><strong>Test Connection:</strong> Use the diagnostic tools below</li>
        </ol>
    </div>

    <h2><?php esc_html_e('Connection Diagnostics', 'bank-cre-exposure'); ?></h2>
    <p><?php esc_html_e('Use these tools to diagnose and fix connection issues:', 'bank-cre-exposure'); ?></p>

    <div style="margin: 20px 0;">
        <label for="bce-reporting-period"><strong>Reporting period (last 3 years):</strong></label>
        <select id="bce-reporting-period" name="bce-reporting-period" class="regular-text">
            <!-- Options populated by admin.js from Netlify list_periods -->
        </select>
    </div>

    <div style="margin: 20px 0;">
        <button id="bce-comprehensive-test" class="button button-primary" style="margin-right: 10px;">
            <span class="dashicons dashicons-admin-tools" style="margin-top: 3px;"></span>
            <?php esc_html_e('Run Comprehensive Diagnostic', 'bank-cre-exposure'); ?>
        </button>
        <button id="bce-test-netlify" class="button" style="margin-right: 10px;">
            <span class="dashicons dashicons-cloud" style="margin-top: 3px;"></span>
            <?php esc_html_e('Test Netlify Connection', 'bank-cre-exposure'); ?>
        </button>
        <button id="bce-test-ffiec" class="button" style="margin-right: 10px;">
            <span class="dashicons dashicons-database" style="margin-top: 3px;"></span>
            <?php esc_html_e('Test FFIEC API', 'bank-cre-exposure'); ?>
        </button>
        <button id="bce-update-data" class="button">
            <span class="dashicons dashicons-update" style="margin-top: 3px;"></span>
            <?php esc_html_e('Update Data', 'bank-cre-exposure'); ?>
        </button>
    </div>

    <div id="status" style="margin: 10px 0; padding: 15px; border-radius: 4px; display: none;"></div>
    
    <div style="margin-top: 20px;">
        <h3><?php esc_html_e('Test Results', 'bank-cre-exposure'); ?></h3>
        <pre id="bce-test-result" style="background:#f7f7f7;border:1px solid #ccc;padding:15px;max-height:400px;overflow:auto;font-size:12px;line-height:1.4;"></pre>
    </div>

    <div class="notice notice-info" style="margin-top: 30px;">
        <h3><?php esc_html_e('Common Issues & Solutions', 'bank-cre-exposure'); ?></h3>
        <details>
            <summary style="cursor: pointer; font-weight: bold;">🔧 Connection Issues</summary>
            <ul style="margin-top: 10px;">
                <li><strong>Netlify Function Not Found (404):</strong> Ensure the /dev directory is deployed to Netlify and functions are enabled</li>
                <li><strong>CORS Errors:</strong> Check that the Netlify function has proper CORS headers</li>
                <li><strong>Timeout Issues:</strong> FFIEC API can be slow; consider increasing function timeout in netlify.toml</li>
            </ul>
        </details>
        
        <details>
            <summary style="cursor: pointer; font-weight: bold;">🔑 Credential Issues</summary>
            <ul style="margin-top: 10px;">
                <li><strong>Missing Credentials:</strong> Add FFIEC_USERNAME, FFIEC_PASSWORD, FFIEC_TOKEN to Netlify environment variables</li>
                <li><strong>Invalid Credentials:</strong> Verify your FFIEC account is active and credentials are correct</li>
                <li><strong>Mock Data Only:</strong> This indicates credentials are missing or invalid</li>
            </ul>
        </details>
        
        <details>
            <summary style="cursor: pointer; font-weight: bold;">📊 Data Issues</summary>
            <ul style="margin-top: 10px;">
                <li><strong>No Data Returned:</strong> Check FFIEC API availability and your account permissions</li>
                <li><strong>Stale Data:</strong> FFIEC data is updated quarterly; latest data may not be immediately available</li>
                <li><strong>Formatting Errors:</strong> API response format may have changed; check function logs</li>
            </ul>
        </details>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #0073aa;">
        <h3><?php esc_html_e('Need Help?', 'bank-cre-exposure'); ?></h3>
        <p>If you're still experiencing issues:</p>
        <ul>
            <li>Check your browser's developer console for JavaScript errors</li>
            <li>Review Netlify function logs in your Netlify dashboard</li>
            <li>Verify your FFIEC account status at <a href="https://cdr.ffiec.gov/public/" target="_blank">cdr.ffiec.gov/public/</a></li>
            <li>Ensure your WordPress site can reach external URLs (some hosts block outgoing requests)</li>
        </ul>
    </div>
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

.notice.notice-success {
    border-left-color: #46b450;
}

.notice.notice-warning {
    border-left-color: #ffba00;
}

.notice.notice-error {
    border-left-color: #dc3232;
}

details {
    margin: 10px 0;
}

details summary {
    padding: 5px 0;
}

details[open] summary {
    margin-bottom: 10px;
}

.button .dashicons {
    margin-right: 5px;
}

#bce-test-result {
    min-height: 100px;
    border-radius: 4px;
    white-space: pre-wrap;
    word-wrap: break-word;
}

#bce-test-result:empty::before {
    content: "Test results will appear here...";
    color: #666;
    font-style: italic;
}
</style>
