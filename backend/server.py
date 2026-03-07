from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-change-me')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

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


manager = ConnectionManager()


# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    neighborhood: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    name: str
    neighborhood: str

class ErrandCreate(BaseModel):
    item_description: str
    item_details: Optional[str] = None
    pickup_neighborhood: str
    delivery_neighborhood: str
    delivery_address: str
    offered_price: float

class OfferCreate(BaseModel):
    proposed_price: float
    message: Optional[str] = None

class MessageCreate(BaseModel):
    content: str

class CheckoutRequest(BaseModel):
    errand_id: str
    origin_url: str

class StatusUpdate(BaseModel):
    status: str


# --- Auth Utilities ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    except JWTError:
        return None


# --- Auth Endpoints ---
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "neighborhood": user_data.neighborhood,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(doc)
    token = create_token(user_id)
    safe_user = {k: v for k, v in doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": safe_user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
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
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if pickup:
        query["pickup_neighborhood"] = {"$regex": pickup, "$options": "i"}
    if delivery:
        query["delivery_neighborhood"] = {"$regex": delivery, "$options": "i"}
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
        "pickup_neighborhood": errand_data.pickup_neighborhood,
        "delivery_neighborhood": errand_data.delivery_neighborhood,
        "delivery_address": errand_data.delivery_address,
        "offered_price": float(errand_data.offered_price),
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
    # Broadcast status change via WebSocket
    await manager.broadcast({"type": "status_update", "status": body.status}, errand_id)
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


# --- Offer Endpoints ---
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
    return {"message": "Offer rejected"}


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

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    checkout_req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "errand_id": body.errand_id,
            "payer_id": current_user["id"],
            "payer_email": current_user["email"],
            "payee_id": errand.get("runner_id", "")
        }
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    tx_doc = {
        "id": str(uuid.uuid4()),
        "errand_id": body.errand_id,
        "payer_id": current_user["id"],
        "payer_email": current_user["email"],
        "payee_id": errand.get("runner_id"),
        "amount": amount,
        "currency": "usd",
        "session_id": session.session_id,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(tx_doc)
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") == "paid":
        return tx
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    try:
        status_resp = await stripe_checkout.get_checkout_status(session_id)
        update = {"payment_status": status_resp.payment_status, "stripe_status": status_resp.status}
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
        if status_resp.payment_status == "paid":
            await db.errands.update_one({"id": tx["errand_id"]}, {"$set": {"status": "in_progress"}})
            await manager.broadcast({"type": "payment_confirmed", "errand_id": tx["errand_id"]}, tx["errand_id"])
        tx.update(update)
    except Exception as e:
        logger.error(f"Stripe status check error: {e}")
    return tx

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_resp = await stripe_checkout.handle_webhook(body, signature)
        if webhook_resp.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": webhook_resp.session_id})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_resp.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                await db.errands.update_one({"id": tx["errand_id"]}, {"$set": {"status": "in_progress"}})
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"received": True}


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


# --- App setup ---
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
