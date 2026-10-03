/**
 * Generates a guaranteed connected random topology with N nodes.
 * Used for experiment simulations and analytics benchmarking.
 *
 * @param {number} nodeCount Number of nodes (e.g. 5, 10, 20, 50)
 * @param {number} extraLinkRatio Additional random cross-links ratio (0..1)
 * @returns {Object} Valid topology object with nodes and links
 */
export function generateRandomTopology(nodeCount = 5, extraLinkRatio = 0.4) {
  const count = Math.max(3, Math.min(50, nodeCount));
  const nodes = [];

  // Generate nodes in an elliptical layout with jitter
  const centerX = 360;
  const centerY = 240;
  const radiusX = 260;
  const radiusY = 160;

  for (let i = 1; i <= count; i++) {
    const angle = (2 * Math.PI * (i - 1)) / count;
    const jitterX = (Math.random() - 0.5) * 30;
    const jitterY = (Math.random() - 0.5) * 30;
    const x = Math.round(centerX + radiusX * Math.cos(angle) + jitterX);
    const y = Math.round(centerY + radiusY * Math.sin(angle) + jitterY);

    nodes.push({
      id: `R${i}`,
      name: `Router R${i}`,
      x: Math.max(50, Math.min(670, x)),
      y: Math.max(50, Math.min(430, y)),
    });
  }

  const links = [];
  const linkSet = new Set();

  function addEdge(u, v) {
    const pair = [u, v].sort().join('-');
    if (!linkSet.has(pair)) {
      linkSet.add(pair);
      const cost = Math.floor(Math.random() * 8) + 1; // 1 to 8
      links.push({
        id: pair,
        a: u,
        b: v,
        source: u,
        target: v,
        cost,
        up: true,
        status: 'up',
      });
    }
  }

  // 1. Spanning Tree backbone to guarantee connectivity
  const connected = [nodes[0].id];
  const remaining = nodes.slice(1).map(n => n.id);

  while (remaining.length > 0) {
    const targetIdx = Math.floor(Math.random() * remaining.length);
    const target = remaining.splice(targetIdx, 1)[0];
    const source = connected[Math.floor(Math.random() * connected.length)];

    addEdge(source, target);
    connected.push(target);
  }

  // 2. Add extra random cross-links for realistic mesh connectivity
  const extraLinksCount = Math.floor(count * extraLinkRatio);
  for (let i = 0; i < extraLinksCount; i++) {
    const u = nodes[Math.floor(Math.random() * count)].id;
    const v = nodes[Math.floor(Math.random() * count)].id;
    if (u !== v) {
      addEdge(u, v);
    }
  }

  return { nodes, links };
}
