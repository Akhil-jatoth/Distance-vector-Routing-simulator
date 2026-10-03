/**
 * Preset topologies and Packet Tracer Scenarios for the Distance Vector Simulator.
 */

export const PRESET_TOPOLOGIES = {
  blank: {
    id: 'blank',
    name: 'Blank Canvas (Build from Scratch)',
    description: 'Empty canvas. Click "+ Add Router" to place routers (R1, R2...) and drag them, then connect endpoints with links.',
    topology: {
      nodes: [],
      links: [],
    },
  },

  triangle: {
    id: 'triangle',
    name: '3-Router Triangle',
    description: 'Simple 3-node cyclic topology. Great for learning basic distance-vector updates and convergence in 2-3 rounds.',
    topology: {
      nodes: [
        { id: 'R1', name: 'Router R1', x: 200, y: 130 },
        { id: 'R2', name: 'Router R2', x: 520, y: 130 },
        { id: 'R3', name: 'Router R3', x: 360, y: 360 },
      ],
      links: [
        { id: 'R1-R2', source: 'R1', target: 'R2', a: 'R1', b: 'R2', cost: 2, status: 'up', up: true },
        { id: 'R2-R3', source: 'R2', target: 'R3', a: 'R2', b: 'R3', cost: 3, status: 'up', up: true },
        { id: 'R1-R3', source: 'R1', target: 'R3', a: 'R1', b: 'R3', cost: 7, status: 'up', up: true },
      ],
    },
  },

  fiveRouter: {
    id: 'fiveRouter',
    name: '5-Router Enterprise Network',
    description: 'Standard 5-router topology with multiple alternate paths, demonstrating multi-hop route discovery.',
    topology: {
      nodes: [
        { id: 'R1', name: 'Router R1', x: 140, y: 240 },
        { id: 'R2', name: 'Router R2', x: 320, y: 120 },
        { id: 'R3', name: 'Router R3', x: 320, y: 360 },
        { id: 'R4', name: 'Router R4', x: 520, y: 120 },
        { id: 'R5', name: 'Router R5', x: 520, y: 360 },
      ],
      links: [
        { id: 'R1-R2', source: 'R1', target: 'R2', a: 'R1', b: 'R2', cost: 1, status: 'up', up: true },
        { id: 'R1-R3', source: 'R1', target: 'R3', a: 'R1', b: 'R3', cost: 4, status: 'up', up: true },
        { id: 'R2-R3', source: 'R2', target: 'R3', a: 'R2', b: 'R3', cost: 2, status: 'up', up: true },
        { id: 'R2-R4', source: 'R2', target: 'R4', a: 'R2', b: 'R4', cost: 6, status: 'up', up: true },
        { id: 'R3-R5', source: 'R3', target: 'R5', a: 'R3', b: 'R5', cost: 3, status: 'up', up: true },
        { id: 'R4-R5', source: 'R4', target: 'R5', a: 'R4', b: 'R5', cost: 2, status: 'up', up: true },
      ],
    },
  },

  sixMesh: {
    id: 'sixMesh',
    name: '6-Router Campus Mesh',
    description: 'A 6-node redundant campus network with cross-links, showing shortest-path optimization across multiple candidates.',
    topology: {
      nodes: [
        { id: 'R1', name: 'Router R1', x: 140, y: 140 },
        { id: 'R2', name: 'Router R2', x: 350, y: 100 },
        { id: 'R3', name: 'Router R3', x: 560, y: 140 },
        { id: 'R4', name: 'Router R4', x: 140, y: 350 },
        { id: 'R5', name: 'Router R5', x: 350, y: 390 },
        { id: 'R6', name: 'Router R6', x: 560, y: 350 },
      ],
      links: [
        { id: 'R1-R2', source: 'R1', target: 'R2', a: 'R1', b: 'R2', cost: 2, status: 'up', up: true },
        { id: 'R1-R4', source: 'R1', target: 'R4', a: 'R1', b: 'R4', cost: 5, status: 'up', up: true },
        { id: 'R2-R3', source: 'R2', target: 'R3', a: 'R2', b: 'R3', cost: 3, status: 'up', up: true },
        { id: 'R2-R5', source: 'R2', target: 'R5', a: 'R2', b: 'R5', cost: 2, status: 'up', up: true },
        { id: 'R3-R6', source: 'R3', target: 'R6', a: 'R3', b: 'R6', cost: 1, status: 'up', up: true },
        { id: 'R4-R5', source: 'R4', target: 'R5', a: 'R4', b: 'R5', cost: 4, status: 'up', up: true },
        { id: 'R5-R6', source: 'R5', target: 'R6', a: 'R5', b: 'R6', cost: 2, status: 'up', up: true },
        { id: 'R2-R4', source: 'R2', target: 'R4', a: 'R2', b: 'R4', cost: 1, status: 'up', up: true },
      ],
    },
  },

  campus8: {
    id: 'campus8',
    name: '8-Router Campus Backbone',
    description: 'Hierarchical 8-router backbone with core routers, distribution links, and edge branches.',
    topology: {
      nodes: [
        { id: 'R1', name: 'Edge North', x: 120, y: 120 },
        { id: 'R2', name: 'Dist North', x: 260, y: 120 },
        { id: 'R3', name: 'Core A', x: 440, y: 120 },
        { id: 'R4', name: 'Gateway A', x: 600, y: 120 },
        { id: 'R5', name: 'Edge South', x: 120, y: 350 },
        { id: 'R6', name: 'Dist South', x: 260, y: 350 },
        { id: 'R7', name: 'Core B', x: 440, y: 350 },
        { id: 'R8', name: 'Gateway B', x: 600, y: 350 },
      ],
      links: [
        { id: 'R1-R2', source: 'R1', target: 'R2', a: 'R1', b: 'R2', cost: 2, status: 'up', up: true },
        { id: 'R2-R3', source: 'R2', target: 'R3', a: 'R2', b: 'R3', cost: 1, status: 'up', up: true },
        { id: 'R3-R4', source: 'R3', target: 'R4', a: 'R3', b: 'R4', cost: 3, status: 'up', up: true },
        { id: 'R5-R6', source: 'R5', target: 'R6', a: 'R5', b: 'R6', cost: 2, status: 'up', up: true },
        { id: 'R6-R7', source: 'R6', target: 'R7', a: 'R6', b: 'R7', cost: 1, status: 'up', up: true },
        { id: 'R7-R8', source: 'R7', target: 'R8', a: 'R7', b: 'R8', cost: 3, status: 'up', up: true },
        { id: 'R3-R7', source: 'R3', target: 'R7', a: 'R3', b: 'R7', cost: 2, status: 'up', up: true },
        { id: 'R2-R6', source: 'R2', target: 'R6', a: 'R2', b: 'R6', cost: 4, status: 'up', up: true },
        { id: 'R4-R8', source: 'R4', target: 'R8', a: 'R4', b: 'R8', cost: 1, status: 'up', up: true },
      ],
    },
  },

  linearChain: {
    id: 'linearChain',
    name: 'Linear Chain (Count-to-Infinity Demo)',
    description: 'A 3-node linear chain (R1 - R2 - R3) demonstrating Count-to-Infinity and Poison Reverse when link R2-R3 fails.',
    topology: {
      nodes: [
        { id: 'R1', name: 'Router R1', x: 160, y: 230 },
        { id: 'R2', name: 'Router R2', x: 360, y: 230 },
        { id: 'R3', name: 'Router R3', x: 560, y: 230 },
      ],
      links: [
        { id: 'R1-R2', source: 'R1', target: 'R2', a: 'R1', b: 'R2', cost: 1, status: 'up', up: true },
        { id: 'R2-R3', source: 'R2', target: 'R3', a: 'R2', b: 'R3', cost: 1, status: 'up', up: true },
      ],
    },
  },
};

/**
 * Pre-configured Packet Tracer Scenarios for educational exploration (Section 4.8).
 */
export const TRACER_SCENARIOS = [
  {
    id: 'normal',
    name: '1. Normal Delivery (5-Router Converged)',
    desc: 'Demonstrates successful forwarding across optimal multi-hop paths.',
    presetKey: 'fiveRouter',
    source: 'R1',
    destination: 'R5',
    ttl: 16,
    customTables: null,
  },
  {
    id: 'routing_loop',
    name: '2. Routing Loop on Purpose (TTL Expiry)',
    desc: 'Simulates a 2-node transient loop where R1 points to R2 and R2 points to R1 until TTL expires.',
    presetKey: 'triangle',
    source: 'R1',
    destination: 'R3',
    ttl: 10,
    customTables: {
      R1: { R3: { cost: 3, nextHop: 'R2' } },
      R2: { R3: { cost: 4, nextHop: 'R1' } },
      R3: { R3: { cost: 0, nextHop: null } },
    },
  },
  {
    id: 'black_hole',
    name: '3. Black Hole (No Route Available)',
    desc: 'A router table with cost=16 (null next hop), dropping the packet with No Route diagnosis.',
    presetKey: 'fiveRouter',
    source: 'R1',
    destination: 'R5',
    ttl: 16,
    customTables: {
      R1: { R5: { cost: 16, nextHop: null } },
    },
  },
  {
    id: 'link_failure',
    name: '4. Link Failure Mid-Path',
    desc: 'A packet sent while an active link on its forwarding path is cut, triggering an immediate drop.',
    presetKey: 'fiveRouter',
    source: 'R1',
    destination: 'R5',
    ttl: 16,
    cutLink: 'R2-R3',
  },
  {
    id: 'count_to_infinity',
    name: '5. Count-to-Infinity Packet Race',
    desc: 'Linear chain with broken link R2-R3 showing packets looping between R1 and R2 while metrics climb.',
    presetKey: 'linearChain',
    source: 'R1',
    destination: 'R3',
    ttl: 16,
    cutLink: 'R2-R3',
  },
  {
    id: 'ttl_small',
    name: '6. TTL Too Small (TTL=2 on 4-Hop Route)',
    desc: 'Valid route exists, but packet expires prematurely after 2 hops.',
    presetKey: 'fiveRouter',
    source: 'R1',
    destination: 'R5',
    ttl: 2,
    customTables: null,
  },
];

