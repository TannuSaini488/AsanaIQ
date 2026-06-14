import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Award, DollarSign } from 'lucide-react';
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

function TrainerOnboarding({ isEmbedded = false }) {
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);

  const totalSteps = 2;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await getMyTrainerProfile();
        if (profile) {
          setForm({
            name: profile.name || user?.name || '',
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
    if (step < totalSteps) {
      nextStep();
      return;
    }
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
      setMessage('Trainer profile saved successfully');
      if (!isEmbedded) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim() !== '' && form.bio.trim() !== '';
    return true;
  };

  const nextStep = () => {
    if (canProceed() && step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (isEmbedded) {
    return (
      <section style={styles.embeddedContainer}>
        <form onSubmit={onSubmit} style={styles.profileForm}>
          <h3 style={styles.formTitle}>Update Your Trainer Profile</h3>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Name</label>
            <input style={styles.input} name="name" type="text" value={form.name} onChange={onChange} required />
          </div>

          <div style={styles.twoColumnGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Experience (years)</label>
              <input style={styles.input} name="experienceYears" type="number" min="0" max="80" value={form.experienceYears} onChange={onChange} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Price Per Session</label>
              <input style={styles.input} name="pricingPerSession" type="number" min="0" value={form.pricingPerSession} onChange={onChange} />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Specialization (comma-separated)</label>
            <input style={styles.input} name="specialization" value={form.specialization} onChange={onChange} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Certifications (comma-separated)</label>
            <input style={styles.input} name="certifications" value={form.certifications} onChange={onChange} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Languages (comma-separated)</label>
            <input style={styles.input} name="languages" value={form.languages} onChange={onChange} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={onChange} />
              Available for booking
            </label>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Bio</label>
            <textarea style={{...styles.input, minHeight: '100px'}} name="bio" value={form.bio} onChange={onChange} required />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}

          <button style={styles.submitButton} type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.header}
      >
        <h1 style={styles.title}>Trainer Profile Setup</h1>
        <p style={styles.subtitle}>Share your expertise and start your yoga teaching journey</p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div style={styles.progressContainer}>
        {[1, 2].map((i) => (
          <div key={i}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              style={{
                ...styles.progressStep,
                background: i <= step ? 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' : 'rgba(255, 255, 255, 0.1)',
                color: i <= step ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {i < step ? <Check size={18} /> : i}
            </motion.div>
            {i < 2 && <div style={styles.progressLine} />}
          </div>
        ))}
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.formCard}
      >
        {loading ? (
          <p style={styles.loadingText}>Loading your profile...</p>
        ) : (
          <div>
            {/* Step 1: Basic Info & Bio */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <h2 style={styles.stepTitle}>
                  <Award size={24} style={{ marginRight: 12 }} />
                  Basic Information
                </h2>
                <p style={styles.stepDescription}>Tell us about yourself</p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    style={styles.input}
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>

                <div style={styles.twoColumnGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Experience (Years) *</label>
                    <input
                      style={styles.input}
                      name="experienceYears"
                      type="number"
                      min="0"
                      max="80"
                      value={form.experienceYears}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Price Per Session ($) *</label>
                    <input
                      style={styles.input}
                      name="pricingPerSession"
                      type="number"
                      min="0"
                      max="10000"
                      value={form.pricingPerSession}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Bio *</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '120px', resize: 'vertical' }}
                    name="bio"
                    placeholder="Tell students about your teaching philosophy, background, and what makes you unique"
                    value={form.bio}
                    onChange={onChange}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="isAvailable"
                      checked={form.isAvailable}
                      onChange={onChange}
                    />
                    I'm available for bookings
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 2: Specialization & Credentials */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <h2 style={styles.stepTitle}>
                  <DollarSign size={24} style={{ marginRight: 12 }} />
                  Expertise & Credentials
                </h2>
                <p style={styles.stepDescription}>Highlight your qualifications</p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Specialization</label>
                  <input
                    style={styles.input}
                    name="specialization"
                    placeholder="e.g., Hatha, Vinyasa, Kundalini (comma-separated)"
                    value={form.specialization}
                    onChange={onChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Certifications</label>
                  <input
                    style={styles.input}
                    name="certifications"
                    placeholder="e.g., RYT-200, RYT-500 (comma-separated)"
                    value={form.certifications}
                    onChange={onChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Languages You Teach In</label>
                  <input
                    style={styles.input}
                    name="languages"
                    placeholder="e.g., English, Spanish, French (comma-separated)"
                    value={form.languages}
                    onChange={onChange}
                  />
                </div>

                <div style={styles.reviewBox}>
                  <h4 style={styles.reviewTitle}>Summary</h4>
                  <div style={styles.reviewItem}>
                    <span>Name:</span>
                    <strong>{form.name}</strong>
                  </div>
                  <div style={styles.reviewItem}>
                    <span>Experience:</span>
                    <strong>{form.experienceYears} years</strong>
                  </div>
                  <div style={styles.reviewItem}>
                    <span>Price:</span>
                    <strong>${form.pricingPerSession}/session</strong>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error & Message */}
            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}

            {/* Buttons */}
            <div style={styles.buttonGroup}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  style={styles.secondaryButton}
                  disabled={saving}
                >
                  <ArrowLeft size={18} style={{ marginRight: 8 }} />
                  Back
                </button>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  style={styles.primaryButton}
                  disabled={!canProceed() || saving}
                >
                  Next
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  <Check size={18} style={{ marginRight: 8 }} />
                  {saving ? 'Saving...' : 'Complete Profile'}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F0F9FF 0%, #F5F3FF 100%)',
    paddingTop: '80px',
    paddingBottom: '60px',
  },

  header: {
    textAlign: 'center',
    marginBottom: '60px',
    maxWidth: '700px',
    margin: '0 auto 60px',
  },

  title: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '12px',
    fontFamily: "'Poppins', sans-serif",
  },

  subtitle: {
    fontSize: '18px',
    color: '#6B7280',
    lineHeight: '1.6',
    fontFamily: "'Poppins', sans-serif",
  },

  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '50px',
  },

  progressStep: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },

  progressLine: {
    width: '24px',
    height: '3px',
    background: 'rgba(6, 182, 212, 0.3)',
  },

  formCard: {
    maxWidth: '600px',
    margin: '0 auto',
    background: '#FFFFFF',
    borderRadius: '20px',
    padding: '50px 40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.1)',
  },

  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: '16px',
  },

  stepTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Poppins', sans-serif",
  },

  stepDescription: {
    color: '#9CA3AF',
    fontSize: '14px',
    marginBottom: '30px',
    fontFamily: "'Poppins', sans-serif",
  },

  inputGroup: {
    marginBottom: '24px',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
    fontFamily: "'Poppins', sans-serif",
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer',
    gap: '8px',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #E5E7EB',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
  },

  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },

  reviewBox: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
    marginBottom: '20px',
  },

  reviewTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },

  reviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#6B7280',
  },

  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '40px',
  },

  primaryButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: 'white',
    padding: '14px 28px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
  },

  secondaryButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(229, 231, 235, 1)',
    color: '#374151',
    padding: '14px 28px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '15px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
  },

  error: {
    background: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    borderLeft: '4px solid #DC2626',
  },

  success: {
    background: '#D1FAE5',
    color: '#065F46',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    borderLeft: '4px solid #10B981',
  },

  embeddedContainer: {
    padding: '24px',
  },

  profileForm: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
  },

  formTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '20px',
  },

  submitButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
  },
};

export default TrainerOnboarding;

