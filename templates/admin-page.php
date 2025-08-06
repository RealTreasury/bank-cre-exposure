<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e('Bank CRE Exposure Tool', 'bank-cre-exposure'); ?></h1>
    <p><?php esc_html_e('Use the shortcode', 'bank-cre-exposure'); ?> <code>[bank_cre_exposure]</code> <?php esc_html_e('to embed the report.', 'bank-cre-exposure'); ?></p>
    <h2><?php esc_html_e('Credential Status', 'bank-cre-exposure'); ?></h2>
    <ul>
        <?php foreach ($credentials as $name => $value) : ?>
            <li>
                <code><?php echo esc_html($name); ?></code>:
                <?php if ($value) : ?>
                    <span class="dashicons dashicons-yes-alt" style="color:green;"></span>
                    <?php esc_html_e('Present', 'bank-cre-exposure'); ?>
                <?php else : ?>
                    <span class="dashicons dashicons-warning" style="color:#dc3232;"></span>
                    <?php esc_html_e('Missing', 'bank-cre-exposure'); ?>
                    <a href="https://github.com/RealTreasury/bank-cre-exposure#readme" target="_blank">
                        <?php esc_html_e('Setup Instructions', 'bank-cre-exposure'); ?>
                    </a>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
</div>

