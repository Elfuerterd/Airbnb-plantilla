from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, Body
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
import httpx
from bson import ObjectId

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@staybnb.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# PayPal Configuration (sandbox)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')

app = FastAPI(title="StayBnB API")
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "guest"  # guest or host

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    created_at: datetime

class PropertyCreate(BaseModel):
    title: str
    description: str
    property_type: str  # apartment, house, villa, cabin, etc.
    price_per_night: float
    location: str
    city: str
    country: str
    max_guests: int = 2
    bedrooms: int = 1
    bathrooms: int = 1
    amenities: List[str] = []
    images: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[str] = None
    price_per_night: Optional[float] = None
    location: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    max_guests: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None

class BookingCreate(BaseModel):
    property_id: str
    check_in: datetime
    check_out: datetime
    guests: int = 1
    payment_method: str = "stripe"  # stripe or paypal

class ReviewCreate(BaseModel):
    property_id: str
    booking_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str

class PaymentRequest(BaseModel):
    booking_id: str
    amount: float
    payment_method: str = "stripe"
    origin_url: str

# ============== PASSWORD HELPERS ==============

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ============== JWT HELPERS ==============

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ============== BRUTE FORCE PROTECTION ==============

async def check_brute_force(identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt:
        if attempt.get("locked_until"):
            locked_until = attempt["locked_until"]
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
        if attempt.get("attempts", 0) >= 5:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}}
            )
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

async def record_failed_attempt(identifier: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"attempts": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

async def clear_failed_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(response: Response, user_data: UserCreate):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": email,
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "created_at": user_doc["created_at"]
    }

@api_router.post("/auth/login")
async def login(response: Response, request: Request, credentials: UserLogin):
    email = credentials.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    await check_brute_force(identifier)
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        await record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await clear_failed_attempts(identifier)
    
    access_token = create_access_token(user["id"], email)
    refresh_token = create_refresh_token(user["id"])
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "picture": user.get("picture"),
        "created_at": user["created_at"]
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(user["id"], user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== GOOGLE OAUTH ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response, session_id: str = Body(..., embed=True)):
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = resp.json()
        email = data["email"].lower()
        
        # Check if user exists
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "id": user_id,
                "email": email,
                "name": data.get("name", email.split("@")[0]),
                "picture": data.get("picture"),
                "role": "guest",
                "password_hash": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            user = user_doc
        else:
            # Update picture if changed
            if data.get("picture") and user.get("picture") != data.get("picture"):
                await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture")}})
                user["picture"] = data.get("picture")
        
        # Store session
        session_token = data.get("session_token", secrets.token_urlsafe(32))
        await db.user_sessions.insert_one({
            "user_id": user["id"],
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        access_token = create_access_token(user["id"], email)
        refresh_token = create_refresh_token(user["id"])
        
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        response.set_cookie(key="session_token", value=session_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "picture": user.get("picture"),
            "created_at": user["created_at"]
        }

# ============== PROPERTY ROUTES ==============

@api_router.post("/properties")
async def create_property(property_data: PropertyCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can create properties")
    
    property_id = f"prop_{uuid.uuid4().hex[:12]}"
    property_doc = {
        "id": property_id,
        "host_id": user["id"],
        "host_name": user["name"],
        **property_data.model_dump(),
        "rating": 0,
        "review_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.properties.insert_one(property_doc)
    property_doc.pop("_id", None)
    return property_doc

@api_router.get("/properties")
async def get_properties(
    city: Optional[str] = None,
    country: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    guests: Optional[int] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = {"is_active": True}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if property_type:
        query["property_type"] = property_type
    if min_price is not None:
        query["price_per_night"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price_per_night", {})["$lte"] = max_price
    if guests:
        query["max_guests"] = {"$gte": guests}
    
    skip = (page - 1) * limit
    properties = await db.properties.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.properties.count_documents(query)
    
    return {"properties": properties, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/properties/featured")
async def get_featured_properties():
    properties = await db.properties.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("rating", -1).limit(8).to_list(8)
    return properties

@api_router.get("/properties/{property_id}")
async def get_property(property_id: str):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_doc

@api_router.put("/properties/{property_id}")
async def update_property(property_id: str, property_data: PropertyUpdate, user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    if property_doc["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in property_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return updated

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    if property_doc["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.properties.update_one({"id": property_id}, {"$set": {"is_active": False}})
    return {"message": "Property deleted"}

@api_router.get("/host/properties")
async def get_host_properties(user: dict = Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can access this")
    properties = await db.properties.find({"host_id": user["id"]}, {"_id": 0}).to_list(100)
    return properties

# ============== BOOKING ROUTES ==============

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": booking_data.property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Calculate nights and total
    check_in = booking_data.check_in
    check_out = booking_data.check_out
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    
    nights = (check_out - check_in).days
    subtotal = nights * property_doc["price_per_night"]
    service_fee = subtotal * 0.12
    total = subtotal + service_fee
    
    # Check availability
    existing = await db.bookings.find_one({
        "property_id": booking_data.property_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"check_in": {"$lt": check_out.isoformat()}, "check_out": {"$gt": check_in.isoformat()}}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Property not available for these dates")
    
    booking_id = f"book_{uuid.uuid4().hex[:12]}"
    booking_doc = {
        "id": booking_id,
        "property_id": booking_data.property_id,
        "property_title": property_doc["title"],
        "property_image": property_doc["images"][0] if property_doc["images"] else None,
        "guest_id": user["id"],
        "guest_name": user["name"],
        "host_id": property_doc["host_id"],
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": booking_data.guests,
        "nights": nights,
        "price_per_night": property_doc["price_per_night"],
        "subtotal": subtotal,
        "service_fee": service_fee,
        "total": total,
        "status": "pending",
        "payment_status": "pending",
        "payment_method": booking_data.payment_method,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)
    booking_doc.pop("_id", None)
    return booking_doc

@api_router.get("/bookings")
async def get_user_bookings(user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"guest_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["guest_id"] != user["id"] and booking["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return booking

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["guest_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking["status"] not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Booking cancelled"}

@api_router.get("/host/bookings")
async def get_host_bookings(user: dict = Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can access this")
    bookings = await db.bookings.find({"host_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookings

@api_router.post("/host/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed"}})
    return {"message": "Booking confirmed"}

# ============== REVIEW ROUTES ==============

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": review_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["guest_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    existing_review = await db.reviews.find_one({"booking_id": review_data.booking_id})
    if existing_review:
        raise HTTPException(status_code=400, detail="Already reviewed this booking")
    
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "id": review_id,
        "property_id": review_data.property_id,
        "booking_id": review_data.booking_id,
        "guest_id": user["id"],
        "guest_name": user["name"],
        "guest_picture": user.get("picture"),
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update property rating
    reviews = await db.reviews.find({"property_id": review_data.property_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.properties.update_one(
        {"id": review_data.property_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    review_doc.pop("_id", None)
    return review_doc

@api_router.get("/reviews/property/{property_id}")
async def get_property_reviews(property_id: str):
    reviews = await db.reviews.find({"property_id": property_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

# ============== FAVORITES ROUTES ==============

@api_router.post("/favorites/{property_id}")
async def add_favorite(property_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "property_id": property_id})
    if existing:
        return {"message": "Already in favorites"}
    
    await db.favorites.insert_one({
        "user_id": user["id"],
        "property_id": property_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{property_id}")
async def remove_favorite(property_id: str, user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["id"], "property_id": property_id})
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    property_ids = [f["property_id"] for f in favorites]
    properties = await db.properties.find({"id": {"$in": property_ids}}, {"_id": 0}).to_list(100)
    return properties

# ============== PAYMENT ROUTES (STRIPE) ==============

@api_router.post("/payments/stripe/create-session")
async def create_stripe_session(request: Request, payment_data: PaymentRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    booking = await db.bookings.find_one({"id": payment_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["guest_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{payment_data.origin_url}/booking-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payment_data.origin_url}/bookings"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking["total"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": payment_data.booking_id,
            "user_id": user["id"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": f"pay_{uuid.uuid4().hex[:12]}",
        "booking_id": payment_data.booking_id,
        "user_id": user["id"],
        "session_id": session.session_id,
        "amount": float(booking["total"]),
        "currency": "usd",
        "payment_method": "stripe",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment and booking status
    if status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if payment:
            await db.bookings.update_one(
                {"id": payment["booking_id"]},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
        
        if webhook_response.payment_status == "paid":
            booking_id = webhook_response.metadata.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"payment_status": "paid", "status": "confirmed"}}
                )
                await db.payment_transactions.update_one(
                    {"booking_id": booking_id},
                    {"$set": {"payment_status": "paid"}}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error"}

# ============== PAYMENT ROUTES (PAYPAL) ==============

@api_router.post("/payments/paypal/create-order")
async def create_paypal_order(payment_data: PaymentRequest, user: dict = Depends(get_current_user)):
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(status_code=400, detail="PayPal not configured")
    
    booking = await db.bookings.find_one({"id": payment_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["guest_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get PayPal access token
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.post(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            data={"grant_type": "client_credentials"}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=500, detail="PayPal authentication failed")
        
        access_token = auth_response.json()["access_token"]
        
        # Create order
        order_response = await http_client.post(
            "https://api-m.sandbox.paypal.com/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": payment_data.booking_id,
                    "amount": {
                        "currency_code": "USD",
                        "value": f"{booking['total']:.2f}"
                    }
                }]
            }
        )
        
        if order_response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to create PayPal order")
        
        order_data = order_response.json()
        
        # Create payment transaction record
        await db.payment_transactions.insert_one({
            "id": f"pay_{uuid.uuid4().hex[:12]}",
            "booking_id": payment_data.booking_id,
            "user_id": user["id"],
            "order_id": order_data["id"],
            "amount": float(booking["total"]),
            "currency": "usd",
            "payment_method": "paypal",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"order_id": order_data["id"]}

@api_router.post("/payments/paypal/capture/{order_id}")
async def capture_paypal_order(order_id: str, user: dict = Depends(get_current_user)):
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(status_code=400, detail="PayPal not configured")
    
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.post(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            data={"grant_type": "client_credentials"}
        )
        access_token = auth_response.json()["access_token"]
        
        capture_response = await http_client.post(
            f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if capture_response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to capture PayPal payment")
        
        capture_data = capture_response.json()
        
        # Update payment and booking
        payment = await db.payment_transactions.find_one({"order_id": order_id}, {"_id": 0})
        if payment and capture_data.get("status") == "COMPLETED":
            await db.payment_transactions.update_one(
                {"order_id": order_id},
                {"$set": {"payment_status": "paid"}}
            )
            await db.bookings.update_one(
                {"id": payment["booking_id"]},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )
        
        return capture_data

# ============== AVAILABILITY ROUTES ==============

@api_router.get("/properties/{property_id}/availability")
async def get_property_availability(property_id: str, month: Optional[int] = None, year: Optional[int] = None):
    now = datetime.now(timezone.utc)
    month = month or now.month
    year = year or now.year
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    bookings = await db.bookings.find({
        "property_id": property_id,
        "status": {"$in": ["pending", "confirmed"]},
        "check_in": {"$lt": end_date.isoformat()},
        "check_out": {"$gt": start_date.isoformat()}
    }, {"_id": 0, "check_in": 1, "check_out": 1}).to_list(100)
    
    booked_dates = []
    for booking in bookings:
        check_in = datetime.fromisoformat(booking["check_in"].replace("Z", "+00:00"))
        check_out = datetime.fromisoformat(booking["check_out"].replace("Z", "+00:00"))
        current = check_in
        while current < check_out:
            booked_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
    
    return {"booked_dates": booked_dates}

# ============== STATS ROUTES ==============

@api_router.get("/host/stats")
async def get_host_stats(user: dict = Depends(get_current_user)):
    if user["role"] != "host":
        raise HTTPException(status_code=403, detail="Only hosts can access this")
    
    properties = await db.properties.count_documents({"host_id": user["id"], "is_active": True})
    total_bookings = await db.bookings.count_documents({"host_id": user["id"]})
    confirmed_bookings = await db.bookings.count_documents({"host_id": user["id"], "status": "confirmed"})
    
    # Calculate total earnings
    paid_bookings = await db.bookings.find(
        {"host_id": user["id"], "payment_status": "paid"},
        {"_id": 0, "total": 1}
    ).to_list(1000)
    total_earnings = sum(b["total"] for b in paid_bookings)
    
    return {
        "properties": properties,
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed_bookings,
        "total_earnings": total_earnings
    }

# ============== SEED DATA ==============

async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "id": user_id,
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "host",
            "picture": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {ADMIN_EMAIL}")
    
    # Seed sample properties if none exist
    property_count = await db.properties.count_documents({})
    if property_count == 0:
        admin = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
        sample_properties = [
            {
                "id": f"prop_{uuid.uuid4().hex[:12]}",
                "host_id": admin["id"],
                "host_name": admin["name"],
                "title": "Luxury Mediterranean Villa",
                "description": "Experience the ultimate getaway in this stunning Mediterranean villa with breathtaking sea views, private pool, and modern amenities.",
                "property_type": "villa",
                "price_per_night": 350.0,
                "location": "Costa Brava",
                "city": "Barcelona",
                "country": "Spain",
                "max_guests": 8,
                "bedrooms": 4,
                "bathrooms": 3,
                "amenities": ["wifi", "pool", "kitchen", "parking", "air_conditioning", "sea_view"],
                "images": [
                    "https://static.prod-images.emergentagent.com/jobs/0dccd7bd-a53a-4539-920a-e903c0f78411/images/78f5db4031d9acce99ee3acf6f974d5d076abdf97218a4d4be0b8746a786a33a.png"
                ],
                "rating": 4.9,
                "review_count": 128,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": f"prop_{uuid.uuid4().hex[:12]}",
                "host_id": admin["id"],
                "host_name": admin["name"],
                "title": "Scandinavian Treehouse Retreat",
                "description": "Escape to nature in this unique treehouse nestled in the Swedish forest. Perfect for a romantic getaway or solo adventure.",
                "property_type": "cabin",
                "price_per_night": 180.0,
                "location": "Dalarna Forest",
                "city": "Stockholm",
                "country": "Sweden",
                "max_guests": 2,
                "bedrooms": 1,
                "bathrooms": 1,
                "amenities": ["wifi", "heating", "kitchen", "nature_view"],
                "images": [
                    "https://static.prod-images.emergentagent.com/jobs/0dccd7bd-a53a-4539-920a-e903c0f78411/images/e9ec01df7337decb3638037102006498af09b6e1edce90d32529e9c8441077d4.png"
                ],
                "rating": 4.8,
                "review_count": 95,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": f"prop_{uuid.uuid4().hex[:12]}",
                "host_id": admin["id"],
                "host_name": admin["name"],
                "title": "Modern Cozy Cabin",
                "description": "A beautifully designed cabin with modern amenities surrounded by nature. Perfect for a peaceful retreat.",
                "property_type": "cabin",
                "price_per_night": 150.0,
                "location": "Mountain View",
                "city": "Denver",
                "country": "USA",
                "max_guests": 4,
                "bedrooms": 2,
                "bathrooms": 1,
                "amenities": ["wifi", "fireplace", "kitchen", "parking", "mountain_view"],
                "images": [
                    "https://images.unsplash.com/photo-1768578927442-24a68408c0c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBjb3p5JTIwY2FiaW4lMjBpbnRlcmlvciUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3NzYyNzY4Nzd8MA&ixlib=rb-4.1.0&q=85"
                ],
                "rating": 4.7,
                "review_count": 73,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": f"prop_{uuid.uuid4().hex[:12]}",
                "host_id": admin["id"],
                "host_name": admin["name"],
                "title": "Tropical Beach Villa",
                "description": "Wake up to the sound of waves in this luxurious beachfront villa. Direct beach access and stunning sunset views.",
                "property_type": "villa",
                "price_per_night": 420.0,
                "location": "Beachfront",
                "city": "Cancun",
                "country": "Mexico",
                "max_guests": 6,
                "bedrooms": 3,
                "bathrooms": 2,
                "amenities": ["wifi", "pool", "kitchen", "beach_access", "air_conditioning"],
                "images": [
                    "https://images.unsplash.com/photo-1759372945658-1e9f56e751bd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBiZWFjaCUyMHZpbGxhJTIwZXh0ZXJpb3J8ZW58MHx8fHwxNzc2Mjc2ODc3fDA&ixlib=rb-4.1.0&q=85"
                ],
                "rating": 4.9,
                "review_count": 156,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.properties.insert_many(sample_properties)
        logger.info("Sample properties seeded")

# ============== STARTUP ==============

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.properties.create_index("id", unique=True)
    await db.properties.create_index("host_id")
    await db.properties.create_index("city")
    await db.bookings.create_index("id", unique=True)
    await db.bookings.create_index("guest_id")
    await db.bookings.create_index("host_id")
    await db.reviews.create_index("property_id")
    await db.favorites.create_index([("user_id", 1), ("property_id", 1)], unique=True)
    await db.login_attempts.create_index("identifier")
    await db.payment_transactions.create_index("session_id")
    await db.payment_transactions.create_index("order_id")
    
    await seed_admin()
    
    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin/Host Account\n")
        f.write(f"- Email: {ADMIN_EMAIL}\n")
        f.write(f"- Password: {ADMIN_PASSWORD}\n")
        f.write(f"- Role: host\n\n")
        f.write(f"## Auth Endpoints\n")
        f.write(f"- POST /api/auth/register\n")
        f.write(f"- POST /api/auth/login\n")
        f.write(f"- POST /api/auth/logout\n")
        f.write(f"- GET /api/auth/me\n")
        f.write(f"- POST /api/auth/session (Google OAuth)\n")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
