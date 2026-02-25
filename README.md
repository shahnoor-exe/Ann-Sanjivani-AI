<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=28&pause=1000&color=22C55E&center=true&vCenter=true&width=700&lines=Ann-Sanjivani+AI+%F0%9F%8D%9D;Food+Rescue+Platform;Zero-Hunger+City+%C2%B7+AI-Powered;Built+at+Stack+Sprint+Hackathon+2026" alt="Typing SVG" />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://ann-sanjivani-ai.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-purple?style=for-the-badge&logo=railway)](https://railway.app)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

# 🍽️ Ann-Sanjivani AI — Food Rescue Platform

> **AI-powered food waste prevention & redistribution platform** that connects restaurants with surplus food to NGOs and hunger-relief organizations — powered by 4 real ML models, real-time tracking, and a beautiful multi-language UI.

Built by **Team CoderPirates** at **Stack Sprint Hackathon 2026** · India's zero-hunger tech challenge.

---

## 🌟 The Problem

India wastes **68 million tonnes** of food annually while **190 million people** go hungry every day.

The core issues:
- Restaurants have surplus food but **no easy way to donate** it
- NGOs need food but **don't know what's available** or when
- Drivers can help but **lack route optimization**
- No **intelligent coordination layer** exists between all three

Ann-Sanjivani AI solves this with a full-stack AI platform that automates the entire rescue pipeline.


---

## ✨ Key Features

| Feature | Description | Technology |
|---|---|---|
| 🤖 **Surplus Prediction** | Predicts how much food will be surplus based on day, weather, events | XGBoost (6-feature regression) |
| 🗺️ **Route Optimization** | Finds the optimal delivery route for drivers across multiple pickups | Google OR-Tools VRP + 2-opt |
| 🍲 **Food Classification** | Classifies food type, dietary tags, and quality from text/image | IndicBERT NLP + ViT Image |
| ⏱️ **ETA Prediction** | Predicts delivery time using traffic & location patterns | LSTM (Keras/TensorFlow) |
| 🔐 **Role-Based Auth** | Separate dashboards for Restaurant, NGO, Driver, Admin | FastAPI JWT + Appwrite |
| 📡 **Real-Time Tracking** | Live order status updates pushed via WebSocket | FastAPI WebSocket |
| 🌍 **6 Languages** | Full UI in English, Hindi, Bengali, Tamil, Marathi, French | i18next |
| 📊 **Impact Dashboard** | Live stats: kg saved, meals served, CO₂ prevented, value recovered | Recharts + FastAPI |
| 🔥 **Firebase Tracking** | Real-time GPS driver tracking on map | Firebase Firestore |
| ☁️ **Appwrite Cloud** | Cloud user auth and database sync | Appwrite SDK |

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────┐
│               React 18 + TypeScript + Vite         │
│  TailwindCSS · Framer Motion · Zustand · Lucide    │
│  i18next (6 languages) · React Router v6           │
├───────────────────────────────────────────────────┤
│               FastAPI v2 Backend                   │
│  SQLAlchemy 2.0 Async · JWT Auth · WebSocket       │
│  Appwrite SDK · Firebase Admin                     │
├──────────┬──────────────┬───────────┬─────────────┤
│ XGBoost  │  Google      │ IndicBERT │ Keras LSTM  │
│ Surplus  │  OR-Tools    │ + ViT     │ ETA         │
│ Predictor│  Route VRP   │ Classifier│ Predictor   │
├──────────┴──────────────┴───────────┴─────────────┤
│     SQLite (dev) / PostgreSQL (production)         │
│     Appwrite Cloud · Firebase Firestore            │
└───────────────────────────────────────────────────┘
```

---

## 🤖 ML Models (4 Real Models)

### 1. Surplus Predictor — `surplus_model.pkl`
- **Type:** XGBRegressor
- **Features:** `day_of_week`, `guest_count`, `event_type`, `weather`, `base_surplus_kg`, `cuisine_type`
- **Output:** Predicted surplus in kg + confidence + category breakdown
- **Label encoders:** `le_cuisine.pkl`, `le_event.pkl`

### 2. Route Optimizer — Google OR-Tools
- **Type:** VRP (Vehicle Routing Problem) solver + 2-opt local search
- **Input:** List of pickup/dropoff coordinates
- **Output:** Optimal route order + total distance + estimated time

### 3. Food Classifier — `food_classifier.pkl`
- **Type:** ViT (Vision Transformer) image pipeline + IndicBERT NLP
- **Input:** Food description text or image URL
- **Output:** Category, dietary tags (veg/non-veg/vegan), quality score, safety flag

### 4. ETA Predictor — `eta_model.h5`
- **Type:** Keras LSTM (sequence model, loaded with `compile=False`)
- **Input:** Distance, time of day, traffic zone, weather
- **Output:** Predicted ETA in minutes

---

## 🚀 Quick Start (Single Command)

### Windows — Double-click or run in terminal:
```batch
start.bat
```
Or from PowerShell:
```powershell
.\start.ps1
```

This auto-detects your Python venv, installs all dependencies, starts the backend on port **8001** and frontend on port **5173**, and opens the browser.

---

### Manual Setup

#### Prerequisites
- Python **3.10+**
- Node.js **18+**
- npm

#### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

#### Docker (Full Stack)
```bash
docker-compose up --build
```

---

## 🔑 Demo Credentials

| Role | Email | Password | What you see |
|---|---|---|---|
| 🍽️ **Restaurant** | `restaurant1@foodrescue.in` | `demo123` | Surplus form, ML prediction, order history |
| 🤝 **NGO** | `ngo1@foodrescue.in` | `demo123` | Incoming donations, acceptance dashboard |
| 🚗 **Driver** | `driver1@foodrescue.in` | `demo123` | Delivery queue, route map, toggle online |
| 🛡️ **Admin** | `admin@foodrescue.in` | `admin123` | All orders, all users, system stats |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | JWT login |
| GET  | `/api/v1/auth/me` | Get current user |
| GET  | `/api/v1/auth/role-data` | Role-specific dashboard data |

### Surplus Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/surplus` | Create surplus request |
| GET  | `/api/v1/surplus` | List all surplus (admin) |
| GET  | `/api/v1/surplus/my-orders` | Role-scoped order list |
| GET  | `/api/v1/surplus/{id}` | Get single order |
| PATCH| `/api/v1/surplus/{id}/status` | Update status |

### ML Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/ml/predict-surplus` | XGBoost surplus prediction |
| POST | `/api/v1/ml/optimize-route` | OR-Tools route optimization |
| POST | `/api/v1/ml/classify-food` | IndicBERT + ViT food classification |
| POST | `/api/v1/ml/predict-eta` | LSTM ETA prediction |

### Tracking & Impact
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/v1/tracking/active-jobs` | Live deliveries |
| GET  | `/api/v1/tracking/all-locations` | Restaurant/NGO/driver locations |
| GET  | `/api/v1/impact/dashboard` | Aggregate impact stats |
| GET  | `/api/v1/impact/history` | Daily history (30d) |
| WS   | `/ws/{client_id}` | Real-time order updates |

Full interactive docs at **http://localhost:8001/docs** (Swagger UI)

---

## 🛠️ Full Tech Stack

### Frontend
| | |
|---|---|
| React 18 + TypeScript | Core UI framework |
| Vite 6 | Build tool & HMR dev server |
| TailwindCSS 3 | Utility-first styling |
| Framer Motion | Animations & transitions |
| Zustand | Global state management |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| i18next | Internationalization (6 languages) |
| Lucide React | Icon library |
| React Hot Toast | Notifications |
| Appwrite SDK | Cloud auth & database |
| Firebase SDK | Realtime GPS tracking |

### Backend
| | |
|---|---|
| FastAPI 0.115 | Async Python web framework |
| SQLAlchemy 2.0 Async | ORM with async support |
| aiosqlite | Async SQLite driver |
| python-jose | JWT token auth |
| bcrypt / passlib | Password hashing |
| Pydantic v2 | Data validation & schemas |
| WebSocket (starlette) | Real-time order updates |
| Uvicorn | ASGI server |

### ML / AI
| | |
|---|---|
| XGBoost | Surplus quantity regression |
| Google OR-Tools | Vehicle routing optimization |
| Transformers (HuggingFace) | IndicBERT NLP + ViT image |
| TensorFlow / Keras | LSTM ETA prediction model |
| NumPy / scikit-learn | Feature engineering & label encoding |

### Cloud & DevOps
| | |
|---|---|
| Appwrite | User auth + cloud database |
| Firebase Firestore | GPS tracking data |
| Docker + Docker Compose | Containerization |
| Nginx | Frontend reverse proxy (Docker) |
| Vercel | Frontend deployment |
| Railway | Backend deployment |

---

## 🌐 Environment Variables

### Frontend — `frontend/.env`
```env
VITE_API_URL=http://localhost:8001
VITE_APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=ann-sajivaniai
VITE_APPWRITE_DATABASE_ID=food_rescue_db
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=ann-sanjivani-ai
```

### Backend — `backend/.env` (optional, uses defaults)
```env
DATABASE_URL=sqlite+aiosqlite:///./food_rescue.db
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173
```

---

## 📁 Project Structure

```
food-rescue-platform/
├── start.bat              ← Double-click to launch everything
├── start.ps1              ← PowerShell launcher
├── docker-compose.yml
├── backend/
│   ├── main.py            ← FastAPI app + all routes (~1500 lines)
│   ├── ml_service.py      ← 4 ML model integrations
│   ├── models.py          ← SQLAlchemy ORM models
│   ├── schemas.py         ← Pydantic request/response schemas
│   ├── auth.py            ← JWT authentication
│   ├── config.py          ← App configuration
│   ├── database.py        ← Async DB session
│   ├── seed_data.py       ← Demo data seeder
│   ├── requirements.txt
│   ├── Procfile           ← Railway/Heroku deploy
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts           ← All API calls
    │   ├── store.ts         ← Zustand global state
    │   ├── main.tsx
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   └── CountUpNumber.tsx
    │   ├── pages/
    │   │   ├── LandingPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── SurplusPage.tsx   ← Create + view order history
    │   │   ├── TrackingPage.tsx
    │   │   ├── ImpactPage.tsx
    │   │   └── AIDemo.tsx        ← Live ML model playground
    │   ├── lib/
    │   │   ├── appwrite.ts
    │   │   └── firebase.ts
    │   └── i18n/
    │       └── locales/          ← en, hi, bn, ta, mr, fr
    ├── vercel.json
    └── Dockerfile
```

---

## 🎨 UI / Design Highlights

- **Glass-morphism** cards with frosted-glass backdrop blur
- **Gradient text** with animated glow effects
- **15+ custom CSS animations:** float, pulse-glow, shimmer, blob, wave, truck-drive
- **Dark-mode optimized** color palette (slate-950 base)
- **Responsive mobile-first** design
- **Smooth page transitions** via Framer Motion
- **Live order status stepper** with real-time polling

---

## 📊 Impact Metrics (Tracked Live)

| Metric | Unit |
|---|---|
| Food rescued | kg |
| Meals served | count |
| CO₂ emissions prevented | kg |
| Water saved | liters |
| Money value recovered | ₹ INR |
| Delivery time | minutes avg |

---

## 👨‍💻 Team

**Team CoderPirates** — Stack Sprint Hackathon 2026

| Name | Role |
|---|---|
| Shahnoor Ahmed Laskar | Full-Stack + ML Integration |
| Ayan Laskar | Backend + Database |

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

*Building a Zero-Hunger Future, One Meal at a Time* 🌍

[![GitHub Stars](https://img.shields.io/github/stars/shahnoor-exe/Ann-Sanjivani-AI?style=social)](https://github.com/shahnoor-exe/Ann-Sanjivani-AI)

</div>

