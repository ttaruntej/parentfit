import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listProfiles, createProfile, setProfileAccess, deleteProfile, ADMIN_EMAIL,
  addSession, deleteSession,
  addResource, updateResource, deleteResource,
  subscribeSessions, subscribeResources,
} from '../services/dataAdapter';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState([]);
  // Not persisted to localStorage on purpose: a browser-wide key would leak
  // one account's active profile to the next person who signs in on the same
  // device. It is always (re)derived from the freshly loaded profile list.
  const [activeProfileId, setActiveProfileId] = useState(null);
  // Latest activeProfileId, readable inside the loader effect without making
  // it a dependency — so switching/creating a profile never re-fetches.
  const activeProfileIdRef = useRef(activeProfileId);

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
    activeProfileIdRef.current = activeProfileId;
  }, [activeProfileId]);

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
      // Keep retrying in the background until the profile list loads.
      // Permanent errors (permission-denied, unauthenticated) break
      // the loop immediately so the user isn't stuck forever.
      const PERMANENT_ERRORS = new Set([
        'permission-denied', 'unauthenticated', 'not-found',
      ]);
      for (let attempt = 1; !cancelled; attempt += 1) {
        try {
          const ps = await listProfiles();
          if (cancelled) return;
          setProfiles(ps);
          const current = activeProfileIdRef.current;
          const nextProfileId = current && ps.some((p) => p.id === current)
            ? current
            : ps[0]?.id || null;
          if (nextProfileId !== current) {
            setActiveProfileId(nextProfileId);
          }
          if (ps.length === 0) setLoading(false);
          return;
        } catch (e) {
          console.error(`listProfiles attempt ${attempt} failed:`, e);
          // Break immediately for permanent errors — retrying would be
          // pointless and leaves the user on an infinite loading spinner.
          if (PERMANENT_ERRORS.has(e?.code)) {
            console.error('Permanent error loading profiles, giving up:', e.code);
            if (!cancelled) setLoading(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 1000, 5000)));
        }
      }
    })();
    return () => { cancelled = true; };
    // Deliberately NOT depending on activeProfileId: the profile list is
    // loaded once per sign-in, not when the active profile changes.
    // Creating/switching a profile updates state directly.
  }, [user]);

  useEffect(() => {
    // Only ever subscribe to a profile that belongs to the signed-in user —
    // never to a stale id. This is the hard guarantee against showing one
    // account another account's data.
    if (!user || !activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
      setExerciseData({ logs: [] });
      return undefined;
    }
    setLoading(true);

    const unsubA = subscribeSessions(activeProfileId, (logs) => {
      setExerciseData({ logs });
      setLoading(false);
    });

    return () => { unsubA(); };
  }, [user, activeProfileId, profiles]);

  useEffect(() => {
    if (!user || !activeProfileId || !resourcesEnabled
      || !profiles.some((p) => p.id === activeProfileId)) {
      return undefined;
    }
    setResourceLoading(true);

    const unsubscribe = subscribeResources(activeProfileId, (resources) => {
      setResourceData({ resources });
      setResourceLoading(false);
    });

    return () => { unsubscribe(); };
  }, [user, activeProfileId, resourcesEnabled, profiles]);

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

  const updateResourceLink = async (id, fields) => {
    if (!activeProfileId) return;
    setSyncing(true);
    try {
      await updateResource(activeProfileId, id, fields);
      triggerSuccess('Resource updated');
    } catch (e) {
      console.error(e);
      triggerError('Failed to update resource.');
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
    setExerciseData({ logs: [] });
    setResourceData({ resources: [] });
    setResourcesEnabled(false);
  };

  const addProfile = async (input) => {
    const created = await createProfile(input);
    setProfiles((ps) => [...ps, created]);
    // Always make the newly created profile the active one.
    switchProfile(created.id);
    return created;
  };

  // Admin-only: permanently delete a profile and all its data.
  const removeProfile = async (profileId) => {
    await deleteProfile(profileId);
    setProfiles((ps) => ps.filter((p) => p.id !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfileId(profiles.find((p) => p.id !== profileId)?.id || null);
    }
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
      switchProfile, addProfile, updateProfileAccess, removeProfile,
      addExerciseLog, deleteExerciseLog,
      addResourceLink, updateResourceLink, deleteResourceLink,
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
