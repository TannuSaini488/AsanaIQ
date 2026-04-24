import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrainers } from '../services/trainerService';
import { matchBestTrainer } from '../services/aiService';
import { createMySlot, deleteMySlot, fetchMySlots, fetchSlots } from '../services/slotService';
import { bookSession } from '../services/sessionService';
import { formatSlotLabel } from '../utils/formatSlot';
import useAuth from '../hooks/useAuth';

function Trainers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudentView = user?.role !== 'trainer';
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ maxPrice: '', minRating: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [slotsByTrainer, setSlotsByTrainer] = useState({});
  const [bookingState, setBookingState] = useState({ loading: false, message: '', error: '' });
  const [slotsLoading, setSlotsLoading] = useState({});
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [sessionByTrainer, setSessionByTrainer] = useState({});
  const [trainerSlots, setTrainerSlots] = useState([]);
  const [trainerSlotsLoading, setTrainerSlotsLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '', endTime: '' });
  const [slotFormState, setSlotFormState] = useState({ loading: false, message: '', error: '' });

  const getTrainerId = (trainer) => trainer?.id || trainer?.userId || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTrainers();
        setTrainers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMySlots = async () => {
      if (isStudentView) return;
      setTrainerSlotsLoading(true);
      setSlotFormState({ loading: false, message: '', error: '' });
      try {
        const data = await fetchMySlots();
        setTrainerSlots(data);
      } catch (err) {
        setSlotFormState({ loading: false, message: '', error: err.message });
      } finally {
        setTrainerSlotsLoading(false);
      }
    };
    loadMySlots();
  }, [isStudentView]);

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      const underPrice =
        filters.maxPrice === '' || (typeof t.pricingPerSession === 'number' && t.pricingPerSession <= Number(filters.maxPrice));
      const meetsRating =
        filters.minRating === '' || (typeof t.ratingAverage === 'number' && t.ratingAverage >= Number(filters.minRating));
      return underPrice && meetsRating;
    });
  }, [trainers, filters]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

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
      setBookingState({ loading: false, message: 'Session booked!', error: '' });
      const sessionId = res?.sessionId || res?.session?.id || res?.id || '';
      if (sessionId) {
        setSessionByTrainer((prev) => ({ ...prev, [trainerId]: sessionId }));
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

  const handleSlotInputChange = (e) => {
    const { name, value } = e.target;
    setSlotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) return;
    setSlotFormState({ loading: true, message: '', error: '' });
    try {
      const created = await createMySlot(slotForm);
      setTrainerSlots((prev) => [created, ...prev]);
      setSlotForm({ date: '', startTime: '', endTime: '' });
      setSlotFormState({ loading: false, message: 'Slot created.', error: '' });
    } catch (err) {
      setSlotFormState({ loading: false, message: '', error: err.message });
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!slotId) return;
    setSlotFormState({ loading: true, message: '', error: '' });
    try {
      await deleteMySlot(slotId);
      setTrainerSlots((prev) => prev.filter((slot) => (slot.id || slot.slotId) !== slotId));
      setSlotFormState({ loading: false, message: 'Slot deleted.', error: '' });
    } catch (err) {
      setSlotFormState({ loading: false, message: '', error: err.message });
    }
  };

  const selectedTrainer = filtered.find((trainer) => getTrainerId(trainer) === selectedTrainerId) || null;
  const selectedId = selectedTrainer ? getTrainerId(selectedTrainer) : '';
  const selectedSessionId = sessionByTrainer[selectedId] || '';

  const openChat = () => {
    if (!selectedId) return;
    navigate(`/chat?peerId=${encodeURIComponent(selectedId)}`);
  };

  const openVideoCall = () => {
    if (!selectedId) return;
    const params = new URLSearchParams({ peerId: selectedId });
    if (selectedSessionId) {
      params.set('sessionId', selectedSessionId);
    }
    navigate(`/video-call?${params.toString()}`);
  };

  return (
    <div>
      <h1>{isStudentView ? 'Trainers' : 'Students'}</h1>
      {isStudentView ? (
        <div className="filter-row">
          <label>
            Max Price
            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="e.g. 50"
            />
          </label>
          <label>
            Min Rating
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              name="minRating"
              value={filters.minRating}
              onChange={handleFilterChange}
              placeholder="e.g. 4"
            />
          </label>
        </div>
      ) : null}

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

      <div className="trainers-layout">
        <div className="trainer-list">
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
              <button type="button" className="primary-btn" onClick={openChat}>
                Chat
              </button>
              <button type="button" className="primary-btn" onClick={openVideoCall}>
                Video Call
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
            </div>
            {isStudentView && !selectedSessionId ? (
              <p className="muted">Book a slot first for auto-filled session in Video Call.</p>
            ) : null}
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
            {!isStudentView ? (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: '8px 0' }}>Manage Availability</h4>
                <form onSubmit={handleCreateSlot} className="filter-row">
                  <label>
                    Date
                    <input type="date" name="date" value={slotForm.date} onChange={handleSlotInputChange} required />
                  </label>
                  <label>
                    Start
                    <input
                      type="time"
                      name="startTime"
                      value={slotForm.startTime}
                      onChange={handleSlotInputChange}
                      required
                    />
                  </label>
                  <label>
                    End
                    <input type="time" name="endTime" value={slotForm.endTime} onChange={handleSlotInputChange} required />
                  </label>
                  <button type="submit" className="primary-btn" disabled={slotFormState.loading}>
                    {slotFormState.loading ? 'Saving...' : 'Create Slot'}
                  </button>
                </form>
                {trainerSlotsLoading ? <p className="muted">Loading your slots...</p> : null}
                {trainerSlots.length ? (
                  <div className="slots-list">
                    {trainerSlots.map((slot) => {
                      const slotId = slot.id || slot.slotId;
                      return (
                        <button
                          key={slotId}
                          className="slot-btn"
                          type="button"
                          onClick={() => handleDeleteSlot(slotId)}
                          disabled={slot.isBooked || slotFormState.loading}
                        >
                          {slot.isBooked ? `Booked: ${formatSlotLabel(slot)}` : `Delete: ${formatSlotLabel(slot)}`}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {!trainerSlotsLoading && trainerSlots.length === 0 ? <p className="muted">No slots created yet.</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {bookingState.message && <p className="success-text">{bookingState.message}</p>}
      {bookingState.error && <p className="auth-error">{bookingState.error}</p>}
      {slotFormState.message && <p className="success-text">{slotFormState.message}</p>}
      {slotFormState.error && <p className="auth-error">{slotFormState.error}</p>}
    </div>
  );
}

export default Trainers;
