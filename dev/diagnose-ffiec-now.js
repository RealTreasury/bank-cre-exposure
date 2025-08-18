// FFIEC Diagnostic Script - Save as: dev/diagnose-ffiec-now.js
// Run with: node dev/diagnose-ffiec-now.js

const axios = require('axios');

class FFIECDiagnostic {
  constructor() {
    this.results = [];
    this.credentials = {
      username: process.env.FFIEC_USERNAME,
      token: process.env.FFIEC_TOKEN
    };
  }

  async runDiagnostic() {
    console.log('🔍 FFIEC API Comprehensive Diagnostic');
    console.log('=====================================\n');

    await this.testEnvironment();
    await this.testConnectivity();
    await this.testCredentials();
    await this.testDataRetrieval();
    await this.testCurrentFunction();
    
    this.generateReport();
  }

  async testEnvironment() {
    console.log('1. Environment Check...');
    
    const hasUsername = !!this.credentials.username;
    const hasToken = !!this.credentials.token;
    
    this.results.push({
      test: 'Environment Variables',
      status: hasUsername && hasToken ? 'PASS' : 'FAIL',
      details: {
        FFIEC_USERNAME: hasUsername ? 'Set' : 'Missing',
        FFIEC_TOKEN: hasToken ? 'Set' : 'Missing'
      }
    });
    
    console.log(`   FFIEC_USERNAME: ${hasUsername ? '✅' : '❌'}`);
    console.log(`   FFIEC_TOKEN: ${hasToken ? '✅' : '❌'}\n`);
  }

  async testConnectivity() {
    console.log('2. API Connectivity Tests...');
    
    // Test UBPR REST API
    try {
      const response = await axios.get('https://api.ffiec.gov/public/v2/ubpr/periods', {
        params: { format: 'json' },
        timeout: 10000
      });
      
      this.results.push({
        test: 'UBPR REST API',
        status: 'PASS',
        statusCode: response.status,
        periodsAvailable: response.data?.periods?.length || 0
      });
      console.log('   UBPR REST API: ✅');
    } catch (error) {
      this.results.push({
        test: 'UBPR REST API',
        status: 'FAIL',
        error: error.message
      });
      console.log('   UBPR REST API: ❌');
    }

    // Test PWS SOAP Service
    try {
      const response = await axios.get('https://cdr.ffiec.gov/public/pws/webservices/retrievalservice.asmx', {
        timeout: 10000
      });
      
      this.results.push({
        test: 'PWS SOAP Service',
        status: response.status === 200 ? 'PASS' : 'FAIL',
        statusCode: response.status
      });
      console.log('   PWS SOAP Service: ✅');
    } catch (error) {
      this.results.push({
        test: 'PWS SOAP Service', 
        status: 'FAIL',
        error: error.message
      });
      console.log('   PWS SOAP Service: ❌');
    }
    console.log('');
  }

  async testCredentials() {
    console.log('3. Credential Validation...');
    
    if (!this.credentials.username || !this.credentials.token) {
      this.results.push({
        test: 'Credential Validation',
        status: 'SKIP',
        reason: 'No credentials provided'
      });
      console.log('   Skipped - No credentials provided\n');
      return;
    }

    try {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.token}`).toString('base64');
      const response = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        params: {
          limit: 1,
          format: 'json'
        },
        timeout: 15000
      });

      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      
      this.results.push({
        test: 'Credential Validation',
        status: 'PASS',
        statusCode: response.status,
        recordCount: data.length
      });
      console.log('   Credentials: ✅ Valid');
    } catch (error) {
      this.results.push({
        test: 'Credential Validation',
        status: 'FAIL',
        statusCode: error.response?.status,
        error: error.message
      });
      console.log('   Credentials: ❌ Invalid or API issue');
    }
    console.log('');
  }

  async testDataRetrieval() {
    console.log('4. Data Retrieval Test...');
    
    if (!this.credentials.username || !this.credentials.token) {
      console.log('   Skipped - No credentials\n');
      return;
    }

    try {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.token}`).toString('base64');
      
      // Get periods first
      const periodsResponse = await axios.get('https://api.ffiec.gov/public/v2/ubpr/periods', {
        params: { format: 'json' },
        timeout: 10000
      });
      
      const periods = periodsResponse.data?.periods || [];
      if (periods.length === 0) {
        throw new Error('No reporting periods available');
      }

      // Get sample data for latest period
      const latestPeriod = periods[0].replace(/-/g, '');
      const dataResponse = await axios.get('https://api.ffiec.gov/public/v2/ubpr/financials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        params: {
          filters: `REPDTE:${latestPeriod}`,
          limit: 5,
          format: 'json'
        },
        timeout: 20000
      });

      const data = Array.isArray(dataResponse.data) ? dataResponse.data : dataResponse.data?.data || [];
      
      this.results.push({
        test: 'Data Retrieval',
        status: data.length > 0 ? 'PASS' : 'PARTIAL',
        reportingPeriod: periods[0],
        recordCount: data.length,
        sampleBank: data[0] ? {
          name: data[0].NAME || data[0].INSTNAME,
          assets: data[0].TA || data[0].ASSET
        } : null
      });
      
      console.log(`   Data retrieval: ✅ ${data.length} records for ${periods[0]}`);
      if (data[0]) {
        console.log(`   Sample bank: ${data[0].NAME || data[0].INSTNAME}`);
      }
    } catch (error) {
      this.results.push({
        test: 'Data Retrieval',
        status: 'FAIL',
        error: error.message
      });
      console.log('   Data retrieval: ❌ Failed');
    }
    console.log('');
  }

  async testCurrentFunction() {
    console.log('5. Testing Current Netlify Function...');
    
    try {
      // Test if we can load the function
      const { FFIECClient } = require('./netlify/functions/ffiec.js');
      const client = new FFIECClient();
      
      console.log('   Function loading: ✅');
      
      // Test health check
      try {
        const health = await client.healthCheck();
        const passed = health.tests?.filter(t => t.status === 'PASS').length || 0;
        const total = health.tests?.length || 0;
        
        this.results.push({
          test: 'Function Health Check',
          status: health.overall === 'HEALTHY' ? 'PASS' : 'PARTIAL',
          details: {
            overall: health.overall,
            testsPassed: `${passed}/${total}`,
            hasCredentials: health.hasCredentials
          }
        });
        
        console.log(`   Health check: ${health.overall === 'HEALTHY' ? '✅' : '⚠️'} ${health.overall}`);
        console.log(`   Internal tests: ${passed}/${total} passed`);
      } catch (error) {
        this.results.push({
          test: 'Function Health Check',
          status: 'FAIL',
          error: error.message
        });
        console.log('   Health check: ❌ Failed');
      }
    } catch (error) {
      this.results.push({
        test: 'Function Loading',
        status: 'FAIL',
        error: error.message
      });
      console.log('   Function loading: ❌ Failed');
    }
    console.log('');
  }

  generateReport() {
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('====================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const partial = this.results.filter(r => r.status === 'PARTIAL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    
    console.log(`Tests Passed: ${passed}`);
    console.log(`Tests Failed: ${failed}`);
    console.log(`Partial/Warning: ${partial}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${total}`);
    
    const successRate = Math.round((passed / (total - skipped)) * 100);
    console.log(`Success Rate: ${successRate}%\n`);
    
    // Status determination
    let overallStatus;
    if (failed === 0 && passed > 0) {
      overallStatus = '🎉 HEALTHY - All systems operational';
    } else if (passed > failed) {
      overallStatus = '⚠️ PARTIAL - Some issues detected';
    } else {
      overallStatus = '❌ FAILED - Multiple issues need attention';
    }
    
    console.log(`Overall Status: ${overallStatus}\n`);
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    
    const failedTests = this.results.filter(r => r.status === 'FAIL');
    
    if (failedTests.some(t => t.test === 'Environment Variables')) {
      console.log('   1. Set FFIEC_USERNAME and FFIEC_TOKEN environment variables');
    }
    if (failedTests.some(t => t.test === 'UBPR REST API')) {
      console.log('   2. Check internet connectivity and FFIEC service status');
    }
    if (failedTests.some(t => t.test === 'Credential Validation')) {
      console.log('   3. Verify FFIEC credentials are correct and account is active');
    }
    if (failedTests.some(t => t.test === 'Function Loading')) {
      console.log('   4. Check Netlify function code for syntax errors');
    }
    if (this.results.filter(r => r.status === 'SKIP').length > 0) {
      console.log('   5. Provide FFIEC credentials to run full diagnostic');
    }
    
    if (overallStatus.includes('HEALTHY')) {
      console.log('   🎯 Implementation looks good! Consider the enhancements in the instructions.');
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('ffiec-diagnostic-detailed.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      overallStatus,
      successRate,
      results: this.results
    }, null, 2));
    
    console.log('\n📄 Detailed results saved to: ffiec-diagnostic-detailed.json');
  }
}

// Run diagnostic
async function main() {
  const diagnostic = new FFIECDiagnostic();
  await diagnostic.runDiagnostic();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FFIECDiagnostic;
