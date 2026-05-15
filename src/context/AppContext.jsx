import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listProfiles, createProfile, setProfileAccess, ADMIN_EMAIL,
  addSession, deleteSession,
  addResource, deleteResource,
  subscribeSessions, subscribeResources,
} from '../services/dataAdapter';

const AppContext = createContext(null);
const ACTIVE_PROFILE_KEY = 'parentfit_active_profile';

export const AppProvider = ({ children }) => {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(
    () => localStorage.getItem(ACTIVE_PROFILE_KEY) || null
  );

  const [exerciseData, setExerciseData] = useState({ logs: [] });
  const [resourceData, setResourceData] = useState({ resources: [] });
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourcesEnabled, setResourcesEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [mediaPlayer, setMediaPlayer] = useState({ isOpen: false, url: '', title: '', type: 'video' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const triggerSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };
  const triggerError   = (msg) => { setError(msg);      setTimeout(() => setError(null), 6000); };

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setExerciseData({ logs: [] });
      setResourceData({ resources: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ps = await listProfiles();
        if (cancelled) return;
        setProfiles(ps);
        const nextProfileId = activeProfileId && ps.some((p) => p.id === activeProfileId)
          ? activeProfileId
          : ps[0]?.id || null;
        if (nextProfileId && nextProfileId !== activeProfileId) {
          setActiveProfileId(nextProfileId);
          localStorage.setItem(ACTIVE_PROFILE_KEY, nextProfileId);
        }
        if (ps.length === 0) setLoading(false);
      } catch (e) {
        console.error(e);
        triggerError('Could not load profiles.');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, activeProfileId]);

  useEffect(() => {
    if (!user || !activeProfileId) return;
    setLoading(true);

    const unsubA = subscribeSessions(activeProfileId, (logs) => {
      setExerciseData({ logs });
      setLoading(false);
    });

    return () => { unsubA(); };
  }, [user, activeProfileId]);

  useEffect(() => {
    if (!user || !activeProfileId || !resourcesEnabled) return undefined;
    setResourceLoading(true);

    const unsubscribe = subscribeResources(activeProfileId, (resources) => {
      setResourceData({ resources });
      setResourceLoading(false);
    });

    return () => { unsubscribe(); };
  }, [user, activeProfileId, resourcesEnabled]);

  const ensureResourcesLoaded = useCallback(() => {
    setResourcesEnabled(true);
  }, []);

  const addExerciseLog = async (newLog) => {
    if (!activeProfileId) return;
    setSyncing(true);
    try {
      await addSession(activeProfileId, newLog);
      triggerSuccess('Session synced');
    } catch (e) {
      console.error(e);
      triggerError('Failed to save session.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteExerciseLog = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    setSyncing(true);
    try {
      await deleteSession(activeProfileId, id);
      triggerSuccess('Session removed.');
    } catch (e) {
      console.error(e);
      triggerError('Failed to delete session.');
    } finally {
      setSyncing(false);
    }
  };

  const addResourceLink = async (newResource) => {
    if (!activeProfileId) return;
    setSyncing(true);
    try {
      await addResource(activeProfileId, newResource);
      triggerSuccess('Resource saved');
    } catch (e) {
      console.error(e);
      triggerError('Failed to save resource.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteResourceLink = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    setSyncing(true);
    try {
      await deleteResource(activeProfileId, id);
      triggerSuccess('Resource removed.');
    } catch (e) {
      console.error(e);
      triggerError('Failed to delete resource.');
    } finally {
      setSyncing(false);
    }
  };

  const switchProfile = (profileId) => {
    setActiveProfileId(profileId);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    setResourceData({ resources: [] });
    setResourcesEnabled(false);
  };

  const addProfile = async (input) => {
    const created = await createProfile(input);
    setProfiles((ps) => [...ps, created]);
    if (!activeProfileId) switchProfile(created.id);
    return created;
  };

  // Admin-only: change which emails may see a profile.
  const updateProfileAccess = async (profileId, emails) => {
    const baseEmails = await setProfileAccess(profileId, emails);
    setProfiles((ps) => ps.map((p) => (
      p.id === profileId ? { ...p, baseEmails, allowedEmails: baseEmails } : p
    )));
    return baseEmails;
  };

  const forceManualSync = async () => {
    triggerSuccess('Live');
  };

  const openPlayer  = (url, title, type = 'video') => setMediaPlayer({ isOpen: true, url, title, type });
  const closePlayer = () => setMediaPlayer({ isOpen: false, url: '', title: '', type: 'video' });

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;
  const isAdmin = (user?.email || '').toLowerCase() === ADMIN_EMAIL;

  return (
    <AppContext.Provider value={{
      exerciseData, resourceData,
      loading, resourceLoading, syncing, error, successMsg,
      mediaPlayer, isSettingsOpen, setIsSettingsOpen,
      profiles, activeProfile, activeProfileId, isAdmin,
      switchProfile, addProfile, updateProfileAccess,
      addExerciseLog, deleteExerciseLog,
      addResourceLink, deleteResourceLink,
      ensureResourcesLoaded,
      forceManualSync,
      openPlayer, closePlayer,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside <AppProvider>');
  return ctx;
};
