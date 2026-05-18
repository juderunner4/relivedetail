import { Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './Toast';

export default function ProtectedRoute() {
  const token = localStorage.getItem('relive_token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}
