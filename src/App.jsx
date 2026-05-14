import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ExerciseLogger from './components/ExerciseLogger';
import HistoryView from './components/HistoryView';
import ResourceHub from './components/ResourceHub';
import MediaPlayerModal from './components/MediaPlayerModal';
import SettingsModal from './components/SettingsModal';
import { CheckCircle, AlertTriangle, Dumbbell, Settings, Github, Database } from 'lucide-react';


function SettingsPage() {
  const { ghConfig, syncing, forceManualSync, setIsSettingsOpen } = useApp();
  const onOpenModal = () => setIsSettingsOpen(true);
  const isDemo = ghConfig.owner === 'parent-fitness' && ghConfig.repo === 'exercise-logs';
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>Settings</div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Github size={20} color="var(--teal)" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>GitHub Backend</div>
            <div className="text-xs text-dim">Data sync configuration</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
            background: isDemo ? 'rgba(245,158,11,0.12)' : 'rgba(0,200,150,0.12)',
            color: isDemo ? '#F59E0B' : 'var(--teal)',
            border: `1px solid ${isDemo ? 'rgba(245,158,11,0.3)' : 'rgba(0,200,150,0.3)'}`,
          }}>
            {isDemo ? 'Demo' : 'Live'}
          </span>
        </div>
        {isDemo ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            Running in demo mode. Connect your GitHub repository to sync workouts across devices.
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>
            Connected to <strong style={{ color: 'var(--text-primary)' }}>{ghConfig.owner}/{ghConfig.repo}</strong>
          </div>
        )}
        <button className="btn btn-fire" style={{ width: '100%', borderRadius: 'var(--radius-md)' }} onClick={onOpenModal}>
          <Settings size={16} /> {isDemo ? 'Connect Repository' : 'Edit Configuration'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={20} color="var(--fire)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Sync Data</div>
            <div className="text-xs text-dim">Force refresh from remote</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.5rem 0.875rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }} onClick={forceManualSync} disabled={syncing}>
            {syncing ? '⏳' : '↻'} Sync
          </button>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--border-subtle)' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          ParentFit · Built for parents who move 💪<br />
          Data stored in your GitHub repository
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLE = {
  home: 'Today',
  log: 'Log Session',
  history: 'History',
  resources: 'Library',
  settings: 'Settings',
};

export default function App() {
  const { loading, error, successMsg, isSettingsOpen, setIsSettingsOpen } = useApp();
  const [tab, setTab] = useState('home');

  return (
    <>
      {/* Desktop background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1,
        background: '#0a0808',
        backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,107,53,0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,200,150,0.04) 0%, transparent 60%)',
      }} />

      <div className="app-shell">
        <Navbar />

        <div style={{ padding: '0.6rem 1rem 0', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(20,16,16,0.6)' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {PAGE_TITLE[tab]}
          </span>
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '50vh' }}>
              <div style={{ color: 'var(--fire)', animation: 'spin 2s linear infinite' }}>
                <Dumbbell size={48} />
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Loading your workouts...</div>
            </div>
          ) : (
            <>
              {tab === 'home' && <Dashboard onGoLog={() => setTab('log')} />}
              {tab === 'log' && <ExerciseLogger />}
              {tab === 'history' && <HistoryView />}
              {tab === 'resources' && <ResourceHub />}
              {tab === 'settings' && <SettingsPage />}
            </>
          )}
        </div>

        <BottomNav active={tab} onChange={setTab} />
      </div>

      {/* Toasts */}
      {successMsg && (
        <div className="toast toast-success">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="toast toast-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <MediaPlayerModal />
      <SettingsModal />
    </>
  );
}
