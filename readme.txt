=== Bank CRE Exposure Tool ===
Contributors: Real Treasury
Tags: banking, cre, data
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Visualize and interact with U.S. regional bank CRE exposure. Use shortcode [bank_cre_exposure] to embed the tool.

== Description ==

This plugin converts the original GitHub Pages project into a WordPress plugin, enqueuing its assets and providing a shortcode.

== Configuration ==

After activating the plugin, visit the **Bank CRE Exposure** settings page in your WordPress admin. The plugin automatically sets the Netlify URL option to `https://stirring-pixie-0b3931.netlify.app` so it points to the correct deployment. Adjust this value if you are using a different Netlify site.

The reporting-period dropdown will always show the most recent twelve quarter ends. If the Netlify function fails to return periods, the dates are generated locally as a fallback.
