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
    // Fetch available UBPR periods to avoid unreleased dates
    const periodsRes = await axios.get('https://api.ffiec.gov/public/v2/ubpr/periods', {
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    });
    const available = Array.isArray(periodsRes.data?.periods) ? periodsRes.data.periods : [];
    // Sort periods from newest to oldest and select a released one
    const sorted = [...available].sort((a, b) => new Date(b) - new Date(a));
    const chosen = sorted.length > 1 ? sorted[1] : sorted[0];
    const repdte = chosen ? chosen.replace(/-/g, '') : undefined;

    const resp = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
      params: {
        limit: 1,
        filters: repdte ? `REPDTE:${repdte}` : undefined,
        format: 'json',
      },
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    });

    const data = Array.isArray(resp.data) ? resp.data : resp.data?.data;

    if (Array.isArray(data) && data.length > 0) {
      const bank = data[0];
      console.log('✅ Credentials verified. Sample institution:');
      console.log(`   • ${bank.NAME} (assets: ${bank.TA})`);
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

