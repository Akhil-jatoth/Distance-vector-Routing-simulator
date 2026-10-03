import React, { useState, useEffect } from 'react';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenTutorial,
  onOpenShortcuts,
}) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('dv_dark_mode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('dv_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-section" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo" aria-hidden="true">DV</div>
          <div>
            <div className="brand-title">
              Distance Vector Routing Simulator
              <span className="brand-badge">RFC 1058 / 2453</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Bellman-Ford Algorithm Network Simulator
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links" aria-label="Main Navigation" style={{ overflowX: 'auto' }}>
          <button
            className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            className={`nav-button ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            Simulator
          </button>
          <button
            className={`nav-button ${activeTab === 'learn' ? 'active' : ''}`}
            onClick={() => setActiveTab('learn')}
          >
            Learn
          </button>
          <button
            className={`nav-button ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            Quiz
          </button>
          <button
            className={`nav-button ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            Compare
          </button>
          <button
            className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`nav-button ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </nav>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
          >
            ⌨ Shortcuts
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={onOpenTutorial}
            title="Guided Tour &amp; Help"
          >
            ℹ Tour
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>
    </header>
  );
}
