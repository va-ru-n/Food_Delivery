import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, children, allowedRoles = [] }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
