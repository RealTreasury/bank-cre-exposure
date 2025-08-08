const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const axios = require('axios');
const { parseStringPromise } = require('xml2js');

// Generate last 12 quarter-end dates (newest → oldest)
function generateQuarterEnds() {
  const today = new Date();
  const quarters = ['12-31', '09-30', '06-30', '03-31'];
  const periods = [];
  for (let y = today.getFullYear(); periods.length < 12; y--) {
    for (const q of quarters) {
      const candidate = `${y}-${q}`;
      if (new Date(candidate) <= today) periods.push(candidate);
      if (periods.length >= 12) break;
    }
  }
  return periods;
}

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
  const token = process.env.FFIEC_TOKEN;

  // Health check
  if (params.test === 'true') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: username && token ? 'CREDENTIALS_AVAILABLE' : 'MISSING_CREDENTIALS',
      }),
    };
  }

  const periods = generateQuarterEnds();

  if ((params.list_periods || '').toString() === 'true') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ periods }),
    };
  }

  let reportingPeriod = (params.reporting_period || '').trim();
  if (reportingPeriod) {
    if (!periods.includes(reportingPeriod)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'INVALID_INPUT',
          message: 'reporting_period must be one of the last 12 valid ISO quarter-end dates',
          validPeriods: periods,
        }),
      };
    }
  } else {
    reportingPeriod = periods[0];
  }

  const top = parseInt(params.top, 10) || 100;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <RetrievePanelOfReporters xmlns="http://cdr.ffiec.gov/public/PWS/">
      <ReportingPeriod>${reportingPeriod}</ReportingPeriod>
    </RetrievePanelOfReporters>
  </soap:Body>
</soap:Envelope>`;

  const auth = Buffer.from(`${username}:${token || ''}`).toString('base64');

  try {
    const response = await axios.post(
      'https://cdr.ffiec.gov/public/PWS/WebServices/RetrievePanelOfReporters.asmx',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'http://cdr.ffiec.gov/public/PWS/RetrievePanelOfReporters',
          Authorization: `Basic ${auth}`,
        },
        timeout: 30000,
      }
    );

    const parsed = await parseStringPromise(response.data, { explicitArray: false });

    const reporters =
      parsed?.['soap:Envelope']?.['soap:Body']?.['RetrievePanelOfReportersResponse']?.['RetrievePanelOfReportersResult']?.['diffgr:diffgram']?.['DocumentElement']?.['Reporter'] || [];

    const banksList = Array.isArray(reporters) ? reporters : [reporters].filter(Boolean);

    const limitedBanks = banksList.slice(0, Math.min(top, banksList.length));

    const data = limitedBanks.map((bank, index) => ({
      bank_name: bank.Name || bank.BankName || `Bank ${index + 1}`,
      rssd_id: bank.ID_Rssd || bank.RSSD_ID || bank.Id_Rssd || null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        _meta: {
          source: 'ffiec_soap_panel',
          recordCount: data.length,
          reportingPeriod,
          timestamp: new Date().toISOString(),
          note: 'Real bank names from FFIEC SOAP panel; UBPR metrics not mocked',
        },
      }),
    };
  } catch (error) {
    console.error('FFIEC API Error:', error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'FFIEC_API_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

