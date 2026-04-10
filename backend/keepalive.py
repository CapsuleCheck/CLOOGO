"""
ErrandGo Keep-Alive Service
Pings the backend every 2 minutes to prevent the Emergent preview
environment from sleeping during Apple App Store review.
"""
import time
import requests
import logging
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [keepalive] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("keepalive")

BACKEND_URL = "http://localhost:8001"
PING_INTERVAL = 90  # seconds — ping every 90 seconds
ENDPOINTS = [
    "/api/auth/me",   # lightweight auth check
]

def ping():
    for endpoint in ENDPOINTS:
        try:
            r = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
            logger.info(f"Ping {endpoint} → HTTP {r.status_code} ✓")
            return True
        except requests.exceptions.ConnectionError:
            logger.warning(f"Ping {endpoint} → Connection refused (server starting?)")
        except Exception as e:
            logger.warning(f"Ping {endpoint} → {type(e).__name__}: {e}")
    return False

def main():
    logger.info("=" * 50)
    logger.info("ErrandGo Keep-Alive Service started")
    logger.info(f"Pinging every {PING_INTERVAL}s to stay awake for Apple review")
    logger.info("=" * 50)

    consecutive_failures = 0
    total_pings = 0

    while True:
        total_pings += 1
        success = ping()

        if success:
            consecutive_failures = 0
        else:
            consecutive_failures += 1
            if consecutive_failures >= 5:
                logger.error(
                    f"Backend unreachable for {consecutive_failures} consecutive pings. "
                    "Supervisor should auto-restart it."
                )

        if total_pings % 40 == 0:  # log summary every ~1 hour
            logger.info(
                f"Keep-alive summary: {total_pings} pings sent, "
                f"{consecutive_failures} consecutive failures"
            )

        time.sleep(PING_INTERVAL)

if __name__ == "__main__":
    main()
