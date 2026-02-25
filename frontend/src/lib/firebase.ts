/**
 * Firebase Configuration — Real-time Live Map Tracking ONLY
 * ==========================================================
 * Uses Firebase Firestore (FREE tier) for:
 *   → Real-time live map tracking
 *   → Driver GPS updates every 10 seconds
 *
 * All other data (auth, donations, etc.) lives in Appwrite/FastAPI.
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  GeoPoint,
  Timestamp,
  updateDoc,
  getDoc,
  getDocs,
} from 'firebase/firestore';

// ── Firebase Configuration ──────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn('[Firebase] Missing VITE_FIREBASE_API_KEY — create a .env file in /frontend');
}

// ── Initialize Firebase ─────────────────────────────────────
const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

// ── Collection References ───────────────────────────────────
const DRIVER_LOCATIONS_COL = 'driver_locations';
const ACTIVE_DELIVERIES_COL = 'active_deliveries';
const DELIVERY_ROUTES_COL = 'delivery_routes';

// ── Types ───────────────────────────────────────────────────
export interface DriverLocation {
  driver_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  vehicle_type: string;
  is_available: boolean;
  current_order_id?: string;
  updated_at: any;
}

export interface ActiveDelivery {
  delivery_id: string;
  donation_id: string;
  driver_id: string;
  driver_name: string;
  restaurant_name: string;
  ngo_name: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  driver_lat: number;
  driver_lng: number;
  status: string; // assigned | picked_up | in_transit | delivered
  eta_minutes: number;
  distance_km: number;
  food_description: string;
  quantity_kg: number;
  created_at: any;
  updated_at: any;
}

// ── Driver GPS Tracking Service ─────────────────────────────
export const firebaseTracking = {
  /**
   * Update driver GPS position (called every 10 seconds from driver app)
   */
  async updateDriverLocation(data: {
    driver_id: string;
    driver_name: string;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    vehicle_type: string;
    is_available: boolean;
    current_order_id?: string;
  }) {
    try {
      const docRef = doc(firestore, DRIVER_LOCATIONS_COL, data.driver_id);
      await setDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating driver location:', error);
      return false;
    }
  },

  /**
   * Subscribe to real-time driver locations (for live map)
   */
  subscribeToDriverLocations(callback: (drivers: DriverLocation[]) => void) {
    const q = collection(firestore, DRIVER_LOCATIONS_COL);
    return onSnapshot(q, (snapshot) => {
      const drivers: DriverLocation[] = [];
      snapshot.forEach((doc) => {
        drivers.push({ ...doc.data() } as DriverLocation);
      });
      callback(drivers);
    });
  },

  /**
   * Subscribe to a specific driver's location (for order tracking)
   */
  subscribeToDriverLocation(driverId: string, callback: (location: DriverLocation | null) => void) {
    const docRef = doc(firestore, DRIVER_LOCATIONS_COL, driverId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as DriverLocation);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Create/update an active delivery for live tracking
   */
  async upsertActiveDelivery(data: ActiveDelivery) {
    try {
      const docRef = doc(firestore, ACTIVE_DELIVERIES_COL, data.delivery_id);
      await setDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error upserting delivery:', error);
      return false;
    }
  },

  /**
   * Subscribe to all active deliveries (for map overlay)
   */
  subscribeToActiveDeliveries(callback: (deliveries: ActiveDelivery[]) => void) {
    const q = query(
      collection(firestore, ACTIVE_DELIVERIES_COL),
      where('status', 'in', ['assigned', 'picked_up', 'in_transit'])
    );
    return onSnapshot(q, (snapshot) => {
      const deliveries: ActiveDelivery[] = [];
      snapshot.forEach((doc) => {
        deliveries.push({ delivery_id: doc.id, ...doc.data() } as ActiveDelivery);
      });
      callback(deliveries);
    });
  },

  /**
   * Subscribe to a specific delivery (order detail view)
   */
  subscribeToDelivery(deliveryId: string, callback: (delivery: ActiveDelivery | null) => void) {
    const docRef = doc(firestore, ACTIVE_DELIVERIES_COL, deliveryId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ delivery_id: snapshot.id, ...snapshot.data() } as ActiveDelivery);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Simulate driver GPS updates every 10 seconds (for demo)
   * Moves driver along a path between pickup and dropoff
   */
  startDriverSimulation(driverId: string, driverName: string, pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 0.02; // ~50 updates = 500s = ~8min journey
      if (progress >= 1) {
        clearInterval(interval);
        progress = 1;
      }

      // Lerp between pickup and dropoff
      const lat = pickupLat + (dropoffLat - pickupLat) * progress;
      const lng = pickupLng + (dropoffLng - pickupLng) * progress;

      // Calculate heading
      const heading = Math.atan2(dropoffLng - pickupLng, dropoffLat - pickupLat) * (180 / Math.PI);

      await firebaseTracking.updateDriverLocation({
        driver_id: driverId,
        driver_name: driverName,
        lat,
        lng,
        heading: heading >= 0 ? heading : heading + 360,
        speed: progress < 1 ? 25 + Math.random() * 10 : 0,
        vehicle_type: 'bike',
        is_available: false,
        current_order_id: `order_${driverId}`,
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  },
};

export default app;
