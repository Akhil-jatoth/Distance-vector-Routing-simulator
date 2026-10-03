import { describe, it, expect } from 'vitest';
import {
  INFINITY,
  initTables,
  runRound,
  hasConverged,
  runUntilConverged,
  getPath,
  buildCostMatrix,
} from './distanceVector.js';
import {
  validateTopology,
  addNode,
  removeNode,
  addLink,
  removeLink,
  setLinkCost,
  failLink,
  restoreLink,
} from './topology.js';
import { runDijkstra } from './linkState.js';
import { tracePacket, runTraceroute } from './packetTracer.js';
import { encodeScenarioToUrl, decodeScenarioFromUrl } from '../utils/urlState.js';
import { generateRandomTopology } from '../utils/randomTopology.js';

describe('Distance Vector Engine - Triangle Network', () => {
  const triangleTopology = {
    nodes: ['A', 'B', 'C'],
    links: [
      { a: 'A', b: 'B', cost: 1, up: true },
      { a: 'B', b: 'C', cost: 2, up: true },
      { a: 'A', b: 'C', cost: 5, up: true },
    ],
  };

  it('initializes tables with direct link costs and null nextHop for self', () => {
    const tables = initTables(triangleTopology);

    expect(tables.A.A).toEqual({ cost: 0, nextHop: null });
    expect(tables.A.B).toEqual({ cost: 1, nextHop: 'B' });
    expect(tables.A.C).toEqual({ cost: 5, nextHop: 'C' });

    expect(tables.B.A).toEqual({ cost: 1, nextHop: 'A' });
    expect(tables.B.B).toEqual({ cost: 0, nextHop: null });
    expect(tables.B.C).toEqual({ cost: 2, nextHop: 'C' });

    expect(tables.C.A).toEqual({ cost: 5, nextHop: 'A' });
    expect(tables.C.B).toEqual({ cost: 2, nextHop: 'B' });
    expect(tables.C.C).toEqual({ cost: 0, nextHop: null });
  });

  it('updates route to C in round 1, and converges in round 2', () => {
    const round0Tables = initTables(triangleTopology);

    const round1 = runRound(round0Tables, triangleTopology);
    expect(hasConverged(round1.changes)).toBe(false);

    expect(round1.newTables.A.C).toEqual({ cost: 3, nextHop: 'B' });
    expect(round1.newTables.C.A).toEqual({ cost: 3, nextHop: 'B' });

    const round2 = runRound(round1.newTables, triangleTopology);
    expect(hasConverged(round2.changes)).toBe(true);
    expect(round2.changes).toHaveLength(0);

    const simulation = runUntilConverged(triangleTopology);
    expect(simulation.converged).toBe(true);
    expect(simulation.roundsTaken).toBe(2);
  });
});

describe('Distance Vector Engine - 5-Router Enterprise Network', () => {
  const fiveRouterTopology = {
    nodes: ['A', 'B', 'C', 'D', 'E'],
    links: [
      { a: 'A', b: 'B', cost: 1, up: true },
      { a: 'A', b: 'C', cost: 4, up: true },
      { a: 'B', b: 'C', cost: 2, up: true },
      { a: 'B', b: 'D', cost: 6, up: true },
      { a: 'C', b: 'E', cost: 3, up: true },
      { a: 'D', b: 'E', cost: 2, up: true },
    ],
  };

  it('converges to exact hand-calculated costs and next hops', () => {
    const { converged, finalTables } = runUntilConverged(fiveRouterTopology);
    expect(converged).toBe(true);

    const costMatrix = buildCostMatrix(finalTables);

    expect(costMatrix).toEqual({
      A: { A: 0, B: 1, C: 3, D: 7, E: 6 },
      B: { A: 1, B: 0, C: 2, D: 6, E: 5 },
      C: { A: 3, B: 2, C: 0, D: 5, E: 3 },
      D: { A: 7, B: 6, C: 5, D: 0, E: 2 },
      E: { A: 6, B: 5, C: 3, D: 2, E: 0 },
    });

    expect(finalTables.A.E).toEqual({ cost: 6, nextHop: 'B' });
    expect(getPath(finalTables, 'A', 'E')).toEqual(['A', 'B', 'C', 'E']);
  });
});

describe('Packet Tracer with TTL and Loop Detection', () => {
  const triangleTopology = {
    nodes: ['A', 'B', 'C'],
    links: [
      { a: 'A', b: 'B', cost: 1, up: true },
      { a: 'B', b: 'C', cost: 2, up: true },
    ],
  };

  it('delivers packet hop-by-hop when route exists', () => {
    const { finalTables } = runUntilConverged(triangleTopology);
    const trace = tracePacket(finalTables, triangleTopology, 'A', 'C', 16);

    expect(trace.outcome).toBe('DELIVERED');
    expect(trace.hops.map(h => h.router)).toEqual(['A', 'B', 'C']);
    expect(trace.ttlRemaining).toBe(14);
  });

  it('detects routing loop and drops packet on TTL exhaustion', () => {
    // Artificial transient routing loop table: A -> B and B -> A
    const loopTables = {
      A: { C: { cost: 3, nextHop: 'B' } },
      B: { C: { cost: 4, nextHop: 'A' } },
    };

    const trace = tracePacket(loopTables, 'A', 'C', 6);
    expect(trace.loopDetected).toBe(true);
    expect(trace.outcome).toContain('DROPPED');
  });

  it('detects link down failure mid-path and drops packet', () => {
    const cutTopology = {
      nodes: ['A', 'B', 'C'],
      links: [
        { a: 'A', b: 'B', cost: 1, up: true },
        { a: 'B', b: 'C', cost: 2, up: false, status: 'down' },
      ],
    };
    const { finalTables } = runUntilConverged(triangleTopology);
    const trace = tracePacket(finalTables, cutTopology, 'A', 'C', 16);

    expect(trace.outcome).toBe('DROPPED_LINK_DOWN');
    expect(trace.delivered).toBe(false);
  });

  it('detects router down crash and drops packet', () => {
    const crashedTopology = {
      nodes: [
        { id: 'A', up: true },
        { id: 'B', up: false, status: 'down' },
        { id: 'C', up: true },
      ],
      links: [
        { a: 'A', b: 'B', cost: 1, up: true },
        { a: 'B', b: 'C', cost: 2, up: true },
      ],
    };
    const { finalTables } = runUntilConverged(triangleTopology);
    const trace = tracePacket(finalTables, crashedTopology, 'A', 'C', 16);

    expect(trace.outcome).toBe('DROPPED_ROUTER_DOWN');
    expect(trace.delivered).toBe(false);
  });

  it('runs traceroute with incremental TTL probes', () => {
    const { finalTables } = runUntilConverged(triangleTopology);
    const tr = runTraceroute(finalTables, triangleTopology, 'A', 'C', 5);

    expect(tr.probes.length).toBeGreaterThanOrEqual(2);
    expect(tr.completed).toBe(true);
    expect(tr.probes[tr.probes.length - 1].reached).toBe(true);
  });
});


describe('Link State (Dijkstra) vs Distance Vector Match', () => {
  it('produces identical shortest path metrics as Distance Vector', () => {
    const topo = {
      nodes: ['A', 'B', 'C', 'D'],
      links: [
        { a: 'A', b: 'B', cost: 2, up: true },
        { a: 'B', b: 'C', cost: 3, up: true },
        { a: 'A', b: 'C', cost: 7, up: true },
        { a: 'C', b: 'D', cost: 1, up: true },
      ],
    };

    const dv = runUntilConverged(topo);
    const ls = runDijkstra(topo);

    const dvMatrix = buildCostMatrix(dv.finalTables);
    const lsMatrix = buildCostMatrix(ls.tables);

    expect(dvMatrix).toEqual(lsMatrix);
  });
});

describe('URL State Encoding & Random Topology Generator', () => {
  it('encodes and decodes scenarios losslessly', () => {
    const originalTopo = {
      nodes: ['R1', 'R2', 'R3'],
      links: [{ a: 'R1', b: 'R2', cost: 3, up: true }],
    };
    const options = { splitHorizon: true, poisonReverse: false };

    const encoded = encodeScenarioToUrl(originalTopo, options);
    expect(typeof encoded).toBe('string');

    const decoded = decodeScenarioFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded.topology.nodes.map(n => n.id)).toEqual(['R1', 'R2', 'R3']);
    expect(decoded.options.splitHorizon).toBe(true);
  });

  it('generates guaranteed connected random topologies of various sizes', () => {
    [5, 10, 20].forEach(size => {
      const topo = generateRandomTopology(size);
      const validation = validateTopology(topo);
      expect(validation.valid).toBe(true);
      expect(topo.nodes).toHaveLength(size);
    });
  });
});
