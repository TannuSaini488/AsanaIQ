import { useState } from 'react';
import Onboarding from './Onboarding';
import Progress from './Progress';
import Reviews from './Reviews';
import './StudentDashboard.css';

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Journey</h1>
        <p>Track your progress, update your profile, and review trainers.</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Update Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          My Progress
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          My Reviews
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && <Onboarding isEmbedded={true} />}
        {activeTab === 'progress' && <Progress />}
        {activeTab === 'reviews' && <Reviews />}
      </div>
    </div>
  );
}

export default StudentDashboard;
