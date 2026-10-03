import React, { useState } from 'react';
import { PRESET_TOPOLOGIES } from '../engine/presets.js';
import { runUntilConverged, buildCostMatrix } from '../engine/distanceVector.js';
import { runDijkstra } from '../engine/linkState.js';
import { failLink, restoreLink } from '../engine/topology.js';

export default function ComparePage() {
  const [selectedPreset, setSelectedPreset] = useState('fiveRouter');
  const [topology, setTopology] = useState(PRESET_TOPOLOGIES.fiveRouter.topology);
  const [failedLinkId, setFailedLinkId] = useState(null);

  // Switch preset
  const handleSelectPreset = key => {
    setSelectedPreset(key);
    setTopology(PRESET_TOPOLOGIES[key].topology);
    setFailedLinkId(null);
  };

  // Toggle link failure
  const handleToggleLinkFail = (u, v) => {
    const linkKey = `${u}-${v}`;
    if (failedLinkId === linkKey) {
      const restored = restoreLink(topology, u, v);
      setTopology(restored);
      setFailedLinkId(null);
    } else {
      const failed = failLink(topology, u, v);
      setTopology(failed);
      setFailedLinkId(linkKey);
    }
  };

  // 1. Run Distance Vector simulation
  const dvResult = runUntilConverged(topology);
  const dvMatrix = buildCostMatrix(dvResult.finalTables);

  // Estimate total messages exchanged in DV:
  // In each round, every router sends a vector to each active neighbor
  const numNodes = topology.nodes.length;
  const activeLinks = (topology.links || []).filter(l => l.up !== false && l.status !== 'down');
  const dvMessagesTotal = dvResult.roundsTaken * (activeLinks.length * 2);

  // 2. Run Link-State simulation (Dijkstra)
  const lsResult = runDijkstra(topology);
  const lsMatrix = buildCostMatrix(lsResult.tables);

  const nodes = topology.nodes.map(n => (typeof n === 'string' ? n : n.id));

  // Check if both produce identical optimal shortest path metrics
  let resultsMatch = true;
  for (const src of nodes) {
    for (const dst of nodes) {
      if (dvMatrix[src]?.[dst] !== lsMatrix[src]?.[dst]) {
        resultsMatch = false;
        break;
      }
    }
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px 64px 16px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '6px' }}>
          Protocol Race: Distance Vector vs. Link State
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Side-by-side comparison of Bellman-Ford (RIP) and Dijkstra (OSPF) on the exact same topology.
        </p>
      </div>

      {/* Topology Selector & Link Cut Trigger */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Select Topology:</label>
            <select
              className="form-select"
              value={selectedPreset}
              onChange={e => handleSelectPreset(e.target.value)}
            >
              <option value="triangle">3-Router Triangle</option>
              <option value="fiveRouter">5-Router Enterprise Network</option>
              <option value="sixMesh">6-Router Campus Mesh</option>
              <option value="linearChain">Linear Chain</option>
            </select>
          </div>

          {/* Dynamic Link Failure Simulator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Simulate Link Cut:</span>
            {topology.links.slice(0, 3).map(link => {
              const u = link.a || link.source;
              const v = link.b || link.target;
              const linkKey = `${u}-${v}`;
              const isCut = failedLinkId === linkKey || link.up === false;

              return (
                <button
                  key={linkKey}
                  className={`btn btn-sm ${isCut ? 'btn-primary' : 'btn-danger'}`}
                  onClick={() => handleToggleLinkFail(u, v)}
                >
                  {isCut ? `✓ Restore ${u}-${v}` : `⚡ Cut Link ${u}-${v}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* High-Level Comparison Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* DV Metrics Card */}
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div className="card-header">
            <h3 className="card-title">Distance Vector (Bellman-Ford)</h3>
            <span className="badge badge-info">RFC 1058 / RIP</span>
          </div>
          <div className="card-body" style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Convergence Rounds:</span>
              <strong className="text-mono font-semibold">{dvResult.roundsTaken} rounds</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Messages:</span>
              <strong className="text-mono font-semibold">{dvMessagesTotal} vector broadcasts</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Knowledge Scope:</span>
              <span>Neighbor advice only</span>
            </div>
          </div>
        </div>

        {/* Link State Metrics Card */}
        <div className="card" style={{ borderTop: '4px solid var(--color-accent-blue)' }}>
          <div className="card-header">
            <h3 className="card-title">Link State (Dijkstra SPF)</h3>
            <span className="badge badge-info">RFC 2328 / OSPF</span>
          </div>
          <div className="card-body" style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Computation Steps:</span>
              <strong className="text-mono font-semibold">1 step (Local SPF)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Messages:</span>
              <strong className="text-mono font-semibold">{lsResult.lsaMessageCount} LSA flooded</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Knowledge Scope:</span>
              <span>Full network map (LSDB)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Final Cost Matrices */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-title">
            <span>Result Verification: Shortest Path Matrices</span>
            {resultsMatch ? (
              <span className="badge badge-success" style={{ marginLeft: '10px' }}>
                ✓ Path Metrics Identical
              </span>
            ) : (
              <span className="badge badge-danger" style={{ marginLeft: '10px' }}>
                ⚠ Metrics In Transition
              </span>
            )}
          </div>
        </div>

        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* DV Table */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
              Distance Vector Routing Matrix
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="network-table" style={{ textAlign: 'center', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Src \ Dst</th>
                    {nodes.map(dst => (
                      <th key={dst}>{dst}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(src => (
                    <tr key={src}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{src}</td>
                      {nodes.map(dst => {
                        const cost = dvMatrix[src]?.[dst];
                        return <td key={dst}>{cost >= 16 ? '∞' : cost}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Link State Table */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent-blue)', marginBottom: '6px' }}>
              Link State (Dijkstra) Matrix
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="network-table" style={{ textAlign: 'center', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Src \ Dst</th>
                    {nodes.map(dst => (
                      <th key={dst}>{dst}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(src => (
                    <tr key={src}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{src}</td>
                      {nodes.map(dst => {
                        const cost = lsMatrix[src]?.[dst];
                        return <td key={dst}>{cost >= 16 ? '∞' : cost}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Analysis */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Why do message counts and convergence differ?</h3>
        </div>
        <div className="card-body" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p>
            <strong>Distance Vector (RIP):</strong> Uses localized periodic exchanges where routers broadcast distance vectors only to their directly connected neighbors. Information propagates hop-by-hop round by round, resulting in lower initial message size but slower convergence and vulnerability to Count-to-Infinity loops.
          </p>
          <p>
            <strong>Link State (OSPF):</strong> Floods Link-State Advertisements (LSAs) across every link in the network, giving every router a complete, identical map of the entire topology (LSDB). Each router then independently runs Dijkstra&apos;s algorithm locally, achieving instant loop-free shortest path convergence at the expense of higher flooding message overhead.
          </p>
        </div>
      </div>
    </div>
  );
}
