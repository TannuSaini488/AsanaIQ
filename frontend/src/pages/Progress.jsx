import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { decodeJwt } from '../utils/jwt';
import { generateProgress } from '../services/aiService';

function Progress() {
  const { token, user } = useAuth();
  const claims = decodeJwt(token);
  const studentId = claims?.uid || user?.id || user?.uid || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generateProgress(studentId);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h1>Weekly Progress</h1>
      <button className="primary-btn" onClick={run} disabled={loading || !studentId}>
        {loading ? 'Generating...' : 'Generate Progress'}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
      {report ? (
        <div className="ai-card">
          <p>
            <strong>Progress Score:</strong> {report.progressScore}
          </p>
          <p>
            <strong>Consistency Rate:</strong> {report.consistencyRate}
          </p>
          <p>
            <strong>Strength Areas:</strong> {(report.strengthAreas || []).join(', ')}
          </p>
          <p>
            <strong>Risk Areas:</strong> {(report.riskAreas || []).join(', ')}
          </p>
          <p>
            <strong>Recommendation:</strong> {report.recommendation}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default Progress;
