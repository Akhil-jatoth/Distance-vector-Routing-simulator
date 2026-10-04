import { validateTopology } from '../engine/topology.js';

/**
 * Encodes topology and simulation options into a URL-safe base64 string.
 * Omits default values (lossPercent = 0, delayMs = 1) to keep URLs short.
 */
export function encodeScenarioToUrl(topology, options = {}) {
  try {
    const payload = {
      t: {
        nodes: (topology.nodes || []).map(n => ({
          id: typeof n === 'string' ? n : n.id,
          name: typeof n === 'string' ? `Router ${n}` : n.name,
          x: n.x ?? 150,
          y: n.y ?? 150,
        })),
        links: (topology.links || []).map(l => {
          const entry = {
            a: l.a || l.source,
            b: l.b || l.target,
            cost: Number(l.cost) || 1,
            up: l.up !== false && l.status !== 'down',
          };
          if (typeof l.lossPercent === 'number' && l.lossPercent > 0) {
            entry.loss = l.lossPercent;
          }
          if (typeof l.delayMs === 'number' && l.delayMs !== 1) {
            entry.delay = l.delayMs;
          }
          return entry;
        }),
      },
      o: {
        sh: Boolean(options.splitHorizon),
        pr: Boolean(options.poisonReverse),
      },
    };

    const jsonStr = JSON.stringify(payload);
    const base64 = btoa(encodeURIComponent(jsonStr));
    return base64;
  } catch {
    return '';
  }
}

/**
 * Decodes a scenario payload from a base64 string.
 * Uses default lossPercent (0) and delayMs (1) if not present in payload.
 */
export function decodeScenarioFromUrl(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return null;

  try {
    const jsonStr = decodeURIComponent(atob(base64Str.trim()));
    const payload = JSON.parse(jsonStr);

    if (!payload || !payload.t || !Array.isArray(payload.t.nodes)) {
      return null;
    }

    const topology = {
      nodes: payload.t.nodes.map(n => ({
        id: n.id,
        name: n.name || `Router ${n.id}`,
        x: n.x ?? 150,
        y: n.y ?? 150,
      })),
      links: (payload.t.links || []).map(l => ({
        id: `${l.a}-${l.b}`,
        a: l.a,
        b: l.b,
        source: l.a,
        target: l.b,
        cost: l.cost || 1,
        lossPercent: l.loss ?? l.lossPercent ?? 0,
        delayMs: l.delay ?? l.delayMs ?? 1,
        up: l.up !== false,
        status: l.up !== false ? 'up' : 'down',
      })),
    };

    const validation = validateTopology(topology);
    if (!validation.valid) {
      return null;
    }

    const options = {
      splitHorizon: Boolean(payload.o?.sh),
      poisonReverse: Boolean(payload.o?.pr),
    };

    return { topology, options };
  } catch {
    return null;
  }
}

