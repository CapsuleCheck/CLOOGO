from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import stripe
import asyncio

# Local modules
from models import (
    UserCreate, UserLogin, UserProfileUpdate, ErrandCreate, OfferCreate,
    CounterOfferCreate, MessageCreate, CheckoutRequest, StatusUpdate,
    RatingCreate, PushSubscriptionCreate, ExpoPushTokenCreate
)
from auth import (
    get_password_hash, verify_password, create_access_token, decode_token,
    JWT_SECRET, JWT_ALGORITHM, security
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY_PATH = ROOT_DIR / os.environ.get('VAPID_PRIVATE_KEY_PATH', 'vapid_private.pem')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:admin@cloogo.app')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


def build_cors_settings():
    """Build CORS config from env. Supports Netlify deploys via origin regex."""
    origins: set[str] = set()

    for part in os.environ.get("CORS_ORIGINS", "").split(","):
        origin = _normalize_origin(part)
        if origin:
            origins.add(origin)

    frontend_url = _normalize_origin(os.environ.get("FRONTEND_URL", ""))
    if frontend_url:
        origins.add(frontend_url)

    if not origins:
        origins.update({
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        })

    regex_env = os.environ.get("CORS_ORIGIN_REGEX")
    if regex_env is None:
        # Match Netlify production + preview URLs by default.
        origin_regex = r"https://([\w-]+\.)*netlify\.app$"
    elif regex_env.strip().lower() in ("", "none", "false", "0"):
        origin_regex = None
    else:
        origin_regex = regex_env.strip()

    allow_credentials = os.environ.get("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    origin_list = sorted(origins)

    if "*" in origin_list:
        return ["*"], None, False

    return origin_list, origin_regex, allow_credentials


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            try:
                self.active_connections[room_id].remove(websocket)
            except ValueError:
                pass

    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            try:
                self.user_connections[user_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, message: dict, room_id: str):
        if room_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[room_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            try:
                self.active_connections[room_id].remove(conn)
            except ValueError:
                pass

    async def notify_user(self, user_id: str, data: dict):
        if user_id not in self.user_connections:
            return
        dead = []
        for conn in self.user_connections[user_id]:
            try:
                await conn.send_json(data)
            except Exception:
                dead.append(conn)
        for c in dead:
            try:
                self.user_connections[user_id].remove(c)
            except ValueError:
                pass


manager = ConnectionManager()


# --- Notification Helper ---
async def create_notification(user_id: str, ntype: str, title: str, body: str, errand_id: str = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "errand_id": errand_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(doc)
    clean = {k: v for k, v in doc.items() if k != "_id"}
    await manager.notify_user(user_id, {"type": "notification", **clean})
    # Also send web push (VAPID) and Expo push notifications
    asyncio.create_task(send_push_notification(user_id, title, body, errand_id))
    asyncio.create_task(send_expo_push(user_id, title, body, errand_id))
    return clean


async def send_push_notification(user_id: str, title: str, body: str, errand_id: str = None):
    """Send web push notification to all subscriptions for a user."""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY_PATH.exists():
        return
    subscriptions = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    if not subscriptions:
        return
    payload = json.dumps({
        "title": title,
        "body": body,
        "errand_id": errand_id,
        "icon": "/icons/icon-192x192.png",
        "badge": "/icons/favicon-32x32.png"
    })
    from pywebpush import webpush, WebPushException
    for sub in subscriptions:
        try:
            await asyncio.get_event_loop().run_in_executor(None, lambda s=sub: webpush(
                subscription_info={
                    "endpoint": s["endpoint"],
                    "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}
                },
                data=payload,
                vapid_private_key=str(VAPID_PRIVATE_KEY_PATH),
                vapid_claims={
                    "sub": VAPID_CLAIMS_EMAIL,
                    "aud": s["endpoint"].split("/")[2] if "/" in s["endpoint"] else s["endpoint"]
                }
            ))
        except WebPushException as e:
            # Subscription expired or invalid — remove it
            if "410" in str(e) or "404" in str(e):
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
            else:
                logger.warning(f"Push failed for {user_id}: {e}")
        except Exception as e:
            logger.warning(f"Push error: {e}")


# --- Auth Helpers (injected into FastAPI dependency) ---

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_user_from_token(token: str):
    try:
        user_id = decode_token(token)
        return await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    except HTTPException:
        return None


# --- Auth Endpoints ---
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "service": "Cloogo API", "timestamp": datetime.now(timezone.utc).isoformat()}


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": user_data.email.lower(),
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "neighborhood": user_data.neighborhood,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id)
    safe_user = {k: v for k, v in doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": safe_user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"])
    safe_user = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": safe_user}

@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user


# --- Errand Endpoints ---
@api_router.get("/errands")
async def list_errands(
    pickup: Optional[str] = None,
    delivery: Optional[str] = None,
    status: Optional[str] = "open",
    category: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if pickup:
        query["pickup_neighborhood"] = {"$regex": pickup, "$options": "i"}
    if delivery:
        query["delivery_neighborhood"] = {"$regex": delivery, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    errands = await db.errands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return errands

@api_router.post("/errands")
async def create_errand(errand_data: ErrandCreate, current_user=Depends(get_current_user)):
    errand_id = str(uuid.uuid4())
    doc = {
        "id": errand_id,
        "poster_id": current_user["id"],
        "poster_name": current_user["name"],
        "poster_neighborhood": current_user["neighborhood"],
        "item_description": errand_data.item_description,
        "item_details": errand_data.item_details,
        "category": errand_data.category,
        "pickup_neighborhood": errand_data.pickup_neighborhood,
        "delivery_neighborhood": errand_data.delivery_neighborhood,
        "delivery_address": errand_data.delivery_address,
        "offered_price": float(errand_data.offered_price),
        "pickup_lat": errand_data.pickup_lat,
        "pickup_lng": errand_data.pickup_lng,
        "delivery_lat": errand_data.delivery_lat,
        "delivery_lng": errand_data.delivery_lng,
        "image_url": errand_data.image_url,
        "status": "open",
        "runner_id": None,
        "runner_name": None,
        "accepted_price": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.errands.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/errands/{errand_id}")
async def get_errand(errand_id: str, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id}, {"_id": 0})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    return errand

@api_router.patch("/errands/{errand_id}/status")
async def update_errand_status(errand_id: str, body: StatusUpdate, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if current_user["id"] not in [errand["poster_id"], errand.get("runner_id")]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.errands.update_one({"id": errand_id}, {"$set": {"status": body.status}})
    updated = await db.errands.find_one({"id": errand_id}, {"_id": 0})
    await manager.broadcast({"type": "status_update", "status": body.status}, errand_id)
    # Send notifications on key status transitions
    if body.status == "completed" and errand.get("poster_id"):
        await create_notification(
            errand["poster_id"], "errand_delivered", "Item delivered!",
            f"'{errand['item_description']}' has been delivered. Please rate your experience.", errand_id
        )
    elif body.status == "in_progress" and errand.get("runner_id"):
        await create_notification(
            errand["runner_id"], "payment_confirmed", "Payment confirmed — start running!",
            f"Payment received for '{errand['item_description']}'. Go pick it up!", errand_id
        )
    return updated

@api_router.delete("/errands/{errand_id}")
async def delete_errand(errand_id: str, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["poster_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if errand["status"] != "open":
        raise HTTPException(status_code=400, detail="Can only cancel open errands")
    await db.errands.update_one({"id": errand_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Errand cancelled"}


# --- Live Tracking Endpoints ---
@api_router.patch("/errands/{errand_id}/runner-location")
async def update_runner_location(errand_id: str, location: dict, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand.get("runner_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the runner can update location")
    await db.errands.update_one(
        {"id": errand_id},
        {"$set": {"runner_location": {
            "lat": float(location["lat"]),
            "lng": float(location["lng"]),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {"status": "ok"}

@api_router.get("/errands/{errand_id}/runner-location") 
async def get_runner_location(errand_id: str, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id}, {"_id": 0})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if current_user["id"] not in [errand.get("poster_id"), errand.get("runner_id")]:
        raise HTTPException(status_code=403, detail="Not authorized")
    loc = errand.get("runner_location")
    return loc if loc else {"lat": None, "lng": None, "updated_at": None}


@api_router.get("/errands/{errand_id}/offers")
async def get_offers(errand_id: str, current_user=Depends(get_current_user)):
    offers = await db.offers.find({"errand_id": errand_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return offers

@api_router.post("/errands/{errand_id}/offers")
async def create_offer(errand_id: str, offer_data: OfferCreate, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["status"] != "open":
        raise HTTPException(status_code=400, detail="Errand is not open for offers")
    if errand["poster_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot offer on your own errand")
    existing = await db.offers.find_one({"errand_id": errand_id, "runner_id": current_user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending offer on this errand")
    offer_id = str(uuid.uuid4())
    doc = {
        "id": offer_id,
        "errand_id": errand_id,
        "runner_id": current_user["id"],
        "runner_name": current_user["name"],
        "runner_neighborhood": current_user["neighborhood"],
        "proposed_price": float(offer_data.proposed_price),
        "message": offer_data.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.offers.insert_one(doc)
    # Broadcast new offer to errand room
    await manager.broadcast({"type": "new_offer", "offer": {k: v for k, v in doc.items() if k != "_id"}}, errand_id)
    # Notify poster
    await create_notification(
        errand["poster_id"], "new_offer", "New offer on your errand",
        f"{current_user['name']} offered ${offer_data.proposed_price:.2f} to run '{errand['item_description']}'",
        errand_id
    )
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.patch("/offers/{offer_id}/accept")
async def accept_offer(offer_id: str, current_user=Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    errand = await db.errands.find_one({"id": offer["errand_id"]})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["poster_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the poster can accept offers")
    if errand["status"] != "open":
        raise HTTPException(status_code=400, detail="Errand is no longer open for offers")
    # Accept this offer, reject others
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": "accepted"}})
    await db.offers.update_many(
        {"errand_id": offer["errand_id"], "id": {"$ne": offer_id}},
        {"$set": {"status": "rejected"}}
    )
    await db.errands.update_one(
        {"id": offer["errand_id"]},
        {"$set": {
            "status": "matched",
            "runner_id": offer["runner_id"],
            "runner_name": offer["runner_name"],
            "accepted_price": offer["proposed_price"]
        }}
    )
    updated = await db.errands.find_one({"id": offer["errand_id"]}, {"_id": 0})
    await manager.broadcast({"type": "offer_accepted", "errand": updated}, offer["errand_id"])
    # Notify runner
    await create_notification(
        offer["runner_id"], "offer_accepted", "Your offer was accepted!",
        f"Your ${offer['proposed_price']:.2f} offer on '{errand['item_description']}' was accepted. Awaiting payment.",
        offer["errand_id"]
    )
    return updated

@api_router.patch("/offers/{offer_id}/reject")
async def reject_offer(offer_id: str, current_user=Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    errand = await db.errands.find_one({"id": offer["errand_id"]})
    if errand["poster_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": "rejected"}})
    # Notify runner of rejection
    await create_notification(
        offer["runner_id"], "offer_rejected", "Your offer was not accepted",
        f"Your ${offer['proposed_price']:.2f} offer on '{errand['item_description']}' was declined. You can resubmit with a different price.",
        offer["errand_id"]
    )
    return {"message": "Offer rejected"}

@api_router.patch("/offers/{offer_id}/counter")
async def counter_offer(offer_id: str, body: CounterOfferCreate, current_user=Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    errand = await db.errands.find_one({"id": offer["errand_id"]})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["poster_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the poster can counter offers")
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only counter pending offers")
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": {
            "status": "countered",
            "counter_price": float(body.counter_price),
            "counter_message": body.counter_message
        }}
    )
    updated = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    await create_notification(
        offer["runner_id"], "offer_countered", "Counter offer received!",
        f"{current_user['name']} countered your offer with ${body.counter_price:.2f} for '{errand['item_description']}'.",
        offer["errand_id"]
    )
    return updated

@api_router.patch("/offers/{offer_id}/accept-counter")
async def accept_counter_offer(offer_id: str, current_user=Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer["runner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the runner can accept a counter offer")
    if offer["status"] != "countered":
        raise HTTPException(status_code=400, detail="No counter offer to accept")
    errand = await db.errands.find_one({"id": offer["errand_id"]})
    if not errand or errand["status"] != "open":
        raise HTTPException(status_code=400, detail="Errand is no longer open")
    # Accept at counter price
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": "accepted"}})
    await db.offers.update_many(
        {"errand_id": offer["errand_id"], "id": {"$ne": offer_id}},
        {"$set": {"status": "rejected"}}
    )
    counter_price = offer.get("counter_price", offer["proposed_price"])
    await db.errands.update_one(
        {"id": offer["errand_id"]},
        {"$set": {
            "status": "matched",
            "runner_id": offer["runner_id"],
            "runner_name": offer["runner_name"],
            "accepted_price": counter_price
        }}
    )
    updated = await db.errands.find_one({"id": offer["errand_id"]}, {"_id": 0})
    await manager.broadcast({"type": "offer_accepted", "errand": updated}, offer["errand_id"])
    await create_notification(
        errand["poster_id"], "offer_accepted", "Counter offer accepted!",
        f"{offer['runner_name']} accepted your ${counter_price:.2f} counter offer on '{errand['item_description']}'.",
        offer["errand_id"]
    )
    return updated


# --- Message Endpoints ---
@api_router.get("/errands/{errand_id}/messages")
async def get_messages(errand_id: str, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if current_user["id"] not in [errand["poster_id"], errand.get("runner_id")]:
        raise HTTPException(status_code=403, detail="Not authorized to view chat")
    messages = await db.messages.find({"errand_id": errand_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return messages

@api_router.post("/errands/{errand_id}/messages")
async def send_message(errand_id: str, msg_data: MessageCreate, current_user=Depends(get_current_user)):
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if current_user["id"] not in [errand["poster_id"], errand.get("runner_id")]:
        raise HTTPException(status_code=403, detail="Not authorized")
    msg_id = str(uuid.uuid4())
    doc = {
        "id": msg_id,
        "errand_id": errand_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "content": msg_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(doc)
    clean = {k: v for k, v in doc.items() if k != "_id"}
    await manager.broadcast({"type": "message", **clean}, errand_id)
    return clean


# --- WebSocket Endpoint ---
@api_router.websocket("/ws/{errand_id}")
async def websocket_endpoint(websocket: WebSocket, errand_id: str, token: str = None):
    if not token:
        await websocket.close(code=4001)
        return
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        await websocket.close(code=4004)
        return
    if user["id"] not in [errand["poster_id"], errand.get("runner_id")]:
        await websocket.close(code=4003)
        return
    await manager.connect(websocket, errand_id)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive, ignore client sends
    except WebSocketDisconnect:
        manager.disconnect(websocket, errand_id)


# --- My Errands / My Runs ---
@api_router.get("/my/errands")
async def my_errands(current_user=Depends(get_current_user)):
    errands = await db.errands.find({"poster_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return errands

@api_router.get("/my/runs")
async def my_runs(current_user=Depends(get_current_user)):
    errands = await db.errands.find({"runner_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return errands

@api_router.get("/my/stats")
async def my_stats(current_user=Depends(get_current_user)):
    posted = await db.errands.count_documents({"poster_id": current_user["id"]})
    runs_completed = await db.errands.count_documents({"runner_id": current_user["id"], "status": "completed"})
    active_runs = await db.errands.count_documents({"runner_id": current_user["id"], "status": {"$in": ["matched", "in_progress"]}})
    return {"errands_posted": posted, "runs_completed": runs_completed, "active_runs": active_runs}

@api_router.get("/my/earnings")
async def my_earnings(current_user=Depends(get_current_user)):
    """Returns completed runs with accepted_price and payout summary."""
    completed = await db.errands.find(
        {"runner_id": current_user["id"], "status": "completed"},
        {"_id": 0, "id": 1, "item_description": 1, "accepted_price": 1, "offered_price": 1,
         "poster_name": 1, "created_at": 1, "delivery_neighborhood": 1}
    ).sort("created_at", -1).to_list(200)
    total = sum(float(e.get("accepted_price") or e.get("offered_price") or 0) for e in completed)
    # Pending payout = in_progress runs (paid but not yet delivered)
    in_progress = await db.errands.find(
        {"runner_id": current_user["id"], "status": "in_progress"},
        {"_id": 0, "id": 1, "item_description": 1, "accepted_price": 1, "offered_price": 1, "delivery_neighborhood": 1}
    ).sort("created_at", -1).to_list(50)
    pending = sum(float(e.get("accepted_price") or e.get("offered_price") or 0) for e in in_progress)
    return {
        "total_earned": round(total, 2),
        "pending_payout": round(pending, 2),
        "completed_runs": completed,
        "in_progress_runs": in_progress
    }


# --- Payment Endpoints ---
@api_router.post("/payments/checkout")
async def create_checkout(request: Request, body: CheckoutRequest, current_user=Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    errand = await db.errands.find_one({"id": body.errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["poster_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the poster can initiate payment")
    if errand["status"] != "matched":
        raise HTTPException(status_code=400, detail="Errand must be matched before payment")
    existing = await db.payment_transactions.find_one({"errand_id": body.errand_id, "payment_status": "paid"})
    if existing:
        raise HTTPException(status_code=400, detail="Payment already completed for this errand")

    amount = float(errand.get("accepted_price") or errand["offered_price"])
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    success_url = f"{body.origin_url}/errands/{body.errand_id}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/errands/{body.errand_id}"

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(amount * 100)),
                "product_data": {"name": errand.get("item_description", "Errand payment")},
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "errand_id": body.errand_id,
            "payer_id": current_user["id"],
            "payer_email": current_user["email"],
            "payee_id": errand.get("runner_id", ""),
        },
    )

    tx_doc = {
        "id": str(uuid.uuid4()),
        "errand_id": body.errand_id,
        "payer_id": current_user["id"],
        "payer_email": current_user["email"],
        "payee_id": errand.get("runner_id"),
        "amount": amount,
        "currency": "usd",
        "session_id": session.id,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(tx_doc)
    return {"url": session.url, "session_id": session.id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") == "paid":
        return tx
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        update = {"payment_status": session.payment_status, "stripe_status": session.status}
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
        if session.payment_status == "paid":
            await db.errands.update_one({"id": tx["errand_id"]}, {"$set": {"status": "in_progress"}})
            await manager.broadcast({"type": "payment_confirmed", "errand_id": tx["errand_id"]}, tx["errand_id"])
            errand_for_notif = await db.errands.find_one({"id": tx["errand_id"]})
            if errand_for_notif and errand_for_notif.get("runner_id"):
                await create_notification(
                    errand_for_notif["runner_id"], "payment_confirmed", "Payment received!",
                    f"${tx['amount']:.2f} confirmed for '{errand_for_notif['item_description']}'. Go pick it up!",
                    tx["errand_id"]
                )
        tx.update(update)
    except Exception as e:
        logger.error(f"Stripe status check error: {e}")
    return tx

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    try:
        if STRIPE_WEBHOOK_SECRET and signature:
            event = stripe.Webhook.construct_event(body, signature, STRIPE_WEBHOOK_SECRET)
        else:
            event = json.loads(body)
        if event.get("type") == "checkout.session.completed":
            sess = event["data"]["object"]
            session_id = sess["id"]
            if sess.get("payment_status") == "paid":
                tx = await db.payment_transactions.find_one({"session_id": session_id})
                if tx and tx.get("payment_status") != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"payment_status": "paid"}}
                    )
                    await db.errands.update_one({"id": tx["errand_id"]}, {"$set": {"status": "in_progress"}})
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"received": True}


# --- Notification WebSocket ---
@api_router.websocket("/ws/notifications")
async def notification_websocket(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=4001)
        return
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return
    await manager.connect_user(websocket, user["id"])
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user["id"])


# --- Notification Endpoints ---
@api_router.get("/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifs

@api_router.patch("/notifications/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All marked as read"}

@api_router.patch("/notifications/{notif_id}/read")
async def mark_one_read(notif_id: str, current_user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}


# --- Push Notification Endpoints ---
@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def subscribe_push(body: PushSubscriptionCreate, current_user=Depends(get_current_user)):
    # Upsert subscription (update if endpoint exists, insert if not)
    await db.push_subscriptions.update_one(
        {"user_id": current_user["id"], "endpoint": body.endpoint},
        {"$set": {
            "user_id": current_user["id"],
            "endpoint": body.endpoint,
            "p256dh": body.p256dh,
            "auth": body.auth,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Subscribed to push notifications"}

@api_router.delete("/push/subscribe")
async def unsubscribe_push(body: PushSubscriptionCreate, current_user=Depends(get_current_user)):
    await db.push_subscriptions.delete_one(
        {"user_id": current_user["id"], "endpoint": body.endpoint}
    )
    return {"message": "Unsubscribed"}


# --- Expo Push Token Endpoints ---
@api_router.post("/push/expo-token")
async def register_expo_token(body: ExpoPushTokenCreate, current_user=Depends(get_current_user)):
    await db.expo_push_tokens.update_one(
        {"user_id": current_user["id"], "token": body.token},
        {"$set": {"user_id": current_user["id"], "token": body.token,
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Expo push token registered"}

@api_router.delete("/push/expo-token")
async def remove_expo_token(body: ExpoPushTokenCreate, current_user=Depends(get_current_user)):
    await db.expo_push_tokens.delete_one({"user_id": current_user["id"], "token": body.token})
    return {"message": "Expo push token removed"}


async def send_expo_push(user_id: str, title: str, body_text: str, errand_id: str = None):
    """Send Expo push notification to all registered tokens for a user."""
    tokens = await db.expo_push_tokens.find({"user_id": user_id}, {"_id": 0}).to_list(5)
    if not tokens:
        return
    messages = [{
        "to": t["token"],
        "title": title,
        "body": body_text,
        "data": {"errand_id": errand_id},
        "sound": "default",
    } for t in tokens]
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=10,
            )
    except Exception as e:
        logger.warning(f"Expo push failed: {e}")


# --- Rating Endpoints ---
@api_router.post("/errands/{errand_id}/rate")
async def rate_errand(errand_id: str, rating_data: RatingCreate, current_user=Depends(get_current_user)):
    if not (1 <= rating_data.stars <= 5):
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")
    errand = await db.errands.find_one({"id": errand_id})
    if not errand:
        raise HTTPException(status_code=404, detail="Errand not found")
    if errand["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed errands")
    if current_user["id"] not in [errand["poster_id"], errand.get("runner_id")]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if await db.ratings.find_one({"errand_id": errand_id, "rater_id": current_user["id"]}):
        raise HTTPException(status_code=400, detail="You have already rated this errand")
    ratee_id = errand["runner_id"] if current_user["id"] == errand["poster_id"] else errand["poster_id"]
    doc = {
        "id": str(uuid.uuid4()),
        "errand_id": errand_id,
        "rater_id": current_user["id"],
        "rater_name": current_user["name"],
        "ratee_id": ratee_id,
        "stars": rating_data.stars,
        "comment": rating_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ratings.insert_one(doc)
    await create_notification(
        ratee_id, "new_rating", "You received a new rating!",
        f"{current_user['name']} gave you {rating_data.stars} star(s) for '{errand['item_description']}'",
        errand_id
    )
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/errands/{errand_id}/my-rating")
async def get_my_rating(errand_id: str, current_user=Depends(get_current_user)):
    rating = await db.ratings.find_one({"errand_id": errand_id, "rater_id": current_user["id"]}, {"_id": 0})
    return {"rated": rating is not None, "rating": rating}

@api_router.get("/users/{user_id}/rating")
async def get_user_rating(user_id: str, current_user=Depends(get_current_user)):
    ratings = await db.ratings.find({"ratee_id": user_id}, {"_id": 0}).to_list(200)
    if not ratings:
        return {"average": None, "count": 0}
    avg = sum(r["stars"] for r in ratings) / len(ratings)
    return {"average": round(avg, 1), "count": len(ratings)}


# --- Image Upload ---
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    with open(str(filepath), "wb") as f:
        f.write(content)
    return {"url": f"/api/images/{filename}", "filename": filename}

@api_router.get("/images/{filename}")
async def serve_image(filename: str):
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(filepath))


# --- Profile ---
@api_router.get("/users/profile")
async def get_profile(current_user=Depends(get_current_user)):
    return current_user

@api_router.patch("/users/profile")
async def update_profile(data: UserProfileUpdate, current_user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"name": data.name, "neighborhood": data.neighborhood}}
    )
    return await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})

@api_router.delete("/users/me")
async def delete_account(current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    # Remove user's data across all collections
    await db.users.delete_one({"id": user_id})
    await db.errands.delete_many({"owner_id": user_id})
    await db.offers.delete_many({"runner_id": user_id})
    await db.messages.delete_many({"sender_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.push_subscriptions.delete_many({"user_id": user_id})
    await db.expo_push_tokens.delete_many({"user_id": user_id})
    return {"message": "Account deleted successfully"}


# --- App setup ---
app.include_router(api_router)

# CORS must be the outermost middleware (added last).
cors_origins, cors_origin_regex, cors_allow_credentials = build_cors_settings()
logger.info(
    "CORS allow_origins=%s allow_origin_regex=%s allow_credentials=%s",
    cors_origins,
    cors_origin_regex,
    cors_allow_credentials,
)

cors_kwargs = {
    "allow_credentials": cors_allow_credentials,
    "allow_origins": cors_origins,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if cors_origin_regex:
    cors_kwargs["allow_origin_regex"] = cors_origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
