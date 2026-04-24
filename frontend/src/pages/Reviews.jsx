import { useEffect, useState } from 'react';
import { createReview, fetchTrainerReviews } from '../services/reviewService';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';

function Reviews() {
  const { token, user } = useAuth();
  const role = user?.role || null;
  const myUserId = extractUserIdFromToken(token) || user?.localId || null;
  const isStudent = role === 'student';
  const isTrainer = role === 'trainer';

  const [form, setForm] = useState({ sessionId: '', trainerId: '', rating: 5, comment: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [trainerReviews, setTrainerReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isStudent) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await createReview({
        sessionId: form.sessionId,
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
        <form className="auth-form" style={{ maxWidth: 520 }} onSubmit={onSubmit}>
          <label>
            Session ID
            <input name="sessionId" value={form.sessionId} onChange={onChange} required />
          </label>
          <label>
            Rating
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={onChange}
            />
          </label>
          <label>
            Comment
            <input name="comment" value={form.comment} onChange={onChange} required />
          </label>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      ) : null}

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        {isTrainer ? (
          <p className="muted">Showing reviews for your trainer profile.</p>
        ) : (
          <label>
            Trainer ID
            <input name="trainerId" value={form.trainerId} onChange={onChange} />
          </label>
        )}
        <button
          className="primary-btn"
          type="button"
          onClick={onLoadTrainerReviews}
          disabled={loading || (isTrainer ? !myUserId : !form.trainerId)}
        >
          {loading ? 'Loading...' : isTrainer ? 'Refresh My Reviews' : 'Load Trainer Reviews'}
        </button>
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
              <p className="muted">Session: {review.sessionId}</p>
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
