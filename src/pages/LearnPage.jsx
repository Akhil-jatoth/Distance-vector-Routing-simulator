import React from 'react';

export default function LearnPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 48px 16px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '6px' }}>
          Distance Vector Routing Protocol &amp; Bellman-Ford Principle
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Comprehensive theoretical guide, algorithm equations, protocol comparisons (RIP vs. OSPF), and 5-router step-by-step walkthrough.
        </p>
      </div>

      {/* Section 1: Overview */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">1. Algorithm Fundamentals &amp; The Bellman-Ford Equation</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', lineHeight: 1.6 }}>
          <p>
            In a distributed computer network, routers do not possess global knowledge of the entire network topology.
            Instead, in <strong>Distance Vector (DV) Routing</strong> (such as the Routing Information Protocol, <em>RIP</em>),
            each router maintains a table storing the lowest known cost to every destination and the <strong>next hop</strong> router along that path.
          </p>
          <p>
            Periodically, each router broadcasts its current <strong>Distance Vector</strong> (the list of minimum costs to all known destinations)
            to its directly connected neighbors. Upon receiving vectors from neighbors, a router updates its routing table using the
            <strong>Bellman-Ford equation</strong>:
          </p>

          <div style={{ background: 'var(--color-bg-muted)', borderLeft: '4px solid var(--color-accent-blue)', padding: '12px 16px', borderRadius: '4px', margin: '6px 0' }}>
            <div className="text-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
              D<sub>x</sub>(y) = min<sub>v &isin; N(x)</sub> &#123; c(x, v) + D<sub>v</sub>(y) &#125;
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Where:
              <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                <li><strong>D<sub>x</sub>(y)</strong> is the estimated minimum cost from router <em>x</em> to destination <em>y</em>.</li>
                <li><strong>N(x)</strong> is the set of directly connected active neighbors of router <em>x</em>.</li>
                <li><strong>c(x, v)</strong> is the direct link cost between router <em>x</em> and neighbor <em>v</em>.</li>
                <li><strong>D<sub>v</sub>(y)</strong> is the cost to reach destination <em>y</em> reported by neighbor <em>v</em> in its vector.</li>
              </ul>
            </div>
          </div>
          <p>
            When no router in the network makes any further modifications to its table after a round of vector exchanges, the network has reached <strong>convergence</strong>.
          </p>
        </div>
      </section>

      {/* Section 2: DV vs Link State Comparison */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">2. Protocol Comparison: Distance Vector vs. Link State</h2>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            It is critical to distinguish Distance Vector routing from Link-State routing (such as OSPF / IS-IS):
          </p>

          <table className="network-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Feature</th>
                <th style={{ width: '39%' }}>Distance Vector (e.g. RIP)</th>
                <th style={{ width: '39%' }}>Link State (e.g. OSPF)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Core Principle</td>
                <td>Bellman-Ford equation (distributed minimization)</td>
                <td>Dijkstra&apos;s Shortest Path First algorithm</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Information Shared</td>
                <td>Routing vector (costs to destinations) sent only to direct neighbors</td>
                <td>Link-state advertisements (LSA / LSP) flooded to entire autonomous system</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Topology Knowledge</td>
                <td>&ldquo;Routing by rumor&rdquo; &mdash; knows only neighbor advice &amp; next hop</td>
                <td>Complete global map of entire network topology built in Link-State Database (LSDB)</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Convergence Speed</td>
                <td>Slower; information propagates hop-by-hop round by round</td>
                <td>Fast; LSAs flooded immediately, SPF computed locally</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Routing Loops</td>
                <td>Prone to temporary routing loops and Count-to-Infinity</td>
                <td>Loop-free in steady state due to complete SPF tree knowledge</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Resource Overhead</td>
                <td>Low memory &amp; low CPU requirements</td>
                <td>Higher memory (LSDB storage) and higher CPU for Dijkstra calculation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Count to Infinity & Split Horizon / Poison Reverse */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">3. Count-to-Infinity &amp; Loop Prevention Mechanisms</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', lineHeight: 1.6 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)' }}>
            The Count-to-Infinity Problem
          </h3>
          <p>
            Consider a linear topology: <code>A &mdash; (1) &mdash; B &mdash; (1) &mdash; C</code>.
            Initially, router B reaches C directly with cost 1, and router A reaches C via B with cost 2.
          </p>
          <p>
            If the link between B and C fails:
          </p>
          <ol style={{ marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <li>Router B loses its direct path to C. However, Router A was previously advertising a route to C with cost 2.</li>
            <li>Router B erroneously calculates: <code>D_B(C) = c(B,A) + D_A(C) = 1 + 2 = 3</code> via A.</li>
            <li>In the next round, B advertises cost 3 to A. Router A then updates: <code>D_A(C) = c(A,B) + D_B(C) = 1 + 3 = 4</code> via B.</li>
            <li>This cycle continues endlessly with costs incrementing (2, 3, 4, 5...) as packets ping-pong between A and B in a <strong>routing loop</strong>.</li>
          </ol>

          <div style={{ background: 'var(--color-bg-muted)', padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border-light)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
              Solutions:
            </h4>
            <ul style={{ marginLeft: '20px', fontSize: '13px' }}>
              <li>
                <strong>Infinity Metric Limit (&infin; = 16):</strong> RIP defines 16 as unreachable infinity, ensuring the loop eventually terminates when cost reaches 16.
              </li>
              <li>
                <strong>Split Horizon:</strong> A router does not advertise routes back out of the same interface / neighbor from which it learned them.
              </li>
              <li>
                <strong>Poison Reverse:</strong> When router A routes to C through B, A explicitly advertises <code>D_A(C) = &infin; (16)</code> back to B. This immediately tells B that it cannot use A to reach C.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: 5-Router Preset Step-by-Step Sample Walkthrough */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">4. Step-by-Step Walkthrough: 5-Router Enterprise Network Preset</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
          <p>
            Below is the full verification trace for the <strong>5-Router Enterprise Network</strong> preset
            (Nodes: A, B, C, D, E. Links: A-B:1, A-C:4, B-C:2, B-D:6, C-E:3, D-E:2).
          </p>

          {/* Round 0 */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
              Round 0 (Initial State): Direct Links Only, Others &infin;
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="network-table" style={{ textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Router</th>
                    <th>To A</th>
                    <th>To B</th>
                    <th>To C</th>
                    <th>To D</th>
                    <th>To E</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>A</td>
                    <td>0 (A)</td>
                    <td>1 (B)</td>
                    <td>4 (C)</td>
                    <td className="cost-infinity">&infin;</td>
                    <td className="cost-infinity">&infin;</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>B</td>
                    <td>1 (A)</td>
                    <td>0 (B)</td>
                    <td>2 (C)</td>
                    <td>6 (D)</td>
                    <td className="cost-infinity">&infin;</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>C</td>
                    <td>4 (A)</td>
                    <td>2 (B)</td>
                    <td>0 (C)</td>
                    <td className="cost-infinity">&infin;</td>
                    <td>3 (E)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>D</td>
                    <td className="cost-infinity">&infin;</td>
                    <td>6 (B)</td>
                    <td className="cost-infinity">&infin;</td>
                    <td>0 (D)</td>
                    <td>2 (E)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>E</td>
                    <td className="cost-infinity">&infin;</td>
                    <td className="cost-infinity">&infin;</td>
                    <td>3 (C)</td>
                    <td>2 (D)</td>
                    <td>0 (E)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Round 1 */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
              Round 1: First Neighbor Vector Exchange
            </h4>
            <ul style={{ marginLeft: '20px', marginBottom: '8px', lineHeight: 1.5 }}>
              <li><strong>Router A &rarr; C:</strong> A receives vector from B with D_B(C)=2. A updates: <code>c(A,B) + D_B(C) = 1 + 2 = 3 &lt; 4</code> (next hop becomes B).</li>
              <li><strong>Router A &rarr; D:</strong> A receives D_B(D)=6. A updates: <code>c(A,B) + D_B(D) = 1 + 6 = 7</code> via B.</li>
              <li><strong>Router B &rarr; E:</strong> B learns route to E via C: <code>c(B,C) + D_C(E) = 2 + 3 = 5</code> via C. Also learns route via D: <code>6 + 2 = 8</code>. Chooses min (5 via C).</li>
              <li><strong>Router D &rarr; C:</strong> D learns route to C via E: <code>c(D,E) + D_E(C) = 2 + 3 = 5</code> via E.</li>
            </ul>
          </div>

          {/* Converged State */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-success-text)', marginBottom: '6px' }}>
              Final Converged State (Stable Shortest Paths)
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="network-table" style={{ textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Router</th>
                    <th>To A</th>
                    <th>To B</th>
                    <th>To C</th>
                    <th>To D</th>
                    <th>To E</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>A</td>
                    <td>0 (A)</td>
                    <td>1 (B)</td>
                    <td>3 (B)</td>
                    <td>7 (B)</td>
                    <td>6 (B)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>B</td>
                    <td>1 (A)</td>
                    <td>0 (B)</td>
                    <td>2 (C)</td>
                    <td>6 (D)</td>
                    <td>5 (C)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>C</td>
                    <td>3 (B)</td>
                    <td>2 (B)</td>
                    <td>0 (C)</td>
                    <td>5 (E)</td>
                    <td>3 (E)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>D</td>
                    <td>7 (B)</td>
                    <td>6 (B)</td>
                    <td>5 (E)</td>
                    <td>0 (D)</td>
                    <td>2 (E)</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>E</td>
                    <td>6 (C)</td>
                    <td>5 (C)</td>
                    <td>3 (C)</td>
                    <td>2 (D)</td>
                    <td>0 (E)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
              * Format: <code>Cost (Next Hop)</code>. For example, <code>6 (B)</code> on Router A to E indicates a total shortest path of A &rarr; B &rarr; C &rarr; E with cost 1 + 2 + 3 = 6.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
