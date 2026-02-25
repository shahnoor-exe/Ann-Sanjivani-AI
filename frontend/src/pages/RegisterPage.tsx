import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Mail, Lock, User, Phone, ArrowRight, Building2, HeartHandshake, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store';
import { authAPI } from '../api';
import { appwriteAuth } from '../lib/appwrite';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'restaurant', label: 'restaurant', icon: Building2, desc: 'Donate surplus food', color: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  { key: 'ngo', label: 'ngo', icon: HeartHandshake, desc: 'Receive & distribute', color: 'border-green-500/30 bg-green-500/10 text-green-400' },
  { key: 'driver', label: 'driver', icon: Truck, desc: 'Deliver food', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'restaurant',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Register with FastAPI backend (primary auth)
      const res = await authAPI.register(form);
      login(res.data.user, res.data.access_token);

      // 2. Also register with Appwrite (cloud sync) — fire-and-forget
      appwriteAuth.register(form.email, form.password, form.full_name, form.role)
        .then((aw) => {
          if (aw.success) {
            console.log('[Appwrite] User synced to cloud ✓');
          } else {
            console.warn('[Appwrite] Sync skipped:', aw.error);
          }
        })
        .catch((err) => console.warn('[Appwrite] Sync error:', err));

      toast.success(`Welcome to Ann-Sanjivani AI, ${res.data.user.full_name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute top-20 -right-40 w-96 h-96 blob-green" />
      <div className="absolute -bottom-20 -left-40 w-80 h-80 blob-purple" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 md:p-10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <Utensils className="w-6 h-6 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold font-display text-white">{t('auth.registerTitle')}</h1>
            <p className="text-slate-400 mt-1 text-sm">{t('auth.registerSubtitle')}</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => setForm({ ...form, role: role.key })}
                className={`p-3 rounded-xl border text-center transition-all duration-300 ${
                  form.role === role.key ? role.color : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <role.icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-semibold">{t(`auth.${role.label}`)}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input-field pl-10"
                  placeholder={t('auth.fullName')}
                  required
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-10"
                  placeholder={t('auth.email')}
                  required
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field pl-10"
                  placeholder={t('auth.phone')}
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-10"
                  placeholder={t('auth.password')}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('auth.createAccount')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
