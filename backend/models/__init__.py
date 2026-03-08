"""Pydantic schemas for ErrandGo API."""
from pydantic import BaseModel, Field
from typing import Optional, List


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
    category: Optional[str] = None
    pickup_neighborhood: str
    delivery_neighborhood: str
    delivery_address: str
    offered_price: float
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    image_url: Optional[str] = None


class OfferCreate(BaseModel):
    proposed_price: float
    message: Optional[str] = None


class CounterOfferCreate(BaseModel):
    counter_price: float
    counter_message: Optional[str] = None


class MessageCreate(BaseModel):
    content: str


class CheckoutRequest(BaseModel):
    errand_id: str
    origin_url: str


class StatusUpdate(BaseModel):
    status: str


class RatingCreate(BaseModel):
    stars: int
    comment: Optional[str] = None


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

class ExpoPushTokenCreate(BaseModel):
    token: str
