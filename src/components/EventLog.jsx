import React, { useState, useRef, useEffect } from 'react';

export default function EventLog({ events = [] }) {
  const [maxEvents, setMaxEvents] = useState(25);
  const [filterText, setFilterText] = useState('');
  const logContainerRef = useRef(null);

  // Filter events by text query
  const filteredEvents = events.filter(evt => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      (evt.message && evt.message.toLowerCase().includes(q)) ||
      (evt.routerId && evt.routerId.toLowerCase().includes(q)) ||
      String(evt.round).includes(q)
    );
  });

  // Limit number of events shown according to maxEvents setting
  const displayedEvents =
    maxEvents === 'ALL'
      ? filteredEvents
      : filteredEvents.slice(-Math.max(1, Number(maxEvents)));

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedEvents.length]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          Protocol Event Log
        </div>

        {/* Edit number of events & filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Show:</label>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '2px 6px', fontSize: '11px' }}
            value={maxEvents}
            onChange={e => setMaxEvents(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            title="Configure number of recent events to display"
          >
            <option value={10}>10 events</option>
            <option value={25}>25 events</option>
            <option value={50}>50 events</option>
            <option value={100}>100 events</option>
            <option value="ALL">All events</option>
          </select>
        </div>
      </div>

      <div style={{ padding: '6px 12px', background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          placeholder="Filter log (e.g. R1, cost, converged)..."
          className="form-input"
          style={{ padding: '3px 8px', fontSize: '12px', flex: 1 }}
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        {filterText && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '2px 6px', fontSize: '11px' }}
            onClick={() => setFilterText('')}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          Showing {displayedEvents.length} of {events.length}
        </span>
      </div>

      <div
        ref={logContainerRef}
        className="card-body text-mono"
        style={{
          padding: '8px 12px',
          maxHeight: '220px',
          overflowY: 'auto',
          fontSize: '12px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {displayedEvents.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)', padding: '8px' }}>
            {events.length === 0 ? 'No protocol events logged yet.' : 'No events match your filter query.'}
          </div>
        ) : (
          displayedEvents.map((evt, idx) => {
            const isConverged = evt.type === 'converged';
            const isUpdate = evt.type === 'update';

            return (
              <div
                key={idx}
                style={{
                  padding: '4px 6px',
                  borderRadius: '3px',
                  background: isConverged
                    ? 'var(--color-success-bg)'
                    : isUpdate
                    ? '#f8fafc'
                    : 'transparent',
                  borderLeft: isConverged
                    ? '3px solid var(--color-success-border)'
                    : isUpdate
                    ? '3px solid var(--color-accent-blue)'
                    : '3px solid #cbd5e1',
                  color: isConverged ? 'var(--color-success-text)' : 'var(--color-text-main)',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', marginRight: '6px', fontSize: '11px' }}>
                  [R{evt.round}]
                </span>
                <span>{evt.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
