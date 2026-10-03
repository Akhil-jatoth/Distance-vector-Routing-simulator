import React, { useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import SimulatorPage from './pages/SimulatorPage.jsx';
import LearnPage from './pages/LearnPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import TutorialModal from './components/TutorialModal.jsx';
import ShortcutsModal from './components/ShortcutsModal.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator'); // 'home' | 'simulator' | 'learn' | 'quiz' | 'compare' | 'analytics' | 'about'
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const handleOpenPresetInSimulator = presetKey => {
    setActiveTab('simulator');
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="main-content">
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'simulator' && <SimulatorPage />}
        {activeTab === 'learn' && <LearnPage />}
        {activeTab === 'quiz' && (
          <QuizPage onOpenInSimulator={handleOpenPresetInSimulator} />
        )}
        {activeTab === 'compare' && <ComparePage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'about' && <AboutPage />}
      </main>

      <Footer />

      {/* Global Modals */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
