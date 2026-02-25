import { create } from 'zustand';
import { appwriteAuth } from './lib/appwrite';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'restaurant' | 'ngo' | 'driver' | 'admin';
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

type UserRole = User['role'];

interface RoleDashboardData {
  role: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  roleDashboardData: RoleDashboardData | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setRoleDashboardData: (data: RoleDashboardData) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  roleDashboardData: null,
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    // Also logout from Appwrite (cloud sync)
    appwriteAuth.logout().catch(() => {});
    set({ user: null, token: null, isAuthenticated: false, roleDashboardData: null });
  },
  setUser: (user) => set({ user }),
  setRoleDashboardData: (data) => set({ roleDashboardData: data }),
  hasRole: (...roles) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role);
  },
}));

interface ServiceStats {
  total_food_rescued_kg: number;
  total_meals_served: number;
  total_deliveries: number;
  total_co2_saved_kg: number;
  total_water_saved_liters: number;
  total_restaurants: number;
  total_ngos: number;
  total_drivers: number;
  total_users: number;
  success_rate: number;
}

interface AppState {
  activeTab: string;
  sidebarOpen: boolean;
  serviceStats: ServiceStats | null;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  setServiceStats: (stats: ServiceStats) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  sidebarOpen: false,
  serviceStats: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setServiceStats: (stats) => set({ serviceStats: stats }),
}));
