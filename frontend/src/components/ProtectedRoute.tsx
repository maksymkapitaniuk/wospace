import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Завантаження...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
