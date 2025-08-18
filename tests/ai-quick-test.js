// Quick FFIEC Diagnostic for AI Assistants
// Copy this entire file to: tests/ai-quick-test.js

async function quickFFIECDiagnostic(credentials = null) {
  console.log('🔍 Quick FFIEC Diagnostic Starting...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {},
    recommendations: []
  };
  
  // Test 1: Internet connectivity to FFIEC
  console.log('1. Testing internet connectivity...');
  try {
    const response = await fetch('https://cdr.ffiec.gov/public/rest/institution/search?ACTIVE=1&LIMIT=1&FORMAT=JSON', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    
    const test1 = {
      name: 'Internet Connectivity',
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status,
      message: response.ok ? 'Can reach FFIEC servers' : `HTTP ${response.status}`
    };
    
    results.tests.push(test1);
    console.log(response.ok ? '✅ PASS - Internet connectivity OK' : '❌ FAIL - Cannot reach FFIEC');
    
  } catch (error) {
    const test1 = { name: 'Internet Connectivity', status: 'FAIL', error: error.message };
    results.tests.push(test1);
    console.log('❌ FAIL - Network error:', error.message);
  }
  
  // Test 2: UBPR API availability
  console.log('2. Testing UBPR API availability...');
  try {
    const response = await fetch('https://api.ffiec.gov/public/v2/ubpr/periods?format=json', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    
    const test2 = {
      name: 'UBPR API',
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status
    };
    
    if (response.ok) {
      const data = await response.json();
      test2.availablePeriods = data.periods?.length || 0;
      test2.latestPeriod = data.periods?.[0] || 'Unknown';
    } else {
      test2.error = `HTTP ${response.status}`;
    }
    
    results.tests.push(test2);
    console.log(response.ok ? '✅ PASS - UBPR API responding' : '❌ FAIL - UBPR API unavailable');
    
  } catch (error) {
    const test2 = { name: 'UBPR API', status: 'FAIL', error: error.message };
    results.tests.push(test2);
    console.log('❌ FAIL - UBPR API error:', error.message);
  }
  
  // Test 3: Credential validation (if provided)
  if (credentials && credentials.username && credentials.token) {
    console.log('3. Testing credentials...');
    try {
      const auth = btoa(`${credentials.username}:${credentials.token}`);
      const response = await fetch('https://api.ffiec.gov/public/v2/ubpr/financials?limit=1&format=json', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      const test3 = {
        name: 'Credential Validation',
        status: response.ok ? 'PASS' : 'FAIL',
        statusCode: response.status
      };
      
      if (response.ok) {
        const data = await response.json();
        const records = Array.isArray(data) ? data : data.data || [];
        test3.recordCount = records.length;
        test3.hasData = records.length > 0;
      } else {
        test3.error = `HTTP ${response.status}`;
      }
      
      results.tests.push(test3);
      console.log(response.ok ? '✅ PASS - Credentials valid' : '❌ FAIL - Invalid credentials');
      
    } catch (error) {
      const test3 = { name: 'Credential Validation', status: 'FAIL', error: error.message };
      results.tests.push(test3);
      console.log('❌ FAIL - Credential test error:', error.message);
    }
  } else {
    console.log('3. Skipping credential test (no credentials provided)');
    results.tests.push({
      name: 'Credential Validation',
      status: 'SKIP',
      reason: 'No credentials provided'
    });
  }
  
  // Generate summary
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  const skipped = results.tests.filter(t => t.status === 'SKIP').length;
  
  results.summary = {
    total: results.tests.length,
    passed,
    failed,
    skipped,
    overallStatus: failed === 0 ? 'HEALTHY' : passed > 0 ? 'PARTIAL' : 'FAILED'
  };
  
  // Generate recommendations
  const failedTests = results.tests.filter(t => t.status === 'FAIL');
  
  if (failedTests.some(t => t.name === 'Internet Connectivity')) {
    results.recommendations.push('🔧 Check internet connection and firewall settings');
  }
  if (failedTests.some(t => t.name === 'UBPR API')) {
    results.recommendations.push('🔧 FFIEC UBPR API may be down - check FFIEC service status');
  }
  if (failedTests.some(t => t.name === 'Credential Validation')) {
    results.recommendations.push('🔧 FFIEC credentials invalid - verify username and token');
  }
  if (!credentials) {
    results.recommendations.push('💡 Provide credentials to test data access: quickFFIECDiagnostic({username: "...", token: "..."})');
  }
  if (results.summary.overallStatus === 'HEALTHY') {
    results.recommendations.push('🎉 All systems operational - FFIEC integration should work correctly');
  }
  
  console.log('\n📊 Quick Diagnostic Summary:');
  console.log(`Overall Status: ${results.summary.overallStatus}`);
  console.log(`Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach(rec => console.log(`   ${rec}`));
  }
  
  return results;
}

async function testNetlifyFunction(netlifyUrl, reportingPeriod = '2024-09-30') {
  console.log('🔍 Testing Netlify function integration...\n');
  
  if (!netlifyUrl) {
    console.log('❌ No Netlify URL provided');
    return { status: 'FAIL', error: 'Missing Netlify URL' };
  }
  
  try {
    const url = `${netlifyUrl}/.netlify/functions/ffiec?test=true`;
    console.log('Testing URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    
    const result = {
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status,
      url: url
    };
    
    if (response.ok) {
      const data = await response.json();
      result.functionStatus = data.status;
      result.message = data.message;
      console.log('✅ Netlify function responding');
      console.log('Function status:', data.status);
    } else {
      result.error = `HTTP ${response.status}`;
      console.log('❌ Netlify function error:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('❌ Netlify function test failed:', error.message);
    return { status: 'FAIL', error: error.message, url: netlifyUrl };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { quickFFIECDiagnostic, testNetlifyFunction };
}
