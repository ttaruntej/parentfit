import {
  collection, doc, addDoc, deleteDoc, getDocs, setDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../lib/firebaseAuth';
import { db } from '../lib/firebaseDb';

// The single account that may create profiles and manage who can see them.
export const ADMIN_EMAIL = 'taruntejthadana@gmail.com';

const myEmail = () => {
  const email = auth.currentUser?.email;
  if (!email) throw new Error('Not signed in');
  return email.toLowerCase();
};

export function isAdmin() {
  try {
    return myEmail() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

// Profiles now live in a shared top-level collection. Access is gated per
// profile by the allowedEmails field (see firestore.rules), not by the
// signed-in account's uid.
const profilesCol  = ()                => collection(db, 'profiles');
const profileDoc   = (profileId)        => doc(db, 'profiles', profileId);
const sessionsCol  = (profileId)        => collection(db, 'profiles', profileId, 'sessions');
const resourcesCol = (profileId)        => collection(db, 'profiles', profileId, 'resources');
const sessionDoc   = (profileId, id)    => doc(db, 'profiles', profileId, 'sessions',  id);
const resourceDoc  = (profileId, id)    => doc(db, 'profiles', profileId, 'resources', id);

export async function listProfiles() {
  // The admin sees every profile. Everyone else may only query the profiles
  // their email is allow-listed on — a broad read would be rejected by rules.
  const snap = isAdmin()
    ? await getDocs(profilesCol())
    : await getDocs(query(profilesCol(), where('allowedEmails', 'array-contains', myEmail())));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a['name'] || '').localeCompare(String(b['name'] || '')));
}

export async function createProfile({ slug, name, initials, color, allowedEmails = [] }) {
  // Use the slug as the document id so the app and the import script agree.
  const profile = {
    slug, name, initials, color,
    allowedEmails: normalizeEmails(allowedEmails),
    createdAt: serverTimestamp(),
  };
  await setDoc(profileDoc(slug), profile);
  return { id: slug, slug, name, initials, color, allowedEmails: profile.allowedEmails };
}

// Admin-only: replace the set of emails allowed to see a profile.
export async function setProfileAccess(profileId, emails) {
  const allowedEmails = normalizeEmails(emails);
  await updateDoc(profileDoc(profileId), { allowedEmails });
  return allowedEmails;
}

function normalizeEmails(emails) {
  return [...new Set((emails || [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean))];
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
    query(sessionsCol(profileId), orderBy('performedAtTs', 'desc')),
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
  const performedAt = data.performedAt || timestampToIso(data.performedAtTs) || data.date;
  const sourceMessageAt = data.sourceMessageAt || timestampToIso(data.sourceMessageAtTs);
  return {
    id: d.id,
    date: data.date,
    timeOfDay: data.timeOfDay,
    timeZone: data.timeZone,
    performedAt,
    performedAtTs: data.performedAtTs,
    sourceMessageAt,
    sourceMessageAtTs: data.sourceMessageAtTs,
    sourceSender: data.sourceSender,
    profileSlug: data.profileSlug,
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
  const performedAt = s.performedAt || s.date || new Date().toISOString();
  const performedAtDate = toValidDate(performedAt) || new Date();
  const sourceMessageAtDate = toValidDate(s.sourceMessageAt);
  return stripUndefined({
    date: s.date,
    timeOfDay: s.timeOfDay,
    timeZone: s.timeZone,
    performedAt,
    performedAtTs: s.performedAtTs || performedAtDate,
    sourceMessageAt: s.sourceMessageAt || null,
    sourceMessageAtTs: sourceMessageAtDate,
    sourceSender: s.sourceSender || null,
    profileSlug: s.profileSlug || null,
    workoutType: s.workoutType,
    category: s.category,
    title: s.title,
    durationMinutes: s.durationMinutes,
    intensity: s.intensity,
    notes: s.notes ?? '',
    exercises: s.exercises ?? [],
    dayOfWeek: s.dayOfWeek,
    rawHeader: s.rawHeader,
  });
}

function timestampToIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
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
