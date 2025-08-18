// Optimized FFIEC Netlify Function - Simplified and Reliable
const axios = require('axios');
const xml2js = require('xml2js');

// Configuration
const FFIEC_PWS_BASE = 'https://cdr.ffiec.gov/public/pws/webservices/retrievalservice.asmx';
const FFIEC_UBPR_API = 'https://api.ffiec.gov/public/v2/ubpr';
const DEFAULT_TIMEOUT = 25000; // 25 seconds max
const MAX_RETRIES = 2; // Reduced retries

class FFIECClient {
  constructor() {
    this.username = process.env.FFIEC_USERNAME;
    this.token = process.env.FFIEC_TOKEN;
    this.parser = new xml2js.Parser({ explicitArray: false });
  }

  hasCredentials() {
    return !!(this.username && this.token);
  }

  getHeaders() {
    const headers = { 'Accept': 'application/json' };
    if (this.hasCredentials()) {
      const auth = Buffer.from(`${this.username}:${this.token}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    return headers;
  }

  // Simple SOAP call for testing credentials
  async testCredentials() {
    if (!this.hasCredentials()) {
      return { status: 'CREDENTIALS_MISSING' };
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TestUserAccess xmlns="http://ffiec.gov/">
      <UserName>${this.escapeXml(this.username)}</UserName>
      <Token>${this.escapeXml(this.token)}</Token>
    </TestUserAccess>
  </soap:Body>
</soap:Envelope>`;

    try {
      const response = await axios.post(FFIEC_PWS_BASE, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://ffiec.gov/TestUserAccess',
        },
        timeout: 15000,
      });

      if (response.data.includes('TestUserAccessResult')) {
        return { status: 'CREDENTIALS_VALID' };
      }
      return { status: 'CREDENTIALS_INVALID' };
    } catch (error) {
      console.error('Credential test failed:', error.message);
      return { status: 'CREDENTIALS_ERROR', error: error.message };
    }
  }

  // Get available reporting periods
  async getReportingPeriods() {
    try {
      const response = await axios.get(`${FFIEC_UBPR_API}/periods`, {
        params: { format: 'json' },
        timeout: 10000,
      });
      return response.data?.periods || this.generateFallbackPeriods();
    } catch (error) {
      console.warn('Failed to fetch periods:', error.message);
      return this.generateFallbackPeriods();
    }
  }

  // Get UBPR financial data
  async getUBPRData(reportingPeriod, limit = 100) {
    const formattedPeriod = reportingPeriod.replace(/-/g, '');
    const headers = this.getHeaders();

    try {
      const response = await axios.get(`${FFIEC_UBPR_API}/financials`, {
        headers,
        params: {
          filters: `REPDTE:${formattedPeriod}`,
          limit: Math.min(limit, 500),
          format: 'json',
        },
        timeout: DEFAULT_TIMEOUT,
      });

      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      
      return data.map(bank => ({
        bank_name: bank.INSTNAME || bank.NAME || bank.BKNAME || null,
        rssd_id: bank.ID_RSSD || bank.IDRSSD || bank.CERT || null,
        fdic_cert: bank.CERT || bank.FDIC_CERT || null,
        total_assets: this.parseNumber(bank.ASSET || bank.TA),
        cre_to_tier1: this.parseNumber(bank.UBPRCD173 || bank.CD173),
        cd_to_tier1: this.parseNumber(bank.UBPRCD177 || bank.CD177),
        net_loans_assets: this.parseNumber(bank.UBPRLD01 || bank.LD01),
        noncurrent_assets_pct: this.parseNumber(bank.UBPRFD12 || bank.FD12),
        total_risk_based_capital_ratio: this.parseNumber(bank.UBPR9950 || bank.CAPR9950),
        tier1_capital_ratio: this.parseNumber(bank.UBPR7206 || bank.CAPR7206),
        state: bank.STNAME || bank.STATE || bank.St || null,
        city: bank.CITY || bank.City || null,
        active: bank.ACTIVE !== '0',
      }));

    } catch (error) {
      console.error('UBPR data fetch failed:', error.message);
      throw new Error(`UBPR_API_ERROR: ${error.message}`);
    }
  }

  // Health check function
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      hasCredentials: this.hasCredentials(),
      tests: [],
      overall: 'UNKNOWN'
    };

    // Test 1: Basic API connectivity
    try {
      await axios.get(`${FFIEC_UBPR_API}/periods`, { 
        params: { format: 'json' },
        timeout: 10000 
      });
      results.tests.push({ name: 'UBPR API Connectivity', status: 'PASS' });
    } catch (error) {
      results.tests.push({ 
        name: 'UBPR API Connectivity', 
        status: 'FAIL', 
        error: error.message 
      });
    }

    // Test 2: Credential validation (if available)
    if (this.hasCredentials()) {
      const credTest = await this.testCredentials();
      results.tests.push({
        name: 'Credential Validation',
        status: credTest.status === 'CREDENTIALS_VALID' ? 'PASS' : 'FAIL',
        details: credTest
      });
    } else {
      results.tests.push({
        name: 'Credential Check',
        status: 'SKIP',
        reason: 'No credentials provided'
      });
    }

    // Determine overall status
    const passed = results.tests.filter(t => t.status === 'PASS').length;
    const total = results.tests.filter(t => t.status !== 'SKIP').length;
    
    if (total === 0) {
      results.overall = 'NO_TESTS';
    } else if (passed === total) {
      results.overall = 'HEALTHY';
    } else if (passed > 0) {
      results.overall = 'PARTIAL';
    } else {
      results.overall = 'FAILED';
    }

    return results;
  }

  // Utility functions
  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  validateReportingPeriod(period) {
    if (!period) return null;
    const iso = period.match(/^\d{4}-\d{2}-\d{2}$/) ? period : null;
    if (!iso) return null;

    const [year, month, day] = iso.split('-');
    const validQuarterEnds = [
      `${year}-03-31`, `${year}-06-30`,
      `${year}-09-30`, `${year}-12-31`
    ];

    return validQuarterEnds.includes(iso) ? iso : `${year}-${['03-31', '06-30', '09-30', '12-31'][Math.floor(new Date(iso).getMonth() / 3)]}`;
  }

  generateFallbackPeriods() {
    const quarters = ['12-31', '09-30', '06-30', '03-31'];
    const periods = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= currentYear - 3; year--) {
      for (const quarter of quarters) {
        periods.push(`${year}-${quarter}`);
      }
    }
    
    return periods.slice(0, 12);
  }
}

// Main handler function
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const startTime = Date.now();
  const params = event.queryStringParameters || {};

  try {
    const client = new FFIECClient();

    // Health check endpoint
    if (params.test === 'true') {
      const health = await client.healthCheck();
      
      // Add environment info
      health.credentials = {
        hasUsername: !!process.env.FFIEC_USERNAME,
        hasToken: !!process.env.FFIEC_TOKEN,
        status: client.hasCredentials() ? 'AVAILABLE' : 'MISSING'
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(health)
      };
    }

    // List periods endpoint
    if (params.list_periods === 'true') {
      const periods = await client.getReportingPeriods();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods })
      };
    }

    // Main data endpoint
    const reportingPeriod = client.validateReportingPeriod(params.reporting_period) || 
                           client.generateFallbackPeriods()[0];
    const limit = Math.min(parseInt(params.top, 10) || 100, 500);

    console.log(`Fetching FFIEC data for period: ${reportingPeriod}, limit: ${limit}`);

    let data, source;
    
    try {
      data = await client.getUBPRData(reportingPeriod, limit);
      source = data.length > 0 ? 'ffiec_ubpr_rest_api_real_data' : 'ffiec_ubpr_rest_api_no_data';
      
      console.log(`Successfully fetched ${data.length} records from FFIEC`);
      
    } catch (error) {
      console.warn(`FFIEC API failed: ${error.message}, using sample data`);
      
      // Fallback to sample data
      data = [
        {
          bank_name: 'Sample Regional Bank',
          rssd_id: '123456',
          total_assets: 5000000,
          cre_to_tier1: 325.5,
          cd_to_tier1: 97.65,
          net_loans_assets: 72.3,
          noncurrent_assets_pct: 1.8,
          total_risk_based_capital_ratio: 14.5,
          state: 'CA',
          city: 'Sample City'
        },
        {
          bank_name: 'Example Community Bank',
          rssd_id: '234567',
          total_assets: 3500000,
          cre_to_tier1: 412.7,
          cd_to_tier1: 123.81,
          net_loans_assets: 68.9,
          noncurrent_assets_pct: 2.1,
          total_risk_based_capital_ratio: 13.2,
          state: 'TX',
          city: 'Example Town'
        }
      ];
      source = 'sample_data_api_error';
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: data.slice(0, limit),
        _meta: {
          reportingPeriod,
          source,
          count: data.length,
          timestamp: new Date().toISOString(),
          hasCredentials: client.hasCredentials(),
          processingTime: `${duration}ms`
        }
      })
    };

  } catch (error) {
    console.error('Handler error:', error);
    const duration = Date.now() - startTime;
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        processingTime: `${duration}ms`
      })
    };
  }
};

// Export client for testing
exports.FFIECClient = FFIECClient;
