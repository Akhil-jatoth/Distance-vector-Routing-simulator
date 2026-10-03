import React, { useState, useEffect } from 'react';
import { exportTopologyJSON, importTopologyJSON } from '../engine/topology.js';

export function LinkEditModal({
  isOpen,
  onClose,
  link,
  onSaveCost,
  onToggleStatus,
  onDeleteLink,
  onAddLink,
}) {
  const [costInput, setCostInput] = useState('1');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (link) {
      setCostInput(String(link.cost || '1'));
      setShowConfirmDelete(false);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const isNew = link.isNew;
  const src = link.source || link.a;
  const tgt = link.target || link.b;
  const isDown = link.up === false || link.status === 'down';

  const handleSubmit = e => {
    e.preventDefault();
    const cost = parseInt(costInput, 10);
    if (isNaN(cost) || cost < 1) {
      alert('Link cost must be a positive integer (1 to 15).');
      return;
    }

    if (isNew) {
      onAddLink(src, tgt, cost);
    } else {
      onSaveCost(link.id, cost);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
            {isNew ? 'Create New Link' : `Edit Link: Router ${src} ↔ Router ${tgt}`}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {showConfirmDelete ? (
          <div className="modal-body">
            <div style={{ padding: '12px', background: 'var(--color-danger-bg)', borderRadius: '4px', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger-text)', marginBottom: '16px' }}>
              <strong>Confirm Link Deletion:</strong>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>
                Are you sure you want to remove the link between <strong>Router {src}</strong> and <strong>Router {tgt}</strong>?
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  onDeleteLink(link.id || `${src}-${tgt}`);
                  onClose();
                }}
              >
                Yes, Delete Link
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Link Metric / Cost (1 to 15):</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  className="form-input"
                  value={costInput}
                  onChange={e => setCostInput(e.target.value)}
                  autoFocus
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Positive integer link cost metric used by the Bellman-Ford equation.
                </span>
              </div>

              {!isNew && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    Dynamic Link Actions:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isDown ? 'btn-primary' : 'btn-danger'}`}
                      onClick={() => {
                        onToggleStatus(link.id || `${src}-${tgt}`, isDown ? 'up' : 'down');
                        onClose();
                      }}
                    >
                      {isDown ? '✓ Restore Link (Bring UP)' : '⚠ Fail Link (Simulate Cut)'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => setShowConfirmDelete(true)}
                    >
                      Delete Link
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isNew ? 'Create Link' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function AddNodeModal({ isOpen, onClose, onAddNode, existingNodes }) {
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const nodeIds = (existingNodes || []).map(n => (typeof n === 'string' ? n : n.id));
      let num = 1;
      while (nodeIds.includes(`R${num}`)) {
        num++;
      }
      setNodeId(`R${num}`);
      setNodeName(`Router R${num}`);
    }
  }, [isOpen, existingNodes]);

  if (!isOpen) return null;

  const handleSubmit = e => {
    e.preventDefault();
    const id = nodeId.trim();
    if (!id) return;
    const nodeIds = (existingNodes || []).map(n => (typeof n === 'string' ? n : n.id));
    if (nodeIds.includes(id)) {
      alert(`Router ID "${id}" already exists.`);
      return;
    }

    onAddNode({
      id,
      name: nodeName.trim() || `Router ${id}`,
      x: 300 + Math.floor(Math.random() * 80 - 40),
      y: 200 + Math.floor(Math.random() * 80 - 40),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Add New Router Node</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Router Identifier (e.g. R1, R2, A):</label>
              <input
                type="text"
                className="form-input"
                maxLength={6}
                value={nodeId}
                onChange={e => setNodeId(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Router Display Label:</label>
              <input
                type="text"
                className="form-input"
                value={nodeName}
                onChange={e => setNodeName(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Router
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ImportExportModal({ isOpen, onClose, topology, onImportTopology }) {
  const [jsonContent, setJsonContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && topology) {
      setJsonContent(exportTopologyJSON(topology));
      setErrorMessage('');
    }
  }, [isOpen, topology]);

  if (!isOpen) return null;

  const handleImport = () => {
    try {
      const imported = importTopologyJSON(jsonContent);
      onImportTopology(imported);
      onClose();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    alert('Topology JSON copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Import / Export Topology JSON</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Export your network topology to JSON or paste valid topology JSON to load it into the simulator.
          </p>

          <textarea
            className="form-textarea text-mono"
            rows="14"
            value={jsonContent}
            onChange={e => {
              setJsonContent(e.target.value);
              setErrorMessage('');
            }}
            style={{ fontSize: '12px', whiteSpace: 'pre' }}
          />

          {errorMessage && (
            <div style={{ marginTop: '8px', padding: '8px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: '4px', color: 'var(--color-danger-text)', fontSize: '12px', whiteSpace: 'pre-line' }}>
              {errorMessage}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleCopy}>
            📋 Copy JSON
          </button>
          <div style={{ flex: 1 }}></div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleImport}>
            Import &amp; Load Topology
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConnectRoutersModal({ isOpen, onClose, nodes, onConnect }) {
  const [srcNode, setSrcNode] = useState('');
  const [tgtNode, setTgtNode] = useState('');
  const [costInput, setCostInput] = useState('1');

  useEffect(() => {
    if (isOpen && nodes && nodes.length >= 2) {
      const nodeIds = nodes.map(n => (typeof n === 'string' ? n : n.id));
      setSrcNode(nodeIds[0] || '');
      setTgtNode(nodeIds[1] || '');
      setCostInput('1');
    }
  }, [isOpen, nodes]);

  if (!isOpen) return null;

  const nodeIds = (nodes || []).map(n => (typeof n === 'string' ? n : n.id));

  const handleSubmit = e => {
    e.preventDefault();
    if (!srcNode || !tgtNode) {
      alert('Please select two routers.');
      return;
    }
    if (srcNode === tgtNode) {
      alert('Please select two different routers to connect.');
      return;
    }
    const cost = parseInt(costInput, 10);
    if (isNaN(cost) || cost < 1) {
      alert('Link cost must be a positive integer (1 to 15).');
      return;
    }
    onConnect(srcNode, tgtNode, cost);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Connect Routers with Link</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">First Router (Source):</label>
              <select
                className="form-select"
                value={srcNode}
                onChange={e => setSrcNode(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                {nodeIds.map(id => (
                  <option key={id} value={id}>Router {id}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Second Router (Destination):</label>
              <select
                className="form-select"
                value={tgtNode}
                onChange={e => setTgtNode(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                {nodeIds.map(id => (
                  <option key={id} value={id}>Router {id}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Link Metric / Cost (1 to 15):</label>
              <input
                type="number"
                min="1"
                max="15"
                className="form-input"
                value={costInput}
                onChange={e => setCostInput(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Direct hop metric between the two routers.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Connect Routers
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

