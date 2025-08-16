# AGENTS - Netlify Functions Development

## Function Architecture

### FFIEC Function (`netlify/functions/ffiec.js`) - **MODIFY MOST OFTEN**
**Purpose**: Bank data fetching via SOAP and REST APIs
**Modify When**: Adding new bank metrics, changing data processing, updating API endpoints

```javascript
// MODIFY PATTERN: Adding new UBPR fields
const ubprMap = new Map();
for (const u of ubprRows) {
  const key = u.CERT || u.ID_RSSD;
  if (key) ubprMap.set(key.toString(), u);
}

// MODIFY PATTERN: Data transformation
const data = limited.map((bank, index) => ({
  bank_name: bank.Name || bank.BankName,
  rssd_id: bank.ID_Rssd || bank.RSSD_ID,
  // ADD NEW FIELDS HERE
  new_metric: bank.ubpr_new_field ?? null,
}));
```

### FRED Function (`netlify/functions/fred.js`) - **MODIFY FOR ECONOMIC DATA**
**Purpose**: Federal Reserve economic data integration
**Modify When**: Adding new economic indicators, changing time series parameters

```javascript
// MODIFY PATTERN: Economic data fetching
const { series_id, limit = 10, sort_order = 'desc' } = event.queryStringParameters;
const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${FRED_API_KEY}`;
```

## Development Patterns

### Function Structure Pattern
```javascript
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Process request
    const result = await processData(event.queryStringParameters);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Error Handling Pattern
```javascript
// Standardized API error handling
try {
  const response = await axios.get(url, { timeout: 30000 });
  return response.data;
} catch (error) {
  console.error('API Error:', error);
  throw new Error(`API request failed: ${error.message}`);
}
```

### Authentication Pattern
```javascript
// FFIEC authentication
const username = process.env.FFIEC_USERNAME;
const token = process.env.FFIEC_TOKEN;
const auth = Buffer.from(`${username}:${token}`).toString('base64');
const headers = { Authorization: `Basic ${auth}` };
```

## Common Function Modifications

### Adding New Query Parameters
```javascript
const params = event.queryStringParameters || {};
const newParam = params.new_param || 'default_value';
const limit = parseInt(params.limit, 10) || 100;
```

### Adding New API Endpoints
1. **Create Function**: New file in `netlify/functions/`
2. **Configure CORS**: Add headers for cross-origin requests
3. **Environment Variables**: Add to Netlify dashboard
4. **Testing**: Add to test suite

### Data Processing Pipeline
```javascript
// Pattern: Fetch → Transform → Output
const rawData = await fetchFromAPI();
const processedData = rawData.map(transformRecord);
const limitedData = processedData.slice(0, limit);
return { data: limitedData, metadata: {} };
```
