# AGENTS - Bank CRE Exposure WordPress Plugin

## Project Overview
WordPress plugin providing real-time commercial real estate (CRE) exposure analysis for U.S. banks using FFIEC and FRED APIs via Netlify serverless functions.

**Primary Use Case**: AI-assisted development for WordPress plugin with live financial data integration.

## Quick Reference for Code Changes

### Most Common Modification Points
1. **FFIEC Integration**: `dev/netlify/functions/ffiec.js` - Core bank data fetching and processing
2. **Frontend Display**: `templates/display-tool.php` - WordPress template and UI structure
3. **Client Logic**: `assets/js/main.js` - Data rendering and user interactions
4. **Plugin Core**: `bank-cre-exposure.php` - WordPress hooks, settings, admin interface
5. **Admin Interface**: `templates/admin-page.php` - Plugin configuration and diagnostics

## Architecture & Key Modification Points

### WordPress Plugin Files - Modify for core functionality
- **Main Plugin**: `bank-cre-exposure.php` - **MODIFY HERE**: Plugin registration, WordPress hooks, settings API
- **Shortcode Template**: `templates/display-tool.php` - **MODIFY HERE**: Frontend HTML structure, risk criteria display
- **Admin Interface**: `templates/admin-page.php` - **MODIFY HERE**: Settings forms, diagnostic tools, help documentation
- **Plugin Stylesheet**: `assets/css/style.css` - **MODIFY HERE**: Glassmorphism design, responsive layout

### Netlify Functions Backend - Modify for API integration
- **FFIEC Function**: `dev/netlify/functions/ffiec.js` - **MODIFY HERE**: SOAP/REST API calls, data transformation, error handling
- **FRED Function**: `dev/netlify/functions/fred.js` - **MODIFY HERE**: Economic data integration from Federal Reserve
- **Deployment Config**: `netlify.toml` - **MODIFY HERE**: Build settings, environment variables, CORS headers

### Frontend Assets - Modify for user experience
- **Main JavaScript**: `assets/js/main.js` - **MODIFY HERE**: Data fetching, table rendering, filtering, sorting
- **Admin JavaScript**: `assets/js/admin.js` - **MODIFY HERE**: Diagnostic tools, API testing, admin workflows
- **Fallback Data**: `assets/data/bank-data.json` - **MODIFY HERE**: Sample data structure, offline fallback

### Python Utilities - Modify for direct API access
**Direct API Scripts** (modify in `scripts/`):
```python
# scripts/ffiec_api.py - Direct FFIEC API client
def search_ubpr(params, headers):
    # MODIFY: Add new UBPR data fields or filtering
    return _request("https://api.ffiec.gov/public/v2/ubpr/financials", headers, params)

# scripts/fred_api.py - Federal Reserve economic data
def get_series_observations(series_id, api_key):
    # MODIFY: Add new economic indicators or time series
    return requests.get(f"{FRED_BASE_URL}/series/observations")
```

**Adding New Bank Metrics**:
1. **FFIEC Function**: Update data mapping in `dev/netlify/functions/ffiec.js`
```javascript
// Add to UBPR data mapping
const u = ubprMap.get(key) || {};
return {
  ...r,
  // ADD NEW UBPR FIELDS HERE
  new_metric: u.UBPR_CODE ?? null,
};

// Add to final output
const data = limited.map((bank, index) => ({
  bank_name: bank.Name || bank.BankName,
  // ADD NEW OUTPUT FIELDS HERE
  new_metric: bank.new_metric ?? null,
}));
```

2. **Template**: Add table column in `templates/display-tool.php`
```html
<th onclick="sortTable(8)">New Metric (%)</th>
```

3. **Client**: Update rendering in `assets/js/main.js`
```javascript
// Add to table row generation
<td>${b.new_metric ?? '—'}</td>
```

### Adding New Risk Criteria
- **Location**: Update conditions in `templates/display-tool.php`
- **Format**: Add to conditions-box grid
```html
<div class="condition-item">New Risk Metric ≥ Threshold%</div>
```

### Modifying WordPress Integration
1. **Plugin Settings**: Add options in `bank-cre-exposure.php`
```php
register_setting('bce_settings', 'BCE_NEW_OPTION', [
    'type' => 'string',
    'sanitize_callback' => 'sanitize_text_field',
]);
```

2. **Admin Interface**: Update forms in `templates/admin-page.php`
3. **Frontend Assets**: Modify enqueuing in `bank-cre-exposure.php`

### Adding External Data Sources
1. **New Function**: Create in `dev/netlify/functions/`
2. **Integration**: Call from `assets/js/main.js`
3. **Configuration**: Add environment variables to `netlify.toml`
4. **Python Client**: Create utility in `scripts/`

## Development Workflow

### Local Development Setup
1. **WordPress Plugin**:
   ```bash
   # Copy to WordPress plugins directory
   cp -r . /path/to/wordpress/wp-content/plugins/bank-cre-exposure/
   ```

2. **Netlify Functions**:
   ```bash
   cd dev
   npm install
   netlify dev  # Requires Netlify CLI
   ```

3. **Environment Variables**:
   ```bash
   # Configure credentials
   cp .env.example .env
   # Add FFIEC_USERNAME, FFIEC_TOKEN, FRED_API_KEY
   ```

### Testing Strategy
- **WordPress Plugin**: Use admin diagnostics and shortcode testing
- **Netlify Functions**: Local development with `netlify dev`
- **API Integration**: Direct testing with Python scripts
- **Frontend**: Browser developer tools and network inspection

### Key Development Conventions

### WordPress Patterns
```php
// Hook registration pattern
add_action('wp_enqueue_scripts', 'bce_enqueue_assets');
add_action('admin_menu', 'bce_register_admin_page');

// Settings API pattern
register_setting('bce_settings', 'BCE_OPTION_NAME', [
    'type' => 'string',
    'sanitize_callback' => 'sanitize_callback_function',
]);

// Shortcode pattern
add_shortcode('bank_cre_exposure', 'bce_render_tool');
```

### Netlify Function Patterns
```javascript
// Standard function structure
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  try {
    const result = await processRequest(event);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: error.message }) };
  }
};
```

### Frontend JavaScript Patterns
```javascript
// Data fetching pattern
async function loadData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderData(data);
  } catch (error) {
    showError('Failed to load: ' + error.message);
  }
}
```

## Security & Performance

### Security
- Environment variables for API credentials in Netlify
- WordPress nonce verification for admin actions
- Input sanitization using WordPress functions
- CORS headers properly configured for function calls

### Performance  
- Client-side caching for API responses
- Optimized CSS with mobile-first responsive design
- Efficient DOM manipulation in JavaScript
- Netlify CDN for global function distribution

### API Rate Limiting
- FFIEC: Respectful request timing with retry logic
- FRED: Standard rate limits (120 calls/minute)
- Client-side debouncing for user interactions

## Data Sources & Integration
- **FFIEC**: Federal Financial Institutions Examination Council
  - Panel of Reporters SOAP API for bank listing
  - UBPR v2 REST API for financial metrics
  - Authentication via HTTP Basic with username/token
- **FRED**: Federal Reserve Economic Data
  - REST API for economic indicators
  - API key authentication
- **WordPress**: Plugin integration with hooks and shortcodes

## Deployment & Monitoring
- **Netlify**: Automatic deployment on git push
- **WordPress**: Manual plugin installation or automatic updates
- **Environment Variables**: Managed through Netlify dashboard
- **Monitoring**: Function logs and admin diagnostic tools

## Troubleshooting Common Issues

### FFIEC API Connection
- Verify credentials in Netlify environment variables
- Check FFIEC account status and permissions
- Review function logs for SOAP/REST parsing errors
- Use admin diagnostic tools for testing

### WordPress Integration
- Ensure proper plugin activation
- Check for JavaScript errors in browser console
- Verify shortcode placement and theme compatibility
- Review WordPress error logs

### Netlify Function Issues
- Check build logs for deployment errors
- Verify function timeout settings (can be slow)
- Review CORS configuration for frontend calls
- Test functions directly via URL endpoints

### Frontend Display Issues
- Data not rendering, JavaScript errors
- Verify Netlify URL configuration
- Test API endpoints directly
- Clear browser cache and cookies

This WordPress plugin provides a robust foundation for AI-assisted development of financial data visualization tools with real-time API integration.
