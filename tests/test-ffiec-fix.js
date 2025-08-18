// Test script for FFIEC function fix
const { handler } = require('../dev/netlify/functions/ffiec.js');

async function testFFIECFix() {
  console.log('🧪 Testing FFIEC Function Fix\n');

  // Test 1: Health check without credentials
  console.log('1. Testing health check...');
  const healthEvent = {
    httpMethod: 'GET',
    queryStringParameters: { test: 'true' }
  };

  const healthResult = await handler(healthEvent);
  const healthData = JSON.parse(healthResult.body);

  console.log('Health check status:', healthData.status);
  console.log('Has credentials:', healthData.status === 'CREDENTIALS_AVAILABLE');

  // Test 2: Periods list
  console.log('\n2. Testing periods list...');
  const periodsEvent = {
    httpMethod: 'GET',
    queryStringParameters: { list_periods: 'true' }
  };

  const periodsResult = await handler(periodsEvent);
  const periodsData = JSON.parse(periodsResult.body);

  console.log('Periods available:', periodsData.periods?.length || 0);

  // Test 3: Data fetch
  console.log('\n3. Testing data fetch...');
  const dataEvent = {
    httpMethod: 'GET',
    queryStringParameters: { reporting_period: '2024-09-30', top: '5' }
  };

  const dataResult = await handler(dataEvent);
  const dataResponse = JSON.parse(dataResult.body);

  console.log('Data source:', dataResponse._meta?.source);
  console.log('Record count:', dataResponse.data?.length || 0);
  console.log('Sample bank:', dataResponse.data?.[0]?.bank_name);

  console.log('\n✅ FFIEC function fix test completed');
}

// Set test environment variables if needed
process.env.FFIEC_USERNAME = process.env.FFIEC_USERNAME || 'test_user';
process.env.FFIEC_TOKEN = process.env.FFIEC_TOKEN || 'test_token';

testFFIECFix().catch(console.error);
