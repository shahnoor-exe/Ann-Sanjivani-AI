"""Quick smoke test for all API endpoints."""
import urllib.request, urllib.error, json, sys

BASE = "http://localhost:8000"
OK = 0
FAIL = 0

def get(path):
    r = urllib.request.urlopen(BASE + path)
    return json.loads(r.read())

def get_auth(path, token):
    req = urllib.request.Request(BASE + path, headers={"Authorization": "Bearer " + token})
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def post(path, body, token=None):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method="POST")
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def patch(path, body, token):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Authorization": "Bearer " + token}
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method="PATCH")
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

def check(label, fn):
    global OK, FAIL
    try:
        result = fn()
        print(f"  OK  {label}")
        OK += 1
        return result
    except Exception as e:
        print(f"  FAIL {label}: {e}")
        FAIL += 1
        return None

print("=" * 50)
print("FOOD RESCUE PLATFORM — API SMOKE TEST")
print("=" * 50)

# Health
check("GET /health", lambda: get("/health"))

# Auth
rest_token = None
admin_token = None
check("POST /auth/login (restaurant)", lambda: post("/api/v1/auth/login", {"email": "restaurant1@foodrescue.in", "password": "demo123"}))
resp = post("/api/v1/auth/login", {"email": "restaurant1@foodrescue.in", "password": "demo123"})
rest_token = resp["access_token"]
resp2 = post("/api/v1/auth/login", {"email": "admin@foodrescue.in", "password": "admin123"})
admin_token = resp2["access_token"]

check("GET /auth/me", lambda: get_auth("/api/v1/auth/me", rest_token))
check("PATCH /auth/me", lambda: patch("/api/v1/auth/me", {"full_name": "Taj Palace Kitchen Manager"}, rest_token))

# Restaurants
check("GET /restaurants", lambda: get("/api/v1/restaurants"))
check("GET /restaurants/1", lambda: get("/api/v1/restaurants/1"))
check("PATCH /restaurants/1", lambda: patch("/api/v1/restaurants/1", {"cuisine_type": "Multi-cuisine Fine Dining"}, rest_token))

# NGOs
check("GET /ngos", lambda: get("/api/v1/ngos"))
check("GET /ngos/1", lambda: get("/api/v1/ngos/1"))

# Drivers
check("GET /drivers", lambda: get("/api/v1/drivers"))
check("GET /drivers?available_only=true", lambda: get("/api/v1/drivers?available_only=true"))
check("GET /drivers/1", lambda: get("/api/v1/drivers/1"))

# Surplus
check("GET /surplus", lambda: get("/api/v1/surplus"))
check("GET /surplus?status=delivered", lambda: get("/api/v1/surplus?status=delivered"))
check("GET /surplus/1", lambda: get("/api/v1/surplus/1"))
check("POST /surplus (create order)", lambda: post("/api/v1/surplus", {
    "food_description": "Paneer Tikka + Butter Naan (25 servings)",
    "food_category": "veg",
    "quantity_kg": 12.5,
    "servings": 25,
    "expiry_hours": 3,
}, rest_token))

# ML
check("POST /ml/predict-surplus", lambda: post("/api/v1/ml/predict-surplus", {
    "day_of_week": 5, "guest_count": 150, "event_type": "festival", "weather": "rain"
}))
check("POST /ml/optimize-route", lambda: post("/api/v1/ml/optimize-route", {
    "driver_lat": 19.076, "driver_lng": 72.8777,
    "pickups": [{"lat": 18.9217, "lng": 72.8332, "name": "Taj", "order_id": 1}],
    "dropoffs": [{"lat": 19.0988, "lng": 72.8315, "name": "Akshaya", "order_id": 1}],
}))
check("POST /ml/classify-food", lambda: post("/api/v1/ml/classify-food", {
    "description": "Chicken Biryani with Raita and Gulab Jamun"
}))

# Impact
check("GET /impact/dashboard", lambda: get("/api/v1/impact/dashboard"))
check("GET /impact/history", lambda: get("/api/v1/impact/history?days=7"))
check("GET /impact/leaderboard (restaurant)", lambda: get("/api/v1/impact/leaderboard?entity=restaurant&limit=5"))
check("GET /impact/leaderboard (ngo)", lambda: get("/api/v1/impact/leaderboard?entity=ngo&limit=5"))
check("GET /impact/leaderboard (driver)", lambda: get("/api/v1/impact/leaderboard?entity=driver&limit=5"))

# Notifications
check("GET /notifications", lambda: get_auth("/api/v1/notifications", rest_token))
check("GET /notifications?unread_only=true", lambda: get_auth("/api/v1/notifications?unread_only=true", rest_token))

# Admin
check("GET /admin/stats", lambda: get_auth("/api/v1/admin/stats", admin_token))
check("GET /admin/activity-log", lambda: get_auth("/api/v1/admin/activity-log", admin_token))

# Tracking
check("GET /tracking/active-jobs", lambda: get("/api/v1/tracking/active-jobs"))
check("GET /tracking/all-locations", lambda: get("/api/v1/tracking/all-locations"))

print()
print("=" * 50)
print(f"RESULTS:  {OK} passed,  {FAIL} failed")
print("=" * 50)
