import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Brain, Sparkles, Route, MessageSquare, TrendingUp,
  ArrowRight, Cpu, Zap, Target, BarChart3, Truck, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { mlAPI } from '../api';

const DEMO_TAB = ['surplus-prediction', 'route-optimization', 'food-classification', 'eta-prediction'] as const;

const RESTAURANTS_DEMO = [
  { id: 1, name: 'Taj Palace Kitchen', base: 45 },
  { id: 2, name: 'Spice Garden', base: 25 },
  { id: 3, name: 'Mumbai Masala House', base: 35 },
  { id: 4, name: 'Grand Bhoj Thali', base: 50 },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EVENTS = ['normal', 'wedding', 'festival', 'corporate', 'birthday'];
const WEATHER = ['clear', 'rain', 'hot', 'cold'];

export default function AIDemo() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<typeof DEMO_TAB[number]>('surplus-prediction');
  
  // Surplus Prediction State
  const [predForm, setPredForm] = useState({
    restaurant: RESTAURANTS_DEMO[0],
    day: 5, // Saturday
    guests: 150,
    event: 'wedding',
    weather: 'clear',
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [predLoading, setPredLoading] = useState(false);

  // Route Optimization State
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Classification State
  const [classText, setClassText] = useState('Paneer butter masala with jeera rice and tandoori naan');
  const [classResult, setClassResult] = useState<any>(null);
  const [classLoading, setClassLoading] = useState(false);

  // ETA Prediction State
  const [etaForm, setEtaForm] = useState({
    distance_km: 8.5,
    hour_of_day: 12,
    day_of_week: 2,
    pickup_lat: 19.076,
    pickup_lng: 72.877,
    dropoff_lat: 19.054,
    dropoff_lng: 72.840,
  });
  const [etaResult, setEtaResult] = useState<any>(null);
  const [etaLoading, setEtaLoading] = useState(false);

  const runPrediction = async () => {
    setPredLoading(true);
    setPrediction(null);
    try {
      const res = await mlAPI.predictSurplus({
        day_of_week: predForm.day,
        guest_count: predForm.guests,
        event_type: predForm.event,
        weather: predForm.weather,
        base_surplus_kg: predForm.restaurant.base,
      });
      const d = res.data;
      setPrediction({
        predicted_kg: d.predicted_kg,
        confidence: d.confidence,
        meals: Math.round(d.predicted_kg * 4),
        value_inr: Math.round(d.predicted_kg * 100),
        co2_kg: (d.predicted_kg * 2.5).toFixed(1),
        breakdown: d.category_breakdown,
        recommendation: d.recommendation,
      });
    } catch (err: any) {
      console.error('Surplus prediction failed:', err);
      setPrediction({ error: err?.response?.data?.detail || 'Prediction failed. Is the backend running?' });
    } finally {
      setPredLoading(false);
    }
  };

  const runRouteOptimization = async () => {
    setRouteLoading(true);
    setRouteResult(null);
    try {
      const res = await mlAPI.optimizeRoute({
        driver_lat: 19.0596, driver_lng: 72.8295,
        pickups: [
          { lat: 18.9067, lng: 72.8147, name: 'Taj Palace Kitchen, Colaba', order_id: 1 },
          { lat: 18.9613, lng: 72.8325, name: 'Royal Biryani Centre, Mohammed Ali Rd', order_id: 2 },
        ],
        dropoffs: [
          { lat: 19.0987, lng: 72.8267, name: 'Akshaya Patra Foundation, Juhu', order_id: 1 },
          { lat: 19.0660, lng: 72.8700, name: 'Robin Hood Army, BKC', order_id: 2 },
        ],
      });
      const d = res.data;
      const stops = [
        { type: 'Start', name: 'Driver Location (Bandra)', distance: '0 km', time: '0 min' },
        ...d.optimized_route.map((s: any) => ({
          type: s.type === 'pickup' ? 'Pickup' : 'Dropoff',
          name: s.name,
          distance: `${s.distance_from_prev_km} km`,
          time: `${s.eta_mins} min`,
        })),
      ];
      setRouteResult({
        stops,
        total_distance: d.total_distance_km,
        total_time: d.total_time_mins,
        fuel_cost: d.fuel_cost_inr,
        optimization_savings: `CO₂ ${d.co2_emission_kg} kg — Solver: ${d.solver}`,
      });
    } catch (err: any) {
      console.error('Route optimization failed:', err);
      setRouteResult({ error: err?.response?.data?.detail || 'Route optimization failed.' });
    } finally {
      setRouteLoading(false);
    }
  };

  const runClassification = async () => {
    setClassLoading(true);
    setClassResult(null);
    try {
      const res = await mlAPI.classifyFood(classText);
      const d = res.data;
      setClassResult({
        primary: d.primary_category,
        categories: d.all_scores.map((s: any) => ({
          name: s.category,
          score: 1,
          confidence: s.confidence,
        })),
        tokens_analyzed: classText.split(' ').length,
        model: d.model_version,
        is_vegetarian: d.is_vegetarian,
        shelf_life_hours: d.shelf_life_hours,
        storage: d.storage_recommendation,
      });
    } catch (err: any) {
      console.error('Classification failed:', err);
      setClassResult({ error: err?.response?.data?.detail || 'Classification failed.' });
    } finally {
      setClassLoading(false);
    }
  };

  const runETAPrediction = async () => {
    setEtaLoading(true);
    setEtaResult(null);
    try {
      const res = await mlAPI.predictETA(etaForm);
      setEtaResult(res.data);
    } catch (err: any) {
      console.error('ETA prediction failed:', err);
      setEtaResult({ error: err?.response?.data?.detail || 'ETA prediction failed.' });
    } finally {
      setEtaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            <Cpu className="w-4 h-4" />
            {t('aiDemo.showcase')}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-display mb-2">
            <span className="gradient-text-cool">{t('aiDemo.title').split(' ').slice(0, 2).join(' ')}</span>{' '}
            <span className="text-white">{t('aiDemo.title').split(' ').slice(2).join(' ') || 'Ann-Sanjivani AI'}</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {t('aiDemo.subtitle')}
          </p>
        </motion.div>

        {/* Tab Selector */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {[
            { key: 'surplus-prediction', label: t('aiDemo.tab1'), icon: Brain, color: 'violet' },
            { key: 'route-optimization', label: t('aiDemo.tab2'), icon: Route, color: 'cyan' },
            { key: 'food-classification', label: t('aiDemo.tab3'), icon: MessageSquare, color: 'amber' },
            { key: 'eta-prediction', label: 'ETA Prediction', icon: Clock, color: 'green' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.key
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30 shadow-lg shadow-${tab.color}-500/10`
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ==================== SURPLUS PREDICTION ==================== */}
          {activeTab === 'surplus-prediction' && (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                    <Brain className="w-5 h-5 text-violet-400" />
                    {t('aiDemo.configurePrediction')}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-1.5 block">{t('aiDemo.restaurant')}</label>
                      <select
                        value={predForm.restaurant.id}
                        onChange={(e) => setPredForm({ ...predForm, restaurant: RESTAURANTS_DEMO.find(r => r.id === Number(e.target.value))! })}
                        className="input-field"
                      >
                        {RESTAURANTS_DEMO.map((r) => (
                          <option key={r.id} value={r.id}>{r.name} (avg {r.base} kg/day)</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">{t('aiDemo.day')}</label>
                        <select value={predForm.day} onChange={(e) => setPredForm({ ...predForm, day: Number(e.target.value) })} className="input-field">
                          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">{t('aiDemo.guestCount')}</label>
                        <input
                          type="number"
                          value={predForm.guests}
                          onChange={(e) => setPredForm({ ...predForm, guests: Number(e.target.value) })}
                          className="input-field"
                          min={10}
                          max={1000}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">{t('aiDemo.eventType')}</label>
                        <select value={predForm.event} onChange={(e) => setPredForm({ ...predForm, event: e.target.value })} className="input-field">
                          {EVENTS.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">{t('aiDemo.weather')}</label>
                        <select value={predForm.weather} onChange={(e) => setPredForm({ ...predForm, weather: e.target.value })} className="input-field">
                          {WEATHER.map((w) => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>

                    <button onClick={runPrediction} disabled={predLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                      {predLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('aiDemo.runningXgboost')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          {t('aiDemo.runPrediction')}
                        </>
                      )}
                    </button>

                    <div className="text-xs text-slate-600 text-center">
                      {t('aiDemo.modelInfo')}
                    </div>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                    <Target className="w-5 h-5 text-green-400" />
                    {t('aiDemo.predictionResults')}
                  </h3>

                  {prediction && !prediction.error ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-5"
                    >
                      {/* Main Prediction */}
                      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20">
                        <div className="text-sm text-slate-400 mb-1">{t('aiDemo.predictedSurplus')}</div>
                        <div className="text-5xl font-extrabold text-violet-400">{prediction.predicted_kg} kg</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {t('aiDemo.confidence')}: <span className="text-green-400">{(prediction.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Impact Metrics */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-green-400">{prediction.meals}</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.mealsLabel')}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-amber-400">₹{prediction.value_inr.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.valueLabel')}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-cyan-400">{prediction.co2_kg} kg</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.co2Saved')}</div>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div>
                        <div className="text-sm font-semibold text-slate-300 mb-2">{t('aiDemo.categoryBreakdown')}</div>
                        {Object.entries(prediction.breakdown).map(([cat, val]) => (
                          <div key={cat} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-slate-400 w-28">{cat}</div>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((val as number) / prediction.predicted_kg) * 100}%` }}
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                              />
                            </div>
                            <div className="text-xs text-white font-medium w-12 text-right">{val as number} kg</div>
                          </div>
                        ))}
                      </div>

                      {/* Recommendation */}
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-slate-300">
                        {prediction.recommendation}
                      </div>
                    </motion.div>
                  ) : prediction?.error ? (
                    <div className="text-center py-8 text-red-400 text-sm">{prediction.error}</div>
                  ) : (
                    <div className="text-center py-16 text-slate-600">
                      <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>{t('aiDemo.configurePrompt')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== ROUTE OPTIMIZATION ==================== */}
          {activeTab === 'route-optimization' && (
            <motion.div
              key="route"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-6 md:p-8"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Route className="w-6 h-6 text-cyan-400" />
                {t('aiDemo.vrpTitle')}
              </h3>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    {t('aiDemo.vrpDesc')}
                  </p>

                  <div className="glass-card p-4 mb-4 border-cyan-500/10">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">{t('aiDemo.demoScenario')}</h4>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p>📍 <strong>Driver:</strong> Starting from Bandra</p>
                      <p>🍽️ <strong>Pickup 1:</strong> Taj Palace Kitchen, Colaba</p>
                      <p>🍽️ <strong>Pickup 2:</strong> Royal Biryani Centre, Mohammed Ali Rd</p>
                      <p>🏠 <strong>Dropoff 1:</strong> Akshaya Patra Foundation, Juhu</p>
                      <p>🏠 <strong>Dropoff 2:</strong> Robin Hood Army, BKC</p>
                    </div>
                  </div>

                  <button onClick={runRouteOptimization} disabled={routeLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {routeLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('aiDemo.runningOrTools')}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        {t('aiDemo.optimizeRoute')}
                      </>
                    )}
                  </button>
                  <div className="text-xs text-slate-600 text-center mt-2">
                    {t('aiDemo.solverInfo')}
                  </div>
                </div>

                <div>
                  {routeResult ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {/* Route Steps */}
                      <div className="space-y-3 mb-6">
                        {routeResult.stops.map((stop: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex items-start gap-3"
                          >
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                stop.type === 'Start' ? 'bg-blue-500/20 text-blue-400' :
                                stop.type === 'Pickup' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {i + 1}
                              </div>
                              {i < routeResult.stops.length - 1 && (
                                <div className="w-0.5 h-6 bg-white/10 mt-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className={`text-xs font-semibold ${
                                stop.type === 'Start' ? 'text-blue-400' :
                                stop.type === 'Pickup' ? 'text-orange-400' : 'text-green-400'
                              }`}>{stop.type}</div>
                              <div className="text-sm text-white">{stop.name}</div>
                              <div className="text-xs text-slate-500">{stop.distance} • {stop.time}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <div className="text-lg font-bold text-cyan-400">{routeResult.total_distance} km</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.totalDistance')}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="text-lg font-bold text-green-400">{routeResult.total_time} min</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.totalTime')}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div className="text-lg font-bold text-amber-400">₹{routeResult.fuel_cost}</div>
                          <div className="text-xs text-slate-500">{t('aiDemo.fuelCost')}</div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
                        <span className="text-sm text-green-400 font-semibold">{routeResult.optimization_savings}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-16 text-slate-600">
                      <Route className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>{t('aiDemo.routePrompt')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== FOOD CLASSIFICATION ==================== */}
          {activeTab === 'food-classification' && (
            <motion.div
              key="classify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-6 md:p-8"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <MessageSquare className="w-6 h-6 text-amber-400" />
                {t('aiDemo.nlpTitle')}
              </h3>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-slate-400 mb-4">
                    {t('aiDemo.nlpDesc')}
                  </p>

                  <div className="mb-4">
                    <label className="text-sm text-slate-300 mb-1.5 block">{t('aiDemo.foodDescription')}</label>
                    <textarea
                      value={classText}
                      onChange={(e) => setClassText(e.target.value)}
                      className="input-field h-24 resize-none"
                      placeholder="Describe the food items..."
                    />
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      'Chicken biryani with raita',
                      'Dal makhani and butter naan',
                      'Gulab jamun and rasmalai desserts',
                      'Samosa and pakora snacks',
                      'Idli sambar with coconut chutney',
                    ].map((txt) => (
                      <button
                        key={txt}
                        onClick={() => setClassText(txt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {txt}
                      </button>
                    ))}
                  </div>

                  <button onClick={runClassification} disabled={classLoading || !classText} className="btn-primary w-full flex items-center justify-center gap-2">
                    {classLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Classifying with IndicBERT...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Classify Food
                      </>
                    )}
                  </button>
                  <div className="text-xs text-slate-600 text-center mt-2">
                    {t('aiDemo.nlpModelInfo')}
                  </div>
                </div>

                <div>
                  {classResult ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
                        <div className="text-sm text-slate-400 mb-1">{t('aiDemo.primaryClassification')}</div>
                        <div className="text-3xl font-extrabold text-amber-400">{classResult.primary}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {classResult.tokens_analyzed} tokens analyzed • {classResult.model}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-300 mb-3">{t('aiDemo.confidenceScores')}</div>
                        {classResult.categories.map((cat: any) => (
                          <div key={cat.name} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-slate-400 w-28">{cat.name}</div>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cat.confidence * 100}%` }}
                                className={`h-full rounded-full ${cat.score > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-slate-600'}`}
                              />
                            </div>
                            <div className="text-xs text-white font-medium w-12 text-right">
                              {(cat.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm text-slate-300">
                        <span className="text-green-400 font-semibold">{t('aiDemo.autoTagged')}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-16 text-slate-600">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>{t('aiDemo.classifyPrompt')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== ETA PREDICTION ==================== */}
          {activeTab === 'eta-prediction' && (
            <motion.div
              key="eta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                    <Clock className="w-5 h-5 text-green-400" />
                    Configure ETA Prediction
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Distance (km)</label>
                        <input type="number" step="0.5" min="0.5" max="50" value={etaForm.distance_km}
                          onChange={(e) => setEtaForm({ ...etaForm, distance_km: Number(e.target.value) })}
                          className="input-field" />
                      </div>
                      <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Hour of Day (0-23)</label>
                        <input type="number" min="0" max="23" value={etaForm.hour_of_day}
                          onChange={(e) => setEtaForm({ ...etaForm, hour_of_day: Number(e.target.value) })}
                          className="input-field" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1.5 block">Day of Week</label>
                      <select value={etaForm.day_of_week}
                        onChange={(e) => setEtaForm({ ...etaForm, day_of_week: Number(e.target.value) })}
                        className="input-field">
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) =>
                          <option key={d} value={i}>{d}</option>
                        )}
                      </select>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Short trip (3 km)', d: 3, h: 10 },
                        { label: 'Rush hour (8 km)', d: 8, h: 18 },
                        { label: 'Late night (12 km)', d: 12, h: 23 },
                        { label: 'Long haul (20 km)', d: 20, h: 14 },
                      ].map(p => (
                        <button key={p.label}
                          onClick={() => setEtaForm({ ...etaForm, distance_km: p.d, hour_of_day: p.h })}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <button onClick={runETAPrediction} disabled={etaLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                      {etaLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Running LSTM model...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Predict ETA
                        </>
                      )}
                    </button>
                    <div className="text-xs text-slate-600 text-center">
                      Keras Sequential LSTM (64 units) with traffic-aware normalization
                    </div>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
                    <Target className="w-5 h-5 text-green-400" />
                    ETA Results
                  </h3>
                  {etaResult && !etaResult.error ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
                        <div className="text-sm text-slate-400 mb-1">Estimated Arrival Time</div>
                        <div className="text-5xl font-extrabold text-green-400">{etaResult.eta_minutes} min</div>
                        <div className="text-sm text-slate-500 mt-1">
                          Confidence: <span className="text-green-400">{(etaResult.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-cyan-400">{etaResult.distance_km} km</div>
                          <div className="text-xs text-slate-500">Distance</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-amber-400">{etaResult.traffic_factor}x</div>
                          <div className="text-xs text-slate-500">Traffic</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <div className="text-lg font-bold text-violet-400">
                            {etaResult.confidence_interval.lower} - {etaResult.confidence_interval.upper}
                          </div>
                          <div className="text-xs text-slate-500">Range (min)</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm text-slate-300">
                        {etaResult.traffic_description}
                      </div>
                      <div className="text-xs text-slate-600 text-center">
                        Model: {etaResult.model_version}
                      </div>
                    </motion.div>
                  ) : etaResult?.error ? (
                    <div className="text-center py-8 text-red-400 text-sm">{etaResult.error}</div>
                  ) : (
                    <div className="text-center py-16 text-slate-600">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Configure parameters and run the LSTM ETA predictor</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ML Architecture Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 glass-card p-6 md:p-8"
        >
          <h3 className="text-xl font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
            <Cpu className="w-6 h-6 text-violet-400" />
            {t('aiDemo.mlPipeline')}
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name: 'Surplus Prediction', model: 'XGBoost', input: 'Day + guests + event', output: 'kg predicted', color: 'border-violet-500/20 bg-violet-500/5', icon: '🤖' },
              { name: 'Route Optimization', model: 'OR-Tools VRP', input: 'Drivers + requests', output: 'Optimal routes', color: 'border-cyan-500/20 bg-cyan-500/5', icon: '🗺️' },
              { name: 'Food Classification', model: 'IndicBERT', input: 'Text description', output: 'Category + tags', color: 'border-amber-500/20 bg-amber-500/5', icon: '📝' },
              { name: 'ETA Prediction', model: 'LSTM', input: 'Historical trips', output: 'Arrival time', color: 'border-green-500/20 bg-green-500/5', icon: '⏱️' },
            ].map((model, i) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={`p-4 rounded-xl border ${model.color}`}
              >
                <div className="text-2xl mb-2">{model.icon}</div>
                <div className="text-sm font-bold text-white">{model.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  <span className="text-slate-400">Model:</span> {model.model}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">In:</span> {model.input}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">Out:</span> {model.output}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
