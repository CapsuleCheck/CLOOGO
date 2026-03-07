"""Tests for new ErrandGo features: categories, counter-proposal, push notifications, earnings, refactoring."""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

POSTER_EMAIL = "poster2@test.com"
POSTER_PASS = "pass1234"
RUNNER_EMAIL = "runner2@test.com"
RUNNER_PASS = "pass1234"


@pytest.fixture(scope="module")
def poster_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": POSTER_EMAIL, "password": POSTER_PASS})
    assert r.status_code == 200, f"Poster login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def runner_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": RUNNER_EMAIL, "password": RUNNER_PASS})
    assert r.status_code == 200, f"Runner login failed: {r.text}"
    return r.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- 1. CATEGORIES ---
class TestCategories:
    """Category field on errands"""

    errand_id = None

    def test_create_errand_with_category(self, poster_token):
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth(poster_token), json={
            "item_description": "TEST_category_errand",
            "category": "Grocery",
            "pickup_neighborhood": "Downtown",
            "delivery_neighborhood": "Uptown",
            "delivery_address": "123 Main St",
            "offered_price": 15.0
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["category"] == "Grocery"
        TestCategories.errand_id = data["id"]

    def test_get_errand_has_category(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands/{TestCategories.errand_id}", headers=auth(poster_token))
        assert r.status_code == 200
        assert r.json()["category"] == "Grocery"

    def test_filter_by_category(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands?category=Grocery", headers=auth(poster_token))
        assert r.status_code == 200
        errands = r.json()
        assert any(e["category"] == "Grocery" for e in errands)

    def test_filter_category_no_match(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands?category=NonExistentXYZ123", headers=auth(poster_token))
        assert r.status_code == 200
        assert r.json() == []


# --- 2. COUNTER-PROPOSAL FULL FLOW ---
class TestCounterProposal:
    """Counter-proposal flow: create errand -> offer -> counter -> accept counter"""

    errand_id = None
    offer_id = None

    def test_setup_errand(self, poster_token):
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth(poster_token), json={
            "item_description": "TEST_counter_errand",
            "category": "Grocery",
            "pickup_neighborhood": "Downtown",
            "delivery_neighborhood": "Midtown",
            "delivery_address": "456 Oak Ave",
            "offered_price": 20.0
        })
        assert r.status_code == 200
        TestCounterProposal.errand_id = r.json()["id"]

    def test_runner_submits_offer(self, runner_token):
        r = requests.post(f"{BASE_URL}/api/errands/{TestCounterProposal.errand_id}/offers",
                          headers=auth(runner_token), json={"proposed_price": 18.0, "message": "I can do it"})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        TestCounterProposal.offer_id = data["id"]

    def test_poster_counters_offer(self, poster_token):
        r = requests.patch(f"{BASE_URL}/api/offers/{TestCounterProposal.offer_id}/counter",
                           headers=auth(poster_token),
                           json={"counter_price": 19.0, "counter_message": "How about $19?"})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "countered"
        assert data["counter_price"] == 19.0
        assert data["counter_message"] == "How about $19?"

    def test_runner_accepts_counter(self, runner_token):
        r = requests.patch(f"{BASE_URL}/api/offers/{TestCounterProposal.offer_id}/accept-counter",
                           headers=auth(runner_token))
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "matched"
        assert data["accepted_price"] == 19.0

    def test_errand_is_matched_after_accept_counter(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands/{TestCounterProposal.errand_id}", headers=auth(poster_token))
        assert r.status_code == 200
        assert r.json()["status"] == "matched"
        assert r.json()["accepted_price"] == 19.0


# --- 3. PUSH NOTIFICATIONS ---
class TestPushNotifications:
    """Push notification endpoints"""

    def test_vapid_public_key(self):
        r = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert r.status_code == 200
        data = r.json()
        assert "publicKey" in data
        assert len(data["publicKey"]) > 10

    def test_push_subscribe(self, poster_token):
        r = requests.post(f"{BASE_URL}/api/push/subscribe", headers=auth(poster_token), json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_subscription_endpoint",
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTiHTjdy4fg8zmsc",
            "auth": "tBHItJI5svbpez7KI4CCXg"
        })
        assert r.status_code == 200
        assert "Subscribed" in r.json()["message"]


# --- 4. RUNNER EARNINGS ---
class TestEarnings:
    """Runner earnings endpoint"""

    def test_earnings_returns_expected_fields(self, runner_token):
        r = requests.get(f"{BASE_URL}/api/my/earnings", headers=auth(runner_token))
        assert r.status_code == 200
        data = r.json()
        assert "total_earned" in data
        assert "pending_payout" in data
        assert "completed_runs" in data
        assert "in_progress_runs" in data
        assert isinstance(data["total_earned"], (int, float))
        assert isinstance(data["pending_payout"], (int, float))
        assert isinstance(data["completed_runs"], list)
        assert isinstance(data["in_progress_runs"], list)


# --- 5. BACKEND REFACTORING ---
class TestBackendRefactoring:
    """Verify existing endpoints still work after refactoring"""

    def test_auth_login(self, poster_token):
        assert poster_token is not None

    def test_get_me(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth(poster_token))
        assert r.status_code == 200
        assert "email" in r.json()

    def test_list_errands(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands", headers=auth(poster_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/notifications", headers=auth(poster_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- 6. REGRESSION ---
class TestRegression:
    """Stripe, chat, notifications regression"""

    def test_chat_messages_on_matched_errand(self, poster_token, runner_token):
        errand_id = TestCounterProposal.errand_id
        if not errand_id:
            pytest.skip("No matched errand available")
        r = requests.post(f"{BASE_URL}/api/errands/{errand_id}/messages",
                          headers=auth(poster_token), json={"content": "TEST_chat_message"})
        assert r.status_code == 200
        assert r.json()["content"] == "TEST_chat_message"

    def test_get_chat_messages(self, poster_token):
        errand_id = TestCounterProposal.errand_id
        if not errand_id:
            pytest.skip("No matched errand available")
        r = requests.get(f"{BASE_URL}/api/errands/{errand_id}/messages", headers=auth(poster_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
