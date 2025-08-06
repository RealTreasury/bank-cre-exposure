import logging
import time
from typing import Any, Dict, Optional

import requests

FRED_BASE_URL = "https://api.stlouisfed.org/fred"

logging.basicConfig(level=logging.INFO)


def get_series_observations(
    series_id: str,
    api_key: str,
    params: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    backoff: float = 1.0,
) -> Any:
    """Fetch observations for a FRED series.

    Builds a request to the `/series/observations` endpoint with the provided
    `series_id` and `api_key`. Additional parameters can be supplied via
    `params` and default to `file_type=json`.
    """
    url = f"{FRED_BASE_URL}/series/observations"
    query: Dict[str, Any] = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
    }
    if params:
        query.update(params)

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, params=query, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logging.warning(
                "Request to %s failed on attempt %d/%d: %s", url, attempt, max_retries, exc
            )
            if attempt == max_retries:
                raise
            time.sleep(backoff * attempt)


if __name__ == "__main__":
    import os

    series = os.environ.get("FRED_SERIES", "DGS10")
    api_key = os.environ.get("FRED_API_KEY", "your_key")
    try:
        data = get_series_observations(series, api_key)
        logging.info("Fetched %d observations", len(data.get("observations", [])))
    except Exception as exc:  # pragma: no cover - example usage
        logging.error("Failed to fetch series %s: %s", series, exc)
