import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthPage } from '../pages/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that protects routes by requiring authentication
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return fallback ? <>{fallback}</> : <AuthPage />;
  }

  return <>{children}</>;
};
