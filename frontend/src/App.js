import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components & Layouts
import Loader from './components/common/Loader';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import AuthForm from './features/auth/AuthForm';
import UserDashboard from './pages/dashboard/UserDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import Settings from './pages/dashboard/Settings';
import MyReviews from './pages/dashboard/MyReviews';
import About from './pages/dashboard/About'; // <-- IMPORTED ABOUT PAGE

export default function App() {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <Loader fullScreen={true} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthForm />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected Routes (Require Authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/reviews" element={<MyReviews />} /> 
            <Route path="/about" element={<About />} /> {/* <-- THE NEW ROUTE */}
            <Route path="/settings" element={<Settings />} /> 
          </Route>
        </Route>

        {/* Admin Only Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={
          <div className="flex min-h-screen items-center justify-center">
            <h1 className="text-2xl font-bold text-gray-800" style={{ color: 'white' }}>404 - Page Not Found</h1>
          </div>
        } />
      </Routes>
    </Router>
  );
}