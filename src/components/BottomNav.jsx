import React from 'react';
import { Home, History, BookOpen, Settings, Plus } from 'lucide-react';

const TABS = [
  { id: 'home',      label: 'Home',    Icon: Home },
  { id: 'history',   label: 'History', Icon: History },
  { id: 'log',       label: '',        Icon: Plus,  isCenter: true },
  { id: 'resources', label: 'Library', Icon: BookOpen },
  { id: 'settings',  label: 'More',    Icon: Settings },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon, isCenter }) =>
        isCenter ? (
          <button
            key={id}
            className={`nav-log-btn${active === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
            title="Log workout"
            aria-label="Log workout"
          >
            <Icon size={24} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            key={id}
            className={`nav-item${active === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="nav-icon-wrap">
              <Icon size={20} strokeWidth={active === id ? 2.5 : 1.8} />
            </span>
            <span>{label}</span>
          </button>
        )
      )}
    </nav>
  );
}
