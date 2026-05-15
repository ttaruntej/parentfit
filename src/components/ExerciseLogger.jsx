import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Plus, Minus, ChevronDown, ChevronUp, Camera, X } from 'lucide-react';
import { WORKOUT_CATEGORY } from '../lib/workoutTypes';
import { compressImage } from '../lib/image';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

const TYPES = [
  { value: 'push',  emoji: '💪', name: 'Push Day',    desc: 'Chest · Shoulders · Triceps' },
  { value: 'pull',  emoji: '🏋️', name: 'Pull Day',    desc: 'Back · Biceps' },
  { value: 'legs',  emoji: '🦵', name: 'Leg Day',     desc: 'Quads · Hamstrings · Glutes' },
  { value: 'hiit',  emoji: '⚡', name: 'HIIT / Cardio', desc: 'High intensity intervals' },
  { value: 'mixed', emoji: '🔀', name: 'Full Body',   desc: 'Mixed / general workout' },
];

const EQUIPMENT = [
  { value: 'dumbbell',   label: '🏋 Dumbbell' },
  { value: 'barbell',    label: '⚖️ Barbell' },
  { value: 'machine',    label: '🔧 Machine' },
  { value: 'cable',      label: '🔗 Cable' },
  { value: 'bodyweight', label: '🤸 Bodyweight' },
];

const PRESETS = {
  push: [
    { name: 'Push-Ups', equipment: 'bodyweight', sets: [{ bodyweight: true, reps: 10 }, { bodyweight: true, reps: 10 }] },
    { name: 'Flat Dumbbell Press', equipment: 'dumbbell', sets: [{ weight_kg: 5, reps: 15 }, { weight_kg: 7.5, reps: 12 }] },
    { name: 'Shoulder Press', equipment: 'dumbbell', sets: [{ weight_kg: 5, reps: 15 }] },
    { name: 'Tricep Pushdown', equipment: 'cable', sets: [{ weight_kg: 15, reps: 15 }] },
  ],
  pull: [
    { name: 'Lat Pulldown', equipment: 'machine', sets: [{ weight_kg: 20, reps: 15 }, { weight_kg: 25, reps: 12 }] },
    { name: 'Seated Rows', equipment: 'machine', sets: [{ weight_kg: 20, reps: 15 }] },
    { name: 'Bicep Curls', equipment: 'dumbbell', sets: [{ weight_kg: 5, reps: 15 }] },
  ],
  legs: [
    { name: 'Front Squat', equipment: 'barbell', sets: [{ weight_kg: 10, reps: 12 }, { weight_kg: 12.5, reps: 10 }] },
    { name: 'Romanian Deadlift', equipment: 'barbell', sets: [{ weight_kg: 10, reps: 12 }] },
    { name: 'Calf Raises', equipment: 'machine', sets: [{ weight_kg: 12, reps: 20 }] },
  ],
  hiit: [
    { name: 'Burpees', equipment: 'bodyweight', sets: [{ bodyweight: true, reps: 10 }] },
    { name: 'Jumping Squats', equipment: 'bodyweight', sets: [{ bodyweight: true, reps: 20 }] },
    { name: 'Jogging', equipment: 'bodyweight', sets: [{ bodyweight: true, reps: null }] },
  ],
};

const emptyEx = () => ({ name: '', equipment: 'dumbbell', sets: [{ weight_kg: '', reps: '', bodyweight: false }], open: true });
const emptySet = () => ({ weight_kg: '', reps: '', bodyweight: false });

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localTimeKey(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Step 1 — pick workout type
function TypeStep({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem' }}>What are you training?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.25rem' }}>Pick a workout type to continue</p>
      </div>
      <div className="type-grid">
        {TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            className={`type-btn${selected === t.value ? ' selected' : ''}`}
            onClick={() => onSelect(t.value)}
          >
            <span className="type-emoji">{t.emoji}</span>
            <span className="type-info">
              <div className="type-name">{t.name}</div>
              <div className="type-desc">{t.desc}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 2 — exercises
function ExStep({ exercises, onUpdate, onAddEx, onRemoveEx, onAddSet, onRemoveSet, onUpdateSet, workoutType }) {
  const handlePreset = () => {
    const p = PRESETS[workoutType];
    if (p) onUpdate(p.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })), open: true })));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem' }}>Exercises</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Add sets, weights & reps</p>
        </div>
        {PRESETS[workoutType] && (
          <button type="button" className="btn btn-teal" style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', borderRadius: '999px' }} onClick={handlePreset}>
            ✨ Prefill
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {exercises.map((ex, ei) => (
          <div key={ei} className="ex-row">
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <input
                className="ex-name-input"
                placeholder={`Exercise ${ei + 1} (e.g. Flat Press)`}
                value={ex.name}
                onChange={e => onUpdate(exercises.map((x, i) => i === ei ? { ...x, name: e.target.value } : x))}
                style={{ flex: 1 }}
              />
              <select
                className="input input-sm"
                style={{ width: '110px', background: '#1e1411' }}
                value={ex.equipment}
                onChange={e => onUpdate(exercises.map((x, i) => i === ei ? { ...x, equipment: e.target.value } : x))}
              >
                {EQUIPMENT.map(eq => <option key={eq.value} value={eq.value}>{eq.label}</option>)}
              </select>
              {exercises.length > 1 && (
                <button type="button" className="btn btn-danger btn-icon" onClick={() => onRemoveEx(ei)} title="Remove exercise">
                  <Minus size={14} />
                </button>
              )}
              <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                onClick={() => onUpdate(exercises.map((x, i) => i === ei ? { ...x, open: !x.open } : x))}>
                {ex.open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {ex.open && (
              <>
                {/* Sets header */}
                <div className="sets-grid sets-header" style={{ marginBottom: '0.3rem' }}>
                  <span></span><span>Weight kg</span><span>Reps</span><span>BW</span>
                </div>
                {ex.sets.map((s, si) => (
                  <div key={si} className="sets-grid" style={{ marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', paddingTop: '0.4rem' }}>S{si + 1}</span>
                    <input
                      type="number" min="0" step="0.5"
                      inputMode="decimal"
                      pattern="[0-9]*\\.?[0-9]*"
                      className="input input-sm"
                      placeholder="kg"
                      value={s.bodyweight ? '' : s.weight_kg}
                      disabled={s.bodyweight}
                      style={{ opacity: s.bodyweight ? 0.3 : 1 }}
                      onChange={e => onUpdateSet(ei, si, 'weight_kg', e.target.value)}
                    />
                    <input
                      type="number" min="0"
                      inputMode="numeric"
                      className="input input-sm"
                      placeholder="reps"
                      value={s.reps}
                      onChange={e => onUpdateSet(ei, si, 'reps', e.target.value)}
                    />
                    <input
                      type="checkbox"
                      checked={!!s.bodyweight}
                      onChange={e => onUpdateSet(ei, si, 'bodyweight', e.target.checked)}
                      style={{ accentColor: 'var(--fire)', width: '16px', height: '16px', cursor: 'pointer' }}
                      title="Bodyweight"
                    />
                    {ex.sets.length > 1 && (
                      <button type="button" onClick={() => onRemoveSet(ei, si)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem', gridColumn: '5' }}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => onAddSet(ei)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--fire)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem' }}>
                  <Plus size={12} /> Add set
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-full" style={{ borderRadius: 'var(--radius-md)' }} onClick={onAddEx}>
        <Plus size={16} /> Add exercise
      </button>
    </div>
  );
}

// Optional post-workout photo picker. The image is resized + compressed in
// the browser to a small JPEG data URL, then stored on the session itself.
function PhotoField({ photoUrl, setPhotoUrl }) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Please choose an image file.'); return; }
    if (file.size > MAX_PHOTO_BYTES) { setErr('Image is too large (max 25 MB).'); return; }
    setErr(null);
    setBusy(true);
    try {
      setPhotoUrl(await compressImage(file));
    } catch (e2) {
      console.error(e2);
      setErr('Could not process that image. Try another.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
        Post-workout photo (optional)
      </label>
      {photoUrl ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <img src={photoUrl} alt="Workout preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
          <button
            type="button"
            onClick={() => setPhotoUrl(null)}
            aria-label="Remove photo"
            style={{
              position: 'absolute', top: 8, right: 8, width: 30, height: 30,
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.65)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          className="btn btn-ghost btn-full"
          style={{ borderRadius: 'var(--radius-md)', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Camera size={16} /> {busy ? 'Processing...' : 'Add a photo'}
          <input type="file" accept="image/*" onChange={onPick} disabled={busy} style={{ display: 'none' }} />
        </label>
      )}
      {err && <p style={{ color: '#F87171', fontSize: '0.78rem', marginTop: '0.4rem' }}>{err}</p>}
    </div>
  );
}

// Step 3 — finish
function FinishStep({ duration, setDuration, notes, setNotes, bodyWeight, setBodyWeight, photoUrl, setPhotoUrl, workoutType, syncing, canSubmit }) {
  const t = TYPES.find(t => t.value === workoutType);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem' }}>Finish up</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>How long? Any notes?</p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
          Duration (minutes)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="range" min="10" max="120" step="5"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--fire)' }}
          />
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--fire)', minWidth: '3.5rem', textAlign: 'right' }}>
            {duration}m
          </span>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
          Body weight (optional)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number" min="0" step="0.1"
            inputMode="decimal"
            className="input"
            placeholder="e.g. 72.5"
            value={bodyWeight}
            onChange={e => setBodyWeight(e.target.value)}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>kg</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
          Logging this each session builds a weight trend over time.
        </p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
          Notes (optional)
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="How did it feel? Any PRs? Pain points?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <PhotoField photoUrl={photoUrl} setPhotoUrl={setPhotoUrl} />

      <button
        type="submit"
        disabled={syncing || !canSubmit}
        className="btn btn-fire btn-full"
        title={!canSubmit ? 'Add at least one named exercise before saving.' : undefined}
      >
        {syncing
          ? '⏳ Saving...'
          : <><CheckCircle2 size={18} /> Log {t?.name || 'Session'}</>
        }
      </button>
      {!canSubmit && (
        <p style={{ marginTop: '-0.75rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', textAlign: 'center' }}>
          Add at least one named exercise before saving.
        </p>
      )}
    </div>
  );
}

export default function ExerciseLogger() {
  const { addExerciseLog, syncing } = useApp();
  const [step, setStep] = useState(0); // 0=type, 1=exercises, 2=finish
  const [workoutType, setWorkoutType] = useState('push');
  const [exercises, setExercises] = useState([emptyEx()]);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const canSubmit = exercises.some(ex => ex.name.trim());

  const updateSet = (ei, si, field, val) =>
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, j) => {
          if (j !== si) return s;
          const u = { ...s, [field]: val };
          if (field === 'bodyweight' && val) u.weight_kg = '';
          return u;
        }),
      };
    }));

  const handleSubmit = async e => {
    e.preventDefault();
    const namedExercises = exercises.filter(ex => ex.name.trim());
    if (namedExercises.length === 0) {
      alert('Add at least one named exercise before saving.');
      return;
    }

    const typeInfo = TYPES.find(t => t.value === workoutType) || TYPES[4];
    const now = new Date();
    const today = localDateKey(now);
    const payload = {
      id: `session_${Date.now()}`,
      date: today,
      timeOfDay: localTimeKey(now),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      performedAt: now.toISOString(),
      performedAtTs: now,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      workoutType,
      category: WORKOUT_CATEGORY[workoutType] || WORKOUT_CATEGORY.mixed,
      title: `${typeInfo.emoji} ${typeInfo.name} — ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      durationMinutes: duration,
      intensity: workoutType === 'hiit' ? 'High' : 'Moderate',
      notes: notes.trim(),
      exercises: namedExercises
        .map(ex => ({
          name: ex.name.trim(),
          rawName: ex.name.trim(),
          equipment: ex.equipment,
          sets: ex.sets.map(s => ({
            weight_kg: s.bodyweight ? null : (s.weight_kg !== '' ? parseFloat(s.weight_kg) : null),
            reps: s.reps !== '' ? parseInt(s.reps) : null,
            ...(s.bodyweight ? { bodyweight: true } : {}),
          })),
        })),
      rawHeader: `${today} — ${typeInfo.name}`,
      photoUrl: photoUrl || null,
      bodyWeightKg: bodyWeight !== '' && !Number.isNaN(parseFloat(bodyWeight))
        ? parseFloat(bodyWeight)
        : null,
    };

    await addExerciseLog(payload);
    setNotes('');
    setBodyWeight('');
    setPhotoUrl(null);
    setExercises([emptyEx()]);
    setDuration(45);
    setWorkoutType('push');
    setStep(0);
  };

  const steps = [
    { label: 'Type', num: 1 },
    { label: 'Exercises', num: 2 },
    { label: 'Finish', num: 3 },
  ];

  return (
    <form onSubmit={handleSubmit} className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              onClick={() => i < step && setStep(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                cursor: i < step ? 'pointer' : 'default',
                opacity: i > step ? 0.4 : 1,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i <= step ? 'var(--fire)' : 'var(--bg-elevated)',
                border: i === step ? '2px solid var(--fire)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: 'white',
                transition: 'all 0.2s',
              }}>
                {i < step ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: i === step ? 600 : 400, color: i === step ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--fire)' : 'var(--border-subtle)', borderRadius: 1, transition: 'background 0.3s' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="card">
        {step === 0 && (
          <TypeStep selected={workoutType} onSelect={t => { setWorkoutType(t); setStep(1); }} />
        )}
        {step === 1 && (
          <ExStep
            exercises={exercises}
            workoutType={workoutType}
            onUpdate={setExercises}
            onAddEx={() => setExercises(p => [...p, emptyEx()])}
            onRemoveEx={ei => setExercises(p => p.filter((_, i) => i !== ei))}
            onAddSet={ei => setExercises(p => p.map((ex, i) => i === ei ? { ...ex, sets: [...ex.sets, emptySet()] } : ex))}
            onRemoveSet={(ei, si) => setExercises(p => p.map((ex, i) => i === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex))}
            onUpdateSet={updateSet}
          />
        )}
        {step === 2 && (
          <FinishStep
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            setNotes={setNotes}
            bodyWeight={bodyWeight}
            setBodyWeight={setBodyWeight}
            photoUrl={photoUrl}
            setPhotoUrl={setPhotoUrl}
            workoutType={workoutType}
            syncing={syncing}
            canSubmit={canSubmit}
          />
        )}
      </div>

      {/* Navigation buttons */}
      {step < 2 && step > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-ghost" style={{ flex: 1, borderRadius: 'var(--radius-md)' }} onClick={() => setStep(s => s - 1)}>
            ← Back
          </button>
          <button type="button" className="btn btn-fire" style={{ flex: 2, borderRadius: 'var(--radius-md)' }} onClick={() => setStep(s => s + 1)}>
            Next →
          </button>
        </div>
      )}
      {step === 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Tap a workout type above to continue</p>
      )}
    </form>
  );
}
