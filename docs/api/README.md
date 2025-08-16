# Bank CRE Plugin API Documentation

## Netlify Functions

### FFIEC Function
**Endpoint**: `/.netlify/functions/ffiec`
**Purpose**: Fetch bank data from FFIEC APIs

**Parameters**:
- `reporting_period` (string): Quarter end date (YYYY-MM-DD)
- `top` (number): Maximum number of banks to return
- `test` (boolean): Health check mode

**Response**:
```json
{
  "data": [
    {
      "bank_name": "Bank Name",
      "rssd_id": "123456", 
      "cre_to_tier1": 325.5,
      "total_assets": 5000000
    }
  ],
  "_meta": {
    "reportingPeriod": "2024-09-30",
    "source": "ffiec_soap_panel"
  }
}
```

### FRED Function
**Endpoint**: `/.netlify/functions/fred`
**Purpose**: Fetch economic data from Federal Reserve

**Parameters**:
- `series_id` (string): FRED series identifier
- `limit` (number): Number of observations
- `sort_order` (string): 'asc' or 'desc'

## WordPress Integration

### Shortcode
```php
[bank_cre_exposure]
```

### Plugin Options
- `BCE_NETLIFY_URL`: Base URL for Netlify deployment

### Hooks
- `bce_before_data_load`: Before fetching bank data
- `bce_after_data_load`: After rendering bank data
