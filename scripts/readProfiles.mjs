/**
 * Lists Firestore profiles using gcloud ADC or firebase-admin.
 * Run: node scripts/readProfiles.mjs
 */
import { execSync } from 'child_process';

const PROJECT_ID = 'parentfit-prod';

// Get a token via gcloud if available
let token = null;
try {
  token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  console.log('Using gcloud token\n');
} catch {
  console.log('gcloud not found, trying firebase login token...\n');
  // Try firebase token
  try {
    const out = execSync(
      'cmd /c npx -y firebase-tools@latest login --reauth 2>&1',
      { encoding: 'utf8', timeout: 5000 }
    );
  } catch {}
}

if (!token) {
  console.error('Could not obtain a token. Please run: gcloud auth application-default login');
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function field(f, key) {
  if (!f || !f[key]) return null;
  const v = f[key];
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return v.integerValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(i => i.stringValue || i.integerValue || '');
  return JSON.stringify(v);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Profiles
console.log('═══════════════════════════════════════════');
console.log('  Firestore: profiles');
console.log('═══════════════════════════════════════════');
const profilesData = await fetchJson(`${BASE}/profiles`);
const docs = profilesData.documents || [];
if (docs.length === 0) {
  console.log('  (no profiles)');
} else {
  docs.forEach((doc, i) => {
    const id = doc.name.split('/').pop();
    const f = doc.fields;
    console.log(`\n  [${i+1}] ID:       ${id}`);
    console.log(`       Name:     ${field(f,'name')} (${field(f,'initials')})`);
    console.log(`       Slug:     ${field(f,'slug')}`);
    console.log(`       Color:    ${field(f,'color')}`);
    const emails = field(f,'allowedEmails') || [];
    console.log(`       Emails:   ${emails.join(', ')}`);
    const groupId = field(f,'groupId');
    if (groupId) console.log(`       Group:    ${groupId}`);
    console.log(`       Created:  ${field(f,'createdAt')}`);
  });
  console.log(`\n  Total profiles: ${docs.length}`);
}

// Groups
console.log('\n═══════════════════════════════════════════');
console.log('  Firestore: groups');
console.log('═══════════════════════════════════════════');
try {
  const groupsData = await fetchJson(`${BASE}/groups`);
  const groups = groupsData.documents || [];
  if (groups.length === 0) {
    console.log('  (no groups)');
  } else {
    groups.forEach((doc, i) => {
      const id = doc.name.split('/').pop();
      const f = doc.fields;
      const pIds = field(f,'profileIds') || [];
      const mEmails = field(f,'memberEmails') || [];
      console.log(`\n  [${i+1}] ID:       ${id}`);
      console.log(`       Name:     ${field(f,'name')}`);
      console.log(`       Profiles: ${pIds.join(', ')}`);
      console.log(`       Members:  ${mEmails.join(', ')}`);
    });
  }
} catch (e) {
  console.log('  (could not fetch groups:', e.message + ')');
}
