import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Package, Truck, Building2, HeartHandshake, TrendingUp, Clock,
  Leaf, DollarSign, MapPin, ArrowRight, Activity, Zap,
  AlertCircle, CheckCircle2, Timer, Navigation, Utensils,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import CountUpNumber from '../components/CountUpNumber';
import { impactAPI, surplusAPI, trackingAPI, authAPI } from '../api';
import { useAuthStore } from '../store';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'badge-pending', icon: AlertCircle },
  assigned: { label: 'Assigned', color: 'badge-assigned', icon: Timer },
  picked_up: { label: 'Picked Up', color: 'badge-picked_up', icon: Package },
  in_transit: { label: 'In Transit', color: 'badge-in_transit', icon: Navigation },
  delivered: { label: 'Delivered', color: 'badge-delivered', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'badge-cancelled', icon: AlertCircle },
};

// Mock data for fallback
const MOCK_IMPACT = {
  total_kg_saved: 4850,
  total_meals_served: 19400,
  total_co2_saved_kg: 12125,
  total_water_saved_liters: 4850000,
  total_money_saved_inr: 485000,
  active_restaurants: 10,
  active_ngos: 8,
  active_drivers: 12,
  avg_delivery_time_mins: 28.5,
  active_orders: 5,
  today_kg_saved: 156.3,
  today_meals: 782,
};

const MOCK_ORDERS = [
  { id: 1, food_description: 'Dal Makhani + Jeera Rice (50 servings)', quantity_kg: 25, status: 'in_transit', restaurant_name: 'Taj Palace Kitchen', ngo_name: 'Akshaya Patra Foundation', driver_name: 'Rajesh Kumar', eta_minutes: 12, distance_km: 5.2, created_at: new Date().toISOString() },
  { id: 2, food_description: 'Paneer Butter Masala + Naan (30 servings)', quantity_kg: 15, status: 'picked_up', restaurant_name: 'Spice Garden', ngo_name: 'Robin Hood Army Mumbai', driver_name: 'Amit Sharma', eta_minutes: 22, distance_km: 8.1, created_at: new Date().toISOString() },
  { id: 3, food_description: 'Chicken Biryani (40 servings)', quantity_kg: 20, status: 'assigned', restaurant_name: 'Royal Biryani Centre', ngo_name: 'Feeding India (Zomato)', driver_name: 'Suresh Patel', eta_minutes: 35, distance_km: 12.3, created_at: new Date().toISOString() },
  { id: 4, food_description: 'Mixed Veg Thali (60 servings)', quantity_kg: 30, status: 'pending', restaurant_name: 'Green Leaf Restaurant', ngo_name: null, driver_name: null, eta_minutes: 0, distance_km: 0, created_at: new Date().toISOString() },
  { id: 5, food_description: 'Pav Bhaji (35 servings)', quantity_kg: 12, status: 'delivered', restaurant_name: 'Mumbai Masala House', ngo_name: 'Roti Bank Mumbai', driver_name: 'Priya Singh', eta_minutes: 0, distance_km: 3.5, created_at: new Date().toISOString() },
  { id: 6, food_description: 'Idli Sambar + Chutney (80 servings)', quantity_kg: 18, status: 'delivered', restaurant_name: 'Dosa Plaza Express', ngo_name: 'Mumbai Seva Foundation', driver_name: 'Vikram Yadav', eta_minutes: 0, distance_km: 6.7, created_at: new Date().toISOString() },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, setRoleDashboardData } = useAuthStore();
  const [impact, setImpact] = useState(MOCK_IMPACT);
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [usingRealOrders, setUsingRealOrders] = useState(false);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const [impactRes, ordersRes, roleRes] = await Promise.all([
        impactAPI.dashboard().catch(() => ({ data: MOCK_IMPACT })),
        surplusAPI.myOrders(undefined, 20).catch(() =>
          surplusAPI.list(undefined, 20).catch(() => ({ data: null }))
        ),
        authAPI.roleData().catch(() => ({ data: null })),
      ]);
      setImpact(impactRes.data);
      // Always use real API data once available (even if empty)
      if (ordersRes.data !== null && ordersRes.data !== undefined) {
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setUsingRealOrders(true);
      }
      if (roleRes.data) setRoleDashboardData(roleRes.data);
    } catch {
      // Use mock data only on first load if API completely fails
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [setRoleDashboardData]);

  useEffect(() => {
    fetchData(true);

    // Refresh every 15 seconds so new surplus entries appear
    const refreshInterval = setInterval(() => fetchData(false), 15000);

    // Update clock
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Re-fetch when user returns to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchData]);

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const completedToday = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display">
                <span className="gradient-text">{t('dashboard.title')}</span>
              </h1>
              <p className="text-slate-400 mt-1">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-slate-300 font-mono">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <Link to="/surplus" className={`btn-primary py-2 px-4 text-sm flex items-center gap-2 ${
                user?.role && !['restaurant', 'admin'].includes(user.role) ? 'hidden' : ''
              }`}>
                <Utensils className="w-4 h-4" />
                {t('dashboard.markSurplus')}
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: t('dashboard.totalFoodSaved'),
              value: impact.total_kg_saved,
              suffix: ' kg',
              icon: Leaf,
              color: 'text-green-400',
              gradient: 'from-green-500/20 to-emerald-500/5',
              glow: 'group-hover:shadow-green-500/20',
            },
            {
              label: t('dashboard.mealsServed'),
              value: impact.total_meals_served,
              suffix: '+',
              icon: HeartHandshake,
              color: 'text-rose-400',
              gradient: 'from-rose-500/20 to-pink-500/5',
              glow: 'group-hover:shadow-rose-500/20',
            },
            {
              label: t('dashboard.co2Prevented'),
              value: impact.total_co2_saved_kg,
              suffix: ' kg',
              icon: TrendingUp,
              color: 'text-cyan-400',
              gradient: 'from-cyan-500/20 to-blue-500/5',
              glow: 'group-hover:shadow-cyan-500/20',
            },
            {
              label: t('dashboard.moneySaved'),
              value: impact.total_money_saved_inr,
              prefix: '₹',
              suffix: '',
              icon: DollarSign,
              color: 'text-amber-400',
              gradient: 'from-amber-500/20 to-yellow-500/5',
              glow: 'group-hover:shadow-amber-500/20',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-5 group hover:shadow-xl ${stat.glow} transition-all duration-500 cursor-pointer relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{t('dashboard.allTime')}</span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">
                  <CountUpNumber end={stat.value} suffix={stat.suffix} prefix={(stat as any).prefix || ''} />
                </div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Second row: Active metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('dashboard.activeOrders'), value: impact.active_orders || activeOrders.length, icon: Activity, color: 'text-orange-400' },
            { label: t('dashboard.todaySaved'), value: `${impact.today_kg_saved} kg`, icon: Zap, color: 'text-yellow-400' },
            { label: t('dashboard.avgDelivery'), value: `${impact.avg_delivery_time_mins} min`, icon: Clock, color: 'text-blue-400' },
            { label: t('dashboard.todayMeals'), value: impact.today_meals, icon: HeartHandshake, color: 'text-pink-400' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className={`p-2 rounded-lg bg-white/5`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Two-column layout: Active Orders + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Orders */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  {t('dashboard.liveOrders')}
                </h2>
                <Link to="/surplus" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
                  {t('dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {orders.slice(0, 6).map((order, i) => {
                  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white truncate">
                              {order.food_description}
                            </span>
                            <span className={status.color}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {t(`dashboard.${order.status === 'picked_up' ? 'pickedUp' : order.status === 'in_transit' ? 'inTransit' : order.status}`)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {order.restaurant_name}
                            </span>
                            {order.ngo_name && (
                              <span className="flex items-center gap-1">
                                <HeartHandshake className="w-3 h-3" />
                                {order.ngo_name}
                              </span>
                            )}
                            {order.driver_name && (
                              <span className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {order.driver_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-white">{order.quantity_kg} kg</div>
                          {order.eta_minutes > 0 && (
                            <div className="text-xs text-cyan-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {order.eta_minutes} min
                            </div>
                          )}
                          {order.distance_km > 0 && (
                            <div className="text-xs text-slate-500">{order.distance_km} km</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions / Sidebar */}
          <div className="space-y-6">
            {/* Network Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-5"
            >
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('dashboard.networkStatus')}</h3>
              <div className="space-y-4">
                {[
                  { label: t('dashboard.restaurants'), value: impact.active_restaurants, icon: Building2, color: 'text-orange-400' },
                  { label: t('dashboard.ngos'), value: impact.active_ngos, icon: HeartHandshake, color: 'text-green-400' },
                  { label: t('dashboard.driversOnline'), value: impact.active_drivers, icon: Truck, color: 'text-cyan-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-sm text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="glass-card p-5"
            >
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {[
                  { label: t('dashboard.markSurplus'), path: '/surplus', icon: Utensils, color: 'bg-green-500/10 text-green-400' },
                  { label: t('dashboard.trackOrders'), path: '/tracking', icon: MapPin, color: 'bg-cyan-500/10 text-cyan-400' },
                  { label: t('aiDemo.tab1'), path: '/ai-demo', icon: Zap, color: 'bg-violet-500/10 text-violet-400' },
                  { label: t('dashboard.viewImpact'), path: '/impact', icon: TrendingUp, color: 'bg-amber-500/10 text-amber-400' },
                ].map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Today's Highlight */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="glass-card p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20"
            >
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-white mb-1">{t('dashboard.todayImpact')}</h3>
              <p className="text-sm text-slate-400 mb-3">
                {t('dashboard.youSaved', { kg: impact.today_kg_saved })}
              </p>
              <div className="text-2xl font-bold text-green-400">
                {t('dashboard.mealsServedCount', { meals: impact.today_meals })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t('dashboard.worthInr', { value: (impact.today_kg_saved * 100).toLocaleString() })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
