import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Dumbbell, RefreshCw, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { syncing, forceManualSync, ghConfig, setIsSettingsOpen, activeUserId, switchUser, users } = useApp();
  const isDemo = !ghConfig.token || ghConfig.token.length < 10;
  const activeUser = users.find(u => u.id === activeUserId) || users[0];
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="top-header">
      {/* Brand */}
      <div className="brand-logo">
        <div className="brand-icon">
          <Dumbbell size={18} strokeWidth={2.5} />
        </div>
        <span className="brand-name">ParentFit</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* User switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(v => !v)}
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
            {/* Avatar */}
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: activeUser.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {activeUser.initials}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeUser.name.split(' ')[0]}
            </span>
            <ChevronDown size={12} color="var(--text-tertiary)" />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-fire)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              minWidth: 210,
              zIndex: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => { switchUser(u.id); setShowUserMenu(false); }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: u.id === activeUserId ? 'rgba(255,107,53,0.1)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (u.id !== activeUserId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = u.id === activeUserId ? 'rgba(255,107,53,0.1)' : 'none'; }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: u.color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 700, color: 'white',
                  }}>
                    {u.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.05rem' }}>
                      {u.id === activeUserId ? '✓ Active profile' : 'Switch to this profile'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync status */}
        <div
          onClick={() => setIsSettingsOpen(true)}
          title={isDemo ? 'No GitHub token — tap to configure' : 'Synced with GitHub'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: isDemo ? 'rgba(245,158,11,0.1)' : 'rgba(0,200,150,0.1)',
            border: `1px solid ${isDemo ? 'rgba(245,158,11,0.3)' : 'rgba(0,200,150,0.25)'}`,
            borderRadius: '999px', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 600,
            color: isDemo ? '#F59E0B' : 'var(--teal)',
          }}
        >
          <span className={`status-dot ${isDemo ? 'status-demo' : 'status-live'}`} />
          {isDemo ? 'Demo' : 'Live'}
        </div>

        {/* Refresh */}
        <button
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
        >
          <RefreshCw size={14} className={syncing ? 'spin' : ''} />
        </button>
      </div>

      {/* Close user menu on outside click */}
      {showUserMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
