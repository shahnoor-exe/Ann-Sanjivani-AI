import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Utensils, Camera, Clock, Upload, Sparkles, CheckCircle2,
  AlertCircle, TrendingUp, ArrowRight, Package, Leaf,
  Truck, MapPin, Building2, HeartHandshake, RefreshCcw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { surplusAPI, mlAPI } from '../api';

const FOOD_PRESETS = [
  { name: 'Dal Makhani + Rice', qty: 25, category: 'curry', emoji: '🍛' },
  { name: 'Paneer Butter Masala + Naan', qty: 15, category: 'veg', emoji: '🧈' },
  { name: 'Chicken Biryani', qty: 20, category: 'rice', emoji: '🍚' },
  { name: 'Mixed Veg Thali', qty: 30, category: 'mixed', emoji: '🥘' },
  { name: 'Idli Sambar', qty: 18, category: 'veg', emoji: '🫕' },
  { name: 'Pav Bhaji', qty: 12, category: 'snacks', emoji: '🍞' },
  { name: 'Chole Bhature', qty: 20, category: 'curry', emoji: '🫘' },
  { name: 'Gulab Jamun + Kheer', qty: 10, category: 'sweets', emoji: '🍮' },
];

export default function SurplusPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    food_description: '',
    quantity_kg: 0,
    food_category: 'mixed',
    expiry_hours: 2,
    photo_url: '',
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [orderStage, setOrderStage] = useState<string>('pending');
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Order stage labels + descriptions ────────────────
  const ORDER_STAGES = [
    { key: 'pending',    label: 'Pending',     icon: Package,      colour: 'text-amber-400' },
    { key: 'assigned',   label: 'Assigned',    icon: Building2,    colour: 'text-blue-400' },
    { key: 'picked_up',  label: 'Picked Up',   icon: Truck,        colour: 'text-violet-400' },
    { key: 'in_transit', label: 'In Transit',  icon: MapPin,       colour: 'text-cyan-400' },
    { key: 'delivered',  label: 'Delivered',   icon: CheckCircle2, colour: 'text-green-400' },
  ];

  // ── Poll order status after submission ─────────────
  useEffect(() => {
    if (!createdOrder?.id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await surplusAPI.get(createdOrder.id);
        setOrderStage(data.status);
        if (data.status === 'delivered' || data.status === 'cancelled' || data.status === 'expired') {
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [createdOrder]);

  // ── Fetch order history ───────────────────────────
  const fetchMyOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await surplusAPI.myOrders(undefined, 50).catch(() =>
        surplusAPI.list(undefined, 50)
      );
      if (Array.isArray(res.data)) setMyOrders(res.data);
    } catch { /* ignore */ }
    finally { setOrdersLoading(false); }
  }, []);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const handlePreset = async (preset: typeof FOOD_PRESETS[0]) => {
    setForm({
      ...form,
      food_description: preset.name,
      quantity_kg: preset.qty,
      food_category: preset.category,
    });
    // Call real ML prediction API
    try {
      const { data: pred } = await mlAPI.predictSurplus({
        day_of_week: new Date().getDay(),
        guest_count: 100,
        event_type: 'normal',
        weather: 'clear',
        base_surplus_kg: preset.qty,
      });
      setPrediction(pred);
    } catch {
      // Fallback to local estimate if ML API fails
      const predicted = preset.qty + Math.round((Math.random() - 0.3) * 8);
      setPrediction({
        predicted_kg: Math.max(predicted, 5),
        confidence: (0.8 + Math.random() * 0.15).toFixed(2),
        recommendation: predicted > 30
          ? '🔴 High surplus expected! Pre-alert 3+ NGOs.'
          : predicted > 15
          ? '🟡 Moderate surplus. 1-2 NGOs can handle this.'
          : '🟢 Low surplus. Standard single-NGO assignment.',
        category_breakdown: {
          main_dish: Math.round(predicted * 0.5),
          sides: Math.round(predicted * 0.3),
          other: Math.round(predicted * 0.2),
        },
      });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await surplusAPI.create({
        food_description: form.food_description,
        food_category: form.food_category,
        quantity_kg: form.quantity_kg,
        expiry_hours: form.expiry_hours,
        photo_url: form.photo_url || undefined,
      });
      setCreatedOrder(data);
      setOrderStage(data.status || 'pending');
      setSubmitted(true);
      toast.success(t('surplus.surplusMarked'));
      // Refresh the order list to include the new entry
      fetchMyOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create surplus request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold font-display">
            <Utensils className="inline w-8 h-8 text-green-400 mr-2" />
            <span className="gradient-text">{t('surplus.title')}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('surplus.subtitle')}</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[
            { num: 1, label: t('surplus.step1') },
            { num: 2, label: t('surplus.step2') },
            { num: 3, label: t('surplus.step3') },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                step >= s.num
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-sm hidden sm:inline ${step >= s.num ? 'text-green-400' : 'text-slate-600'}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`w-12 h-0.5 ${step > s.num ? 'bg-green-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Food */}
          {step === 1 && !submitted && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="glass-card p-6 md:p-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-400" />
                  {t('surplus.quickSelect')}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {FOOD_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePreset(preset)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        form.food_description === preset.name
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{preset.emoji}</div>
                      <div className="text-xs font-medium text-white">{preset.name}</div>
                      <div className="text-xs text-slate-500">~{preset.qty} kg</div>
                    </motion.button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('surplus.foodDesc')}</label>
                    <textarea
                      value={form.food_description}
                      onChange={(e) => setForm({ ...form, food_description: e.target.value })}
                      className="input-field h-20 resize-none"
                      placeholder={t('surplus.foodDescPlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('surplus.quantity')}</label>
                      <input
                        type="number"
                        value={form.quantity_kg || ''}
                        onChange={(e) => setForm({ ...form, quantity_kg: Number(e.target.value) })}
                        className="input-field"
                        placeholder="e.g., 25"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('surplus.expiry')}</label>
                      <select
                        value={form.expiry_hours}
                        onChange={(e) => setForm({ ...form, expiry_hours: Number(e.target.value) })}
                        className="input-field"
                      >
                        <option value={2}>2 {t('surplus.hours')}</option>
                        <option value={4}>4 {t('surplus.hours')}</option>
                        <option value={6}>6 {t('surplus.hours')}</option>
                        <option value={8}>8 {t('surplus.hours')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('surplus.photoOptional')}</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-green-500/30 transition-colors cursor-pointer">
                      <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">{t('surplus.uploadPhoto')}</p>
                      <p className="text-xs text-slate-600 mt-1">{t('surplus.photoHelp')}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!form.food_description || !form.quantity_kg) {
                      toast.error(t('surplus.fillRequired'));
                      return;
                    }
                    if (!prediction) handlePreset({ name: form.food_description, qty: form.quantity_kg, category: 'mixed', emoji: '🍽' });
                    setStep(2);
                  }}
                  className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                >
                  {t('surplus.getAiPrediction')}
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: AI Prediction */}
          {step === 2 && !submitted && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="glass-card p-6 md:p-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  {t('surplus.aiPrediction')}
                </h2>

                {prediction ? (
                  <div className="space-y-6">
                    {/* Prediction Result */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card p-5 text-center bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20">
                        <div className="text-sm text-slate-400 mb-1">{t('surplus.aiPredicted')}</div>
                        <div className="text-4xl font-extrabold text-violet-400">{prediction.predicted_kg} kg</div>
                        <div className="text-xs text-slate-500 mt-1">{t('surplus.accuracy')}</div>
                      </div>
                      <div className="glass-card p-5 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                        <div className="text-sm text-slate-400 mb-1">{t('surplus.yourInput')}</div>
                        <div className="text-4xl font-extrabold text-green-400">{form.quantity_kg} kg</div>
                        <div className="text-xs text-slate-500 mt-1">{form.food_description}</div>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">{t('surplus.modelConfidence')}</span>
                        <span className="text-green-400 font-semibold">{(prediction.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prediction.confidence * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="glass-card p-4 border-white/5">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('surplus.categoryBreakdown')}</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(prediction.category_breakdown).map(([key, val]) => (
                          <div key={key} className="text-center">
                            <div className="text-lg font-bold text-white">{val as number} kg</div>
                            <div className="text-xs text-slate-500 capitalize">{key.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="text-sm font-semibold text-amber-400 mb-1">{t('surplus.aiRecommendation')}</div>
                      <p className="text-sm text-slate-300">{prediction.recommendation}</p>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                        {t('surplus.back')}
                      </button>
                      <button onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                        {t('surplus.confirm')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('surplus.runningModel')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && !submitted && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="glass-card p-6 md:p-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  {t('surplus.confirmTitle')}
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-slate-400">{t('surplus.food')}</span>
                    <span className="text-white font-medium">{form.food_description}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-slate-400">{t('surplus.qty')}</span>
                    <span className="text-white font-medium">{form.quantity_kg} kg</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-slate-400">{t('surplus.aiPredictedLabel')}</span>
                    <span className="text-violet-400 font-medium">{prediction?.predicted_kg} kg</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-slate-400">{t('surplus.expiryLabel')}</span>
                    <span className="text-white font-medium">{form.expiry_hours} {t('surplus.hours')}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-slate-400">{t('surplus.estMeals')}</span>
                    <span className="text-green-400 font-bold">~{form.quantity_kg * 4} {t('common.meals')}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400">{t('surplus.impactValue')}</span>
                    <span className="text-amber-400 font-bold">₹{(form.quantity_kg * 100).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      <p className="font-semibold text-green-400 mb-1">{t('surplus.whatHappensNext')}</p>
                      <ul className="space-y-1 text-slate-400">
                        <li>{t('surplus.nextStep1')}</li>
                        <li>{t('surplus.nextStep2')}</li>
                        <li>{t('surplus.nextStep3')}</li>
                        <li>{t('surplus.nextStep4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                    {t('surplus.back')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('surplus.assigning')}
                      </>
                    ) : (
                      <>
                        {t('surplus.submitRescue')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Success State with Live Order Tracker */}
          {submitted && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 md:p-12 text-center glow-green"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-7xl mb-6"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">{t('surplus.successTitle')}</h2>
              <p className="text-slate-400 mb-6">
                {t('surplus.successDesc').split('<green>').length > 1 ? (() => {
                  const parts = t('surplus.successDesc').split(/<green>|<\/green>|<cyan>|<\/cyan>/);
                  return <>AI has assigned <span className="text-green-400 font-semibold">{parts[1]}</span> and driver <span className="text-cyan-400 font-semibold">{parts[3]}</span> is on the way!</>;
                })() : t('surplus.successDesc')}
              </p>

              {/* ── Live Order Stage Tracker ────────────────── */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Order Stage</h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {ORDER_STAGES.map((stage, idx) => {
                    const stageIdx = ORDER_STAGES.findIndex(s => s.key === orderStage);
                    const thisIdx = idx;
                    const isComplete = thisIdx < stageIdx;
                    const isCurrent = thisIdx === stageIdx;
                    const Icon = stage.icon;
                    return (
                      <div key={stage.key} className="flex items-center gap-2">
                        <div className={`flex flex-col items-center gap-1 ${isCurrent ? 'scale-110' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isComplete ? 'bg-green-500/20 ring-2 ring-green-500' :
                            isCurrent ? 'bg-white/10 ring-2 ring-cyan-400 animate-pulse' :
                            'bg-white/5 ring-1 ring-white/10'
                          }`}>
                            <Icon className={`w-5 h-5 ${isComplete ? 'text-green-400' : isCurrent ? stage.colour : 'text-slate-600'}`} />
                          </div>
                          <span className={`text-xs font-medium ${isComplete ? 'text-green-400' : isCurrent ? stage.colour : 'text-slate-600'}`}>
                            {stage.label}
                          </span>
                        </div>
                        {idx < ORDER_STAGES.length - 1 && (
                          <div className={`w-8 h-0.5 mb-5 ${isComplete ? 'bg-green-500' : 'bg-white/10'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {createdOrder?.id && (
                  <p className="text-xs text-slate-500 mt-3">
                    Order #{createdOrder.id} &middot; Status: <span className="text-cyan-400 font-semibold">{orderStage}</span>
                    {createdOrder.eta_minutes ? ` · ETA: ~${createdOrder.eta_minutes} min` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                <div className="text-center">
                  <Leaf className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">{form.quantity_kg} kg</div>
                  <div className="text-xs text-slate-500">{t('surplus.foodSavedLabel')}</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">~{form.quantity_kg * 4}</div>
                  <div className="text-xs text-slate-500">{t('surplus.meals')}</div>
                </div>
                <div className="text-center">
                  <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white">~{createdOrder?.eta_minutes || 25}</div>
                  <div className="text-xs text-slate-500">{t('surplus.minEta')}</div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setSubmitted(false); setStep(1); setCreatedOrder(null); setOrderStage('pending'); setForm({ food_description: '', quantity_kg: 0, food_category: 'mixed', expiry_hours: 2, photo_url: '' }); setPrediction(null); }}
                  className="btn-secondary"
                >
                  {t('surplus.markAnother')}
                </button>
                <a href="/tracking" className="btn-primary flex items-center gap-2">
                  {t('surplus.trackDelivery')}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── My Orders History ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-green-400" />
                My Surplus Orders
              </h2>
              <button
                onClick={fetchMyOrders}
                disabled={ordersLoading}
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <RefreshCcw className={`w-3 h-3 ${ordersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  {ordersLoading ? 'Loading your orders...' : 'No surplus orders yet. Create one above!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {myOrders.map((order, i) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    picked_up: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                    in_transit: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                    delivered: 'bg-green-500/10 text-green-400 border-green-500/20',
                    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
                    expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                  };
                  const statusStyle = statusColors[order.status] || statusColors.pending;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">
                              {order.food_description}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusStyle}`}>
                              {order.status?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {order.restaurant_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {order.restaurant_name}
                              </span>
                            )}
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
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-white">{order.quantity_kg} kg</div>
                          {order.eta_minutes > 0 && (
                            <div className="text-xs text-cyan-400 flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" /> ~{order.eta_minutes} min
                            </div>
                          )}
                          {order.distance_km > 0 && (
                            <div className="text-xs text-slate-500">{order.distance_km} km</div>
                          )}
                          <div className="text-xs text-slate-600 mt-0.5">#{order.id}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
