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
    add_menu_page(
        __('Bank CRE Exposure', 'bank-cre-exposure'),
        __('Bank CRE Exposure', 'bank-cre-exposure'),
        'manage_options',
        'bank-cre-exposure',
        'bce_render_admin_page',
        'dashicons-chart-area',
        100
    );
}
add_action('admin_menu', 'bce_register_admin_page');

function bce_render_admin_page() {
    $credentials = [
        'FRED_API_KEY'   => getenv('FRED_API_KEY') ?: get_option('FRED_API_KEY'),
        'FFIEC_USERNAME' => getenv('FFIEC_USERNAME') ?: get_option('FFIEC_USERNAME'),
        'FFIEC_PASSWORD' => getenv('FFIEC_PASSWORD') ?: get_option('FFIEC_PASSWORD'),
        'FFIEC_TOKEN'    => getenv('FFIEC_TOKEN') ?: get_option('FFIEC_TOKEN'),
    ];

    foreach ($credentials as $name => $value) {
        if (empty($value)) {
            error_log("Bank CRE Exposure: missing credential {$name}");
        }
    }

    include plugin_dir_path(__FILE__) . 'templates/admin-page.php';
}
