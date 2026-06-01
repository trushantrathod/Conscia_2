import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Loader from '../components/common/Loader';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, isLoading, dbUser } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullScreen={true} />;
  }

  // If not authenticated, redirect to auth page, saving the attempted URL
  if (!isAuthenticated || !dbUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
    // Redirect standard users away from admin routes
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}