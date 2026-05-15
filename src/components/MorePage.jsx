import React, { useState, useEffect } from 'react';
import { LogOut, Settings as SettingsIcon, UserCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getProfileDetails, saveProfileDetails } from '../services/dataAdapter';
import microWorkoutsImg from '../assets/content/micro_workouts.jpg';
import dadStrengthImg from '../assets/content/dad_strength.jpg';
import nutritionImg from '../assets/content/nutrition.jpg';
import familyFitnessImg from '../assets/content/family_fitness.jpg';

const knowledgeItems = [
  {
    title: 'Micro-Workouts',
    desc: '5-15 min bursts for busy schedules. No gym required.',
    tag: 'Efficiency',
    img: microWorkoutsImg,
  },
  {
    title: 'Functional Dad Strength',
    desc: 'Compound lifts to make parenting effortless.',
    tag: 'Strength',
    img: dadStrengthImg,
  },
  {
    title: 'Energy Nutrition',
    desc: 'Fuel your day with protein-focused meal prep.',
    tag: 'Nutrition',
    img: nutritionImg,
  },
  {
    title: 'Family Adventure',
    desc: 'Turn outdoor time into a family fitness journey.',
    tag: 'Lifestyle',
    img: familyFitnessImg,
  },
];

function KnowledgeCard({ title, desc, tag, img }) {
  return (
    <div className="content-card">
      <img src={img} alt={title} className="content-card-img" loading="lazy" decoding="async" />
      <div className="content-card-overlay">
        <div className="content-card-tag">{tag}</div>
        <div className="content-card-title">{title}</div>
        <div className="content-card-desc">{desc}</div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '0.3rem',
};

const EMPTY_DETAILS = { age: '', gender: '', heightCm: '', weightKg: '', goal: '', about: '' };

// Optional "about you" details for the active profile. The profile owner edits
// their own; the admin can switch profiles to view anyone's.
function ProfileDetailsCard() {
  const { activeProfile, activeProfileId, isAdmin } = useApp();
  const [form, setForm] = useState(null); // null while loading
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return undefined;
    let cancelled = false;
    setForm(null);
    setSaved(false);
    getProfileDetails(activeProfileId)
      .then((d) => { if (!cancelled) setForm({ ...EMPTY_DETAILS, ...d }); })
      .catch((e) => { console.error(e); if (!cancelled) setForm({ ...EMPTY_DETAILS }); });
    return () => { cancelled = true; };
  }, [activeProfileId]);

  if (!activeProfileId) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy(true);
    setErr(false);
    setSaved(false);
    try {
      const { age, gender, heightCm, weightKg, goal, about } = form;
      await saveProfileDetails(activeProfileId, { age, gender, heightCm, weightKg, goal, about });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Profile details</div>
        <div className="glass-pill">{activeProfile?.name || 'Profile'}</div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '-0.15rem' }}>
          {isAdmin
            ? 'Viewing this profile. Switch profiles from the top bar to see others. Nothing here is required.'
            : 'Tell us a bit about yourself. Everything here is optional.'}
        </p>

        {form === null ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Age</label>
                <input type="number" min="0" inputMode="numeric" className="input"
                  placeholder="e.g. 38" value={form.age} onChange={(e) => set('age', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <input type="text" className="input"
                  placeholder="Optional" value={form.gender} onChange={(e) => set('gender', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input type="number" min="0" step="0.1" inputMode="decimal" className="input"
                  placeholder="e.g. 172" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Weight (kg)</label>
                <input type="number" min="0" step="0.1" inputMode="decimal" className="input"
                  placeholder="e.g. 72.5" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Fitness goal</label>
              <input type="text" className="input"
                placeholder="e.g. Build strength, lose 5 kg" value={form.goal} onChange={(e) => set('goal', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>About</label>
              <textarea className="input" rows={3} style={{ resize: 'vertical' }}
                placeholder="Anything you'd like to note" value={form.about} onChange={(e) => set('about', e.target.value)} />
            </div>
            <button type="button" onClick={save} disabled={busy} className="btn btn-fire btn-full" style={{ borderRadius: 'var(--radius-md)' }}>
              {saved ? <><Check size={16} /> Saved</> : (busy ? 'Saving...' : 'Save details')}
            </button>
            {err && (
              <p style={{ color: '#F87171', fontSize: '0.8rem', textAlign: 'center' }}>
                Could not save. Try again.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MorePage() {
  const { signOut, user } = useAuth();
  const { setIsSettingsOpen } = useApp();

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div className="section-header">
          <div className="section-title">Knowledge Hub</div>
          <div className="glass-pill">Curated</div>
        </div>
        <div className="knowledge-grid">
          {knowledgeItems.map((item) => (
            <KnowledgeCard key={item.title} {...item} />
          ))}
        </div>
      </div>

      <ProfileDetailsCard />

      {/* Account */}
      <div>
        <div className="section-header">
          <div className="section-title">Account</div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCircle size={20} color="var(--fire)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Signed in as
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {user?.email || '—'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="btn btn-ghost btn-full"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <SettingsIcon size={16} /> Account &amp; settings
          </button>
          <button
            type="button"
            onClick={signOut}
            className="btn btn-danger btn-full"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1rem', opacity: 0.6 }}>
        ParentFit - Firebase Sync
      </div>
    </div>
  );
}
