import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Search, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import {
  compareSessionsAsc,
  compareSessionsDesc,
  formatSessionDateTime,
  getSessionDateKey,
  getSessionInstant,
} from '../lib/sessionTime';

const CAT_MAP = {
  push:  { emoji: '💪', cls: 'cat-push',  label: 'Push' },
  pull:  { emoji: '🏋️', cls: 'cat-pull',  label: 'Pull' },
  legs:  { emoji: '🦵', cls: 'cat-legs',  label: 'Legs' },
  hiit:  { emoji: '⚡', cls: 'cat-hiit',  label: 'HIIT' },
  mixed: { emoji: '🔀', cls: 'cat-mixed', label: 'Mixed' },
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'longest', label: 'Longest session' },
  { value: 'shortest', label: 'Shortest session' },
];

function formatDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildHeatmap(logs) {
  const today = new Date(); today.setHours(0,0,0,0);
  const dayMap = {};
  logs.forEach(l => {
    const k = getSessionDateKey(l);
    if (k) dayMap[k] = (dayMap[k] || 0) + 1;
  });
  const cells = [];
  const cur = new Date(today);
  cur.setDate(today.getDate() - 83);
  while (cur <= today) {
    const k = formatDateKey(cur);
    cells.push({ date: k, count: dayMap[k] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

function Heatmap({ logs }) {
  const cells = useMemo(() => buildHeatmap(logs), [logs]);
  const totalCols = Math.ceil(cells.length / 7);

  return (
    <div className="card">
      <div className="section-header">
        <span className="section-title">Activity Heatmap</span>
        <span className="text-xs text-dim">Last 12 weeks</span>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalCols}, 13px)`,
          gridTemplateRows: 'repeat(7, 13px)',
          gap: 3,
          minWidth: 'max-content',
        }}>
          {cells.map((c, i) => {
            const lvl = c.count === 0 ? '' : c.count === 1 ? 'd1' : c.count === 2 ? 'd2' : 'd3';
            return (
              <div
                key={c.date}
                className={`heatmap-cell${lvl ? ' ' + lvl : ''}`}
                style={{ gridColumn: Math.floor(i / 7) + 1, gridRow: i % 7 + 1 }}
                title={`${c.date}: ${c.count} session${c.count !== 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.625rem', justifyContent: 'flex-end' }}>
        <span className="text-xs text-dim">Less</span>
        {['', 'd1', 'd2', 'd3'].map(d => (
          <div key={d || 'none'} className={`heatmap-cell${d ? ' ' + d : ''}`} style={{ width: 11, height: 11 }} />
        ))}
        <span className="text-xs text-dim">More</span>
      </div>
    </div>
  );
}

// Expandable session detail card
function SessionCard({ item, onDelete, syncing }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CAT_MAP[item.workoutType] || CAT_MAP.mixed;
  const toggleExpanded = () => setExpanded(v => !v);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };
  const dateStr = formatSessionDateTime(item, { weekday: true });

  return (
    <div
      className="session-card"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      style={{ flexDirection: 'column', gap: 0, cursor: 'pointer' }}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%' }}>
        <div className="session-dot" style={{ background: 'rgba(255,107,53,0.12)', flexShrink: 0 }}>{cat.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`cat-pill ${cat.cls}`}>{cat.label}</span>
            <span className="text-xs text-dim">{dateStr}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title || `${cat.label} Session`}
          </div>
          <div className="text-xs text-dim" style={{ marginTop: '0.1rem' }}>
            {[
              item.durationMinutes ? `${item.durationMinutes} min` : null,
              item.intensity,
              item.exercises?.length ? `${item.exercises.length} exercises` : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete(item.id); }}
            disabled={syncing}
            className="btn btn-danger btn-icon"
            title="Delete session"
          >
            <Trash2 size={14} />
          </button>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Expanded exercise breakdown */}
      {expanded && item.exercises?.length > 0 && (
        <div style={{ marginTop: '0.875rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', width: '100%' }}
          onClick={e => e.stopPropagation()}>
          <div className="section-title" style={{ marginBottom: '0.5rem' }}>Exercises</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {item.exercises.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.name}</span>
                <span className="text-xs text-dim" style={{ whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                  {ex.sets?.length ? `${ex.sets.length} sets` : ''}
                  {ex.sets?.[0]?.weight_kg ? ` · ${ex.sets[0].weight_kg}kg` : ''}
                </span>
              </div>
            ))}
          </div>
          {item.notes && (
            <div style={{ marginTop: '0.625rem', fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
              "{item.notes}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryView() {
  const { exerciseData, deleteExerciseLog, syncing } = useApp();
  const allLogs = useMemo(() => exerciseData?.logs || [], [exerciseData]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [showSort, setShowSort] = useState(false);

  const FILTERS = useMemo(() => [
    { v: 'all',   label: 'All',   count: allLogs.length },
    { v: 'push',  label: '💪 Push',  count: allLogs.filter(l => l.workoutType === 'push').length },
    { v: 'pull',  label: '🏋️ Pull',  count: allLogs.filter(l => l.workoutType === 'pull').length },
    { v: 'legs',  label: '🦵 Legs',  count: allLogs.filter(l => l.workoutType === 'legs').length },
    { v: 'hiit',  label: '⚡ HIIT',  count: allLogs.filter(l => l.workoutType === 'hiit').length },
    { v: 'mixed', label: '🔀 Mixed', count: allLogs.filter(l => l.workoutType === 'mixed').length },
  ], [allLogs]);

  const filtered = useMemo(() => {
    let result = filter === 'all' ? allLogs : allLogs.filter(l => l.workoutType === filter);

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q) ||
        l.exercises?.some(e => e.name?.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      if (sort === 'newest') return compareSessionsDesc(a, b);
      if (sort === 'oldest') return compareSessionsAsc(a, b);
      if (sort === 'longest') return (b.durationMinutes || 0) - (a.durationMinutes || 0);
      if (sort === 'shortest') return (a.durationMinutes || 0) - (b.durationMinutes || 0);
      return 0;
    });
  }, [allLogs, filter, query, sort]);

  // Group by time period
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(l => {
      const d = getSessionInstant(l);
      let key = 'Unknown date';
      if (d) {
        const now = new Date(); now.setHours(0,0,0,0);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        if (diffDays < 7) key = 'This Week';
        else if (diffDays < 14) key = 'Last Week';
        else if (diffDays < 31) key = 'This Month';
        else key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return groups;
  }, [filtered]);

  const clearSearch = useCallback(() => { setQuery(''); setFilter('all'); }, []);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Heatmap logs={allLogs} />

      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        <input
          type="text"
          className="input"
          placeholder="Search sessions, exercises..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '0.875rem' }}
        />
        {query && (
          <button onClick={() => setQuery('')}
            style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter chips + sort */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="chip-rail" style={{ flex: 1 }}>
          {FILTERS.map(f => (
            <button key={f.v} className={`chip${filter === f.v ? ' active' : ''}`} onClick={() => setFilter(f.v)}>
              {f.label}
              {f.count > 0 && <span style={{ opacity: 0.65, fontSize: '0.68rem' }}>{f.count}</span>}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            className={`chip${showSort ? ' active' : ''}`}
            onClick={() => setShowSort(v => !v)}
            style={{ gap: '0.3rem' }}
          >
            <SlidersHorizontal size={12} />
            Sort
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-fire)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden', zIndex: 200,
              minWidth: '170px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { setSort(o.value); setShowSort(false); }}
                  style={{
                    width: '100%', padding: '0.6rem 1rem', background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: '0.82rem',
                    color: sort === o.value ? 'var(--fire)' : 'var(--text-secondary)',
                    fontWeight: sort === o.value ? 700 : 400,
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,53,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {sort === o.value ? '✓ ' : ''}{o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active filter summary */}
      {(query || filter !== 'all') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-xs text-dim">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {query ? ` for "${query}"` : ''}
            {filter !== 'all' ? ` · ${filter}` : ''}
          </span>
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fire)', fontSize: '0.75rem', fontWeight: 600 }}>
            Clear filters
          </button>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {query ? `No sessions found for "${query}"` : 'No sessions match this filter.'}
          </div>
          <button className="btn btn-ghost" style={{ borderRadius: 'var(--radius-sm)' }} onClick={clearSearch}>
            Clear filters
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([period, items]) => (
          <div key={period}>
            <div className="section-header">
              <span className="section-title">{period}</span>
              <span className="text-xs text-dim">{items.length} session{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map(item => (
                <SessionCard
                  key={item.id}
                  item={item}
                  onDelete={deleteExerciseLog}
                  syncing={syncing}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
