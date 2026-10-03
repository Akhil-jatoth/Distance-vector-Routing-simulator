import React from 'react';
import { getPathCostMatrix, INFINITY } from '../engine/distanceVector.js';

export default function SummaryMatrixModal({
  isOpen,
  onClose,
  topology,
  tables,
  round,
  converged,
}) {
  if (!isOpen) return null;

  const { nodes, matrix } = getPathCostMatrix(topology, tables);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '820px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Network Routing Summary & Path-Cost Matrix
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Status: {converged ? `Converged (Round ${round})` : `In Progress (Round ${round})`}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Path Cost Matrix Section */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>
              1. Full N &times; N Path Cost Matrix [Source &rarr; Destination]
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="network-table" style={{ textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Src \ Dst</th>
                    {nodes.map(dst => (
                      <th key={dst}>To {dst}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(src => (
                    <tr key={src}>
                      <td style={{ textAlign: 'left', fontWeight: 700, background: 'var(--color-bg-muted)' }}>
                        From {src}
                      </td>
                      {nodes.map(dst => {
                        const cell = matrix[src]?.[dst];
                        const cost = cell?.cost;
                        const nextHop = cell?.nextHop;
                        const isSelf = src === dst;
                        const isInf = cost >= INFINITY;

                        return (
                          <td
                            key={dst}
                            style={{
                              background: isSelf ? '#f1f5f9' : isInf ? 'var(--color-danger-bg)' : '#ffffff',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: isInf ? 'var(--color-danger-text)' : 'inherit' }}>
                              {isInf ? '∞' : cost}
                            </div>
                            {!isSelf && nextHop && (
                              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                via {nextHop}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Converged Routing Tables Side-by-Side */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>
              2. Individual Router Routing Tables
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {nodes.map(nodeId => {
                const nodeTable = tables[nodeId] || {};
                return (
                  <div
                    key={nodeId}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--color-primary)',
                        color: '#ffffff',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      Router {nodeId} Routing Table
                    </div>
                    <table className="network-table" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th>Dest</th>
                          <th>Cost</th>
                          <th>Next Hop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodes.map(dst => {
                          const entry = nodeTable[dst] || { cost: INFINITY, nextHop: null };
                          return (
                            <tr key={dst}>
                              <td style={{ fontWeight: 600 }}>{dst}</td>
                              <td className={entry.cost >= INFINITY ? 'cost-infinity' : ''}>
                                {entry.cost >= INFINITY ? '∞' : entry.cost}
                              </td>
                              <td>{entry.nextHop || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
