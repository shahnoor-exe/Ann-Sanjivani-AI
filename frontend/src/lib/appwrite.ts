/**
 * Appwrite Configuration & Service Layer
 * ========================================
 * Handles: Auth (donor/NGO/driver/admin roles), Database (donations, deliveries, NGOs),
 *          Storage (food photos), Functions (trigger NGO notifications)
 *
 * Uses Appwrite Pro (FREE tier)
 */
import { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role } from 'appwrite';

// ── Appwrite Configuration ──────────────────────────────────
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'food_rescue_db';
const APPWRITE_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID || 'food_photos';
const APPWRITE_FUNCTION_NGO_NOTIFY = import.meta.env.VITE_APPWRITE_FN_NGO_NOTIFY || 'notify_ngo';

if (!APPWRITE_PROJECT_ID) {
  console.warn('[Appwrite] Missing VITE_APPWRITE_PROJECT_ID — create a .env file in /frontend');
}

// ── Collections ─────────────────────────────────────────────
export const COLLECTIONS = {
  DONATIONS: 'donations',
  DELIVERIES: 'deliveries',
  NGOS: 'ngos',
  DRIVERS: 'drivers',
  RESTAURANTS: 'restaurants',
  NOTIFICATIONS: 'notifications',
  IMPACT_METRICS: 'impact_metrics',
  SERVICE_HISTORY: 'service_history',
};

// ── Client Setup ────────────────────────────────────────────
const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { ID, Query };

// ── Auth Service ────────────────────────────────────────────
export const appwriteAuth = {
  /**
   * Register a new user with role label
   */
  async register(email: string, password: string, name: string, role: string) {
    try {
      const user = await account.create(ID.unique(), email, password, name);
      // Create session
      await account.createEmailPasswordSession(email, password);
      // Store role in user preferences
      await account.updatePrefs({ role, phone: '' });
      return { success: true, user, role };
    } catch (error: any) {
      console.error('Appwrite register error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Login and retrieve role from prefs
   */
  async login(email: string, password: string) {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      const prefs = await account.getPrefs();
      return { success: true, user, role: prefs.role || 'restaurant', session };
    } catch (error: any) {
      console.error('Appwrite login error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current user + role
   */
  async getCurrentUser() {
    try {
      const user = await account.get();
      const prefs = await account.getPrefs();
      return { user, role: prefs.role || 'restaurant' };
    } catch {
      return null;
    }
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await account.deleteSession('current');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Update user role (admin only in real setup)
   */
  async updateRole(role: string) {
    try {
      await account.updatePrefs({ role });
      return true;
    } catch {
      return false;
    }
  },
};

// ── Database Service ────────────────────────────────────────
export const appwriteDB = {
  /**
   * Create a new donation record
   */
  async createDonation(data: {
    restaurant_id: string;
    food_description: string;
    food_category: string;
    quantity_kg: number;
    servings: number;
    photo_url?: string;
    expiry_hours: number;
    temperature_celsius?: number;
    food_condition: string;
    donor_lat?: number;
    donor_lng?: number;
    status: string;
    restaurant_name: string;
  }) {
    try {
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.DONATIONS,
        ID.unique(),
        {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
      return { success: true, doc };
    } catch (error: any) {
      console.error('Create donation error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * List donations with optional filters
   */
  async listDonations(filters?: { status?: string; restaurant_id?: string; limit?: number }) {
    try {
      const queries: string[] = [Query.orderDesc('created_at')];
      if (filters?.status) queries.push(Query.equal('status', filters.status));
      if (filters?.restaurant_id) queries.push(Query.equal('restaurant_id', filters.restaurant_id));
      if (filters?.limit) queries.push(Query.limit(filters.limit));

      const result = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.DONATIONS,
        queries
      );
      return result.documents;
    } catch (error) {
      console.error('List donations error:', error);
      return [];
    }
  },

  /**
   * Update donation status and track stage transitions
   */
  async updateDonationStatus(docId: string, newStatus: string, extraData?: Record<string, any>) {
    try {
      const doc = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.DONATIONS,
        docId,
        {
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...extraData,
        }
      );
      return { success: true, doc };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Create delivery record (links donation → driver → NGO)
   */
  async createDelivery(data: {
    donation_id: string;
    driver_id: string;
    ngo_id: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    distance_km: number;
    eta_minutes: number;
    status: string;
  }) {
    try {
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.DELIVERIES,
        ID.unique(),
        {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
      return { success: true, doc };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Update all-time service history after delivery completes
   */
  async updateServiceHistory(data: {
    total_kg_saved: number;
    total_meals_served: number;
    total_deliveries: number;
    total_co2_saved: number;
  }) {
    try {
      // Try to get existing record
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SERVICE_HISTORY,
        [Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        const doc = existing.documents[0];
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SERVICE_HISTORY,
          doc.$id,
          {
            total_kg_saved: (doc.total_kg_saved || 0) + data.total_kg_saved,
            total_meals_served: (doc.total_meals_served || 0) + data.total_meals_served,
            total_deliveries: (doc.total_deliveries || 0) + data.total_deliveries,
            total_co2_saved: (doc.total_co2_saved || 0) + data.total_co2_saved,
            updated_at: new Date().toISOString(),
          }
        );
      } else {
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SERVICE_HISTORY,
          ID.unique(),
          {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        );
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all-time service stats for landing page
   */
  async getServiceStats() {
    try {
      const result = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SERVICE_HISTORY,
        [Query.limit(1)]
      );
      if (result.documents.length > 0) {
        return result.documents[0];
      }
      return null;
    } catch {
      return null;
    }
  },
};

// ── Storage Service ─────────────────────────────────────────
export const appwriteStorage = {
  /**
   * Upload food photo
   */
  async uploadFoodPhoto(file: File) {
    try {
      const result = await storage.createFile(
        APPWRITE_BUCKET_ID,
        ID.unique(),
        file
      );
      // Get file URL
      const url = storage.getFileView(APPWRITE_BUCKET_ID, result.$id);
      return { success: true, fileId: result.$id, url: url.toString() };
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get file preview URL
   */
  getFileUrl(fileId: string) {
    return storage.getFileView(APPWRITE_BUCKET_ID, fileId).toString();
  },
};

// ── Functions Service (Trigger NGO Notifications) ───────────
export const appwriteFunctions = {
  /**
   * Trigger NGO notification when new donation is created
   */
  async notifyNearbyNGOs(donationData: {
    donation_id: string;
    restaurant_name: string;
    food_description: string;
    quantity_kg: number;
    pickup_lat: number;
    pickup_lng: number;
  }) {
    try {
      const execution = await functions.createExecution(
        APPWRITE_FUNCTION_NGO_NOTIFY,
        JSON.stringify(donationData),
        false
      );
      return { success: true, execution };
    } catch (error: any) {
      console.error('Function execution error:', error);
      // Non-critical - don't block if function fails
      return { success: false, error: error.message };
    }
  },
};

export default client;
