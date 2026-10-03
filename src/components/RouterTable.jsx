import React, { useState } from 'react';
import { INFINITY } from '../engine/topology.js';

export default function RouterTable({
  topology,
  selectedNodeId,
  onSelectNode,
  tables,
  round,
}) {
  const [expandedDest, setExpandedDest] = useState(null);

  const nodes = topology.nodes || [];
  const nodeIds = nodes.map(n => (typeof n === 'string' ? n : n.id));
  const selectedNode = nodes.find(n => (typeof n === 'string' ? n : n.id) === selectedNodeId);
  const routerName = selectedNode ? (typeof selectedNode === 'string' ? `Router ${selectedNode}` : selectedNode.name || `Router ${selectedNode.id}`) : selectedNodeId;

  const routerTable = tables?.[selectedNodeId] || {};

  const toggleExpand = destId => {
    setExpandedDest(expandedDest === destId ? null : destId);
  };

  if (nodes.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Routing Table &amp; Bellman-Ford Inspector
          </div>
        </div>
        <div className="card-body" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            No routers on canvas yet.
          </p>
          <span style={{ fontSize: '12px' }}>
            Click <strong>+ Add Router</strong> on the canvas to add <strong>R1</strong> and drag it into position.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          Routing Table &amp; Bellman-Ford Inspector
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Router:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '2px 6px', fontSize: '13px', fontWeight: 600 }}
            value={selectedNodeId || ''}
            onChange={e => onSelectNode(e.target.value)}
          >
            {nodes.map(n => {
              const id = typeof n === 'string' ? n : n.id;
              const name = typeof n === 'string' ? `Router ${n}` : n.name || `Router ${n.id}`;
              return (
                <option key={id} value={id}>
                  {id} ({name})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="card-body" style={{ padding: '12px' }}>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>
            Viewing Router <strong style={{ color: 'var(--color-text-main)' }}>{selectedNodeId}</strong> ({routerName})
          </span>
          <span>Round {round}</span>
        </div>

        <table className="network-table" aria-label={`Routing Table for Router ${selectedNodeId}`}>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Cost</th>
              <th>Next Hop</th>
              <th>Calculation / Status</th>
            </tr>
          </thead>
          <tbody>
            {nodeIds.map(destId => {
              const entry = routerTable[destId] || {
                cost: INFINITY,
                nextHop: null,
              };

              const isInfinity = entry.cost >= INFINITY;
              const isExpanded = expandedDest === destId;

              return (
                <React.Fragment key={destId}>
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleExpand(destId)}
                    title="Click to view candidate breakdown"
                  >
                    <td>
                      <span className="font-semibold">{destId}</span>
                      {destId === selectedNodeId && (
                        <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          (self)
                        </span>
                      )}
                    </td>
                    <td className={isInfinity ? 'cost-infinity' : ''}>
                      {isInfinity ? '∞ (16)' : entry.cost}
                    </td>
                    <td>
                      {entry.nextHop ? (
                        <span className="badge badge-info">{entry.nextHop}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>&mdash;</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          {destId === selectedNodeId
                            ? 'Local loopback (cost 0)'
                            : entry.nextHop
                            ? `D_${selectedNodeId}(${destId}) = ${entry.cost} via ${entry.nextHop}`
                            : 'Unreachable'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-accent-blue)', marginLeft: '4px' }}>
                          {isExpanded ? '▲ hide' : '▼ formula'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Bellman-Ford breakdown */}
                  {isExpanded && (
                    <tr>
                      <td colSpan="4" style={{ background: '#f8fafc', padding: '10px 14px', fontFamily: 'var(--font-sans)' }}>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '6px' }}>
                            Bellman-Ford Formula for {selectedNodeId} &rarr; {destId}:
                          </div>

                          <div className="text-mono" style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                            D_{selectedNodeId}({destId}) = min_v &#123; c({selectedNodeId}, v) + D_v({destId}) &#125;
                          </div>

                          {destId === selectedNodeId ? (
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                              Local router node. Distance to self is 0 with null next hop.
                            </div>
                          ) : entry.cost < INFINITY ? (
                            <div style={{ color: 'var(--color-success-text)', fontWeight: 500 }}>
                              ✓ Optimal next hop selected: <strong>{entry.nextHop}</strong> with total path metric = <strong>{entry.cost}</strong>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--color-danger-text)' }}>
                              No active path connects {selectedNodeId} to {destId}. Metric is infinity (16).
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
