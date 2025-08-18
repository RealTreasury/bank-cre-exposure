// Quick FFIEC Diagnostic Tool
const axios = require('axios');

async function quickDiagnostic() {
  console.log('🔍 FFIEC API Quick Diagnostic Tool');
  console.log('====================================\n');

  const results = { timestamp: new Date().toISOString(), tests: [], recommendations: [] };

  // Test 1: Environment Variables
  console.log('1. Checking environment variables...');
  const hasUsername = !!process.env.FFIEC_USERNAME;
  const hasToken = !!process.env.FFIEC_TOKEN;
  
  results.tests.push({
    name: 'Environment Variables',
    status: hasUsername && hasToken ? 'PASS' : 'FAIL',
    details: { FFIEC_USERNAME: hasUsername ? 'Set' : 'Missing', FFIEC_TOKEN: hasToken ? 'Set' : 'Missing' }
  });

  if (hasUsername && hasToken) {
    console.log('✅ FFIEC credentials found');
  } else {
    console.log('❌ FFIEC credentials missing');
    results.recommendations.push('Set FFIEC_USERNAME and FFIEC_TOKEN environment variables');
  }

  // Test 2: FFIEC REST API Connectivity
  console.log('\n2. Testing FFIEC REST API connectivity...');
  try {
    const response = await axios.get('https://api.ffiec.gov/public/v2/ubpr/periods', {
      params: { format: 'json' }, timeout: 10000
    });

    results.tests.push({
      name: 'FFIEC REST API',
      status: 'PASS',
      details: { statusCode: response.status, periodsAvailable: response.data?.periods?.length || 0 }
    });
    console.log('✅ FFIEC REST API accessible');
  } catch (error) {
    results.tests.push({ name: 'FFIEC REST API', status: 'FAIL', error: error.message });
    console.log('❌ FFIEC REST API connection failed:', error.message);
    results.recommendations.push('Check internet connection and FFIEC service status');
  }

  // Test 3: FFIEC PWS SOAP Service
  console.log('\n3. Testing FFIEC PWS SOAP service...');
  try {
    const response = await axios.get('https://cdr.ffiec.gov/public/pws/webservices/retrievalservice.asmx', { timeout: 10000 });
    results.tests.push({ name: 'FFIEC PWS SOAP', status: response.status === 200 ? 'PASS' : 'FAIL', details: { statusCode: response.status } });
    console.log('✅ FFIEC PWS SOAP service accessible');
  } catch (error) {
    results.tests.push({ name: 'FFIEC PWS SOAP', status: 'FAIL', error: error.message });
    console.log('❌ FFIEC PWS SOAP service connection failed:', error.message);
    results.recommendations.push('FFIEC PWS service may be down or inaccessible');
  }

  // Summary
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;

  console.log('\n====================================');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('====================================');
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);

  if (failed === 0 && passed > 0) {
    console.log('\n🎉 Status: HEALTHY - Your FFIEC integration looks good!');
  } else if (passed > 0) {
    console.log('\n⚠️ Status: PARTIAL - Some issues detected');
  } else {
    console.log('\n❌ Status: FAILED - Multiple issues detected');
  }

  if (results.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    results.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync('ffiec-diagnostic-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to: ffiec-diagnostic-results.json');

  return results;
}

// Run if called directly
if (require.main === module) {
  quickDiagnostic().catch(console.error);
}

module.exports = { quickDiagnostic };
