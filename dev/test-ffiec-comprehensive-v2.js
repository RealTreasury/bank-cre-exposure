const { FFIECClient } = require('./netlify/functions/ffiec.js');

async function runEnhancedTests() {
  console.log('🚀 Enhanced FFIEC API Testing Suite\n');
  
  const client = new FFIECClient();
  const results = [];
  
  // Test 1: Environment setup
  console.log('1. Checking environment...');
  const hasCredentials = client.hasCredentials();
  console.log(`   Credentials available: ${hasCredentials ? '✅' : '❌'}`);
  
  if (!hasCredentials) {
    console.log('   Note: Set FFIEC_USERNAME and FFIEC_TOKEN environment variables');
  }
  
  // Test 2: Health check
  console.log('\n2. Running health check...');
  try {
    const health = await client.healthCheck();
    console.log(`   Overall status: ${health.overall}`);
    console.log(`   Tests passed: ${health.tests.filter(t => t.status === 'PASS').length}/${health.tests.length}`);
    results.push({ test: 'Health Check', status: 'PASS', details: health });
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    results.push({ test: 'Health Check', status: 'FAIL', error: error.message });
  }
  
  // Test 3: Period validation
  console.log('\n3. Testing period validation...');
  const testPeriods = ['2024-09-30', '2024-06-30', '2023-12-31', 'invalid'];
  testPeriods.forEach(period => {
    const validated = client.validateReportingPeriod(period);
    console.log(`   ${period} → ${validated || 'invalid'}`);
  });
  
  // Test 4: Data retrieval (if credentials available)
  if (hasCredentials) {
    console.log('\n4. Testing data retrieval...');
    try {
      const periods = await client.getReportingPeriods();
      console.log(`   Available periods: ${periods.length}`);
      
      if (periods.length > 0) {
        const ubprData = await client.getUBPRData(periods[0], 3);
        console.log(`   Sample data records: ${ubprData.length}`);
        
        if (ubprData.length > 0) {
          console.log(`   Sample bank: ${ubprData[0].bank_name}`);
          console.log(`   CRE ratio: ${ubprData[0].cre_to_tier1}%`);
        }
        
        results.push({ test: 'Data Retrieval', status: 'PASS', recordCount: ubprData.length });
      }
    } catch (error) {
      console.log(`   ❌ Data retrieval failed: ${error.message}`);
      results.push({ test: 'Data Retrieval', status: 'FAIL', error: error.message });
    }
  }
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  
  console.log('\n📊 Test Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Success rate: ${Math.round((passed/total) * 100)}%`);
  
  return results;
}

if (require.main === module) {
  runEnhancedTests().catch(console.error);
}

module.exports = { runEnhancedTests };
