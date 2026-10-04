import React, { useState, useEffect, useRef } from 'react';
import NetworkGraph from '../components/NetworkGraph.jsx';
import ControlsToolbar from '../components/ControlsToolbar.jsx';
import RouterTable from '../components/RouterTable.jsx';
import CalculationPanel from '../components/CalculationPanel.jsx';
import PacketTracerPanel from '../components/PacketTracerPanel.jsx';
import VectorExchangePanel from '../components/VectorExchangePanel.jsx';
import PathFinder from '../components/PathFinder.jsx';
import TimelinePanel from '../components/TimelinePanel.jsx';
import EventLog from '../components/EventLog.jsx';
import SummaryMatrixModal from '../components/SummaryMatrixModal.jsx';
import ShareModal from '../components/ShareModal.jsx';
import ShortcutsModal from '../components/ShortcutsModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
  LinkEditModal,
  AddNodeModal,
  ImportExportModal,
  ConnectRoutersModal,
} from '../components/TopologyModals.jsx';

import { PRESET_TOPOLOGIES } from '../engine/presets.js';
import {
  initSimulation,
  runRound,
} from '../engine/distanceVector.js';
import {
  addNode,
  removeNode,
  updateNode,
  addLink,
  removeLink,
  setLinkCost,
  setLinkLoss,
  setLinkDelay,
  setLinkStatus,
} from '../engine/topology.js';
import { encodeScenarioToUrl, decodeScenarioFromUrl } from '../utils/urlState.js';

export default function SimulatorPage() {
  const [selectedPreset, setSelectedPreset] = useState('blank');
  const [topology, setTopology] = useState(PRESET_TOPOLOGIES.blank.topology);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [options, setOptions] = useState({
    splitHorizon: false,
    poisonReverse: false,
  });

  const [simState, setSimState] = useState(() =>
    initSimulation(PRESET_TOPOLOGIES.blank.topology, options)
  );

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [highlightPath, setHighlightPath] = useState([]);
  const [droppedNodeId, setDroppedNodeId] = useState(null);
  const [packetTtl, setPacketTtl] = useState(null);
  const [isLoop, setIsLoop] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState(null);
  const [destNodeId, setDestNodeId] = useState(null);

  // Active side panel tab: 'table' | 'calc' | 'tracer' | 'log' | 'path'
  const [activeSideTab, setActiveSideTab] = useState('table');

  // Modals state
  const [editingLink, setEditingLink] = useState(null);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [confirmDeleteRouter, setConfirmDeleteRouter] = useState(null);

  // Interval timer ref for auto-run
  const runTimerRef = useRef(null);

  // Check URL hash on initial load to restore shared scenario if present
  useEffect(() => {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
      const decoded = decodeScenarioFromUrl(hash);
      if (decoded) {
        setTopology(decoded.topology);
        setOptions(decoded.options);
        reinitializeSim(decoded.topology, decoded.options);
      }
    }
  }, []);

  // Update URL hash when topology or options change for instant sharing
  useEffect(() => {
    const encoded = encodeScenarioToUrl(topology, options);
    if (encoded) {
      window.history.replaceState(null, '', `#${encoded}`);
    }
  }, [topology, options]);

  // Keep source and destination valid when nodes change
  useEffect(() => {
    const nodes = topology.nodes || [];
    if (nodes.length > 0) {
      const firstId = typeof nodes[0] === 'string' ? nodes[0] : nodes[0].id;
      const lastId = typeof nodes[nodes.length - 1] === 'string' ? nodes[nodes.length - 1] : nodes[nodes.length - 1].id;

      if (!selectedNodeId || !nodes.some(n => (typeof n === 'string' ? n : n.id) === selectedNodeId)) {
        setSelectedNodeId(firstId);
      }
      if (!sourceNodeId || !nodes.some(n => (typeof n === 'string' ? n : n.id) === sourceNodeId)) {
        setSourceNodeId(firstId);
      }
      if (!destNodeId || !nodes.some(n => (typeof n === 'string' ? n : n.id) === destNodeId)) {
        setDestNodeId(lastId);
      }
    } else {
      setSelectedNodeId(null);
      setSourceNodeId(null);
      setDestNodeId(null);
      setHighlightPath([]);
    }
  }, [topology]);

  // Reinitialize simulation when topology changes
  const reinitializeSim = (newTopo, newOpts = options) => {
    const freshState = initSimulation(newTopo, newOpts);
    setSimState(freshState);
    setIsRunning(false);
  };

  // Switch preset
  const handleSelectPreset = presetId => {
    setSelectedPreset(presetId);
    const preset = PRESET_TOPOLOGIES[presetId];
    if (preset) {
      setTopology(preset.topology);
      const firstNode = preset.topology.nodes[0]
        ? typeof preset.topology.nodes[0] === 'string'
          ? preset.topology.nodes[0]
          : preset.topology.nodes[0].id
        : null;
      const lastNode = preset.topology.nodes[preset.topology.nodes.length - 1]
        ? typeof preset.topology.nodes[preset.topology.nodes.length - 1] === 'string'
          ? preset.topology.nodes[preset.topology.nodes.length - 1]
          : preset.topology.nodes[preset.topology.nodes.length - 1].id
        : null;

      setSelectedNodeId(firstNode);
      setSourceNodeId(firstNode);
      setDestNodeId(lastNode);
      reinitializeSim(preset.topology);
    }
  };

  // Quick Add Router (spawns R1, R2, R3... at nice positions on canvas)
  const handleQuickAddNode = () => {
    const existingIds = new Set((topology.nodes || []).map(n => (typeof n === 'string' ? n : n.id)));

    let num = 1;
    while (existingIds.has(`R${num}`)) {
      num++;
    }
    const newId = `R${num}`;

    const count = topology.nodes.length;
    const defaultPositions = [
      { x: 180, y: 160 },
      { x: 500, y: 160 },
      { x: 340, y: 350 },
      { x: 180, y: 350 },
      { x: 500, y: 350 },
      { x: 340, y: 160 },
    ];
    const pos = defaultPositions[count % defaultPositions.length] || {
      x: 200 + ((count * 70) % 360),
      y: 180 + ((count * 50) % 200),
    };

    const newNode = {
      id: newId,
      name: `Router ${newId}`,
      x: pos.x,
      y: pos.y,
    };

    const updated = addNode(topology, newNode);
    setTopology(updated);
    setSelectedNodeId(newId);
    reinitializeSim(updated);
  };

  // Quick Connect Routers
  const handleConnectRouters = (sourceId, targetId) => {
    if (sourceId === targetId) return;

    const exists = (topology.links || []).some(l => {
      const src = l.a || l.source;
      const tgt = l.b || l.target;
      return (src === sourceId && tgt === targetId) || (src === targetId && tgt === sourceId);
    });

    if (exists) return;

    setEditingLink({
      source: sourceId,
      target: targetId,
      cost: 1,
      isNew: true,
    });
  };

  // Delete router confirmation trigger
  const handleDeleteNode = nodeId => {
    if (!nodeId) return;
    setConfirmDeleteRouter(nodeId);
  };

  const confirmDeleteNodeAction = () => {
    if (!confirmDeleteRouter) return;
    const updated = removeNode(topology, confirmDeleteRouter);
    setTopology(updated);
    setConfirmDeleteRouter(null);
    reinitializeSim(updated);
  };

  // Crash / Restore a whole router (all its links go down together)
  const handleCrashRouter = nodeId => {
    const isCurrentlyCrashed = (topology.links || []).every(
      l => ((l.a || l.source) === nodeId || (l.b || l.target) === nodeId) && (l.up === false || l.status === 'down')
    );

    const newStatus = isCurrentlyCrashed ? 'up' : 'down';
    let updated = topology;

    (topology.links || []).forEach(l => {
      const src = l.a || l.source;
      const tgt = l.b || l.target;
      if (src === nodeId || tgt === nodeId) {
        updated = setLinkStatus(updated, src, tgt, newStatus);
      }
    });

    setTopology(updated);
    setSimState(prev => ({
      ...prev,
      converged: false,
      events: [
        ...prev.events,
        {
          round: prev.round,
          type: 'link_change',
          message: `Dynamic Event: Router ${nodeId} ${newStatus === 'down' ? 'CRASHED (all links cut)' : 'RESTORED'}.`,
        },
      ],
    }));
  };

  // Toggle Algorithm Options
  const handleToggleOption = (key, val) => {
    const updated = { ...options, [key]: val };
    setOptions(updated);
    reinitializeSim(topology, updated);
  };

  // Step simulation forward
  const handleStep = () => {
    if (simState.converged || (topology.nodes || []).length === 0) return;
    const nextState = runRound(simState, topology, options);
    setSimState(nextState);
  };

  // Step backward in history
  const handleStepBack = () => {
    if (!simState.history || simState.history.length <= 1) return;
    const history = [...simState.history];
    history.pop();
    const prevSnapshot = history[history.length - 1];

    setSimState({
      ...prevSnapshot,
      history,
    });
    setIsRunning(false);
  };

  // Jump to specific round from history
  const handleSelectRound = roundNum => {
    const targetSnapshot = simState.history.find(h => h.round === roundNum);
    if (!targetSnapshot) return;
    const targetIdx = simState.history.findIndex(h => h.round === roundNum);

    setSimState({
      ...targetSnapshot,
      history: simState.history.slice(0, targetIdx + 1),
    });
    setIsRunning(false);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        handleStep();
      } else if (e.key === 'b' || e.key === 'B') {
        handleStepBack();
      } else if (e.key === 'r' || e.key === 'R') {
        reinitializeSim(topology);
      } else if (e.key === '?') {
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [topology, simState]);

  // Auto-play loop
  useEffect(() => {
    if (isRunning) {
      if (simState.converged || (topology.nodes || []).length === 0) {
        setIsRunning(false);
        return;
      }
      runTimerRef.current = setTimeout(() => {
        setSimState(prev => {
          if (prev.converged) {
            setIsRunning(false);
            return prev;
          }
          return runRound(prev, topology, options);
        });
      }, speed);
    }
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current);
    };
  }, [isRunning, simState, speed, topology, options]);

  // Topology node updates
  const handleUpdateNodePosition = (nodeId, x, y) => {
    setTopology(prev => updateNode(prev, nodeId, { x, y }));
  };

  const handleAddNode = newNode => {
    const updated = addNode(topology, newNode);
    setTopology(updated);
    setSelectedNodeId(newNode.id);
    reinitializeSim(updated);
  };

  const handleAddLink = (src, tgt, cost, lossPercent = 0, delayMs = 1) => {
    const updated = addLink(topology, src, tgt, cost, lossPercent, delayMs);
    setTopology(updated);
    reinitializeSim(updated);
  };

  const handleSaveLinkCost = (linkId, newCost) => {
    const updated = setLinkCost(topology, linkId, newCost);
    setTopology(updated);
    setSimState(prev => ({
      ...prev,
      converged: false,
      events: [
        ...prev.events,
        {
          round: prev.round,
          type: 'link_change',
          message: `Dynamic Event: Link ${linkId} cost changed to ${newCost}. Recalculation triggered.`,
        },
      ],
    }));
  };

  const handleSaveLinkProperties = (linkId, { cost, lossPercent, delayMs }) => {
    let updated = setLinkCost(topology, linkId, cost);
    if (typeof lossPercent === 'number') {
      updated = setLinkLoss(updated, linkId, lossPercent);
    }
    if (typeof delayMs === 'number') {
      updated = setLinkDelay(updated, linkId, delayMs);
    }
    setTopology(updated);
    setSimState(prev => ({
      ...prev,
      converged: false,
      events: [
        ...prev.events,
        {
          round: prev.round,
          type: 'link_change',
          message: `Dynamic Event: Link ${linkId} properties updated (cost=${cost}, delay=${delayMs ?? 1}ms, loss=${lossPercent ?? 0}%). Recalculation triggered.`,
        },
      ],
    }));
  };

  const handleToggleLinkStatus = (linkId, status) => {
    const updated = setLinkStatus(topology, linkId, status);
    setTopology(updated);
    setSimState(prev => ({
      ...prev,
      converged: false,
      events: [
        ...prev.events,
        {
          round: prev.round,
          type: 'link_change',
          message: `Dynamic Event: Link ${linkId} is now ${status.toUpperCase()}.`,
        },
      ],
    }));
  };

  const handleDeleteLink = linkId => {
    const updated = removeLink(topology, linkId);
    setTopology(updated);
    reinitializeSim(updated);
  };

  const handleImportTopology = importedTopo => {
    setTopology(importedTopo);
    const firstNode = importedTopo.nodes[0]
      ? typeof importedTopo.nodes[0] === 'string'
        ? importedTopo.nodes[0]
        : importedTopo.nodes[0].id
      : null;
    const lastNode = importedTopo.nodes[importedTopo.nodes.length - 1]
      ? typeof importedTopo.nodes[importedTopo.nodes.length - 1] === 'string'
        ? importedTopo.nodes[importedTopo.nodes.length - 1]
        : importedTopo.nodes[importedTopo.nodes.length - 1].id
      : null;

    setSelectedNodeId(firstNode);
    setSourceNodeId(firstNode);
    setDestNodeId(lastNode);
    reinitializeSim(importedTopo);
  };

  // Load Educational Scenario for Packet Tracer
  const handleLoadScenario = scen => {
    if (!scen) return;
    let baseTopo = topology;
    if (scen.presetKey && PRESET_TOPOLOGIES[scen.presetKey]) {
      baseTopo = PRESET_TOPOLOGIES[scen.presetKey].topology;
      setSelectedPreset(scen.presetKey);
    }
    if (scen.cutLink) {
      const [u, v] = scen.cutLink.split('-');
      baseTopo = setLinkStatus(baseTopo, u, v, 'down');
    }
    setTopology(baseTopo);
    setSelectedNodeId(scen.source);
    setSourceNodeId(scen.source);
    setDestNodeId(scen.destination);

    const freshState = initSimulation(baseTopo, options);
    if (scen.customTables) {
      freshState.tables = { ...freshState.tables, ...scen.customTables };
    }
    setSimState(freshState);
    setIsRunning(false);
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="simulator-layout">
        {/* Left Column: Canvas & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ControlsToolbar
            simState={simState}
            isRunning={isRunning}
            speed={speed}
            onSpeedChange={setSpeed}
            onStep={handleStep}
            onToggleRun={() => setIsRunning(!isRunning)}
            onReset={() => reinitializeSim(topology)}
            onStepBack={handleStepBack}
            options={options}
            onToggleOption={handleToggleOption}
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            onOpenImportExport={() => setIsImportExportOpen(true)}
            onOpenSummary={() => setIsSummaryOpen(true)}
          />

          <NetworkGraph
            topology={topology}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNodePosition={handleUpdateNodePosition}
            onOpenLinkModal={link => setEditingLink(link)}
            onQuickAddNode={handleQuickAddNode}
            onDeleteNode={handleDeleteNode}
            onConnectRouters={handleConnectRouters}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            highlightPath={highlightPath}
            droppedNodeId={droppedNodeId}
            packetTtl={packetTtl}
            isLoop={isLoop}
            messages={simState.messages}
            animating={isRunning}
          />

          {/* Quick Node Actions Bar */}
          {selectedNodeId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 14px' }}>
              <div style={{ fontSize: '13px' }}>
                Selected: <strong>Router {selectedNodeId}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCrashRouter(selectedNodeId)}
                  title="Simulate crash of this router by taking down all connected links"
                >
                  💥 Crash / Restore {selectedNodeId}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsShareOpen(true)}
                  title="Share this scenario via URL / QR code"
                >
                  🔗 Share Scenario
                </button>
              </div>
            </div>
          )}

          <VectorExchangePanel
            topology={topology}
            messages={simState.messages}
            round={simState.round}
            options={options}
          />

          <TimelinePanel
            history={simState.history}
            currentRound={simState.round}
            onSelectRound={handleSelectRound}
          />
        </div>

        {/* Right Column: Tabbed Inspector Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Side Panel Tabs */}
          <div style={{ display: 'flex', background: 'var(--color-bg-muted)', padding: '4px', borderRadius: '6px', gap: '4px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${activeSideTab === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
              onClick={() => setActiveSideTab('table')}
            >
              Routing Table
            </button>
            <button
              className={`btn btn-sm ${activeSideTab === 'calc' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
              onClick={() => setActiveSideTab('calc')}
            >
              Calculation &amp; Matrix
            </button>
            <button
              className={`btn btn-sm ${activeSideTab === 'tracer' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
              onClick={() => setActiveSideTab('tracer')}
            >
              Packet Tracer
            </button>
            <button
              className={`btn btn-sm ${activeSideTab === 'log' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
              onClick={() => setActiveSideTab('log')}
            >
              Event Log
            </button>
          </div>

          {/* Active Tab View */}
          {activeSideTab === 'table' && (
            <RouterTable
              topology={topology}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              tables={simState.tables}
              previousTables={simState.previousTables}
              round={simState.round}
            />
          )}

          {activeSideTab === 'calc' && (
            <CalculationPanel
              topology={topology}
              selectedNodeId={selectedNodeId}
              tables={simState.tables}
              options={options}
            />
          )}

          {activeSideTab === 'tracer' && (
            <PacketTracerPanel
              topology={topology}
              tables={simState.tables}
              round={simState.round}
              onHighlightPath={setHighlightPath}
              onStepSimulation={handleStep}
              onLoadScenario={handleLoadScenario}
              onUpdateTraceStatus={({ droppedNodeId: dId, packetTtl: pTtl, isLoop: l }) => {
                setDroppedNodeId(dId);
                setPacketTtl(pTtl);
                setIsLoop(l);
              }}
            />
          )}

          {activeSideTab === 'log' && (
            <EventLog events={simState.events} />
          )}

          {/* Shortest Path Tracing is always available */}
          <PathFinder
            topology={topology}
            tables={simState.tables}
            sourceNodeId={sourceNodeId}
            setSourceNodeId={setSourceNodeId}
            destNodeId={destNodeId}
            setDestNodeId={setDestNodeId}
            onPathCalculated={setHighlightPath}
          />
        </div>
      </div>


      {/* Modal Dialogs */}
      <LinkEditModal
        isOpen={Boolean(editingLink)}
        link={editingLink}
        onClose={() => setEditingLink(null)}
        onSaveCost={handleSaveLinkCost}
        onSaveProperties={handleSaveLinkProperties}
        onToggleStatus={handleToggleLinkStatus}
        onDeleteLink={handleDeleteLink}
        onAddLink={handleAddLink}
      />

      <AddNodeModal
        isOpen={isAddNodeOpen}
        onClose={() => setIsAddNodeOpen(false)}
        onAddNode={handleAddNode}
        existingNodes={topology.nodes}
      />

      <ConnectRoutersModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        nodes={topology.nodes}
        onConnect={handleAddLink}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        topology={topology}
        onImportTopology={handleImportTopology}
      />

      <SummaryMatrixModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        topology={topology}
        tables={simState.tables}
        round={simState.round}
        converged={simState.converged}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        shareUrl={window.location.href}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteRouter)}
        title="Confirm Router Deletion"
        message={`Are you sure you want to delete Router ${confirmDeleteRouter}? All connected links will be permanently removed.`}
        confirmText="Delete Router"
        isDanger={true}
        onConfirm={confirmDeleteNodeAction}
        onClose={() => setConfirmDeleteRouter(null)}
      />
    </div>
  );
}
