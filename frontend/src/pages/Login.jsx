import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../services/authService';
import useAuth from '../hooks/useAuth';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, role, onboardingCompleted, data } = await loginApi(form);
      login({
        token,
        refreshToken: data?.refreshToken || '',
        expiresIn: data?.expiresIn || 0,
        user: { email: form.email, role, localId: data?.localId || null, onboardingCompleted: !!onboardingCompleted },
      });
      if (!onboardingCompleted) {
        navigate(role === 'trainer' ? '/trainer-onboarding' : '/onboarding');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-auth-page">
      <div className="auth-glow-bg"></div>
      <div className="glass-card auth-premium-card">
        <div className="auth-header">
          <h2 className="premium-title">Welcome Back</h2>
          <p className="premium-subtitle">Enter your credentials to continue your journey</p>
        </div>
        
        <form onSubmit={handleSubmit} className="premium-form">
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="hello@asanaiq.com" required className="premium-input" />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="premium-input"
            />
          </div>
          {error && <div className="premium-error">{error}</div>}
          <button type="submit" className="primary-btn large premium-submit-btn" disabled={loading || !form.email || !form.password}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p className="muted">
            Don't have an account? <Link to="/register" className="gradient-text">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
