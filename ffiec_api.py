import base64
import csv
import json
import logging
import time
from typing import Any, Dict, List, Optional

import requests

BASE_URL = "https://cdr.ffiec.gov/public/PWS"

logging.basicConfig(level=logging.INFO)


def get_auth_headers(username: str, password: str, token: str) -> Dict[str, str]:
    """Return authentication headers for FFIEC PWS.

    The security token is appended to the password and encoded using HTTP Basic
    authentication.
    """
    auth_str = f"{username}:{password}{token}"
    b64 = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
    return {
        "Authorization": f"Basic {b64}",
        "Accept": "application/json",
    }


def _request(
    path: str,
    headers: Dict[str, str],
    params: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    backoff: float = 1.0,
) -> Any:
    """Make a request with simple retry and logging."""
    url = f"{BASE_URL}{path}"
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logging.warning(
                "Request to %s failed on attempt %d/%d: %s", url, attempt, max_retries, exc
            )
            if attempt == max_retries:
                raise
            time.sleep(backoff * attempt)


def find_institution(fdic_cert: str, headers: Dict[str, str]) -> Any:
    """Fetch institution details by FDIC certificate number."""
    return _request(f"/Institution/Find/{fdic_cert}", headers)


def search_call_report(params: Dict[str, Any], headers: Dict[str, str]) -> Any:
    """Search call report data."""
    return _request("/CallReport/Search", headers, params=params)


def search_ubpr(params: Dict[str, Any], headers: Dict[str, str]) -> Any:
    """Search UBPR data."""
    return _request("/UBPR/Search", headers, params=params)


def save_json(data: Any, path: str) -> None:
    """Save data to a JSON file."""
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)


def save_csv(rows: List[Dict[str, Any]], path: str) -> None:
    """Save list of dictionaries to CSV."""
    if not rows:
        raise ValueError("No rows to write")
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    import os

    username = os.environ.get("PWS_USERNAME", "your_username")
    password = os.environ.get("PWS_PASSWORD", "your_password")
    token = os.environ.get("PWS_TOKEN", "your_token")

    headers = get_auth_headers(username, password, token)

    try:
        cert_number = "00000"  # Replace with actual FDIC certificate number
        result = find_institution(cert_number, headers)
        save_json(result, "institution.json")
        logging.info("Institution data saved to institution.json")
    except Exception as exc:
        logging.error("Failed to fetch institution data: %s", exc)
