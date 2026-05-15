import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, X, User } from 'lucide-react';

export default function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, profiles } = useApp();
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
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {user?.email || '—'}
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''} in this household.
        </div>

        <button type="button" onClick={signOut} className="btn btn-ghost btn-full" style={{ borderRadius: 'var(--radius-md)' }}>
          <LogOut size={16} /> Sign out
        </button>

        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}
