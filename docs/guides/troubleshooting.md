# Troubleshooting Guide

## Common Issues

### FFIEC API Connection Problems
**Symptoms**: "FFIEC load failed" errors, empty data tables
**Solutions**:
1. Verify FFIEC credentials in Netlify environment variables
2. Check FFIEC account status at cdr.ffiec.gov
3. Review Netlify function logs for detailed error messages
4. Test credentials with `scripts/test_ffiec_credentials.sh`

### WordPress Plugin Issues
**Symptoms**: Shortcode not rendering, admin page errors
**Solutions**:
1. Ensure plugin is activated in WordPress admin
2. Check WordPress error logs
3. Verify theme compatibility
4. Test in safe mode with default theme

### Netlify Function Timeouts
**Symptoms**: 504 Gateway Timeout errors
**Solutions**:
1. Increase function timeout in netlify.toml
2. Optimize API calls and data processing
3. Add retry logic for slow FFIEC responses
4. Monitor function execution time

### Frontend Display Issues
**Symptoms**: Data not rendering, JavaScript errors
**Solutions**:
1. Check browser console for JavaScript errors
2. Verify Netlify URL configuration
3. Test API endpoints directly
4. Clear browser cache and cookies

## Diagnostic Tools

### Admin Interface Tests
- Use "Run Comprehensive Diagnostic" button
- Test individual API connections
- Review detailed error messages

### Manual Testing
```bash
# Test FFIEC credentials
export FFIEC_USERNAME="your_username"
export FFIEC_TOKEN="your_token"
node dev/test-ffiec-credentials.js

# Test Netlify functions locally
cd dev && netlify dev

# Package plugin for testing
./scripts/package-plugin.sh
```
