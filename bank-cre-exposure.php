<?php
/**
 * Plugin Name: Bank CRE Exposure Tool
 * Plugin URI: https://realtreasury.com/tools/bank-cre-exposure
 * Description: Visualize and interact with U.S. regional bank CRE exposure. Originally hosted on GitHub Pages.
 * Version: 1.0.0
 * Author: Real Treasury
 * Author URI: https://realtreasury.com
 * License: GPL2
 * Text Domain: bank-cre-exposure
 */

function bce_enqueue_assets() {
    wp_enqueue_style('bce-style', plugin_dir_url(__FILE__) . 'assets/css/style.css', [], '1.0.0');
    wp_enqueue_script('bce-script', plugin_dir_url(__FILE__) . 'assets/js/main.js', [], '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'bce_enqueue_assets');

function bce_pass_js_vars() {
    wp_add_inline_script('bce-script', 'window.bce_plugin_url = "' . plugin_dir_url(__FILE__) . '";', 'before');
}
add_action('wp_enqueue_scripts', 'bce_pass_js_vars');

function bce_render_tool() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'templates/display-tool.php';
    return ob_get_clean();
}
add_shortcode('bank_cre_exposure', 'bce_render_tool');

function bce_register_admin_page() {
    $hook = add_menu_page(
        __('Bank CRE Exposure', 'bank-cre-exposure'),
        __('Bank CRE Exposure', 'bank-cre-exposure'),
        'manage_options',
        'bank-cre-exposure',
        'bce_render_admin_page',
        'dashicons-chart-area',
        100
    );

    add_action('admin_print_scripts-' . $hook, 'bce_enqueue_admin_assets');
}
add_action('admin_menu', 'bce_register_admin_page');

function bce_enqueue_admin_assets() {
    wp_enqueue_script(
        'bce-admin',
        plugin_dir_url(__FILE__) . 'assets/js/admin.js',
        ['jquery', 'wp-util'],
        '1.0.0',
        true
    );
}

function bce_render_admin_page() {
    include plugin_dir_path(__FILE__) . 'templates/admin-page.php';
}

function bce_test_netlify() {
    $url = get_option('bce_netlify_url');
    if (!$url) {
        $url = getenv('BCE_NETLIFY_URL');
    }
    if (!$url) {
        wp_send_json_error(['message' => 'Netlify URL not configured']);
    }

    $response = wp_remote_get($url);
    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
    }

    $status = wp_remote_retrieve_response_code($response);
    $body   = wp_remote_retrieve_body($response);
    $json   = json_decode($body, true);

    wp_send_json_success([
        'status' => $status,
        'body'   => $json ? $json : substr($body, 0, 500)
    ]);
}
add_action('wp_ajax_bce_test_netlify', 'bce_test_netlify');

function bce_test_ffiec() {
    $username = getenv('FFIEC_USERNAME') ?: get_option('ffiec_username');
    $password = getenv('FFIEC_PASSWORD') ?: get_option('ffiec_password');
    $token    = getenv('FFIEC_TOKEN') ?: get_option('ffiec_token');

    if (!$username || !$password || !$token) {
        wp_send_json_error(['message' => 'FFIEC credentials not configured']);
    }

    $auth = base64_encode($username . ':' . $password . $token);
    $url  = 'https://cdr.ffiec.gov/public/PWS/UBPR/Search?top=1';

    $response = wp_remote_get($url, [
        'headers' => [
            'Authorization' => 'Basic ' . $auth,
            'Accept'        => 'application/json',
            'User-Agent'    => 'Mozilla/5.0'
        ]
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
    }

    $status = wp_remote_retrieve_response_code($response);
    $body   = wp_remote_retrieve_body($response);
    $json   = json_decode($body, true);

    if (!$json) {
        wp_send_json_error([
            'status' => $status,
            'body'   => substr($body, 0, 500)
        ]);
    }

    wp_send_json_success([
        'status' => $status,
        'body'   => $json
    ]);
}
add_action('wp_ajax_bce_test_ffiec', 'bce_test_ffiec');
