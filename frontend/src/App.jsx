import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Trainers from './pages/Trainers';
import Chat from './pages/Chat';
import Landing from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import Onboarding from './pages/Onboarding';
import TrainerOnboarding from './pages/TrainerOnboarding';
import TrainerDashboard from './pages/TrainerDashboard';
import Progress from './pages/Progress';
import Reviews from './pages/Reviews';
import StudentDashboard from './pages/StudentDashboard';
import { SocketProvider } from './contexts/SocketContext';
import { CallProvider } from './contexts/CallContext';
import GlobalCallUI from './components/GlobalCallUI';
import AIChatbotWidget from './components/AIChatbotWidget';
import useAuth from './hooks/useAuth';

// Routes where the full Navbar should be hidden
const NO_NAVBAR_ROUTES = ['/onboarding', '/trainer-onboarding'];

function App() {
  const location = useLocation();
  const { token } = useAuth();
  const hideNavbar = NO_NAVBAR_ROUTES.includes(location.pathname);

  return (
    <SocketProvider>
      <CallProvider>
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
                path="/connections"
                element={
                  <ProtectedRoute roles={['student', 'trainer']}>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              {/* Note: /video-call route removed since video calls are now globally integrated */}
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
                path="/trainer-dashboard"
                element={
                  <ProtectedRoute roles={['trainer']}>
                    <TrainerDashboard />
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
                path="/my-journey"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentDashboard />
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
        <GlobalCallUI />
        {token && <AIChatbotWidget />}
      </CallProvider>
    </SocketProvider>
  );
}

export default App;
