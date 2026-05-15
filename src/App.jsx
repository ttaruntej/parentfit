import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ExerciseLogger from './components/ExerciseLogger';
import HistoryView from './components/HistoryView';
import ResourceHub from './components/ResourceHub';
import MediaPlayerModal from './components/MediaPlayerModal';
import SettingsModal from './components/SettingsModal';
import SignIn from './components/SignIn';
import ProfileSetup from './components/ProfileSetup';
import { CheckCircle, AlertTriangle, Dumbbell } from 'lucide-react';


function KnowledgeCard({ title, desc, tag, img }) {
  return (
    <div className="content-card">
      <img src={img} alt={title} className="content-card-img" />
      <div className="content-card-overlay">
        <div className="content-card-tag">{tag}</div>
        <div className="content-card-title">{title}</div>
        <div className="content-card-desc">{desc}</div>
      </div>
    </div>
  );
}

function MorePage() {
  const knowledgeItems = [
    {
      title: "Micro-Workouts",
      desc: "5-15 min bursts for busy schedules. No gym required.",
      tag: "Efficiency",
      img: "./src/assets/content/micro_workouts.png"
    },
    {
      title: "Functional Dad Strength",
      desc: "Compound lifts to make parenting effortless.",
      tag: "Strength",
      img: "./src/assets/content/dad_strength.png"
    },
    {
      title: "Energy Nutrition",
      desc: "Fuel your day with protein-focused meal prep.",
      tag: "Nutrition",
      img: "./src/assets/content/nutrition.png"
    },
    {
      title: "Family Adventure",
      desc: "Turn outdoor time into a family fitness journey.",
      tag: "Lifestyle",
      img: "./src/assets/content/family_fitness.png"
    }
  ];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div className="section-header">
          <div className="section-title">Knowledge Hub</div>
          <div className="glass-pill">Curated</div>
        </div>
        <div className="knowledge-grid">
          {knowledgeItems.map((item, i) => (
            <KnowledgeCard key={i} {...item} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
        ParentFit · Firebase Sync
      </div>
    </div>
  );
}


const PAGE_TITLE = {
  home: 'Today',
  log: 'Log Session',
  history: 'History',
  resources: 'Library',
  settings: 'More',
};

const FullScreenSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#0a0808' }}>
    <div style={{ color: 'var(--fire)', animation: 'spin 2s linear infinite' }}>
      <Dumbbell size={48} />
    </div>
    <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Loading...</div>
  </div>
);

export default function App() {
  const { user, loadingSession } = useAuth();
  const { loading, error, successMsg, profiles, activeProfileId } = useApp();
  const [tab, setTab] = useState('home');

  useEffect(() => {
    document.title = `${PAGE_TITLE[tab]} · ParentFit`;
  }, [tab]);

  if (loadingSession) return <FullScreenSpinner />;
  if (!user) return <SignIn />;
  if (!loading && profiles.length === 0) return <ProfileSetup />;
  if (!activeProfileId) return <FullScreenSpinner />;

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
              {tab === 'settings' && <MorePage />}
            </>
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
