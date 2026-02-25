"""
Seed data for demo — realistic Mumbai restaurants, NGOs, and drivers.
Now populates new fields: fssai_license, preferred_categories, servings,
feedback_note, current_order_id, Notification rows.
"""
import datetime
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import (
    User, Restaurant, NGO, Driver, SurplusRequest, ImpactMetric,
    Notification, ActivityLog, OrderStatus, NotificationType,
)
from auth import hash_password

# ── Static data ──────────────────────────────────
MUMBAI_RESTAURANTS = [
    {"name": "Taj Palace Kitchen",     "address": "Apollo Bunder, Colaba",        "lat": 18.9217, "lng": 72.8332, "cuisine": "Multi-cuisine",   "surplus": 45, "fssai": "MH-11321004000123"},
    {"name": "Spice Garden",           "address": "Bandra West, Linking Rd",      "lat": 19.0596, "lng": 72.8295, "cuisine": "North Indian",    "surplus": 25, "fssai": "MH-11321004000234"},
    {"name": "Mumbai Masala House",    "address": "Juhu Beach Road",              "lat": 19.0948, "lng": 72.8267, "cuisine": "Street Food",     "surplus": 35, "fssai": "MH-11321004000345"},
    {"name": "Royal Biryani Centre",   "address": "Mohammed Ali Road",            "lat": 18.9552, "lng": 72.8371, "cuisine": "Mughlai",         "surplus": 30, "fssai": "MH-11321004000456"},
    {"name": "Green Leaf Restaurant",  "address": "Andheri East, MIDC",           "lat": 19.1136, "lng": 72.8697, "cuisine": "South Indian",    "surplus": 20, "fssai": "MH-11321004000567"},
    {"name": "Hotel Saffron",          "address": "Lower Parel, Phoenix Mills",   "lat": 18.9930, "lng": 72.8263, "cuisine": "Continental",     "surplus": 40, "fssai": "MH-11321004000678"},
    {"name": "Dosa Plaza Express",     "address": "Dadar TT Circle",             "lat": 19.0178, "lng": 72.8478, "cuisine": "South Indian",    "surplus": 15, "fssai": "MH-11321004000789"},
    {"name": "Punjabi Dhaba Premium",  "address": "Powai, Hiranandani",          "lat": 19.1176, "lng": 72.9060, "cuisine": "Punjabi",         "surplus": 28, "fssai": "MH-11321004000890"},
    {"name": "Coastal Kitchen",        "address": "Versova, 4 Bungalows",        "lat": 19.1310, "lng": 72.8138, "cuisine": "Seafood",         "surplus": 22, "fssai": "MH-11321004000901"},
    {"name": "Grand Bhoj Thali",       "address": "Thane West, Viviana",         "lat": 19.2094, "lng": 72.9637, "cuisine": "Gujarati Thali",  "surplus": 50, "fssai": "MH-11321004001012"},
]

MUMBAI_NGOS = [
    {"name": "Akshaya Patra Foundation", "address": "HKC Complex, Juhu",                "lat": 19.0988, "lng": 72.8315, "capacity": 200, "people": 500, "pref": "veg,rice,curry"},
    {"name": "Robin Hood Army Mumbai",   "address": "Bandra East, BKC",                 "lat": 19.0650, "lng": 72.8646, "capacity": 150, "people": 350, "pref": "veg,mixed,bread"},
    {"name": "Feeding India (Zomato)",   "address": "Andheri West, DN Nagar",            "lat": 19.1268, "lng": 72.8325, "capacity": 300, "people": 800, "pref": "veg,non_veg,rice"},
    {"name": "Roti Bank Mumbai",         "address": "Dadar West, Shivaji Park",          "lat": 19.0233, "lng": 72.8388, "capacity": 100, "people": 250, "pref": "bread,curry"},
    {"name": "Annakshetra Trust",        "address": "Borivali East, National Park",      "lat": 19.2312, "lng": 72.8567, "capacity": 250, "people": 600, "pref": "veg,mixed"},
    {"name": "Mumbai Seva Foundation",   "address": "Worli Sea Face",                    "lat": 19.0076, "lng": 72.8154, "capacity": 120, "people": 300, "pref": "veg,sweets"},
    {"name": "No Food Waste India",      "address": "Goregaon West, SV Road",            "lat": 19.1637, "lng": 72.8489, "capacity": 180, "people": 450, "pref": "mixed,snacks"},
    {"name": "Meals of Happiness",       "address": "Malad West, Evershine",             "lat": 19.1869, "lng": 72.8363, "capacity": 160, "people": 400, "pref": "veg,rice,curry"},
]

DRIVER_NAMES = [
    "Rajesh Kumar", "Amit Sharma", "Suresh Patel", "Priya Singh",
    "Vikram Yadav", "Deepak Joshi", "Anita Desai", "Manoj Tiwari",
    "Sanjay Mishra", "Kavita Nair", "Rahul Verma", "Pooja Gupta",
]

FOOD_ITEMS = [
    ("Dal Makhani + Jeera Rice (50 servings)",          "curry",  25, 50),
    ("Paneer Butter Masala + Naan (30 servings)",       "veg",    15, 30),
    ("Chicken Biryani (40 servings)",                   "rice",   20, 40),
    ("Mixed Veg Thali plates (60 servings)",            "mixed",  30, 60),
    ("Idli Sambar + Chutney (80 servings)",             "veg",    18, 80),
    ("Rajma Chawal (45 servings)",                      "curry",  22, 45),
    ("Pav Bhaji (35 servings)",                         "snacks", 12, 35),
    ("Gulab Jamun + Kheer (dessert, 50 servings)",      "sweets", 10, 50),
    ("Chole Bhature (40 servings)",                     "curry",  20, 40),
    ("Veg Pulao + Raita (55 servings)",                 "rice",   28, 55),
]

FEEDBACK_NOTES = [
    "Food was excellent quality, well-packaged.",
    "Delivered warm, very satisfied!",
    "Slightly delayed but food was fresh.",
    "Great coordination between restaurant and driver.",
    "Packaging could be improved. Food quality OK.",
    None, None, None,  # some orders have no feedback
]


async def seed_database(db: AsyncSession):
    """Seeds the database with rich demo data."""
    result = await db.execute(select(func.count()).select_from(User))
    if result.scalar() > 0:
        print("Database already seeded, skipping...")
        return

    print("🌱 Seeding database with demo data...")

    restaurants: list = []
    ngos: list = []
    drivers: list = []

    # ── Restaurant users & profiles ──────────────
    for i, r in enumerate(MUMBAI_RESTAURANTS):
        user = User(
            email=f"restaurant{i+1}@foodrescue.in",
            hashed_password=hash_password("demo123"),
            full_name=f"{r['name']} Manager",
            phone=f"+9198{random.randint(10000000, 99999999)}",
            role="restaurant",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        restaurant = Restaurant(
            user_id=user.id,
            name=r["name"],
            address=r["address"],
            city="Mumbai",
            latitude=r["lat"],
            longitude=r["lng"],
            cuisine_type=r["cuisine"],
            fssai_license=r["fssai"],
            avg_daily_surplus_kg=r["surplus"],
            rating=round(random.uniform(4.0, 5.0), 1),
            total_donations=random.randint(50, 300),
            total_kg_saved=round(random.uniform(500, 5000), 1),
            is_verified=True,
        )
        db.add(restaurant)
        await db.flush()
        restaurants.append(restaurant)

    # ── NGO users & profiles ─────────────────────
    for i, n in enumerate(MUMBAI_NGOS):
        user = User(
            email=f"ngo{i+1}@foodrescue.in",
            hashed_password=hash_password("demo123"),
            full_name=f"{n['name']} Coordinator",
            phone=f"+9199{random.randint(10000000, 99999999)}",
            role="ngo",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        ngo = NGO(
            user_id=user.id,
            name=n["name"],
            address=n["address"],
            city="Mumbai",
            latitude=n["lat"],
            longitude=n["lng"],
            capacity_kg=n["capacity"],
            people_served_daily=n["people"],
            preferred_categories=n["pref"],
            rating=round(random.uniform(4.2, 5.0), 1),
            total_received=random.randint(40, 250),
            total_kg_received=round(random.uniform(400, 4000), 1),
            is_verified=True,
        )
        db.add(ngo)
        await db.flush()
        ngos.append(ngo)

    # ── Driver users & profiles ──────────────────
    for i, name in enumerate(DRIVER_NAMES):
        user = User(
            email=f"driver{i+1}@foodrescue.in",
            hashed_password=hash_password("demo123"),
            full_name=name,
            phone=f"+9197{random.randint(10000000, 99999999)}",
            role="driver",
            is_active=True,
        )
        db.add(user)
        await db.flush()

        driver = Driver(
            user_id=user.id,
            vehicle_type=random.choice(["bike", "auto", "van"]),
            license_number=f"MH-{random.randint(1,50):02d}-{random.choice('ABCDEFGH')}{random.choice('ABCDEFGH')}-{random.randint(1000,9999)}",
            city="Mumbai",
            latitude=19.076 + random.uniform(-0.1, 0.1),
            longitude=72.8777 + random.uniform(-0.1, 0.1),
            is_available=random.choice([True, True, True, False]),
            is_online=True,
            current_order_id=None,
            total_deliveries=random.randint(20, 200),
            total_kg_delivered=round(random.uniform(200, 3000), 1),
            rating=round(random.uniform(4.3, 5.0), 1),
            earnings_total=round(random.uniform(5000, 50000), 0),
        )
        db.add(driver)
        await db.flush()
        drivers.append(driver)

    # ── Admin user ───────────────────────────────
    admin = User(
        email="admin@foodrescue.in",
        hashed_password=hash_password("admin123"),
        full_name="Platform Admin",
        phone="+919000000000",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    await db.flush()

    # ── Surplus Requests (20 orders) ─────────────
    statuses = [
        OrderStatus.PENDING, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP,
        OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
        OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
    ]

    for i in range(20):
        food = random.choice(FOOD_ITEMS)
        rest = random.choice(restaurants)
        ngo = random.choice(ngos)
        driver = random.choice(drivers)
        stat = random.choice(statuses)
        now = datetime.datetime.utcnow()
        created = now - datetime.timedelta(hours=random.randint(1, 72))
        food_cond = random.choice(["cooked", "packaged", "hot", "cold"])
        temp_c = round(random.uniform(2, 8), 1) if food_cond == "cold" else (
            round(random.uniform(60, 80), 1) if food_cond == "hot" else
            round(random.uniform(18, 30), 1)
        )
        # Temperature safety: cold > 5°C or hot < 65°C → breach
        temp_alert = (
            (food_cond == "cold" and temp_c > 5.0) or
            (food_cond == "hot" and temp_c < 65.0)
        )

        # accepted_at: ~5-20 min after created for assigned+ orders
        accepted_at = (
            created + datetime.timedelta(minutes=random.randint(5, 20))
            if stat != OrderStatus.PENDING else None
        )

        sr = SurplusRequest(
            restaurant_id=rest.id,
            ngo_id=ngo.id if stat != OrderStatus.PENDING else None,
            driver_id=driver.id if stat not in [OrderStatus.PENDING, OrderStatus.ASSIGNED] else None,
            food_description=food[0],
            food_category=food[1],
            quantity_kg=round(food[2] + random.uniform(-3, 5), 1),
            predicted_quantity_kg=round(food[2] + random.uniform(-1, 3), 1),
            servings=food[3],
            status=stat.value,
            pickup_time=created + datetime.timedelta(minutes=30) if stat != OrderStatus.PENDING else None,
            delivery_time=created + datetime.timedelta(hours=1) if stat == OrderStatus.DELIVERED else None,
            expiry_time=created + datetime.timedelta(hours=2),  # 120 min default urgency
            temperature_ok=not temp_alert,
            temperature_celsius=temp_c,
            food_condition=food_cond,
            temp_safety_alert=temp_alert,
            accepted_at=accepted_at,
            quality_rating=random.randint(4, 5),
            feedback_note=random.choice(FEEDBACK_NOTES) if stat == OrderStatus.DELIVERED else None,
            pickup_lat=rest.latitude,
            pickup_lng=rest.longitude,
            dropoff_lat=ngo.latitude,
            dropoff_lng=ngo.longitude,
            donor_lat=rest.latitude + random.uniform(-0.001, 0.001),
            donor_lng=rest.longitude + random.uniform(-0.001, 0.001),
            distance_km=round(random.uniform(2, 15), 1),
            eta_minutes=random.randint(10, 45),
            driver_payment=round(random.uniform(50, 200), 0),
            payment_status="completed" if stat == OrderStatus.DELIVERED else "pending",
            created_at=created,
        )
        db.add(sr)

    # ── Impact Metrics (30 days) ─────────────────
    for days_ago in range(30):
        date = datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)
        daily_kg = round(random.uniform(80, 250), 1)
        db.add(ImpactMetric(
            date=date,
            city="Mumbai",
            total_kg_saved=daily_kg,
            total_meals_served=int(daily_kg * 4),
            total_co2_saved_kg=round(daily_kg * 2.5, 1),
            total_water_saved_liters=round(daily_kg * 1000, 0),
            total_money_saved_inr=round(daily_kg * 100, 0),
            active_restaurants=random.randint(6, 10),
            active_ngos=random.randint(4, 8),
            active_drivers=random.randint(5, 12),
            avg_delivery_time_mins=round(random.uniform(20, 40), 1),
        ))

    # ── Seed some notifications ──────────────────
    for rest in restaurants[:3]:
        db.add(Notification(
            user_id=rest.user_id,
            type=NotificationType.SYSTEM_ALERT.value,
            title="Welcome to Food Rescue!",
            message="Thank you for joining the platform. Start listing surplus food to reduce waste.",
        ))
    for ngo_obj in ngos[:3]:
        db.add(Notification(
            user_id=ngo_obj.user_id,
            type=NotificationType.NEW_ORDER.value,
            title="New food available nearby",
            message="A restaurant near you just listed surplus food. Check the dashboard!",
            reference_id=1,
        ))

    # ── Seed activity log ────────────────────────
    db.add(ActivityLog(
        user_id=admin.id, action="seed_database",
        entity_type="system", details="Initial demo data seeded",
    ))

    await db.commit()

    print("✅ Database seeded successfully!")
    print(f"   📍 {len(restaurants)} restaurants (with FSSAI licenses)")
    print(f"   🏢 {len(ngos)} NGOs (with preferred categories)")
    print(f"   🚗 {len(drivers)} drivers")
    print(f"   📦 20 surplus requests (with servings & feedback)")
    print(f"   📊 30 days of impact metrics")
    print(f"   🔔 {len(restaurants[:3]) + len(ngos[:3])} notifications")
    print(f"\n   Demo login: restaurant1@foodrescue.in / demo123")
    print(f"   Admin login: admin@foodrescue.in / admin123")
