import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getExerciseLogs,
  saveExerciseLogs,
  getResourceLinks,
  saveResourceLinks,
  getConfig,
  saveConfig as persistConfig,
  getActiveUserId,
  setActiveUserId,
  USERS,
} from '../services/githubBackend';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [exerciseData, setExerciseData] = useState({ logs: [] });
  const [resourceData, setResourceData]  = useState({ resources: [] });
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [mediaPlayer, setMediaPlayer] = useState({ isOpen: false, url: '', title: '', type: 'video' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [ghConfig, setGhConfig] = useState(() => getConfig());
  const [activeUserId, _setActiveUserId] = useState(() => getActiveUserId());

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };
  const triggerError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 6000);
  };

  // ── Load data for the active user ──────────────────────────────────────────
  const loadData = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const uid = userId || activeUserId;
      const [exercises, resources] = await Promise.all([
        getExerciseLogs(uid),
        getResourceLinks(uid),
      ]);
      setExerciseData(exercises || { logs: [] });
      setResourceData(resources || { resources: [] });
    } catch (err) {
      console.error('Failed loading data:', err);
      triggerError('Could not sync with GitHub. Serving cached data.');
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => { loadData(activeUserId); }, [activeUserId]);

  // ── Magic Link: Auto-configure via URL params ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get('owner');
    const repo  = params.get('repo');
    const branch = params.get('branch');

    if (owner || repo) {
      persistConfig({
        owner:  owner  || ghConfig.owner,
        repo:   repo   || ghConfig.repo,
        branch: branch || ghConfig.branch || 'main',
      });
      // Refresh local state
      setGhConfig(getConfig());
      triggerSuccess('Magic Link detected! Configuration synced ✓');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data
      setTimeout(() => loadData(activeUserId), 500);
    }
  }, [ghConfig, activeUserId, loadData]);

  // ── Switch user ────────────────────────────────────────────────────────────
  const switchUser = (userId) => {
    setActiveUserId(userId);
    _setActiveUserId(userId);
    // loadData will fire via useEffect on activeUserId change
  };

  // ── Exercise log mutators ──────────────────────────────────────────────────
  const addExerciseLog = async (newLog) => {
    setSyncing(true);
    const updated = { ...exerciseData, logs: [newLog, ...(exerciseData.logs || [])] };
    setExerciseData(updated);
    try {
      const res = await saveExerciseLogs(updated, activeUserId);
      triggerSuccess(res.simulated
        ? `Session logged locally! Add GitHub token in Settings to sync.`
        : `Session committed to GitHub ✓`
      );
    } catch (err) {
      triggerError('Failed to save session to GitHub. Cached locally.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteExerciseLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
    setSyncing(true);
    const updated = { ...exerciseData, logs: (exerciseData.logs || []).filter(l => l.id !== logId) };
    setExerciseData(updated);
    try {
      await saveExerciseLogs(updated, activeUserId);
      triggerSuccess('Session removed.');
    } catch (err) {
      console.error('Delete failed:', err);
      triggerError(`Failed to delete remotely: ${err.message || 'Check your token'}`);
      // Rollback local state on error
      loadData(activeUserId);
    } finally {
      setSyncing(false);
    }
  };

  // ── Resource link mutators ─────────────────────────────────────────────────
  const addResourceLink = async (newResource) => {
    setSyncing(true);
    const updated = { ...resourceData, resources: [newResource, ...(resourceData.resources || [])] };
    setResourceData(updated);
    try {
      const res = await saveResourceLinks(updated, activeUserId);
      triggerSuccess(res.simulated ? 'Resource saved locally.' : 'Resource synced to GitHub ✓');
    } catch (err) {
      triggerError('Failed to save resource remotely.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteResourceLink = async (resId) => {
    if (!window.confirm('Delete this resource?')) return;
    setSyncing(true);
    const updated = { ...resourceData, resources: (resourceData.resources || []).filter(r => r.id !== resId) };
    setResourceData(updated);
    try {
      await saveResourceLinks(updated, activeUserId);
      triggerSuccess('Resource removed.');
    } catch (err) {
      triggerError('Failed to remove resource.');
      loadData(activeUserId);
    } finally {
      setSyncing(false);
    }
  };

  // ── Config & sync ──────────────────────────────────────────────────────────
  const forceManualSync = async () => {
    await loadData(activeUserId);
    triggerSuccess('Synced from GitHub ✓');
  };

  const updateConfig = (newCfg) => {
    persistConfig(newCfg);
    setGhConfig(newCfg);
    setIsSettingsOpen(false);
    triggerSuccess('Settings saved. Reloading data...');
    setTimeout(() => loadData(activeUserId), 300);
  };

  // ── Media player ──────────────────────────────────────────────────────────
  const openPlayer  = (url, title, type = 'video') => setMediaPlayer({ isOpen: true, url, title, type });
  const closePlayer = () => setMediaPlayer({ isOpen: false, url: '', title: '', type: 'video' });

  const value = {
    exerciseData, resourceData,
    loading, syncing, error, successMsg,
    mediaPlayer, isSettingsOpen, setIsSettingsOpen,
    ghConfig, updateConfig,
    activeUserId, switchUser,
    users: USERS,
    addExerciseLog, deleteExerciseLog,
    addResourceLink, deleteResourceLink,
    forceManualSync,
    openPlayer, closePlayer,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
