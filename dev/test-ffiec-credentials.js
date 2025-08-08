// FFIEC REST API credentials test script
// Run with: node test-ffiec-credentials.js

const axios = require('axios');

async function testFFIECCredentials() {
  const username = process.env.FFIEC_USERNAME;
  const token = process.env.FFIEC_TOKEN;

  console.log('=== FFIEC REST API Credentials Test ===\n');

  const missing = [];
  if (!username) missing.push('FFIEC_USERNAME');
  if (!token) missing.push('FFIEC_TOKEN');

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(v => console.log(`   • ${v}`));
    process.exit(1);
  }

  const authHeader = Buffer.from(`${username}:${token}`).toString('base64');

  try {
    const resp = await axios.get('https://cdr.ffiec.gov/public/PWS/UBPR/Search', {
      params: {
        reporting_period: '2024-09-30',
        limit: 1,
        sort_by: 'total_assets',
        sort_order: 'desc',
        metrics: 'bank_name,total_assets',
      },
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    });

    if (Array.isArray(resp.data?.data) && resp.data.data.length > 0) {
      const bank = resp.data.data[0];
      console.log('✅ Credentials verified. Sample institution:');
      console.log(`   • ${bank.bank_name} (assets: ${bank.total_assets})`);
    } else {
      console.log('⚠️ Request succeeded but no data returned.');
    }
  } catch (err) {
    console.log('❌ FFIEC API test failed:');
    console.log(`   Status: ${err.response?.status || 'unknown'}`);
    console.log(`   Message: ${err.response?.data?.message || err.message}`);
    process.exit(1);
  }
}

testFFIECCredentials();

