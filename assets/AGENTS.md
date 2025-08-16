# AGENTS - Frontend Assets Directory

## Asset Organization for WordPress Plugin

### CSS (`css/style.css`) - **MODIFY MOST OFTEN**
**Purpose**: Glassmorphism design system for WordPress frontend
**Modify When**: Visual design changes, responsive layout updates, new component styling

```css
/* MODIFY PATTERN: Adding new glassmorphism components */
.new-component {
    background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.95) 0%, 
        rgba(248, 248, 248, 0.98) 100%);
    backdrop-filter: blur(20px) saturate(130%);
    border: 2px solid rgba(199, 125, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(114, 22, 244, 0.12);
}

/* MODIFY PATTERN: Risk indicator styling */
.risk-indicator {
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    display: inline-block;
}
```

### JavaScript (`js/main.js`) - **MODIFY FOR DATA HANDLING**
**Purpose**: Frontend data fetching and table rendering
**Modify When**: Adding new data fields, changing display logic, new user interactions

```javascript
// MODIFY PATTERN: Data fetching from Netlify functions
async function loadBanksViaNetlify() {
  try {
    const base = window.bce_data?.netlify_url;
    const url = `${base}/.netlify/functions/ffiec?reporting_period=${period}&top=100`;
    const response = await fetch(url);
    const { data = [] } = await response.json();
    renderBanks(data);
  } catch (error) {
    showError('FFIEC load failed: ' + error.message);
  }
}

// MODIFY PATTERN: Table rendering
function renderBanks(banks) {
  banks.forEach((b, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${b.bank_name ?? ''}</td>
      <!-- ADD NEW COLUMNS HERE -->
    `;
  });
}
```

### JavaScript (`js/admin.js`) - **MODIFY FOR ADMIN FEATURES**
**Purpose**: WordPress admin interface and diagnostic tools
**Modify When**: Adding admin features, new diagnostic tests, settings management

```javascript
// MODIFY PATTERN: Admin diagnostic functions
async function testFFIEC() {
  try {
    showStatus('Testing FFIEC API...', true);
    const netlifyUrl = getNetlifyUrl();
    const response = await fetch(netlifyUrl + '/.netlify/functions/ffiec?test=true');
    const data = await response.json();
    showStatus('✅ FFIEC API test successful', false, 'success');
  } catch (error) {
    showStatus('❌ FFIEC API test failed', false, 'error');
  }
}
```

## Common Asset Modification Patterns

### Adding New Visual Components
1. **CSS**: Create glassmorphism styling in `css/style.css`
2. **Template**: Add HTML structure in `templates/`
3. **JavaScript**: Add interactivity in `js/main.js`

### Adding New Data Visualizations
1. **JavaScript**: Implement chart/graph logic in `js/main.js`
2. **CSS**: Add styling for new visual elements
3. **Template**: Add container elements in PHP templates

### Modifying Responsive Design
- **Location**: `css/style.css` media queries
- **Pattern**: Mobile-first design with progressive enhancement
- **Key Breakpoints**: 600px (mobile), 768px (tablet), 1024px (desktop)

### Error Handling Patterns
```javascript
// Standardized error display
function showError(message) {
  const div = document.getElementById('errorMessage');
  if (div) {
    div.textContent = message;
    div.style.display = 'block';
  }
  console.error('Error:', message);
}
```

### Asset Loading Patterns
```php
// WordPress asset enqueuing
function bce_enqueue_assets() {
    wp_enqueue_style('bce-style', plugin_dir_url(__FILE__) . 'assets/css/style.css');
    wp_enqueue_script('bce-script', plugin_dir_url(__FILE__) . 'assets/js/main.js');
}
```
