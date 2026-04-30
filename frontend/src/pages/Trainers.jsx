import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrainers } from '../services/trainerService';
import { matchBestTrainer } from '../services/aiService';
import { fetchSlots } from '../services/slotService';
import { bookSession } from '../services/sessionService';
import { getMyConnections, requestConnection, updateConnectionStatus } from '../services/connectionService';
import { formatSlotLabel } from '../utils/formatSlot';
import useAuth from '../hooks/useAuth';

function Trainers() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const requesterId = user.uid;
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
      } else if (requesterId === user?.uid) {
        sent.push(conn);
      } else {
        received.push(conn);
      }
    }
    return { sentPending: sent, receivedPending: received, acceptedConnections: accepted };
  }, [connections, isStudentView, user?.uid]);

  return (
    <div>
      <h1>{isStudentView ? 'Trainers' : 'Students'}</h1>

      {isStudentView ? (
        <div className="ai-row">
          <button type="button" className="primary-btn" onClick={handleAiMatch} disabled={aiLoading || trainers.length === 0}>
            {aiLoading ? 'Finding...' : 'Find Best Trainer (AI)'}
          </button>
          {aiError && <span className="auth-error" style={{ marginLeft: 8 }}>{aiError}</span>}
        </div>
      ) : null}

      {isStudentView && aiResult && (
        <div className="ai-card">
          <div className="ai-card-header">
            <h3>Recommended Trainer</h3>
            <span className="pill">Score: {aiResult.matchScore?.toFixed?.(2) ?? aiResult.matchScore}</span>
          </div>
          <p><strong>Name:</strong> {recommendedTrainer?.name || aiResult.bestMatchTrainerId}</p>
          <p><strong>Reasoning:</strong> {aiResult.reasoning}</p>
          {recommendedTrainer && (
            <p className="muted">
              Price: {recommendedTrainer.pricingPerSession ? `$${recommendedTrainer.pricingPerSession}` : 'N/A'} · Rating:{' '}
              {recommendedTrainer.ratingAverage ?? 'N/A'}
            </p>
          )}
        </div>
      )}

      {loading && <p>Loading {isStudentView ? 'trainers' : 'students'}...</p>}
      {error && <p className="auth-error">{error}</p>}

      <div className="connections-board">
        <div className="conn-card">
          <div className="conn-card-title">Sent Requests</div>
          <div className="conn-card-subtitle">{sentPending.length} pending</div>
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
                      <div className="conn-item-meta">
                        <span className="status-pill status-pending">Pending</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTrainerId(peerId);
                      }}
                    >
                      View
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="conn-card">
          <div className="conn-card-title">Received Requests</div>
          <div className="conn-card-subtitle">{receivedPending.length} pending</div>
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
                      <div className="conn-item-meta">
                        <span className="status-pill status-pending">Pending</span>
                      </div>
                    </div>
                    <div className="conn-actions">
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => handleConnectionResponse(c.id, 'accepted')}
                        disabled={connectionActionLoading}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => handleConnectionResponse(c.id, 'rejected')}
                        disabled={connectionActionLoading}
                        style={{ background: '#f87171', color: 'white', border: 'none' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>


      </div>

      <div className="trainers-layout">
        <div className="trainer-list">
          <div className="trainer-list-toolbar">
            <input
              className="trainer-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isStudentView ? 'Search trainers by name, specialization…' : 'Search students by name, email…'}
            />
          </div>
          {!loading && !error && filtered.length === 0 ? (
            <div className="trainer-list-empty">
              {isStudentView ? 'No trainers available right now.' : 'No students available right now.'}
            </div>
          ) : null}
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
                    <div className="trainer-list-title">{t.name || (isStudentView ? 'Unnamed Trainer' : 'Unnamed Student')}</div>
                    <div className="trainer-list-subtitle">
                      {isStudentView
                        ? t.specialization?.join(', ') || 'General'
                        : t.primaryGoal || t.fitnessLevel || t.email || 'Student'}
                    </div>
                  </div>
                  <div className="trainer-list-meta">
                    {conn?.status ? (
                      <span
                        className={`status-pill ${
                          conn.status === 'accepted' ? 'status-accepted' : conn.status === 'pending' ? 'status-pending' : 'status-muted'
                        }`}
                      >
                        {conn.status}
                      </span>
                    ) : null}
                    <span className="pill">{isStudentView ? `Rating ${t.ratingAverage ?? 'N/A'}` : t.gender || 'Student'}</span>
                  </div>
                </button>
              );
            })}
        </div>

        {selectedTrainer ? (
          <div className="trainer-panel">
            <div className="trainer-header">
              <h3>{selectedTrainer.name || (isStudentView ? 'Unnamed Trainer' : 'Unnamed Student')}</h3>
              <div className="pill">
                {isStudentView
                  ? selectedTrainer.specialization?.join(', ') || 'General'
                  : selectedTrainer.primaryGoal || selectedTrainer.fitnessLevel || 'Student'}
              </div>
            </div>
            {isStudentView ? (
              <>
                <p className="muted">Experience: {selectedTrainer.experienceYears ?? 'N/A'} yrs</p>
                <p className="muted">Rating: {selectedTrainer.ratingAverage ?? 'N/A'}</p>
                <p className="muted">
                  Price: {selectedTrainer.pricingPerSession ? `$${selectedTrainer.pricingPerSession}` : 'N/A'}
                </p>
              </>
            ) : (
              <>
                <p className="muted">Email: {selectedTrainer.email || 'N/A'}</p>
                <p className="muted">Fitness Level: {selectedTrainer.fitnessLevel || 'N/A'}</p>
                <p className="muted">Goal: {selectedTrainer.primaryGoal || 'N/A'}</p>
              </>
            )}
            <div className="slot-actions">
              {!activeConnection ? (
                <button type="button" className="primary-btn" onClick={handleConnect} disabled={connectionActionLoading}>
                  {connectionActionLoading ? 'Sending...' : 'Connect'}
                </button>
              ) : activeConnection.status === 'pending' ? (
                (activeConnection.requesterId === user.uid || (!activeConnection.requesterId && isStudentView)) ? (
                  <button type="button" className="primary-btn" disabled>
                    Request Pending...
                  </button>
                ) : (
                  <>
                    <button type="button" className="primary-btn" onClick={() => handleConnectionResponse(activeConnection.id, 'accepted')} disabled={connectionActionLoading}>
                      Accept Request
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => handleConnectionResponse(activeConnection.id, 'rejected')} disabled={connectionActionLoading} style={{ background: '#f87171', color: 'white', border: 'none' }}>
                      Reject
                    </button>
                  </>
                )
              ) : activeConnection.status === 'accepted' ? (
                <>
                  <button type="button" className="primary-btn" onClick={() => navigate('/connections')}>
                    Chat / Video Call
                  </button>
                  {isStudentView ? (
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => loadSlots(selectedId)}
                      disabled={slotsLoading[selectedId]}
                    >
                      {slotsLoading[selectedId] ? 'Loading...' : 'Show Slots'}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="muted">Connection {activeConnection.status}</p>
              )}
            </div>
            {isStudentView && slotsByTrainer[selectedId] && (
              <div className="slots-list">
                {(slotsByTrainer[selectedId] || []).map((slot) => {
                  const slotId = slot.id || slot.slotId;
                  const label = formatSlotLabel(slot);
                  return (
                    <button
                      key={slotId}
                      className="slot-btn"
                      onClick={() => handleBook(selectedId, slotId)}
                      disabled={slot.isBooked || bookingState.loading}
                    >
                      {slot.isBooked ? 'Booked' : bookingState.loading ? 'Booking...' : label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {bookingState.message && <p className="success-text">{bookingState.message}</p>}
      {bookingState.error && <p className="auth-error">{bookingState.error}</p>}
    </div>
  );
}

export default Trainers;
