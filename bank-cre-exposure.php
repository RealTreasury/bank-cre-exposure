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

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin activation
function bce_activate() {
    if (false === get_option('BCE_NETLIFY_URL')) {
        add_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');
    }
}
register_activation_hook(__FILE__, 'bce_activate');

// Enqueue assets for frontend
function bce_enqueue_assets() {
    // Only enqueue on pages that have our shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'bank_cre_exposure')) {
        wp_enqueue_style(
            'bce-style', 
            plugin_dir_url(__FILE__) . 'assets/css/style.css', 
            [], 
            '1.0.1'
        );
        
        wp_enqueue_script(
            'bce-script', 
            plugin_dir_url(__FILE__) . 'assets/js/main.js', 
            [], 
            '1.0.1', 
            true
        );

        // Pass data to JavaScript
        $netlify_url = get_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');
        wp_localize_script('bce-script', 'bce_data', array(
            'netlify_url' => esc_url_raw($netlify_url),
            'plugin_url' => plugin_dir_url(__FILE__),
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('bce_nonce')
        ));
    }
}
add_action('wp_enqueue_scripts', 'bce_enqueue_assets');

// Shortcode handler
function bce_render_tool($atts) {
    // Check if Netlify URL is configured
    $netlify_url = get_option('BCE_NETLIFY_URL');
    if (empty($netlify_url)) {
        return '<div class="bce-error">Plugin not configured. Please set Netlify URL in WordPress admin.</div>';
    }
    
    // Start output buffering
    ob_start();
    
    // Include the template
    $template_path = plugin_dir_path(__FILE__) . 'templates/display-tool.php';
    if (file_exists($template_path)) {
        include $template_path;
    } else {
        echo '<div class="bce-error">Template file not found.</div>';
    }
    
    return ob_get_clean();
}
add_shortcode('bank_cre_exposure', 'bce_render_tool');

// Admin menu
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

    // Enqueue admin scripts only on our admin page
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
            array(
                'netlify_url' => esc_url_raw($netlify_url),
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('bce_admin_nonce')
            )
        );
    });
}
add_action('admin_menu', 'bce_register_admin_page');

// Register settings
function bce_register_settings() {
    register_setting('bce_settings', 'BCE_NETLIFY_URL', array(
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default'           => 'https://stirring-pixie-0b3931.netlify.app',
    ));
}
add_action('admin_init', 'bce_register_settings');

// Admin page renderer
function bce_render_admin_page() {
    $netlify_url = get_option('BCE_NETLIFY_URL', 'https://stirring-pixie-0b3931.netlify.app');
    
    $template_path = plugin_dir_path(__FILE__) . 'templates/admin-page.php';
    if (file_exists($template_path)) {
        include $template_path;
    } else {
        echo '<div class="wrap"><h1>Admin template not found</h1></div>';
    }
}

// Add admin notice if plugin isn't configured
function bce_admin_notices() {
    $netlify_url = get_option('BCE_NETLIFY_URL');
    if (empty($netlify_url)) {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p><strong>Bank CRE Exposure Plugin:</strong> Please configure your Netlify URL in <a href="<?php echo admin_url('admin.php?page=bank-cre-exposure'); ?>">plugin settings</a>.</p>
        </div>
        <?php
    }
}
add_action('admin_notices', 'bce_admin_notices');

// Add plugin action links
function bce_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=bank-cre-exposure') . '">Settings</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'bce_plugin_action_links');

// AJAX handler for testing connection (if needed)
function bce_test_connection() {
    check_ajax_referer('bce_admin_nonce', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }
    
    $netlify_url = get_option('BCE_NETLIFY_URL');
    if (empty($netlify_url)) {
        wp_send_json_error('Netlify URL not configured');
    }
    
    $test_url = trailingslashit($netlify_url) . '.netlify/functions/ffiec?test=true';
    $response = wp_remote_get($test_url, array('timeout' => 30));
    
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    wp_send_json_success($data);
}
add_action('wp_ajax_bce_test_connection', 'bce_test_connection');

// Debug info (remove in production)
function bce_debug_info() {
    if (current_user_can('manage_options') && isset($_GET['bce_debug'])) {
        echo '<pre>';
        echo 'Plugin Path: ' . plugin_dir_path(__FILE__) . "\n";
        echo 'Plugin URL: ' . plugin_dir_url(__FILE__) . "\n";
        echo 'Netlify URL: ' . get_option('BCE_NETLIFY_URL') . "\n";
        echo 'WordPress Version: ' . get_bloginfo('version') . "\n";
        echo 'PHP Version: ' . PHP_VERSION . "\n";
        echo '</pre>';
    }
}
add_action('wp_footer', 'bce_debug_info');
