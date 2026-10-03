import { INFINITY } from './topology.js';

/**
 * Finds direct link between two routers in topology.
 */
function findDirectLink(topology, u, v) {
  if (!topology || !topology.links) return null;
  return topology.links.find(l => {
    const src = l.a || l.source;
    const tgt = l.b || l.target;
    return (src === u && tgt === v) || (src === v && tgt === u);
  });
}

function isNodeDown(topology, nodeId) {
  if (!topology || !topology.nodes) return false;
  const node = topology.nodes.find(n => (typeof n === 'string' ? n === nodeId : n.id === nodeId));
  if (!node) return false;
  return node.up === false || node.status === 'down';
}

/**
 * Simulates hop-by-hop packet forwarding through live routing tables with TTL.
 *
 * @param {Object} tables Current routing tables
 * @param {Object} topology Current topology
 * @param {string} source Source router ID
 * @param {string} destination Destination router ID
 * @param {number} initialTtl Initial TTL value (default 16)
 * @returns {Object} Complete trace result with hop records, loop detection, and explanations
 */
export function tracePacket(tables, topologyOrSource, sourceOrDest, destOrTtl, maybeTtl) {
  let topology = null;
  let source = '';
  let destination = '';
  let initialTtl = 16;

  if (typeof topologyOrSource === 'string') {
    // Called as tracePacket(tables, source, destination, initialTtl)
    topology = null;
    source = topologyOrSource;
    destination = sourceOrDest;
    initialTtl = destOrTtl ?? 16;
  } else {
    // Called as tracePacket(tables, topology, source, destination, initialTtl)
    topology = topologyOrSource;
    source = sourceOrDest;
    destination = destOrTtl;
    initialTtl = maybeTtl ?? 16;
  }

  if (!tables || !source || !destination) {
    return {
      hops: [],
      outcome: 'DROPPED_NO_ROUTE',
      message: 'Source or destination router is not specified.',
      loopDetected: false,
      totalCost: 0,
      delivered: false,
    };
  }

  // Validate if source router itself is powered off
  if (topology && isNodeDown(topology, source)) {
    return {
      hops: [
        {
          step: 1,
          router: source,
          tableEntry: { destination, cost: INFINITY, nextHop: null },
          outgoingLink: '—',
          linkCost: 0,
          ttlRemaining: initialTtl,
          cumulativeCost: 0,
          status: 'DROPPED_ROUTER_DOWN',
          isLoop: false,
          explanation: `Source Router ${source} is powered off / crashed. Packet cannot be generated.`,
          suggestion: 'Power on / restore Router ' + source + ' to send traffic.',
        },
      ],
      outcome: 'DROPPED_ROUTER_DOWN',
      summaryMessage: `Packet dropped: Source Router ${source} is crashed / powered off.`,
      loopDetected: false,
      totalCost: 0,
      delivered: false,
      ttlRemaining: initialTtl,
    };
  }

  const hops = [];
  const visitedSet = new Set();
  const visitedIndices = new Map(); // node -> first hop index
  let current = source;
  let ttl = Math.max(1, Math.min(64, Number(initialTtl) || 16));
  let cumulativeCost = 0;
  let outcome = 'IN_TRANSIT';
  let loopDetected = false;
  let loopStartNode = null;
  let loopHopIndex = null;

  while (ttl > 0) {
    const isAtDestination = current === destination;
    const tableEntry = tables[current]?.[destination] || { cost: INFINITY, nextHop: null };
    const nextHop = tableEntry.nextHop || null;
    const routeCost = tableEntry.cost ?? INFINITY;

    let outgoingLink = null;
    let linkCost = 0;
    let linkDown = false;
    let nextHopDown = false;

    if (!isAtDestination && nextHop) {
      if (topology && topology.links) {
        outgoingLink = findDirectLink(topology, current, nextHop);
        if (outgoingLink) {
          linkCost = outgoingLink.cost;
          linkDown = outgoingLink.up === false || outgoingLink.status === 'down';
        } else {
          linkDown = true;
        }
      } else {
        linkCost = 1;
        linkDown = false;
      }

      if (topology && isNodeDown(topology, nextHop)) {
        nextHopDown = true;
      }
    }


    const isLoop = visitedSet.has(current);
    if (isLoop && !loopDetected) {
      loopDetected = true;
      loopStartNode = current;
      loopHopIndex = visitedIndices.get(current);
    }
    visitedSet.add(current);
    if (!visitedIndices.has(current)) {
      visitedIndices.set(current, hops.length);
    }

    // Determine status & explanation for this hop
    let hopStatus = 'IN_TRANSIT';
    let explanation = '';
    let suggestion = '';

    if (isAtDestination) {
      outcome = 'DELIVERED';
      hopStatus = 'DELIVERED';
      explanation = `Packet successfully arrived at Destination Router ${destination}!`;
    } else if (nextHopDown) {
      outcome = 'DROPPED_ROUTER_DOWN';
      hopStatus = 'DROPPED_ROUTER_DOWN';
      explanation = `Router ${current} forwarded towards ${nextHop}, but next-hop Router ${nextHop} has CRASHED / powered down.`;
      suggestion = `Restore Router ${nextHop} or run another simulation round for neighboring routers to adapt.`;
    } else if (linkDown) {
      outcome = 'DROPPED_LINK_DOWN';
      hopStatus = 'DROPPED_LINK_DOWN';
      explanation = `Router ${current} attempted to forward via ${nextHop}, but link ${current}-${nextHop} is DOWN/CUT. Packet dropped.`;
      suggestion = `Run another simulation round so distance vectors propagate the link failure and reroute traffic.`;
    } else if (!nextHop || routeCost >= INFINITY) {
      outcome = 'DROPPED_NO_ROUTE';
      hopStatus = 'DROPPED_NO_ROUTE';
      explanation = `Router ${current} has no valid route to ${destination} (Cost is ∞ or Next Hop is null). Packet dropped.`;
      suggestion = `Advance the simulation by stepping or auto-running rounds to advertise routes to ${destination}.`;
    } else {
      cumulativeCost += linkCost;
      ttl--;

      if (ttl === 0) {
        outcome = loopDetected ? 'DROPPED_TTL_LOOP' : 'DROPPED_TTL';
        hopStatus = outcome;
        explanation = `Router ${current} forwarded to ${nextHop}, but Time-To-Live (TTL) reached 0. Packet dropped.`;
        suggestion = loopDetected
          ? `A routing loop was detected! Enable Split Horizon or Poison Reverse to prevent loop creation.`
          : `Increase initial TTL (e.g., from ${initialTtl} to 32) if the legitimate path has more hops.`;
      } else {
        hopStatus = isLoop ? 'LOOP_STEP' : 'FORWARDED';
        explanation = `Router ${current} looked up ${destination}, found metric ${routeCost} via ${nextHop}, and forwarded across link ${current}-${nextHop} (cost ${linkCost}). TTL is now ${ttl}.`;
      }
    }

    hops.push({
      step: hops.length + 1,
      router: current,
      tableEntry: {
        destination,
        cost: routeCost,
        nextHop,
      },
      outgoingLink: outgoingLink ? `${outgoingLink.a || outgoingLink.source}-${outgoingLink.b || outgoingLink.target}` : (nextHop ? `${current}-${nextHop}` : '—'),
      linkCost,
      ttlRemaining: ttl,
      cumulativeCost,
      status: hopStatus,
      isLoop,
      explanation,
      suggestion,
    });

    if (
      outcome === 'DELIVERED' ||
      outcome === 'DROPPED_LINK_DOWN' ||
      outcome === 'DROPPED_ROUTER_DOWN' ||
      outcome === 'DROPPED_NO_ROUTE' ||
      outcome === 'DROPPED_TTL' ||
      outcome === 'DROPPED_TTL_LOOP'
    ) {
      break;
    }

    current = nextHop;
  }

  let summaryMessage = '';
  const lastHopRecord = hops[hops.length - 1];
  if (outcome === 'DELIVERED') {
    summaryMessage = `Packet from ${source} to ${destination} delivered in ${hops.length - 1} hops, total cost ${cumulativeCost}, TTL left ${ttl}.`;
  } else if (outcome === 'DROPPED_TTL_LOOP') {
    summaryMessage = `Packet dropped: Routing loop detected involving Router ${loopStartNode}. TTL expired after ${initialTtl} hops.`;
  } else if (outcome === 'DROPPED_TTL') {
    summaryMessage = `Packet dropped: Time-To-Live (TTL) expired before reaching ${destination}.`;
  } else if (outcome === 'DROPPED_ROUTER_DOWN') {
    summaryMessage = `Packet dropped at Router ${current}: Next-hop router is crashed/down.`;
  } else if (outcome === 'DROPPED_LINK_DOWN') {
    summaryMessage = `Packet dropped at Router ${current}: Outgoing link to ${lastHopRecord?.tableEntry?.nextHop || 'neighbor'} is DOWN.`;
  } else {
    summaryMessage = `Packet dropped at Router ${current}: No route available to ${destination} (cost ∞).`;
  }


  return {
    source,
    destination,
    initialTtl,
    ttlRemaining: ttl,
    totalCost: cumulativeCost,
    hops,
    outcome,
    delivered: outcome === 'DELIVERED',
    loopDetected,
    loopStartNode,
    loopHopIndex,
    summaryMessage,
  };
}


/**
 * Runs a simulated Traceroute sending incremental TTL probes (1, 2, 3...)
 * to discover intermediate hops.
 */
export function runTraceroute(tables, topology, source, destination, maxProbes = 16) {
  const probes = [];
  let probeTtl = 1;
  let reached = false;

  while (probeTtl <= maxProbes && !reached) {
    const trace = tracePacket(tables, topology, source, destination, probeTtl);
    const lastHop = trace.hops[trace.hops.length - 1];

    probes.push({
      ttl: probeTtl,
      respondingRouter: lastHop?.router || '—',
      outcome: trace.outcome,
      costSoFar: trace.totalCost,
      reached: trace.delivered,
      status: trace.delivered
        ? 'Destination Reached'
        : trace.outcome === 'DROPPED_TTL' || trace.outcome === 'DROPPED_TTL_LOOP'
        ? `ICMP Time Exceeded from ${lastHop?.router}`
        : `ICMP Destination Unreachable (${lastHop?.router})`,
    });

    if (trace.delivered || trace.outcome === 'DROPPED_NO_ROUTE' || trace.outcome === 'DROPPED_LINK_DOWN') {
      reached = true;
    }

    probeTtl++;
  }

  return {
    source,
    destination,
    probes,
    completed: reached,
  };
}
