import base64
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.ffiec_api import get_auth_headers


class TestAuthHeaders(unittest.TestCase):
    def test_get_auth_headers(self):
        headers = get_auth_headers("user", "pass", "token")
        expected = base64.b64encode(b"user:passtoken").decode("ascii")
        self.assertEqual(headers["Authorization"], f"Basic {expected}")
        self.assertEqual(headers["Accept"], "application/json")


if __name__ == "__main__":
    unittest.main()
