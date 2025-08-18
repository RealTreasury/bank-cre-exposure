// Test the FFIEC fix
const { handler } = require('./netlify/functions/ffiec.js');

async function testFix() {
  console.log('🧪 Testing FFIEC Fix\n');

  // Test health check
  const healthEvent = {
    httpMethod: 'GET',
    queryStringParameters: { test: 'true' }
  };
  
  const result = await handler(healthEvent);
  const data = JSON.parse(result.body);
  
  console.log('Health check result:', data.status);
  
  if (data.status === 'HEALTHY') {
    console.log('✅ SUCCESS: FFIEC API is working!');
    
    // Test data retrieval
    const dataEvent = {
      httpMethod: 'GET',
      queryStringParameters: { reporting_period: '2024-09-30', top: '3' }
    };
    
    const dataResult = await handler(dataEvent);
    const dataResponse = JSON.parse(dataResult.body);
    
    console.log('Data source:', dataResponse._meta?.source);
    console.log('Records:', dataResponse.data?.length);
    
    if (dataResponse._meta?.source?.includes('real_data')) {
      console.log('🎉 Perfect! Getting real FFIEC data');
    }
  } else {
    console.log('❌ Issue:', data);
  }
}

testFix().catch(console.error);

