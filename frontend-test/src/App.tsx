import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Home from './pages/Home';
import DiscoveryPage from './pages/DiscoveryPage';
import VerifyEmail from './pages/VerifyEmail';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingProfile from './pages/onboarding/Profile';
import OnboardingPreferences from './pages/onboarding/Preferences';
import OnboardingWaliInvite from './pages/onboarding/WaliInvite';
import OnboardingComplete from './pages/onboarding/Complete';
import Premium from './pages/Premium';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Subscription from './pages/Subscription';

// Phase 3 Routes (Stitch Design)
import SwipePage from './pages/SwipePage';
import MatchesPageStitch from './pages/MatchesPageStitch';
import ChatPageStitch from './pages/ChatPageStitch';
import FamilyPanel from './pages/FamilyPanel';
import MahrCalculatorStitch from './pages/MahrCalculatorStitch';
import FirasaPage from './pages/FirasaPage';
import MuftiAIStitch from './pages/MuftiAIStitch';

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

          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <DiscoveryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/premium"
            element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            }
          />

          <Route
            path="/subscription/success"
            element={
              <ProtectedRoute>
                <SubscriptionSuccess />
              </ProtectedRoute>
            }
          />

          <Route
            path="/account/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />

          {/* Phase 3 Routes */}
          <Route
            path="/swipe"
            element={
              <ProtectedRoute>
                <SwipePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesPageStitch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:matchId"
            element={
              <ProtectedRoute>
                <ChatPageStitch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/family-panel"
            element={
              <ProtectedRoute>
                <FamilyPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mahr-calculator"
            element={
              <ProtectedRoute>
                <MahrCalculatorStitch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/firasa/:userId"
            element={
              <ProtectedRoute>
                <FirasaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mufti-ai"
            element={
              <ProtectedRoute>
                <MuftiAIStitch />
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
