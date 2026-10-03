/**
 * Link-State Routing Engine (Dijkstra's Algorithm).
 * Used exclusively for the DV vs Link State Comparison Page.
 * This module is isolated and not imported by the Distance Vector engine.
 */

export function runDijkstra(topology) {
  const nodes = (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));
  const links = (topology.links || []).filter(l => l.up !== false && l.status !== 'down');

  // Build adjacency map: node -> list of { neighbor, cost }
  const adj = new Map();
  nodes.forEach(n => adj.set(n, []));

  links.forEach(l => {
    const u = l.a || l.source;
    const v = l.b || l.target;
    if (adj.has(u) && adj.has(v)) {
      adj.get(u).push({ node: v, cost: l.cost });
      adj.get(v).push({ node: u, cost: l.cost });
    }
  });

  const tables = {};
  let totalDijkstraOperations = 0;

  for (const src of nodes) {
    tables[src] = {};
    const dist = {};
    const prev = {};
    const visited = new Set();

    nodes.forEach(n => {
      dist[n] = Infinity;
      prev[n] = null;
    });
    dist[src] = 0;

    for (let i = 0; i < nodes.length; i++) {
      // Find unvisited node with smallest distance
      let u = null;
      let minDist = Infinity;
      for (const n of nodes) {
        if (!visited.has(n) && dist[n] < minDist) {
          minDist = dist[n];
          u = n;
        }
      }

      if (u === null || minDist === Infinity) break;
      visited.add(u);
      totalDijkstraOperations++;

      const neighbors = adj.get(u) || [];
      for (const edge of neighbors) {
        const v = edge.node;
        if (!visited.has(v)) {
          const alt = dist[u] + edge.cost;
          if (alt < dist[v]) {
            dist[v] = alt;
            prev[v] = u;
          }
        }
      }
    }

    // Determine next hop for each destination
    for (const dst of nodes) {
      if (dst === src) {
        tables[src][dst] = { cost: 0, nextHop: null };
      } else if (dist[dst] === Infinity) {
        tables[src][dst] = { cost: 16, nextHop: null };
      } else {
        // Trace back from dst to src to find the first hop
        let curr = dst;
        while (prev[curr] && prev[curr] !== src) {
          curr = prev[curr];
        }
        tables[src][dst] = {
          cost: dist[dst] >= 16 ? 16 : dist[dst],
          nextHop: prev[curr] === src ? curr : dst,
        };
      }
    }
  }

  // Link-State flooding metrics:
  // Each router generates an LSA flooded over every active edge
  // Total LSAs flooded ≈ numNodes * (2 * numActiveLinks)
  const lsaMessageCount = nodes.length * Math.max(1, links.length * 2);

  return {
    tables,
    lsaMessageCount,
    totalDijkstraOperations,
    converged: true,
  };
}
