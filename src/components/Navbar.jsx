import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Dumbbell, RefreshCw, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const {
    syncing,
    forceManualSync,
    setIsSettingsOpen,
    activeProfileId,
    switchProfile,
    profiles,
  } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const menuRef = useRef(null);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!showUserMenu) return undefined;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setShowUserMenu(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showUserMenu]);

  return (
    <header className="top-header">
      <div className="brand-logo">
        <div className="brand-icon">
          <Dumbbell size={18} strokeWidth={2.5} />
        </div>
        <span className="brand-name">ParentFit</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {activeProfile && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: 'rgba(255,107,53,0.1)',
                border: '1px solid rgba(255,107,53,0.25)',
                borderRadius: '999px',
                padding: '0.3rem 0.5rem 0.3rem 0.35rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: activeProfile.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700, color: 'white',
                flexShrink: 0,
              }}>
                {activeProfile.initials}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProfile.name.split(' ')[0]}
              </span>
              <ChevronDown size={12} color="var(--text-tertiary)" />
            </button>

            {showUserMenu && (
              <div
                role="menu"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-fire)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  minWidth: 210,
                  zIndex: 300,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitem"
                    onClick={() => { switchProfile(profile.id); setShowUserMenu(false); }}
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: profile.id === activeProfileId ? 'rgba(255,107,53,0.1)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (profile.id !== activeProfileId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = profile.id === activeProfileId ? 'rgba(255,107,53,0.1)' : 'none'; }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: profile.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.68rem', fontWeight: 700, color: 'white',
                    }}>
                      {profile.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.05rem' }}>
                        {profile.id === activeProfileId ? 'Active profile' : 'Switch to this profile'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          title={isOnline ? 'Synced with Firebase' : 'Offline cache active'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: isOnline ? 'rgba(0,200,150,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isOnline ? 'rgba(0,200,150,0.25)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: '999px', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            color: isOnline ? 'var(--teal)' : '#F59E0B',
          }}
        >
          <span className={`status-dot ${isOnline ? 'status-live' : 'status-demo'}`} />
          {isOnline ? 'Live' : 'Offline'}
        </button>

        <button
          type="button"
          onClick={forceManualSync}
          disabled={syncing}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
          }}
          title="Sync data"
          aria-label="Sync data"
        >
          <RefreshCw size={14} className={syncing ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}
