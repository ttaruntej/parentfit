import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, X, User, ShieldCheck, Check, Users, Plus, Trash2, Pencil } from 'lucide-react';
import { listGroups, saveGroup, deleteGroup } from '../services/dataAdapter';

function ProfileAccessRow({ profile, onSave }) {
  const [emails, setEmails] = useState((profile.baseEmails || profile.allowedEmails || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(false);

  const save = async () => {
    setBusy(true);
    setErr(false);
    setSaved(false);
    try {
      const list = emails.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      const next = await onSave(profile.id, list);
      setEmails(next.join(', '));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {profile.name}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          type="text"
          className="input"
          placeholder="email1@gmail.com, email2@gmail.com"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          style={{ fontSize: '0.8rem' }}
        />
        <button type="button" onClick={save} disabled={busy} className="btn btn-fire" style={{ padding: '0 0.8rem', whiteSpace: 'nowrap' }}>
          {saved ? <Check size={15} /> : (busy ? '...' : 'Save')}
        </button>
      </div>
      {err && (
        <div style={{ fontSize: '0.72rem', color: '#F87171' }}>Could not update access. Try again.</div>
      )}
    </div>
  );
}

function GroupsManager({ profiles }) {
  const [groups, setGroups] = useState(null);
  const [editing, setEditing] = useState(null); // { id?, name, profileIds: [] }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const reload = useCallback(() => {
    listGroups()
      .then(setGroups)
      .catch((e) => { console.error(e); setGroups([]); });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const profileName = (id) => profiles.find((p) => p.id === id)?.name || 'Unknown profile';

  const toggleProfile = (id) => setEditing((cur) => {
    const set = new Set(cur.profileIds || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    return { ...cur, profileIds: [...set] };
  });

  const save = async () => {
    if (!editing?.name?.trim()) { setErr('Give the group a name.'); return; }
    if ((editing.profileIds || []).length < 2) { setErr('Pick at least two profiles.'); return; }
    setBusy(true);
    setErr(null);
    try {
      await saveGroup({ id: editing.id, name: editing.name.trim(), profileIds: editing.profileIds });
      setEditing(null);
      reload();
    } catch (e) {
      console.error(e);
      setErr('Could not save the group. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this group? Each profile keeps its own individual access.')) return;
    setBusy(true);
    try {
      await deleteGroup(id);
      reload();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Users size={13} /> Groups
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing({ name: '', profileIds: [] })}
            className="btn btn-ghost"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            <Plus size={13} /> New group
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '-0.3rem' }}>
        Profiles in a group can see and edit each other&apos;s workout data.
      </p>

      {/* Editor */}
      {editing && (
        <div style={{ border: '1px solid var(--border-fire)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <input
            type="text"
            className="input"
            placeholder="Group name (e.g. Family)"
            value={editing.name}
            onChange={(e) => setEditing((c) => ({ ...c, name: e.target.value }))}
            style={{ fontSize: '0.82rem' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 180, overflowY: 'auto' }}>
            {profiles.map((p) => {
              const checked = (editing.profileIds || []).includes(p.id);
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProfile(p.id)}
                    style={{ accentColor: 'var(--fire)', width: 15, height: 15 }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                </label>
              );
            })}
          </div>
          {err && <div style={{ fontSize: '0.72rem', color: '#F87171' }}>{err}</div>}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" onClick={save} disabled={busy} className="btn btn-fire" style={{ flex: 1, fontSize: '0.8rem' }}>
              {busy ? 'Saving...' : 'Save group'}
            </button>
            <button type="button" onClick={() => { setEditing(null); setErr(null); }} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing groups */}
      {groups === null ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Loading groups...</div>
      ) : groups.length === 0 && !editing ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>No groups yet.</div>
      ) : (
        groups.map((g) => (
          <div key={g.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" onClick={() => setEditing({ id: g.id, name: g.name, profileIds: g.profileIds || [] })}
                  className="btn btn-ghost btn-icon" title="Edit group">
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => remove(g.id)} disabled={busy}
                  className="btn btn-danger btn-icon" title="Delete group">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
              {(g.profileIds || []).map(profileName).join(', ') || 'No profiles'}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, profiles, isAdmin, updateProfileAccess } = useApp();
  const { user, signOut } = useAuth();
  if (!isSettingsOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 430,
        maxHeight: '88vh', overflowY: 'auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-fire)',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
        animation: 'slideUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="var(--fire)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem' }}>Account</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Signed in via Firebase</div>
            </div>
          </div>
          <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'rgba(255,107,53,0.07)', borderLeft: '3px solid var(--fire)', padding: '0.75rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            Email
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {user?.email || '—'}
            {isAdmin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <ShieldCheck size={12} /> Admin
              </span>
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''} visible to you.
        </div>

        {isAdmin && profiles.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Manage access
              </div>
              {profiles.map((p) => (
                <ProfileAccessRow key={p.id} profile={p} onSave={updateProfileAccess} />
              ))}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                Each profile is visible to the emails listed above, plus you as the admin.
              </p>
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)' }} />
            <GroupsManager profiles={profiles} />
          </>
        )}

        <button type="button" onClick={signOut} className="btn btn-danger btn-full" style={{ borderRadius: 'var(--radius-md)' }}>
          <LogOut size={16} /> Sign out
        </button>

        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}
