import { INFINITY } from './topology.js';
import { createRandom } from './random.js';

/**
 * Finds direct link between two routers in topology.
 */
export function findDirectLink(topology, u, v) {
  if (!topology || !topology.links) return null;
  return topology.links.find(l => {
    const src = l.a || l.source;
    const tgt = l.b || l.target;
    return (src === u && tgt === v) || (src === v && tgt === u);
  }) || null;
}

/**
 * Checks if a node is down either in routerStates or topology.nodes.
 */
export function isNodeDown(topology, routerStates, nodeId) {
  if (routerStates && routerStates[nodeId]) {
    const st = routerStates[nodeId];
    if (st.up === false || st.status === 'down') return true;
  }
  if (topology && topology.nodes) {
    const node = topology.nodes.find(n => (typeof n === 'string' ? n === nodeId : n.id === nodeId));
    if (node && (node.up === false || node.status === 'down')) return true;
  }
  return false;
}

/**
 * Forwards a packet hop-by-hop using routing tables, link properties (delay, loss), and TTL.
 *
 * @param {Object} tables Current routing tables
 * @param {Object} topology Current network topology
 * @param {Object} routerStates Router up/down states
 * @param {string} source Source router ID
 * @param {string} destination Destination router ID
 * @param {Object} [options={}] Forwarding options
 * @param {Function} [options.random] Pseudo-random generator function () => number
 * @param {boolean} [options.applyLoss=false] Whether packet loss probabilities are evaluated
 * @param {number} [options.ttl=64] Starting Time-To-Live
 * @returns {Object} Forwarding outcome, hops, latency, and diagnostics
 */
export function forwardPacket(
  tables,
  topology,
  routerStates,
  source,
  destination,
  options = {}
) {
  const applyLoss = Boolean(options.applyLoss);
  const random = typeof options.random === 'function' ? options.random : createRandom(options.seed ?? 1);
  const initialTtl = Number(options.ttl ?? options.initialTtl ?? 64) || 64;

  if (!tables || !source || !destination) {
    return {
      delivered: false,
      outcome: 'no_route',
      source,
      destination,
      hops: [],
      path: [source],
      totalCost: 0,
      totalLatencyMs: 0,
      ttlRemaining: initialTtl,
      lostAt: null,
      loopDetected: false,
      summaryMessage: 'Source or destination router is not specified.',
    };
  }

  // Check if source node is down
  if (isNodeDown(topology, routerStates, source)) {
    return {
      delivered: false,
      outcome: 'router_down',
      source,
      destination,
      hops: [
        {
          hop: 1,
          router: source,
          from: source,
          to: null,
          tableEntry: { destination, cost: INFINITY, nextHop: null },
          outgoingLink: null,
          linkCost: 0,
          linkDelayMs: 0,
          linkLossPercent: 0,
          cumulativeLatencyMs: 0,
          cumulativeCost: 0,
          ttlRemaining: initialTtl,
          status: 'DROPPED_ROUTER_DOWN',
          isLoop: false,
          explanation: `Source Router ${source} is powered off / crashed.`,
        },
      ],
      path: [source],
      totalCost: 0,
      totalLatencyMs: 0,
      ttlRemaining: initialTtl,
      lostAt: null,
      loopDetected: false,
      summaryMessage: `Packet dropped: Source Router ${source} is powered off / crashed.`,
    };
  }

  // Trivial delivery: source is destination
  if (source === destination) {
    return {
      delivered: true,
      outcome: 'delivered',
      source,
      destination,
      hops: [
        {
          hop: 1,
          router: source,
          from: source,
          to: source,
          tableEntry: { destination, cost: 0, nextHop: source },
          outgoingLink: 'local',
          linkCost: 0,
          linkDelayMs: 0,
          linkLossPercent: 0,
          cumulativeLatencyMs: 0,
          cumulativeCost: 0,
          ttlRemaining: initialTtl,
          status: 'DELIVERED',
          isLoop: false,
          explanation: `Packet addressed to local router ${source}. Delivered immediately.`,
        },
      ],
      path: [source],
      totalCost: 0,
      totalLatencyMs: 0,
      ttlRemaining: initialTtl,
      lostAt: null,
      loopDetected: false,
      summaryMessage: `Packet delivered locally at ${source}.`,
    };
  }

  const hops = [];
  const visitedRouters = [source];
  const visitedEdgeSet = new Set();
  let current = source;
  let ttl = initialTtl;
  let totalCost = 0;
  let totalLatencyMs = 0;
  let loopDetected = false;
  let outcome = 'in_transit';
  let lostAt = null;

  while (ttl > 0) {
    const table = tables[current];
    const route = table ? table[destination] : null;

    if (!route || route.cost >= INFINITY || !route.nextHop || route.nextHop === '-' || route.nextHop === null) {
      outcome = 'no_route';
      hops.push({
        hop: hops.length + 1,
        router: current,
        from: current,
        to: null,
        tableEntry: route || { destination, cost: INFINITY, nextHop: null },
        outgoingLink: null,
        linkCost: 0,
        linkDelayMs: 0,
        linkLossPercent: 0,
        cumulativeLatencyMs: totalLatencyMs,
        cumulativeCost: totalCost,
        ttlRemaining: ttl,
        status: 'DROPPED_NO_ROUTE',
        isLoop: false,
        explanation: `Router ${current} has no valid route to ${destination} (cost=${route ? route.cost : '∞'}).`,
      });
      break;
    }

    const nextHop = route.nextHop;
    const link = findDirectLink(topology, current, nextHop);
    const linkId = link ? link.id || [current, nextHop].sort().join('-') : `${current}-${nextHop}`;
    const linkCost = link ? Number(link.cost) || 1 : 1;
    const linkDelay = link && typeof link.delayMs === 'number' ? link.delayMs : 1;
    const linkLoss = link && typeof link.lossPercent === 'number' ? link.lossPercent : 0;
    const isLinkDown = link ? link.up === false || link.status === 'down' : false;

    // Check if link is severed
    if (isLinkDown) {
      outcome = 'link_down';
      hops.push({
        hop: hops.length + 1,
        router: current,
        from: current,
        to: nextHop,
        tableEntry: route,
        outgoingLink: linkId,
        linkCost,
        linkDelayMs: linkDelay,
        linkLossPercent: linkLoss,
        cumulativeLatencyMs: totalLatencyMs,
        cumulativeCost: totalCost,
        ttlRemaining: ttl,
        status: 'DROPPED_LINK_DOWN',
        isLoop: false,
        explanation: `Link ${current} ↔ ${nextHop} is down. Packet dropped.`,
      });
      break;
    }

    // Check if next hop router is down
    if (isNodeDown(topology, routerStates, nextHop)) {
      outcome = 'router_down';
      hops.push({
        hop: hops.length + 1,
        router: current,
        from: current,
        to: nextHop,
        tableEntry: route,
        outgoingLink: linkId,
        linkCost,
        linkDelayMs: linkDelay,
        linkLossPercent: linkLoss,
        cumulativeLatencyMs: totalLatencyMs,
        cumulativeCost: totalCost,
        ttlRemaining: ttl,
        status: 'DROPPED_ROUTER_DOWN',
        isLoop: false,
        explanation: `Target router ${nextHop} is crashed / powered off.`,
      });
      break;
    }

    // Apply link packet loss if requested
    if (applyLoss && linkLoss > 0) {
      const roll = random() * 100;
      if (roll < linkLoss) {
        outcome = 'lost';
        lostAt = linkId;
        totalLatencyMs += linkDelay;
        totalCost += linkCost;
        ttl -= 1;
        hops.push({
          hop: hops.length + 1,
          router: current,
          from: current,
          to: nextHop,
          tableEntry: route,
          outgoingLink: linkId,
          linkCost,
          linkDelayMs: linkDelay,
          linkLossPercent: linkLoss,
          cumulativeLatencyMs: totalLatencyMs,
          cumulativeCost: totalCost,
          ttlRemaining: ttl,
          status: 'LOST',
          isLoop: false,
          explanation: `Packet lost on lossy link ${linkId} (${linkLoss}% loss probability).`,
        });
        break;
      }
    }

    // Advance hop
    ttl -= 1;
    totalCost += linkCost;
    totalLatencyMs += linkDelay;

    const edgeKey = `${current}->${nextHop}`;
    if (visitedEdgeSet.has(edgeKey)) {
      loopDetected = true;
    }
    visitedEdgeSet.add(edgeKey);

    const isDelivered = nextHop === destination;
    hops.push({
      hop: hops.length + 1,
      router: current,
      from: current,
      to: nextHop,
      tableEntry: route,
      outgoingLink: linkId,
      linkCost,
      linkDelayMs: linkDelay,
      linkLossPercent: linkLoss,
      cumulativeLatencyMs: totalLatencyMs,
      cumulativeCost: totalCost,
      ttlRemaining: ttl,
      status: isDelivered ? 'DELIVERED' : loopDetected ? 'LOOP_STEP' : 'FORWARDED',
      isLoop: loopDetected,
      explanation: isDelivered
        ? `Packet reached destination Router ${destination} via link ${linkId}.`
        : `Forwarded to Router ${nextHop} via link ${linkId} (delay=${linkDelay}ms).`,
    });

    visitedRouters.push(nextHop);
    current = nextHop;

    if (isDelivered) {
      outcome = 'delivered';
      break;
    }

    if (loopDetected && visitedRouters.filter(r => r === current).length >= 3) {
      outcome = 'loop';
      break;
    }
  }

  if (ttl === 0 && outcome === 'in_transit') {
    outcome = 'ttl_expired';
  }

  return {
    delivered: outcome === 'delivered',
    outcome,
    source,
    destination,
    hops,
    path: visitedRouters,
    totalCost,
    totalLatencyMs,
    ttlRemaining: ttl,
    lostAt,
    loopDetected,
    summaryMessage:
      outcome === 'delivered'
        ? `Packet successfully delivered from ${source} to ${destination} in ${hops.length} hop(s) (${totalLatencyMs}ms total latency).`
        : outcome === 'lost'
        ? `Request timed out (packet lost at ${lostAt}).`
        : outcome === 'ttl_expired'
        ? `Time to Live (TTL) expired before reaching ${destination}.`
        : outcome === 'loop'
        ? `Routing loop detected along path ${visitedRouters.join(' → ')}.`
        : `Packet dropped: ${outcome}.`,
  };
}

/**
 * Performs a traceroute across the network topology.
 */
export function traceroute(tables, topology, routerStates, source, destination, options = {}) {
  const maxHops = Number(options.maxHops || 30);
  const probesPerHop = Number(options.probesPerHop || 3);
  const results = [];

  for (let ttl = 1; ttl <= maxHops; ttl++) {
    const hopProbes = [];
    let reachedDestination = false;
    let hopRouter = '*';

    for (let p = 0; p < probesPerHop; p++) {
      const forwardRes = forwardPacket(tables, topology, routerStates, source, destination, {
        ...options,
        ttl,
        applyLoss: options.applyLoss ?? false,
      });

      if (forwardRes.hops.length >= ttl) {
        const lastHop = forwardRes.hops[ttl - 1];
        hopRouter = lastHop.to || lastHop.router;
        hopProbes.push({
          rttMs: lastHop.cumulativeLatencyMs * 2,
          router: hopRouter,
          status: lastHop.status,
        });
      } else {
        hopProbes.push({
          rttMs: null,
          router: '*',
          status: forwardRes.outcome,
        });
      }

      if (forwardRes.delivered) {
        reachedDestination = true;
      }
    }

    results.push({
      ttl,
      router: hopRouter,
      probes: hopProbes,
    });

    if (reachedDestination) break;
  }

  return results;
}
