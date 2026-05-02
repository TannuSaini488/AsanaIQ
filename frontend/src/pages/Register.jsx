import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../services/authService';
import useAuth from '../hooks/useAuth';

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
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
      const { token, role, data } = await registerApi(form);
      login({
        token,
        refreshToken: data?.refreshToken || '',
        expiresIn: data?.expiresIn || 0,
        user: {
          email: form.email,
          role,
          localId: data?.localId || data?.uid || null,
          onboardingCompleted: false,
        },
      });
      navigate(form.role === 'trainer' ? '/trainer-onboarding' : '/onboarding');
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
          <h2 className="premium-title">Join AsanaIQ</h2>
          <p className="premium-subtitle">Start your personalized yoga journey today</p>
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
          
          <div className="role-selector">
            <label>I want to join as a:</label>
            <div className="role-options">
              <label className={`role-option ${form.role === 'student' ? 'selected' : ''}`}>
                <input type="radio" name="role" value="student" checked={form.role === 'student'} onChange={handleChange} />
                <span className="role-icon">🧘</span>
                <span className="role-text">Student</span>
              </label>
              <label className={`role-option ${form.role === 'trainer' ? 'selected' : ''}`}>
                <input type="radio" name="role" value="trainer" checked={form.role === 'trainer'} onChange={handleChange} />
                <span className="role-icon">🧑‍🏫</span>
                <span className="role-text">Trainer</span>
              </label>
            </div>
          </div>
          
          {error && <div className="premium-error">{error}</div>}
          <button type="submit" className="primary-btn large premium-submit-btn" disabled={loading || !form.email || !form.password}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p className="muted">
            Already have an account? <Link to="/login" className="gradient-text">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
