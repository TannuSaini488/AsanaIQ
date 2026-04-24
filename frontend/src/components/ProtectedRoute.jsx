import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function ProtectedRoute({ children, roles, requireOnboarding = true }) {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0) {
    const role = user?.role;
    if (!role || !roles.includes(role)) {
      return <div style={{ padding: 16 }}>Unauthorized (requires: {roles.join(', ')})</div>;
    }
  }

  // Only redirect if onboardingCompleted is EXPLICITLY false (not undefined/null).
  // This prevents blocking existing users who logged in before this feature was added.
  if (requireOnboarding && user && user.onboardingCompleted === false) {
    const onboardingRoute = user.role === 'trainer' ? '/trainer-onboarding' : '/onboarding';
    return <Navigate to={onboardingRoute} replace />;
  }

  return children;
}

export default ProtectedRoute;

