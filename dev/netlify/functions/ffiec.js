// /netlify/functions/ffiec.js
const axios = require('axios');

// Helper to convert ISO date to YYYYMMDD format required by FFIEC
const toYYYYMMDD = (iso) => (iso ? iso.replace(/-/g, '') : iso);

// Create axios instance for FFIEC API - NO AUTH NEEDED for public v2
const http = axios.create({
  baseURL: 'https://api.ffiec.gov',
  timeout: 25000,
  validateStatus: (s) => s >= 200 && s < 300,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'BankCREExposure/1.0'
  }
});

// Helper functions
function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

async function fetchFFIECData(endpoint, params = {}) {
  const safeParams = cleanParams(params);
  
  // Always request JSON format for v2 endpoints
  if (!('format' in safeParams)) {
    safeParams.format = 'json';
  }
  
  console.log('FFIEC request:', { endpoint, params: safeParams });
  
  try {
    const response = await http.get(endpoint, { params: safeParams });
    return response.data;
  } catch (error) {
    console.error('FFIEC API error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    
    // Handle test/health check
    if (params.test === 'true') {
      // Simple health check - just verify we can reach the API
      try {
        const testData = await fetchFFIECData('/public/v2/institutions', {
          limit: 1,
          format: 'json'
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'HEALTHY',
            message: 'FFIEC API connection successful',
            timestamp: new Date().toISOString(),
            test_response: !!testData
          })
        };
      } catch (error) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'API_ERROR',
            message: 'FFIEC API unreachable',
            error: error.message
          })
        };
      }
    }
    
    // Handle request for available reporting periods
    if (params.list_periods === 'true') {
      try {
        // The correct endpoint for UBPR reporting periods
        const periodsData = await fetchFFIECData('/public/v2/reporting-periods', {
          product: 'ubpr',
          format: 'json'
        });
        
        // Extract periods from the response
        let periods = [];
        if (Array.isArray(periodsData)) {
          periods = periodsData.map(p => p.period || p);
        } else if (periodsData.data && Array.isArray(periodsData.data)) {
          periods = periodsData.data.map(p => p.period || p);
        }
        
        // If that doesn't work, generate fallback periods
        if (periods.length === 0) {
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth() + 1;
          
          // Generate last 8 quarters
          periods = [];
          for (let y = year; periods.length < 8; y--) {
            const quarters = ['12-31', '09-30', '06-30', '03-31'];
            for (const q of quarters) {
              const date = `${y}-${q}`;
              if (new Date(date) <= today) {
                periods.push(date);
              }
              if (periods.length >= 8) break;
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ periods })
        };
      } catch (error) {
        // Return generated periods as fallback
        const today = new Date();
        const year = today.getFullYear();
        const periods = [];
        
        for (let y = year; periods.length < 8; y--) {
          const quarters = ['12-31', '09-30', '06-30', '03-31'];
          for (const q of quarters) {
            const date = `${y}-${q}`;
            if (new Date(date) <= today) {
              periods.push(date);
            }
            if (periods.length >= 8) break;
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ periods })
        };
      }
    }
    
    // Main data fetch - get UBPR financial data
    const reportingPeriod = params.reporting_period || '2024-09-30';
    const limit = Math.min(parseInt(params.top || '50', 10), 100);
    
    // Convert date to YYYYMMDD format required by FFIEC
    const repdte = toYYYYMMDD(reportingPeriod);
    
    try {
      // Fetch UBPR financial data
      const ubprData = await fetchFFIECData('/public/v2/institutions', {
        filters: `REPDTE:${repdte}`,
        limit: limit,
        format: 'json',
        fields: 'ID_RSSD,NAME,REPDTE,TA,CRETOTIER1,CDTOTIER1,NLLR,NONCURRASSETS,TOTRBC'
      });
      
      // Process the data
      const institutions = Array.isArray(ubprData) ? ubprData : 
                          (ubprData.data && Array.isArray(ubprData.data)) ? ubprData.data : 
                          [];
      
      const processedData = institutions.map((inst) => ({
        bank_name: inst.NAME || inst.name || 'Unknown',
        rssd_id: inst.ID_RSSD || inst.IDRSSD || inst.id_rssd || null,
        total_assets: inst.TA || inst.total_assets || 0,
        cre_to_tier1: inst.CRETOTIER1 || inst.cre_to_tier1 || null,
        cd_to_tier1: inst.CDTOTIER1 || inst.cd_to_tier1 || null,
        net_loans_assets: inst.NLLR || inst.net_loans_assets || null,
        noncurrent_assets_pct: inst.NONCURRASSETS || inst.noncurrent_assets || null,
        total_risk_based_capital_ratio: inst.TOTRBC || inst.total_rbc || null
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: processedData,
          _meta: {
            reportingPeriod: reportingPeriod,
            source: 'ffiec_api',
            timestamp: new Date().toISOString(),
            count: processedData.length
          }
        })
      };
      
    } catch (error) {
      console.error('UBPR data fetch error:', error);
      
      // Return empty data with error info
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: [],
          _meta: {
            reportingPeriod: reportingPeriod,
            source: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
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
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
