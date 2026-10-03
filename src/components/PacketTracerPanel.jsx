import React, { useState, useEffect, useRef } from 'react';
import { tracePacket, runTraceroute } from '../engine/packetTracer.js';
import { getPath, runUntilConverged } from '../engine/distanceVector.js';
import { TRACER_SCENARIOS } from '../engine/presets.js';
import { downloadCsv } from '../utils/exportCsv.js';

export default function PacketTracerPanel({
  topology,
  tables,
  round,
  onHighlightPath,
  onStepSimulation,
  onLoadScenario,
  onUpdateTraceStatus,
}) {
  const nodes = (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));

  // Send Panel Inputs
  const [source, setSource] = useState(nodes[0] || 'R1');
  const [destination, setDestination] = useState(nodes[nodes.length - 1] || 'R2');
  const [ttl, setTtl] = useState(16);
  const [packetSize, setPacketSize] = useState('64B (Small)');
  const [protocol, setProtocol] = useState('ICMP Echo');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [validationError, setValidationError] = useState('');

  // Execution & Animation State
  const [traceResult, setTraceResult] = useState(null);
  const [currentHopIndex, setCurrentHopIndex] = useState(-1);
  const [isStepping, setIsStepping] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const [sendDuringConvergence, setSendDuringConvergence] = useState(false);
  const [isTracerouteMode, setIsTracerouteMode] = useState(false);
  const [tracerouteResult, setTracerouteResult] = useState(null);

  // Packet Log & Statistics
  const [packetLog, setPacketLog] = useState([]);
  const [activeTab, setActiveTab] = useState('trace'); // 'trace' | 'stats' | 'traceroute' | 'explain'

  const continuousTimerRef = useRef(null);

  // Sync default source/destination
  useEffect(() => {
    if (nodes.length > 0) {
      if (!nodes.includes(source)) setSource(nodes[0]);
      if (!nodes.includes(destination)) setDestination(nodes[nodes.length - 1]);
    }
  }, [nodes]);

  // Section 4.7: Send during convergence mode
  useEffect(() => {
    if (sendDuringConvergence && source && destination && source !== destination && tables) {
      handleExecuteTrace(false);
    }
  }, [round, tables]);

  // Compute optimal path at convergence for comparison (Section 4.5)
  const optimalConvergence = runUntilConverged(topology);
  const optimalPathNodes = getPath(optimalConvergence.finalTables, source, destination);
  const optimalCost = optimalConvergence.finalTables?.[source]?.[destination]?.cost;

  // Run Trace
  const handleExecuteTrace = (isStepByStep = false, customTtl = ttl) => {
    setValidationError('');
    if (!source || !destination) {
      setValidationError('Please select both a source and destination router.');
      return;
    }
    if (source === destination) {
      setValidationError('Source and destination routers must be distinct.');
      return;
    }

    const result = tracePacket(tables, topology, source, destination, Number(customTtl) || 16);
    setTraceResult(result);
    setIsTracerouteMode(false);

    // Update parent graph markers
    if (onUpdateTraceStatus) {
      const lastHop = result.hops[result.hops.length - 1];
      const isDropped = result.outcome.startsWith('DROPPED');
      onUpdateTraceStatus({
        droppedNodeId: isDropped ? lastHop?.router : null,
        packetTtl: result.ttlRemaining,
        isLoop: result.loopDetected,
      });
    }

    // Record into Packet Log (Section 4.6)
    const newLogEntry = {
      id: `#${packetLog.length + 1}`,
      source,
      destination,
      round: `R${round}`,
      protocol,
      outcome: result.outcome,
      hopCount: result.hops.length,
      cost: result.totalCost,
      ttlRemaining: result.ttlRemaining,
      time: new Date().toLocaleTimeString(),
    };
    setPacketLog(prev => [newLogEntry, ...prev]);

    if (isStepByStep) {
      setIsStepping(true);
      setCurrentHopIndex(0);
      if (onHighlightPath && result.hops.length > 0) {
        onHighlightPath([result.hops[0].router]);
      }
    } else {
      setIsStepping(false);
      setCurrentHopIndex(result.hops.length - 1);
      if (onHighlightPath) {
        const pathNodes = result.hops.map(h => h.router);
        onHighlightPath(pathNodes);
      }
    }
  };

  // Step Simulation Round and Send (Section 4.7)
  const handleStepRoundAndSend = () => {
    if (onStepSimulation) {
      onStepSimulation();
    }
    setTimeout(() => {
      handleExecuteTrace(false);
    }, 50);
  };


  // Step Hop Manual Button (Section 4.4)
  const handleStepHop = () => {
    if (!traceResult || currentHopIndex >= traceResult.hops.length - 1) return;
    const nextIdx = currentHopIndex + 1;
    setCurrentHopIndex(nextIdx);
    if (onHighlightPath) {
      const pathSoFar = traceResult.hops.slice(0, nextIdx + 1).map(h => h.router);
      onHighlightPath(pathSoFar);
    }
  };

  // Continuous Send Mode (Section 4.1)
  const handleToggleContinuous = () => {
    setIsContinuous(prev => !prev);
  };

  useEffect(() => {
    if (isContinuous) {
      continuousTimerRef.current = setInterval(() => {
        handleExecuteTrace(false);
      }, 1000);
    } else {
      if (continuousTimerRef.current) clearInterval(continuousTimerRef.current);
    }
    return () => {
      if (continuousTimerRef.current) clearInterval(continuousTimerRef.current);
    };
  }, [isContinuous, source, destination, ttl, tables, topology]);

  // Traceroute Mode (Section 4.9)
  const handleRunTraceroute = () => {
    if (!source || !destination || source === destination) return;
    const tr = runTraceroute(tables, topology, source, destination, 16);
    setTracerouteResult(tr);
    setIsTracerouteMode(true);
    setActiveTab('traceroute');
  };

  // Scenario Loader (Section 4.8)
  const handleSelectScenario = scenarioId => {
    setSelectedScenarioId(scenarioId);
    const scen = TRACER_SCENARIOS.find(s => s.id === scenarioId);
    if (scen) {
      setSource(scen.source);
      setDestination(scen.destination);
      setTtl(scen.ttl);
      if (onLoadScenario) {
        onLoadScenario(scen);
      }
    }
  };

  // Clear Trace
  const handleClearTrace = () => {
    setTraceResult(null);
    setCurrentHopIndex(-1);
    setIsStepping(false);
    setIsContinuous(false);
    setIsTracerouteMode(false);
    if (onHighlightPath) onHighlightPath([]);
  };

  // Export Packet Log to CSV (Section 4.6)
  const handleExportLogCsv = () => {
    if (packetLog.length === 0) return;
    const headers = ['ID', 'Time', 'Source', 'Destination', 'Round', 'Protocol', 'Outcome', 'Hops', 'Cost', 'TTL_Left'];
    const rows = packetLog.map(p => [
      p.id,
      p.time,
      p.source,
      p.destination,
      p.round,
      p.protocol,
      p.outcome,
      p.hopCount,
      p.cost,
      p.ttlRemaining,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`packet_tracer_log_${Date.now()}.csv`, csv);
  };

  // Statistics Calculation (Section 4.6)
  const totalSent = packetLog.length;
  const deliveredCount = packetLog.filter(p => p.outcome === 'DELIVERED').length;
  const deliveryRatio = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 0;
  const ttlDropCount = packetLog.filter(p => p.outcome.includes('TTL')).length;
  const noRouteDropCount = packetLog.filter(p => p.outcome === 'DROPPED_NO_ROUTE').length;
  const linkDownDropCount = packetLog.filter(p => p.outcome === 'DROPPED_LINK_DOWN').length;
  const avgHops =
    totalSent > 0
      ? Math.round((packetLog.reduce((acc, p) => acc + p.hopCount, 0) / totalSent) * 10) / 10
      : 0;
  const avgCost =
    deliveredCount > 0
      ? Math.round(
          (packetLog.filter(p => p.outcome === 'DELIVERED').reduce((acc, p) => acc + p.cost, 0) / deliveredCount) * 10
        ) / 10
      : 0;

  const visibleHops =
    traceResult && isStepping && currentHopIndex >= 0
      ? traceResult.hops.slice(0, currentHopIndex + 1)
      : traceResult
      ? traceResult.hops
      : [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Interactive Packet Tracer &amp; Forwarding Engine
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'trace' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setActiveTab('trace')}
          >
            Trace Log
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'explain' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setActiveTab('explain')}
          >
            Hop Breakdown
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'traceroute' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setActiveTab('traceroute')}
          >
            Traceroute
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setActiveTab('stats')}
          >
            Stats ({totalSent})
          </button>
        </div>
      </div>

      <div className="card-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Validation Error Banner */}
        {validationError && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              border: '1px solid var(--color-danger-border)',
            }}
          >
            ⚠️ {validationError}
          </div>
        )}

        {/* 4.8 Scenario Presets Bar */}
        <div style={{ background: 'var(--color-bg-subtle)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
            🧪 Tracer Scenarios:
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '2px 6px', fontSize: '12px', flex: 1, minWidth: '220px' }}
            value={selectedScenarioId}
            onChange={e => handleSelectScenario(e.target.value)}
          >
            <option value="">-- Choose an Educational Scenario --</option>
            {TRACER_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4.1 Send Panel Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Source Router:</label>
            <select
              className="form-select"
              value={source}
              onChange={e => setSource(e.target.value)}
            >
              {nodes.map(n => (
                <option key={n} value={n}>
                  Router {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Destination Router:</label>
            <select
              className="form-select"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            >
              {nodes.map(n => (
                <option key={n} value={n}>
                  Router {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Initial TTL (1-64):</label>
            <input
              type="number"
              min="1"
              max="64"
              value={ttl}
              onChange={e => setTtl(Math.max(1, Math.min(64, Number(e.target.value))))}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Packet Size:</label>
            <select
              className="form-select"
              value={packetSize}
              onChange={e => setPacketSize(e.target.value)}
            >
              <option value="64B (Small)">64B (Small)</option>
              <option value="512B (Medium)">512B (Medium)</option>
              <option value="1500B (MTU)">1500B (MTU)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Protocol:</label>
            <select
              className="form-select"
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
            >
              <option value="ICMP Echo">ICMP Echo</option>
              <option value="UDP">UDP</option>
              <option value="TCP">TCP</option>
            </select>
          </div>
        </div>

        {/* Control Buttons (Section 4.1 & Section 4.7) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => handleExecuteTrace(false)}>
            🚀 Send Packet
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExecuteTrace(true)}>
            👟 Send Step by Step
          </button>
          <button
            className={`btn btn-sm ${isContinuous ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleToggleContinuous}
          >
            {isContinuous ? '⏹ Stop Continuous' : '🔁 Send Continuous (1/s)'}
          </button>
          <button
            className={`btn btn-sm ${sendDuringConvergence ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setSendDuringConvergence(prev => !prev)}
            title="Auto-send packet after every simulation round during convergence"
          >
            {sendDuringConvergence ? '⚡ Send During Convergence: ON' : '⚡ Send During Convergence'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStepRoundAndSend}
            title="Advance simulation 1 round and send trace packet"
          >
            ➕ Step Round &amp; Send
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleRunTraceroute}>
            🌐 Traceroute Mode
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleClearTrace}>
            ✕ Clear Trace
          </button>

          {isStepping && traceResult && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStepHop}
                disabled={currentHopIndex >= traceResult.hops.length - 1}
              >
                Forward Step Hop &rarr;
              </button>
            </div>
          )}
        </div>

        {/* 4.5 Path Comparison: Actual vs Optimal */}
        {traceResult && (
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Actual Path: </span>
                <span className="text-mono" style={{ fontWeight: 600 }}>
                  {traceResult.hops.map(h => h.router).join(' → ')}
                </span>
                <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)' }}>
                  (Actual Cost: {traceResult.totalCost})
                </span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>Optimal Path at Convergence: </span>
                <span className="text-mono">
                  {optimalPathNodes ? optimalPathNodes.join(' → ') : 'Unreachable'}
                </span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--color-success-text)' }}>
                  (Optimal Cost: {optimalCost >= 16 ? '∞' : optimalCost})
                </span>
              </div>
            </div>

            {/* Comparison Cost Discrepancy & Status Label */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px dashed var(--color-border-light)', paddingTop: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Comparison: <strong>Actual cost {traceResult.totalCost}, optimal cost {optimalCost >= 16 ? '∞' : optimalCost}</strong>.
              </span>
              {optimalPathNodes &&
                (traceResult.hops.map(h => h.router).join('->') !== optimalPathNodes.join('->') ||
                  traceResult.totalCost !== optimalCost) && (
                  <span
                    className="badge badge-warning"
                    style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 700 }}
                  >
                    Tables not converged yet
                  </span>
                )}
            </div>
          </div>
        )}


        {/* TAB 1: Trace Log Table (Section 4.3) */}
        {activeTab === 'trace' && traceResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                background:
                  traceResult.outcome === 'DELIVERED'
                    ? 'var(--color-success-bg)'
                    : traceResult.loopDetected
                    ? 'var(--color-poison-bg)'
                    : 'var(--color-danger-bg)',
                color:
                  traceResult.outcome === 'DELIVERED'
                    ? 'var(--color-success-text)'
                    : traceResult.loopDetected
                    ? 'var(--color-poison-text)'
                    : 'var(--color-danger-text)',
                border: `1px solid ${
                  traceResult.outcome === 'DELIVERED'
                    ? 'var(--color-success-border)'
                    : traceResult.loopDetected
                    ? 'var(--color-poison-border)'
                    : 'var(--color-danger-border)'
                }`,
              }}
            >
              {traceResult.summaryMessage}
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
              <table className="network-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th>Hop #</th>
                    <th>Router</th>
                    <th>Table Entry Used</th>
                    <th>Outgoing Link</th>
                    <th>Link Cost</th>
                    <th>TTL Left</th>
                    <th>Cumul. Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHops.map((h, idx) => {
                    const isLoopRow = h.isLoop;
                    const isDropRow =
                      h.status.startsWith('DROPPED') || h.status === 'DROPPED_LINK_DOWN';
                    const isDeliveredRow = h.status === 'DELIVERED';

                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isLoopRow
                            ? 'var(--color-poison-bg)'
                            : isDropRow
                            ? 'var(--color-danger-bg)'
                            : isDeliveredRow
                            ? 'var(--color-success-bg)'
                            : 'transparent',
                          color: isLoopRow
                            ? 'var(--color-poison-text)'
                            : isDropRow
                            ? 'var(--color-danger-text)'
                            : isDeliveredRow
                            ? 'var(--color-success-text)'
                            : 'inherit',
                          fontWeight: isLoopRow || isDropRow || isDeliveredRow ? 600 : 400,
                        }}
                      >
                        <td>{h.step}</td>
                        <td style={{ fontWeight: 700 }}>Router {h.router}</td>
                        <td>
                          {h.tableEntry.nextHop
                            ? `To ${h.tableEntry.destination}: cost ${h.tableEntry.cost} via ${h.tableEntry.nextHop}`
                            : 'No route (∞)'}
                        </td>
                        <td>{h.outgoingLink}</td>
                        <td>{h.linkCost}</td>
                        <td style={{ fontWeight: 700 }}>{h.ttlRemaining}</td>
                        <td>{h.cumulativeCost}</td>
                        <td>
                          <span
                            className={`badge ${
                              isDeliveredRow
                                ? 'badge-success'
                                : isLoopRow
                                ? 'badge-warning'
                                : isDropRow
                                ? 'badge-danger'
                                : 'badge-info'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Explain Panel (Section 4.10) */}
        {activeTab === 'explain' && traceResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Step-by-Step Educational Explanation:
            </div>
            {visibleHops.map((h, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  background: '#f8fafc',
                  borderLeft: `4px solid ${
                    h.status === 'DELIVERED'
                      ? '#10b981'
                      : h.isLoop
                      ? '#f59e0b'
                      : h.status.startsWith('DROPPED')
                      ? '#ef4444'
                      : '#2563eb'
                  }`,
                  fontSize: '12px',
                  lineHeight: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  <strong>Hop {h.step} (Router {h.router}):</strong> {h.explanation}
                </div>
                {h.suggestion && (
                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                    💡 <strong>What to try:</strong> {h.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}


        {/* TAB 3: Traceroute Mode (Section 4.9) */}
        {activeTab === 'traceroute' && tracerouteResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              Traceroute Diagnostic Output ({source} &rarr; {destination}):
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '220px' }}>
              <table className="network-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th>TTL Probe #</th>
                    <th>Responding Router</th>
                    <th>Cumulative Metric</th>
                    <th>ICMP Response Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tracerouteResult.probes.map((p, idx) => (
                    <tr key={idx} style={{ background: p.reached ? 'var(--color-success-bg)' : 'transparent' }}>
                      <td style={{ fontWeight: 700 }}>TTL={p.ttl}</td>
                      <td style={{ fontWeight: 700 }}>Router {p.respondingRouter}</td>
                      <td>{p.costSoFar}</td>
                      <td>
                        <span className={`badge ${p.reached ? 'badge-success' : 'badge-info'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Statistics & Packet Log (Section 4.6) */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Stats Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              <div style={{ background: 'var(--color-bg-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Packets Sent</div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{totalSent}</div>
              </div>
              <div style={{ background: 'var(--color-success-bg)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-success-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-success-text)', fontWeight: 600 }}>Delivery Ratio</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-success-text)' }}>{deliveryRatio}%</div>
              </div>
              <div style={{ background: 'var(--color-danger-bg)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-danger-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-danger-text)', fontWeight: 600 }}>TTL Drops / Loops</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-danger-text)' }}>{ttlDropCount}</div>
              </div>
              <div style={{ background: 'var(--color-bg-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Avg Hops</div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{avgHops}</div>
              </div>
              <div style={{ background: 'var(--color-bg-subtle)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Avg Cost</div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{avgCost}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Sent Packets Log:</span>
              <button className="btn btn-secondary btn-sm" onClick={handleExportLogCsv} disabled={packetLog.length === 0}>
                📥 Export Log to CSV
              </button>
            </div>

            {/* Packet Log Table */}
            <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
              <table className="network-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Route</th>
                    <th>Protocol</th>
                    <th>Round</th>
                    <th>Outcome</th>
                    <th>Hops</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {packetLog.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{p.id}</td>
                      <td>{p.time}</td>
                      <td>{p.source} &rarr; {p.destination}</td>
                      <td>{p.protocol}</td>
                      <td>{p.round}</td>
                      <td>
                        <span className={`badge ${p.outcome === 'DELIVERED' ? 'badge-success' : 'badge-danger'}`}>
                          {p.outcome}
                        </span>
                      </td>
                      <td>{p.hopCount}</td>
                      <td>{p.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
