import React from 'react';
import { PRESET_TOPOLOGIES } from '../engine/presets.js';

export default function ControlsToolbar({
  simState,
  isRunning,
  speed,
  onSpeedChange,
  onStep,
  onToggleRun,
  onReset,
  onStepBack,
  options,
  onToggleOption,
  selectedPreset,
  onSelectPreset,
  onOpenImportExport,
  onOpenSummary,
}) {
  const canStepBack = simState.history && simState.history.length > 1;

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div className="card-body" style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Preset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
              Topology Preset:
            </label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', padding: '4px 8px', fontSize: '13px' }}
              value={selectedPreset}
              onChange={e => onSelectPreset(e.target.value)}
              disabled={isRunning}
            >
              {Object.values(PRESET_TOPOLOGIES).map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Run & Step Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onStepBack}
              disabled={!canStepBack || isRunning}
              title="Step backward to previous round"
            >
              &larr; Step Back
            </button>

            <button
              className={`btn btn-sm ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onToggleRun}
              disabled={simState.converged && !isRunning}
            >
              {isRunning ? '⏸ Pause' : '▶ Run Auto'}
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onStep}
              disabled={isRunning || simState.converged}
              title="Execute a single synchronous round"
            >
              Next Round &rarr;
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={onReset}
              disabled={isRunning}
              title="Reset routing tables to Round 0"
            >
              ↺ Reset
            </button>

            {/* Speed Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Speed:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '2px 6px', fontSize: '12px' }}
                value={speed}
                onChange={e => onSpeedChange(Number(e.target.value))}
              >
                <option value={2000}>0.5x (2s)</option>
                <option value={1000}>1.0x (1s)</option>
                <option value={500}>2.0x (0.5s)</option>
              </select>
            </div>
          </div>

          {/* Algorithm Rules: Split Horizon & Poison Reverse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.splitHorizon}
                onChange={e => onToggleOption('splitHorizon', e.target.checked)}
                disabled={isRunning}
              />
              <span title="Do not advertise routes back to the neighbor they were learned from">
                Split Horizon
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.poisonReverse}
                onChange={e => onToggleOption('poisonReverse', e.target.checked)}
                disabled={isRunning}
              />
              <span title="Advertise unreachable (cost 16) back to the next-hop neighbor">
                Poison Reverse
              </span>
            </label>

            {/* Import / Export / Summary */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onOpenImportExport}
                title="Import or Export topology JSON"
              >
                JSON I/O
              </button>
              <button
                className="btn btn-dark btn-sm"
                onClick={onOpenSummary}
                title="View full network routing matrix and summary"
              >
                Summary Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Status bar & Convergence Alert */}
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--color-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
              Simulation Status: Round <span className="text-mono font-semibold">{simState.round}</span>
            </span>
            {simState.converged ? (
              <span className="badge badge-success">
                ✓ Converged after {simState.round > 0 ? simState.round - 1 : 0} rounds
              </span>
            ) : (
              <span className="badge badge-warning">
                ● In Progress (Round {simState.round})
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Bellman-Ford: <span className="text-mono">D_x(y) = min_v &#123; c(x,v) + D_v(y) &#125;</span> &bull; &infin; = 16
          </div>
        </div>
      </div>
    </div>
  );
}
