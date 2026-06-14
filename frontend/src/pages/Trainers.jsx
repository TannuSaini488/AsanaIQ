import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTrainers } from '../services/trainerService';
import { matchBestTrainer } from '../services/aiService';
import { fetchSlots } from '../services/slotService';
import { bookSession } from '../services/sessionService';
import { getMyConnections, requestConnection, updateConnectionStatus } from '../services/connectionService';
import { formatSlotLabel } from '../utils/formatSlot';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import './Trainers.css';

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
  const [connectionsOpen, setConnectionsOpen] = useState(false);

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

  return (
    <div className="trainers-page">
      {/* ── Compact Toolbar ── */}
      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <h1 className="tp-title">
            {isStudentView ? 'Find Your ' : 'Manage Your '}
            <span className="tp-title-accent">{isStudentView ? 'Perfect Trainer' : 'Community'}</span>
          </h1>
        </div>
        <div className="tp-toolbar-right">
          <div className="tp-search-box">
            <svg className="tp-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isStudentView ? 'Search trainers...' : 'Search students...'}
              className="tp-search-input"
            />
          </div>
          {isStudentView && (
            <button
              type="button"
              className="tp-ai-btn"
              onClick={handleAiMatch}
              disabled={aiLoading || trainers.length === 0}
            >
              <span className="tp-ai-sparkle">✨</span>
              {aiLoading ? 'Analyzing...' : 'AI Match'}
            </button>
          )}
        </div>
      </div>

      {/* ── AI Result Banner (slides in when available) ── */}
      <AnimatePresence>
        {isStudentView && aiResult && (
          <motion.div
            className="tp-ai-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="tp-ai-banner-inner">
              <div className="tp-ai-banner-left">
                <span className="tp-ai-banner-icon">✨</span>
                <div>
                  <div className="tp-ai-banner-title">
                    Recommended: <strong>{recommendedTrainer?.name || aiResult.bestMatchTrainerId}</strong>
                  </div>
                  <div className="tp-ai-banner-reason">{aiResult.reasoning}</div>
                </div>
              </div>
              <div className="tp-ai-banner-right">
                <span className="tp-ai-banner-score">
                  Score: {aiResult.matchScore?.toFixed?.(2) ?? aiResult.matchScore}
                </span>
                {recommendedTrainer && (
                  <>
                    <span className="tp-ai-banner-meta">
                      {recommendedTrainer.pricingPerSession ? `$${recommendedTrainer.pricingPerSession}` : ''}
                    </span>
                    <span className="tp-ai-banner-meta">★ {recommendedTrainer.ratingAverage ?? 'N/A'}</span>
                  </>
                )}
              </div>
            </div>
            {aiError && <div className="tp-ai-error">{aiError}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content: Sidebar + Detail Panel ── */}
      <div className="tp-content">
        {/* Sidebar List */}
        <aside className="tp-sidebar">
          <div className="tp-sidebar-header">
            <span className="tp-sidebar-count">
              {loading ? '...' : filtered.length} {isStudentView ? 'trainers' : 'students'}
            </span>
          </div>
          <div className="tp-sidebar-list">
            {loading && (
              <div className="tp-empty-state">
                <div className="tp-spinner" />
                <span>Loading...</span>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="tp-empty-state">
                <span className="tp-empty-icon">🔍</span>
                <span>{isStudentView ? 'No trainers found' : 'No students found'}</span>
              </div>
            )}
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
                    className={`tp-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTrainerId(trainerId)}
                  >
                    <div className="tp-list-avatar">
                      {(t.name || 'T').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="tp-list-info">
                      <div className="tp-list-name">{t.name || 'User'}</div>
                      <div className="tp-list-spec">
                        {isStudentView
                          ? t.specialization?.join(', ') || 'General'
                          : t.primaryGoal || t.fitnessLevel || 'Student'}
                      </div>
                    </div>
                    <div className="tp-list-right">
                      {conn?.status && (
                        <span className={`tp-status tp-status-${conn.status}`}>
                          {conn.status}
                        </span>
                      )}
                      {isStudentView && (
                        <span className="tp-rating">★ {t.ratingAverage ?? '0'}</span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* Detail Panel */}
        <main className="tp-detail">
          <AnimatePresence mode="wait">
            {selectedTrainer ? (
              <motion.div
                key={selectedId}
                className="tp-detail-inner"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Header */}
                <div className="tp-detail-header">
                  <div className="tp-detail-avatar">
                    {(selectedTrainer.name || 'T').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="tp-detail-header-info">
                    <h2 className="tp-detail-name">{selectedTrainer.name}</h2>
                    <span className="tp-detail-pill">
                      {isStudentView
                        ? selectedTrainer.specialization?.join(', ') || 'General'
                        : selectedTrainer.primaryGoal || 'Student'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="tp-detail-stats">
                  {isStudentView ? (
                    <>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Experience</span>
                        <span className="tp-stat-value">{selectedTrainer.experienceYears ?? 'N/A'} <small>yrs</small></span>
                      </div>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Rating</span>
                        <span className="tp-stat-value">{selectedTrainer.ratingAverage ?? '0'} <small>/ 5</small></span>
                      </div>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Session Fee</span>
                        <span className="tp-stat-value">{selectedTrainer.pricingPerSession ? `$${selectedTrainer.pricingPerSession}` : 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Fitness Level</span>
                        <span className="tp-stat-value">{selectedTrainer.fitnessLevel || 'N/A'}</span>
                      </div>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Primary Goal</span>
                        <span className="tp-stat-value">{selectedTrainer.primaryGoal || 'N/A'}</span>
                      </div>
                      <div className="tp-stat">
                        <span className="tp-stat-label">Gender</span>
                        <span className="tp-stat-value">{selectedTrainer.gender || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="tp-detail-actions">
                  {!activeConnection ? (
                    <button type="button" className="tp-btn tp-btn-primary" onClick={handleConnect} disabled={connectionActionLoading}>
                      {connectionActionLoading ? 'Sending...' : 'Request Connection'}
                    </button>
                  ) : activeConnection.status === 'pending' ? (
                    (activeConnection.requesterId === currentUserId || (!activeConnection.requesterId && isStudentView)) ? (
                      <button type="button" className="tp-btn tp-btn-muted" disabled>
                        Connection Requested
                      </button>
                    ) : (
                      <div className="tp-btn-group">
                        <button type="button" className="tp-btn tp-btn-primary" onClick={() => handleConnectionResponse(activeConnection.id, 'accepted')} disabled={connectionActionLoading}>
                          Accept
                        </button>
                        <button type="button" className="tp-btn tp-btn-danger" onClick={() => handleConnectionResponse(activeConnection.id, 'rejected')} disabled={connectionActionLoading}>
                          Reject
                        </button>
                      </div>
                    )
                  ) : activeConnection.status === 'accepted' ? (
                    <div className="tp-btn-group">
                      <button type="button" className="tp-btn tp-btn-primary" onClick={() => navigate('/connections')}>
                        Message
                      </button>
                      {isStudentView && (
                        <button
                          type="button"
                          className="tp-btn tp-btn-outline"
                          onClick={() => loadSlots(selectedId)}
                          disabled={slotsLoading[selectedId]}
                        >
                          {slotsLoading[selectedId] ? 'Loading...' : 'Book Session'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="tp-status-notice">Connection is {activeConnection.status}</p>
                  )}
                </div>

                {/* Slots */}
                {isStudentView && slotsByTrainer[selectedId] && (
                  <div className="tp-slots">
                    <h4 className="tp-slots-title">Available Slots</h4>
                    <div className="tp-slots-strip">
                      {(slotsByTrainer[selectedId] || []).length === 0 && (
                        <p className="tp-slots-empty">No slots available</p>
                      )}
                      {(slotsByTrainer[selectedId] || []).map((slot) => {
                        const slotId = slot.id || slot.slotId;
                        const label = formatSlotLabel(slot);
                        return (
                          <button
                            key={slotId}
                            className={`tp-slot ${slot.isBooked ? 'booked' : ''}`}
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
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="tp-detail-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span className="tp-empty-yoga">🧘</span>
                <p>Select a {isStudentView ? 'trainer' : 'student'} to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Collapsible Connections Bar ── */}
      {(sentPending.length > 0 || receivedPending.length > 0) && (
        <div className="tp-conn-bar">
          <button
            type="button"
            className="tp-conn-toggle"
            onClick={() => setConnectionsOpen(!connectionsOpen)}
          >
            <div className="tp-conn-summary">
              <span className="tp-conn-label">Connections</span>
              {sentPending.length > 0 && (
                <span className="tp-conn-badge tp-conn-badge-pending">{sentPending.length} pending</span>
              )}
              {receivedPending.length > 0 && (
                <span className="tp-conn-badge tp-conn-badge-incoming">{receivedPending.length} incoming</span>
              )}
            </div>
            <span className={`tp-conn-chevron ${connectionsOpen ? 'open' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </button>
          <AnimatePresence>
            {connectionsOpen && (
              <motion.div
                className="tp-conn-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="tp-conn-grid">
                  {/* Sent Pending */}
                  {sentPending.length > 0 && (
                    <div className="tp-conn-section">
                      <div className="tp-conn-section-title">Pending Outreach</div>
                      {sentPending.slice(0, 5).map((c) => {
                        const peerId = peerIdForConnection(c);
                        return (
                          <div key={c.id || `${c.trainerId}-${c.studentId}`} className="tp-conn-item">
                            <span className="tp-conn-item-name">{getPeerLabel(peerId)}</span>
                            <span className="tp-status tp-status-pending">Pending</span>
                            <button
                              type="button"
                              className="tp-conn-view"
                              onClick={() => {
                                setSearchQuery('');
                                setSelectedTrainerId(peerId);
                                setConnectionsOpen(false);
                              }}
                            >
                              View
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Received Pending */}
                  {receivedPending.length > 0 && (
                    <div className="tp-conn-section">
                      <div className="tp-conn-section-title">Incoming Requests</div>
                      {receivedPending.slice(0, 5).map((c) => {
                        const peerId = peerIdForConnection(c);
                        return (
                          <div key={c.id || `${c.trainerId}-${c.studentId}`} className="tp-conn-item">
                            <span className="tp-conn-item-name">{getPeerLabel(peerId)}</span>
                            <span className="tp-status tp-status-pending">New</span>
                            <div className="tp-conn-item-actions">
                              <button
                                type="button"
                                className="tp-btn tp-btn-primary tp-btn-xs"
                                onClick={() => handleConnectionResponse(c.id, 'accepted')}
                                disabled={connectionActionLoading}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="tp-btn tp-btn-danger tp-btn-xs"
                                onClick={() => handleConnectionResponse(c.id, 'rejected')}
                                disabled={connectionActionLoading}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Toast Notifications ── */}
      <AnimatePresence>
        {bookingState.message && (
          <motion.div
            className="tp-toast tp-toast-success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {bookingState.message}
          </motion.div>
        )}
        {bookingState.error && (
          <motion.div
            className="tp-toast tp-toast-error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {bookingState.error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Trainers;
