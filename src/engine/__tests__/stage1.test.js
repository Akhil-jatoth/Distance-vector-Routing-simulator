import { describe, it, expect } from 'vitest';
import { createRandom } from '../random.js';
import {
  validateTopology,
  addLink,
  setLinkLoss,
  setLinkDelay,
  setLinkCost,
  importTopologyJSON,
  exportTopologyJSON,
} from '../topology.js';
import { forwardPacket } from '../packetForwarding.js';
import { encodeScenarioToUrl, decodeScenarioFromUrl } from '../../utils/urlState.js';

describe('Stage 1 - Random Seed Generator (random.js)', () => {
  it('returns identical sequences for the same numeric seed', () => {
    const rng1 = createRandom(42);
    const rng2 = createRandom(42);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
    seq1.forEach(n => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    });
  });

  it('returns identical sequences for the same string seed', () => {
    const rng1 = createRandom('demo-seed');
    const rng2 = createRandom('demo-seed');

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = createRandom(101);
    const rng2 = createRandom(202);

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });
});

describe('Stage 1 - Topology Data Model Extensions (topology.js)', () => {
  const baseTopology = {
    nodes: [
      { id: 'A', x: 100, y: 100 },
      { id: 'B', x: 300, y: 100 },
      { id: 'C', x: 200, y: 250 },
    ],
    links: [
      { id: 'A-B', a: 'A', b: 'B', source: 'A', target: 'B', cost: 2, lossPercent: 0, delayMs: 5, up: true, status: 'up' },
      { id: 'B-C', a: 'B', b: 'C', source: 'B', target: 'C', cost: 3, lossPercent: 10, delayMs: 15, up: true, status: 'up' },
    ],
  };

  it('validates lossPercent between 0 and 100', () => {
    expect(validateTopology(baseTopology).valid).toBe(true);

    const invalidLoss = {
      ...baseTopology,
      links: [{ ...baseTopology.links[0], lossPercent: 150 }],
    };
    expect(validateTopology(invalidLoss).valid).toBe(false);

    const negativeLoss = {
      ...baseTopology,
      links: [{ ...baseTopology.links[0], lossPercent: -5 }],
    };
    expect(validateTopology(negativeLoss).valid).toBe(false);
  });

  it('validates delayMs is a positive integer', () => {
    const zeroDelay = {
      ...baseTopology,
      links: [{ ...baseTopology.links[0], delayMs: 0 }],
    };
    expect(validateTopology(zeroDelay).valid).toBe(false);

    const floatDelay = {
      ...baseTopology,
      links: [{ ...baseTopology.links[0], delayMs: 3.5 }],
    };
    expect(validateTopology(floatDelay).valid).toBe(false);
  });

  it('setLinkLoss validates and does not mutate the original topology', () => {
    const updated = setLinkLoss(baseTopology, 'A', 'B', 25);
    expect(updated).not.toBe(baseTopology);
    expect(baseTopology.links[0].lossPercent).toBe(0);
    expect(updated.links[0].lossPercent).toBe(25);

    expect(() => setLinkLoss(baseTopology, 'A', 'B', 120)).toThrow();
    expect(() => setLinkLoss(baseTopology, 'A', 'B', -1)).toThrow();
  });

  it('setLinkDelay validates and does not mutate the original topology', () => {
    const updated = setLinkDelay(baseTopology, 'A', 'B', 40);
    expect(updated).not.toBe(baseTopology);
    expect(baseTopology.links[0].delayMs).toBe(5);
    expect(updated.links[0].delayMs).toBe(40);

    expect(() => setLinkDelay(baseTopology, 'A', 'B', 0)).toThrow();
    expect(() => setLinkDelay(baseTopology, 'A', 'B', -10)).toThrow();
  });

  it('loads older topology JSON lacking lossPercent/delayMs with backward-compatible defaults', () => {
    const oldJson = JSON.stringify({
      nodes: ['A', 'B'],
      links: [{ a: 'A', b: 'B', cost: 4 }],
    });

    const parsed = importTopologyJSON(oldJson);
    expect(validateTopology(parsed).valid).toBe(true);
    expect(parsed.links[0].cost).toBe(4);
  });
});

describe('Stage 1 - Packet Forwarding with Delay and Loss (packetForwarding.js)', () => {
  const topology = {
    nodes: [
      { id: 'A', x: 100, y: 100 },
      { id: 'B', x: 300, y: 100 },
      { id: 'C', x: 500, y: 100 },
    ],
    links: [
      { id: 'A-B', a: 'A', b: 'B', source: 'A', target: 'B', cost: 1, lossPercent: 0, delayMs: 10, up: true, status: 'up' },
      { id: 'B-C', a: 'B', b: 'C', source: 'B', target: 'C', cost: 2, lossPercent: 100, delayMs: 25, up: true, status: 'up' },
    ],
  };

  const tables = {
    A: {
      A: { cost: 0, nextHop: 'A' },
      B: { cost: 1, nextHop: 'B' },
      C: { cost: 3, nextHop: 'B' },
    },
    B: {
      A: { cost: 1, nextHop: 'A' },
      B: { cost: 0, nextHop: 'B' },
      C: { cost: 2, nextHop: 'C' },
    },
    C: {
      A: { cost: 3, nextHop: 'B' },
      B: { cost: 2, nextHop: 'B' },
      C: { cost: 0, nextHop: 'C' },
    },
  };

  it('calculates cumulative latency as the sum of link delays on the path', () => {
    // When loss is not applied, packet from A to C traverses A-B (10ms) and B-C (25ms) = 35ms
    const res = forwardPacket(tables, topology, {}, 'A', 'C', { applyLoss: false });
    expect(res.delivered).toBe(true);
    expect(res.outcome).toBe('delivered');
    expect(res.totalLatencyMs).toBe(35);
    expect(res.totalCost).toBe(3);
    expect(res.hops.length).toBe(2);
    expect(res.hops[0].cumulativeLatencyMs).toBe(10);
    expect(res.hops[1].cumulativeLatencyMs).toBe(35);
  });

  it('drops packet with outcome "lost" when encountering a 100% loss link with applyLoss: true', () => {
    const res = forwardPacket(tables, topology, {}, 'A', 'C', { applyLoss: true, seed: 1 });
    expect(res.delivered).toBe(false);
    expect(res.outcome).toBe('lost');
    expect(res.lostAt).toBe('B-C');
    expect(res.totalLatencyMs).toBe(35); // Reached B-C link before being lost
  });

  it('never drops packets on 0% loss links even when applyLoss: true', () => {
    const res = forwardPacket(tables, topology, {}, 'A', 'B', { applyLoss: true, seed: 42 });
    expect(res.delivered).toBe(true);
    expect(res.outcome).toBe('delivered');
    expect(res.totalLatencyMs).toBe(10);
  });
});

describe('Stage 1 - URL State Serialization (urlState.js)', () => {
  const customTopology = {
    nodes: [
      { id: 'R1', name: 'Router R1', x: 120, y: 150 },
      { id: 'R2', name: 'Router R2', x: 340, y: 150 },
    ],
    links: [
      { id: 'R1-R2', a: 'R1', b: 'R2', source: 'R1', target: 'R2', cost: 5, lossPercent: 20, delayMs: 50, up: true, status: 'up' },
    ],
  };

  it('correctly encodes and decodes custom loss and delay in scenario URL', () => {
    const encoded = encodeScenarioToUrl(customTopology, { splitHorizon: true, poisonReverse: true });
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeScenarioFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded.topology.links[0].cost).toBe(5);
    expect(decoded.topology.links[0].lossPercent).toBe(20);
    expect(decoded.topology.links[0].delayMs).toBe(50);
    expect(decoded.options.splitHorizon).toBe(true);
  });

  it('omits default delay (1) and loss (0) to keep URLs compact', () => {
    const defaultTopology = {
      nodes: [
        { id: 'R1', name: 'Router R1', x: 120, y: 150 },
        { id: 'R2', name: 'Router R2', x: 340, y: 150 },
      ],
      links: [
        { id: 'R1-R2', a: 'R1', b: 'R2', source: 'R1', target: 'R2', cost: 1, lossPercent: 0, delayMs: 1, up: true, status: 'up' },
      ],
    };

    const encoded = encodeScenarioToUrl(defaultTopology);
    const decoded = decodeScenarioFromUrl(encoded);
    expect(decoded.topology.links[0].lossPercent).toBe(0);
    expect(decoded.topology.links[0].delayMs).toBe(1);
  });
});
