import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Dashboard from './Dashboard';
import MediaPlayerModal from './MediaPlayerModal';
import SettingsModal from './SettingsModal';
import ProfileSetup from './ProfileSetup';
import { CheckCircle, AlertTriangle, Dumbbell, RefreshCw, LogOut } from 'lucide-react';

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

// Shown when profiles could not be loaded — so a network failure is never
// mistaken for "no profile" (which would wrongly offer profile creation).
function ProfilesError({ onRetry }) {
  const { signOut } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <AlertTriangle size={24} color="#F59E0B" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.5rem' }}>Couldn&apos;t load your profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          We couldn&apos;t reach the server. Your data is safe — check your connection and try again.
        </p>
        <button type="button" onClick={onRetry} className="btn btn-fire btn-full" style={{ borderRadius: 'var(--radius-md)' }}>
          <RefreshCw size={16} /> Try again
        </button>
        <button type="button" onClick={signOut} className="btn btn-ghost btn-full" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function AuthenticatedApp() {
  const { loading, error, successMsg, profiles, activeProfileId, profilesError, retryLoadProfiles } = useApp();
  const [tab, setTab] = useState('home');

  useEffect(() => {
    document.title = `${PAGE_TITLE[tab]} - ParentFit`;
  }, [tab]);

  if (profilesError) return <ProfilesError onRetry={retryLoadProfiles} />;
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
