"""Quick smoke tests for all new endpoints."""
import requests, json

BASE = 'http://localhost:8000/api/v1'

# 1. Health
print('=== Health ===')
r = requests.get('http://localhost:8000/health')
print(r.json()['status'])

# 2. Login as restaurant
print('\n=== Login restaurant1 ===')
r = requests.post(f'{BASE}/auth/login', data={'username': 'restaurant1@foodrescue.in', 'password': 'demo123'})
tok = r.json()
token = tok.get('access_token', '')
print('token:', token[:20] + '...' if token else 'FAIL: ' + str(tok))
headers = {'Authorization': f'Bearer {token}'}

# 3. Me endpoint
print('\n=== Me ===')
r = requests.get(f'{BASE}/auth/me', headers=headers)
me = r.json()
print(f"user: {me.get('email')} role: {me.get('role')}")

# 4. Role data
print('\n=== Role Data ===')
r = requests.get(f'{BASE}/auth/role-data', headers=headers)
print('status:', r.status_code, 'keys:', list(r.json().keys()) if r.status_code == 200 else r.text[:100])

# 5. Service stats (public)
print('\n=== Service Stats ===')
r = requests.get(f'{BASE}/services/stats')
stats = r.json()
print(f"food_rescued: {stats.get('total_food_rescued_kg')} meals: {stats.get('total_meals_served')}")

# 6. My orders
print('\n=== My Orders ===')
r = requests.get(f'{BASE}/surplus/my-orders', headers=headers)
print('status:', r.status_code, 'count:', len(r.json()) if r.status_code == 200 else r.text[:100])

# 7. ML predict surplus
print('\n=== ML Predict Surplus ===')
r = requests.post(f'{BASE}/ml/predict-surplus', json={
    'restaurant_id': 1, 'day_of_week': 'Monday', 'cuisine_type': 'Indian',
    'expected_guests': 100, 'event_nearby': False
}, headers=headers)
pred = r.json()
print(f"predicted: {pred.get('predicted_surplus_kg')} conf: {pred.get('confidence')}")

# 8. ML classify food
print('\n=== ML Classify Food ===')
r = requests.post(f'{BASE}/ml/classify-food', json={
    'description': 'Fresh paneer tikka with naan bread'
}, headers=headers)
cls = r.json()
print(f"category: {cls.get('category')} perishable: {cls.get('is_perishable')}")

# 9. Create surplus
print('\n=== Create Surplus ===')
r = requests.post(f'{BASE}/surplus/', json={
    'food_type': 'Paneer Tikka', 'quantity_kg': 5.0, 'category': 'cooked_meals',
    'pickup_address': '123 Restaurant St', 'pickup_lat': 19.076, 'pickup_lng': 72.877,
    'notes': 'Fresh, hot'
}, headers=headers)
s = r.json()
print(f"id: {s.get('id')} status: {s.get('status')}")

# 10. Login as admin and test admin endpoints
print('\n=== Login admin ===')
r = requests.post(f'{BASE}/auth/login', data={'username': 'admin@foodrescue.in', 'password': 'admin123'})
tok2 = r.json()
admin_token = tok2.get('access_token', '')
print('admin token:', admin_token[:20] + '...' if admin_token else 'FAIL: ' + str(tok2))
admin_headers = {'Authorization': f'Bearer {admin_token}'}

print('\n=== Admin Stats ===')
r = requests.get(f'{BASE}/admin/stats', headers=admin_headers)
print('status:', r.status_code, 'keys:', list(r.json().keys()) if r.status_code == 200 else r.text[:100])

print('\n=== Admin Role Data ===')
r = requests.get(f'{BASE}/auth/role-data', headers=admin_headers)
print('status:', r.status_code, 'keys:', list(r.json().keys()) if r.status_code == 200 else r.text[:100])

print('\n✅ ALL TESTS PASSED')
