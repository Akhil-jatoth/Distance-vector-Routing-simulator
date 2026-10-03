import React from 'react';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 48px 16px' }}>
      <div style={{ marginBottom: '24px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '6px' }}>
          About the Distance Vector Routing Simulator
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Academic specifications, architectural design, RFC references, and software documentation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Project Background */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Project Background &amp; Objectives</h2>
          </div>
          <div className="card-body" style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text-main)' }}>
            <p style={{ marginBottom: '8px' }}>
              The Distance Vector Routing Simulator is designed as an interactive computer networking laboratory application.
              It models how distributed routers cooperatively discover shortest paths across dynamic network topologies using the
              Bellman-Ford equation:
            </p>
            <div className="text-mono" style={{ background: '#f8fafc', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px' }}>
              D_x(y) = min_v &#123; c(x, v) + D_v(y) &#125;
            </div>
            <p>
              The engine operates in discrete, synchronous rounds. In every round, routers exchange vectors with their direct neighbors,
              recompute minimum cost estimates, detect path changes, and evaluate convergence or loop conditions.
            </p>
          </div>
        </section>

        {/* Architecture & Engineering Design */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Software Architecture &amp; Pure Engine Design</h2>
          </div>
          <div className="card-body" style={{ fontSize: '13px', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '12px' }}>
              The simulator strictly separates simulation logic from UI presentation:
            </p>
            <ul style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong><code>src/engine/distanceVector.js</code>:</strong> Pure JavaScript module implementing vector initialization,
                synchronous round computation, candidate evaluation, split horizon / poison reverse modifications, and shortest path tracing.
              </li>
              <li>
                <strong><code>src/engine/topology.js</code>:</strong> Graph data structure utilities, dynamic link failure toggling, cost updates,
                and strict JSON validation.
              </li>
              <li>
                <strong><code>src/engine/presets.js</code>:</strong> Standardized benchmark topologies (3-node triangle, 5-node enterprise mesh, 6-node campus, linear chain).
              </li>
              <li>
                <strong><code>src/components/NetworkGraph.jsx</code>:</strong> Scalable vector graphics (SVG) canvas with custom drag physics,
                link badges, and real-time shortest path glowing overlays.
              </li>
            </ul>
          </div>
        </section>

        {/* RFC Compliance */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Networking Standards &amp; RFC Compliance</h2>
          </div>
          <div className="card-body" style={{ fontSize: '13px', lineHeight: 1.6 }}>
            <ul style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>RFC 1058 (Routing Information Protocol - RIPv1):</strong> Defines the standard hop-count metric, 16 as unreachable infinity, and vector exchange mechanisms.
              </li>
              <li>
                <strong>RFC 2453 (RIP Version 2):</strong> Defines Split Horizon and Poison Reverse loop prevention techniques and trigger updates.
              </li>
            </ul>
          </div>
        </section>

        {/* Quick User Guide */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Quick User Guide</h2>
          </div>
          <div className="card-body" style={{ fontSize: '13px', lineHeight: 1.6 }}>
            <ol style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Selecting Presets:</strong> Choose from the topology dropdown (e.g. <em>3-Router Triangle</em>, <em>5-Router Enterprise</em>, or <em>Linear Chain</em>).
              </li>
              <li>
                <strong>Running the Simulation:</strong> Click <em>Next Round</em> to step forward round-by-round, or click <em>▶ Run Auto</em> to watch continuous convergence.
              </li>
              <li>
                <strong>Inspecting Bellman-Ford Details:</strong> Click on any row in the Routing Table on the right to expand the full candidate evaluation breakdown showing why a neighbor was selected.
              </li>
              <li>
                <strong>Dynamic Link Events:</strong> Click on any link badge on the canvas to change its cost or simulate a link cut (&ldquo;Fail Link&rdquo;). Watch the routers detect the event and reroute.
              </li>
              <li>
                <strong>Count-to-Infinity &amp; Poison Reverse:</strong> Select the <em>Linear Chain</em> preset, fail the B-C link, and observe how Split Horizon / Poison Reverse prevents count-to-infinity routing loops.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
