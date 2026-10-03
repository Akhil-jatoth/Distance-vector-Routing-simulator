import React, { useState } from 'react';
import { generateRandomTopology } from '../utils/randomTopology.js';
import { runUntilConverged } from '../engine/distanceVector.js';
import { exportExperimentToCsv } from '../utils/exportCsv.js';

export default function AnalyticsPage() {
  const [isRunningExperiments, setIsRunningExperiments] = useState(false);
  const [experimentResults, setExperimentResults] = useState([]);
  const [iterationsPerSize, setIterationsPerSize] = useState(3);

  // Run automated benchmark across network sizes: 5, 10, 20, 50 nodes
  const handleRunBenchmarks = async () => {
    setIsRunningExperiments(true);
    const sizes = [5, 10, 20, 50];
    const results = [];

    // Let UI render loading state
    setTimeout(() => {
      sizes.forEach(size => {
        for (let iter = 1; iter <= iterationsPerSize; iter++) {
          const topo = generateRandomTopology(size);

          // Run standard DV
          const stdSim = runUntilConverged(topo, { splitHorizon: false, poisonReverse: false }, 60);

          // Run with Split Horizon
          const shSim = runUntilConverged(topo, { splitHorizon: true, poisonReverse: false }, 60);

          results.push({
            nodeCount: size,
            iteration: iter,
            standardRounds: stdSim.roundsTaken,
            standardConverged: stdSim.converged,
            shRounds: shSim.roundsTaken,
            shConverged: shSim.converged,
          });
        }
      });

      setExperimentResults(results);
      setIsRunningExperiments(false);
    }, 100);
  };

  // Grouped averages by node size
  const averagesBySize = [5, 10, 20, 50].map(size => {
    const matching = experimentResults.filter(r => r.nodeCount === size);
    if (matching.length === 0) return { size, avgStd: 0, avgSh: 0 };

    const avgStd = matching.reduce((acc, r) => acc + r.standardRounds, 0) / matching.length;
    const avgSh = matching.reduce((acc, r) => acc + r.shRounds, 0) / matching.length;
    return { size, avgStd: Math.round(avgStd * 10) / 10, avgSh: Math.round(avgSh * 10) / 10 };
  });

  const handleExportCsv = () => {
    if (experimentResults.length === 0) return;
    exportExperimentToCsv(experimentResults);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px 64px 16px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px' }}>
            Simulation Analytics &amp; Experiment Runner
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Benchmark Bellman-Ford convergence dynamics, message scalability, and loop prevention performance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} disabled={experimentResults.length === 0}>
            📥 Export CSV
          </button>
          <button className="btn btn-dark btn-sm" onClick={handlePrintReport}>
            🖨 Generate Report / PDF
          </button>
        </div>
      </div>

      {/* Benchmark Experiment Controller */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">Scalability Experiment Runner (5, 10, 20, 50 Routers)</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Generates guaranteed connected random network topologies of sizes 5, 10, 20, and 50 routers with random metrics, executing synchronous Distance Vector rounds with and without Split Horizon.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <label className="form-label" style={{ margin: 0 }}>Runs per network size:</label>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '3px 8px' }}
                value={iterationsPerSize}
                onChange={e => setIterationsPerSize(Number(e.target.value))}
                disabled={isRunningExperiments}
              >
                <option value={2}>2 iterations</option>
                <option value={3}>3 iterations</option>
                <option value={5}>5 iterations</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleRunBenchmarks}
              disabled={isRunningExperiments}
            >
              {isRunningExperiments ? '⏳ Running Simulation Experiments...' : '▶ Run Experiments'}
            </button>
          </div>
        </div>
      </div>

      {/* SVG Scalability Convergence Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Average Convergence Rounds vs Network Size</h3>
        </div>
        <div className="card-body" style={{ minHeight: '260px' }}>
          {experimentResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Click <strong>&quot;Run Experiments&quot;</strong> above to generate benchmark metrics across 5, 10, 20, and 50 router topologies.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <svg viewBox="0 0 700 220" style={{ width: '100%', height: '220px', overflow: 'visible' }}>
                {/* Grid lines */}
                <line x1="60" y1="20" x2="660" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="60" y1="70" x2="660" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="60" y1="120" x2="660" y2="120" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="60" y1="170" x2="660" y2="170" stroke="#cbd5e1" strokeWidth="2" />

                {/* Y Axis labels */}
                <text x="50" y="24" textAnchor="end" fontSize="11" fill="#64748b">15 R</text>
                <text x="50" y="74" textAnchor="end" fontSize="11" fill="#64748b">10 R</text>
                <text x="50" y="124" textAnchor="end" fontSize="11" fill="#64748b">5 R</text>
                <text x="50" y="174" textAnchor="end" fontSize="11" fill="#64748b">0 R</text>

                {/* Bars for each size */}
                {averagesBySize.map((data, idx) => {
                  const x = 120 + idx * 140;
                  const maxR = 15;
                  const hStd = Math.min(150, (data.avgStd / maxR) * 150);
                  const hSh = Math.min(150, (data.avgSh / maxR) * 150);

                  return (
                    <g key={data.size}>
                      {/* Standard DV bar */}
                      <rect
                        x={x}
                        y={170 - hStd}
                        width="32"
                        height={hStd}
                        fill="#0f2b48"
                        rx="3"
                      />
                      <text x={x + 16} y={160 - hStd} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f2b48">
                        {data.avgStd}
                      </text>

                      {/* Split Horizon bar */}
                      <rect
                        x={x + 38}
                        y={170 - hSh}
                        width="32"
                        height={hSh}
                        fill="#2563eb"
                        rx="3"
                      />
                      <text x={x + 54} y={160 - hSh} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2563eb">
                        {data.avgSh}
                      </text>

                      {/* X Label */}
                      <text x={x + 35} y="195" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f172a">
                        {data.size} Routers
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Chart Legend */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', background: '#0f2b48', borderRadius: '3px' }}></span>
                  <span>Standard Distance Vector</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', background: '#2563eb', borderRadius: '3px' }}></span>
                  <span>With Split Horizon</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw Experiment Data Table */}
      {experimentResults.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Experiment Trial Data Log</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {experimentResults.length} trials completed
            </span>
          </div>

          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="network-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Network Size</th>
                  <th>Iteration</th>
                  <th>Standard DV Rounds</th>
                  <th>Standard Converged</th>
                  <th>Split Horizon Rounds</th>
                  <th>Split Horizon Converged</th>
                </tr>
              </thead>
              <tbody>
                {experimentResults.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.nodeCount} Routers</td>
                    <td>Trial #{row.iteration}</td>
                    <td className="text-mono font-semibold">{row.standardRounds} rounds</td>
                    <td>{row.standardConverged ? <span className="badge badge-success">Yes</span> : <span className="badge badge-warning">Max</span>}</td>
                    <td className="text-mono font-semibold">{row.shRounds} rounds</td>
                    <td>{row.shConverged ? <span className="badge badge-success">Yes</span> : <span className="badge badge-warning">Max</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
