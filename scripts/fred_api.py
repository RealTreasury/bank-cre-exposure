"""Simple client for the FRED (Federal Reserve Economic Data) API."""

from typing import Any, Dict, Optional

import requests

FRED_BASE_URL = "https://api.stlouisfed.org/fred"


def get_series_observations(
    series_id: str, api_key: str, params: Optional[Dict[str, Any]] = None
) -> Any:
    """Fetch observations for a FRED series.

    Parameters
    ----------
    series_id: str
        FRED series identifier.
    api_key: str
        API key for authenticating with FRED.
    params: Optional[Dict[str, Any]]
        Additional query parameters.

    Returns
    -------
    Any
        Parsed JSON response.

    Raises
    ------
    requests.HTTPError
        If the HTTP request fails.
    """
    url = f"{FRED_BASE_URL}/series/observations"
    req_params: Dict[str, Any] = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
    }
    if params:
        req_params.update(params)

    resp = requests.get(url, params=req_params, timeout=30)
    resp.raise_for_status()
    return resp.json()
