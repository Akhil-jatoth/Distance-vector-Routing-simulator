import React from 'react';

export default function TimelinePanel({
  history = [],
  currentRound,
  onSelectRound,
}) {
  if (!history || history.length <= 1) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Simulation Round History Scrubber
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Click any round to inspect past routing tables
        </div>
      </div>

      <div className="card-body" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {history.map((snap, idx) => {
            const isCurrent = snap.round === currentRound;
            return (
              <button
                key={idx}
                className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: '76px', display: 'flex', flexDirection: 'column', padding: '4px 8px' }}
                onClick={() => onSelectRound(snap.round)}
              >
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Round {snap.round}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>
                  {snap.converged ? 'Converged' : `${snap.round === 0 ? 'Init' : 'Active'}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
