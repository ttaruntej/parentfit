import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const uid = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in');
  return u;
};

const profilesCol  = ()          => collection(db, 'users', uid(), 'profiles');
const sessionsCol  = (profileId) => collection(db, 'users', uid(), 'profiles', profileId, 'sessions');
const resourcesCol = (profileId) => collection(db, 'users', uid(), 'profiles', profileId, 'resources');

const sessionDoc  = (profileId, id) => doc(db, 'users', uid(), 'profiles', profileId, 'sessions',  id);
const resourceDoc = (profileId, id) => doc(db, 'users', uid(), 'profiles', profileId, 'resources', id);

export async function listProfiles() {
  const snap = await getDocs(query(profilesCol(), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProfile({ slug, name, initials, color }) {
  const ref = await addDoc(profilesCol(), {
    slug, name, initials, color,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, slug, name, initials, color };
}

export async function addSession(profileId, session) {
  const payload = sessionToDoc(session);
  const ref = await addDoc(sessionsCol(profileId), { ...payload, createdAt: serverTimestamp() });
  return { id: ref.id, ...session };
}

export async function deleteSession(profileId, id) {
  await deleteDoc(sessionDoc(profileId, id));
}

export async function addResource(profileId, resource) {
  const payload = {
    title: resource.title,
    url: resource.url,
    type: resource.type || 'video',
    tags: resource.tags || [],
    addedAt: resource.addedAt || new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(resourcesCol(profileId), payload);
  return { id: ref.id, ...resource, addedAt: payload.addedAt };
}

export async function deleteResource(profileId, id) {
  await deleteDoc(resourceDoc(profileId, id));
}

export function subscribeSessions(profileId, onChange) {
  return onSnapshot(
    query(sessionsCol(profileId), orderBy('date', 'desc')),
    (snap) => onChange(snap.docs.map(docToSession)),
    (err) => console.error('sessions listener error:', err),
  );
}

export function subscribeResources(profileId, onChange) {
  return onSnapshot(
    query(resourcesCol(profileId), orderBy('addedAt', 'desc')),
    (snap) => onChange(snap.docs.map(docToResource)),
    (err) => console.error('resources listener error:', err),
  );
}

function docToSession(d) {
  const data = d.data();
  return {
    id: d.id,
    date: data.date,
    workoutType: data.workoutType,
    category: data.category,
    title: data.title,
    durationMinutes: data.durationMinutes,
    intensity: data.intensity,
    notes: data.notes || '',
    exercises: data.exercises || [],
    dayOfWeek: data.dayOfWeek,
    rawHeader: data.rawHeader,
  };
}

function sessionToDoc(s) {
  return {
    date: s.date,
    workoutType: s.workoutType,
    category: s.category,
    title: s.title,
    durationMinutes: s.durationMinutes,
    intensity: s.intensity,
    notes: s.notes ?? '',
    exercises: s.exercises ?? [],
    dayOfWeek: s.dayOfWeek,
    rawHeader: s.rawHeader,
  };
}

function docToResource(d) {
  const data = d.data();
  return {
    id: d.id,
    title: data.title,
    url: data.url,
    type: data.type,
    tags: data.tags || [],
    addedAt: data.addedAt,
  };
}
