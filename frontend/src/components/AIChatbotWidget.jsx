import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/aiService';
import { useAuth } from '../context/AuthContext';

const AIChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi there! I am your AI Yoga & Wellness Guide. How can I help you on your journey today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // If no user is logged in, hide widget (or allow it based on your auth rules)
  if (!user) return null;

  const toggleWidget = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Send history excluding the new message
      const history = messages.map(msg => ({ role: msg.role, content: msg.content }));
      
      const res = await chatWithAI(userMessage, history);
      
      setMessages([...newMessages, { role: 'ai', content: res.reply || 'Sorry, I couldn\'t understand that.' }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...newMessages, { role: 'ai', content: 'Oops! Something went wrong. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.aiAvatar}>🧘‍♀️</span>
              <h3 style={styles.headerTitle}>Yoga Guide</h3>
            </div>
            <button onClick={toggleWidget} style={styles.closeBtn}>×</button>
          </div>
          
          <div style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div key={index} style={msg.role === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper}>
                {msg.role === 'ai' && <div style={styles.smallAvatar}>🧘‍♀️</div>}
                <div style={msg.role === 'user' ? styles.userMessage : styles.aiMessage}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={styles.aiMessageWrapper}>
                <div style={styles.smallAvatar}>🧘‍♀️</div>
                <div style={styles.typingIndicator}>Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={styles.inputForm}>
            <input
              style={styles.inputField}
              type="text"
              placeholder="Ask about yoga or wellness..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" style={styles.sendBtn} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button onClick={toggleWidget} style={styles.floatingBtn}>
          🧘‍♀️ Ask AI
        </button>
      )}
    </div>
  );
};

// Inline styles for simplicity; can be moved to CSS
const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
  },
  floatingBtn: {
    backgroundColor: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },
  chatWindow: {
    width: '350px',
    height: '450px',
    backgroundColor: '#1E1E2E',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #333',
  },
  header: {
    backgroundColor: '#2A2A3C',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #444',
  },
  headerTitle: {
    margin: 0,
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
  },
  aiAvatar: {
    fontSize: '20px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  messagesContainer: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userMessageWrapper: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  aiMessageWrapper: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '8px',
    alignItems: 'flex-end',
  },
  smallAvatar: {
    fontSize: '16px',
    marginBottom: '2px',
  },
  userMessage: {
    backgroundColor: '#8B5CF6',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '16px 16px 0 16px',
    maxWidth: '80%',
    fontSize: '14px',
    lineHeight: '1.4',
  },
  aiMessage: {
    backgroundColor: '#2A2A3C',
    color: '#E2E8F0',
    padding: '10px 14px',
    borderRadius: '16px 16px 16px 0',
    maxWidth: '80%',
    fontSize: '14px',
    lineHeight: '1.4',
    border: '1px solid #444',
  },
  typingIndicator: {
    backgroundColor: '#2A2A3C',
    color: '#aaa',
    padding: '10px 14px',
    borderRadius: '16px 16px 16px 0',
    fontSize: '12px',
    fontStyle: 'italic',
    border: '1px solid #444',
  },
  inputForm: {
    display: 'flex',
    padding: '12px',
    backgroundColor: '#2A2A3C',
    borderTop: '1px solid #444',
    gap: '8px',
  },
  inputField: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#1E1E2E',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    backgroundColor: '#8B5CF6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default AIChatbotWidget;
