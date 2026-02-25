import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SurplusPage from './pages/SurplusPage';
import TrackingPage from './pages/TrackingPage';
import ImpactPage from './pages/ImpactPage';
import AIDemo from './pages/AIDemo';
import { useEffect, ReactNode } from 'react';
import { authAPI } from './api';

// ── Role-based route guard ──────────────────────────────
type UserRole = 'restaurant' | 'ngo' | 'driver' | 'admin';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are restricted and user's role isn't in the list, redirect to dashboard
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── Auto-load user from token on mount ─────────────────
function AuthLoader({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch(() => logout());
    }
  }, [isAuthenticated, user, setUser, logout]);

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthLoader>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#f8fafc' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/surplus"
            element={
              <ProtectedRoute allowedRoles={['restaurant', 'admin']}>
                <SurplusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <TrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/impact"
            element={
              <ProtectedRoute>
                <ImpactPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-demo"
            element={
              <ProtectedRoute>
                <AIDemo />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthLoader>
    </Router>
  );
}

export default App;
