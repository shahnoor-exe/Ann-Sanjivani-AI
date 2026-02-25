import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Utensils, Menu, X, LayoutDashboard, MapPin, BarChart3, Brain, 
  LogIn, UserPlus, Truck, Globe,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

const ALL_NAV_LINKS = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['restaurant', 'ngo', 'driver', 'admin'] },
  { key: 'liveMap', path: '/tracking', icon: MapPin, roles: ['restaurant', 'ngo', 'driver', 'admin'] },
  { key: 'impact', path: '/impact', icon: BarChart3, roles: ['restaurant', 'ngo', 'driver', 'admin'] },
  { key: 'aiDemo', path: '/ai-demo', icon: Brain, roles: ['restaurant', 'ngo', 'driver', 'admin'] },
  { key: 'surplus', path: '/surplus', icon: Truck, roles: ['restaurant', 'admin'] },
];

const ROLE_COLORS: Record<string, string> = {
  restaurant: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ngo: 'bg-green-500/20 text-green-300 border-green-500/30',
  driver: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  admin: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Filter nav links by user's role
  const NAV_LINKS = ALL_NAV_LINKS.filter(
    (link) => !isAuthenticated || !user?.role || link.roles.includes(user.role)
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20"
            >
              <Utensils className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold font-display">
              <span className="text-white">Ann-</span>
              <span className="text-green-400">Sanjivani AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {t(`nav.${link.key}`)}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons + Language */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs">{currentLang.flag}</span>
              </button>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1.5 z-50"
                >
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        i18n.language === lang.code
                          ? 'text-green-400 bg-green-500/10'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[user.role] || 'text-slate-400'}`}>
                    {user.role}
                  </span>
                )}
                <span className="text-sm text-slate-400">
                  {user?.full_name || 'User'}
                </span>
                <button onClick={logout} className="btn-secondary text-sm py-2 px-4">
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                  <LogIn className="w-4 h-4" />
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4 flex items-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-white/5"
        >
          <div className="px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
              >
                <link.icon className="w-5 h-5" />
                {t(`nav.${link.key}`)}
              </Link>
            ))}

            {/* Mobile Language Selector */}
            <div className="border-t border-white/5 pt-3 pb-1">
              <div className="flex flex-wrap gap-2 px-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setMobileOpen(false); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      i18n.language === lang.code
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'text-slate-400 border border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 flex gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1 text-center text-sm py-2">
                {t('nav.login')}
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1 text-center text-sm py-2">
                {t('nav.register')}
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
