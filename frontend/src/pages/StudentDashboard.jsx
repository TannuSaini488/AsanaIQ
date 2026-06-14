import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Onboarding from './Onboarding';
import Progress from './Progress';
import Reviews from './Reviews';
import './StudentDashboard.css';

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="student-dashboard dashboard-container">
      <header className="premium-hero">
        <div className="container">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            My <span className="gradient-text">Journey</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Personalized path to wellness, progress tracking, and reflections.
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
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
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
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card"
            style={{ minHeight: '400px' }}
          >
            {activeTab === 'profile' && <Onboarding isEmbedded={true} />}
            {activeTab === 'progress' && <Progress />}
            {activeTab === 'reviews' && <Reviews />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StudentDashboard;
