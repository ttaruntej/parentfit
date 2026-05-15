import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildWorkoutDataset, PROFILES } from './workoutPreprocessor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'parentfit-prod';
const DATABASE_ID = '(default)';
const DOC_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

function runFirebase(args) {
  const command = process.platform === 'win32' ? 'cmd' : 'npx';
  const commandArgs = process.platform === 'win32'
    ? ['/c', 'npx', '-y', 'firebase-tools@latest', ...args]
    : ['-y', 'firebase-tools@latest', ...args];
  return execFileSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// The Firestore REST API called with a project member's OAuth token bypasses
// security rules, so this seed import works regardless of the allow-lists.
function getAccessToken() {
  const parsed = JSON.parse(runFirebase(['login:list', '--json']));
  const login = parsed.result?.[0];
  if (!login?.tokens?.access_token) throw new Error('Firebase CLI is not logged in or no access token was returned.');
  return login.tokens.access_token;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body.error?.message || response.statusText;
    throw new Error(`${options.method || 'GET'} ${url} failed: ${message}`);
  }
  return body;
}

function authed(accessToken, options = {}) {
  return {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
}

function toFirestoreValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return { nullValue: null };
  if (value?.__timestamp) return { timestampValue: new Date(value.__timestamp).toISOString() };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue).filter(Boolean),
      },
    };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(object) {
  return Object.fromEntries(
    Object.entries(object)
      .map(([key, value]) => [key, toFirestoreValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function fromFirestoreValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function docName(relativePath) {
  return `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${relativePath}`;
}

async function listDocuments(accessToken, relativeCollectionPath) {
  const docs = [];
  let pageToken = null;

  do {
    const url = new URL(`${DOC_ROOT}/${relativeCollectionPath}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const body = await requestJson(url, authed(accessToken));
    docs.push(...(body.documents || []));
    pageToken = body.nextPageToken || null;
  } while (pageToken);

  return docs;
}

async function batchWrite(accessToken, writes) {
  for (let i = 0; i < writes.length; i += 450) {
    const chunk = writes.slice(i, i + 450);
    if (chunk.length === 0) continue;
    await requestJson(`${DOC_ROOT}:batchWrite`, authed(accessToken, {
      method: 'POST',
      body: JSON.stringify({ writes: chunk }),
    }));
  }
}

function profileMatches(doc, profile) {
  const data = fromFirestoreFields(doc.fields || {});
  return data.slug === profile.slug || data.name === profile.name || doc.name.endsWith(`/profiles/${profile.slug}`);
}

// Profiles live in a shared top-level collection; the document id is the slug.
async function resolveProfiles(accessToken) {
  const existingDocs = await listDocuments(accessToken, 'profiles');
  const result = new Map();

  for (const profile of PROFILES) {
    const match = existingDocs.find((doc) => profileMatches(doc, profile));
    const profileId = match?.name.split('/').pop() || profile.slug;
    result.set(profile.slug, { ...profile, id: profileId });
  }

  return result;
}

async function deletePreviousSessions(accessToken, profileMap) {
  const deleteWrites = [];
  for (const profile of profileMap.values()) {
    const sessions = await listDocuments(accessToken, `profiles/${profile.id}/sessions`);
    for (const session of sessions) {
      deleteWrites.push({ delete: session.name });
    }
  }
  await batchWrite(accessToken, deleteWrites);
  return deleteWrites.length;
}

function sessionWrite(profileId, session, importedAt) {
  const payload = {
    ...session,
    createdAt: { __timestamp: importedAt },
    importedAt: { __timestamp: importedAt },
    performedAtTs: { __timestamp: session.performedAt },
    sourceMessageAtTs: session.sourceMessageAt ? { __timestamp: session.sourceMessageAt } : null,
  };

  return {
    update: {
      name: docName(`profiles/${profileId}/sessions/${session.id}`),
      fields: toFirestoreFields(payload),
    },
  };
}

function profileWrite(profile, importedAt, sessionCount) {
  return {
    update: {
      name: docName(`profiles/${profile.id}`),
      fields: toFirestoreFields({
        slug: profile.slug,
        name: profile.name,
        initials: profile.initials,
        color: profile.color,
        allowedEmails: (profile.allowedEmails || []).map((e) => String(e).trim().toLowerCase()),
        createdAt: { __timestamp: importedAt },
        updatedAt: { __timestamp: importedAt },
        importedAt: { __timestamp: importedAt },
        sessionCount,
      }),
    },
    updateMask: {
      fieldPaths: ['slug', 'name', 'initials', 'color', 'allowedEmails', 'createdAt', 'updatedAt', 'importedAt', 'sessionCount'],
    },
  };
}

async function importWorkouts() {
  const dataset = buildWorkoutDataset(ROOT);
  const accessToken = getAccessToken();
  const importedAt = new Date().toISOString();
  const profileMap = await resolveProfiles(accessToken);

  const deletedSessions = await deletePreviousSessions(accessToken, profileMap);

  const writes = [];
  for (const profile of profileMap.values()) {
    const sessions = dataset.sessionsByProfile[profile.slug] || [];
    writes.push(profileWrite(profile, importedAt, sessions.length));
    for (const session of sessions) writes.push(sessionWrite(profile.id, session, importedAt));
  }

  await batchWrite(accessToken, writes);

  return {
    deletedSessions,
    writtenSessions: dataset.sessions.length,
    profileTotals: dataset.meta.profileTotals,
    profileAccess: Object.fromEntries(
      [...profileMap.values()].map((p) => [p.slug, p.allowedEmails || []]),
    ),
  };
}

importWorkouts()
  .then((result) => {
    console.log(`deleted previous sessions: ${result.deletedSessions}`);
    console.log(`written sessions: ${result.writtenSessions}`);
    console.log(`profile totals: ${JSON.stringify(result.profileTotals)}`);
    console.log(`profile access: ${JSON.stringify(result.profileAccess)}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
