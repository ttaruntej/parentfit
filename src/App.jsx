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
  const { ghConfig, syncing, forceManualSync, setIsSettingsOpen } = useApp();
  const onOpenModal = () => setIsSettingsOpen(true);
  const isDemo = ghConfig.owner === 'parent-fitness' && ghConfig.repo === 'exercise-logs';

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
          <div className="glass-pill">AI Curated</div>
        </div>
        <div className="knowledge-grid">
          {knowledgeItems.map((item, i) => (
            <KnowledgeCard key={i} {...item} />
          ))}
        </div>
      </div>

      <div className="section-divider"></div>

      <div>
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>System & Preferences</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(0,200,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Github size={18} color="var(--teal)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>GitHub Backend</div>
                <div className="text-xs text-dim">Cloud synchronization</div>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px',
                background: isDemo ? 'rgba(245,158,11,0.1)' : 'rgba(0,200,150,0.1)',
                color: isDemo ? '#F59E0B' : 'var(--teal)',
                border: `1px solid ${isDemo ? 'rgba(245,158,11,0.2)' : 'rgba(0,200,150,0.2)'}`,
              }}>
                {isDemo ? 'Demo' : 'Live'}
              </span>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }} onClick={onOpenModal}>
              <Settings size={14} /> Configure Repository
            </button>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} color="var(--fire)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Manual Sync</div>
                <div className="text-xs text-dim">Force data refresh</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={forceManualSync} disabled={syncing}>
                {syncing ? '...' : 'Sync'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1rem', opacity: 0.6 }}>
        ParentFit v1.2 · Premium Experience
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
              {tab === 'settings' && <MorePage />}
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
