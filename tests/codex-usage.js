// Codex Usage Examples - Copy this to tests/codex-usage.js
// This file shows how to use the FFIEC testing tools in Codex

// Load the testing tools (after copying the files above)
const FFIECTester = require('./ai-test-ffiec.js');
const { quickFFIECDiagnostic, testNetlifyFunction } = require('./ai-quick-test.js');

// ================================
// EXAMPLE 1: Quick connectivity test (no credentials needed)
// ================================
async function example1_quickTest() {
  console.log('=== Example 1: Quick Connectivity Test ===');
  const results = await quickFFIECDiagnostic();
  return results;
}

// ================================
// EXAMPLE 2: Full test with credentials
// ================================
async function example2_fullTest() {
  console.log('=== Example 2: Full Test with Credentials ===');
  
  // Replace with your actual FFIEC credentials
  const credentials = {
    username: 'your_ffiec_username',
    token: 'your_ffiec_token'
  };
  
  const results = await quickFFIECDiagnostic(credentials);
  return results;
}

// ================================
// EXAMPLE 3: Comprehensive testing
// ================================
async function example3_comprehensiveTest() {
  console.log('=== Example 3: Comprehensive Testing ===');
  
  const tester = new FFIECTester();
  
  // Set credentials (replace with your actual credentials)
  tester.setCredentials('your_ffiec_username', 'your_ffiec_token');
  
  // Run all tests
  const results = await tester.runAllTests();
  
  console.log('\nDetailed Results:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// ================================
// EXAMPLE 4: Test Netlify function
// ================================
async function example4_testNetlify() {
  console.log('=== Example 4: Test Netlify Function ===');
  
  // Replace with your actual Netlify URL
  const netlifyUrl = 'https://your-site.netlify.app';
  
  const result = await testNetlifyFunction(netlifyUrl);
  return result;
}

// ================================
// EXAMPLE 5: Troubleshooting workflow
// ================================
async function example5_troubleshooting() {
  console.log('=== Example 5: Troubleshooting Workflow ===');
  
  // Step 1: Quick connectivity test
  console.log('Step 1: Testing basic connectivity...');
  const quickResults = await quickFFIECDiagnostic();
  
  if (quickResults.summary.overallStatus === 'FAILED') {
    console.log('❌ Basic connectivity failed. Check internet connection.');
    return quickResults;
  }
  
  // Step 2: Test with credentials
  console.log('\nStep 2: Testing with credentials...');
  const credentialResults = await quickFFIECDiagnostic({
    username: 'your_ffiec_username',
    token: 'your_ffiec_token'
  });
  
  // Step 3: Test Netlify function
  console.log('\nStep 3: Testing Netlify function...');
  const netlifyResults = await testNetlifyFunction('https://your-site.netlify.app');
  
  return {
    connectivity: quickResults,
    credentials: credentialResults,
    netlify: netlifyResults
  };
}

// ================================
// HOW TO RUN IN CODEX:
// ================================

// 1. Copy the above files to your project
// 2. Update credentials in the examples
// 3. Run any example:

// example1_quickTest().then(console.log);
// example2_fullTest().then(console.log);
// example3_comprehensiveTest().then(console.log);
// example4_testNetlify().then(console.log);
// example5_troubleshooting().then(console.log);

module.exports = {
  example1_quickTest,
  example2_fullTest,
  example3_comprehensiveTest,
  example4_testNetlify,
  example5_troubleshooting
};
