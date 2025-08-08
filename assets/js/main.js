/**
 * Bank CRE Exposure front-end (SOAP version)
 * Sends SOAP requests to FFIEC RetrievalService and renders the results.
 * FRED logic removed.
 */
const SOAP_URL = 'https://cdr.ffiec.gov/Public/PWS/WebServices/RetrievalService.asmx';
const SOAP_ACTION = 'http://www.ffiec.gov/PWS/WebServices/RetrievalService/RetrievePanelOfReporters';

document.addEventListener('DOMContentLoaded', () => {
  loadBanks().catch(err => showError(err.message || 'Unknown error'));
});

async function loadBanks() {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <RetrievePanelOfReporters xmlns="http://www.ffiec.gov/PWS/WebServices/">
          <ReportingPeriod></ReportingPeriod>
        </RetrievePanelOfReporters>
      </soap:Body>
    </soap:Envelope>`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45-second timeout

  try {
    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': SOAP_ACTION
      },
      body: envelope,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const banks = parseBankList(xmlText);
    renderBanks(banks);
  } catch (error) {
    if (error.name === 'AbortError') {
      showError('Request timed out after 45 seconds');
    } else {
      showError(error.message || String(error));
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseBankList(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const nodes = Array.from(xml.getElementsByTagName('FilerIdentification'));
  return nodes.map(node => ({
    name: node.getElementsByTagName('Name')[0]?.textContent || '',
    rssd: node.getElementsByTagName('ID_Rssd')[0]?.textContent ||
          node.getElementsByTagName('ID_RSSD')[0]?.textContent || ''
  }));
}

function renderBanks(banks) {
  const tbody = document.getElementById('bankTableBody');
  if (!tbody) {
    console.log('Bank data:', banks);
    return;
  }
  tbody.innerHTML = '';
  banks.forEach((bank, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${index + 1}</td><td>${bank.name}</td><td>${bank.rssd}</td>`;
    tbody.appendChild(row);
  });
}

function showError(message) {
  const div = document.getElementById('errorMessage');
  if (div) {
    div.textContent = message;
    div.style.display = 'block';
  }
  console.error('SOAP Error:', message);
}
