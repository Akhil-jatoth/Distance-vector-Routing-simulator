import { INFINITY } from './topology.js';

export { INFINITY };

/**
 * Finds all active direct neighbors for a given router.
 */
function getActiveNeighbors(topology, router) {
  const neighbors = [];
  const links = topology.links || [];

  for (const link of links) {
    if (link.up === false || link.status === 'down') continue;
    const a = link.a || link.source;
    const b = link.b || link.target;

    if (a === router) {
      neighbors.push({ node: b, cost: link.cost });
    } else if (b === router) {
      neighbors.push({ node: a, cost: link.cost });
    }
  }
  return neighbors;
}

/**
 * Extracts list of node IDs from topology (supports strings or objects with id).
 */
function getNodeList(topology) {
  return (topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id));
}

/**
 * Initializes routing tables for all routers in the topology.
 * Cost 0 to self (nextHop null), direct link cost to neighbors (nextHop neighbor),
 * and 16 to everything else (nextHop null).
 */
export function initTables(topology) {
  const tables = {};
  const nodes = getNodeList(topology);

  for (const router of nodes) {
    tables[router] = {};
    const activeNeighbors = getActiveNeighbors(topology, router);
    const neighborCostMap = new Map(activeNeighbors.map(n => [n.node, n.cost]));

    for (const destination of nodes) {
      if (destination === router) {
        tables[router][destination] = {
          cost: 0,
          nextHop: null,
        };
      } else if (neighborCostMap.has(destination)) {
        tables[router][destination] = {
          cost: neighborCostMap.get(destination),
          nextHop: destination,
        };
      } else {
        tables[router][destination] = {
          cost: INFINITY,
          nextHop: null,
        };
      }
    }
  }

  return tables;
}

/**
 * Builds the distance vectors that each router advertises to each of its direct neighbors.
 * Handles Split Horizon and Poison Reverse options.
 */
export function buildAdvertisedVectors(tables, topology, options = {}) {
  const advertised = {};
  const nodes = getNodeList(topology);

  for (const router of nodes) {
    advertised[router] = {};
    const neighbors = getActiveNeighbors(topology, router);

    for (const neighbor of neighbors) {
      const neighborNode = neighbor.node;
      const vector = {};

      for (const destination of nodes) {
        const entry = tables[router]?.[destination] || { cost: INFINITY, nextHop: null };
        const reachesViaNeighbor = entry.nextHop === neighborNode && destination !== router;

        if (reachesViaNeighbor) {
          if (options.poisonReverse) {
            vector[destination] = INFINITY;
          } else if (options.splitHorizon) {
            continue;
          } else {
            vector[destination] = entry.cost;
          }
        } else {
          vector[destination] = entry.cost;
        }
      }

      advertised[router][neighborNode] = vector;
    }
  }

  return advertised;
}

/**
 * Generates an array of exchanged vector messages for UI panels.
 */
export function generateExchangedMessages(tables, topology, options = {}) {
  const messages = [];
  const nodes = getNodeList(topology);

  for (const router of nodes) {
    const neighbors = getActiveNeighbors(topology, router);
    for (const neighbor of neighbors) {
      const neighborNode = neighbor.node;
      const vector = {};
      const poisoned = {};

      for (const dest of nodes) {
        const entry = tables[router]?.[dest] || { cost: INFINITY, nextHop: null };
        let cost = entry.cost;
        let isPoisoned = false;

        if (entry.nextHop === neighborNode && dest !== router) {
          if (options.poisonReverse) {
            cost = INFINITY;
            isPoisoned = true;
          } else if (options.splitHorizon) {
            cost = INFINITY;
            isPoisoned = true;
          }
        }

        vector[dest] = cost;
        if (isPoisoned) {
          poisoned[dest] = true;
        }
      }

      messages.push({
        id: `${router}->${neighborNode}`,
        from: router,
        to: neighborNode,
        linkCost: neighbor.cost,
        vector,
        poisoned,
      });
    }
  }

  return messages;
}

/**
 * Executes a single synchronous round of the Distance Vector algorithm.
 * All routers calculate new tables from the vectors advertised at the start of the round.
 */
export function runRound(tables, topology, options = {}) {
  const isStateObject = tables && typeof tables === 'object' && tables.tables && tables.round !== undefined;
  const currentTables = isStateObject ? tables.tables : tables;
  const currentRound = isStateObject ? tables.round : 0;
  const currentEvents = isStateObject ? tables.events || [] : [];
  const activeOptions = isStateObject ? { ...tables.options, ...options } : options;

  const advertisedVectors = buildAdvertisedVectors(currentTables, topology, activeOptions);
  const nodes = getNodeList(topology);

  const newTables = {};
  const changes = [];
  const candidates = {};
  const roundEvents = [];

  for (const router of nodes) {
    newTables[router] = {};
    candidates[router] = {};
    const activeNeighbors = getActiveNeighbors(topology, router);

    for (const destination of nodes) {
      const oldEntry = currentTables[router]?.[destination] || { cost: INFINITY, nextHop: null };

      if (destination === router) {
        newTables[router][destination] = {
          cost: 0,
          nextHop: null,
        };
        candidates[router][destination] = [];
        if (oldEntry.cost !== 0 || oldEntry.nextHop !== null) {
          changes.push({
            router,
            destination,
            oldCost: oldEntry.cost,
            newCost: 0,
            oldNextHop: oldEntry.nextHop,
            newNextHop: null,
          });
        }
        continue;
      }

      const candidateList = [];

      for (const neighbor of activeNeighbors) {
        const neighborNode = neighbor.node;
        const linkCost = neighbor.cost;
        const advertisedCost = advertisedVectors[neighborNode]?.[router]?.[destination];

        const neighborDistance =
          advertisedCost !== undefined ? advertisedCost : INFINITY;

        const totalCost = Math.min(linkCost + neighborDistance, INFINITY);

        candidateList.push({
          via: neighborNode,
          viaNeighbor: neighborNode,
          linkCost,
          advertisedCost: neighborDistance,
          neighborReportedCost: neighborDistance,
          total: totalCost,
          totalCost,
          winner: false,
          isChosen: false,
          isPoisoned: neighborDistance >= INFINITY && activeOptions.poisonReverse,
        });
      }

      let bestCost = INFINITY;
      let bestNextHop = null;

      if (candidateList.length > 0) {
        const minTotal = Math.min(...candidateList.map(c => c.total));

        if (minTotal < INFINITY) {
          bestCost = minTotal;
          const minCandidates = candidateList.filter(c => c.total === minTotal);

          const previousCandidate = minCandidates.find(c => c.via === oldEntry.nextHop);

          if (previousCandidate) {
            bestNextHop = previousCandidate.via;
            previousCandidate.winner = true;
            previousCandidate.isChosen = true;
          } else {
            minCandidates.sort((a, b) => a.via.localeCompare(b.via));
            bestNextHop = minCandidates[0].via;
            minCandidates[0].winner = true;
            minCandidates[0].isChosen = true;
          }
        }
      }

      const isChanged = oldEntry.cost !== bestCost || oldEntry.nextHop !== bestNextHop;

      newTables[router][destination] = {
        cost: bestCost,
        nextHop: bestNextHop,
      };
      candidates[router][destination] = candidateList;

      if (isChanged) {
        changes.push({
          router,
          destination,
          oldCost: oldEntry.cost,
          newCost: bestCost,
          oldNextHop: oldEntry.nextHop,
          newNextHop: bestNextHop,
        });

        const prevCostStr = oldEntry.cost >= INFINITY ? '∞' : oldEntry.cost;
        const newCostStr = bestCost >= INFINITY ? '∞' : bestCost;
        const viaStr = bestNextHop ? ` via ${bestNextHop}` : ' (unreachable)';

        roundEvents.push({
          round: currentRound + 1,
          type: 'update',
          routerId: router,
          destination,
          message: `Router ${router} updated route to ${destination}: cost ${prevCostStr} → ${newCostStr}${viaStr}`,
        });
      }
    }
  }

  const nextRound = currentRound + 1;
  const converged = changes.length === 0;

  if (converged && isStateObject) {
    roundEvents.push({
      round: nextRound,
      type: 'converged',
      message: `Network converged after round ${currentRound}. All routing tables are stable.`,
    });
  }

  if (isStateObject) {
    const messages = generateExchangedMessages(currentTables, topology, activeOptions);
    const newState = {
      round: nextRound,
      tables: newTables,
      previousTables: currentTables,
      messages,
      events: [...currentEvents, ...roundEvents],
      converged,
      options: activeOptions,
      changes,
      candidates,
      history: [],
    };
    newState.history = [...(tables.history || []), { round: nextRound, tables: newTables, converged }];
    return newState;
  }

  return {
    newTables,
    changes,
    candidates,
  };
}

/**
 * Initializes simulation state for the UI.
 */
export function initSimulation(topology, options = {}) {
  const tables = initTables(topology);
  const initialState = {
    round: 0,
    tables,
    previousTables: null,
    messages: [],
    events: [
      {
        round: 0,
        type: 'init',
        message: 'Routing tables initialized (Round 0). Direct neighbor costs assigned.',
      },
    ],
    converged: false,
    options,
    changes: [],
    candidates: {},
    history: [{ round: 0, tables, converged: false }],
  };
  return initialState;
}

/**
 * Checks whether the round produced zero changes.
 */
export function hasConverged(changes) {
  return Array.isArray(changes) && changes.length === 0;
}

/**
 * Runs the simulation starting from initial tables until convergence or maxRounds.
 */
export function runUntilConverged(topology, options = {}, maxRounds = 100) {
  let currentTables = initTables(topology);
  const history = [
    {
      roundNumber: 0,
      tables: JSON.parse(JSON.stringify(currentTables)),
      changes: [],
      candidates: {},
    },
  ];

  let roundsTaken = 0;
  let converged = false;

  for (let round = 1; round <= maxRounds; round++) {
    const { newTables, changes, candidates } = runRound(currentTables, topology, options);
    roundsTaken = round;

    history.push({
      roundNumber: round,
      tables: JSON.parse(JSON.stringify(newTables)),
      changes,
      candidates,
    });

    currentTables = newTables;

    if (hasConverged(changes)) {
      converged = true;
      break;
    }
  }

  return {
    history,
    roundsTaken,
    converged,
    finalTables: currentTables,
  };
}

/**
 * Traces next hops from source to destination.
 * Returns array of node names or null if destination is unreachable or a loop occurs.
 */
export function getPath(tables, source, destination, maxHops = 100) {
  if (!tables || !source || !destination || !tables[source]) {
    return null;
  }

  if (source === destination) {
    return [source];
  }

  const path = [source];
  const visited = new Set([source]);
  let current = source;

  while (path.length <= maxHops) {
    const entry = tables[current]?.[destination];
    if (!entry || entry.cost >= INFINITY || !entry.nextHop) {
      return null;
    }

    const nextNode = entry.nextHop;
    if (visited.has(nextNode)) {
      return null; // Loop detected
    }

    path.push(nextNode);
    visited.add(nextNode);
    current = nextNode;

    if (current === destination) {
      return path;
    }
  }

  return null;
}

/**
 * Compatibility wrapper for getPath.
 */
export function getShortestPath(tables, source, destination) {
  const path = getPath(tables, source, destination);
  if (!path) {
    return { path: [], totalCost: INFINITY, isReachable: false, loopDetected: false };
  }
  return {
    path,
    totalCost: tables?.[source]?.[destination]?.cost ?? INFINITY,
    isReachable: true,
    loopDetected: false,
  };
}

/**
 * Generates an N x N source-by-destination matrix of final routing costs.
 */
export function buildCostMatrix(tables) {
  const matrix = {};
  for (const src of Object.keys(tables || {})) {
    matrix[src] = {};
    for (const dst of Object.keys(tables[src] || {})) {
      matrix[src][dst] = tables[src][dst].cost;
    }
  }
  return matrix;
}

/**
 * Compatibility wrapper for building cost matrix with next-hops.
 */
export function getPathCostMatrix(topology, tables) {
  const nodes = getNodeList(topology);
  const matrix = {};

  for (const src of nodes) {
    matrix[src] = {};
    for (const dst of nodes) {
      const entry = tables?.[src]?.[dst];
      matrix[src][dst] = {
        cost: entry ? entry.cost : INFINITY,
        nextHop: entry ? entry.nextHop : null,
        isReachable: entry ? entry.cost < INFINITY : false,
      };
    }
  }

  return { nodes, matrix };
}
