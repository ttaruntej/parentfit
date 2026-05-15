/**
 * Imports the Facebook fitness links from Resourcelinks.md into the
 * "thadana-apparao" profile's resources collection.
 *
 * Run with:  node scripts/importResources.mjs
 * Requires the Firebase CLI to be logged in (npx firebase-tools login).
 */
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'parentfit-prod';
const DATABASE_ID = '(default)';
const DOC_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const PROFILE_ID = 'thadana-apparao';
const SOURCE_FILE = path.join(ROOT, 'Resourcelinks.md');
const YEAR = 2026; // Resourcelinks.md spans Mar–May 2026

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getAccessToken() {
  const isWin = process.platform === 'win32';
  const command = isWin ? 'cmd' : 'npx';
  const args = isWin
    ? ['/c', 'npx', '-y', 'firebase-tools@latest', 'login:list', '--json']
    : ['-y', 'firebase-tools@latest', 'login:list', '--json'];
  const parsed = JSON.parse(execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const token = parsed.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error('Firebase CLI is not logged in.');
  return token;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url} failed: ${body.error?.message || response.statusText}`);
  return body;
}

function authed(token, options = {}) {
  return {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  };
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value?.__timestamp) return { timestampValue: new Date(value.__timestamp).toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
  return { stringValue: String(value) };
}

function toFirestoreFields(object) {
  return Object.fromEntries(Object.entries(object).map(([k, v]) => [k, toFirestoreValue(v)]));
}

function docName(relativePath) {
  return `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${relativePath}`;
}

async function listDocuments(token, relativeCollectionPath) {
  const docs = [];
  let pageToken = null;
  do {
    const url = new URL(`${DOC_ROOT}/${relativeCollectionPath}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const body = await requestJson(url, authed(token));
    docs.push(...(body.documents || []));
    pageToken = body.nextPageToken || null;
  } while (pageToken);
  return docs;
}

async function batchWrite(token, writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400);
    if (chunk.length === 0) continue;
    await requestJson(`${DOC_ROOT}:batchWrite`, authed(token, { method: 'POST', body: JSON.stringify({ writes: chunk }) }));
  }
}

// Parse one WhatsApp-export line: "[DD/MM, h:mm am] NAME: https://..."
function parseLine(line) {
  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) return null;
  const url = urlMatch[1].trim();

  let isoDate = `${YEAR}-01-01T00:00:00+05:30`;
  let label = '';
  const dm = line.match(/^\[(\d{1,2})\/(\d{1,2}),\s*(\d{1,2}):(\d{2})\s*([ap]m)\]/i);
  if (dm) {
    const [, dd, mm, hhRaw, min, ap] = dm;
    let hh = Number(hhRaw) % 12;
    if (/pm/i.test(ap)) hh += 12;
    const day = String(dd).padStart(2, '0');
    const month = String(mm).padStart(2, '0');
    isoDate = `${YEAR}-${month}-${day}T${String(hh).padStart(2, '0')}:${min}:00+05:30`;
    label = `${Number(dd)} ${MONTHS[Number(mm) - 1] || ''}`.trim();
  }
  return { url, addedAt: isoDate, label };
}

function buildResources() {
  const lines = fs.readFileSync(SOURCE_FILE, 'utf8').split(/\r?\n/);
  const seen = new Set();
  const resources = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed || seen.has(parsed.url)) continue;
    seen.add(parsed.url);
    const n = resources.length + 1;
    resources.push({
      id: `reslink_${String(n).padStart(3, '0')}`,
      title: parsed.label ? `Workout video · ${parsed.label}` : `Workout video ${n}`,
      url: parsed.url,
      type: 'video',
      tags: ['Facebook'],
      addedAt: parsed.addedAt,
    });
  }
  return resources;
}

async function run() {
  const token = getAccessToken();
  const resources = buildResources();
  const importedAt = new Date().toISOString();

  // Clear any previously imported resources so re-runs stay clean.
  const existing = await listDocuments(token, `profiles/${PROFILE_ID}/resources`);
  await batchWrite(token, existing.map((d) => ({ delete: d.name })));

  const writes = resources.map((r) => ({
    update: {
      name: docName(`profiles/${PROFILE_ID}/resources/${r.id}`),
      fields: toFirestoreFields({
        title: r.title,
        url: r.url,
        type: r.type,
        tags: r.tags,
        addedAt: r.addedAt,
        createdAt: { __timestamp: importedAt },
      }),
    },
  }));
  await batchWrite(token, writes);

  return { deleted: existing.length, written: resources.length };
}

run()
  .then((r) => {
    console.log(`profile: ${PROFILE_ID}`);
    console.log(`deleted previous resources: ${r.deleted}`);
    console.log(`written resources: ${r.written}`);
  })
  .catch((e) => { console.error(e); process.exit(1); });
