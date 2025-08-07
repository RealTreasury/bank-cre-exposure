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
    $netlify_url = get_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');

    $js_vars = "
        window.bce_plugin_url = '" . plugin_dir_url(__FILE__) . "';
        window.bce_netlify_url = '" . esc_js($netlify_url) . "';
    ";

    wp_add_inline_script('bce-script', $js_vars, 'before');
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

    add_action('admin_enqueue_scripts', function ($enqueue_hook) use ($hook) {
        if ($enqueue_hook !== $hook) {
            return;
        }
        wp_enqueue_script(
            'bce-admin-script',
            plugin_dir_url(__FILE__) . 'assets/js/admin.js',
            ['jquery'],
            '1.0.2',
            true
        );

        $netlify_url = get_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');
        wp_localize_script(
            'bce-admin-script',
            'bce_data',
            [
                'netlify_url' => $netlify_url,
            ]
        );
    });
}
add_action('admin_menu', 'bce_register_admin_page');

function bce_register_settings() {
    register_setting('bce_settings', 'BCE_NETLIFY_URL', [
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default'           => 'https://stirring-pixie-0b3931.netlify.app',
    ]);
}
add_action('admin_init', 'bce_register_settings');

function bce_render_admin_page() {
    $netlify_url = get_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');
    include plugin_dir_path(__FILE__) . 'templates/admin-page.php';
}
