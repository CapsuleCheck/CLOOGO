"""
ErrandGo Keep-Alive Service
Pings both the internal backend and external preview URL every 30 seconds
to prevent the Emergent preview environment from sleeping during Apple App Store review.
"""
import time
import requests
import logging
from datetime import datetime, timezone
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [keepalive] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("keepalive")

INTERNAL_URL = "http://localhost:8001/api/health"
EXTERNAL_URL = "https://ride-delivery-8.preview.emergentagent.com/api/health"
PING_INTERVAL = 30  # seconds

def ping(url, label):
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            logger.info(f"[{label}] Ping OK → HTTP {r.status_code} ✓")
            return True
        else:
            logger.warning(f"[{label}] Ping → HTTP {r.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        logger.warning(f"[{label}] Connection refused (server restarting?)")
        return False
    except requests.exceptions.Timeout:
        logger.warning(f"[{label}] Timeout after 15s")
        return False
    except Exception as e:
        logger.warning(f"[{label}] Error: {type(e).__name__}: {e}")
        return False

def main():
    logger.info("=" * 55)
    logger.info("ErrandGo Keep-Alive Service started")
    logger.info(f"Pinging every {PING_INTERVAL}s — internal + external")
    logger.info("Target: Apple App Store review availability")
    logger.info("=" * 55)

    total = 0
    fails = 0

    while True:
        total += 1
        internal_ok = ping(INTERNAL_URL, "internal")
        external_ok = ping(EXTERNAL_URL, "external")

        if not internal_ok and not external_ok:
            fails += 1
            logger.error(f"Both endpoints unreachable! ({fails} consecutive failures)")
        else:
            fails = 0

        # Hourly summary
        if total % 120 == 0:
            uptime_hrs = (total * PING_INTERVAL) / 3600
            logger.info(f"Summary: {total} pings | {uptime_hrs:.1f}h uptime | {fails} current failures")

        time.sleep(PING_INTERVAL)

if __name__ == "__main__":
    main()
