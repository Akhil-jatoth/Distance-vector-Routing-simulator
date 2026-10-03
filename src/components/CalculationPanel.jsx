import React, { useState } from 'react';
import { INFINITY } from '../engine/topology.js';

export default function CalculationPanel({
  topology,
  selectedNodeId,
  tables,
  options,
}) {
  const nodes = (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));
  const links = (topology.links || []).filter(l => l.up !== false && l.status !== 'down');

  // Find direct neighbors of selectedNodeId
  const neighbors = [];
  links.forEach(l => {
    const src = l.a || l.source;
    const tgt = l.b || l.target;
    if (src === selectedNodeId) neighbors.push({ id: tgt, cost: l.cost });
    else if (tgt === selectedNodeId) neighbors.push({ id: src, cost: l.cost });
  });

  const [selectedDest, setSelectedDest] = useState(nodes[0] || 'R1');

  if (!selectedNodeId || nodes.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Select a router on the canvas to inspect Bellman-Ford calculations and textbook distance matrix.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
          </svg>
          Kurose &amp; Ross Distance Table &amp; Calculation
        </div>
      </div>

      <div className="card-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. Kurose & Ross Distance Table */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
            Distance Table for Router {selectedNodeId} (Rows = Destination, Cols = Neighbor)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="network-table" style={{ fontSize: '12px', textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Destination</th>
                  {neighbors.map(nbr => (
                    <th key={nbr.id}>
                      via {nbr.id} (c={nbr.cost})
                    </th>
                  ))}
                  <th style={{ background: 'var(--color-primary)', color: '#ffffff' }}>
                    Min Cost D_{selectedNodeId}
                  </th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(dest => {
                  const entry = tables[selectedNodeId]?.[dest] || { cost: INFINITY, nextHop: null };
                  const isSelf = dest === selectedNodeId;

                  return (
                    <tr key={dest}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>
                        {dest} {isSelf && '(self)'}
                      </td>

                      {neighbors.map(nbr => {
                        if (isSelf) {
                          return <td key={nbr.id} style={{ color: 'var(--color-text-muted)' }}>0</td>;
                        }
                        const linkCost = nbr.cost;
                        const nbrAdvertised = tables[nbr.id]?.[dest]?.cost ?? INFINITY;
                        const total = Math.min(linkCost + nbrAdvertised, INFINITY);
                        const isWinner = entry.nextHop === nbr.id && entry.cost === total && total < INFINITY;

                        return (
                          <td
                            key={nbr.id}
                            style={{
                              background: isWinner ? 'var(--color-success-bg)' : 'transparent',
                              fontWeight: isWinner ? 700 : 400,
                              color: isWinner ? 'var(--color-success-text)' : 'inherit',
                            }}
                          >
                            {total >= INFINITY ? '∞' : total}
                            {isWinner && <span style={{ marginLeft: '4px' }}>★</span>}
                          </td>
                        );
                      })}

                      <td style={{ fontWeight: 700, background: '#f8fafc', color: entry.cost >= INFINITY ? '#dc2626' : 'var(--color-primary)' }}>
                        {entry.cost >= INFINITY ? '∞' : entry.cost}
                        {entry.nextHop && <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>via {entry.nextHop}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Formula Breakdown for Selected Destination */}
        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Bellman-Ford Breakdown: {selectedNodeId} &rarr; Destination
            </span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '2px 6px', fontSize: '12px' }}
              value={selectedDest}
              onChange={e => setSelectedDest(e.target.value)}
            >
              {nodes.map(n => (
                <option key={n} value={n}>
                  To {n}
                </option>
              ))}
            </select>
          </div>

          <div className="text-mono" style={{ background: 'var(--color-bg-subtle)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', fontSize: '12px' }}>
            D_{selectedNodeId}({selectedDest}) = min &#123; c({selectedNodeId}, v) + D_v({selectedDest}) &#125;
          </div>

          <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {selectedDest === selectedNodeId ? (
              <div style={{ color: 'var(--color-text-secondary)' }}>
                Cost to self is fixed at 0 with null next hop.
              </div>
            ) : neighbors.length === 0 ? (
              <div style={{ color: 'var(--color-danger-text)' }}>
                No active links connected to Router {selectedNodeId}.
              </div>
            ) : (
              neighbors.map(nbr => {
                const linkCost = nbr.cost;
                const nbrCost = tables[nbr.id]?.[selectedDest]?.cost ?? INFINITY;
                const total = Math.min(linkCost + nbrCost, INFINITY);
                const isSelected = tables[selectedNodeId]?.[selectedDest]?.nextHop === nbr.id && total < INFINITY;

                return (
                  <div
                    key={nbr.id}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: isSelected ? 'var(--color-success-bg)' : '#ffffff',
                      border: `1px solid ${isSelected ? 'var(--color-success-border)' : '#e2e8f0'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      Via {nbr.id}: c({selectedNodeId},{nbr.id})[{linkCost}] + D_{nbr.id}({selectedDest})[{nbrCost >= 16 ? '∞' : nbrCost}] = <strong>{total >= 16 ? '∞' : total}</strong>
                    </span>
                    {isSelected && <span className="badge badge-success">✓ Chosen Route</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
