import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, maxWidth: 720 }}>
      <h1>Yoga Marketplace</h1>
      <p>Find certified trainers, book sessions, chat, and join video calls — powered by AI matching.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link className="primary-btn" to="/login">
          Login
        </Link>
        <Link className="primary-btn" to="/register">
          Register
        </Link>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>• Browse trainers and availability</div>
        <div>• AI recommendations</div>
        <div>• In-app chat and video calls</div>
        <div>• Role-based access for students and trainers</div>
      </div>
    </div>
  );
}

export default Landing;
