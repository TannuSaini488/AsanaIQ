import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { generateProgress } from '../services/aiService';
import { getMyStudentProfile, upsertMyStudentProfile } from '../services/studentProfileService';

import { createReview } from '../services/reviewService';
import { getMyConnections } from '../services/connectionService';


/* ─── Animated SVG score ring ─────────────────────────────────── */
function ScoreRing({ score = 0, size = 160, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {/* track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      {/* progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.4s ease' }}
      />
      {/* label */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#0f172a"
        fontSize={size / 5}
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {score}
      </text>
      <text
        x="50%"
        y="62%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#64748b"
        fontSize={size / 10}
        fontFamily="Inter, sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}

/* ─── Horizontal bar ──────────────────────────────────────────── */
function ProgressBar({ value = 0, color = '#6366f1' }) {
  return (
    <div style={{
      background: '#e2e8f0',
      borderRadius: 99,
      height: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        background: color,
        borderRadius: 99,
        transition: 'width 1s ease',
      }} />
    </div>
  );
}

/* ─── Chip tag ────────────────────────────────────────────────── */
function Chip({ label, variant = 'strength' }) {
  const colors = {
    strength: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#86efac' },
    risk: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#fca5a5' },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 99,
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      fontSize: 13,
      fontWeight: 500,
      margin: '4px 4px 0 0',
    }}>
      {label}
    </span>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
function Progress() {
  const { token, user } = useAuth();
  const studentId =
    extractUserIdFromToken(token) || user?.localId || user?.id || user?.uid || '';

  const [activeTab, setActiveTab] = useState('progress');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError]   = useState('');
  const [report, setReport] = useState(null);
  const [profile, setProfile] = useState(null);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    fitnessLevel: 'beginner',
    primaryGoal: '',
    injuries: '',
    medicalConditions: '',
    preferredTrainerGender: 'Any',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');


  // Review Form States
  const [reviewForm, setReviewForm] = useState({ trainerId: '', rating: 5, comment: '' });
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');


  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const data = await getMyStudentProfile();
        setProfile(data);
        if (data) {
          setProfileForm({
            name: data.name || '',
            age: data.age || '',
            gender: data.gender || '',
            weight: data.weight || '',
            height: data.height || '',
            fitnessLevel: data.fitnessLevel || 'beginner',
            primaryGoal: data.primaryGoal || '',
            injuries: Array.isArray(data.injuries) ? data.injuries.join(', ') : '',
            medicalConditions: Array.isArray(data.medicalConditions) ? data.medicalConditions.join(', ') : '',
            preferredTrainerGender: data.preferredTrainerGender || 'Any',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    if (activeTab === 'profile') {
      loadProfile();
    }
  }, [activeTab]);

  // Load connections data for review selection
  useEffect(() => {
    const loadConnections = async () => {
      setConnectionsLoading(true);
      try {
        const data = await getMyConnections();
        // filter accepted trainer connections
        const accepted = (data || [])
          .filter((conn) => conn.status === 'accepted' && conn.peerId)
          .map((conn) => ({
            id: conn.peerId,
            name: conn.peerName || conn.peerId,
          }));
        setConnections(accepted);
      } catch (err) {
        console.error('Error loading connections:', err);
      } finally {
        setConnectionsLoading(false);
      }
    };
    if (activeTab === 'reviews' && studentId) {
      loadConnections();
    }
  }, [activeTab, studentId]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileError('');
    setProfileSuccess('');

    const age = parseInt(profileForm.age, 10);
    const weight = parseFloat(profileForm.weight);
    const height = parseFloat(profileForm.height);

    if (isNaN(age) || age < 13 || age > 100) {
      setProfileError('Age must be a number between 13 and 100.');
      setProfileSubmitting(false);
      return;
    }
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      setProfileError('Weight must be a valid positive number.');
      setProfileSubmitting(false);
      return;
    }
    if (isNaN(height) || height <= 0 || height > 300) {
      setProfileError('Height must be a valid positive number.');
      setProfileSubmitting(false);
      return;
    }

    const injuries = profileForm.injuries
      ? profileForm.injuries.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const medicalConditions = profileForm.medicalConditions
      ? profileForm.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: profileForm.name.trim(),
      age,
      gender: profileForm.gender.trim(),
      weight,
      height,
      injuries,
      medicalConditions,
      fitnessLevel: profileForm.fitnessLevel,
      primaryGoal: profileForm.primaryGoal.trim(),
      preferredTrainerGender: profileForm.preferredTrainerGender.trim(),
      onboardingCompleted: true,
    };

    try {
      const updatedProfile = await upsertMyStudentProfile(payload);
      setProfile({
        ...updatedProfile,
        name: payload.name,
      });
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.trainerId || !reviewForm.comment) return;
    setReviewSubmitting(true);
    setReviewError('');
    setReviewMessage('');
    try {
      await createReview({
        trainerId: reviewForm.trainerId,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });
      setReviewMessage('Your review has been submitted successfully!');
      setReviewForm({ trainerId: '', rating: 5, comment: '' });
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };


  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generateProgress(studentId || undefined);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to generate progress report.');
    } finally {
      setLoading(false);
    }
  };




  /* ── styles ── */
  const page = {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '48px 20px',
    fontFamily: "'Poppins', 'Inter', 'Segoe UI', sans-serif",
    color: '#0f172a',
  };

  const headerContainer = {
    textAlign: 'center',
    marginBottom: '48px',
  };

  const headerTitle = {
    fontSize: '42px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 12px',
    fontFamily: "'Poppins', sans-serif",
  };

  const headerSubtitle = {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0,
    lineHeight: '1.6',
  };

  const tabsContainer = {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px',
  };

  const tabButton = (isActive) => ({
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    color: isActive ? '#9D4EDD' : '#6B7280',
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid #9D4EDD' : 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
  });

  const card = {
    maxWidth: 680,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '40px 36px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
  };

  const btn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: loading ? '#94a3b8' : '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
  };

  return (
    <div style={page}>
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={headerContainer}>
        <h1 style={headerTitle}>
          My <span style={{ color: '#9D4EDD' }}>Journey</span>
        </h1>
        <p style={headerSubtitle}>Personalized path to wellness, progress tracking, and reflections.</p>
      </div>

      {/* Tabs */}
      <div style={tabsContainer}>
        <button
          style={tabButton(activeTab === 'profile')}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          style={tabButton(activeTab === 'progress')}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          style={tabButton(activeTab === 'reviews')}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>

      <div style={card}>
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', margin: 0, fontFamily: "'Poppins', sans-serif" }}>
                Your Profile
              </h2>
              {profile && !profileLoading && (
                <button
                  style={{
                    ...btn,
                    padding: '8px 16px',
                    fontSize: '13px',
                    background: isEditingProfile ? '#6B7280' : '#9D4EDD',
                  }}
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setProfileError('');
                    setProfileSuccess('');
                  }}
                >
                  {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                </button>
              )}
            </div>

            {profileSuccess && (
              <div style={{ padding: '12px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '8px', color: '#065F46', fontSize: '14px', marginBottom: '16px' }}>
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div style={{ padding: '12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '14px', marginBottom: '16px' }}>
                {profileError}
              </div>
            )}

            {profileLoading ? (
              <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading profile...</p>
            ) : isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Age</label>
                    <input
                      type="number"
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      min="13"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Gender</label>
                    <input
                      type="text"
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      placeholder="e.g. Male, Female, Non-binary"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Fitness Level</label>
                    <select
                      value={profileForm.fitnessLevel}
                      onChange={(e) => setProfileForm({ ...profileForm, fitnessLevel: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#fff' }}
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={profileForm.weight}
                      onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={profileForm.height}
                      onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Primary Goal</label>
                    <input
                      type="text"
                      value={profileForm.primaryGoal}
                      onChange={(e) => setProfileForm({ ...profileForm, primaryGoal: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Preferred Trainer Gender</label>
                    <input
                      type="text"
                      value={profileForm.preferredTrainerGender}
                      onChange={(e) => setProfileForm({ ...profileForm, preferredTrainerGender: e.target.value })}
                      placeholder="e.g. Female, Male, Any"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Injuries (comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.injuries}
                      onChange={(e) => setProfileForm({ ...profileForm, injuries: e.target.value })}
                      placeholder="e.g. Knee pain, Back stiffness"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '4px' }}>Medical Conditions (comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.medicalConditions}
                      onChange={(e) => setProfileForm({ ...profileForm, medicalConditions: e.target.value })}
                      placeholder="e.g. Asthma, Hypertension"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileSubmitting}
                  style={{
                    ...btn,
                    justifyContent: 'center',
                    background: '#9D4EDD',
                    cursor: profileSubmitting ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                  }}
                >
                  {profileSubmitting ? 'Saving Profile...' : 'Save Profile'}
                </button>
              </form>
            ) : profile ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Name</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.name || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Age</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.age || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Gender</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.gender || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Fitness Level</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.fitnessLevel || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Weight (kg)</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.weight || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Height (cm)</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.height || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Primary Goal</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.primaryGoal || 'N/A'}</p>
                </div>
                <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>Preferred Trainer Gender</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', margin: 0 }}>{profile.preferredTrainerGender || 'N/A'}</p>
                </div>
                {profile.injuries && profile.injuries.length > 0 && (
                  <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '8px', gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: '12px', color: '#991B1B', fontWeight: '600', margin: '0 0 8px', textTransform: 'uppercase' }}>⚠️ Injuries</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {profile.injuries.map((injury, idx) => (
                        <span key={idx} style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#DC2626',
                          borderRadius: '999px',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}>
                          {injury}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.medicalConditions && profile.medicalConditions.length > 0 && (
                  <div style={{ padding: '16px', background: '#EFF6FF', borderRadius: '8px', gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: '12px', color: '#1E40AF', fontWeight: '600', margin: '0 0 8px', textTransform: 'uppercase' }}>🩺 Medical Conditions</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {profile.medicalConditions.map((condition, idx) => (
                        <span key={idx} style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: 'rgba(59,130,246,0.15)',
                          color: '#2563EB',
                          borderRadius: '999px',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}>
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#9CA3AF' }}>No profile data available</p>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #9D4EDD',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <p style={{ color: '#64748b', fontSize: '15px' }}>Analyzing your journey...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
              <button style={btn} onClick={run}>Retry Analysis</button>
            </div>
          ) : !report ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>No progress analysis generated yet.</p>
              <button style={btn} onClick={run}>Generate Progress Report</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', margin: 0, fontFamily: "'Poppins', sans-serif" }}>
                  AI Progress Analysis
                </h2>
                <button 
                  style={{ 
                    ...btn, 
                    padding: '8px 16px', 
                    fontSize: '13px', 
                    background: '#9D4EDD', 
                    borderRadius: '8px', 
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }} 
                  onClick={run} 
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Regenerate Progress'}
                </button>
              </div>

              {/* Score row */}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                marginBottom: 28,
              }}>
                {/* Progress score ring */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}>
                  <ScoreRing score={report.progressScore ?? 0} />
                  <p style={{ margin: '12px 0 0', fontSize: 14, color: '#475569', fontWeight: 500 }}>
                    Progress Score
                  </p>
                </div>

                {/* Consistency */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, color: '#475569', fontWeight: 500 }}>
                    Consistency Rate
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 36, fontWeight: 700, color: '#0f172a' }}>
                    {report.consistencyRate ?? 0}
                    <span style={{ fontSize: 18, color: '#64748b' }}>%</span>
                  </p>
                  <ProgressBar value={report.consistencyRate ?? 0} color="#f59e0b" />
                </div>
              </div>

              {/* Strength Areas */}
              {(report.strengthAreas || []).length > 0 && (
                <div style={{
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.18)',
                  borderRadius: 16,
                  padding: '20px 22px',
                  marginBottom: 16,
                }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#22c55e' }}>
                    💪 Strength Areas
                  </p>
                  <div>
                    {(report.strengthAreas || []).map((s, i) => (
                      <Chip key={i} label={s} variant="strength" />
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Areas */}
              {(report.riskAreas || []).length > 0 && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 16,
                  padding: '20px 22px',
                  marginBottom: 16,
                }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#ef4444' }}>
                    ⚠️ Risk Areas
                  </p>
                  <div>
                    {(report.riskAreas || []).map((r, i) => (
                      <Chip key={i} label={r} variant="risk" />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {report.recommendation && (
                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px 22px',
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14, color: '#334155' }}>
                    🤖 AI Recommendation
                  </p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#475569' }}>
                    {report.recommendation}
                  </p>
                </div>
              )}
            </div>
          )
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', marginBottom: '8px', fontFamily: "'Poppins', sans-serif" }}>
              Submit a Review
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
              Share your training experience with your connected coach to help them improve and keep your progress updated.
            </p>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Select Trainer
                </label>
                <select
                  value={reviewForm.trainerId}
                  onChange={(e) => setReviewForm({ ...reviewForm, trainerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    color: '#374151',
                    background: '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  required
                  disabled={connectionsLoading}
                >
                  <option value="">
                    {connectionsLoading ? 'Loading trainers...' : 'Choose a connected trainer'}
                  </option>
                  {connections.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
                {!connectionsLoading && connections.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px' }}>
                    You don't have any accepted trainer connections yet.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Rating (1-5 stars)
                </label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    color: '#374151',
                    background: '#fff',
                    outline: 'none',
                  }}
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                  <option value="4">⭐⭐⭐⭐ (4/5)</option>
                  <option value="3">⭐⭐⭐ (3/5)</option>
                  <option value="2">⭐⭐ (2/5)</option>
                  <option value="1">⭐ (1/5)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Review Comment
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details about your session, the trainer's guidance, posture corrections, etc..."
                  rows="5"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    color: '#374151',
                    background: '#fff',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  required
                />
              </div>

              {reviewError && (
                <div style={{ padding: '12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '14px' }}>
                  {reviewError}
                </div>
              )}

              {reviewMessage && (
                <div style={{ padding: '12px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '8px', color: '#065F46', fontSize: '14px' }}>
                  {reviewMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting || !reviewForm.trainerId || !reviewForm.comment}
                style={{
                  ...btn,
                  justifyContent: 'center',
                  background: (reviewSubmitting || !reviewForm.trainerId || !reviewForm.comment) ? '#9CA3AF' : '#9D4EDD',
                  color: '#fff',
                  cursor: (reviewSubmitting || !reviewForm.trainerId || !reviewForm.comment) ? 'not-allowed' : 'pointer',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                }}
              >
                {reviewSubmitting ? 'Submitting Review...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

      </div>


      {/* Keyframe animations */}
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default Progress;
