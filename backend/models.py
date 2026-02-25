"""
Food Rescue Platform — SQLAlchemy ORM Models
Covers: Users, Restaurants, NGOs, Drivers, Surplus Requests,
        Impact Metrics, Notifications, Activity Logs.
"""
import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship
from database import Base


# ─── Enums ────────────────────────────────────────
class UserRole(str, enum.Enum):
    RESTAURANT = "restaurant"
    NGO = "ngo"
    DRIVER = "driver"
    ADMIN = "admin"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class FoodCategory(str, enum.Enum):
    VEG = "veg"
    NON_VEG = "non_veg"
    MIXED = "mixed"
    RICE = "rice"
    BREAD = "bread"
    CURRY = "curry"
    SNACKS = "snacks"
    SWEETS = "sweets"


class NotificationType(str, enum.Enum):
    NEW_ORDER = "new_order"
    STATUS_UPDATE = "status_update"
    DRIVER_ASSIGNED = "driver_assigned"
    DELIVERY_COMPLETE = "delivery_complete"
    SYSTEM_ALERT = "system_alert"


# ─── User ─────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    role = Column(String(50), nullable=False, default=UserRole.RESTAURANT.value)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    restaurant = relationship("Restaurant", back_populates="user", uselist=False)
    ngo = relationship("NGO", back_populates="user", uselist=False)
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", order_by="desc(Notification.created_at)")
    activities = relationship("ActivityLog", back_populates="user", order_by="desc(ActivityLog.created_at)")


# ─── Restaurant ───────────────────────────────────
class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    cuisine_type = Column(String(100))
    fssai_license = Column(String(50))
    avg_daily_surplus_kg = Column(Float, default=0)
    rating = Column(Float, default=4.5)
    total_donations = Column(Integer, default=0)
    total_kg_saved = Column(Float, default=0)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="restaurant")
    surplus_requests = relationship("SurplusRequest", back_populates="restaurant")

    __table_args__ = (Index("ix_restaurant_city_verified", "city", "is_verified"),)


# ─── NGO ──────────────────────────────────────────
class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_kg = Column(Float, default=100)
    people_served_daily = Column(Integer, default=0)
    preferred_categories = Column(String(255), default="veg,mixed")
    rating = Column(Float, default=4.5)
    total_received = Column(Integer, default=0)
    total_kg_received = Column(Float, default=0)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="ngo")
    assigned_requests = relationship("SurplusRequest", back_populates="assigned_ngo")


# ─── Driver ───────────────────────────────────────
class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    vehicle_type = Column(String(50), default="bike")
    license_number = Column(String(50))
    city = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, default=0)
    longitude = Column(Float, default=0)
    is_available = Column(Boolean, default=True)
    is_online = Column(Boolean, default=True)
    current_order_id = Column(Integer, nullable=True)
    total_deliveries = Column(Integer, default=0)
    total_kg_delivered = Column(Float, default=0)
    rating = Column(Float, default=4.8)
    earnings_total = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="driver_profile")
    deliveries = relationship("SurplusRequest", back_populates="assigned_driver")

    __table_args__ = (Index("ix_driver_available", "city", "is_available", "is_online"),)


# ─── Surplus Request (core order entity) ──────────
class SurplusRequest(Base):
    __tablename__ = "surplus_requests"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)

    food_description = Column(Text, nullable=False)
    food_category = Column(String(50), default=FoodCategory.MIXED.value)
    quantity_kg = Column(Float, nullable=False)
    predicted_quantity_kg = Column(Float, nullable=True)
    servings = Column(Integer, default=0)
    photo_url = Column(String(500))

    status = Column(String(50), default=OrderStatus.PENDING.value, index=True)
    pickup_time = Column(DateTime)
    delivery_time = Column(DateTime)
    expiry_time = Column(DateTime)

    temperature_ok = Column(Boolean, default=True)
    temperature_celsius = Column(Float, nullable=True)   # actual temp reading
    food_condition = Column(String(50), default="cooked") # cooked/packaged/hot/cold
    quality_rating = Column(Integer, default=5)
    feedback_note = Column(Text, nullable=True)
    temp_safety_alert = Column(Boolean, default=False)    # True if threshold breached

    accepted_at = Column(DateTime, nullable=True)         # when NGO accepted

    pickup_lat = Column(Float)
    pickup_lng = Column(Float)
    dropoff_lat = Column(Float)
    dropoff_lng = Column(Float)
    donor_lat = Column(Float, nullable=True)              # geolocation auto-capture
    donor_lng = Column(Float, nullable=True)              # geolocation auto-capture
    distance_km = Column(Float, default=0)
    eta_minutes = Column(Integer, default=0)

    driver_payment = Column(Float, default=0)
    payment_status = Column(String(50), default="pending")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="surplus_requests")
    assigned_ngo = relationship("NGO", back_populates="assigned_requests")
    assigned_driver = relationship("Driver", back_populates="deliveries")

    __table_args__ = (
        Index("ix_surplus_status_created", "status", "created_at"),
        Index("ix_surplus_restaurant_status", "restaurant_id", "status"),
    )


# ─── Impact Metrics (daily aggregate) ────────────
class ImpactMetric(Base):
    __tablename__ = "impact_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    city = Column(String(100), default="Mumbai")
    total_kg_saved = Column(Float, default=0)
    total_meals_served = Column(Integer, default=0)
    total_co2_saved_kg = Column(Float, default=0)
    total_water_saved_liters = Column(Float, default=0)
    total_money_saved_inr = Column(Float, default=0)
    active_restaurants = Column(Integer, default=0)
    active_ngos = Column(Integer, default=0)
    active_drivers = Column(Integer, default=0)
    avg_delivery_time_mins = Column(Float, default=0)


# ─── Notification ─────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), default=NotificationType.SYSTEM_ALERT.value)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ─── Activity Log ─────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="activities")
