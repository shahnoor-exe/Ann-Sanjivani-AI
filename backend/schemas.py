"""
Food Rescue Platform — Pydantic Schemas (v2)
Request / response models with field validation, pagination, and analytics types.
"""
from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ════════════════════════════════════════════
#  Pagination wrapper
# ════════════════════════════════════════════
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int = 1
    per_page: int = 20
    pages: int = 1


# ════════════════════════════════════════════
#  Error
# ════════════════════════════════════════════
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


# ════════════════════════════════════════════
#  AUTH
# ════════════════════════════════════════════
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72, description="6-72 chars")
    full_name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = Field(None, pattern=r"^\+?\d{7,15}$")
    role: str = Field("restaurant", pattern=r"^(restaurant|ngo|driver|admin)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # seconds
    user: UserResponse


# ════════════════════════════════════════════
#  RESTAURANT
# ════════════════════════════════════════════
class RestaurantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=5)
    city: str = "Mumbai"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    cuisine_type: Optional[str] = "Multi-cuisine"
    fssai_license: Optional[str] = None


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    cuisine_type: Optional[str] = None
    fssai_license: Optional[str] = None
    avg_daily_surplus_kg: Optional[float] = None


class RestaurantResponse(BaseModel):
    id: int
    user_id: int
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    cuisine_type: Optional[str] = None
    fssai_license: Optional[str] = None
    avg_daily_surplus_kg: float
    rating: float
    total_donations: int
    total_kg_saved: float
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ════════════════════════════════════════════
#  NGO
# ════════════════════════════════════════════
class NGOCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=5)
    city: str = "Mumbai"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity_kg: float = Field(100, gt=0)
    preferred_categories: Optional[str] = "veg,mixed"


class NGOUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity_kg: Optional[float] = None
    preferred_categories: Optional[str] = None


class NGOResponse(BaseModel):
    id: int
    user_id: int
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    capacity_kg: float
    people_served_daily: int
    preferred_categories: Optional[str] = None
    rating: float
    total_received: int
    total_kg_received: float
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ════════════════════════════════════════════
#  DRIVER
# ════════════════════════════════════════════
class DriverCreate(BaseModel):
    vehicle_type: str = Field("bike", pattern=r"^(bike|auto|van|truck)$")
    license_number: Optional[str] = None
    city: str = "Mumbai"
    latitude: float = 19.076
    longitude: float = 72.8777


class DriverUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    license_number: Optional[str] = None
    is_available: Optional[bool] = None
    is_online: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DriverResponse(BaseModel):
    id: int
    user_id: int
    vehicle_type: str
    license_number: Optional[str] = None
    city: str
    latitude: float
    longitude: float
    is_available: bool
    is_online: bool
    current_order_id: Optional[int] = None
    total_deliveries: int
    total_kg_delivered: float
    rating: float
    earnings_total: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ════════════════════════════════════════════
#  SURPLUS REQUEST  (the core order)
# ════════════════════════════════════════════
class SurplusRequestCreate(BaseModel):
    food_description: str = Field(min_length=3, max_length=1000)
    food_category: str = Field("mixed", pattern=r"^(veg|non_veg|mixed|rice|bread|curry|snacks|sweets)$")
    quantity_kg: float = Field(gt=0, le=5000, description="kg of food")
    servings: Optional[int] = Field(None, ge=0)
    photo_url: Optional[str] = None
    expiry_hours: int = Field(2, ge=1, le=24)
    temperature_celsius: Optional[float] = Field(None, description="Current food temperature °C")
    food_condition: str = Field("cooked", pattern=r"^(cooked|packaged|hot|cold)$")
    donor_lat: Optional[float] = Field(None, ge=-90, le=90, description="Auto-captured donor latitude")
    donor_lng: Optional[float] = Field(None, ge=-180, le=180, description="Auto-captured donor longitude")


class SurplusRequestResponse(BaseModel):
    id: int
    restaurant_id: int
    ngo_id: Optional[int] = None
    driver_id: Optional[int] = None
    food_description: str
    food_category: str
    quantity_kg: float
    predicted_quantity_kg: Optional[float] = None
    servings: int = 0
    photo_url: Optional[str] = None
    status: str
    pickup_time: Optional[datetime] = None
    delivery_time: Optional[datetime] = None
    expiry_time: Optional[datetime] = None
    temperature_ok: bool
    temperature_celsius: Optional[float] = None
    food_condition: Optional[str] = "cooked"
    temp_safety_alert: bool = False
    quality_rating: int = 5
    feedback_note: Optional[str] = None
    accepted_at: Optional[datetime] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    donor_lat: Optional[float] = None
    donor_lng: Optional[float] = None
    distance_km: float = 0
    eta_minutes: int = 0
    driver_payment: float = 0
    payment_status: str = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Enriched names (populated in route handler)
    restaurant_name: Optional[str] = None
    ngo_name: Optional[str] = None
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True


class SurplusStatusUpdate(BaseModel):
    new_status: str = Field(..., pattern=r"^(pending|assigned|picked_up|in_transit|delivered|cancelled|expired)$")
    feedback_note: Optional[str] = None
    quality_rating: Optional[int] = Field(None, ge=1, le=5)


# ════════════════════════════════════════════
#  ML — SURPLUS PREDICTION
# ════════════════════════════════════════════
class SurplusPredictionRequest(BaseModel):
    restaurant_id: Optional[int] = None
    day_of_week: int = Field(ge=0, le=6, description="0=Mon … 6=Sun")
    guest_count: int = Field(100, gt=0)
    event_type: str = Field("normal", pattern=r"^(normal|wedding|festival|corporate|birthday|college_event|hotel_buffet)$")
    weather: str = Field("clear", pattern=r"^(clear|rain|hot|cold)$")
    base_surplus_kg: Optional[float] = None
    cuisine_type: Optional[str] = Field("unknown", description="north_indian, south_indian, chinese, continental, multi_cuisine, punjabi, unknown")
    time_of_day: Optional[int] = Field(None, ge=0, le=23, description="Hour of day (0-23). Defaults to current hour if omitted.")


class SurplusPredictionResponse(BaseModel):
    predicted_kg: float
    confidence: float
    confidence_interval: Dict[str, float]  # {"lower": .., "upper": ..}
    category_breakdown: Dict[str, float]
    recommendation: str
    feature_importance: Dict[str, float]
    model_version: str


# ════════════════════════════════════════════
#  ML — ROUTE OPTIMIZATION
# ════════════════════════════════════════════
class LocationPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    name: Optional[str] = "Unknown"
    order_id: Optional[int] = 0


class RouteOptimizationRequest(BaseModel):
    driver_lat: float = Field(ge=-90, le=90)
    driver_lng: float = Field(ge=-180, le=180)
    pickups: List[LocationPoint]
    dropoffs: List[LocationPoint]


class RouteStop(BaseModel):
    type: str
    lat: float
    lng: float
    name: str
    order_id: int = 0
    distance_from_prev_km: float
    eta_mins: float
    cumulative_km: float = 0
    cumulative_mins: float = 0


class RouteOptimizationResponse(BaseModel):
    optimized_route: List[RouteStop]
    total_distance_km: float
    total_time_mins: float
    fuel_cost_inr: float
    co2_emission_kg: float
    solver: str


# ════════════════════════════════════════════
#  ML — FOOD CLASSIFICATION
# ════════════════════════════════════════════
class FoodClassificationRequest(BaseModel):
    description: str = Field(min_length=3, max_length=1000)


class FoodCategoryScore(BaseModel):
    category: str
    confidence: float
    matched_keywords: List[str]


class FoodClassificationResponse(BaseModel):
    description: str
    primary_category: str
    confidence: float
    all_scores: List[FoodCategoryScore]
    is_vegetarian: bool
    shelf_life_hours: int
    storage_recommendation: str
    model_version: str


# ════════════════════════════════════════════
#  ML — ETA PREDICTION
# ════════════════════════════════════════════
class ETAPredictionRequest(BaseModel):
    distance_km: Optional[float] = Field(None, ge=0, description="Direct distance. Computed from lat/lng if omitted.")
    hour_of_day: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    pickup_lat: Optional[float] = Field(None, ge=-90, le=90)
    pickup_lng: Optional[float] = Field(None, ge=-180, le=180)
    dropoff_lat: Optional[float] = Field(None, ge=-90, le=90)
    dropoff_lng: Optional[float] = Field(None, ge=-180, le=180)


class ETAPredictionResponse(BaseModel):
    eta_minutes: float
    confidence: float
    confidence_interval: Dict[str, float]
    distance_km: float
    traffic_factor: float
    traffic_description: str
    model_version: str


# ════════════════════════════════════════════
#  IMPACT / ANALYTICS
# ════════════════════════════════════════════
class ImpactDashboard(BaseModel):
    total_kg_saved: float
    total_meals_served: int
    total_co2_saved_kg: float
    total_water_saved_liters: float
    total_money_saved_inr: float
    active_restaurants: int
    active_ngos: int
    active_drivers: int
    avg_delivery_time_mins: float
    active_orders: int
    today_kg_saved: float
    today_meals: int
    # Extra analytics
    pending_orders: int = 0
    delivered_today: int = 0
    top_restaurant: Optional[str] = None
    top_ngo: Optional[str] = None
    success_rate: float = 0.0              # delivered / (delivered + expired) %
    avg_response_time_mins: float = 0.0    # avg(accepted_at - created_at)


class ImpactHistoryItem(BaseModel):
    date: str
    kg_saved: float
    meals_served: int
    co2_saved: float
    water_saved: float
    money_saved: float
    restaurants: int = 0
    ngos: int = 0
    drivers: int = 0


class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    name: str
    value: float
    metric: str


# ════════════════════════════════════════════
#  NOTIFICATIONS
# ════════════════════════════════════════════
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    reference_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ════════════════════════════════════════════
#  ADMIN
# ════════════════════════════════════════════
class AdminStats(BaseModel):
    total_users: int
    total_restaurants: int
    total_ngos: int
    total_drivers: int
    total_orders: int
    orders_by_status: Dict[str, int]
    revenue_total: float
    avg_rating: float
    success_rate: float = 0.0              # delivered / (delivered + expired) %
    avg_response_time_mins: float = 0.0    # avg(accepted_at - created_at)
    total_food_rescued_kg: float = 0.0     # cumulative rescued
    active_donations: int = 0              # real-time active count
    temp_safety_breaches: int = 0          # total temp alerts triggered


# ════════════════════════════════════════════
#  WEBSOCKET
# ════════════════════════════════════════════
class DriverLocationUpdate(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    heading: float = 0
    speed: float = 0


class WSMessage(BaseModel):
    type: str
    payload: Dict[str, Any] = {}
