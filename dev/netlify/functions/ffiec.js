// Enhanced FFIEC Netlify Function with proper PWS and REST API integration
const axios = require('axios');
const xml2js = require('xml2js');

// FFIEC API endpoints
const PWS_BASE = 'https://cdr.ffiec.gov/public/pws/webservices/retrievalservice.asmx';
const UBPR_REST_BASE = 'https://api.ffiec.gov/public/v2/ubpr';
const CDR_REST_BASE = 'https://cdr.ffiec.gov/public/rest';

class FFIECClient {
  constructor() {
    this.username = process.env.FFIEC_USERNAME;
    this.token = process.env.FFIEC_TOKEN;
    this.parser = new xml2js.Parser({ explicitArray: false });
  }

  hasCredentials() {
    return !!(this.username && this.token);
  }

  getAuthHeaders() {
    if (!this.hasCredentials()) {
      throw new Error('CREDENTIALS_MISSING');
    }
    
    const credentials = Buffer.from(`${this.username}:${this.token}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'BankCREExposure/2.0'
    };
  }

  // SOAP envelope builder for PWS calls
  buildSOAPEnvelope(operation, params) {
    const soapBody = Object.entries(params)
      .map(([key, value]) => `<${key}>${this.escapeXml(value)}</${key}>`)
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope 
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${operation} xmlns="http://ffiec.gov/">
      <UserName>${this.escapeXml(this.username)}</UserName>
      <Token>${this.escapeXml(this.token)}</Token>
      ${soapBody}
    </${operation}>
  </soap:Body>
</soap:Envelope>`;
  }

  escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/[<>&'\"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // PWS SOAP call with proper error handling
  async callPWS(operation, params = {}, retries = 3) {
    if (!this.hasCredentials()) {
      throw new Error('CREDENTIALS_MISSING');
    }

    const soapEnvelope = this.buildSOAPEnvelope(operation, params);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`PWS ${operation} attempt ${attempt}/${retries}`);
        
        const response = await axios.post(PWS_BASE, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `http://ffiec.gov/${operation}`,
            'User-Agent': 'BankCREExposure/2.0'
          },
          timeout: 45000,
          validateStatus: (status) => status < 500
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('INVALID_CREDENTIALS');
        }

        if (!response.data) {
          throw new Error('EMPTY_RESPONSE');
        }

        // Parse SOAP response with better error handling
        const parsed = await this.parser.parseStringPromise(response.data);
        const soapEnvelope = parsed?.['soap:Envelope'] || parsed?.['SOAP-ENV:Envelope'];
        const soapBody = soapEnvelope?.['soap:Body'] || soapEnvelope?.['SOAP-ENV:Body'];

        // Check for SOAP fault
        const fault = soapBody?.['soap:Fault'] || soapBody?.['SOAP-ENV:Fault'];
        if (fault) {
          const faultString = fault.faultstring || fault.detail || 'SOAP fault occurred';
          throw new Error(`SOAP_FAULT: ${faultString}`);
        }

        const result = soapBody?.[`${operation}Response`]?.[`${operation}Result`];
        if (!result) {
          throw new Error('INVALID_SOAP_RESPONSE: Missing result element');
        }

        console.log(`PWS ${operation} success`);
        return result;

      } catch (error) {
        console.error(`PWS ${operation} attempt ${attempt} failed:`, {
          status: error.response?.status,
          message: error.message
        });

        if (error.message === 'INVALID_CREDENTIALS') {
          throw error;
        }

        if (attempt === retries) {
          throw new Error(`PWS_API_UNAVAILABLE: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // REST API call with proper error handling
  async callREST(endpoint, params = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`REST ${endpoint} attempt ${attempt}/${retries}`);
        
        const headers = this.hasCredentials() ? this.getAuthHeaders() : { 'Accept': 'application/json' };
        
        const response = await axios.get(endpoint, {
          headers,
          params,
          timeout: 45000,
          validateStatus: (status) => status < 500
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('INVALID_CREDENTIALS');
        }

        console.log(`REST ${endpoint} success: ${response.status}`);
        return response.data;

      } catch (error) {
        console.error(`REST ${endpoint} attempt ${attempt} failed:`, {
          status: error.response?.status,
          message: error.message
        });

        if (error.message === 'INVALID_CREDENTIALS') {
          throw error;
        }

        if (attempt === retries) {
          throw new Error(`REST_API_UNAVAILABLE: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // Test user access using PWS
  async testUserAccess() {
    try {
      const result = await this.callPWS('TestUserAccess');
      return { status: 'SUCCESS', result };
    } catch (error) {
      return { status: 'FAILED', error: error.message };
    }
  }

  // Get available reporting periods using PWS
  async getReportingPeriods() {
    try {
      const result = await this.callPWS('RetrieveUBPRReportingPeriods');
      
      // Parse the periods from SOAP response
      let periods = [];
      if (result && result.UBPRItem) {
        const items = Array.isArray(result.UBPRItem) ? result.UBPRItem : [result.UBPRItem];
        periods = items
          .map(item => item.ReportingPeriodEndDate)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a));
      }

      return periods;
    } catch (error) {
      console.warn('PWS periods fetch failed:', error.message);
      // Fallback to generated periods
      return this.generateFallbackPeriods();
    }
  }

  // Get panel of reporters for a reporting period
  async getPanelOfReporters(reportingPeriod) {
    try {
      const formattedPeriod = reportingPeriod.replace(/-/g, '');
      const result = await this.callPWS('RetrievePanelOfReporters', {
        ReportingPeriodEndDate: formattedPeriod
      });

      let reporters = [];
      if (result && result.InstitutionItem) {
        const items = Array.isArray(result.InstitutionItem) ? result.InstitutionItem : [result.InstitutionItem];
        reporters = items.map(item => ({
          rssd_id: item.ID_Rssd,
          name: item.Nm,
          city: item.City,
          state: item.St,
          active: item.Active === 'true',
          cert: item.Cert
        }));
      }

      return reporters;
    } catch (error) {
      console.error('Panel of reporters fetch failed:', error.message);
      throw error;
    }
  }

  // Get UBPR data using REST API
  async getUBPRData(reportingPeriod, limit = 100) {
    try {
      const formattedPeriod = reportingPeriod.replace(/-/g, '');
      
      const data = await this.callREST(`${UBPR_REST_BASE}/financials`, {
        filters: `REPDTE:${formattedPeriod}`,
        limit: Math.min(limit, 1000),
        format: 'json'
      });

      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      return rows.map(r => ({
        bank_name: r.INSTNAME || r.NAME || r.BKNAME || r.NM || null,
        rssd_id: r.ID_RSSD || r.IDRSSD || r.ID_Rssd || r.CERT || null,
        fdic_cert: r.CERT || r.FDIC_CERT || null,
        total_assets: this.parseNumber(r.ASSET || r.TA || r.UBPR2170),

        // CRE and Construction & Development ratios
        cre_to_tier1: this.parseNumber(r.UBPRCD173 || r.UBPR_CD173 || r.CD173),
        cd_to_tier1: this.parseNumber(r.UBPRCD177 || r.UBPR_CD177 || r.CD177),

        // Asset quality metrics
        net_loans_assets: this.parseNumber(r.UBPRLD01 || r.UBPR_LD01 || r.LD01),
        noncurrent_assets_pct: this.parseNumber(r.UBPRFD12 || r.UBPR_FD12 || r.FD12),

        // Capital ratios
        total_risk_based_capital_ratio: this.parseNumber(r.UBPR9950 || r.UBPR_9950 || r.CAPR9950),
        tier1_capital_ratio: this.parseNumber(r.UBPR7206 || r.UBPR_7206 || r.CAPR7206),
        leverage_ratio: this.parseNumber(r.UBPR7204 || r.UBPR_7204 || r.CAPR7204),

        // Location data
        state: r.STNAME || r.STATE || r.St || null,
        city: r.CITY || r.City || null,

        // Additional useful fields
        institution_class: r.CLASS || r.INSTCLASS || null,
        charter_type: r.CHARTER || r.CHARTYPE || null,
        active: r.ACTIVE === '1' || r.ACTIVE === 'true' || true
      }));

    } catch (error) {
      console.error('UBPR data fetch failed:', error.message);
      throw error;
    }
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  validateReportingPeriod(period) {
    if (!period) return null;

    // Ensure period is in YYYY-MM-DD format
    const iso = period.match(/^\d{4}-\d{2}-\d{2}$/) ? period : null;
    if (!iso) return null;

    const [year, month, day] = iso.split('-');

    // Validate quarter-end dates
    const validQuarterEnds = [
      `${year}-03-31`, `${year}-06-30`,
      `${year}-09-30`, `${year}-12-31`
    ];

    if (validQuarterEnds.includes(iso)) {
      return iso;
    }

    // Return closest valid quarter-end
    const date = new Date(iso);
    const quarter = Math.floor(date.getMonth() / 3);
    const quarterEnds = ['03-31', '06-30', '09-30', '12-31'];

    return `${year}-${quarterEnds[quarter]}`;
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

  // Comprehensive health check
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      hasCredentials: this.hasCredentials(),
      environment: {
        nodeVersion: process.version,
        region: process.env.AWS_REGION || 'unknown'
      },
      tests: []
    };

    // Test 1: Basic API connectivity
    try {
      await this.callREST('https://api.ffiec.gov/public/v2/ubpr/periods', { format: 'json' });
      results.tests.push({ name: 'UBPR API Connectivity', status: 'PASS' });
    } catch (error) {
      results.tests.push({ 
        name: 'UBPR API Connectivity', 
        status: 'FAIL', 
        error: error.message 
      });
    }

    // Test 2: PWS SOAP Service
    try {
      const response = await this.callREST('https://cdr.ffiec.gov/public/pws/webservices/retrievalservice.asmx');
      results.tests.push({ name: 'PWS SOAP Service', status: 'PASS' });
    } catch (error) {
      results.tests.push({ 
        name: 'PWS SOAP Service', 
        status: 'FAIL', 
        error: error.message 
      });
    }

    // Test 3: Credential validation (if available)
    if (this.hasCredentials()) {
      try {
        const pwsResult = await this.testUserAccess();
        results.tests.push({
          name: 'PWS Credential Validation',
          status: pwsResult.status === 'SUCCESS' ? 'PASS' : 'FAIL',
          details: pwsResult
        });
      } catch (error) {
        results.tests.push({
          name: 'PWS Credential Validation',
          status: 'FAIL',
          error: error.message
        });
      }

      // Test 4: Data retrieval test
      try {
        const periods = await this.getReportingPeriods();
        if (periods.length > 0) {
          const testData = await this.getUBPRData(periods[0], 2);
          results.tests.push({
            name: 'Data Retrieval Test',
            status: testData.length > 0 ? 'PASS' : 'PARTIAL',
            recordCount: testData.length,
            latestPeriod: periods[0]
          });
        } else {
          results.tests.push({
            name: 'Data Retrieval Test',
            status: 'FAIL',
            error: 'No reporting periods available'
          });
        }
      } catch (error) {
        results.tests.push({
          name: 'Data Retrieval Test',
          status: 'FAIL',
          error: error.message
        });
      }
    } else {
      results.tests.push({
        name: 'Credential Check',
        status: 'SKIP',
        reason: 'No credentials provided'
      });
    }

    // Generate overall status
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

  try {
    const client = new FFIECClient();
    const params = event.queryStringParameters || {};

    // Enhanced credential check for test endpoint
    if (params.test === 'true') {
      const health = await client.healthCheck();

      // Add credential status to response
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

    // List available periods
    if (params.list_periods === 'true') {
      const periods = await client.getReportingPeriods();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ periods })
      };
    }

    // Get bank data
    const reportingPeriod = client.validateReportingPeriod(params.reporting_period) || client.generateFallbackPeriods()[0];
    const limit = Math.min(parseInt(params.top, 10) || 100, 500);

    try {
      const data = await client.getUBPRData(reportingPeriod, limit);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: data.slice(0, limit),
          _meta: {
            reportingPeriod,
            source: 'ffiec_ubpr_rest_api',
            count: data.length,
            timestamp: new Date().toISOString(),
            hasCredentials: client.hasCredentials()
          }
        })
      };

    } catch (error) {
      console.error('Data fetch failed, using sample data:', error.message);
      
      // Return sample data on API failure
      const sampleData = [
        {
          bank_name: 'First Sample Bank',
          rssd_id: '123456',
          total_assets: 5000000,
          cre_to_tier1: 325.5,
          cd_to_tier1: 97.65,
          net_loans_assets: 72.3,
          noncurrent_assets_pct: 1.8,
          total_risk_based_capital_ratio: 14.5,
        },
        {
          bank_name: 'Second Sample Bank',
          rssd_id: '234567',
          total_assets: 3500000,
          cre_to_tier1: 412.7,
          cd_to_tier1: 123.81,
          net_loans_assets: 68.9,
          noncurrent_assets_pct: 2.1,
          total_risk_based_capital_ratio: 13.2,
        }
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: sampleData,
          _meta: {
            reportingPeriod,
            source: 'sample_data_api_error',
            error: error.message,
            timestamp: new Date().toISOString(),
            note: 'API unavailable, showing sample data'
          }
        })
      };
    }

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export client for testing
exports.FFIECClient = FFIECClient;
