// FFIEC API Tester for AI Assistants (Codex/Claude/etc.)
// Copy this entire file to: tests/ai-test-ffiec.js

class FFIECTester {
  constructor() {
    this.baseURL = 'https://cdr.ffiec.gov';
    this.apiURL = 'https://api.ffiec.gov/public/v2/ubpr';
    this.testResults = [];
    this.credentials = { username: null, token: null };
  }

  setCredentials(username, token) {
    this.credentials.username = username;
    this.credentials.token = token;
    console.log('✅ Credentials set for testing');
  }

  hasCredentials() {
    return this.credentials.username && this.credentials.token;
  }

  getAuthHeaders() {
    if (!this.hasCredentials()) {
      throw new Error('Credentials not set. Call setCredentials(username, token) first.');
    }
    const auth = btoa(`${this.credentials.username}:${this.credentials.token}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'BankCREExposure-AITest/1.0'
    };
  }

  async testCDRConnectivity() {
    console.log('🔍 Testing CDR basic connectivity...');
    try {
      const response = await fetch(`${this.baseURL}/public/rest/institution/search?ACTIVE=1&LIMIT=1&FORMAT=JSON`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const result = {
        test: 'CDR Basic Connectivity',
        status: response.ok ? 'PASS' : 'FAIL',
        statusCode: response.status
      };
      
      if (response.ok) {
        const data = await response.json();
        result.sampleData = Array.isArray(data) ? data.length : 'Object returned';
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      this.testResults.push(result);
      console.log(response.ok ? '✅ CDR connectivity: PASS' : '❌ CDR connectivity: FAIL');
      return result;
      
    } catch (error) {
      const result = { test: 'CDR Basic Connectivity', status: 'FAIL', error: error.message };
      this.testResults.push(result);
      console.log('❌ CDR connectivity: FAIL -', error.message);
      return result;
    }
  }

  async testUBPRPublicAPI() {
    console.log('🔍 Testing UBPR public API...');
    try {
      const response = await fetch(`${this.apiURL}/periods?format=json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const result = {
        test: 'UBPR Public API',
        status: response.ok ? 'PASS' : 'FAIL',
        statusCode: response.status
      };
      
      if (response.ok) {
        const data = await response.json();
        result.availablePeriods = data.periods?.slice(0, 5) || 'No periods found';
        result.latestPeriod = data.periods?.[0] || 'Unknown';
      } else {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      this.testResults.push(result);
      console.log(response.ok ? '✅ UBPR public API: PASS' : '❌ UBPR public API: FAIL');
      return result;
      
    } catch (error) {
      const result = { test: 'UBPR Public API', status: 'FAIL', error: error.message };
      this.testResults.push(result);
      console.log('❌ UBPR public API: FAIL -', error.message);
      return result;
    }
  }

  async testUBPRDataRetrieval() {
    console.log('🔍 Testing UBPR data retrieval...');
    
    if (!this.hasCredentials()) {
      const result = { test: 'UBPR Data Retrieval', status: 'SKIP', reason: 'No credentials provided' };
      this.testResults.push(result);
      console.log('⚠️ UBPR data retrieval: SKIPPED (no credentials)');
      return result;
    }
    
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(`${this.apiURL}/financials?limit=3&format=json`, {
        method: 'GET',
        headers
      });
      
      const result = {
        test: 'UBPR Data Retrieval',
        status: response.ok ? 'PASS' : 'FAIL',
        statusCode: response.status
      };
      
      if (response.ok) {
        const data = await response.json();
        const records = Array.isArray(data) ? data : data.data || [];
        result.recordCount = records.length;
        result.sampleBank = records[0] ? {
          name: records[0].NAME,
          assets: records[0].TA,
          hasUBPRData: !!records[0].UBPR4340
        } : 'No records';
      } else {
        const errorText = await response.text();
        result.error = `HTTP ${response.status}: ${errorText}`;
      }
      
      this.testResults.push(result);
      console.log(response.ok ? '✅ UBPR data retrieval: PASS' : '❌ UBPR data retrieval: FAIL');
      return result;
      
    } catch (error) {
      const result = { test: 'UBPR Data Retrieval', status: 'FAIL', error: error.message };
      this.testResults.push(result);
      console.log('❌ UBPR data retrieval: FAIL -', error.message);
      return result;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive FFIEC API testing...\n');
    
    this.testResults = [];
    const startTime = Date.now();
    
    await this.testCDRConnectivity();
    await this.testUBPRPublicAPI();
    await this.testUBPRDataRetrieval();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const summary = {
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      skipped: this.testResults.filter(r => r.status === 'SKIP').length,
      duration: `${duration}ms`,
      hasCredentials: this.hasCredentials(),
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️ Skipped: ${summary.skipped}`);
    console.log(`⏱️ Duration: ${summary.duration}`);
    
    return { summary, results: this.testResults, recommendations: this.generateRecommendations() };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => r.status === 'FAIL');
    
    if (failedTests.some(t => t.test === 'CDR Basic Connectivity')) {
      recommendations.push('🔧 CDR connectivity failed - check internet connection and firewall settings');
    }
    if (failedTests.some(t => t.test === 'UBPR Public API')) {
      recommendations.push('🔧 UBPR API unavailable - FFIEC may be experiencing outages');
    }
    if (failedTests.some(t => t.test === 'UBPR Data Retrieval')) {
      recommendations.push('🔧 UBPR authentication failed - verify FFIEC credentials are correct and account is active');
    }
    if (!this.hasCredentials()) {
      recommendations.push('💡 Set FFIEC credentials with: tester.setCredentials("username", "token")');
    }
    if (recommendations.length === 0) {
      recommendations.push('🎉 All tests passed! Your FFIEC integration is working correctly.');
    }
    
    return recommendations;
  }
}

// Usage for Codex:
console.log('🤖 FFIEC API Tester Ready');
console.log('Usage:');
console.log('const tester = new FFIECTester();');
console.log('tester.setCredentials("username", "token");');
console.log('await tester.runAllTests();');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FFIECTester;
}
