import React, { useState, useEffect } from 'react';
import { PRESET_TOPOLOGIES } from '../engine/presets.js';
import { runUntilConverged, initTables, runRound } from '../engine/distanceVector.js';
import { failLink } from '../engine/topology.js';

export default function QuizPage({ onOpenInSimulator }) {
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [streak, setStreak] = useState(0);

  // Generate a new engine-verified question
  const generateQuestion = (diff = difficulty) => {
    setIsAnswered(false);
    setSelectedOption(null);

    let topo = PRESET_TOPOLOGIES.triangle.topology;
    let topologyKey = 'triangle';

    if (diff === 'medium') {
      topo = PRESET_TOPOLOGIES.fiveRouter.topology;
      topologyKey = 'fiveRouter';
    } else if (diff === 'hard') {
      topo = PRESET_TOPOLOGIES.sixMesh.topology;
      topologyKey = 'sixMesh';
    }

    const { history, roundsTaken, finalTables } = runUntilConverged(topo);
    const nodes = (topo.nodes || []).map(n => (typeof n === 'string' ? n : n.id));

    // Question types:
    // 0: Final Cost from X to Y
    // 1: Next Hop from X to Y
    // 2: Total rounds to convergence
    // 3: Cost in intermediate round
    const qType = Math.floor(Math.random() * 4);

    if (qType === 0) {
      const src = nodes[0];
      const dst = nodes[nodes.length - 1];
      const correctCost = finalTables[src]?.[dst]?.cost;

      const wrong1 = correctCost + 2;
      const wrong2 = Math.max(1, correctCost - 1);
      const wrong3 = correctCost + 4;
      const options = Array.from(new Set([correctCost, wrong1, wrong2, wrong3])).sort(() => Math.random() - 0.5);

      setCurrentQuestion({
        type: 'final_cost',
        topologyKey,
        topology: topo,
        text: `In the ${PRESET_TOPOLOGIES[topologyKey].name}, what is Router ${src}'s shortest path cost to Destination ${dst} upon convergence?`,
        options: options.map(String),
        correctAnswer: String(correctCost),
        explanation: `Upon convergence, Router ${src} reaches ${dst} with optimal metric ${correctCost} via ${finalTables[src]?.[dst]?.nextHop || 'direct link'}.`,
      });
    } else if (qType === 1) {
      const src = nodes[0];
      const dst = nodes[nodes.length - 1];
      const correctNextHop = finalTables[src]?.[dst]?.nextHop || src;

      const candidateHops = nodes.filter(n => n !== src);
      const options = candidateHops.slice(0, 4).sort(() => Math.random() - 0.5);
      if (!options.includes(correctNextHop)) options[0] = correctNextHop;

      setCurrentQuestion({
        type: 'next_hop',
        topologyKey,
        topology: topo,
        text: `Which next-hop router does Router ${src} forward packets to when routing to ${dst} at convergence?`,
        options: options.sort(() => Math.random() - 0.5),
        correctAnswer: correctNextHop,
        explanation: `Router ${src} chooses next hop ${correctNextHop} because c(${src}, ${correctNextHop}) + D_${correctNextHop}(${dst}) minimizes total cost.`,
      });
    } else if (qType === 2) {
      const correctRounds = roundsTaken;
      const options = Array.from(new Set([correctRounds, correctRounds + 1, Math.max(1, correctRounds - 1), correctRounds + 2])).sort(() => Math.random() - 0.5);

      setCurrentQuestion({
        type: 'rounds',
        topologyKey,
        topology: topo,
        text: `How many synchronous vector exchange rounds are required for the ${PRESET_TOPOLOGIES[topologyKey].name} to achieve full convergence?`,
        options: options.map(String),
        correctAnswer: String(correctRounds),
        explanation: `The network stabilizes after ${correctRounds} rounds of vector exchanges when all Bellman-Ford calculations yield zero routing table updates.`,
      });
    } else {
      // Intermediate round question
      const round1 = runRound(initTables(topo), topo);
      const src = nodes[0];
      const dst = nodes[1] || nodes[0];
      const costRound1 = round1.newTables[src]?.[dst]?.cost;

      const options = Array.from(new Set([costRound1, costRound1 + 1, costRound1 + 3, 16])).sort(() => Math.random() - 0.5);

      setCurrentQuestion({
        type: 'round_cost',
        topologyKey,
        topology: topo,
        text: `After Round 1 of distance vector exchanges in the ${PRESET_TOPOLOGIES[topologyKey].name}, what is Router ${src}'s estimated distance to ${dst}?`,
        options: options.map(String),
        correctAnswer: String(costRound1),
        explanation: `In Round 1, Router ${src} incorporates direct neighbor advertisements, updating its estimate to ${costRound1}.`,
      });
    }
  };

  useEffect(() => {
    generateQuestion(difficulty);
  }, [difficulty]);

  const handleSelectOption = opt => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);
    setTotalAttempted(prev => prev + 1);

    if (opt === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px 64px 16px' }}>
      {/* Header & Score Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)' }}>
            Distance Vector Quiz &amp; Challenge Mode
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Interactive problem solver with questions dynamically verified by the Bellman-Ford engine.
          </p>
        </div>

        {/* Score & Streak Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Score</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-accent-blue)' }}>
              {score} / {totalAttempted}
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Streak</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>
              🔥 {streak}
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Difficulty Level:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn btn-sm ${difficulty === 'easy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDifficulty('easy')}
            >
              Easy (3 Routers)
            </button>
            <button
              className={`btn btn-sm ${difficulty === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDifficulty('medium')}
            >
              Medium (5 Routers)
            </button>
            <button
              className={`btn btn-sm ${difficulty === 'hard' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDifficulty('hard')}
            >
              Hard (Mesh Network)
            </button>
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2 className="card-title">Challenge Question</h2>
            <span className="badge badge-info">{PRESET_TOPOLOGIES[currentQuestion.topologyKey]?.name}</span>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.5 }}>
              {currentQuestion.text}
            </p>

            {/* Multiple Choice Options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {currentQuestion.options.map((opt, idx) => {
                let btnStyle = 'btn-secondary';
                if (isAnswered) {
                  if (opt === currentQuestion.correctAnswer) {
                    btnStyle = 'btn-primary'; // Green / primary
                  } else if (opt === selectedOption) {
                    btnStyle = 'btn-danger';
                  }
                }

                return (
                  <button
                    key={idx}
                    className={`btn ${btnStyle}`}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      justifyContent: 'flex-start',
                      fontFamily: 'var(--font-mono)',
                      background:
                        isAnswered && opt === currentQuestion.correctAnswer
                          ? 'var(--color-success-bg)'
                          : isAnswered && opt === selectedOption
                          ? 'var(--color-danger-bg)'
                          : undefined,
                      borderColor:
                        isAnswered && opt === currentQuestion.correctAnswer
                          ? 'var(--color-success-border)'
                          : isAnswered && opt === selectedOption
                          ? 'var(--color-danger-border)'
                          : undefined,
                      color:
                        isAnswered && opt === currentQuestion.correctAnswer
                          ? 'var(--color-success-text)'
                          : isAnswered && opt === selectedOption
                          ? 'var(--color-danger-text)'
                          : undefined,
                    }}
                    onClick={() => handleSelectOption(opt)}
                    disabled={isAnswered}
                  >
                    <span style={{ marginRight: '8px', color: 'var(--color-text-muted)' }}>
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback & Explanation */}
            {isAnswered && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background:
                    selectedOption === currentQuestion.correctAnswer
                      ? 'var(--color-success-bg)'
                      : 'var(--color-danger-bg)',
                  border: `1px solid ${
                    selectedOption === currentQuestion.correctAnswer
                      ? 'var(--color-success-border)'
                      : 'var(--color-danger-border)'
                  }`,
                  color:
                    selectedOption === currentQuestion.correctAnswer
                      ? 'var(--color-success-text)'
                      : 'var(--color-danger-text)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  {selectedOption === currentQuestion.correctAnswer ? '✓ Correct Answer!' : '✗ Incorrect'}
                </div>
                <div>{currentQuestion.explanation}</div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="card-footer" style={{ padding: '12px 16px', background: 'var(--color-bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenInSimulator(currentQuestion.topologyKey)}
              title="Load this topology into the live simulator canvas"
            >
              🔍 Show me in the Simulator
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => generateQuestion(difficulty)}
            >
              Next Question &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
