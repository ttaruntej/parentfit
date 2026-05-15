import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Flame, Clock, Activity, Trash2, Zap } from 'lucide-react';
import { getCurrentStreak } from '../lib/streak';

const CAT_MAP = {
  push: { emoji: '💪', cls: 'cat-push', label: 'Push' },
  pull: { emoji: '🏋️', cls: 'cat-pull', label: 'Pull' },
  legs: { emoji: '🦵', cls: 'cat-legs', label: 'Legs' },
  hiit: { emoji: '⚡', cls: 'cat-hiit', label: 'HIIT' },
  mixed:{ emoji: '🔀', cls: 'cat-mixed', label: 'Mixed' },
};

function RingChart({ done, goal = 5 }) {
  const pct = Math.min(done / goal, 1);
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <svg width={88} height={88} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,107,53,0.12)" strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--fire)" strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)"
        style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>
        {done}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill="var(--text-tertiary)"
        style={{ fontSize: '0.6rem', fontFamily: 'Inter,sans-serif', letterSpacing: '0.04em' }}>
        / {goal} WK
      </text>
    </svg>
  );
}

export default function Dashboard({ onGoLog }) {
  const { exerciseData, deleteExerciseLog, syncing } = useApp();
  const logs = useMemo(() => {
    const all = exerciseData?.logs || [];
    return [...all].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [exerciseData]);

  const totalWorkouts = logs.length;
  const totalMins = useMemo(() => logs.reduce((a, l) => a + (Number(l.durationMinutes) || 0), 0), [logs]);
  const curStreak = useMemo(() => getCurrentStreak(logs), [logs]);

  const thisWeek = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0,0,0,0);
    return logs.filter(l => l.date && new Date(l.date) >= weekStart).length;
  }, [logs]);

  const recent = logs.slice(0, 8);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Hero */}
      <div className="hero-banner" style={{ paddingBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fire-light)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {greet} 👋
            </div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.5rem', marginBottom: '0.875rem' }}>
              Ready to move today?
            </h2>
          </div>
        </div>

        <div className="ring-chart-wrap">
          <RingChart done={thisWeek} goal={5} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={16} color="var(--fire)" />
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>{curStreak} day streak</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {thisWeek}/5 sessions this week.<br />
              {5 - thisWeek > 0 ? `${5 - thisWeek} more to hit your goal!` : 'Weekly goal crushed! 🎉'}
            </div>
            <button
              onClick={onGoLog}
              className="btn btn-fire"
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', marginTop: '0.25rem', borderRadius: 'var(--radius-sm)' }}
            >
              <Zap size={14} /> Log session
            </button>
          </div>
        </div>
      </div>

      {/* Stat pills — 3-column grid so none get cut off */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(255,107,53,0.12)' }}>
            <Activity size={18} color="var(--fire)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--fire)' }}>{totalWorkouts}</div>
            <div className="stat-label">Sessions</div>
          </div>
        </div>
        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(0,200,150,0.12)' }}>
            <Clock size={18} color="var(--teal)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--teal)' }}>{totalMins}</div>
            <div className="stat-label">Minutes</div>
          </div>
        </div>
        <div className="stat-pill">
          <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Flame size={18} color="#A78BFA" />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#A78BFA', fontSize: '1.1rem' }}>{curStreak}</div>
            <div className="stat-label">Streak</div>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <div className="section-header">
          <span className="section-title">Recent Sessions</span>
          <span className="text-xs text-dim">{totalWorkouts} total</span>
        </div>

        {recent.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏋️</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No sessions yet.</div>
            <button onClick={onGoLog} className="btn btn-fire" style={{ marginTop: '1rem', borderRadius: 'var(--radius-sm)' }}>
              Log your first session
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent.map(item => {
              const wt = item.workoutType || 'mixed';
              const cat = CAT_MAP[wt] || CAT_MAP.mixed;
              const dateStr = item.date
                ? new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
                : '—';
              return (
                <div key={item.id} className="session-card">
                  <div className="session-dot" style={{ background: 'rgba(255,107,53,0.12)' }}>
                    {cat.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`cat-pill ${cat.cls}`}>{cat.label}</span>
                      <span className="text-xs text-dim">{dateStr}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || `${cat.label} Session`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>
                      {item.durationMinutes ? `${item.durationMinutes} min` : ''}{item.intensity ? ` · ${item.intensity}` : ''}
                      {item.exercises?.length ? ` · ${item.exercises.length} exercises` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteExerciseLog(item.id)}
                    disabled={syncing}
                    className="btn btn-danger btn-icon"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {logs.length > 8 && (
              <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                +{logs.length - 8} more — view all in History
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
