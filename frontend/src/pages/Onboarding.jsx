import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyStudentProfile, upsertMyStudentProfile } from '../services/studentProfileService';
import useAuth from '../hooks/useAuth';

const DEFAULT_FORM = {
  name: '',
  age: 25,
  gender: 'female',
  weight: 65,
  height: 165,
  injuries: '',
  medicalConditions: '',
  fitnessLevel: 'beginner',
  primaryGoal: 'flexibility',
  preferredTrainerGender: 'any',
  onboardingCompleted: true,
};

function Onboarding({ isEmbedded = false }) {
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await getMyStudentProfile();
        if (profile) {
          setForm({
            name: profile.name || user?.name || '',
            age: profile.age ?? 25,
            gender: profile.gender || 'female',
            weight: profile.weight ?? 65,
            height: profile.height ?? 165,
            injuries: Array.isArray(profile.injuries) ? profile.injuries.join(', ') : '',
            medicalConditions: Array.isArray(profile.medicalConditions)
              ? profile.medicalConditions.join(', ')
              : '',
            fitnessLevel: profile.fitnessLevel || 'beginner',
            primaryGoal: profile.primaryGoal || 'flexibility',
            preferredTrainerGender: profile.preferredTrainerGender || 'any',
            onboardingCompleted: Boolean(profile.onboardingCompleted),
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        weight: Number(form.weight),
        height: Number(form.height),
        injuries: form.injuries
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        medicalConditions: form.medicalConditions
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        fitnessLevel: form.fitnessLevel,
        primaryGoal: form.primaryGoal,
        preferredTrainerGender: form.preferredTrainerGender,
        onboardingCompleted: Boolean(form.onboardingCompleted),
      };
      await upsertMyStudentProfile(payload);
      updateUser({ onboardingCompleted: true });
      setMessage('Profile saved successfully');
      if (!isEmbedded) {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      {!isEmbedded && <h1>Student Onboarding</h1>}
      {loading ? <p>Loading profile...</p> : null}
      <form onSubmit={onSubmit} className={isEmbedded ? "profile-form" : "auth-form"} style={isEmbedded ? {} : { maxWidth: 520 }}>
        <label>
          Name
          <input name="name" type="text" value={form.name} onChange={onChange} required />
        </label>
        <label>
          Age
          <input name="age" type="number" min="13" max="100" value={form.age} onChange={onChange} />
        </label>
        <label>
          Gender
          <input name="gender" value={form.gender} onChange={onChange} />
        </label>
        <label>
          Weight (kg)
          <input name="weight" type="number" min="1" value={form.weight} onChange={onChange} />
        </label>
        <label>
          Height (cm)
          <input name="height" type="number" min="1" value={form.height} onChange={onChange} />
        </label>
        <label className={isEmbedded ? "full-width" : ""}>
          Injuries (comma-separated)
          <input name="injuries" value={form.injuries} onChange={onChange} />
        </label>
        <label className={isEmbedded ? "full-width" : ""}>
          Medical Conditions (comma-separated)
          <input name="medicalConditions" value={form.medicalConditions} onChange={onChange} />
        </label>
        <label>
          Fitness Level
          <select name="fitnessLevel" value={form.fitnessLevel} onChange={onChange}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className={isEmbedded ? "full-width" : ""}>
          Primary Goal
          <input name="primaryGoal" value={form.primaryGoal} onChange={onChange} />
        </label>
        <label>
          Preferred Trainer Gender
          <input name="preferredTrainerGender" value={form.preferredTrainerGender} onChange={onChange} />
        </label>
        {!isEmbedded && (
          <label>
            <input
              type="checkbox"
              name="onboardingCompleted"
              checked={form.onboardingCompleted}
              onChange={onChange}
            />
            Onboarding Completed
          </label>
        )}
        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        <div className={isEmbedded ? "submit-btn-wrapper" : ""}>
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : (isEmbedded ? 'Update Information' : 'Save Profile')}
          </button>
        </div>
      </form>

      {plan ? (
        <div className="ai-card" style={{ marginTop: 16 }}>
          <h3>AI Plan</h3>
          <p>
            <strong>Level:</strong> {plan.level}
          </p>
          <p>
            <strong>Trainer Type:</strong> {plan.recommended_trainer_type}
          </p>
          <p>
            <strong>Estimated Progress:</strong> {plan.estimated_progress}
          </p>
          <p>
            <strong>Precautions:</strong> {(plan.precautions || []).join(', ')}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default Onboarding;
