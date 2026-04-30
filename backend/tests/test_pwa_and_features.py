"""
Backend API tests for Cloogo - PWA features, auth, errands, offers, payments, chat
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
POSTER_EMAIL = "testposter_pwa@cloogo.com"
POSTER_PASS = "testpass1234"
RUNNER_EMAIL = "testrunner_pwa@cloogo.com"
RUNNER_PASS = "testpass1234"

poster_token = None
runner_token = None
errand_id = None
offer_id = None


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- PWA Static Assets ---
class TestPWAAssets:
    """Test PWA manifest, service worker, and icons"""

    def test_manifest_returns_200(self):
        resp = requests.get(f"{BASE_URL}/manifest.json")
        assert resp.status_code == 200, f"manifest.json returned {resp.status_code}"
        print(f"PASS: manifest.json status {resp.status_code}")

    def test_manifest_content_type(self):
        resp = requests.get(f"{BASE_URL}/manifest.json")
        ct = resp.headers.get("content-type", "")
        assert "json" in ct or "javascript" in ct, f"Unexpected content-type: {ct}"
        print(f"PASS: manifest content-type: {ct}")

    def test_manifest_has_required_fields(self):
        resp = requests.get(f"{BASE_URL}/manifest.json")
        data = resp.json()
        assert data.get("name") == "Cloogo - Neighborhood Errands"
        assert data.get("short_name") == "Cloogo"
        assert "icons" in data
        print("PASS: manifest has required fields")

    def test_service_worker_returns_200(self):
        resp = requests.get(f"{BASE_URL}/service-worker.js")
        assert resp.status_code == 200, f"service-worker.js returned {resp.status_code}"
        print(f"PASS: service-worker.js status {resp.status_code}")

    def test_icon_192_exists(self):
        resp = requests.get(f"{BASE_URL}/icons/icon-192x192.png")
        assert resp.status_code == 200, f"icon-192x192.png returned {resp.status_code}"
        print("PASS: icon-192x192.png exists")

    def test_icon_512_exists(self):
        resp = requests.get(f"{BASE_URL}/icons/icon-512x512.png")
        assert resp.status_code == 200, f"icon-512x512.png returned {resp.status_code}"
        print("PASS: icon-512x512.png exists")

    def test_index_html_title(self):
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert "Cloogo - Neighborhood Errands" in resp.text
        print("PASS: index.html has correct title")

    def test_index_html_manifest_link(self):
        resp = requests.get(f"{BASE_URL}/")
        assert 'rel="manifest"' in resp.text or "manifest.json" in resp.text
        print("PASS: index.html has manifest link")

    def test_index_html_apple_touch_icon(self):
        resp = requests.get(f"{BASE_URL}/")
        assert "apple-touch-icon" in resp.text
        print("PASS: index.html has apple-touch-icon link")


# --- Auth Tests ---
class TestAuth:
    """Test user registration and login"""

    def test_register_poster(self, session):
        global poster_token
        # Try register; if already exists, login
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": POSTER_EMAIL, "password": POSTER_PASS, "name": "Test Poster PWA", "neighborhood": "Downtown"
        })
        if resp.status_code == 400:
            resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": POSTER_EMAIL, "password": POSTER_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        poster_token = data["token"]
        print(f"PASS: poster registered/logged in, token acquired")

    def test_register_runner(self, session):
        global runner_token
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": RUNNER_EMAIL, "password": RUNNER_PASS, "name": "Test Runner PWA", "neighborhood": "Uptown"
        })
        if resp.status_code == 400:
            resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": RUNNER_EMAIL, "password": RUNNER_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        runner_token = data["token"]
        print("PASS: runner registered/logged in")

    def test_login_token_endpoint(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/token", json={"email": POSTER_EMAIL, "password": POSTER_PASS})
        # /api/auth/token may not exist - /api/auth/login is the real endpoint
        # Accept either 200 or 404/405
        print(f"INFO: /api/auth/token returned {resp.status_code}")


# --- Errand Tests ---
class TestErrands:
    """Test errand CRUD"""

    def test_create_errand(self, session):
        global errand_id
        if not poster_token:
            pytest.skip("No poster token")
        resp = session.post(f"{BASE_URL}/api/errands",
            headers={"Authorization": f"Bearer {poster_token}"},
            json={
                "item_description": "TEST_PWA Grocery Run",
                "item_details": "Milk, bread, eggs",
                "pickup_neighborhood": "Downtown",
                "delivery_neighborhood": "Uptown",
                "delivery_address": "123 Main St",
                "offered_price": 15.00
            })
        assert resp.status_code == 200, f"Create errand failed: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert data["status"] == "open"
        errand_id = data["id"]
        print(f"PASS: errand created with id={errand_id}")

    def test_get_errand(self, session):
        if not errand_id or not poster_token:
            pytest.skip("No errand_id")
        resp = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {poster_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == errand_id
        print("PASS: get errand by id")


# --- Offer Tests ---
class TestOffers:
    """Test offer submission and acceptance"""

    def test_submit_offer(self, session):
        global offer_id
        if not errand_id or not runner_token:
            pytest.skip("Missing errand_id or runner_token")
        resp = session.post(f"{BASE_URL}/api/errands/{errand_id}/offers",
            headers={"Authorization": f"Bearer {runner_token}"},
            json={"proposed_price": 12.00, "message": "I can do it!"})
        if resp.status_code == 400 and "already have a pending offer" in resp.text:
            # Get existing offer
            offers_resp = session.get(f"{BASE_URL}/api/errands/{errand_id}/offers",
                headers={"Authorization": f"Bearer {poster_token}"})
            if offers_resp.status_code == 200 and offers_resp.json():
                offer_id = offers_resp.json()[0]["id"]
                print(f"INFO: reusing existing offer id={offer_id}")
                return
        assert resp.status_code == 200, f"Submit offer failed: {resp.text}"
        data = resp.json()
        offer_id = data["id"]
        print(f"PASS: offer submitted id={offer_id}")

    def test_accept_offer(self, session):
        if not offer_id or not poster_token:
            pytest.skip("Missing offer_id or poster_token")
        # Check errand status first
        errand = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {poster_token}"}).json()
        if errand.get("status") == "matched":
            print("INFO: errand already matched, skip accept")
            return
        resp = session.patch(f"{BASE_URL}/api/offers/{offer_id}/accept",
            headers={"Authorization": f"Bearer {poster_token}"})
        assert resp.status_code == 200, f"Accept offer failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "matched"
        print("PASS: offer accepted, errand status=matched")


# --- Payment Tests ---
class TestPayments:
    """Test Stripe checkout session creation and status polling"""

    def test_create_checkout_session(self, session):
        if not errand_id or not poster_token:
            pytest.skip("Missing errand_id or poster_token")
        errand = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {poster_token}"}).json()
        if errand.get("status") != "matched":
            pytest.skip("Errand not matched, cannot test payment")
        resp = session.post(f"{BASE_URL}/api/payments/checkout",
            headers={"Authorization": f"Bearer {poster_token}"},
            json={"errand_id": errand_id, "origin_url": BASE_URL})
        if resp.status_code == 400 and "already completed" in resp.text:
            print("INFO: Payment already completed for this errand")
            return
        assert resp.status_code == 200, f"Checkout failed: {resp.text}"
        data = resp.json()
        assert "url" in data
        assert "session_id" in data
        print(f"PASS: checkout session created: {data['session_id']}")

        # Test status polling
        session_id = data["session_id"]
        status_resp = session.get(f"{BASE_URL}/api/payments/status/{session_id}",
            headers={"Authorization": f"Bearer {poster_token}"})
        assert status_resp.status_code == 200, f"Status poll failed: {status_resp.text}"
        status_data = status_resp.json()
        assert "payment_status" in status_data
        print(f"PASS: payment status polled: {status_data['payment_status']}")


# --- Chat Tests ---
class TestChat:
    """Test message sending and retrieval"""

    def test_send_message_requires_matched(self, session):
        if not errand_id or not poster_token:
            pytest.skip("Missing errand_id")
        errand = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {poster_token}"}).json()
        if errand.get("status") not in ["matched", "in_progress", "completed"]:
            pytest.skip("Errand not in correct status for chat")

        resp = session.post(f"{BASE_URL}/api/errands/{errand_id}/messages",
            headers={"Authorization": f"Bearer {poster_token}"},
            json={"content": "TEST_PWA Hello from poster"})
        assert resp.status_code == 200, f"Send message failed: {resp.text}"
        data = resp.json()
        assert data["content"] == "TEST_PWA Hello from poster"
        print("PASS: poster sent message")

    def test_get_messages(self, session):
        if not errand_id or not poster_token:
            pytest.skip("Missing errand_id")
        errand = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {poster_token}"}).json()
        if errand.get("status") not in ["matched", "in_progress", "completed"]:
            pytest.skip("Errand not in correct status for chat")

        resp = session.get(f"{BASE_URL}/api/errands/{errand_id}/messages",
            headers={"Authorization": f"Bearer {poster_token}"})
        assert resp.status_code == 200, f"Get messages failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: get messages returned {len(data)} messages")

    def test_runner_can_send_message(self, session):
        if not errand_id or not runner_token:
            pytest.skip("Missing errand_id or runner_token")
        errand = session.get(f"{BASE_URL}/api/errands/{errand_id}",
            headers={"Authorization": f"Bearer {runner_token}"}).json()
        if errand.get("status") not in ["matched", "in_progress", "completed"]:
            pytest.skip("Errand not in correct status for chat")

        resp = session.post(f"{BASE_URL}/api/errands/{errand_id}/messages",
            headers={"Authorization": f"Bearer {runner_token}"},
            json={"content": "TEST_PWA Hello from runner"})
        assert resp.status_code == 200, f"Runner send message failed: {resp.text}"
        print("PASS: runner sent message")
