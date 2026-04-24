import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { extractUserIdFromToken } from '../utils/jwt';
import { generateProgress } from '../services/aiService';

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

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [report, setReport] = useState(null);

  const run = async () => {
    setLoading(true);
    setError('');
    setReport(null);
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
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: '#0f172a',
  };

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
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧘</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Weekly Progress Report
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
            Powered by OpenRouter AI · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <button
            id="generate-progress-btn"
            style={btn}
            onClick={run}
            disabled={loading}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)',
                  borderTop: '2px solid #fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block',
                }} />
                Analyzing with AI…
              </>
            ) : (
              <>✨ Generate Progress</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 12,
            padding: '14px 18px',
            color: '#fca5a5',
            fontSize: 14,
            marginBottom: 28,
            textAlign: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Report */}
        {report && (
          <div style={{ animation: 'fadeUp 0.5s ease' }}>

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
                <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#86efac' }}>
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
                <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#fca5a5' }}>
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
