import React, { useState } from 'react';
import { generateQrSvg } from '../utils/qrCode.js';

export default function ShareModal({ isOpen, onClose, shareUrl }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const qrSvgHtml = generateQrSvg(shareUrl, 180);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
            Share Network Scenario
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            This link encodes your custom network topology, link costs, and algorithm settings so anyone can load the exact scenario.
          </p>

          {/* QR Code Container */}
          <div
            style={{
              padding: '12px',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}
            dangerouslySetInnerHTML={{ __html: qrSvgHtml }}
          />

          {/* URL Input with Copy Button */}
          <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="form-input text-mono"
              style={{ fontSize: '12px', background: '#f8fafc' }}
              onClick={e => e.target.select()}
            />
            <button className="btn btn-primary btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
