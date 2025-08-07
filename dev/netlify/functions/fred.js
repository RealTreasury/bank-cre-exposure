// This function fetches data from the Federal Reserve Economic Data (FRED) API.
// It requires a FRED_API_KEY to be set in your Netlify environment variables.

exports.handler = async function(event, context) {
  // Get the FRED API key from environment variables for security.
  const apiKey = process.env.FRED_API_KEY;

  // Extract the 'series_id' and 'limit' from the request URL.
  const { series_id, limit } = event.queryStringParameters;

  // --- Input Validation ---
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "FRED API key is not configured." }),
    };
  }

  if (!series_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required 'series_id' parameter." }),
    };
  }

  // Construct the FRED API URL.
  const limitParam = limit ? `&limit=${limit}` : '';
  const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series_id}&api_key=${apiKey}&file_type=json${limitParam}`;

  try {
    // Fetch data from the FRED API.
    const response = await fetch(apiUrl);
    const data = await response.json();

    // --- Successful Response ---
    // Return the data with a 200 OK status.
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    // --- Error Handling ---
    // If anything goes wrong, return a 500 Internal Server Error.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch data from FRED API: ${error.message}` }),
    };
  }
};
