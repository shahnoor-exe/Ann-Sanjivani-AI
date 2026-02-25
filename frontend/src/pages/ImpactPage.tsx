import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, Leaf, Heart, Globe2, DollarSign, Droplets,
  TrendingUp, Calendar, Building2, HeartHandshake, Truck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import CountUpNumber from '../components/CountUpNumber';
import { impactAPI } from '../api';

const DAILY_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  kg: Math.round(80 + Math.random() * 170),
  meals: Math.round(400 + Math.random() * 850),
  co2: Math.round(200 + Math.random() * 400),
}));

const IMPACT_STATS = [
  { label: 'totalFoodSaved', value: 4850, suffix: ' kg', icon: Leaf, color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/5', border: 'border-green-500/20' },
  { label: 'mealsServed', value: 19400, suffix: '+', icon: Heart, color: 'text-rose-400', bg: 'from-rose-500/20 to-pink-500/5', border: 'border-rose-500/20' },
  { label: 'co2Prevented', value: 12125, suffix: ' kg', icon: Globe2, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/5', border: 'border-cyan-500/20' },
  { label: 'waterSaved', value: 4850000, suffix: ' L', icon: Droplets, color: 'text-sky-400', bg: 'from-sky-500/20 to-blue-500/5', border: 'border-sky-500/20' },
  { label: 'moneySaved', value: 485000, prefix: '₹', suffix: '', icon: DollarSign, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-500/5', border: 'border-amber-500/20' },
  { label: 'deliveries', value: 650, suffix: '+', icon: Truck, color: 'text-violet-400', bg: 'from-violet-500/20 to-purple-500/5', border: 'border-violet-500/20' },
];

const TOP_RESTAURANTS = [
  { name: 'Grand Bhoj Thali', kg: 580, meals: 2900, donations: 42 },
  { name: 'Taj Palace Kitchen', kg: 520, meals: 2600, donations: 38 },
  { name: 'Hotel Saffron', kg: 465, meals: 2325, donations: 35 },
  { name: 'Mumbai Masala House', kg: 410, meals: 2050, donations: 31 },
  { name: 'Royal Biryani Centre', kg: 385, meals: 1925, donations: 28 },
];

const TOP_NGOS = [
  { name: 'Feeding India (Zomato)', kg: 890, people: 800, pickups: 45 },
  { name: 'Akshaya Patra Foundation', kg: 720, people: 500, pickups: 38 },
  { name: 'Annakshetra Trust', kg: 650, people: 600, pickups: 32 },
  { name: 'Robin Hood Army Mumbai', kg: 580, people: 350, pickups: 28 },
  { name: 'No Food Waste India', kg: 490, people: 450, pickups: 25 },
];

export default function ImpactPage() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [stats, setStats] = useState(IMPACT_STATS);
  const [dailyData, setDailyData] = useState(DAILY_DATA);
  const maxKg = Math.max(...dailyData.map((d) => d.kg));

  // Fetch real impact data from API
  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const [dashRes, histRes] = await Promise.all([
          impactAPI.dashboard().catch(() => null),
          impactAPI.history(30).catch(() => null),
        ]);
        if (dashRes?.data) {
          const d = dashRes.data;
          setStats((prev) => prev.map((s) => {
            switch (s.label) {
              case 'totalFoodSaved': return { ...s, value: d.total_kg_saved || s.value };
              case 'mealsServed': return { ...s, value: d.total_meals_served || s.value };
              case 'co2Prevented': return { ...s, value: d.total_co2_saved_kg || s.value };
              case 'waterSaved': return { ...s, value: d.total_water_saved_liters || s.value };
              case 'moneySaved': return { ...s, value: d.total_money_saved_inr || s.value };
              case 'deliveries': return { ...s, value: d.total_deliveries || s.value };
              default: return s;
            }
          }));
        }
        if (histRes?.data && Array.isArray(histRes.data) && histRes.data.length > 0) {
          setDailyData(histRes.data.map((h: any, i: number) => ({
            day: i + 1,
            kg: h.kg_saved || h.kg || 0,
            meals: h.meals || 0,
            co2: h.co2_kg || 0,
          })));
        }
      } catch { /* keep fallback */ }
    };
    fetchImpact();
  }, []);

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
          <h1 className="text-3xl md:text-4xl font-bold font-display">
            <BarChart3 className="inline w-8 h-8 text-green-400 mr-2" />
            <span className="gradient-text">{t('impact.title')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('impact.subtitle')}</p>
        </motion.div>

        {/* Hero Impact Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-12 mb-8 relative overflow-hidden glow-green"
        >
          <div className="absolute top-0 right-0 w-64 h-64 blob-green opacity-30" />
          <div className="relative z-10 text-center">
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2">
              <CountUpNumber end={stats.find(s => s.label === 'totalFoodSaved')?.value || 4850} suffix=" kg" /> {t('impact.foodRescued')}
            </h2>
            <p className="text-xl text-slate-400">
              {t('impact.thats')} <span className="text-green-400 font-bold"><CountUpNumber end={stats.find(s => s.label === 'mealsServed')?.value || 19400} /></span> {t('impact.mealsServedAnd')}{' '}
              <span className="text-cyan-400 font-bold">₹<CountUpNumber end={stats.find(s => s.label === 'moneySaved')?.value || 485000} /></span> {t('impact.inValueSaved')}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              {t('impact.increaseMonth')}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card p-4 text-center border ${stat.border} hover:scale-105 transition-all duration-300 cursor-pointer`}
            >
              <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
              <div className="text-xl md:text-2xl font-bold text-white">
                <CountUpNumber end={stat.value} suffix={stat.suffix} prefix={(stat as any).prefix || ''} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{t(`impact.${stat.label}`)}</div>
            </motion.div>
          ))}
        </div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-400" />
              Daily Food Rescue (kg)
            </h3>
            <div className="flex gap-1">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    timeRange === range
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {range === '7d' ? t('impact.days7') : range === '30d' ? t('impact.days30') : t('impact.all')}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-1 h-48">
            {dailyData.slice(timeRange === '7d' ? -7 : 0).map((d, i) => (
              <motion.div
                key={d.day}
                initial={{ height: 0 }}
                animate={{ height: `${(d.kg / maxKg) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.02 }}
                className="flex-1 bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer group relative min-w-[4px]"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Day {d.day}: {d.kg} kg
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>Day 1</span>
            <span>Day {timeRange === '7d' ? 7 : dailyData.length}</span>
          </div>
        </motion.div>

        {/* Leaderboards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Restaurants */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-bold text-white">{t('impact.topRestaurants')}</h3>
            </div>
            <div className="divide-y divide-white/5">
              {TOP_RESTAURANTS.map((r, i) => (
                <div key={r.name} className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-orange-700/20 text-orange-500' :
                    'bg-white/5 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.donations} {t('impact.donations')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">{r.kg} kg</div>
                    <div className="text-xs text-slate-500">{r.meals} meals</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top NGOs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">{t('impact.topNgos')}</h3>
            </div>
            <div className="divide-y divide-white/5">
              {TOP_NGOS.map((n, i) => (
                <div key={n.name} className="p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-orange-700/20 text-orange-500' :
                    'bg-white/5 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{n.name}</div>
                    <div className="text-xs text-slate-500">{n.people} {t('impact.peopleDay')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">{n.kg} kg</div>
                    <div className="text-xs text-slate-500">{n.pickups} {t('impact.pickups')}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Environmental Impact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 glass-card p-8 text-center"
        >
          <h3 className="text-2xl font-bold text-white mb-6">{t('impact.environmentTitle')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: '🌳', value: '121', label: t('impact.treesPlanted'), desc: t('impact.co2Absorption') },
              { emoji: '🚗', value: '48,500', label: t('impact.kmNotDriven'), desc: t('impact.emissionsSaved') },
              { emoji: '🏊', value: '1,940', label: t('impact.olympicPools'), desc: t('impact.waterConserved') },
              { emoji: '💡', value: '12,125', label: t('impact.energySaved'), desc: t('impact.processingEnergy') },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="p-4"
              >
                <div className="text-4xl mb-2">{item.emoji}</div>
                <div className="text-xl font-bold text-white">{item.value}</div>
                <div className="text-sm text-green-400 font-medium">{item.label}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
