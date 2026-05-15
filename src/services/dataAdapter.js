import {
  collection, doc, addDoc, deleteDoc, getDocs, getDoc, setDoc, updateDoc, writeBatch,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../lib/firebaseAuth';
import { db } from '../lib/firebaseDb';
import { storage } from '../lib/firebaseStorage';

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

const profilesCol  = ()                => collection(db, 'profiles');
const profileDoc   = (profileId)        => doc(db, 'profiles', profileId);
const sessionsCol  = (profileId)        => collection(db, 'profiles', profileId, 'sessions');
const resourcesCol = (profileId)        => collection(db, 'profiles', profileId, 'resources');
const sessionDoc   = (profileId, id)    => doc(db, 'profiles', profileId, 'sessions',  id);
const resourceDoc  = (profileId, id)    => doc(db, 'profiles', profileId, 'resources', id);
const groupsCol    = ()                 => collection(db, 'groups');
const groupDoc     = (groupId)          => doc(db, 'groups', groupId);

function normalizeEmails(emails) {
  return [...new Set((emails || [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean))];
}

// A profile's own (pre-group) allow-list. Older docs only have allowedEmails.
function baseEmailsOf(profile) {
  return normalizeEmails(profile.baseEmails || profile.allowedEmails || []);
}

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
  // Any signed-in user may create a profile. Always seed the allow-list with
  // the creator's own email so they can read/write it — firestore.rules
  // rejects a create where the creator is not on the list.
  const creator = myEmail();
  const seed = normalizeEmails(creator === ADMIN_EMAIL ? allowedEmails : [creator, ...allowedEmails]);
  const profile = {
    slug, name, initials, color,
    baseEmails: seed,
    allowedEmails: seed,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(profilesCol(), profile);
  return { id: ref.id, slug, name, initials, color, allowedEmails: seed };
}

// Admin-only: replace a profile's own allow-list. If the profile belongs to a
// group, the group's combined access is recomputed so siblings stay in sync.
export async function setProfileAccess(profileId, emails) {
  const base = normalizeEmails(emails);
  const snap = await getDoc(profileDoc(profileId));
  const groupId = snap.exists() ? (snap.data().groupId || null) : null;
  if (groupId) {
    await updateDoc(profileDoc(profileId), { baseEmails: base });
    await recomputeGroupAccess(groupId);
  } else {
    await updateDoc(profileDoc(profileId), { baseEmails: base, allowedEmails: base });
  }
  return base;
}

// ---- Groups ---------------------------------------------------------------
// A group lets several profiles see and edit each other's data. Access is
// enforced by writing the union of every member's own emails into each
// member profile's allowedEmails (the field the security rules check).

export async function listGroups() {
  const snap = await getDocs(groupsCol());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a['name'] || '').localeCompare(String(b['name'] || '')));
}

export async function saveGroup({ id, name, profileIds }) {
  const groupId = id || doc(groupsCol()).id;
  const ids = [...new Set(profileIds || [])];

  const all = (await getDocs(profilesCol())).docs.map((d) => ({ id: d.id, ...d.data() }));
  const members = all.filter((p) => ids.includes(p.id));
  const removed = all.filter((p) => p.groupId === groupId && !ids.includes(p.id));
  const union = normalizeEmails(members.flatMap(baseEmailsOf));

  const batch = writeBatch(db);
  members.forEach((p) => batch.update(profileDoc(p.id), {
    groupId,
    baseEmails: baseEmailsOf(p),
    allowedEmails: union,
  }));
  removed.forEach((p) => batch.update(profileDoc(p.id), {
    groupId: null,
    allowedEmails: baseEmailsOf(p),
  }));
  batch.set(groupDoc(groupId), {
    name: (name || 'Group').trim(),
    profileIds: ids,
    memberEmails: union,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { id: groupId, name, profileIds: ids, memberEmails: union };
}

export async function deleteGroup(id) {
  const all = (await getDocs(profilesCol())).docs.map((d) => ({ id: d.id, ...d.data() }));
  const members = all.filter((p) => p.groupId === id);
  const batch = writeBatch(db);
  members.forEach((p) => batch.update(profileDoc(p.id), {
    groupId: null,
    allowedEmails: baseEmailsOf(p),
  }));
  batch.delete(groupDoc(id));
  await batch.commit();
}

async function recomputeGroupAccess(groupId) {
  const gSnap = await getDoc(groupDoc(groupId));
  if (!gSnap.exists()) return;
  const profileIds = gSnap.data().profileIds || [];
  const members = [];
  for (const pid of profileIds) {
    const ps = await getDoc(profileDoc(pid));
    if (ps.exists()) members.push({ id: pid, ...ps.data() });
  }
  const union = normalizeEmails(members.flatMap(baseEmailsOf));
  const batch = writeBatch(db);
  members.forEach((m) => batch.update(profileDoc(m.id), { allowedEmails: union, groupId }));
  batch.update(groupDoc(groupId), { memberEmails: union });
  await batch.commit();
}

// ---- Sessions & resources -------------------------------------------------

async function uploadSessionPhoto(profileId, sessionId, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `profiles/${profileId}/sessions/${sessionId}/photo.${ext}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
  const photoUrl = await getDownloadURL(r);
  return { photoUrl, photoPath: path };
}

export async function addSession(profileId, session) {
  // photoFile is a browser File object — upload it to Storage first, then
  // store only the resulting URL on the Firestore document.
  const { photoFile, ...rest } = session;
  const ref = doc(sessionsCol(profileId));
  let photo = {};
  if (photoFile) {
    photo = await uploadSessionPhoto(profileId, ref.id, photoFile);
  }
  const payload = sessionToDoc({ ...rest, ...photo });
  await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  return { id: ref.id, ...rest, ...photo };
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
    photoUrl: data.photoUrl || null,
    photoPath: data.photoPath || null,
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
    photoUrl: s.photoUrl || null,
    photoPath: s.photoPath || null,
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
