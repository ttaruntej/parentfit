import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Dashboard from './Dashboard';
import MediaPlayerModal from './MediaPlayerModal';
import SettingsModal from './SettingsModal';
import ProfileSetup from './ProfileSetup';
import { CheckCircle, AlertTriangle, Dumbbell } from 'lucide-react';

const ExerciseLogger = lazy(() => import('./ExerciseLogger'));
const HistoryView = lazy(() => import('./HistoryView'));
const ResourceHub = lazy(() => import('./ResourceHub'));
const MorePage = lazy(() => import('./MorePage'));

const PAGE_TITLE = {
  home: 'Today',
  log: 'Log Session',
  history: 'History',
  resources: 'Library',
  settings: 'More',
};

function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', color: 'var(--fire)' }}>
      <Dumbbell size={36} className="spin" />
    </div>
  );
}

export default function AuthenticatedApp() {
  const { loading, error, successMsg, profiles, activeProfileId } = useApp();
  const [tab, setTab] = useState('home');

  useEffect(() => {
    document.title = `${PAGE_TITLE[tab]} - ParentFit`;
  }, [tab]);

  if (!loading && profiles.length === 0) return <ProfileSetup />;
  if (!activeProfileId) return <PageSpinner />;

  return (
    <>
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
            <PageSpinner />
          ) : (
            <Suspense fallback={<PageSpinner />}>
              {tab === 'home' && <Dashboard onGoLog={() => setTab('log')} />}
              {tab === 'log' && <ExerciseLogger />}
              {tab === 'history' && <HistoryView />}
              {tab === 'resources' && <ResourceHub />}
              {tab === 'settings' && <MorePage />}
            </Suspense>
          )}
        </div>

        <BottomNav active={tab} onChange={setTab} />
      </div>

      <div role="status" aria-live="polite">
        {successMsg && (
          <div className="toast toast-success">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}
        {error && (
          <div className="toast toast-error" role="alert">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>

      <MediaPlayerModal />
      <SettingsModal />
    </>
  );
}
