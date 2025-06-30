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
