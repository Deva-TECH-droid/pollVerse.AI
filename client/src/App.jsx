import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import PollPage from './pages/PollPage';
import CreatePage from './pages/CreatePage';
import AuthPage from './pages/AuthPage';
import RewardClaimPage from './pages/RewardClaimPage';
import FeedbackPage from './pages/FeedbackPage';
import AIDashboardPage from './pages/AIDashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminDashboard from './pages/AdminDashboard';
import GullyCricketPage from './pages/GullyCricketPage';
import CreateMatchPage from './pages/CreateMatchPage';
import MatchDetailPage from './pages/MatchDetailPage';
import LiveScoringPage from './pages/LiveScoringPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" toastOptions={{ style: { background: '#242424', color: '#fff' } }} />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/polls" element={<HomePage />} />
            <Route path="/login/*" element={<AuthPage />} />
            <Route path="/poll/:id" element={<PollPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/reward/claim" element={<RewardClaimPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/ai-dashboard" element={<AIDashboardPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin/analytics" element={<AdminDashboard />} />
            <Route path="/gully-cricket" element={<GullyCricketPage />} />
            <Route path="/gully-cricket/create" element={<CreateMatchPage />} />
            <Route path="/gully-cricket/match/:id" element={<MatchDetailPage />} />
            <Route path="/gully-cricket/match/:id/score" element={<LiveScoringPage />} />
            <Route path="/gully-cricket/match/:id/summary" element={<MatchSummaryPage />} />
            <Route path="/gully-cricket/history" element={<MatchHistoryPage />} />
            <Route path="/gully-cricket/player/:name" element={<PlayerProfilePage />} />
            <Route path="/gully-cricket/player" element={<PlayerProfilePage />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;