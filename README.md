
# bank-cre-exposure

This repository hosts the static HTML report summarizing commercial real estate exposures for September 2024.

## Commit Message Style

Use short commit messages that summarize what changed, for example:

```
Add link to UBPR source in footer.
```

Keeping messages concise helps everyone quickly understand the project history. Please follow this style for future commits.


# Bank CRE Exposure

This sample page demonstrates how to render commercial real estate (CRE) exposure metrics for U.S. banks. The table in `index.html` is populated using the FFIEC Uniform Bank Performance Report (UBPR) API.

## UBPR API

The UBPR API provides call report data in JSON format.

**Endpoint**

```
https://ubprapi.ffiec.gov/v1/financials
```

### Common parameters

- `as_of` – reporting date in `YYYY-MM-DD` format.
- `top` – number of institutions to return.
- `sort` – field to sort by (for example `assets`).
- `order` – `asc` or `desc`.

**Example request**

```
https://ubprapi.ffiec.gov/v1/financials?as_of=2024-09-30&top=30&sort=assets&order=desc
```

The response contains a `data` array with each bank's UBPR values. Fields used in this demo include:

- `bank_name`
- `total_assets`
- `net_loans_assets`
- `noncurrent_assets_pct`
- `cd_to_tier1`
- `cre_to_tier1`

The script in `index.html` fetches the data on page load and builds the table rows dynamically. CRE ratio values determine the risk coloring shown in the table.


# bank-cre-exposure

This repository contains an HTML report summarizing commercial real estate exposure for banks.

## Usage

Open `index.html` in your browser to view the report.

Common color variables and base page styles are defined in `assets/css/shared.css`. Edit this file to adjust the theme across the report.

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

## Contributing and Updating Data

Contributions are welcome. If you have updated UBPR data or spot issues with the report, open an issue or submit a pull request. Replace the source CSV files and regenerate the summary before updating `index.html`.



