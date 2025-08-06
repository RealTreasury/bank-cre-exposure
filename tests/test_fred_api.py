import sys
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.fred_api import FRED_BASE_URL, get_series_observations


class TestFredAPI(unittest.TestCase):
    @patch("scripts.fred_api.requests.get")
    def test_get_series_observations(self, mock_get: Mock) -> None:
        mock_resp = Mock()
        mock_resp.json.return_value = {"observations": []}
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        result = get_series_observations("GDP", "key", params={"frequency": "q"})

        expected_url = f"{FRED_BASE_URL}/series/observations"
        mock_get.assert_called_with(
            expected_url,
            params={
                "series_id": "GDP",
                "api_key": "key",
                "file_type": "json",
                "frequency": "q",
            },
            timeout=30,
        )
        self.assertEqual(result, {"observations": []})


if __name__ == "__main__":
    unittest.main()
