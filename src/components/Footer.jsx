import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div>
          <strong>Distance Vector Routing Protocol Simulator</strong> &mdash; Pure Bellman-Ford Implementation (D<sub>x</sub>(y) = min<sub>v</sub> &#123; c(x,v) + D<sub>v</sub>(y) &#125;).
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Constant &infin; = 16 (RIP Standard)</span>
          <span>&bull;</span>
          <span>Computer Networks Project</span>
        </div>
      </div>
    </footer>
  );
}
