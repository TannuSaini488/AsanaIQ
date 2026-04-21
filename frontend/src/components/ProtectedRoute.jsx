import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0) {
    const role = user?.role;
    if (!role || !roles.includes(role)) {
      return <div style={{ padding: 16 }}>Unauthorized (requires: {roles.join(', ')})</div>;
    }
  }
  return children;
}

export default ProtectedRoute;
