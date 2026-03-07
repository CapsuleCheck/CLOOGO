"""Tests for image upload feature: POST /api/upload, GET /api/images/{filename}, errand image_url"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "test@example.com", "password": "test123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

def make_test_image(size_bytes=1024):
    """Create a minimal valid PNG in memory"""
    import struct, zlib
    def png_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)
    
    # 1x1 red pixel PNG
    png = (
        b'\x89PNG\r\n\x1a\n' +
        png_chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) +
        png_chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00')) +
        png_chunk(b'IEND', b'')
    )
    return png

class TestUploadEndpoint:
    """Tests for POST /api/upload"""

    def test_upload_valid_image(self, auth_headers):
        """Upload a valid PNG image, expect 200 with url field"""
        img_data = make_test_image()
        files = {"file": ("test.png", io.BytesIO(img_data), "image/png")}
        res = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "url" in data, "Response must have 'url' field"
        assert data["url"].startswith("/api/images/"), f"URL should start with /api/images/, got {data['url']}"
        assert "filename" in data, "Response must have 'filename' field"
        # Store for other tests
        TestUploadEndpoint.uploaded_url = data["url"]
        TestUploadEndpoint.uploaded_filename = data["filename"]
        print(f"Uploaded image: {data['url']}")

    def test_upload_requires_auth(self):
        """Upload without auth should fail"""
        img_data = make_test_image()
        files = {"file": ("test.png", io.BytesIO(img_data), "image/png")}
        res = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert res.status_code in [401, 403], f"Expected 401/403, got {res.status_code}"

    def test_upload_rejects_non_image(self, auth_headers):
        """Upload a text file should return 400"""
        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        res = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"

    def test_upload_rejects_large_file(self, auth_headers):
        """Upload file over 8MB should return 400"""
        large_data = b'\x00' * (9 * 1024 * 1024)  # 9MB
        files = {"file": ("large.jpg", io.BytesIO(large_data), "image/jpeg")}
        res = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"


class TestServeImage:
    """Tests for GET /api/images/{filename}"""

    def test_serve_uploaded_image(self, auth_headers):
        """After uploading, the image should be serveable"""
        # First upload an image
        img_data = make_test_image()
        files = {"file": ("test_serve.png", io.BytesIO(img_data), "image/png")}
        up_res = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers)
        assert up_res.status_code == 200
        url = up_res.json()["url"]  # e.g. /api/images/uuid.png

        # Now serve it
        full_url = f"{BASE_URL}{url}"
        res = requests.get(full_url)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert len(res.content) > 0, "Image content should not be empty"
        print(f"Served image from {full_url}, size={len(res.content)} bytes")

    def test_serve_nonexistent_image(self):
        """Get non-existent image should return 404"""
        res = requests.get(f"{BASE_URL}/api/images/nonexistent-uuid.png")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"


class TestErrandWithImage:
    """Tests for errand creation with image_url"""

    def test_create_errand_with_image_url(self, auth_headers):
        """Create an errand with image_url, verify it's stored and returned"""
        # First upload an image
        img_data = make_test_image()
        files = {"file": ("errand_test.png", io.BytesIO(img_data), "image/png")}
        up_res = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers)
        assert up_res.status_code == 200
        image_url = up_res.json()["url"]

        # Create errand with image_url
        errand_payload = {
            "item_description": "TEST_Image Errand",
            "pickup_neighborhood": "Riverside",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "123 Test St",
            "offered_price": 10.00,
            "image_url": image_url
        }
        res = requests.post(f"{BASE_URL}/api/errands", json=errand_payload, headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["image_url"] == image_url, f"image_url mismatch: {data.get('image_url')} != {image_url}"
        errand_id = data["id"]
        print(f"Created errand with image: {errand_id}")

        # Verify GET /api/errands returns image_url
        list_res = requests.get(f"{BASE_URL}/api/errands", headers=auth_headers, params={"status": "open"})
        assert list_res.status_code == 200
        errands = list_res.json()
        test_errand = next((e for e in errands if e["id"] == errand_id), None)
        assert test_errand is not None, "Created errand not found in list"
        assert test_errand["image_url"] == image_url, "image_url not in list response"
        print(f"GET /api/errands returns image_url: {test_errand['image_url']}")

        # Verify GET /api/errands/{id} returns image_url  
        get_res = requests.get(f"{BASE_URL}/api/errands/{errand_id}", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["image_url"] == image_url
        print(f"GET /api/errands/{{id}} returns image_url correctly")

    def test_create_errand_without_image(self, auth_headers):
        """Create errand without image_url — image_url should be null"""
        errand_payload = {
            "item_description": "TEST_No Image Errand",
            "pickup_neighborhood": "Riverside",
            "delivery_neighborhood": "Oak Park",
            "delivery_address": "123 Test St",
            "offered_price": 5.00,
        }
        res = requests.post(f"{BASE_URL}/api/errands", json=errand_payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data.get("image_url") is None, f"image_url should be None, got {data.get('image_url')}"
        print("Errand without image has image_url=None correctly")
