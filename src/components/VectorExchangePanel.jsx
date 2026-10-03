import React, { useState } from 'react';
import { INFINITY } from '../engine/topology.js';

export default function VectorExchangePanel({
  topology,
  messages = [],
  round,
  options,
}) {
  const [filterNode, setFilterNode] = useState('ALL');

  const filteredMessages = messages.filter(
    msg => filterNode === 'ALL' || msg.from === filterNode || msg.to === filterNode
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          Vector Exchange Inspection (Round {round})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Filter Router:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '2px 6px', fontSize: '12px' }}
            value={filterNode}
            onChange={e => setFilterNode(e.target.value)}
          >
            {(topology.nodes || []).map(n => {
              const id = typeof n === 'string' ? n : n.id;
              return (
                <option key={id} value={id}>
                  Router {id}
                </option>
              );
            })}
          </select>
        </div>
      </div>


      <div className="card-body" style={{ padding: '12px', maxHeight: '280px', overflowY: 'auto' }}>
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            {round === 0
              ? 'Round 0: Tables are locally initialized. Press "Next Round" or "Run" to broadcast distance vectors.'
              : 'No vectors exchanged for the selected filter.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
            {filteredMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  background: 'var(--color-bg-subtle)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--color-primary)' }}>
                    Vector: <span className="badge badge-info">{msg.from}</span> &rarr; <span className="badge badge-info">{msg.to}</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    link c={msg.linkCost}
                  </span>
                </div>

                <div className="text-mono" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.entries(msg.vector).map(([dest, cost]) => {
                    const isPoisoned = Boolean(msg.poisoned?.[dest]);
                    const isInfinity = cost >= INFINITY;

                    return (
                      <span
                        key={dest}
                        style={{
                          background: isPoisoned ? 'var(--color-poison-bg)' : '#ffffff',
                          border: `1px solid ${isPoisoned ? 'var(--color-poison-border)' : '#cbd5e1'}`,
                          color: isPoisoned ? 'var(--color-poison-text)' : isInfinity ? '#dc2626' : '#0f172a',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          fontSize: '11px',
                        }}
                        title={
                          isPoisoned
                            ? `Destination ${dest} poisoned (cost 16 advertised to next-hop ${msg.to})`
                            : `Distance from ${msg.from} to ${dest} = ${cost}`
                        }
                      >
                        {dest}:{isInfinity ? '∞' : cost}
                        {isPoisoned && '!'}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
