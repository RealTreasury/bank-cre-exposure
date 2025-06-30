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
