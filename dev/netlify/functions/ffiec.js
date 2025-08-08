const soap = require('soap');

exports.handler = async (event) => {
  console.log('=== FFIEC FUNCTION START ===');
  console.log('Query params:', event.queryStringParameters);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const username = process.env.FFIEC_USERNAME;
  const password = process.env.FFIEC_PASSWORD;  // ADDED: Missing password
  const token = process.env.FFIEC_TOKEN;

  console.log('Environment check:', {
    hasUsername: !!username,
    hasPassword: !!password,  // ADDED
    hasToken: !!token
  });

  // Credentials check - NOW INCLUDES PASSWORD
  if (!username || !password || !token) {
    const missing = [];
    if (!username) missing.push('FFIEC_USERNAME');
    if (!password) missing.push('FFIEC_PASSWORD');
    if (!token) missing.push('FFIEC_TOKEN');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'CREDENTIALS_MISSING',
        message: `Missing environment variables: ${missing.join(', ')}`,
        missing: missing,
        env: {
          hasUsername: !!username,
          hasPassword: !!password,
          hasToken: !!token
        }
      }),
    };
  }

  // Health check
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'CREDENTIALS_AVAILABLE',
        service: 'SOAP',
        endpoint: 'https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService.asmx?WSDL',
        env: {
          hasUsername: true,
          hasPassword: true,
          hasToken: true
        }
      }),
    };
  }

  try {
    const wsdlUrl = 'https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService.asmx?WSDL';
    const top = parseInt(params.top, 10) || 50;
    
    console.log('Creating SOAP client...');
    
    // Create SOAP client with timeout
    const client = await soap.createClientAsync(wsdlUrl, {
      overridePromiseSuffix: 'Promise',
      timeout: 30000
    });

    console.log('SOAP client created, setting security...');

    // FIXED: Set proper authentication (username:password+token)
    const authString = `${username}:${password}${token}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    // Set custom headers for authentication
    client.addHttpHeader('Authorization', `Basic ${base64Auth}`);

    console.log('Getting reporting periods...');

    // Get latest reporting period
    const periodsResult = await client.RetrieveReportingPeriodsPromise({});
    console.log('Periods result:', JSON.stringify(periodsResult, null, 2));
    
    let latestPeriod = '2024-09-30'; // Fallback
    if (periodsResult?.[0]?.RetrieveReportingPeriodsResult?.string) {
      const periods = periodsResult[0].RetrieveReportingPeriodsResult.string;
      if (Array.isArray(periods) && periods.length > 0) {
        latestPeriod = periods[periods.length - 1];
      } else if (typeof periods === 'string') {
        latestPeriod = periods;
      }
    }

    console.log('Using reporting period:', latestPeriod);

    // REMOVED: No more mock data fallback - if this fails, we want to see the real error
    
    // Get UBPR data directly for top institutions
    console.log('Fetching UBPR data...');
    
    const ubprResult = await client.RetrieveUBPRDataPromise({
      ReportingPeriod: latestPeriod,
      // Add filters for largest institutions
      TopInstitutions: top,
      // Request specific UBPR ratios we need
      Ratios: [
        'RCON2170', // Total assets
        'UBPRD169', // Net loans and leases to assets
        'UBPR5390', // Noncurrent assets and loans to total assets
        'UBPRE986', // Construction and development loans to Tier 1 capital plus allowances
        'UBPRE985'  // CRE loans to Tier 1 capital plus allowances
      ]
    });

    console.log('UBPR result structure:', Object.keys(ubprResult?.[0] || {}));

    // Process real UBPR data
    let banksData = [];
    
    if (ubprResult?.[0]?.RetrieveUBPRDataResult?.InstitutionData) {
      const institutions = ubprResult[0].RetrieveUBPRDataResult.InstitutionData;
      const institutionsArray = Array.isArray(institutions) ? institutions : [institutions];
      
      banksData = institutionsArray.map((inst, index) => {
        // Extract real financial data from UBPR
        const ratios = inst.Ratios || {};
        
        return {
          bank_name: inst.InstitutionName || inst.Name || `Institution ${index + 1}`,
          rssd_id: inst.IDRssd || inst.RSSD_ID,
          // REAL DATA from UBPR (not mock)
          total_assets: parseFloat(ratios.RCON2170) || 0,
          net_loans_assets: parseFloat(ratios.UBPRD169) || 0,
          noncurrent_assets_pct: parseFloat(ratios.UBPR5390) || 0,
          cd_to_tier1: parseFloat(ratios.UBPRE986) || 0,
          cre_to_tier1: parseFloat(ratios.UBPRE985) || 0,
        };
      });
    }

    // If no data was returned, throw an error instead of using mock data
    if (banksData.length === 0) {
      throw new Error('No UBPR data returned from FFIEC API. Check your credentials and API access.');
    }

    // Sort by total assets (descending)
    banksData.sort((a, b) => b.total_assets - a.total_assets);

    console.log(`Successfully processed ${banksData.length} institutions`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: banksData,
        _meta: {
          source: 'ffiec_ubpr_api_real_data',
          recordCount: banksData.length,
          reportingPeriod: latestPeriod,
          timestamp: new Date().toISOString()
        }
      }),
    };

  } catch (error) {
    console.error('FFIEC API Error:', error);
    
    // REMOVED: No more mock data on error - return the actual error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'FFIEC_API_ERROR',
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
