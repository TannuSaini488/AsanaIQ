import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTrainerProfile, upsertMyTrainerProfile } from '../services/trainerService';
import useAuth from '../hooks/useAuth';

const DEFAULT_FORM = {
  name: '',
  experienceYears: 0,
  specialization: '',
  certifications: '',
  languages: '',
  pricingPerSession: 0,
  isAvailable: true,
  bio: '',
};

function TrainerOnboarding() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await getMyTrainerProfile();
        if (profile) {
          setForm({
            experienceYears: profile.experienceYears ?? 0,
            specialization: Array.isArray(profile.specialization) ? profile.specialization.join(', ') : '',
            certifications: Array.isArray(profile.certifications) ? profile.certifications.join(', ') : '',
            languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : '',
            pricingPerSession: profile.pricingPerSession ?? 0,
            isAvailable: profile.isAvailable ?? true,
            bio: profile.bio || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const parseList = (value) =>
    String(value || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        experienceYears: Number(form.experienceYears),
        specialization: parseList(form.specialization),
        certifications: parseList(form.certifications),
        languages: parseList(form.languages),
        pricingPerSession: Number(form.pricingPerSession),
        isAvailable: Boolean(form.isAvailable),
        bio: String(form.bio || '').trim(),
      };
      await upsertMyTrainerProfile(payload);
      updateUser({ onboardingCompleted: true });
      setMessage('Trainer profile saved');
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>Trainer Setup</h1>
      {loading ? <p>Loading profile...</p> : null}
      <form onSubmit={onSubmit} className="auth-form" style={{ maxWidth: 520 }}>
        <label>
          Name
          <input name="name" type="text" value={form.name} onChange={onChange} required />
        </label>
        <label>
          Experience (years)
          <input
            name="experienceYears"
            type="number"
            min="0"
            max="80"
            value={form.experienceYears}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Pricing Per Session
          <input
            name="pricingPerSession"
            type="number"
            min="0"
            max="10000"
            value={form.pricingPerSession}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Specialization (comma-separated)
          <input name="specialization" value={form.specialization} onChange={onChange} />
        </label>
        <label>
          Certifications (comma-separated)
          <input name="certifications" value={form.certifications} onChange={onChange} />
        </label>
        <label>
          Languages (comma-separated)
          <input name="languages" value={form.languages} onChange={onChange} />
        </label>
        <label>
          <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={onChange} />
          Available for booking
        </label>
        <label>
          Bio
          <textarea name="bio" value={form.bio} onChange={onChange} rows={6} required />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        <button className="primary-btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
}

export default TrainerOnboarding;

