import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from './contexts/AuthContext';
import { db } from './firebase';
import { MAX_USERS } from './constants/app';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Loader from './components/Loader';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Expenses = lazy(() => import('./pages/Expenses'));
const PendingRequests = lazy(() => import('./pages/PendingRequests'));
const ImpactFund = lazy(() => import('./pages/ImpactFund'));
const ProjectAllocation = lazy(() => import('./pages/ProjectAllocation'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

/** Single full-screen loader — avoids a second top-of-page spinner. */
const FullScreenLoader = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--fh-surface)]">
    <Loader size="lg" label="Loading FinHub…" className="py-0" />
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();
  const [authConfig, setAuthConfig] = useState({ loading: true, userCount: 0 });

  useEffect(() => {
    if (user) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app', 'config'));
        const data = snap.exists() ? snap.data() : {};
        const hasUsers = !!data.hasUsers;
        const userCount = data.userCount ?? (hasUsers ? 1 : 0);
        if (!cancelled) setAuthConfig({ loading: false, userCount });
      } catch {
        if (!cancelled) setAuthConfig({ loading: false, userCount: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <FullScreenLoader />;

  if (!user) {
    if (authConfig.loading) return <FullScreenLoader />;
    const showSignup = authConfig.userCount < MAX_USERS;
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<AuthLayout />}>
            <Route
              index
              element={authConfig.userCount === 0 ? <Signup /> : <Login showSignupLink={showSignup} />}
            />
            {showSignup && <Route path="signup" element={<Signup />} />}
            <Route path="forgot-password" element={<ForgotPassword />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="pending" element={<PendingRequests />} />
          <Route path="impact-fund" element={<ImpactFund />} />
          <Route path="allocation" element={<ProjectAllocation />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
