import React, { useState } from 'react';

const TUTORIAL_STEPS = [
  {
    title: '1. Welcome to the DV Routing Simulator',
    desc: 'This application models the Bellman-Ford Distance Vector routing algorithm (RFC 1058 / 2453) in discrete, synchronous rounds.',
    action: 'Select presets from the toolbar, or start with a blank canvas to build your own custom network from scratch.',
  },
  {
    title: '2. Building Topologies & Connecting Routers',
    desc: 'Click "+ Add Router" to place routers (R1, R2, R3...). Drag them anywhere. Click "+ Connect Routers" and click the first endpoint, then the second endpoint to draw links and configure positive costs.',
    action: 'Click any link cost badge on the canvas to edit its cost metric or simulate dynamic link failures ("Fail Link").',
  },
  {
    title: '3. Stepping & Auto-Running Rounds',
    desc: 'Click "Next Round" or press "N" on your keyboard to advance one synchronous exchange round. Click "▶ Run Auto" (or Space) to watch the algorithm converge automatically.',
    action: 'Entries that change in the current round are highlighted in amber across all tables.',
  },
  {
    title: '4. Candidate Breakdown & Kurose-Ross Matrix',
    desc: 'Use the side panel tabs to inspect the exact Bellman-Ford calculations for every candidate neighbor, or view the Kurose-Ross distance table.',
    action: 'Explore how each router evaluates min { c(x,v) + D_v(y) } for all known destinations.',
  },
  {
    title: '5. Packet Tracer with TTL & Loop Detection',
    desc: 'Switch to the "Packet Tracer" tab to send test packets across live routing tables with TTL decrement, hop tracing, and automatic loop detection.',
    action: 'Use the top navigation to explore Quiz Mode, the DV vs Link State Race, and Analytics experiments.',
  },
];

export default function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '520px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-info">Step {currentStep + 1} of {TUTORIAL_STEPS.length}</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {step.title}
            </h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-main)' }}>
          <p style={{ marginBottom: '10px' }}>{step.desc}</p>
          <div style={{ background: 'var(--color-bg-muted)', padding: '10px 14px', borderRadius: '4px', borderLeft: '3px solid var(--color-accent-blue)', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
            <strong>💡 Pro-Tip:</strong> {step.action}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            &larr; Previous
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Skip Tour
            </button>
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next &rarr;
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
                Finish &amp; Start Exploring
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
