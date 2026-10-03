import React from 'react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Toggle auto-run (Play / Pause)' },
    { key: 'N', desc: 'Execute next synchronous round (Step)' },
    { key: 'B', desc: 'Step backward to previous round (Step Back)' },
    { key: 'R', desc: 'Reset simulation tables to Round 0' },
    { key: '?', desc: 'Open this keyboard shortcuts dialog' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '420px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
            Keyboard Shortcuts
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <table className="network-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((sc, i) => (
                <tr key={i}>
                  <td>
                    <kbd
                      style={{
                        padding: '2px 8px',
                        background: 'var(--color-bg-muted)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {sc.key}
                    </kbd>
                  </td>
                  <td>{sc.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
