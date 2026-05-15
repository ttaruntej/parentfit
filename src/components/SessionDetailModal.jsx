import React, { useEffect } from 'react';
import { X, Trash2, Clock, Flame, Dumbbell, Calendar } from 'lucide-react';
import { formatSessionDateTime } from '../lib/sessionTime';

const CAT_MAP = {
  push:  { emoji: '💪', label: 'Push' },
  pull:  { emoji: '🏋️', label: 'Pull' },
  legs:  { emoji: '🦵', label: 'Legs' },
  hiit:  { emoji: '⚡', label: 'HIIT' },
  mixed: { emoji: '🔀', label: 'Mixed' },
};

const EQUIPMENT_LABEL = {
  dumbbell: 'Dumbbell', barbell: 'Barbell', machine: 'Machine',
  cable: 'Cable', bodyweight: 'Bodyweight',
};

function formatSet(set, index) {
  const parts = [];
  if (set.bodyweight) parts.push('Bodyweight');
  else if (set.weight_kg != null && set.weight_kg !== '') parts.push(`${set.weight_kg} kg`);
  if (set.reps != null && set.reps !== '') parts.push(`${set.reps} reps`);
  return { label: `Set ${index + 1}`, detail: parts.length ? parts.join(' · ') : '—' };
}

function Stat({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

export default function SessionDetailModal({ session, onClose, onDelete, syncing }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!session) return null;

  const cat = CAT_MAP[session.workoutType] || CAT_MAP.mixed;
  const exercises = session.exercises || [];
  const totalSets = exercises.reduce((n, ex) => n + (ex.sets?.length || 0), 0);

  const handleDelete = () => {
    onDelete?.(session.id);
    onClose();
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto',
          padding: 0, background: 'var(--bg-elevated)',
          border: '1px solid var(--border-fire)', borderRadius: 'var(--radius-xl)',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
            background: 'rgba(255,107,53,0.12)', fontSize: '1.4rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {cat.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.05rem', lineHeight: 1.25 }}>
              {session.title || `${cat.label} Session`}
            </h3>
            <div style={{ marginTop: '0.2rem' }}>
              <Stat icon={<Calendar size={13} />}>{formatSessionDateTime(session, { weekday: true })}</Stat>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Stat row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem' }}>
            {session.durationMinutes ? <Stat icon={<Clock size={13} />}>{session.durationMinutes} min</Stat> : null}
            {session.intensity ? <Stat icon={<Flame size={13} />}>{session.intensity} intensity</Stat> : null}
            <Stat icon={<Dumbbell size={13} />}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              {totalSets ? ` · ${totalSets} sets` : ''}
            </Stat>
          </div>

          {/* Photo */}
          {session.photoUrl && (
            <a href={session.photoUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <img
                src={session.photoUrl}
                alt="Post-workout"
                loading="lazy"
                style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
              />
            </a>
          )}

          {/* Exercises */}
          {exercises.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: '0.6rem' }}>Exercises</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {exercises.map((ex, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                    padding: '0.7rem 0.85rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</span>
                      {ex.equipment && (
                        <span className="text-xs text-dim">{EQUIPMENT_LABEL[ex.equipment] || ex.equipment}</span>
                      )}
                    </div>
                    {ex.sets?.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {ex.sets.map((s, si) => {
                          const f = formatSet(s, si);
                          return (
                            <div key={si} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-tertiary)' }}>{f.label}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{f.detail}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div>
              <div className="section-title" style={{ marginBottom: '0.4rem' }}>Notes</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>
                "{session.notes}"
              </p>
            </div>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={syncing}
              className="btn btn-danger btn-full"
              style={{ borderRadius: 'var(--radius-md)', marginTop: '0.25rem' }}
            >
              <Trash2 size={15} /> Delete this session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
