import React from 'react';
import { getShortestPath } from '../engine/distanceVector.js';

export default function PathFinder({
  topology,
  tables,
  sourceNodeId,
  setSourceNodeId,
  destNodeId,
  setDestNodeId,
  onPathCalculated,
}) {
  const nodes = topology.nodes || [];
  const nodeIds = nodes.map(n => (typeof n === 'string' ? n : n.id));

  const pathResult =
    sourceNodeId && destNodeId
      ? getShortestPath(tables, sourceNodeId, destNodeId)
      : { path: [], totalCost: 16, isReachable: false, loopDetected: false };

  // Notify parent of highlighted path nodes
  React.useEffect(() => {
    if (onPathCalculated) {
      onPathCalculated(pathResult.isReachable ? pathResult.path : []);
    }
  }, [sourceNodeId, destNodeId, tables]);

  if (nodeIds.length < 2) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Shortest Path Tracing
          </div>
        </div>
        <div className="card-body" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          Add at least 2 connected routers to trace shortest paths.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          Shortest Path Tracing
        </div>
      </div>

      <div className="card-body" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Source Router:</label>
            <select
              className="form-select"
              value={sourceNodeId || ''}
              onChange={e => setSourceNodeId(e.target.value)}
            >
              {nodeIds.map(id => (
                <option key={id} value={id}>
                  Router {id}
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
            &rarr;
          </div>

          <div style={{ flex: 1 }}>
            <label className="form-label">Destination Router:</label>
            <select
              className="form-select"
              value={destNodeId || ''}
              onChange={e => setDestNodeId(e.target.value)}
            >
              {nodeIds.map(id => (
                <option key={id} value={id}>
                  Router {id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Path Result Display */}
        <div
          style={{
            background: pathResult.isReachable
              ? 'var(--color-bg-subtle)'
              : pathResult.loopDetected
              ? 'var(--color-poison-bg)'
              : 'var(--color-danger-bg)',
            border: `1px solid ${
              pathResult.isReachable
                ? 'var(--color-border-light)'
                : pathResult.loopDetected
                ? 'var(--color-poison-border)'
                : 'var(--color-danger-border)'
            }`,
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '13px',
          }}
        >
          {pathResult.loopDetected ? (
            <div>
              <div style={{ color: 'var(--color-poison-text)', fontWeight: 600, marginBottom: '4px' }}>
                ⚠ Routing Loop Detected!
              </div>
              <div className="text-mono" style={{ fontSize: '12px', color: 'var(--color-poison-text)' }}>
                Hop trace: {pathResult.path.join(' → ')}
              </div>
            </div>
          ) : pathResult.isReachable ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                  Active Shortest Path:
                </span>
                <span className="badge badge-success font-semibold">
                  Total Cost: {pathResult.totalCost}
                </span>
              </div>
              <div className="text-mono" style={{ fontSize: '14px', color: 'var(--color-accent-blue)', fontWeight: 600 }}>
                {pathResult.path.join(' → ')}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-danger-text)', fontWeight: 500 }}>
              No reachable route from {sourceNodeId} to {destNodeId} (Cost: &infin;).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
