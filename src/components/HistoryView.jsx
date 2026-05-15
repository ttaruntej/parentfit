import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, Image as ImageIcon, Download } from 'lucide-react';
import {
  compareSessionsAsc,
  compareSessionsDesc,
  formatSessionDateTime,
  getSessionDateKey,
  getSessionInstant,
} from '../lib/sessionTime';
import { buildSessionsCsv, downloadCsv } from '../lib/csv';
import SessionDetailModal from './SessionDetailModal';

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

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n) { return String(n).padStart(2, '0'); }

// Build month-by-month calendars from the earliest session up to today.
function buildMonths(logs) {
  const dayMap = {};
  let earliest = null;
  logs.forEach((l) => {
    const k = getSessionDateKey(l);
    if (!k) return;
    dayMap[k] = (dayMap[k] || 0) + 1;
    if (!earliest || k < earliest) earliest = k;
  });

  const today = new Date();
  let startY = today.getFullYear();
  let startM = today.getMonth();
  if (earliest) {
    const [ey, em] = earliest.split('-').map(Number);
    startY = ey;
    startM = em - 1;
  }

  const months = [];
  let y = today.getFullYear();
  let m = today.getMonth();
  while (months.length < 12) {
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${y}-${pad(m + 1)}-${pad(d)}`;
      cells.push({ day: d, date, count: dayMap[date] || 0 });
    }
    months.push({
      key: `${y}-${m}`,
      label: first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      cells,
    });
    if (y === startY && m === startM) break;
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
  }
  return months;
}

function DayCell({ cell, selected, onPick }) {
  const has = cell.count > 0;
  const lvl = cell.count === 0 ? '' : cell.count === 1 ? 'd1' : cell.count === 2 ? 'd2' : 'd3';
  return (
    <button
      type="button"
      disabled={!has}
      onClick={() => onPick(selected ? null : cell.date)}
      title={`${cell.date}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
      className={`heatmap-cell${lvl ? ' ' + lvl : ''}`}
      style={{
        aspectRatio: '1',
        border: selected ? '2px solid var(--fire)' : '1px solid transparent',
        borderRadius: 4,
        cursor: has ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.62rem', fontWeight: 600, padding: 0,
        color: has ? '#fff' : 'var(--text-tertiary)',
        opacity: has ? 1 : 0.55,
      }}
    >
      {cell.day}
    </button>
  );
}

function Heatmap({ logs, selectedDate, onPickDate }) {
  const months = useMemo(() => buildMonths(logs), [logs]);
  const [idx, setIdx] = useState(0); // 0 = current month, higher = older

  if (months.length === 0) return null;
  const safeIdx = Math.min(idx, months.length - 1);
  const mo = months[safeIdx];

  return (
    <div className="card">
      <div className="section-header">
        <span className="section-title">Activity Calendar</span>
        {selectedDate ? (
          <button
            type="button"
            onClick={() => onPickDate(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fire)', fontSize: '0.75rem', fontWeight: 600 }}
          >
            Clear day
          </button>
        ) : (
          <span className="text-xs text-dim">Tap a day to filter</span>
        )}
      </div>

      {/* Month navigation — one month at a time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(i + 1, months.length - 1))}
          disabled={safeIdx >= months.length - 1}
          className="btn btn-ghost btn-icon"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{mo.label}</span>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          disabled={safeIdx <= 0}
          className="btn btn-ghost btn-icon"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={`wd-${i}`} style={{ fontSize: '0.58rem', textAlign: 'center', color: 'var(--text-tertiary)', paddingBottom: 2 }}>
            {w}
          </div>
        ))}
        {mo.cells.map((c, i) => (
          c === null
            ? <div key={`b-${i}`} />
            : <DayCell key={c.date} cell={c} selected={selectedDate === c.date} onPick={onPickDate} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
        <span className="text-xs text-dim">Less</span>
        {['', 'd1', 'd2', 'd3'].map((d) => (
          <div key={d || 'none'} className={`heatmap-cell${d ? ' ' + d : ''}`} style={{ width: 11, height: 11, borderRadius: 3 }} />
        ))}
        <span className="text-xs text-dim">More</span>
      </div>
    </div>
  );
}

// Session summary card — tap to open the full detail modal
function SessionCard({ item, onOpen, onDelete, syncing }) {
  const cat = CAT_MAP[item.workoutType] || CAT_MAP.mixed;
  const dateStr = formatSessionDateTime(item, { weekday: true });
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(item);
    }
  };

  return (
    <div
      className="session-card"
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      onClick={() => onOpen(item)}
      onKeyDown={handleKeyDown}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', width: '100%' }}>
        <div className="session-dot" style={{ background: 'rgba(255,107,53,0.12)', flexShrink: 0 }}>{cat.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`cat-pill ${cat.cls}`}>{cat.label}</span>
            <span className="text-xs text-dim">{dateStr}</span>
            {item.photoUrl && (
              <span className="text-xs text-dim" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                <ImageIcon size={11} /> Photo
              </span>
            )}
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
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HistoryView() {
  const { exerciseData, deleteExerciseLog, syncing, activeProfile } = useApp();
  const allLogs = useMemo(() => exerciseData?.logs || [], [exerciseData]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [sort, setSort] = useState('newest');
  const [showSort, setShowSort] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

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

    if (dateFilter) {
      result = result.filter(l => getSessionDateKey(l) === dateFilter);
    }

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
  }, [allLogs, filter, dateFilter, query, sort]);

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

  const hasFilters = query || filter !== 'all' || dateFilter;
  // Clearing filters also restores the default newest-first order.
  const clearFilters = useCallback(() => {
    setQuery('');
    setFilter('all');
    setDateFilter(null);
    setSort('newest');
  }, []);
  const selected = useMemo(() => allLogs.find(l => l.id === selectedId) || null, [allLogs, selectedId]);

  const dateFilterLabel = useMemo(() => {
    if (!dateFilter) return '';
    const d = new Date(`${dateFilter}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? dateFilter
      : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [dateFilter]);

  const exportCsv = useCallback(() => {
    if (!filtered.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const who = String(activeProfile?.slug || activeProfile?.name || 'history')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'history';
    downloadCsv(`parentfit-${who}-${stamp}.csv`, buildSessionsCsv(filtered));
  }, [filtered, activeProfile]);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Heatmap logs={allLogs} selectedDate={dateFilter} onPickDate={setDateFilter} />

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

      {/* Filter chips + export + sort */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="chip-rail" style={{ flex: 1 }}>
          {FILTERS.map(f => (
            <button key={f.v} className={`chip${filter === f.v ? ' active' : ''}`} onClick={() => setFilter(f.v)}>
              {f.label}
              {f.count > 0 && <span style={{ opacity: 0.65, fontSize: '0.68rem' }}>{f.count}</span>}
            </button>
          ))}
        </div>

        <button
          className="chip"
          onClick={exportCsv}
          disabled={!filtered.length}
          style={{ gap: '0.3rem', flexShrink: 0 }}
          title="Download these sessions as a CSV (opens in Excel)"
        >
          <Download size={12} />
          Export
        </button>

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
      {hasFilters && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span className="text-xs text-dim">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {dateFilter ? ` on ${dateFilterLabel}` : ''}
            {query ? ` for "${query}"` : ''}
            {filter !== 'all' ? ` · ${filter}` : ''}
          </span>
          <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fire)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
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
          <button className="btn btn-ghost" style={{ borderRadius: 'var(--radius-sm)' }} onClick={clearFilters}>
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
                  onOpen={i => setSelectedId(i.id)}
                  onDelete={deleteExerciseLog}
                  syncing={syncing}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {selected && (
        <SessionDetailModal
          session={selected}
          onClose={() => setSelectedId(null)}
          onDelete={deleteExerciseLog}
          syncing={syncing}
        />
      )}
    </div>
  );
}
