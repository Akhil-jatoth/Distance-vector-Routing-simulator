export const INFINITY = 16;

/**
 * Validates a topology object.
 * Checks for non-empty nodes, duplicate nodes, valid links, no self-links,
 * positive integer costs, valid lossPercent (0-100), valid delayMs (>0 integer),
 * and references to existing nodes.
 */
export function validateTopology(topology) {
  const errors = [];

  if (!topology || typeof topology !== 'object') {
    return { valid: false, errors: ['Topology must be an object.'] };
  }

  if (!Array.isArray(topology.nodes) || topology.nodes.length === 0) {
    errors.push('Topology must contain a non-empty nodes array.');
  }

  const nodeSet = new Set();
  for (const node of topology.nodes || []) {
    const nodeId = typeof node === 'string' ? node : node?.id;
    if (typeof nodeId !== 'string' || nodeId.trim() === '') {
      errors.push('Each node must be a non-empty string.');
    } else if (nodeSet.has(nodeId)) {
      errors.push(`Duplicate node found: "${nodeId}".`);
    } else {
      nodeSet.add(nodeId);
    }
  }

  if (!Array.isArray(topology.links)) {
    errors.push('Topology must contain a links array.');
  } else {
    const seenLinks = new Set();

    for (let i = 0; i < topology.links.length; i++) {
      const link = topology.links[i];
      const a = link.a || link.source;
      const b = link.b || link.target;
      const cost = link.cost;
      const lossPercent = link.lossPercent;
      const delayMs = link.delayMs;

      if (!nodeSet.has(a) || !nodeSet.has(b)) {
        errors.push(`Link at index ${i} references unknown nodes (${a} <-> ${b}).`);
      }

      if (a === b) {
        errors.push(`Self-link not allowed on node "${a}".`);
      }

      if (typeof cost !== 'number' || !Number.isInteger(cost) || cost <= 0) {
        errors.push(`Link (${a} <-> ${b}) cost must be a positive integer.`);
      }

      if (lossPercent !== undefined && lossPercent !== null) {
        if (typeof lossPercent !== 'number' || Number.isNaN(lossPercent) || lossPercent < 0 || lossPercent > 100) {
          errors.push(`Link (${a} <-> ${b}) lossPercent must be a number between 0 and 100.`);
        }
      }

      if (delayMs !== undefined && delayMs !== null) {
        if (typeof delayMs !== 'number' || !Number.isInteger(delayMs) || delayMs <= 0) {
          errors.push(`Link (${a} <-> ${b}) delayMs must be a positive integer.`);
        }
      }

      const pairKey = [a, b].sort().join('-');
      if (seenLinks.has(pairKey)) {
        errors.push(`Duplicate link between "${a}" and "${b}".`);
      }
      seenLinks.add(pairKey);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function addNode(topology, node) {
  const nodeId = typeof node === 'string' ? node : node.id;
  const existingIds = (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));

  if (existingIds.includes(nodeId)) {
    throw new Error(`Node "${nodeId}" already exists in topology.`);
  }

  return {
    nodes: [...topology.nodes, node],
    links: topology.links.map(link => ({ ...link })),
  };
}

export function updateNode(topology, nodeId, updates) {
  return {
    nodes: topology.nodes.map(n => {
      const id = typeof n === 'string' ? n : n.id;
      if (id === nodeId) {
        return typeof n === 'string' ? { id: n, ...updates } : { ...n, ...updates };
      }
      return n;
    }),
    links: topology.links.map(link => ({ ...link })),
  };
}

export function removeNode(topology, node) {
  const nodeId = typeof node === 'string' ? node : node.id;
  return {
    nodes: topology.nodes.filter(n => (typeof n === 'string' ? n : n.id) !== nodeId),
    links: topology.links
      .filter(link => {
        const a = link.a || link.source;
        const b = link.b || link.target;
        return a !== nodeId && b !== nodeId;
      })
      .map(link => ({ ...link })),
  };
}

export function addLink(topology, a, b, cost, lossPercent = 0, delayMs = 1) {
  if (a === b) {
    throw new Error('Cannot add a self-link on the same node.');
  }
  const existingIds = (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));
  if (!existingIds.includes(a) || !existingIds.includes(b)) {
    throw new Error(`Nodes "${a}" and "${b}" must exist in topology before adding link.`);
  }
  if (typeof cost !== 'number' || !Number.isInteger(cost) || cost <= 0) {
    throw new Error('Link cost must be a positive integer.');
  }
  if (typeof lossPercent !== 'number' || Number.isNaN(lossPercent) || lossPercent < 0 || lossPercent > 100) {
    throw new Error('Link lossPercent must be a number between 0 and 100.');
  }
  if (typeof delayMs !== 'number' || !Number.isInteger(delayMs) || delayMs <= 0) {
    throw new Error('Link delayMs must be a positive integer.');
  }

  const exists = topology.links.some(link => {
    const src = link.a || link.source;
    const tgt = link.b || link.target;
    return (src === a && tgt === b) || (src === b && tgt === a);
  });
  if (exists) {
    throw new Error(`Link between "${a}" and "${b}" already exists.`);
  }

  return {
    nodes: [...topology.nodes],
    links: [
      ...topology.links.map(link => ({ ...link })),
      {
        id: `${a}-${b}`,
        a,
        b,
        source: a,
        target: b,
        cost,
        lossPercent,
        delayMs,
        up: true,
        status: 'up',
      },
    ],
  };
}

export function removeLink(topology, a, b) {
  const isSingleId = b === undefined;
  return {
    nodes: [...topology.nodes],
    links: topology.links
      .filter(link => {
        if (isSingleId) {
          const canonical = [link.a || link.source, link.b || link.target].sort().join('-');
          return link.id !== a && canonical !== a;
        }
        const src = link.a || link.source;
        const tgt = link.b || link.target;
        return !((src === a && tgt === b) || (src === b && tgt === a));
      })
      .map(link => ({ ...link })),
  };
}

export function setLinkCost(topology, a, b, newCost) {
  const isSingleId = newCost === undefined;
  const targetId = isSingleId ? a : null;
  const costVal = isSingleId ? b : newCost;

  if (typeof costVal !== 'number' || !Number.isInteger(costVal) || costVal <= 0) {
    throw new Error('New link cost must be a positive integer.');
  }

  return {
    nodes: [...topology.nodes],
    links: topology.links.map(link => {
      const src = link.a || link.source;
      const tgt = link.b || link.target;
      const canonical = [src, tgt].sort().join('-');
      if (
        (targetId && (link.id === targetId || canonical === targetId)) ||
        (!targetId && ((src === a && tgt === b) || (src === b && tgt === a)))
      ) {
        return { ...link, cost: costVal };
      }
      return { ...link };
    }),
  };
}

export function setLinkLoss(topology, a, b, maybeValue) {
  const isSingleId = maybeValue === undefined;
  const targetId = isSingleId ? a : null;
  const lossVal = isSingleId ? b : maybeValue;

  if (typeof lossVal !== 'number' || Number.isNaN(lossVal) || lossVal < 0 || lossVal > 100) {
    throw new Error('Link lossPercent must be a number between 0 and 100.');
  }

  return {
    nodes: [...topology.nodes],
    links: topology.links.map(link => {
      const src = link.a || link.source;
      const tgt = link.b || link.target;
      const canonical = [src, tgt].sort().join('-');
      if (
        (targetId && (link.id === targetId || canonical === targetId)) ||
        (!targetId && ((src === a && tgt === b) || (src === b && tgt === a)))
      ) {
        return { ...link, lossPercent: lossVal };
      }
      return { ...link };
    }),
  };
}

export function setLinkDelay(topology, a, b, maybeValue) {
  const isSingleId = maybeValue === undefined;
  const targetId = isSingleId ? a : null;
  const delayVal = isSingleId ? b : maybeValue;

  if (typeof delayVal !== 'number' || !Number.isInteger(delayVal) || delayVal <= 0) {
    throw new Error('Link delayMs must be a positive integer.');
  }

  return {
    nodes: [...topology.nodes],
    links: topology.links.map(link => {
      const src = link.a || link.source;
      const tgt = link.b || link.target;
      const canonical = [src, tgt].sort().join('-');
      if (
        (targetId && (link.id === targetId || canonical === targetId)) ||
        (!targetId && ((src === a && tgt === b) || (src === b && tgt === a)))
      ) {
        return { ...link, delayMs: delayVal };
      }
      return { ...link };
    }),
  };
}

export function failLink(topology, a, b) {
  return setLinkStatus(topology, a, b, 'down');
}

export function restoreLink(topology, a, b) {
  return setLinkStatus(topology, a, b, 'up');
}

export function setLinkStatus(topology, a, bOrStatus, maybeStatus) {
  const isIdCall = maybeStatus === undefined && (bOrStatus === 'up' || bOrStatus === 'down' || typeof bOrStatus === 'boolean');
  const targetId = isIdCall ? a : null;
  const statusStr = isIdCall
    ? typeof bOrStatus === 'boolean'
      ? bOrStatus
        ? 'up'
        : 'down'
      : bOrStatus
    : typeof maybeStatus === 'boolean'
    ? maybeStatus
      ? 'up'
      : 'down'
    : maybeStatus || 'up';
  const isUp = statusStr === 'up';

  return {
    nodes: [...topology.nodes],
    links: topology.links.map(link => {
      const src = link.a || link.source;
      const tgt = link.b || link.target;
      const canonical = [src, tgt].sort().join('-');
      if (
        (targetId && (link.id === targetId || canonical === targetId)) ||
        (!targetId && ((src === a && tgt === bOrStatus) || (src === bOrStatus && tgt === a)))
      ) {
        return { ...link, up: isUp, status: statusStr };
      }
      return { ...link };
    }),
  };
}

export function exportTopologyJSON(topology) {
  return JSON.stringify(topology, null, 2);
}

export function importTopologyJSON(jsonStr) {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Invalid JSON format: ${err.message}`);
  }

  const validation = validateTopology(parsed);
  if (!validation.valid) {
    throw new Error(`Topology validation failed:\n- ${validation.errors.join('\n- ')}`);
  }

  return parsed;
}

