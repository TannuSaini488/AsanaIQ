import { useEffect, useState } from 'react';
import { createReview, fetchTrainerReviews } from '../services/reviewService';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { getMyConnections } from '../services/connectionService';

function Reviews() {
  const { token, user } = useAuth();
  const role = user?.role || null;
  const myUserId = extractUserIdFromToken(token) || user?.localId || null;
  const isStudent = role === 'student';
  const isTrainer = role === 'trainer';

  const [form, setForm] = useState({ trainerId: '', rating: 5, comment: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [trainerReviews, setTrainerReviews] = useState([]);
  const [trainerOptions, setTrainerOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrainerOptions, setLoadingTrainerOptions] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadTrainerOptions = async () => {
    setLoadingTrainerOptions(true);
    setError('');
    try {
      const connections = await getMyConnections();
      const accepted = (connections || [])
        .filter((conn) => conn.status === 'accepted' && conn.peerId)
        .map((conn) => ({
          id: conn.peerId,
          label: conn.peerName || conn.peerId,
        }));
      setTrainerOptions(accepted);
    } catch (err) {
      setError(err.message || 'Failed to load trainers.');
    } finally {
      setLoadingTrainerOptions(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isStudent) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await createReview({
        trainerId: form.trainerId,
        rating: Number(form.rating),
        comment: form.comment,
      });
      setMessage('Review submitted');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainerReviews = async (trainerId) => {
    if (!trainerId) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await fetchTrainerReviews(trainerId);
      setTrainerReviews(data);
      setHasLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTrainer) return;
    if (!myUserId) return;
    loadTrainerReviews(myUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrainer, myUserId]);

  useEffect(() => {
    if (!isStudent) return;
    loadTrainerOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  const onLoadTrainerReviews = async () => {
    if (isTrainer) {
      await loadTrainerReviews(myUserId);
      return;
    }
    await loadTrainerReviews(form.trainerId);
  };

  return (
    <section>
      <h1>Reviews</h1>
      {isStudent ? (
        <div className="review-section" style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '24px' }}>
             <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#1C1917' }}>Leave a Review</h3>
             <p className="muted" style={{ margin: 0 }}>Share your experience with your trainer.</p>
          </div>
          <form className="profile-form" onSubmit={onSubmit}>
            <label>
              Trainer
              <select
                name="trainerId"
                value={form.trainerId}
                onChange={onChange}
                required
                disabled={loadingTrainerOptions}
              >
                <option value="">
                  {loadingTrainerOptions ? 'Loading trainers...' : 'Select a trainer'}
                </option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating (0-5)
              <input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={onChange}
                required
              />
            </label>
            <label className="full-width">
              Comment
              <textarea 
                name="comment" 
                value={form.comment} 
                onChange={onChange} 
                required 
                rows="4"
                placeholder="How was your session?"
              ></textarea>
            </label>
            <div className="submit-btn-wrapper">
              <button className="primary-btn" type="submit" disabled={loading || !form.trainerId || !form.comment}>
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        {isTrainer ? (
          <>
            <p className="muted">Showing reviews for your trainer profile.</p>
            <button
              className="primary-btn"
              type="button"
              onClick={onLoadTrainerReviews}
              disabled={loading || !myUserId}
            >
              {loading ? 'Loading...' : 'Refresh My Reviews'}
            </button>
          </>
        ) : null}
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}

      {trainerReviews.length > 0 ? (
        <div className="card-grid" style={{ marginTop: 12 }}>
          {trainerReviews.map((review) => (
            <div className="trainer-card" key={review.id}>
              <p>
                <strong>Rating:</strong> {review.rating}
              </p>
              <p>{review.comment}</p>
              {isTrainer ? (
                <p className="muted" style={{ marginTop: '8px' }}>
                  Student: <strong>{review.studentName || 'Unknown'}</strong>
                </p>
              ) : (
                <p className="muted" style={{ marginTop: '8px' }}>Session: {review.sessionId}</p>
              )}
            </div>
          ))}
        </div>
      ) : hasLoaded ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No reviews found.
        </p>
      ) : null}
    </section>
  );
}

export default Reviews;
