import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchTrainers } from '../services/trainerService';
import { matchBestTrainer } from '../services/aiService';
import { fetchSlots } from '../services/slotService';
import { bookSession } from '../services/sessionService';
import { getMyConnections, requestConnection, updateConnectionStatus } from '../services/connectionService';
import { formatSlotLabel } from '../utils/formatSlot';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';

function Trainers() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const currentUserId = extractUserIdFromToken(token) || user?.uid || user?.id || user?.localId || '';
  const isStudentView = user?.role !== 'trainer';
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [slotsByTrainer, setSlotsByTrainer] = useState({});
  const [bookingState, setBookingState] = useState({ loading: false, message: '', error: '' });
  const [slotsLoading, setSlotsLoading] = useState({});
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [connections, setConnections] = useState([]);
  const [connectionActionLoading, setConnectionActionLoading] = useState(false);

  const getTrainerId = (trainer) => trainer?.id || trainer?.userId || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [trainerData, connectionData] = await Promise.all([
          fetchTrainers(),
          getMyConnections(),
        ]);
        setTrainers(trainerData);
        setConnections(connectionData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const peerIdForConnection = (connection) => {
    if (!connection) return '';
    return isStudentView ? connection.trainerId : connection.studentId;
  };

  const getConnectionForPeer = (peerId) => {
    if (!peerId) return null;
    return connections.find((c) => peerIdForConnection(c) === peerId) || null;
  };

  const getPeerLabel = (peerId) => {
    if (!peerId) return 'Unknown';
    const match = trainers.find((t) => (t.id || t.userId) === peerId);
    return match?.name || match?.email || peerId;
  };

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter((t) => {
      const haystack = [
        t.name,
        t.email,
        ...(t.specialization || []),
        t.primaryGoal,
        t.fitnessLevel,
        ...(t.languages || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [trainers, searchQuery]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedTrainerId('');
      return;
    }
    const exists = filtered.some((trainer) => getTrainerId(trainer) === selectedTrainerId);
    if (!exists) {
      setSelectedTrainerId(getTrainerId(filtered[0]));
    }
  }, [filtered, selectedTrainerId]);

  const handleAiMatch = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      // minimal student payload; extend once profile is available
      const result = await matchBestTrainer({ student: {}, trainers });
      setAiResult(result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const recommendedTrainer = aiResult
    ? trainers.find((t) => (t.id || t.userId) === aiResult.bestMatchTrainerId)
    : null;

  const loadSlots = async (trainerId) => {
    setSlotsLoading((prev) => ({ ...prev, [trainerId]: true }));
    setBookingState({ loading: false, message: '', error: '' });
    try {
      const slots = await fetchSlots(trainerId);
      setSlotsByTrainer((prev) => ({ ...prev, [trainerId]: slots }));
    } catch (err) {
      setBookingState({ loading: false, message: '', error: err.message });
    } finally {
      setSlotsLoading((prev) => ({ ...prev, [trainerId]: false }));
    }
  };

  const handleBook = async (trainerId, slotId) => {
    setBookingState({ loading: true, message: '', error: '' });
    try {
      const res = await bookSession({ trainerId, slotId });
      const sessionId = res?.sessionId || res?.session?.id || res?.id || '';
      if (!sessionId) {
        setBookingState({ loading: false, message: '', error: 'Booking succeeded but sessionId was missing.' });
        return null;
      }
      setBookingState({
        loading: false,
        message: sessionId ? `Session booked! (${sessionId})` : 'Session booked!',
        error: '',
      });
      if (sessionId) {
        // Session id can be retrieved on the Inbox page for video calls.
      }
      // mark slot as booked locally
      setSlotsByTrainer((prev) => ({
        ...prev,
        [trainerId]: (prev[trainerId] || []).map((s) =>
          s.id === slotId || s.slotId === slotId ? { ...s, isBooked: true } : s
        ),
      }));
      return res;
    } catch (err) {
      setBookingState({ loading: false, message: '', error: err.message });
    }
  };

  const selectedTrainer = filtered.find((trainer) => getTrainerId(trainer) === selectedTrainerId) || null;
  const selectedId = selectedTrainer ? getTrainerId(selectedTrainer) : '';

  const activeConnection = connections.find(c => c.trainerId === selectedId || c.studentId === selectedId);

  const handleConnect = async () => {
    if (!selectedId) return;
    setConnectionActionLoading(true);
    try {
      const res = await requestConnection(selectedId);
      // Determine studentId and trainerId based on role
      const requesterId = currentUserId;
      const role = user.role;
      const connData = { 
        ...res, 
        requesterId,
        studentId: role === 'trainer' ? selectedId : requesterId,
        trainerId: role === 'trainer' ? requesterId : selectedId
      };
      setConnections(prev => [...prev, connData]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const handleConnectionResponse = async (connectionId, status) => {
    setConnectionActionLoading(true);
    try {
      const res = await updateConnectionStatus(connectionId, status);
      setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: res.status } : c));
    } catch (err) {
      setError(err.message);
    } finally {
      setConnectionActionLoading(false);
    }
  };

  const { sentPending, receivedPending, acceptedConnections } = useMemo(() => {
    const sent = [];
    const received = [];
    const accepted = [];
    for (const conn of connections) {
      if (!conn) continue;
      if (conn.status === 'accepted') {
        accepted.push(conn);
        continue;
      }
      if (conn.status !== 'pending') continue;
      const requesterId = conn.requesterId;
      if (!requesterId) {
        // Backward compatibility: treat missing requesterId as "sent" for student view.
        (isStudentView ? sent : received).push(conn);
      } else if (requesterId === currentUserId) {
        sent.push(conn);
      } else {
        received.push(conn);
      }
    }
    return { sentPending: sent, receivedPending: received, acceptedConnections: accepted };
  }, [connections, isStudentView, currentUserId]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="trainers-page">
      <header className="premium-hero">
        <div className="container">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-title"
          >
            {isStudentView ? 'Find Your ' : 'Manage Your '}
            <span className="gradient-text">{isStudentView ? 'Perfect Trainer' : 'Community'}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-subtitle"
          >
            {isStudentView 
              ? 'Connect with world-class instructors tailored to your journey.' 
              : 'Empower your students with personalized guidance and analytics.'}
          </motion.p>
        </div>
      </header>

      <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 10, paddingBottom: '100px' }}>
        {isStudentView ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="ai-row glass-card"
          >
            <div className="ai-row-content">
              <h3>Smart Trainer Match</h3>
              <p>Let our AI find the best coach based on your profile and goals.</p>
            </div>
            <button type="button" className="primary-btn pulse-btn" onClick={handleAiMatch} disabled={aiLoading || trainers.length === 0}>
              {aiLoading ? 'Analyzing...' : 'Find Best Match (AI)'}
            </button>
            {aiError && <span className="auth-error" style={{ marginLeft: 8 }}>{aiError}</span>}
          </motion.div>
        ) : null}

        {isStudentView && aiResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ai-card premium-card highlighted"
          >
            <div className="ai-card-header">
              <h3><span className="sparkle-icon">✨</span> Recommended Trainer</h3>
              <span className="pill purple">Match Score: {aiResult.matchScore?.toFixed?.(2) ?? aiResult.matchScore}</span>
            </div>
            <div className="ai-card-body">
              <p><strong>Name:</strong> {recommendedTrainer?.name || aiResult.bestMatchTrainerId}</p>
              <p><strong>Insight:</strong> {aiResult.reasoning}</p>
              {recommendedTrainer && (
                <div className="ai-card-meta">
                  <span>Price: {recommendedTrainer.pricingPerSession ? `$${recommendedTrainer.pricingPerSession}` : 'N/A'}</span>
                  <span>Rating: {recommendedTrainer.ratingAverage ?? 'N/A'} ⭐</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="connections-board"
        >
          <motion.div variants={fadeInUp} className="conn-card glass-card">
            <div className="conn-card-header">
              <div className="conn-card-title">Pending Outreach</div>
              <span className="count-pill">{sentPending.length}</span>
            </div>
            <div className="conn-list">
              {sentPending.length === 0 ? (
                <div className="conn-empty">No pending requests.</div>
              ) : (
                sentPending.slice(0, 5).map((c) => {
                  const peerId = peerIdForConnection(c);
                  return (
                    <div key={c.id || `${c.trainerId}-${c.studentId}`} className="conn-item">
                      <div className="conn-item-main">
                        <div className="conn-item-title">{getPeerLabel(peerId)}</div>
                        <span className="status-pill status-pending">Pending</span>
                      </div>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedTrainerId(peerId);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="conn-card glass-card">
            <div className="conn-card-header">
              <div className="conn-card-title">Incoming Requests</div>
              <span className="count-pill">{receivedPending.length}</span>
            </div>
            <div className="conn-list">
              {receivedPending.length === 0 ? (
                <div className="conn-empty">No incoming requests.</div>
              ) : (
                receivedPending.slice(0, 5).map((c) => {
                  const peerId = peerIdForConnection(c);
                  return (
                    <div key={c.id || `${c.trainerId}-${c.studentId}`} className="conn-item">
                      <div className="conn-item-main">
                        <div className="conn-item-title">{getPeerLabel(peerId)}</div>
                        <span className="status-pill status-pending">New</span>
                      </div>
                      <div className="conn-actions">
                        <button
                          type="button"
                          className="primary-btn small"
                          onClick={() => handleConnectionResponse(c.id, 'accepted')}
                          disabled={connectionActionLoading}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="danger-btn small"
                          onClick={() => handleConnectionResponse(c.id, 'rejected')}
                          disabled={connectionActionLoading}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>

        <div className="trainers-layout">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="trainer-list glass-card"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="trainer-list-toolbar">
              <div className="search-wrapper">
                <input
                  className="trainer-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isStudentView ? 'Search by name or specialty...' : 'Search students...'}
                />
              </div>
            </div>
            <div className="scroll-area">
              {!loading && !error && filtered.length === 0 ? (
                <div className="trainer-list-empty">
                  {isStudentView ? 'No trainers found.' : 'No students found.'}
                </div>
              ) : null}
              {loading && <div className="trainer-list-empty">Loading...</div>}
              {!loading &&
                !error &&
                filtered.map((t) => {
                  const trainerId = getTrainerId(t);
                  const isSelected = trainerId === selectedTrainerId;
                  const conn = getConnectionForPeer(trainerId);
                  return (
                    <button
                      key={trainerId || t.email}
                      type="button"
                      className={`trainer-list-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedTrainerId(trainerId)}
                    >
                      <div className="trainer-avatar">{(t.name || 'T').trim().charAt(0).toUpperCase()}</div>
                      <div className="trainer-list-content">
                        <div className="trainer-list-title">{t.name || 'User'}</div>
                        <div className="trainer-list-subtitle">
                          {isStudentView
                            ? t.specialization?.join(', ') || 'General'
                            : t.primaryGoal || t.fitnessLevel || 'Student'}
                        </div>
                      </div>
                      <div className="trainer-list-meta">
                        {conn?.status && (
                          <span className={`status-pill status-${conn.status}`}>
                            {conn.status}
                          </span>
                        )}
                        {isStudentView && <span className="rating-mini">★ {t.ratingAverage ?? '0'}</span>}
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="trainer-panel glass-card"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {selectedTrainer ? (
              <div className="panel-content">
                <div className="panel-header">
                  <div className="panel-avatar-large">
                    {(selectedTrainer.name || 'T').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="panel-header-text">
                    <h3>{selectedTrainer.name}</h3>
                    <div className="pill purple">
                      {isStudentView
                        ? selectedTrainer.specialization?.join(', ') || 'General'
                        : selectedTrainer.primaryGoal || 'Student'}
                    </div>
                  </div>
                </div>

                <div className="panel-stats">
                  {isStudentView ? (
                    <>
                      <div className="stat-item">
                        <label>Experience</label>
                        <span>{selectedTrainer.experienceYears ?? 'N/A'} yrs</span>
                      </div>
                      <div className="stat-item">
                        <label>Rating</label>
                        <span>{selectedTrainer.ratingAverage ?? '0'} / 5</span>
                      </div>
                      <div className="stat-item">
                        <label>Session Fee</label>
                        <span>{selectedTrainer.pricingPerSession ? `$${selectedTrainer.pricingPerSession}` : 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-item">
                        <label>Fitness Level</label>
                        <span>{selectedTrainer.fitnessLevel || 'N/A'}</span>
                      </div>
                      <div className="stat-item">
                        <label>Primary Goal</label>
                        <span>{selectedTrainer.primaryGoal || 'N/A'}</span>
                      </div>
                      <div className="stat-item">
                        <label>Gender</label>
                        <span>{selectedTrainer.gender || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="panel-actions">
                  {!activeConnection ? (
                    <button type="button" className="primary-btn large" onClick={handleConnect} disabled={connectionActionLoading}>
                      {connectionActionLoading ? 'Sending...' : 'Request Connection'}
                    </button>
                  ) : activeConnection.status === 'pending' ? (
                    (activeConnection.requesterId === currentUserId || (!activeConnection.requesterId && isStudentView)) ? (
                      <button type="button" className="primary-btn large" disabled>
                        Connection Requested
                      </button>
                    ) : (
                      <div className="dual-actions">
                        <button type="button" className="primary-btn" onClick={() => handleConnectionResponse(activeConnection.id, 'accepted')} disabled={connectionActionLoading}>
                          Accept
                        </button>
                        <button type="button" className="danger-btn" onClick={() => handleConnectionResponse(activeConnection.id, 'rejected')} disabled={connectionActionLoading}>
                          Reject
                        </button>
                      </div>
                    )
                  ) : activeConnection.status === 'accepted' ? (
                    <div className="dual-actions">
                      <button type="button" className="primary-btn" onClick={() => navigate('/connections')}>
                        Message
                      </button>
                      {isStudentView && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => loadSlots(selectedId)}
                          disabled={slotsLoading[selectedId]}
                        >
                          {slotsLoading[selectedId] ? 'Loading...' : 'Book Session'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="status-notice">Connection is {activeConnection.status}</p>
                  )}
                </div>

                {isStudentView && slotsByTrainer[selectedId] && (
                  <div className="slots-container">
                    <h4>Available Time Slots</h4>
                    <div className="slots-grid">
                      {(slotsByTrainer[selectedId] || []).length === 0 && <p className="muted">No slots available.</p>}
                      {(slotsByTrainer[selectedId] || []).map((slot) => {
                        const slotId = slot.id || slot.slotId;
                        const label = formatSlotLabel(slot);
                        return (
                          <button
                            key={slotId}
                            className={`slot-chip ${slot.isBooked ? 'booked' : ''}`}
                            onClick={() => handleBook(selectedId, slotId)}
                            disabled={slot.isBooked || bookingState.loading}
                          >
                            {slot.isBooked ? 'Booked' : label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-empty">
                <div className="empty-icon">🧘</div>
                <p>Select a {isStudentView ? 'trainer' : 'student'} to view details</p>
              </div>
            )}
          </motion.div>
        </div>
        {bookingState.message && <p className="success-toast">{bookingState.message}</p>}
        {bookingState.error && <p className="error-toast">{bookingState.error}</p>}
      </div>
    </div>
  );
}

export default Trainers;
