import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Save, X, Info, Eye, EyeOff } from 'lucide-react';

export default function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, ghConfig, updateConfig } = useApp();
  const [token, setToken] = useState(ghConfig.token || '');
  const [owner, setOwner] = useState(ghConfig.owner || '');
  const [repo, setRepo] = useState(ghConfig.repo || '');
  const [branch, setBranch] = useState(ghConfig.branch || 'main');
  const [showToken, setShowToken] = useState(false);

  if (!isSettingsOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    updateConfig({
      token: token.trim(),
      owner: owner.trim() || 'ttaruntej',
      repo: repo.trim() || 'parentfit',
      branch: branch.trim() || 'main',
    });
  };


  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    marginBottom: '0.4rem',
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && setIsSettingsOpen(false)}
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={18} color="var(--fire)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem' }}>Connect Storage</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Cloud storage configuration</div>
            </div>
          </div>
          <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        <div style={{ background: 'rgba(255,107,53,0.07)', borderLeft: '3px solid var(--fire)', padding: '0.75rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: '0.5rem' }}>
          <Info size={14} color="var(--fire)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          Connect your storage repository to sync workouts across devices. Token is stored locally in your browser only.
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Token */}
          <div>
            <label style={labelStyle}>Personal Access Token</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                className="input"
                placeholder="Enter access token..."
                value={token}
                onChange={e => setToken(e.target.value)}
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" onClick={() => setShowToken(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Owner + Repo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Owner / Org</label>
              <input type="text" className="input" placeholder="username" value={owner} onChange={e => setOwner(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Repository</label>
              <input type="text" className="input" placeholder="repo-name" value={repo} onChange={e => setRepo(e.target.value)} />
            </div>
          </div>

          {/* Branch */}
          <div>
            <label style={labelStyle}>Branch</label>
            <input type="text" className="input" value={branch} onChange={e => setBranch(e.target.value)} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="submit" className="btn btn-fire btn-full" style={{ borderRadius: 'var(--radius-md)' }}>
              <Save size={16} /> Save & Connect
            </button>
          </div>
        </form>

        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
}
