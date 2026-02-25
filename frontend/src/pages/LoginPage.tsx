import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store';
import { authAPI } from '../api';
import { appwriteAuth } from '../lib/appwrite';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('restaurant1@foodrescue.in');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Login with FastAPI backend (primary auth — JWT token)
      const res = await authAPI.login(email, password);
      login(res.data.user, res.data.access_token);

      // 2. Also login with Appwrite (cloud sync) — fire-and-forget
      const userName = res.data.user.full_name;
      const userRole = res.data.user.role;
      appwriteAuth.login(email, password)
        .then(async (aw) => {
          if (aw.success) {
            console.log('[Appwrite] Session created ✓');
          } else {
            // User might not exist in Appwrite yet (e.g., seed data) — register them
            console.log('[Appwrite] Login failed, attempting auto-register...');
            const reg = await appwriteAuth.register(email, password, userName, userRole);
            if (reg.success) {
              console.log('[Appwrite] Auto-registered & synced ✓');
            } else {
              console.warn('[Appwrite] Auto-register skipped:', reg.error);
            }
          }
        })
        .catch((err) => console.warn('[Appwrite] Sync error:', err));

      toast.success(`Welcome back, ${res.data.user.full_name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-20 -left-40 w-96 h-96 blob-green" />
      <div className="absolute -bottom-20 -right-40 w-80 h-80 blob-blue" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 md:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <Utensils className="w-6 h-6 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold font-display text-white">{t('auth.loginTitle')}</h1>
            <p className="text-slate-400 mt-1 text-sm">{t('auth.loginSubtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  {t('auth.signIn')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
            <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3 h-3" />
              {t('auth.demoCreds')}
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <p><span className="text-slate-300">Restaurant:</span> restaurant1@foodrescue.in / demo123</p>
              <p><span className="text-slate-300">NGO:</span> ngo1@foodrescue.in / demo123</p>
              <p><span className="text-slate-300">Driver:</span> driver1@foodrescue.in / demo123</p>
              <p><span className="text-slate-300">Admin:</span> admin@foodrescue.in / admin123</p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-green-400 hover:text-green-300 font-medium">
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
