const axios = require('axios');

exports.handler = async function(event, context) {
    const { series_id, limit = 10, sort_order = 'desc' } = event.queryStringParameters;
    const FRED_API_KEY = process.env.FRED_API_KEY;
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${FRED_API_KEY}&file_type=json&limit=${limit}&sort_order=${sort_order}`;

    // Define the CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // Browsers may send a preflight OPTIONS request first.
    // This handles that request.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
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
            body: JSON.stringify({ error: 'Failed to fetch data from FRED API' })
        };
    }
};
