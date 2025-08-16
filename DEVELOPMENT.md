# Bank CRE WordPress Plugin - Development Guide

## AI-Assisted Development Setup

This WordPress plugin is optimized for AI-assisted development using tools like GitHub Codex, Copilot, and Claude.

### Quick Start for AI Development

1. **Repository Context**: WordPress plugin with Netlify functions backend
2. **Main Technologies**: PHP, JavaScript, Node.js, Python
3. **Key Files**: See `AGENTS.md` for modification points
4. **Development Pattern**: Plugin → Functions → APIs → Frontend

### AI-Friendly Development Commands

```bash
# Setup development environment
cp .env.example .env
cd dev && npm install
netlify dev

# Run comprehensive tests
./scripts/test-all.sh

# Package for deployment
./scripts/package-plugin.sh

# Lint all code
./scripts/lint.sh
```

### Most Common Modifications for AI

1. **Adding Bank Metrics** (`dev/netlify/functions/ffiec.js`)
2. **Frontend Display** (`templates/display-tool.php`)
3. **Data Rendering** (`assets/js/main.js`)
4. **WordPress Settings** (`bank-cre-exposure.php`)
5. **Admin Interface** (`templates/admin-page.php`)

### Repository Structure for AI Context

```
bank-cre-exposure/           # WordPress plugin root
├── AGENTS.md               # Main AI development guide
├── bank-cre-exposure.php   # WordPress plugin core
├── assets/                 # Frontend assets (CSS, JS)
│   └── AGENTS.md          # Frontend development guide
├── dev/                   # Netlify functions
│   └── AGENTS.md         # Backend development guide
├── templates/             # WordPress templates
├── scripts/               # Python utilities
├── tests/                 # Test suite
├── docs/                  # Documentation
├── config/                # Configuration files
└── data/                  # Sample data
```

### AI Development Patterns

**WordPress Plugin Pattern**:
```php
// Hook registration
add_action('action_name', 'function_name');

// Settings API
register_setting('group', 'option_name', ['sanitize_callback' => 'function']);

// Shortcode
add_shortcode('shortcode_name', 'render_function');
```

**Netlify Function Pattern**:
```javascript
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  try {
    const result = await processRequest(event.queryStringParameters);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: error.message }) };
  }
};
```

**Frontend JavaScript Pattern**:
```javascript
async function loadData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    renderData(data);
  } catch (error) {
    showError(error.message);
  }
}
```

This structure provides comprehensive context for AI development tools while maintaining professional WordPress plugin standards.
