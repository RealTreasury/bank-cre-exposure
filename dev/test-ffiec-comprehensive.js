// Comprehensive FFIEC API Test Suite
const { FFIECClient } = require('./netlify/functions/ffiec.js');

class FFIECTester {
  constructor() {
    this.client = new FFIECClient();
    this.results = {
      timestamp: new Date().toISOString(),
      environment: { hasCredentials: this.client.hasCredentials() },
      tests: [],
      summary: {},
      recommendations: []
    };
  }

  async runTest(name, testFn) {
    console.log(`🔍 Starting test: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult = { name, status: 'PASS', duration: `${duration}ms`, ...result };
      this.results.tests.push(testResult);
      console.log(`✅ Test passed: ${name} (${duration}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = { name, status: 'FAIL', duration: `${duration}ms`, error: error.message };
      this.results.tests.push(testResult);
      console.log(`❌ Test failed: ${name} - ${error.message}`);
      return testResult;
    }
  }

  async testCredentials() {
    return await this.runTest('Credential Validation', async () => {
      if (!this.client.hasCredentials()) {
        throw new Error('No FFIEC credentials provided');
      }
      const result = await this.client.testUserAccess();
      if (result.status !== 'SUCCESS') {
        throw new Error(`PWS access failed: ${result.error}`);
      }
      return { message: 'PWS credentials validated successfully' };
    });
  }

  async testRESTAPI() {
    return await this.runTest('REST API Endpoints', async () => {
      const periodsData = await this.client.callREST('https://api.ffiec.gov/public/v2/ubpr/periods', { format: 'json' });
      if (!periodsData?.periods) {
        throw new Error('Invalid periods response from REST API');
      }
      return { periodsAvailable: periodsData.periods.length, latestPeriod: periodsData.periods[0] };
    });
  }

  async testDataIntegration() {
    return await this.runTest('Data Integration', async () => {
      if (!this.client.hasCredentials()) {
        throw new Error('No credentials for data integration testing');
      }
      const periods = await this.client.getReportingPeriods();
      if (periods.length === 0) {
        throw new Error('No reporting periods available');
      }
      const ubprData = await this.client.getUBPRData(periods[0], 3);
      if (!Array.isArray(ubprData) || ubprData.length === 0) {
        throw new Error('No UBPR data returned');
      }
      return { reportingPeriod: periods[0], totalBanks: ubprData.length, sampleBank: ubprData[0]?.bank_name };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive FFIEC API testing suite\n');
    
    await this.testCredentials();
    await this.testRESTAPI();
    await this.testDataIntegration();

    // Generate summary
    const total = this.results.tests.length;
    const passed = this.results.tests.filter(t => t.status === 'PASS').length;
    const failed = this.results.tests.filter(t => t.status === 'FAIL').length;

    this.results.summary = {
      total, passed, failed,
      successRate: Math.round((passed / total) * 100),
      overallStatus: failed === 0 ? 'ALL_PASS' : passed > 0 ? 'PARTIAL' : 'ALL_FAIL'
    };

    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 FFIEC API TEST SUITE FINAL REPORT');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${this.results.summary.successRate}%`);
    console.log(`Overall Status: ${this.results.summary.overallStatus}`);

    // Save results
    const fs = require('fs');
    fs.writeFileSync('ffiec-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📁 Full results saved to: ffiec-test-results.json');

    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new FFIECTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FFIECTester;
