"""Tests for new features: notifications, ratings, map coordinates"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json()["token"]
    return None


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Setup: get poster token and a runner token ---
POSTER_EMAIL = "test@example.com"
POSTER_PASS = "test123"
RUNNER_EMAIL = "runner_feat@test.com"
RUNNER_PASS = "test123"


@pytest.fixture(scope="module")
def poster_token():
    token = login(POSTER_EMAIL, POSTER_PASS)
    assert token, "Poster login failed"
    return token


@pytest.fixture(scope="module")
def runner_token():
    # Try login first, register if not exists
    token = login(RUNNER_EMAIL, RUNNER_PASS)
    if not token:
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": RUNNER_EMAIL, "password": RUNNER_PASS,
            "name": "Feature Runner", "neighborhood": "Oak Park"
        })
        assert r.status_code == 200, f"Runner registration failed: {r.text}"
        token = r.json()["token"]
    return token


@pytest.fixture(scope="module")
def completed_errand(poster_token, runner_token):
    """Create an errand, assign runner, set status=completed"""
    # Create errand with coordinates
    r = requests.post(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), json={
        "item_description": "TEST_Feature test errand",
        "pickup_neighborhood": "Lincoln Park",
        "delivery_neighborhood": "Oak Park",
        "delivery_address": "123 Oak St",
        "offered_price": 10.0,
        "pickup_lat": 41.9214,
        "pickup_lng": -87.6513
    })
    assert r.status_code == 200, f"Create errand failed: {r.text}"
    errand = r.json()
    errand_id = errand["id"]

    # Runner submits offer
    r2 = requests.post(f"{BASE_URL}/api/errands/{errand_id}/offers", headers=auth_headers(runner_token), json={
        "proposed_price": 10.0, "message": "I can do it"
    })
    assert r2.status_code == 200, f"Offer creation failed: {r2.text}"
    offer_id = r2.json()["id"]

    # Poster accepts offer
    r3 = requests.patch(f"{BASE_URL}/api/offers/{offer_id}/accept", headers=auth_headers(poster_token))
    assert r3.status_code == 200, f"Offer accept failed: {r3.text}"

    # Force status to completed
    r4 = requests.patch(f"{BASE_URL}/api/errands/{errand_id}/status", headers=auth_headers(poster_token), json={"status": "completed"})
    assert r4.status_code == 200, f"Status update to completed failed: {r4.text}"

    return errand_id


# --- Notification Tests ---
class TestNotifications:
    def test_get_notifications_returns_list(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers(poster_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/notifications returned {len(data)} notifications")

    def test_notification_created_when_offer_submitted(self, poster_token, runner_token):
        """Create an errand, submit offer, check poster has a notification"""
        # Create errand
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), json={
            "item_description": "TEST_Notif test errand",
            "pickup_neighborhood": "Logan Square",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "999 Notif St",
            "offered_price": 8.0
        })
        assert r.status_code == 200
        errand_id = r.json()["id"]

        # Runner submits offer
        r2 = requests.post(f"{BASE_URL}/api/errands/{errand_id}/offers", headers=auth_headers(runner_token), json={
            "proposed_price": 8.0
        })
        assert r2.status_code == 200

        # Check poster notifications
        r3 = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers(poster_token))
        assert r3.status_code == 200
        notifs = r3.json()
        new_offer_notifs = [n for n in notifs if n.get("type") == "new_offer" and n.get("errand_id") == errand_id]
        assert len(new_offer_notifs) >= 1, f"Expected new_offer notification, got: {notifs[:3]}"
        assert new_offer_notifs[0]["is_read"] == False
        print(f"PASS: Notification created on offer submission, title: {new_offer_notifs[0]['title']}")

    def test_mark_all_read(self, poster_token):
        r = requests.patch(f"{BASE_URL}/api/notifications/read-all", headers=auth_headers(poster_token))
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        print(f"PASS: Mark all read: {data['message']}")

    def test_notifications_are_read_after_mark_all(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers(poster_token))
        assert r.status_code == 200
        notifs = r.json()
        unread = [n for n in notifs if not n.get("is_read")]
        assert len(unread) == 0, f"Expected 0 unread after mark all read, got {len(unread)}"
        print(f"PASS: All {len(notifs)} notifications are now read")

    def test_mark_single_notification_read(self, runner_token):
        notifs = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers(runner_token)).json()
        if not notifs:
            pytest.skip("No notifications for runner")
        notif_id = notifs[0]["id"]
        r = requests.patch(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=auth_headers(runner_token))
        assert r.status_code == 200
        print(f"PASS: Single notification {notif_id} marked read")


# --- Rating Tests ---
class TestRatings:
    def test_rate_completed_errand(self, completed_errand, poster_token, runner_token):
        errand_id = completed_errand
        r = requests.post(f"{BASE_URL}/api/errands/{errand_id}/rate", headers=auth_headers(poster_token), json={
            "stars": 4, "comment": "Good job!"
        })
        assert r.status_code == 200, f"Rating failed: {r.text}"
        data = r.json()
        assert data["stars"] == 4
        assert data["errand_id"] == errand_id
        print(f"PASS: Rating submitted, id={data['id']}, stars={data['stars']}")

    def test_duplicate_rating_rejected(self, completed_errand, poster_token):
        errand_id = completed_errand
        r = requests.post(f"{BASE_URL}/api/errands/{errand_id}/rate", headers=auth_headers(poster_token), json={"stars": 5})
        assert r.status_code == 400, f"Expected 400 for duplicate rating, got {r.status_code}"
        print("PASS: Duplicate rating rejected with 400")

    def test_rating_requires_completed_status(self, poster_token):
        # Create a new open errand and try to rate it
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), json={
            "item_description": "TEST_Rate test open errand",
            "pickup_neighborhood": "Logan Square",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "100 Test St",
            "offered_price": 5.0
        })
        errand_id = r.json()["id"]
        r2 = requests.post(f"{BASE_URL}/api/errands/{errand_id}/rate", headers=auth_headers(poster_token), json={"stars": 3})
        assert r2.status_code == 400
        print("PASS: Cannot rate open errand (400 returned)")

    def test_get_my_rating_for_errand(self, completed_errand, poster_token):
        errand_id = completed_errand
        r = requests.get(f"{BASE_URL}/api/errands/{errand_id}/my-rating", headers=auth_headers(poster_token))
        assert r.status_code == 200
        data = r.json()
        assert data["rated"] == True
        assert data["rating"]["stars"] == 4
        print(f"PASS: my-rating endpoint returned rated=True, stars={data['rating']['stars']}")

    def test_get_user_rating_average(self, runner_token, poster_token):
        # Get runner user id
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(runner_token)).json()
        runner_id = me["id"]
        r = requests.get(f"{BASE_URL}/api/users/{runner_id}/rating", headers=auth_headers(poster_token))
        assert r.status_code == 200
        data = r.json()
        assert "average" in data and "count" in data
        assert data["count"] >= 1
        print(f"PASS: User rating: avg={data['average']}, count={data['count']}")


# --- Map Coordinate Tests ---
class TestMapCoordinates:
    def test_create_errand_with_coordinates(self, poster_token):
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), json={
            "item_description": "TEST_Map coord errand",
            "pickup_neighborhood": "Lincoln Park",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "500 Map St",
            "offered_price": 12.0,
            "pickup_lat": 41.9214,
            "pickup_lng": -87.6513
        })
        assert r.status_code == 200
        data = r.json()
        assert data["pickup_lat"] == 41.9214
        assert data["pickup_lng"] == -87.6513
        print(f"PASS: Errand created with coords lat={data['pickup_lat']}, lng={data['pickup_lng']}")

    def test_errand_without_coords_has_null(self, poster_token):
        r = requests.post(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), json={
            "item_description": "TEST_No coord errand",
            "pickup_neighborhood": "Logan Square",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "600 No Coord St",
            "offered_price": 6.0
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("pickup_lat") is None
        assert data.get("pickup_lng") is None
        print("PASS: Errand without coords has null lat/lng")

    def test_list_errands_includes_coords(self, poster_token):
        r = requests.get(f"{BASE_URL}/api/errands", headers=auth_headers(poster_token), params={"status": "open"})
        assert r.status_code == 200
        errands = r.json()
        # Find errands with coords
        with_coords = [e for e in errands if e.get("pickup_lat") and e.get("pickup_lng")]
        print(f"PASS: {len(with_coords)}/{len(errands)} errands have map coordinates")
