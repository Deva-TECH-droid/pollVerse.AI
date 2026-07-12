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
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;