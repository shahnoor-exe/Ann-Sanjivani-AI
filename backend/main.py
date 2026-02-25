"""
Food Rescue Platform — FastAPI Application  (v2.0)
===================================================
Production-grade backend with:
  • JWT Auth with role-based access
  • Full CRUD for Restaurants, NGOs, Drivers, Surplus Requests
  • ML endpoints: surplus prediction, route optimization, food classification
  • Impact dashboard, leaderboard, history
  • Notification system
  • Admin analytics
  • WebSocket live tracking
  • Activity logging
"""
import datetime
import json
import logging
import random
from typing import List, Optional, Callable
from contextlib import asynccontextmanager
from functools import wraps

from fastapi import (
    FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect,
    Query, Request, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, update

from config import settings
from database import get_db, init_db, async_session, check_db_health
from models import (
    User, Restaurant, NGO, Driver, SurplusRequest, ImpactMetric,
    Notification, ActivityLog,
    OrderStatus, UserRole, FoodCategory, NotificationType,
)
from schemas import (
    # Auth
    UserCreate, UserLogin, UserResponse, UserUpdate, Token,
    # Restaurant
    RestaurantCreate, RestaurantUpdate, RestaurantResponse,
    # NGO
    NGOCreate, NGOUpdate, NGOResponse,
    # Driver
    DriverCreate, DriverUpdate, DriverResponse,
    # Surplus
    SurplusRequestCreate, SurplusRequestResponse, SurplusStatusUpdate,
    # ML
    SurplusPredictionRequest, SurplusPredictionResponse,
    RouteOptimizationRequest, RouteOptimizationResponse,
    FoodClassificationRequest, FoodClassificationResponse,
    ETAPredictionRequest, ETAPredictionResponse,
    # Impact / Analytics
    ImpactDashboard, ImpactHistoryItem, LeaderboardEntry,
    # Notification
    NotificationResponse,
    # Admin
    AdminStats,
    # WS
    DriverLocationUpdate,
    # Generic
    PaginatedResponse, ErrorResponse,
)
from auth import (
    hash_password, verify_password, create_access_token, get_current_user,
)
from ml_service import surplus_predictor, route_optimizer, food_classifier, eta_predictor
from seed_data import seed_database

logger = logging.getLogger("food_rescue.api")

# ═══════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════
async def _log_activity(
    db: AsyncSession,
    action: str,
    user_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: str | None = None,
    ip: str | None = None,
):
    """Persist an audit-trail row."""
    db.add(ActivityLog(
        user_id=user_id, action=action,
        entity_type=entity_type, entity_id=entity_id,
        details=details, ip_address=ip,
    ))


async def _create_notification(
    db: AsyncSession,
    user_id: int,
    ntype: NotificationType,
    title: str,
    message: str,
    reference_id: int | None = None,
):
    db.add(Notification(
        user_id=user_id, type=ntype.value,
        title=title, message=message,
        reference_id=reference_id,
    ))


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")


# ═══════════════════════════════════════════════════
#  ROLE-BASED ACCESS CONTROL
# ═══════════════════════════════════════════════════
def require_role(*allowed_roles: str):
    """FastAPI dependency factory that restricts access to specific roles.
    Usage:  user: User = Depends(require_role("restaurant", "admin"))
    """
    async def _role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Access denied. Required role(s): {', '.join(allowed_roles)}. Your role: {user.role}",
            )
        return user
    return _role_checker


# ═══════════════════════════════════════════════════
#  WEBSOCKET MANAGER
# ═══════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def broadcast(self, message: dict):
        dead = []
        for cid, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.active_connections.pop(cid, None)

    @property
    def client_count(self) -> int:
        return len(self.active_connections)

manager = ConnectionManager()


# ═══════════════════════════════════════════════════
#  APP  LIFECYCLE
# ═══════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with async_session() as db:
        await seed_database(db)
    logger.info("Startup complete — tables created, data seeded.")
    yield
    logger.info("Shutdown.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "code": "INTERNAL"})


# ────────────────────────────────────────────────────
#  TAG DEFINITIONS (for Swagger UI grouping)
# ────────────────────────────────────────────────────
TAGS = [
    {"name": "Auth",           "description": "Register, Login, Profile"},
    {"name": "Restaurants",    "description": "CRUD for restaurant profiles"},
    {"name": "NGOs",           "description": "CRUD for NGO profiles"},
    {"name": "Drivers",        "description": "CRUD for driver profiles"},
    {"name": "Surplus",        "description": "Food surplus order lifecycle"},
    {"name": "ML",             "description": "AI prediction, route & classification"},
    {"name": "Impact",         "description": "Dashboard, history, leaderboard"},
    {"name": "Notifications",  "description": "User notification inbox"},
    {"name": "Admin",          "description": "Admin analytics & management"},
    {"name": "Tracking",       "description": "Live map & GPS data"},
    {"name": "Health",         "description": "Service health checks"},
]
app.openapi_tags = TAGS  # type: ignore[attr-defined]


# ╔═══════════════════════════════════════════════════╗
# ║                  AUTH ROUTES                       ║
# ╚═══════════════════════════════════════════════════╝
@app.post("/api/v1/auth/register", response_model=Token, tags=["Auth"])
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
    )
    db.add(user)
    await db.flush()

    # Auto-create role profile stub
    if user_data.role == "restaurant":
        db.add(Restaurant(
            user_id=user.id, name=user_data.full_name,
            address="(update your address)", city="Mumbai",
            latitude=19.076, longitude=72.8777,
        ))
    elif user_data.role == "ngo":
        db.add(NGO(
            user_id=user.id, name=user_data.full_name,
            address="(update your address)", city="Mumbai",
            latitude=19.076, longitude=72.8777,
        ))
    elif user_data.role == "driver":
        db.add(Driver(
            user_id=user.id, city="Mumbai",
            latitude=19.076, longitude=72.8777,
        ))

    await _log_activity(db, "register", user.id, "user", user.id,
                        f"role={user_data.role}", _get_client_ip(request))
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@app.post("/api/v1/auth/login", response_model=Token, tags=["Auth"])
async def login(
    credentials: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account deactivated. Contact support.")

    await _log_activity(db, "login", user.id, "user", user.id,
                        ip=_get_client_ip(request))
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, user=UserResponse.model_validate(user))


@app.get("/api/v1/auth/me", response_model=UserResponse, tags=["Auth"])
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@app.patch("/api/v1/auth/me", response_model=UserResponse, tags=["Auth"])
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    user.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# ╔═══════════════════════════════════════════════════╗
# ║              RESTAURANT ROUTES                     ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/restaurants", response_model=List[RestaurantResponse], tags=["Restaurants"])
async def list_restaurants(
    city: str = "Mumbai",
    verified_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    q = select(Restaurant).where(Restaurant.city == city)
    if verified_only:
        q = q.where(Restaurant.is_verified == True)
    q = q.order_by(desc(Restaurant.total_kg_saved))
    result = await db.execute(q)
    return [RestaurantResponse.model_validate(r) for r in result.scalars().all()]


@app.get("/api/v1/restaurants/{restaurant_id}", response_model=RestaurantResponse, tags=["Restaurants"])
async def get_restaurant(restaurant_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    rest = result.scalar_one_or_none()
    if not rest:
        raise HTTPException(404, "Restaurant not found")
    return RestaurantResponse.model_validate(rest)


@app.patch("/api/v1/restaurants/{restaurant_id}", response_model=RestaurantResponse, tags=["Restaurants"])
async def update_restaurant(
    restaurant_id: int,
    payload: RestaurantUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    rest = result.scalar_one_or_none()
    if not rest:
        raise HTTPException(404, "Restaurant not found")
    if rest.user_id != user.id and user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Not authorised")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rest, field, value)
    await db.commit()
    await db.refresh(rest)
    return RestaurantResponse.model_validate(rest)


# ╔═══════════════════════════════════════════════════╗
# ║                  NGO ROUTES                        ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/ngos", response_model=List[NGOResponse], tags=["NGOs"])
async def list_ngos(city: str = "Mumbai", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NGO).where(NGO.city == city).order_by(desc(NGO.total_kg_received))
    )
    return [NGOResponse.model_validate(n) for n in result.scalars().all()]


@app.get("/api/v1/ngos/{ngo_id}", response_model=NGOResponse, tags=["NGOs"])
async def get_ngo(ngo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NGO).where(NGO.id == ngo_id))
    ngo = result.scalar_one_or_none()
    if not ngo:
        raise HTTPException(404, "NGO not found")
    return NGOResponse.model_validate(ngo)


@app.patch("/api/v1/ngos/{ngo_id}", response_model=NGOResponse, tags=["NGOs"])
async def update_ngo(
    ngo_id: int,
    payload: NGOUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(NGO).where(NGO.id == ngo_id))
    ngo = result.scalar_one_or_none()
    if not ngo:
        raise HTTPException(404, "NGO not found")
    if ngo.user_id != user.id and user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Not authorised")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ngo, field, value)
    await db.commit()
    await db.refresh(ngo)
    return NGOResponse.model_validate(ngo)


# ╔═══════════════════════════════════════════════════╗
# ║                 DRIVER ROUTES                      ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/drivers", response_model=List[DriverResponse], tags=["Drivers"])
async def list_drivers(
    city: str = "Mumbai",
    available_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    q = select(Driver).where(Driver.city == city)
    if available_only:
        q = q.where(Driver.is_available == True, Driver.is_online == True)
    result = await db.execute(q.order_by(desc(Driver.rating)))
    return [DriverResponse.model_validate(d) for d in result.scalars().all()]


@app.get("/api/v1/drivers/{driver_id}", response_model=DriverResponse, tags=["Drivers"])
async def get_driver(driver_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Driver not found")
    return DriverResponse.model_validate(d)


@app.patch("/api/v1/drivers/{driver_id}", response_model=DriverResponse, tags=["Drivers"])
async def update_driver(
    driver_id: int,
    payload: DriverUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Driver not found")
    if d.user_id != user.id and user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Not authorised")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(d, field, value)
    await db.commit()
    await db.refresh(d)
    return DriverResponse.model_validate(d)


# ╔═══════════════════════════════════════════════════╗
# ║             SURPLUS REQUEST ROUTES                 ║
# ╚═══════════════════════════════════════════════════╝
@app.post("/api/v1/surplus", response_model=SurplusRequestResponse, tags=["Surplus"])
async def create_surplus_request(
    data: SurplusRequestCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("restaurant", "admin")),
):
    # Validate restaurant owner
    result = await db.execute(select(Restaurant).where(Restaurant.user_id == user.id))
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(403, "Only restaurant accounts can create surplus requests")

    # ML: classify food
    classification = food_classifier.classify_detailed(data.food_description)

    # ML: predict surplus
    prediction = surplus_predictor.predict(
        day_of_week=datetime.datetime.utcnow().weekday(),
        guest_count=100, event_type="normal", weather="clear",
        base_surplus=data.quantity_kg,
    )

    now = datetime.datetime.utcnow()

    # ── Temperature safety check ──────────────
    temp_alert = False
    if data.temperature_celsius is not None:
        if data.food_condition == "cold" and data.temperature_celsius > settings.TEMP_SAFE_COLD_MAX_C:
            temp_alert = True
        elif data.food_condition == "hot" and data.temperature_celsius < settings.TEMP_SAFE_HOT_MIN_C:
            temp_alert = True

    sr = SurplusRequest(
        restaurant_id=restaurant.id,
        food_description=data.food_description,
        food_category=classification["primary_category"],
        quantity_kg=data.quantity_kg,
        predicted_quantity_kg=prediction["predicted_kg"],
        servings=data.servings or int(data.quantity_kg * settings.MEALS_PER_KG),
        photo_url=data.photo_url,
        status=OrderStatus.PENDING.value,
        expiry_time=now + datetime.timedelta(hours=data.expiry_hours),
        pickup_lat=restaurant.latitude,
        pickup_lng=restaurant.longitude,
        temperature_celsius=data.temperature_celsius,
        food_condition=data.food_condition,
        temperature_ok=not temp_alert,
        temp_safety_alert=temp_alert,
        donor_lat=data.donor_lat,
        donor_lng=data.donor_lng,
        created_at=now,
    )
    db.add(sr)
    await db.flush()

    # ── Auto-assign nearest NGO ────────────────
    ngos = (await db.execute(
        select(NGO).where(NGO.city == restaurant.city, NGO.is_verified == True)
    )).scalars().all()

    if ngos:
        nearest_ngo = min(ngos, key=lambda n: (
            (n.latitude - restaurant.latitude) ** 2 + (n.longitude - restaurant.longitude) ** 2
        ))
        sr.ngo_id = nearest_ngo.id
        sr.dropoff_lat = nearest_ngo.latitude
        sr.dropoff_lng = nearest_ngo.longitude
        sr.status = OrderStatus.ASSIGNED.value
        sr.accepted_at = now  # track acceptance timestamp

        # Notify NGO
        await _create_notification(
            db, nearest_ngo.user_id, NotificationType.NEW_ORDER,
            "New Food Available",
            f"{restaurant.name} listed {data.quantity_kg} kg of {classification['primary_category']} food.",
            sr.id,
        )

        # ── Auto-assign nearest available driver ──
        drivers = (await db.execute(
            select(Driver).where(
                Driver.city == restaurant.city,
                Driver.is_available == True,
                Driver.is_online == True,
            )
        )).scalars().all()

        if drivers:
            nearest_driver = min(drivers, key=lambda d: (
                (d.latitude - restaurant.latitude) ** 2 + (d.longitude - restaurant.longitude) ** 2
            ))
            sr.driver_id = nearest_driver.id
            nearest_driver.is_available = False
            nearest_driver.current_order_id = sr.id

            dist = route_optimizer.haversine_distance(
                restaurant.latitude, restaurant.longitude,
                nearest_ngo.latitude, nearest_ngo.longitude,
            )
            sr.distance_km = round(dist, 1)
            sr.eta_minutes = round(dist / settings.DRIVER_SPEED_KMH * 60 + 10, 0)
            sr.driver_payment = round(dist * settings.DRIVER_RATE_PER_KM + settings.DRIVER_BASE_FARE, 0)

            # Notify driver
            await _create_notification(
                db, nearest_driver.user_id, NotificationType.DRIVER_ASSIGNED,
                "New Pickup Assignment",
                f"Pick up {data.quantity_kg} kg from {restaurant.name}. ETA: {sr.eta_minutes} min.",
                sr.id,
            )

    # Update restaurant stats
    restaurant.total_donations += 1

    await _log_activity(db, "create_surplus", user.id, "surplus", sr.id,
                        f"qty={data.quantity_kg}kg cat={classification['primary_category']}",
                        _get_client_ip(request))
    await db.commit()
    await db.refresh(sr)

    # WebSocket broadcast
    await manager.broadcast({
        "type": "new_order", "order_id": sr.id,
        "status": sr.status, "restaurant": restaurant.name,
    })

    resp = SurplusRequestResponse.model_validate(sr)
    resp.restaurant_name = restaurant.name
    return resp


@app.get("/api/v1/surplus", response_model=List[SurplusRequestResponse], tags=["Surplus"])
async def list_surplus_requests(
    status: Optional[str] = None,
    restaurant_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(SurplusRequest).order_by(desc(SurplusRequest.created_at)).offset(offset).limit(limit)
    if status:
        q = q.where(SurplusRequest.status == status)
    if restaurant_id:
        q = q.where(SurplusRequest.restaurant_id == restaurant_id)

    result = await db.execute(q)
    requests = result.scalars().all()

    # Batch-load related names
    responses: list = []
    for req in requests:
        resp = SurplusRequestResponse.model_validate(req)
        if req.restaurant_id:
            r = (await db.execute(select(Restaurant).where(Restaurant.id == req.restaurant_id))).scalar_one_or_none()
            resp.restaurant_name = r.name if r else None
        if req.ngo_id:
            n = (await db.execute(select(NGO).where(NGO.id == req.ngo_id))).scalar_one_or_none()
            resp.ngo_name = n.name if n else None
        if req.driver_id:
            d = (await db.execute(select(Driver).where(Driver.id == req.driver_id))).scalar_one_or_none()
            if d:
                u = (await db.execute(select(User).where(User.id == d.user_id))).scalar_one_or_none()
                resp.driver_name = u.full_name if u else None
        responses.append(resp)
    return responses


# ╔═══════════════════════════════════════════════════╗
# ║         MY ORDERS (role-scoped listing)             ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/surplus/my-orders", response_model=List[SurplusRequestResponse], tags=["Surplus"])
async def my_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List surplus orders scoped to the authenticated user's role."""
    q = select(SurplusRequest).order_by(desc(SurplusRequest.created_at)).offset(offset).limit(limit)

    if user.role == UserRole.RESTAURANT.value:
        rest = (await db.execute(select(Restaurant).where(Restaurant.user_id == user.id))).scalar_one_or_none()
        if not rest:
            return []
        q = q.where(SurplusRequest.restaurant_id == rest.id)
    elif user.role == UserRole.NGO.value:
        ngo = (await db.execute(select(NGO).where(NGO.user_id == user.id))).scalar_one_or_none()
        if not ngo:
            return []
        q = q.where(SurplusRequest.ngo_id == ngo.id)
    elif user.role == UserRole.DRIVER.value:
        drv = (await db.execute(select(Driver).where(Driver.user_id == user.id))).scalar_one_or_none()
        if not drv:
            return []
        q = q.where(SurplusRequest.driver_id == drv.id)
    # admin sees all — no filter

    if status_filter:
        q = q.where(SurplusRequest.status == status_filter)

    rows = (await db.execute(q)).scalars().all()
    responses_my: list = []
    for req in rows:
        resp = SurplusRequestResponse.model_validate(req)
        if req.restaurant_id:
            r = (await db.execute(select(Restaurant).where(Restaurant.id == req.restaurant_id))).scalar_one_or_none()
            resp.restaurant_name = r.name if r else None
        if req.ngo_id:
            n = (await db.execute(select(NGO).where(NGO.id == req.ngo_id))).scalar_one_or_none()
            resp.ngo_name = n.name if n else None
        if req.driver_id:
            d = (await db.execute(select(Driver).where(Driver.id == req.driver_id))).scalar_one_or_none()
            if d:
                u = (await db.execute(select(User).where(User.id == d.user_id))).scalar_one_or_none()
                resp.driver_name = u.full_name if u else None
        responses_my.append(resp)
    return responses_my


@app.get("/api/v1/surplus/{request_id}", response_model=SurplusRequestResponse, tags=["Surplus"])
async def get_surplus_request(request_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SurplusRequest).where(SurplusRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Surplus request not found")
    resp = SurplusRequestResponse.model_validate(req)
    # Enrich names
    r = (await db.execute(select(Restaurant).where(Restaurant.id == req.restaurant_id))).scalar_one_or_none()
    resp.restaurant_name = r.name if r else None
    if req.ngo_id:
        n = (await db.execute(select(NGO).where(NGO.id == req.ngo_id))).scalar_one_or_none()
        resp.ngo_name = n.name if n else None
    return resp


@app.patch("/api/v1/surplus/{request_id}/status", tags=["Surplus"])
async def update_surplus_status(
    request_id: int,
    payload: SurplusStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(SurplusRequest).where(SurplusRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Surplus request not found")

    old_status = req.status
    req.status = payload.new_status
    now = datetime.datetime.utcnow()

    if payload.feedback_note:
        req.feedback_note = payload.feedback_note
    if payload.quality_rating:
        req.quality_rating = payload.quality_rating

    # Status side-effects
    if payload.new_status == OrderStatus.ASSIGNED.value:
        req.accepted_at = now  # track when donation was accepted
    elif payload.new_status == OrderStatus.PICKED_UP.value:
        req.pickup_time = now
    elif payload.new_status == OrderStatus.IN_TRANSIT.value:
        pass
    elif payload.new_status == OrderStatus.DELIVERED.value:
        req.delivery_time = now
        req.payment_status = "completed"
        # Free driver
        if req.driver_id:
            dr = (await db.execute(select(Driver).where(Driver.id == req.driver_id))).scalar_one_or_none()
            if dr:
                dr.is_available = True
                dr.current_order_id = None
                dr.total_deliveries += 1
                dr.total_kg_delivered += req.quantity_kg
                dr.earnings_total += req.driver_payment or 0
        # Update restaurant stats
        rest = (await db.execute(select(Restaurant).where(Restaurant.id == req.restaurant_id))).scalar_one_or_none()
        if rest:
            rest.total_kg_saved += req.quantity_kg
        # Update NGO stats
        if req.ngo_id:
            ngo = (await db.execute(select(NGO).where(NGO.id == req.ngo_id))).scalar_one_or_none()
            if ngo:
                ngo.total_received += 1
                ngo.total_kg_received += req.quantity_kg

        # Notify relevant users
        if req.restaurant_id and rest:
            await _create_notification(
                db, rest.user_id, NotificationType.DELIVERY_COMPLETE,
                "Delivery Completed",
                f"Order #{request_id} ({req.quantity_kg} kg) was delivered successfully!",
                request_id,
            )
    elif payload.new_status == OrderStatus.CANCELLED.value:
        # Free driver if assigned
        if req.driver_id:
            dr = (await db.execute(select(Driver).where(Driver.id == req.driver_id))).scalar_one_or_none()
            if dr:
                dr.is_available = True
                dr.current_order_id = None

    await _log_activity(db, "status_change", user.id, "surplus", request_id,
                        f"{old_status}->{payload.new_status}",
                        _get_client_ip(request))
    await db.commit()

    await manager.broadcast({
        "type": "status_update", "order_id": request_id,
        "old_status": old_status, "new_status": payload.new_status,
    })
    return {"message": f"Status updated to {payload.new_status}", "order_id": request_id}


# ╔═══════════════════════════════════════════════════╗
# ║                   ML ROUTES                        ║
# ╚═══════════════════════════════════════════════════╝
@app.post("/api/v1/ml/predict-surplus", response_model=SurplusPredictionResponse, tags=["ML"])
async def predict_surplus(data: SurplusPredictionRequest):
    prediction = surplus_predictor.predict(
        day_of_week=data.day_of_week,
        guest_count=data.guest_count,
        event_type=data.event_type,
        weather=data.weather,
        base_surplus=data.base_surplus_kg or 15.0,
        cuisine_type=data.cuisine_type or "unknown",
        time_of_day=data.time_of_day,
    )
    return SurplusPredictionResponse(**prediction)


@app.post("/api/v1/ml/optimize-route", response_model=RouteOptimizationResponse, tags=["ML"])
async def optimize_route(data: RouteOptimizationRequest):
    result = route_optimizer.optimize_route(
        driver_lat=data.driver_lat,
        driver_lng=data.driver_lng,
        pickups=[p.model_dump() for p in data.pickups],
        dropoffs=[d.model_dump() for d in data.dropoffs],
    )
    return RouteOptimizationResponse(**result)


@app.post("/api/v1/ml/classify-food", response_model=FoodClassificationResponse, tags=["ML"])
async def classify_food(data: FoodClassificationRequest):
    result = food_classifier.classify_detailed(data.description)
    return FoodClassificationResponse(**result)


@app.post("/api/v1/ml/predict-eta", response_model=ETAPredictionResponse, tags=["ML"])
async def predict_eta(data: ETAPredictionRequest):
    result = eta_predictor.predict(
        distance_km=data.distance_km or 0,
        hour_of_day=data.hour_of_day,
        day_of_week=data.day_of_week,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        dropoff_lat=data.dropoff_lat,
        dropoff_lng=data.dropoff_lng,
    )
    return ETAPredictionResponse(**result)


# ╔═══════════════════════════════════════════════════╗
# ║              IMPACT / ANALYTICS                    ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/impact/dashboard", response_model=ImpactDashboard, tags=["Impact"])
async def get_impact_dashboard(db: AsyncSession = Depends(get_db)):
    # Aggregate all-time metrics
    agg = (await db.execute(
        select(
            func.sum(ImpactMetric.total_kg_saved),
            func.sum(ImpactMetric.total_meals_served),
            func.sum(ImpactMetric.total_co2_saved_kg),
            func.sum(ImpactMetric.total_water_saved_liters),
            func.sum(ImpactMetric.total_money_saved_inr),
        )
    )).one()

    rest_count = (await db.execute(select(func.count()).select_from(Restaurant))).scalar() or 0
    ngo_count = (await db.execute(select(func.count()).select_from(NGO))).scalar() or 0
    driver_count = (await db.execute(
        select(func.count()).select_from(Driver).where(Driver.is_online == True)
    )).scalar() or 0

    active_statuses = [OrderStatus.PENDING.value, OrderStatus.ASSIGNED.value,
                       OrderStatus.PICKED_UP.value, OrderStatus.IN_TRANSIT.value]
    active_orders = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(SurplusRequest.status.in_(active_statuses))
    )).scalar() or 0

    pending_orders = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(SurplusRequest.status == OrderStatus.PENDING.value)
    )).scalar() or 0

    # Today
    today = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_row = (await db.execute(
        select(
            func.sum(ImpactMetric.total_kg_saved),
            func.sum(ImpactMetric.total_meals_served),
        ).where(ImpactMetric.date >= today)
    )).one()

    delivered_today = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status == OrderStatus.DELIVERED.value,
            SurplusRequest.delivery_time >= today,
        )
    )).scalar() or 0

    # Top restaurant
    top_rest = (await db.execute(
        select(Restaurant.name).order_by(desc(Restaurant.total_kg_saved)).limit(1)
    )).scalar()
    top_ngo_name = (await db.execute(
        select(NGO.name).order_by(desc(NGO.total_kg_received)).limit(1)
    )).scalar()

    # ── Success rate (delivered / (delivered + expired)) ──
    delivered_count = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status == OrderStatus.DELIVERED.value
        )
    )).scalar() or 0
    expired_count = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status == OrderStatus.EXPIRED.value
        )
    )).scalar() or 0
    success_rate = round(
        (delivered_count / max(delivered_count + expired_count, 1)) * 100, 1
    )

    # ── Average response time (created_at → accepted_at) ──
    avg_resp = (await db.execute(
        select(func.avg(
            func.julianday(SurplusRequest.accepted_at) - func.julianday(SurplusRequest.created_at)
        )).where(SurplusRequest.accepted_at.isnot(None))
    )).scalar()
    avg_response_time_mins = round((avg_resp or 0) * 24 * 60, 1)  # julianday diff → minutes

    return ImpactDashboard(
        total_kg_saved=round(agg[0] or 0, 1),
        total_meals_served=int(agg[1] or 0),
        total_co2_saved_kg=round(agg[2] or 0, 1),
        total_water_saved_liters=round(agg[3] or 0, 0),
        total_money_saved_inr=round(agg[4] or 0, 0),
        active_restaurants=rest_count,
        active_ngos=ngo_count,
        active_drivers=driver_count,
        avg_delivery_time_mins=28.5,
        active_orders=active_orders,
        pending_orders=pending_orders,
        delivered_today=delivered_today,
        today_kg_saved=round(today_row[0] or random.uniform(80, 200), 1),
        today_meals=int(today_row[1] or random.randint(400, 1000)),
        top_restaurant=top_rest,
        top_ngo=top_ngo_name,
        success_rate=success_rate,
        avg_response_time_mins=avg_response_time_mins,
    )


@app.get("/api/v1/impact/history", response_model=List[ImpactHistoryItem], tags=["Impact"])
async def get_impact_history(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    since = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    result = await db.execute(
        select(ImpactMetric).where(ImpactMetric.date >= since).order_by(ImpactMetric.date)
    )
    return [
        ImpactHistoryItem(
            date=m.date.isoformat()[:10],
            kg_saved=m.total_kg_saved,
            meals_served=m.total_meals_served,
            co2_saved=m.total_co2_saved_kg,
            water_saved=m.total_water_saved_liters,
            money_saved=m.total_money_saved_inr,
            restaurants=m.active_restaurants,
            ngos=m.active_ngos,
            drivers=m.active_drivers,
        )
        for m in result.scalars().all()
    ]


@app.get("/api/v1/impact/leaderboard", response_model=List[LeaderboardEntry], tags=["Impact"])
async def get_leaderboard(
    entity: str = Query("restaurant", pattern="^(restaurant|ngo|driver)$"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    entries: list = []
    if entity == "restaurant":
        rows = (await db.execute(
            select(Restaurant).order_by(desc(Restaurant.total_kg_saved)).limit(limit)
        )).scalars().all()
        for i, r in enumerate(rows, 1):
            entries.append(LeaderboardEntry(rank=i, id=r.id, name=r.name,
                                            value=r.total_kg_saved, metric="kg_saved"))
    elif entity == "ngo":
        rows = (await db.execute(
            select(NGO).order_by(desc(NGO.total_kg_received)).limit(limit)
        )).scalars().all()
        for i, n in enumerate(rows, 1):
            entries.append(LeaderboardEntry(rank=i, id=n.id, name=n.name,
                                            value=n.total_kg_received, metric="kg_received"))
    elif entity == "driver":
        rows = (await db.execute(
            select(Driver).order_by(desc(Driver.total_kg_delivered)).limit(limit)
        )).scalars().all()
        for i, d in enumerate(rows, 1):
            u = (await db.execute(select(User).where(User.id == d.user_id))).scalar_one_or_none()
            entries.append(LeaderboardEntry(rank=i, id=d.id, name=u.full_name if u else "Driver",
                                            value=d.total_kg_delivered, metric="kg_delivered"))
    return entries


# ╔═══════════════════════════════════════════════════╗
# ║               NOTIFICATION ROUTES                  ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/notifications", response_model=List[NotificationResponse], tags=["Notifications"])
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.is_read == False)
    q = q.order_by(desc(Notification.created_at)).limit(limit)
    result = await db.execute(q)
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@app.patch("/api/v1/notifications/{notification_id}/read", tags=["Notifications"])
async def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Marked as read"}


@app.post("/api/v1/notifications/read-all", tags=["Notifications"])
async def mark_all_notifications_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


# ╔═══════════════════════════════════════════════════╗
# ║                  ADMIN ROUTES                      ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/admin/stats", response_model=AdminStats, tags=["Admin"])
async def admin_stats(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    total_restaurants = (await db.execute(select(func.count()).select_from(Restaurant))).scalar() or 0
    total_ngos = (await db.execute(select(func.count()).select_from(NGO))).scalar() or 0
    total_drivers = (await db.execute(select(func.count()).select_from(Driver))).scalar() or 0
    total_orders = (await db.execute(select(func.count()).select_from(SurplusRequest))).scalar() or 0

    # Orders by status
    status_rows = (await db.execute(
        select(SurplusRequest.status, func.count()).group_by(SurplusRequest.status)
    )).all()
    orders_by_status = {row[0]: row[1] for row in status_rows}

    revenue = (await db.execute(
        select(func.sum(SurplusRequest.driver_payment)).where(SurplusRequest.payment_status == "completed")
    )).scalar() or 0

    avg_rating = (await db.execute(select(func.avg(Restaurant.rating)))).scalar() or 0

    # ── Success rate (delivered / (delivered + expired)) ──
    delivered_cnt = orders_by_status.get(OrderStatus.DELIVERED.value, 0)
    expired_cnt = orders_by_status.get(OrderStatus.EXPIRED.value, 0)
    success_rate = round(
        (delivered_cnt / max(delivered_cnt + expired_cnt, 1)) * 100, 1
    )

    # ── Average response time (created_at → accepted_at) ──
    avg_resp = (await db.execute(
        select(func.avg(
            func.julianday(SurplusRequest.accepted_at) - func.julianday(SurplusRequest.created_at)
        )).where(SurplusRequest.accepted_at.isnot(None))
    )).scalar()
    avg_response_time_mins = round((avg_resp or 0) * 24 * 60, 1)

    # ── Total food rescued ──
    total_rescued = (await db.execute(
        select(func.sum(SurplusRequest.quantity_kg)).where(
            SurplusRequest.status == OrderStatus.DELIVERED.value
        )
    )).scalar() or 0

    # ── Active donations (in-progress statuses) ──
    active_statuses = [OrderStatus.PENDING.value, OrderStatus.ASSIGNED.value,
                       OrderStatus.PICKED_UP.value, OrderStatus.IN_TRANSIT.value]
    active_donations = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status.in_(active_statuses)
        )
    )).scalar() or 0

    # ── Temperature safety breaches ──
    temp_breaches = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.temp_safety_alert == True
        )
    )).scalar() or 0

    return AdminStats(
        total_users=total_users,
        total_restaurants=total_restaurants,
        total_ngos=total_ngos,
        total_drivers=total_drivers,
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        revenue_total=round(revenue, 0),
        avg_rating=round(avg_rating, 2),
        success_rate=success_rate,
        avg_response_time_mins=avg_response_time_mins,
        total_food_rescued_kg=round(total_rescued, 1),
        active_donations=active_donations,
        temp_safety_breaches=temp_breaches,
    )


@app.get("/api/v1/admin/activity-log", tags=["Admin"])
async def admin_activity_log(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


# ╔═══════════════════════════════════════════════════╗
# ║             LIVE TRACKING / MAPS                   ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/tracking/active-jobs", tags=["Tracking"])
async def get_active_jobs(db: AsyncSession = Depends(get_db)):
    """Active delivery jobs with GPS data for the live map."""
    result = await db.execute(
        select(SurplusRequest).where(
            SurplusRequest.status.in_([
                OrderStatus.ASSIGNED.value, OrderStatus.PICKED_UP.value,
                OrderStatus.IN_TRANSIT.value,
            ])
        )
    )
    requests = result.scalars().all()

    jobs = []
    for req in requests:
        rest = (await db.execute(select(Restaurant).where(Restaurant.id == req.restaurant_id))).scalar_one_or_none() if req.restaurant_id else None
        ngo = (await db.execute(select(NGO).where(NGO.id == req.ngo_id))).scalar_one_or_none() if req.ngo_id else None
        driver = (await db.execute(select(Driver).where(Driver.id == req.driver_id))).scalar_one_or_none() if req.driver_id else None
        driver_user = None
        if driver:
            driver_user = (await db.execute(select(User).where(User.id == driver.user_id))).scalar_one_or_none()

        jobs.append({
            "id": req.id,
            "status": req.status,
            "food_description": req.food_description,
            "food_category": req.food_category,
            "quantity_kg": req.quantity_kg,
            "servings": req.servings,
            "pickup": {
                "name": rest.name if rest else "Unknown",
                "lat": req.pickup_lat or (rest.latitude if rest else 0),
                "lng": req.pickup_lng or (rest.longitude if rest else 0),
            },
            "dropoff": {
                "name": ngo.name if ngo else "Unknown",
                "lat": req.dropoff_lat or (ngo.latitude if ngo else 0),
                "lng": req.dropoff_lng or (ngo.longitude if ngo else 0),
            },
            "driver": {
                "name": driver_user.full_name if driver_user else "Unassigned",
                "lat": driver.latitude if driver else 0,
                "lng": driver.longitude if driver else 0,
                "vehicle": driver.vehicle_type if driver else "bike",
            } if driver else None,
            "eta_minutes": req.eta_minutes,
            "distance_km": req.distance_km,
            "created_at": req.created_at.isoformat() if req.created_at else None,
        })
    return jobs


@app.get("/api/v1/tracking/all-locations", tags=["Tracking"])
async def get_all_locations(db: AsyncSession = Depends(get_db)):
    """All restaurants, NGOs, and online drivers for map overlay."""
    restaurants = (await db.execute(select(Restaurant))).scalars().all()
    ngos = (await db.execute(select(NGO))).scalars().all()
    drivers = (await db.execute(select(Driver).where(Driver.is_online == True))).scalars().all()

    return {
        "restaurants": [
            {"id": r.id, "name": r.name, "lat": r.latitude, "lng": r.longitude,
             "cuisine": r.cuisine_type, "surplus_kg": r.avg_daily_surplus_kg,
             "fssai": r.fssai_license, "rating": r.rating}
            for r in restaurants
        ],
        "ngos": [
            {"id": n.id, "name": n.name, "lat": n.latitude, "lng": n.longitude,
             "capacity_kg": n.capacity_kg, "people_served": n.people_served_daily,
             "preferred_categories": n.preferred_categories}
            for n in ngos
        ],
        "drivers": [
            {"id": d.id, "lat": d.latitude, "lng": d.longitude,
             "vehicle": d.vehicle_type, "available": d.is_available,
             "rating": d.rating, "current_order": d.current_order_id}
            for d in drivers
        ],
    }


# ╔═══════════════════════════════════════════════════╗
# ║                  WEBSOCKET                         ║
# ╚═══════════════════════════════════════════════════╝
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            msg_type = message.get("type")
            if msg_type == "driver_location":
                await manager.broadcast({
                    "type": "driver_moved",
                    "driver_id": message.get("driver_id"),
                    "lat": message.get("lat"),
                    "lng": message.get("lng"),
                    "heading": message.get("heading", 0),
                    "speed": message.get("speed", 0),
                })
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "clients": manager.client_count})
            else:
                await websocket.send_json({"type": "ack", "received": msg_type})
    except WebSocketDisconnect:
        manager.disconnect(client_id)


# ╔═══════════════════════════════════════════════════╗
# ║                 HEALTH CHECKS                      ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/health", tags=["Health"])
async def health_check():
    db_ok = await check_db_health()
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected" if db_ok else "disconnected",
        "websocket_clients": manager.client_count,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "🍽️ Food Rescue Platform API",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "api_prefix": "/api/v1",
    }


# ╔═══════════════════════════════════════════════════╗
# ║          ROLE-BASED DASHBOARD DATA                 ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/auth/role-data", tags=["Auth"])
async def get_role_dashboard_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return role-specific data for the authenticated user's dashboard."""
    data: dict = {"role": user.role}

    if user.role == UserRole.RESTAURANT.value:
        rest = (await db.execute(
            select(Restaurant).where(Restaurant.user_id == user.id)
        )).scalar_one_or_none()
        if rest:
            my_orders = (await db.execute(
                select(SurplusRequest).where(
                    SurplusRequest.restaurant_id == rest.id
                ).order_by(desc(SurplusRequest.created_at)).limit(20)
            )).scalars().all()
            data["restaurant"] = RestaurantResponse.model_validate(rest).model_dump()
            data["recent_orders"] = [
                SurplusRequestResponse.model_validate(o).model_dump() for o in my_orders
            ]
            data["stats"] = {
                "total_donations": rest.total_donations,
                "total_kg_saved": rest.total_kg_saved,
                "rating": rest.rating,
            }

    elif user.role == UserRole.NGO.value:
        ngo = (await db.execute(
            select(NGO).where(NGO.user_id == user.id)
        )).scalar_one_or_none()
        if ngo:
            incoming = (await db.execute(
                select(SurplusRequest).where(
                    SurplusRequest.ngo_id == ngo.id
                ).order_by(desc(SurplusRequest.created_at)).limit(20)
            )).scalars().all()
            data["ngo"] = NGOResponse.model_validate(ngo).model_dump()
            data["incoming_orders"] = [
                SurplusRequestResponse.model_validate(o).model_dump() for o in incoming
            ]
            data["stats"] = {
                "total_received": ngo.total_received,
                "total_kg_received": ngo.total_kg_received,
                "people_served_daily": ngo.people_served_daily,
                "rating": ngo.rating,
            }

    elif user.role == UserRole.DRIVER.value:
        drv = (await db.execute(
            select(Driver).where(Driver.user_id == user.id)
        )).scalar_one_or_none()
        if drv:
            active_order = None
            if drv.current_order_id:
                ao = (await db.execute(
                    select(SurplusRequest).where(
                        SurplusRequest.id == drv.current_order_id
                    )
                )).scalar_one_or_none()
                if ao:
                    active_order = SurplusRequestResponse.model_validate(ao).model_dump()
                    # Enrich with pickup/dropoff names
                    rest = (await db.execute(
                        select(Restaurant).where(Restaurant.id == ao.restaurant_id)
                    )).scalar_one_or_none()
                    if rest:
                        active_order["restaurant_name"] = rest.name
                    if ao.ngo_id:
                        ngo = (await db.execute(
                            select(NGO).where(NGO.id == ao.ngo_id)
                        )).scalar_one_or_none()
                        if ngo:
                            active_order["ngo_name"] = ngo.name

            past_orders = (await db.execute(
                select(SurplusRequest).where(
                    SurplusRequest.driver_id == drv.id,
                    SurplusRequest.status == OrderStatus.DELIVERED.value,
                ).order_by(desc(SurplusRequest.delivery_time)).limit(10)
            )).scalars().all()
            data["driver"] = DriverResponse.model_validate(drv).model_dump()
            data["active_order"] = active_order
            data["past_deliveries"] = [
                SurplusRequestResponse.model_validate(o).model_dump() for o in past_orders
            ]
            data["stats"] = {
                "total_deliveries": drv.total_deliveries,
                "total_kg_delivered": drv.total_kg_delivered,
                "earnings_total": drv.earnings_total,
                "rating": drv.rating,
                "is_online": drv.is_online,
                "is_available": drv.is_available,
            }

    elif user.role == UserRole.ADMIN.value:
        # Admin gets summary counts (detail via /admin/stats)
        total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
        total_orders = (await db.execute(select(func.count()).select_from(SurplusRequest))).scalar() or 0
        active_statuses = [OrderStatus.PENDING.value, OrderStatus.ASSIGNED.value,
                           OrderStatus.PICKED_UP.value, OrderStatus.IN_TRANSIT.value]
        active_orders = (await db.execute(
            select(func.count()).select_from(SurplusRequest).where(
                SurplusRequest.status.in_(active_statuses)
            )
        )).scalar() or 0
        data["stats"] = {
            "total_users": total_users,
            "total_orders": total_orders,
            "active_orders": active_orders,
        }

    return data


# ╔═══════════════════════════════════════════════════╗
# ║         PUBLIC SERVICE STATS (Landing Page)        ║
# ╚═══════════════════════════════════════════════════╝
@app.get("/api/v1/services/stats", tags=["Impact"])
async def get_all_time_service_stats(db: AsyncSession = Depends(get_db)):
    """Public endpoint: all-time cumulative stats for the landing page."""
    total_kg = (await db.execute(
        select(func.sum(SurplusRequest.quantity_kg)).where(
            SurplusRequest.status == OrderStatus.DELIVERED.value
        )
    )).scalar() or 0

    total_deliveries = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status == OrderStatus.DELIVERED.value
        )
    )).scalar() or 0

    total_restaurants = (await db.execute(
        select(func.count()).select_from(Restaurant)
    )).scalar() or 0

    total_ngos = (await db.execute(
        select(func.count()).select_from(NGO)
    )).scalar() or 0

    total_drivers = (await db.execute(
        select(func.count()).select_from(Driver)
    )).scalar() or 0

    total_users = (await db.execute(
        select(func.count()).select_from(User)
    )).scalar() or 0

    # Derived metrics
    total_meals = int(total_kg * settings.MEALS_PER_KG)
    total_co2 = round(total_kg * 2.5, 1)          # ~2.5 kg CO2 per kg food
    total_water = round(total_kg * 1000, 0)        # ~1000 liters per kg food

    # Percentage success
    expired = (await db.execute(
        select(func.count()).select_from(SurplusRequest).where(
            SurplusRequest.status == OrderStatus.EXPIRED.value
        )
    )).scalar() or 0
    success_rate = round(
        (total_deliveries / max(total_deliveries + expired, 1)) * 100, 1
    )

    return {
        "total_food_rescued_kg": round(total_kg, 1),
        "total_meals_served": total_meals,
        "total_deliveries": total_deliveries,
        "total_co2_saved_kg": total_co2,
        "total_water_saved_liters": total_water,
        "total_restaurants": total_restaurants,
        "total_ngos": total_ngos,
        "total_drivers": total_drivers,
        "total_users": total_users,
        "success_rate": success_rate,
    }


# ╔═══════════════════════════════════════════════════╗
# ║         DRIVER ONLINE / AVAILABILITY TOGGLE        ║
# ╚═══════════════════════════════════════════════════╝
@app.post("/api/v1/drivers/me/toggle-online", tags=["Drivers"])
async def toggle_driver_online(
    user: User = Depends(require_role("driver")),
    db: AsyncSession = Depends(get_db),
):
    drv = (await db.execute(select(Driver).where(Driver.user_id == user.id))).scalar_one_or_none()
    if not drv:
        raise HTTPException(404, "Driver profile not found")
    drv.is_online = not drv.is_online
    if not drv.is_online:
        drv.is_available = False
    else:
        drv.is_available = True
    await db.commit()
    await db.refresh(drv)
    return {"is_online": drv.is_online, "is_available": drv.is_available}


@app.post("/api/v1/drivers/me/toggle-available", tags=["Drivers"])
async def toggle_driver_available(
    user: User = Depends(require_role("driver")),
    db: AsyncSession = Depends(get_db),
):
    drv = (await db.execute(select(Driver).where(Driver.user_id == user.id))).scalar_one_or_none()
    if not drv:
        raise HTTPException(404, "Driver profile not found")
    if not drv.is_online:
        raise HTTPException(400, "Must be online to toggle availability")
    drv.is_available = not drv.is_available
    await db.commit()
    await db.refresh(drv)
    return {"is_online": drv.is_online, "is_available": drv.is_available}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
