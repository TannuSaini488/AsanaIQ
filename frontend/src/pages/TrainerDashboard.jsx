import { useState } from 'react';
import TrainerOnboarding from './TrainerOnboarding';
import Reviews from './Reviews';
import './StudentDashboard.css'; // We can reuse the same clean styling

function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <p>Manage your trainer profile, availability, and view reviews.</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Update Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          My Reviews
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && <TrainerOnboarding isEmbedded={true} />}
        {activeTab === 'reviews' && <Reviews />}
      </div>
    </div>
  );
}

export default TrainerDashboard;
