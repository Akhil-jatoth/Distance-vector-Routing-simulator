import React from 'react';

export default function HomePage({ setActiveTab }) {
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 16px 64px 16px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2b48 0%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: '40px 32px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '16px' }}>
          COMPUTER NETWORKS &bull; RFC 1058 / RFC 2453
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.2, marginBottom: '12px' }}>
          Distance Vector Routing Protocol Simulator
        </h1>
        <p style={{ fontSize: '15px', color: '#cbd5e1', maxWidth: '720px', lineHeight: 1.6, marginBottom: '24px' }}>
          An interactive laboratory tool to visualize distributed Bellman-Ford routing, synchronous vector exchanges, routing table evolution, dynamic link failures, and Count-to-Infinity loop prevention.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ background: '#2563eb', borderColor: '#3b82f6', padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}
            onClick={() => setActiveTab('simulator')}
          >
            🚀 Open Simulator Lab
          </button>
          <button
            className="btn btn-secondary"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', padding: '10px 20px', fontSize: '14px' }}
            onClick={() => setActiveTab('compare')}
          >
            ⚡ DV vs Link State Race
          </button>
          <button
            className="btn btn-secondary"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', padding: '10px 20px', fontSize: '14px' }}
            onClick={() => setActiveTab('quiz')}
          >
            🧠 Quiz Challenge Mode
          </button>
        </div>
      </div>

      {/* Feature Modules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Card 1: Interactive Canvas */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎨 Interactive Topology Canvas</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Start from a blank canvas or choose standard presets. Drag routers, connect endpoints, modify link metrics, and simulate live link failures with instant rerouting.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('simulator')}
            >
              Build Topology &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Kurose & Ross & Calculations */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📐 Bellman-Ford Inspector</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Examine step-by-step neighbor candidate evaluations: <code>D_x(y) = min &#123; c(x,v) + D_v(y) &#125;</code>, and view the textbook Kurose-Ross distance matrix.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('learn')}
            >
              Learn Algorithm &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Packet Tracer */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Packet Tracer with TTL</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Send packets across the live network with custom TTL metrics. Observe hop-by-hop forwarding, loop detection, and packet drop reasons during convergence.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('simulator')}
            >
              Test Packet Tracer &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: DV vs Link State Race */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏎 DV vs Link State Race</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Compare Distance Vector (RIP) side-by-side with Link State (Dijkstra/OSPF) on the exact same topology. Compare message complexity and convergence speed.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('compare')}
            >
              Start Race &rarr;
            </button>
          </div>
        </div>

        {/* Card 5: Analytics & Experiments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Analytics &amp; Experiments</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Run automated benchmarks across random 5, 10, 20, and 50-router networks. Compare convergence rounds with and without Split Horizon, and export CSV/PDF reports.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('analytics')}
            >
              View Analytics &rarr;
            </button>
          </div>
        </div>

        {/* Card 6: Quiz Challenge */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏆 Quiz &amp; Challenge Mode</h3>
          </div>
          <div className="card-body" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              Test your networking knowledge with engine-verified questions. Calculate costs, identify next hops, predict convergence rounds, and view explanations.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => setActiveTab('quiz')}
            >
              Take Quiz &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
