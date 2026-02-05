import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Home from './pages/Home';
import VerifyEmail from './pages/VerifyEmail';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingProfile from './pages/onboarding/Profile';
import OnboardingPreferences from './pages/onboarding/Preferences';
import OnboardingWaliInvite from './pages/onboarding/WaliInvite';
import OnboardingComplete from './pages/onboarding/Complete';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route
            path="/onboarding/profile"
            element={
              <ProtectedRoute>
                <OnboardingProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/preferences"
            element={
              <ProtectedRoute>
                <OnboardingPreferences />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/wali"
            element={
              <ProtectedRoute>
                <OnboardingWaliInvite />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/complete"
            element={
              <ProtectedRoute>
                <OnboardingComplete />
              </ProtectedRoute>
            }
          />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
