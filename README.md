
# bank-cre-exposure

This repository hosts the static HTML report summarizing commercial real estate exposures for September 2024.

Development-related tooling lives in the `dev/` directory (Netlify functions, npm configuration, and test files). These items are only needed for local development and are not required to view the static report.

## Commit Message Style

Use short commit messages that summarize what changed, for example:

```
Add link to UBPR source in footer.
```

Keeping messages concise helps everyone quickly understand the project history. Please follow this style for future commits.

## WordPress Plugin

The WordPress plugin files are at the repository root.

### Building and installing

To create a zip for upload, run from the repository root:

```bash
zip -r bank-cre-exposure.zip bank-cre-exposure.php assets templates readme.txt LICENSE
```

This plugin is automatically pushed to the WordPress site


# Bank CRE Exposure

This sample page demonstrates how to render commercial real estate (CRE) exposure metrics for U.S. banks. The table in `index.html` is populated using the FFIEC Uniform Bank Performance Report (UBPR) API.

## FFIEC PWS API

The FFIEC Public Web Service (PWS) API provides access to financial institution data.

**Base URL:** `https://cdr.ffiec.gov/public/PWS`

### Authentication
The FFIEC SOAP API uses WS-Security UsernameToken authentication. Supply your
FFIEC username and security token (used as the password).

### UBPR Search Endpoint
```
GET /UBPR/Search
```

**Parameters:**
- `reporting_period` - Date in YYYY-MM-DD format (e.g., 2024-09-30)
- `limit` - Number of institutions to return
- `sort_by` - Field to sort by (e.g., total_assets)
- `sort_order` - asc or desc
- `metrics` - Comma-separated list of metrics to include

**Example:**
```
https://cdr.ffiec.gov/public/PWS/UBPR/Search?reporting_period=2024-09-30&limit=100&sort_by=total_assets&sort_order=desc
```

The response contains a `data` array with each bank's UBPR values. Fields used in this demo include:

- `bank_name`
- `total_assets`
- `net_loans_assets`
- `noncurrent_assets_pct`
- `cd_to_tier1`
- `cre_to_tier1`

The script in `index.html` fetches the data on page load and builds the table rows dynamically. CRE ratio values determine the risk coloring shown in the table.

## Netlify environment variables

The Netlify Functions in this repo need a few secrets for both local and deployed runs:

| Variable | Purpose |
| --- | --- |
| `FFIEC_USERNAME` | Username for the FFIEC Public Web Service. |
| `FFIEC_TOKEN` | Security token for the FFIEC Public Web Service (used as password). |

For local development, copy `.env.example` to `.env`, fill in your values, then run from the `dev/` directory:

```bash
cd dev
netlify dev
```

To configure the variables in your Netlify site, use the CLI from within `dev/`:

```bash
cd dev
netlify env:set FFIEC_USERNAME your_username
netlify env:set FFIEC_TOKEN your_token
```


# bank-cre-exposure

This repository contains an HTML report summarizing commercial real estate exposure for banks.

## Usage

Open `index.html` in your browser to view the report.

Common color variables and base page styles are defined in `assets/css/style.css`. Edit this file to adjust the theme across the report.

# Commercial Real Estate Exposure Report

This repository hosts a static HTML report that summarizes U.S. bank exposure to commercial real estate (CRE) loans. The figures in `index.html` were generated using data pulled from the FDIC's Uniform Bank Performance Reports (UBPR) for September 2024. The goal is to provide a quick reference on CRE concentrations across the banking sector.

## Data Source

All information comes from the publicly available UBPR dataset provided by the Federal Financial Institutions Examination Council. CSV files from the UBPR were downloaded and processed to produce the tables and charts in this report.

## Setup

Clone the repository and open `index.html` in any modern web browser. Optionally, you can serve the directory with a simple HTTP server:

```bash
python3 -m http.server
```

### Dependencies

No additional dependencies are required to view the report. To regenerate the data you will need Python 3 along with packages such as `pandas` and `requests` for fetching and cleaning the UBPR files.

### Development

From the `dev/` directory run `npm install` to install the development dependencies. Then execute `npm run test:ejs` to verify EJS setup.

## Contributing and Updating Data

Contributions are welcome. If you have updated UBPR data or spot issues with the report, open an issue or submit a pull request. Replace the source CSV files and regenerate the summary before updating `index.html`.

## Deployment Notes

- `index.html` loads data from `https://api.ffiec.gov/public/v2/ubpr/financials`.
- The repository has no references to the deprecated `ubprapi.ffiec.gov` endpoint.
- Ensure any hosting environment serves this `index.html` so the current API is used.




## FFIEC PWS API Script

The repository includes a small Python helper `scripts/ffiec_api.py` for accessing the FFIEC Public Web Service (PWS).

### Running the example

1. Install dependencies:
   ```bash
   pip install requests
   ```
2. Provide your PWS credentials as environment variables:
   ```bash
   export PWS_USERNAME="your_username"
   export PWS_TOKEN="your_security_token"
   ```
3. Execute the script:
   ```bash
   python scripts/ffiec_api.py
   ```
   The example in the `__main__` block fetches an institution record and saves it to `institution.json`.

