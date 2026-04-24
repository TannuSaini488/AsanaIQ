import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Trainers from './pages/Trainers';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import Landing from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import Onboarding from './pages/Onboarding';
import TrainerOnboarding from './pages/TrainerOnboarding';
import Progress from './pages/Progress';
import Reviews from './pages/Reviews';

// Routes where the full Navbar should be hidden
const NO_NAVBAR_ROUTES = ['/onboarding', '/trainer-onboarding'];

function App() {
  const location = useLocation();
  const hideNavbar = NO_NAVBAR_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      {!hideNavbar && <Navbar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/trainers"
            element={
              <ProtectedRoute roles={['student', 'trainer']}>
                <Trainers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute roles={['student', 'trainer']}>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-call"
            element={
              <ProtectedRoute roles={['student', 'trainer']}>
                <VideoCall />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute roles={['student']} requireOnboarding={false}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer-onboarding"
            element={
              <ProtectedRoute roles={['trainer']} requireOnboarding={false}>
                <TrainerOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute roles={['student']}>
                <Progress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute roles={['student', 'trainer']}>
                <Reviews />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

