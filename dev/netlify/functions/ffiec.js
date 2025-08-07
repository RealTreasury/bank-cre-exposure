const axios = require('axios');

exports.handler = async function(event, context) {
    const { rssd, mdrn, series } = event.queryStringParameters;
    const url = `https://banks.data.fdic.gov/api/financials?filters=RSSDID%3A%20${rssd}&fields=RSSDID%2CMDRM%2CREPDTE%2C${series}&sort_by=REPDTE&sort_order=DESC&limit=10&offset=0&agg_term_fields=REPDTE&agg_limit=10&format=json&download=false&filename=data_export`;

    // Define the CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }

    try {
        const response = await axios.get(url);
        return {
            statusCode: 200,
            headers, // Add headers to the successful response
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        return {
            statusCode: error.response ? error.response.status : 500,
            headers, // Also add headers to the error response
            body: JSON.stringify({ error: 'Failed to fetch data from FFIEC API' })
        };
    }
};
