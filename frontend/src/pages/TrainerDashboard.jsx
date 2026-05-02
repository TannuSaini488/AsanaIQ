import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrainerOnboarding from './TrainerOnboarding';
import Reviews from './Reviews';
import './StudentDashboard.css'; 

function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="trainer-dashboard dashboard-container">
      <header className="premium-hero">
        <div className="container">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Trainer <span className="gradient-text">Command Center</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Manage your professional profile, availability, and client insights.
          </motion.p>
        </div>
      </header>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '-20px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="glass-card"
            style={{ minHeight: '400px' }}
          >
            {activeTab === 'profile' && <TrainerOnboarding isEmbedded={true} />}
            {activeTab === 'reviews' && <Reviews />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TrainerDashboard;
