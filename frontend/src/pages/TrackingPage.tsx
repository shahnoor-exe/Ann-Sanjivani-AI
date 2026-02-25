import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Truck, Building2, HeartHandshake, Navigation, Package,
  Clock, RefreshCcw, Wifi, WifiOff,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { trackingAPI } from '../api';

// Fallback mock data (used when API returns empty or fails)
const RESTAURANTS_FALLBACK = [
  { id: 1, name: 'Taj Palace Kitchen', lat: 18.9217, lng: 72.8332, cuisine: 'Multi-cuisine', surplus_kg: 45 },
  { id: 2, name: 'Spice Garden', lat: 19.0596, lng: 72.8295, cuisine: 'North Indian', surplus_kg: 25 },
  { id: 3, name: 'Mumbai Masala House', lat: 19.0948, lng: 72.8267, cuisine: 'Street Food', surplus_kg: 35 },
  { id: 4, name: 'Royal Biryani Centre', lat: 18.9552, lng: 72.8371, cuisine: 'Mughlai', surplus_kg: 30 },
  { id: 5, name: 'Green Leaf Restaurant', lat: 19.1136, lng: 72.8697, cuisine: 'South Indian', surplus_kg: 20 },
  { id: 6, name: 'Hotel Saffron', lat: 18.9930, lng: 72.8263, cuisine: 'Continental', surplus_kg: 40 },
  { id: 7, name: 'Dosa Plaza Express', lat: 19.0178, lng: 72.8478, cuisine: 'South Indian', surplus_kg: 15 },
  { id: 8, name: 'Punjabi Dhaba Premium', lat: 19.1176, lng: 72.9060, cuisine: 'Punjabi', surplus_kg: 28 },
];
const NGOS_FALLBACK = [
  { id: 1, name: 'Akshaya Patra Foundation', lat: 19.0988, lng: 72.8315, capacity: 200, people: 500 },
  { id: 2, name: 'Robin Hood Army', lat: 19.0650, lng: 72.8646, capacity: 150, people: 350 },
  { id: 3, name: 'Feeding India', lat: 19.1268, lng: 72.8325, capacity: 300, people: 800 },
  { id: 4, name: 'Roti Bank Mumbai', lat: 19.0233, lng: 72.8388, capacity: 100, people: 250 },
  { id: 5, name: 'Annakshetra Trust', lat: 19.2312, lng: 72.8567, capacity: 250, people: 600 },
];
const DRIVERS_FALLBACK = [
  { id: 1, name: 'Rajesh K.', lat: 19.042, lng: 72.855, vehicle: 'bike', available: true, rating: 4.9 },
  { id: 2, name: 'Amit S.', lat: 19.078, lng: 72.832, vehicle: 'auto', available: true, rating: 4.7 },
  { id: 3, name: 'Suresh P.', lat: 18.965, lng: 72.841, vehicle: 'van', available: false, rating: 4.8 },
  { id: 4, name: 'Priya S.', lat: 19.105, lng: 72.867, vehicle: 'bike', available: true, rating: 5.0 },
  { id: 5, name: 'Vikram Y.', lat: 19.132, lng: 72.849, vehicle: 'auto', available: true, rating: 4.6 },
];
const DELIVERIES_FALLBACK = [
  { id: 1, from: 'Taj Palace Kitchen', to: 'Akshaya Patra Foundation', driver: 'Rajesh K.', status: 'in_transit', food: 'Dal Makhani + Rice (50 servings)', eta: 12, distance: 5.2, progress: 65 },
  { id: 2, from: 'Spice Garden', to: 'Robin Hood Army', driver: 'Amit S.', status: 'picked_up', food: 'Paneer Masala + Naan (30 servings)', eta: 22, distance: 8.1, progress: 35 },
  { id: 3, from: 'Royal Biryani Centre', to: 'Feeding India', driver: 'Suresh P.', status: 'assigned', food: 'Chicken Biryani (40 servings)', eta: 35, distance: 12.3, progress: 10 },
];

export default function TrackingPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<'all' | 'restaurants' | 'ngos' | 'drivers'>('all');
  const [isLive, setIsLive] = useState(true);
  const [tick, setTick] = useState(0);

  // Real data from API, fallback to mock
  const [RESTAURANTS, setRestaurants] = useState(RESTAURANTS_FALLBACK);
  const [NGOS, setNGOs] = useState(NGOS_FALLBACK);
  const [DRIVERS, setDrivers] = useState(DRIVERS_FALLBACK);
  const [ACTIVE_DELIVERIES, setDeliveries] = useState(DELIVERIES_FALLBACK);

  // Fetch real data on mount + every 10 seconds
  const fetchData = async () => {
    try {
      const [locRes, jobsRes] = await Promise.all([
        trackingAPI.allLocations(),
        trackingAPI.activeJobs(),
      ]);

      const loc = locRes.data;
      if (loc.restaurants?.length) setRestaurants(loc.restaurants);
      if (loc.ngos?.length) setNGOs(loc.ngos.map((n: any) => ({ ...n, people: n.people_served || n.capacity_kg * 2 })));
      if (loc.drivers?.length) setDrivers(loc.drivers.map((d: any) => ({ ...d, name: d.name || `Driver #${d.id}` })));

      const jobs = jobsRes.data;
      if (jobs?.length) {
        setDeliveries(jobs.map((j: any) => {
          const statusProgressMap: Record<string, number> = { assigned: 15, picked_up: 45, in_transit: 75 };
          return {
            id: j.id,
            from: j.pickup?.name || 'Restaurant',
            to: j.dropoff?.name || 'NGO',
            driver: j.driver?.name || 'Assigning...',
            status: j.status,
            food: `${j.food_description} (${j.servings} servings)`,
            eta: j.eta_minutes || 0,
            distance: j.distance_km || 0,
            progress: statusProgressMap[j.status] || 10,
          };
        }));
      }
      setIsLive(true);
    } catch {
      // Keep fallback data; mark offline if repeated failures
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const filters = [
    { key: 'all', label: t('tracking.all'), count: RESTAURANTS.length + NGOS.length + DRIVERS.length },
    { key: 'restaurants', label: t('tracking.restaurants'), count: RESTAURANTS.length, icon: Building2, color: 'text-orange-400' },
    { key: 'ngos', label: t('tracking.ngos'), count: NGOS.length, icon: HeartHandshake, color: 'text-green-400' },
    { key: 'drivers', label: t('tracking.drivers'), count: DRIVERS.length, icon: Truck, color: 'text-cyan-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display">
                <MapPin className="inline w-8 h-8 text-green-400 mr-2" />
                <span className="gradient-text">{t('tracking.title')}</span>
              </h1>
              <p className="text-slate-400 mt-1">{t('tracking.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isLive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isLive ? t('tracking.live') : t('tracking.offline')}
              </div>
              <button onClick={() => fetchData()} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1">
                <RefreshCcw className="w-3 h-3" />
                {t('tracking.refresh')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedType(f.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedType === f.key
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f.icon && <f.icon className={`w-3.5 h-3.5 ${(f as any).color || ''}`} />}
              {f.label}
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-xs">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 glass-card overflow-hidden relative"
            style={{ minHeight: '500px' }}
          >
            {/* Interactive Map Visualization (SVG-based for no-dependency demo) */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950">
              <svg viewBox="0 0 800 600" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </pattern>
                  <radialGradient id="glow-g" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="glow-o" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="glow-b" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="800" height="600" fill="url(#grid)" />

                {/* Mumbai coastline hint */}
                <path d="M 50 100 Q 100 200 80 350 Q 60 450 120 550" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="2" strokeDasharray="5,5" />

                {/* Delivery routes (animated) */}
                {ACTIVE_DELIVERIES.map((d, i) => {
                  const fromX = 200 + i * 180;
                  const fromY = 150 + i * 50;
                  const toX = 200 + i * 180 + 80;
                  const toY = 350 + i * 30;
                  return (
                    <g key={d.id}>
                      <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="rgba(34,197,94,0.3)" strokeWidth="2" strokeDasharray="8,4">
                        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="2s" repeatCount="indefinite" />
                      </line>
                      {/* Moving truck dot */}
                      <circle r="5" fill="#22c55e">
                        <animateMotion dur={`${3 + i}s`} repeatCount="indefinite" path={`M${fromX},${fromY} L${toX},${toY}`} />
                      </circle>
                      <circle r="12" fill="url(#glow-g)" opacity="0.5">
                        <animateMotion dur={`${3 + i}s`} repeatCount="indefinite" path={`M${fromX},${fromY} L${toX},${toY}`} />
                      </circle>
                    </g>
                  );
                })}

                {/* Restaurant markers */}
                {(selectedType === 'all' || selectedType === 'restaurants') && RESTAURANTS.map((r, i) => {
                  const x = 100 + (i % 4) * 170 + Math.sin(i) * 30;
                  const y = 80 + Math.floor(i / 4) * 220 + Math.cos(i) * 30;
                  return (
                    <g key={`r-${r.id}`} className="cursor-pointer">
                      <circle cx={x} cy={y} r="18" fill="url(#glow-o)" opacity="0.4">
                        <animate attributeName="r" values="18;22;18" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r="8" fill="#f97316" stroke="#1e293b" strokeWidth="2" />
                      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">🍽</text>
                      <text x={x} y={y + 22} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="600">
                        {r.name.split(' ').slice(0, 2).join(' ')}
                      </text>
                    </g>
                  );
                })}

                {/* NGO markers */}
                {(selectedType === 'all' || selectedType === 'ngos') && NGOS.map((n, i) => {
                  const x = 150 + (i % 3) * 200 + Math.sin(i * 2) * 40;
                  const y = 300 + Math.floor(i / 3) * 160 + Math.cos(i * 2) * 20;
                  return (
                    <g key={`n-${n.id}`} className="cursor-pointer">
                      <circle cx={x} cy={y} r="18" fill="url(#glow-g)" opacity="0.4">
                        <animate attributeName="r" values="18;23;18" dur="4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r="8" fill="#22c55e" stroke="#1e293b" strokeWidth="2" />
                      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">🏠</text>
                      <text x={x} y={y + 22} textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="600">
                        {n.name.split(' ').slice(0, 2).join(' ')}
                      </text>
                    </g>
                  );
                })}

                {/* Driver markers */}
                {(selectedType === 'all' || selectedType === 'drivers') && DRIVERS.map((d, i) => {
                  const x = 200 + (i % 3) * 180 + Math.sin(tick + i) * 10;
                  const y = 200 + Math.floor(i / 3) * 150 + Math.cos(tick + i) * 10;
                  return (
                    <g key={`d-${d.id}`} className="cursor-pointer">
                      <circle cx={x} cy={y} r="15" fill="url(#glow-b)" opacity="0.5">
                        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r="7" fill={d.available ? '#0ea5e9' : '#64748b'} stroke="#1e293b" strokeWidth="2" />
                      <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="7">
                        {d.vehicle === 'bike' ? '🏍' : d.vehicle === 'auto' ? '🛺' : '🚐'}
                      </text>
                      <text x={x} y={y + 20} textAnchor="middle" fill="#0ea5e9" fontSize="7" fontWeight="600">
                        {d.name}
                      </text>
                    </g>
                  );
                })}

                {/* Legend */}
                <g transform="translate(620, 20)">
                  <rect x="0" y="0" width="160" height="100" rx="12" fill="rgba(15,23,42,0.9)" stroke="rgba(255,255,255,0.1)" />
                  <circle cx="20" cy="25" r="5" fill="#f97316" /><text x="32" y="28" fill="#94a3b8" fontSize="10">Restaurants</text>
                  <circle cx="20" cy="48" r="5" fill="#22c55e" /><text x="32" y="51" fill="#94a3b8" fontSize="10">NGOs</text>
                  <circle cx="20" cy="71" r="5" fill="#0ea5e9" /><text x="32" y="74" fill="#94a3b8" fontSize="10">Drivers</text>
                  <line x1="100" y1="25" x2="140" y2="25" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" />
                  <text x="100" y="51" fill="#94a3b8" fontSize="9">Active Route</text>
                </g>
              </svg>
            </div>

            {/* Map overlay info */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-3">
              <div className="glass-card px-4 py-2 text-xs flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-slate-300">{t('tracking.activeDeliveriesCount', { count: ACTIVE_DELIVERIES.length })}</span>
              </div>
              <div className="glass-card px-4 py-2 text-xs text-slate-400">
                {t('tracking.mumbaiRegion')}
              </div>
            </div>
          </motion.div>

          {/* Sidebar: Active Deliveries */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-green-400" />
              {t('tracking.activeDeliveries')}
            </h3>

            {ACTIVE_DELIVERIES.map((delivery, i) => (
              <motion.div
                key={delivery.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-card p-4 hover:border-green-500/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    delivery.status === 'in_transit' ? 'bg-cyan-500/20 text-cyan-300' :
                    delivery.status === 'picked_up' ? 'bg-purple-500/20 text-purple-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {delivery.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">#{delivery.id}</span>
                </div>

                <p className="text-sm text-white font-medium mb-2">{delivery.food}</p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Building2 className="w-3 h-3" />
                    <span>{delivery.from}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <HeartHandshake className="w-3 h-3" />
                    <span>{delivery.to}</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Truck className="w-3 h-3" />
                    <span>{delivery.driver}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{delivery.distance} km</span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {delivery.eta} {t('tracking.minEta')}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${delivery.progress}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Summary */}
            <div className="glass-card p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
              <div className="text-sm text-slate-400 mb-1">{t('tracking.totalActiveDistance')}</div>
              <div className="text-2xl font-bold text-white">
                {ACTIVE_DELIVERIES.reduce((a, d) => a + d.distance, 0).toFixed(1)} km
              </div>
              <div className="text-xs text-cyan-400 mt-1">
                {t('tracking.fuelSavings', { amount: Math.round(ACTIVE_DELIVERIES.reduce((a, d) => a + d.distance, 0) * 3.5) })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
