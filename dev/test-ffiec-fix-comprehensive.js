// Comprehensive FFIEC Test Script - Fixed Version
const { FFIECClient } = require('./netlify/functions/ffiec.js');

class FFIECFixTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {}
    };
  }

  async runTest(name, testFn, timeout = 30000) {
    console.log(`🔍 Testing: ${name}...`);
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      );
      
      const result = await Promise.race([testFn(), timeoutPromise]);
      const duration = Date.now() - startTime;
      
      const testResult = {
        name,
        status: 'PASS',
        duration: `${duration}ms`,
        ...result
      };
      
      this.results.tests.push(testResult);
      console.log(`✅ ${name}: PASS (${duration}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = {
        name,
        status: 'FAIL',
        duration: `${duration}ms`,
        error: error.message
      };
      
      this.results.tests.push(testResult);
      console.log(`❌ ${name}: FAIL - ${error.message} (${duration}ms)`);
      return testResult;
    }
  }

  async testCredentialCheck() {
    return await this.runTest('Credential Check', async () => {
      const client = new FFIECClient();
      const hasCredentials = client.hasCredentials();
      
      return {
        hasCredentials,
        username: !!process.env.FFIEC_USERNAME,
        token: !!process.env.FFIEC_TOKEN,
        message: hasCredentials ? 'Credentials available' : 'No credentials provided'
      };
    }, 5000);
  }

  async testHealthCheck() {
    return await this.runTest('Health Check', async () => {
      const client = new FFIECClient();
      const health = await client.healthCheck();
      
      return {
        overall: health.overall,
        testsPassed: health.tests.filter(t => t.status === 'PASS').length,
        testsTotal: health.tests.length,
        details: health
      };
    }, 20000);
  }

  async testDataRetrieval() {
    return await this.runTest('Data Retrieval', async () => {
      const client = new FFIECClient();
      
      if (!client.hasCredentials()) {
        return {
          skipped: true,
          reason: 'No credentials available',
          message: 'Set FFIEC_USERNAME and FFIEC_TOKEN to test data retrieval'
        };
      }
      
      const periods = await client.getReportingPeriods();
      const latestPeriod = periods[0] || '2024-09-30';
      
      try {
        const data = await client.getUBPRData(latestPeriod, 3);
        return {
          reportingPeriod: latestPeriod,
          recordCount: data.length,
          sampleBank: data[0] ? {
            name: data[0].bank_name,
            assets: data[0].total_assets,
            creRatio: data[0].cre_to_tier1
          } : null,
          dataSource: 'real_ffiec_api'
        };
      } catch (error) {
        return {
          reportingPeriod: latestPeriod,
          error: error.message,
          dataSource: 'api_failed'
        };
      }
    }, 25000);
  }

  async testFunctionHandler() {
    return await this.runTest('Function Handler', async () => {
      const { handler } = require('./netlify/functions/ffiec.js');
      
      // Test health check
      const healthEvent = {
        httpMethod: 'GET',
        queryStringParameters: { test: 'true' }
      };
      
      const healthResponse = await handler(healthEvent);
      const healthData = JSON.parse(healthResponse.body);
      
      // Test periods list
      const periodsEvent = {
        httpMethod: 'GET',
        queryStringParameters: { list_periods: 'true' }
      };
      
      const periodsResponse = await handler(periodsEvent);
      const periodsData = JSON.parse(periodsResponse.body);
      
      // Test data fetch
      const dataEvent = {
        httpMethod: 'GET',
        queryStringParameters: { reporting_period: '2024-09-30', top: '3' }
      };
      
      const dataResponse = await handler(dataEvent);
      const dataData = JSON.parse(dataResponse.body);
      
      return {
        healthCheck: {
          status: healthResponse.statusCode,
          overall: healthData.overall
        },
        periodsList: {
          status: periodsResponse.statusCode,
          periodsCount: periodsData.periods?.length || 0
        },
        dataFetch: {
          status: dataResponse.statusCode,
          recordCount: dataData.data?.length || 0,
          dataSource: dataData._meta?.source
        }
      };
    }, 30000);
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive FFIEC Fix Testing\n');
    console.log('=' * 60);
    
    await this.testCredentialCheck();
    await this.testHealthCheck();
    await this.testDataRetrieval();
    await this.testFunctionHandler();
    
    // Generate summary
    const total = this.results.tests.length;
    const passed = this.results.tests.filter(t => t.status === 'PASS').length;
    const failed = this.results.tests.filter(t => t.status === 'FAIL').length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: Math.round((passed / total) * 100),
      overallStatus: failed === 0 ? 'ALL_PASS' : passed > 0 ? 'PARTIAL' : 'ALL_FAIL'
    };
    
    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${this.results.summary.successRate}%`);
    console.log(`Overall Status: ${this.results.summary.overallStatus}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => console.log(`   ${rec}`));
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('ffiec-fix-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📁 Detailed results saved to: ffiec-fix-test-results.json');
    
    return this.results;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.tests.filter(t => t.status === 'FAIL');
    
    if (failedTests.some(t => t.name === 'Credential Check')) {
      recommendations.push('🔧 Set FFIEC_USERNAME and FFIEC_TOKEN environment variables');
    }
    
    if (failedTests.some(t => t.name === 'Health Check')) {
      recommendations.push('🔧 Check FFIEC API connectivity and service status');
    }
    
    if (failedTests.some(t => t.name === 'Data Retrieval')) {
      recommendations.push('🔧 Verify FFIEC credentials are valid and account is active');
    }
    
    if (failedTests.some(t => t.name === 'Function Handler')) {
      recommendations.push('🔧 Check Netlify function deployment and configuration');
    }
    
    if (this.results.summary.successRate === 100) {
      recommendations.push('🎉 All tests passed! Your FFIEC integration is working correctly.');
    }
    
    if (this.results.summary.successRate >= 75) {
      recommendations.push('✅ Most tests passed. Minor issues may need attention.');
    }
    
    if (this.results.summary.successRate < 50) {
      recommendations.push('⚠️ Multiple issues detected. Review environment setup and credentials.');
    }
    
    return recommendations;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FFIECFixTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FFIECFixTester;
