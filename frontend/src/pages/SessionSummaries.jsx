import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMySessions } from '../services/sessionService';
import { fetchSessionSummary } from '../services/aiService';
import { getMyConnections } from '../services/connectionService';

function SessionSummaries() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [sessionData, connData] = await Promise.all([
          fetchMySessions(),
          getMyConnections().catch(() => []),
        ]);
        const completed = sessionData.filter(s => s.status === 'completed');
        setSessions(completed);
        setConnections(connData);
      } catch (err) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleViewSummary = async (sessionId) => {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      setSummary(null);
      return;
    }
    setSelectedSessionId(sessionId);
    setSummaryLoading(true);
    setSummaryError('');
    setSummary(null);
    try {
      const data = await fetchSessionSummary(sessionId);
      if (!data) {
        setSummaryError('No AI Summary found for this session.');
      } else {
        setSummary(data);
      }
    } catch (err) {
      setSummaryError(err.message || 'Failed to load AI Summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return 'Unknown Date';
    if (val._seconds) return new Date(val._seconds * 1000).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (val) => {
    if (!val) return '';
    if (val._seconds) return new Date(val._seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTrainerName = (trainerId) => {
    const conn = connections.find(c => c.peerId === trainerId);
    return conn?.peerName || trainerId;
  };

  const cleanText = (txt) => {
    if (!txt) return '';
    return txt.replace(/Session ID:?\s*\w+\.?/gi, '').trim();
  };

  if (loading) return <div className="muted" style={{ padding: 24 }}>Loading sessions...</div>;
  if (error) return <div className="send-error" style={{ padding: 24 }}>{error}</div>;

  return (
    <section className="session-summaries" style={{ padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', color: '#1C1917' }}>AI Session Summaries</h3>
        <p className="muted" style={{ margin: 0 }}>View intelligent breakdowns, posture feedback, and next steps generated for your completed sessions.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="premium-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <span style={{ fontSize: '32px', marginBottom: 16, display: 'block' }}>🧘‍♀️</span>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No Completed Sessions Yet</h4>
          <p className="muted" style={{ margin: 0 }}>Complete a session to get your first personalized AI Summary!</p>
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
          {sessions.map((session) => (
            <div key={session.id} className="premium-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedSessionId === session.id ? 16 : 0 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                    {formatDate(session.scheduledStart || session.createdAt)} at {formatTime(session.scheduledStart || session.createdAt)}
                    {session.scheduledEnd ? ` - ${formatTime(session.scheduledEnd)}` : ''}
                  </h4>
                  <p className="muted" style={{ margin: 0, fontSize: '14px' }}>Trainer: {getTrainerName(session.trainerId)}</p>
                </div>
                <button 
                  className="primary-btn" 
                  style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '8px' }}
                  onClick={() => handleViewSummary(session.id)}
                >
                  {selectedSessionId === session.id ? 'Close Summary' : '✨ View AI Report'}
                </button>
              </div>

              <AnimatePresence>
                {selectedSessionId === session.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ background: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: 12, padding: 20, marginTop: 16 }}>
                      {summaryLoading ? (
                        <p className="muted" style={{ margin: 0 }}>✨ AI is analyzing this session...</p>
                      ) : summaryError ? (
                        <p className="send-error" style={{ margin: 0 }}>{summaryError}</p>
                      ) : summary ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div>
                            <h5 style={{ margin: '0 0 8px', color: '#4C1D95', fontSize: '15px' }}>Session Summary</h5>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#374151' }}>{cleanText(summary.generatedContent?.session_summary)}</p>
                          </div>
                          
                          <div>
                            <h5 style={{ margin: '0 0 8px', color: '#4C1D95', fontSize: '15px' }}>Posture Feedback</h5>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#374151' }}>{cleanText(summary.generatedContent?.posture_feedback)}</p>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <h5 style={{ margin: '0 0 8px', color: '#4C1D95', fontSize: '15px' }}>Areas for Improvement</h5>
                              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '14px', color: '#374151' }}>
                                {summary.generatedContent?.improvement_areas?.map((item, i) => (
                                  <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 style={{ margin: '0 0 8px', color: '#4C1D95', fontSize: '15px' }}>Next Week Focus</h5>
                              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '14px', color: '#374151' }}>
                                {summary.generatedContent?.next_week_focus?.map((item, i) => (
                                  <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', padding: 16, borderRadius: 8, marginTop: 8 }}>
                            <h5 style={{ margin: '0 0 4px', color: '#6D28D9', fontSize: '14px' }}>Motivational Note 💜</h5>
                            <p style={{ margin: 0, fontSize: '14px', color: '#5B21B6', fontStyle: 'italic' }}>"{summary.generatedContent?.motivational_note}"</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default SessionSummaries;
