# FFIEC API Setup Guide

## Getting FFIEC Credentials

1. **Register at FFIEC:**
   - Visit: https://cdr.ffiec.gov/public/
   - Click "Register" and complete the form
   - Wait for email confirmation

2. **Request PWS Access:**
   - Log into your FFIEC account
   - Navigate to "Manage My Web Service Account"
   - Request Public Web Service (PWS) access
   - Wait 1-2 business days for approval

3. **Get Your Credentials:**
   - Username: Your FFIEC account username
   - Security Token: Unique API token (NOT your password)

## Setting Up Environment Variables

### For Netlify:
1. Go to Netlify Dashboard
2. Site settings → Environment variables
3. Add:
   - `FFIEC_USERNAME` = your_username
   - `FFIEC_TOKEN` = your_security_token

### For Local Testing:
```bash
export FFIEC_USERNAME="your_username"
export FFIEC_TOKEN="your_security_token"
```

## Testing Your Setup

```bash
# Quick diagnostic
cd dev && node quick-ffiec-diagnostic.js

# Full test suite
cd dev && node test-ffiec-comprehensive.js

# Deploy to Netlify
cd dev && netlify deploy --prod
```

## Troubleshooting

- **Credentials Missing**: Set environment variables in Netlify dashboard
- **Invalid Credentials**: Verify token is correct and account has PWS access
- **API Unavailable**: Check FFIEC service status and internet connectivity
- **No Data**: Try different reporting period or check account permissions
