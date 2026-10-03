import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function NetworkGraph({
  topology,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onOpenLinkModal,
  onQuickAddNode,
  onDeleteNode,
  onConnectRouters,
  onOpenConnectModal,
  highlightPath = [],
  droppedNodeId = null,
  packetTtl = null,
  animating = false,
  isLoop = false,
}) {
  const svgRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragMoved, setIsDragMoved] = useState(false);

  // Connection mode state (click + Connect Routers -> click R1 -> click/drag to R2)
  const [connectingSourceId, setConnectingSourceId] = useState(null);
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nodes = topology.nodes || [];
  const links = topology.links || [];

  // Helper to normalize node objects
  const nodeMap = new Map();
  nodes.forEach(n => {
    const id = typeof n === 'string' ? n : n.id;
    const name = typeof n === 'string' ? `Router ${n}` : n.name || `Router ${n.id}`;
    const x = n.x ?? 150;
    const y = n.y ?? 150;
    nodeMap.set(id, { id, name, x, y, raw: n });
  });

  // Shortest / active path edge set for highlighting
  const pathEdgeSet = new Set();
  const loopEdgeSet = new Set();
  const seenEdges = new Set();

  if (highlightPath && highlightPath.length > 1) {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      const u = highlightPath[i];
      const v = highlightPath[i + 1];
      const edgeKey = [u, v].sort().join('-');
      if (seenEdges.has(edgeKey)) {
        loopEdgeSet.add(edgeKey);
      } else {
        seenEdges.add(edgeKey);
      }
      pathEdgeSet.add(edgeKey);
    }
  }

  // Convert client touch/mouse coords to SVG coordinates (0..720, 0..480)
  const getSvgCoordinates = useCallback(e => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 480 / rect.height;
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (clientX === undefined && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (clientX === undefined && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined) {
      return { x: 0, y: 0 };
    }

    const x = Math.round(Math.max(20, Math.min(700, (clientX - rect.left) * scaleX)));
    const y = Math.round(Math.max(20, Math.min(460, (clientY - rect.top) * scaleY)));
    return { x, y };
  }, []);

  // Find closest target router to cursor for magnetic snap
  const getClosestTargetNodeId = useCallback((pos, sourceId) => {
    let closestId = null;
    let minDistanceSq = 44 * 44; // 44px snap radius

    nodeMap.forEach(n => {
      if (n.id === sourceId) return;
      const dx = n.x - pos.x;
      const dy = n.y - pos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestId = n.id;
      }
    });

    return closestId;
  }, [nodeMap]);

  // Handle pointer down on a Router Node (Touch + Mouse support)
  const handlePointerDownNode = (e, nodeId) => {
    e.stopPropagation();

    // If currently in connection mode
    if (connectingSourceId) {
      if (connectingSourceId === 'WAITING_FOR_FIRST') {
        setConnectingSourceId(nodeId);
        setHoveredTargetNodeId(null);
        const pos = getSvgCoordinates(e);
        setMousePos(pos);
      } else if (connectingSourceId !== nodeId) {
        if (onConnectRouters) {
          onConnectRouters(connectingSourceId, nodeId);
        }
        setConnectingSourceId(null);
        setHoveredTargetNodeId(null);
      } else {
        setConnectingSourceId(null);
        setHoveredTargetNodeId(null);
      }
      return;
    }

    onSelectNode(nodeId);
    setDraggingNodeId(nodeId);
    setIsDragMoved(false);

    const pos = getSvgCoordinates(e);
    const node = nodeMap.get(nodeId);
    if (node) {
      setDragOffset({
        x: pos.x - node.x,
        y: pos.y - node.y,
      });
    }
  };

  const handlePointerMove = useCallback(e => {
    const pos = getSvgCoordinates(e);
    setMousePos(pos);

    // If actively in connection mode with a selected first router
    if (connectingSourceId && connectingSourceId !== 'WAITING_FOR_FIRST') {
      const targetId = getClosestTargetNodeId(pos, connectingSourceId);
      setHoveredTargetNodeId(targetId);
      return;
    }

    // If dragging to reposition a router
    if (draggingNodeId) {
      setIsDragMoved(true);
      const newX = Math.max(40, Math.min(680, pos.x - dragOffset.x));
      const newY = Math.max(40, Math.min(440, pos.y - dragOffset.y));
      onUpdateNodePosition(draggingNodeId, newX, newY);
    }
  }, [connectingSourceId, draggingNodeId, dragOffset, getClosestTargetNodeId, getSvgCoordinates, onUpdateNodePosition]);

  const handlePointerUp = useCallback(() => {
    // If user dragged from Router 1 to Router 2 and released
    if (connectingSourceId && connectingSourceId !== 'WAITING_FOR_FIRST' && hoveredTargetNodeId) {
      if (onConnectRouters) {
        onConnectRouters(connectingSourceId, hoveredTargetNodeId);
      }
      setConnectingSourceId(null);
      setHoveredTargetNodeId(null);
    }

    setDraggingNodeId(null);
  }, [connectingSourceId, hoveredTargetNodeId, onConnectRouters]);

  // Window fallback to guarantee release event is never missed on desktop
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (draggingNodeId) {
        handlePointerUp();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [draggingNodeId, handlePointerUp]);

  const handleCanvasClick = () => {
    if (isDragMoved) return;
    if (connectingSourceId) {
      setConnectingSourceId(null);
      setHoveredTargetNodeId(null);
    }
  };

  const connectingSourceNode = connectingSourceId && connectingSourceId !== 'WAITING_FOR_FIRST'
    ? nodeMap.get(connectingSourceId)
    : null;
  const hoveredTargetNode = hoveredTargetNodeId ? nodeMap.get(hoveredTargetNodeId) : null;

  // Build SVG path string for animated packet trail
  let packetPathString = '';
  if (highlightPath.length > 1) {
    const coords = highlightPath.map(id => nodeMap.get(id)).filter(Boolean);
    if (coords.length > 1) {
      packetPathString = `M ${coords[0].x} ${coords[0].y} ` + coords.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Canvas Header & Action Controls */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          Topology Graph &amp; Visual Canvas
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onQuickAddNode}
            title="Place a new router (R1, R2...) on the canvas"
          >
            + Add Router
          </button>

          <button
            className={`btn btn-sm ${connectingSourceId ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => {
              if (connectingSourceId) {
                setConnectingSourceId(null);
                setHoveredTargetNodeId(null);
              } else {
                setConnectingSourceId('WAITING_FOR_FIRST');
              }
            }}
            disabled={nodes.length < 2}
            title="Connect two router endpoints with a link"
          >
            {connectingSourceId ? '✕ Cancel' : '+ Connect Routers'}
          </button>

          {selectedNodeId && nodes.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: '#dc2626' }}
              onClick={() => onDeleteNode(selectedNodeId)}
              title={`Delete selected Router ${selectedNodeId}`}
            >
              Delete {selectedNodeId}
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: '420px',
          background: 'linear-gradient(to right, rgba(226,232,240,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onClick={handleCanvasClick}
      >
        {/* Interactive Guidance Banner */}
        {connectingSourceId && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f2b48',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: 600,
              zIndex: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '90%',
              textAlign: 'center',
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: hoveredTargetNodeId ? '#10b981' : '#38bdf8', display: 'inline-block', flexShrink: 0 }}></span>
            <span>
              {connectingSourceId === 'WAITING_FOR_FIRST'
                ? 'Step 1: Click the 1st router (e.g. R1)'
                : hoveredTargetNodeId
                ? `⚡ Click to connect Router ${connectingSourceId} ↔ Router ${hoveredTargetNodeId}`
                : `Step 2: Click the 2nd router to link with Router ${connectingSourceId}`}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                setConnectingSourceId(null);
                setHoveredTargetNodeId(null);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Blank Canvas Empty State Prompt */}
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              gap: '12px',
              pointerEvents: 'none',
              padding: '16px',
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #6366f1' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                <circle cx="12" cy="12" r="9"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                Topology Canvas is Blank
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '380px', lineHeight: 1.5 }}>
                Tap <strong>+ Add Router</strong> above to place <strong>R1</strong>, <strong>R2</strong>... and drag them freely. Then click <strong>+ Connect Routers</strong> to link them together.
              </p>
            </div>
          </div>
        )}

        {/* SVG Canvas with Unified Pointer & Touch Events */}
        <svg
          ref={svgRef}
          viewBox="0 0 720 480"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: connectingSourceNode ? 'crosshair' : draggingNodeId ? 'grabbing' : connectingSourceId ? 'crosshair' : 'default',
            touchAction: 'none',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
            </filter>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links (Undirected edges) */}
          {links.map((link, idx) => {
            const srcId = link.a || link.source;
            const tgtId = link.b || link.target;
            const src = nodeMap.get(srcId);
            const tgt = nodeMap.get(tgtId);
            if (!src || !tgt) return null;

            const canonicalId = [srcId, tgtId].sort().join('-');
            const isHighlighted = pathEdgeSet.has(canonicalId);
            const isLoopEdge = loopEdgeSet.has(canonicalId);
            const isDown = link.up === false || link.status === 'down';

            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={link.id || `${srcId}-${tgtId}-${idx}`}>
                {/* Shortest path / Loop path glowing overlay */}
                {isHighlighted && !isDown && (
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isLoopEdge ? '#f59e0b' : '#38bdf8'}
                    strokeWidth={isLoopEdge ? '12' : '10'}
                    strokeDasharray={isLoopEdge ? '8 4' : 'none'}
                    strokeLinecap="round"
                    opacity="0.85"
                    filter="url(#glow)"
                  />
                )}

                {/* Base Link Line */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isDown ? '#ef4444' : isLoopEdge ? '#d97706' : isHighlighted ? '#0284c7' : '#94a3b8'}
                  strokeWidth={isHighlighted ? 4 : isDown ? 2.5 : 3}
                  strokeDasharray={isDown ? '6 4' : isLoopEdge ? '4 2' : 'none'}
                  strokeLinecap="round"
                />

                {/* Animated vector message packets if running rounds */}
                {animating && !isDown && !prefersReducedMotion && (
                  <circle r="5" fill="#2563eb" opacity="0.9">
                    <animateMotion
                      path={`M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Link Cost Badge - Expanded Touch Target */}
                <g
                  transform={`translate(${midX}, ${midY})`}
                  style={{ cursor: 'pointer', touchAction: 'none' }}
                  onPointerDown={e => {
                    e.stopPropagation();
                    onOpenLinkModal(link);
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    onOpenLinkModal(link);
                  }}
                  title={`Link ${srcId}-${tgtId}: Cost ${link.cost} (${isDown ? 'DOWN' : 'UP'}). Tap to edit or fail link.`}
                >
                  {/* Invisible enlarged touch area */}
                  <rect x="-26" y="-18" width="52" height="36" fill="transparent" />
                  
                  <rect
                    x="-22"
                    y="-14"
                    width="44"
                    height="28"
                    rx="6"
                    fill={isDown ? '#fee2e2' : isLoopEdge ? '#fef3c7' : isHighlighted ? '#e0f2fe' : '#ffffff'}
                    stroke={isDown ? '#ef4444' : isLoopEdge ? '#f59e0b' : isHighlighted ? '#0284c7' : '#cbd5e1'}
                    strokeWidth="1.5"
                    filter="url(#shadow)"
                  />
                  <text
                    textAnchor="middle"
                    dy="5"
                    fill={isDown ? '#dc2626' : isLoopEdge ? '#b45309' : '#0f172a'}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {isDown ? 'FAIL' : link.cost}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Rubberband live wire preview when connecting routers */}
          {connectingSourceNode && (
            <g pointerEvents="none">
              <line
                x1={connectingSourceNode.x}
                y1={connectingSourceNode.y}
                x2={hoveredTargetNode ? hoveredTargetNode.x : mousePos.x}
                y2={hoveredTargetNode ? hoveredTargetNode.y : mousePos.y}
                stroke={hoveredTargetNode ? '#10b981' : '#38bdf8'}
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.5"
                filter="url(#glow)"
              />
              <line
                x1={connectingSourceNode.x}
                y1={connectingSourceNode.y}
                x2={hoveredTargetNode ? hoveredTargetNode.x : mousePos.x}
                y2={hoveredTargetNode ? hoveredTargetNode.y : mousePos.y}
                stroke={hoveredTargetNode ? '#059669' : '#2563eb'}
                strokeWidth="3.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
              <circle
                cx={hoveredTargetNode ? hoveredTargetNode.x : mousePos.x}
                cy={hoveredTargetNode ? hoveredTargetNode.y : mousePos.y}
                r="6"
                fill={hoveredTargetNode ? '#10b981' : '#2563eb'}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Moving Packet Marker along the path */}
          {packetPathString && !prefersReducedMotion && (
            <g>
              <g>
                <animateMotion
                  path={packetPathString}
                  dur={`${Math.max(1.2, highlightPath.length * 0.75)}s`}
                  repeatCount="indefinite"
                >
                  <mpath href="#packet-path" />
                </animateMotion>
                <circle r="10" fill={isLoop ? '#f59e0b' : '#2563eb'} stroke="#ffffff" strokeWidth="2.5" filter="url(#shadow)" />
                {packetTtl !== null && (
                  <g transform="translate(14, -8)">
                    <rect x="-4" y="-10" width="38" height="16" rx="4" fill="#0f2b48" opacity="0.92" />
                    <text x="15" y="2" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700">
                      TTL {packetTtl}
                    </text>
                  </g>
                )}
              </g>
            </g>
          )}

          {/* Router Nodes with Touch & Pointer support */}
          {Array.from(nodeMap.values()).map(node => {
            const isSelected = node.id === selectedNodeId;
            const isPathNode = highlightPath.includes(node.id);
            const isConnectingSource = node.id === connectingSourceId;
            const isTargetHovered = node.id === hoveredTargetNodeId;
            const isDropped = droppedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={e => handlePointerDownNode(e, node.id)}
                onTouchStart={e => handlePointerDownNode(e, node.id)}
                style={{
                  cursor: connectingSourceId
                    ? isConnectingSource
                      ? 'default'
                      : 'pointer'
                    : 'grab',
                  touchAction: 'none',
                }}
              >
                {/* Large invisible circle to guarantee touch hit accuracy on mobile */}
                <circle r="40" fill="transparent" />

                {/* Magnetic Target Snap Indicator when in connection mode */}
                {isTargetHovered && (
                  <circle
                    r="36"
                    fill="rgba(16, 185, 129, 0.18)"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="6 3"
                    filter="url(#glow)"
                    pointerEvents="none"
                  />
                )}

                {/* Active Selection / Shortest Path / Connecting Ring */}
                {(isSelected || isPathNode || isConnectingSource) && !isTargetHovered && (
                  <circle
                    r="34"
                    fill="none"
                    stroke={isConnectingSource ? '#f59e0b' : isSelected ? '#2563eb' : '#38bdf8'}
                    strokeWidth="3.5"
                    strokeDasharray={isConnectingSource ? '5 3' : isSelected ? 'none' : '4 3'}
                    opacity="0.95"
                    pointerEvents="none"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r="26"
                  fill={
                    isDropped
                      ? '#dc2626'
                      : isTargetHovered
                      ? '#059669'
                      : isConnectingSource
                      ? '#d97706'
                      : isSelected
                      ? '#1e3a8a'
                      : isPathNode
                      ? '#0369a1'
                      : '#0f2b48'
                  }
                  stroke="#ffffff"
                  strokeWidth="3"
                  filter="url(#shadow)"
                  pointerEvents="none"
                />

                {/* Node ID */}
                <text
                  textAnchor="middle"
                  dy="5"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                >
                  {node.id}
                </text>

                {/* Drop Marker Cross (✕) if packet dropped here */}
                {isDropped && (
                  <g transform="translate(18, -18)" pointerEvents="none">
                    <circle r="10" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                    <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="11" fontWeight="bold">✕</text>
                  </g>
                )}

                {/* Node Label underneath */}
                <text
                  textAnchor="middle"
                  dy="42"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Quick Tips Legend */}
        {nodes.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f2b48' }}></span>
              <span><strong>Drag</strong> router to position</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></span>
              <span>Click <strong>+ Connect Routers</strong> to link</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

