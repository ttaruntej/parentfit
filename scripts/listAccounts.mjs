/**
 * Lists all profiles in Firestore and Auth users.
 * Run: node scripts/listAccounts.mjs
 * Requires: npx firebase-tools login (already done)
 */
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = 'parentfit-prod';

function firebase(args) {
  const command = 'cmd';
  const commandArgs = ['/c', 'npx', '-y', 'firebase-tools@latest', ...args];
  return execFileSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// ── 1. List Firebase Auth users ──────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  Firebase Auth Users');
console.log('═══════════════════════════════════════════');
try {
  const authOut = firebase(['auth:export', '--format', 'json', '--project', PROJECT_ID]);
  const authData = JSON.parse(authOut);
  const users = authData.users || [];
  if (users.length === 0) {
    console.log('  (no users found)');
  } else {
    users.forEach((u, i) => {
      console.log(`\n  [${i + 1}] UID:          ${u.localId}`);
      console.log(`       Email:        ${u.email || '(no email)'}`);
      console.log(`       Display Name: ${u.displayName || '(none)'}`);
      console.log(`       Provider:     ${(u.providerUserInfo || []).map(p => p.providerId).join(', ') || 'unknown'}`);
      console.log(`       Created:      ${u.createdAt ? new Date(Number(u.createdAt)).toISOString() : 'unknown'}`);
      console.log(`       Last Sign-in: ${u.lastSignedInAt ? new Date(Number(u.lastSignedInAt)).toISOString() : 'never'}`);
      console.log(`       Email Verified: ${u.emailVerified ? 'Yes' : 'No'}`);
    });
    console.log(`\n  Total Auth users: ${users.length}`);
  }
} catch (e) {
  console.error('  Error fetching auth users:', e.message);
}

// ── 2. List Firestore profiles via REST ─────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  Firestore Profiles');
console.log('═══════════════════════════════════════════');
try {
  // Get a CLI access token
  const tokenOut = firebase(['auth:print-access-token', '--project', PROJECT_ID]);
  const token = tokenOut.trim();

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/profiles`;
  const curlOut = execFileSync('cmd', [
    '/c', 'curl', '-s', '-H', `Authorization: Bearer ${token}`, url,
  ], { encoding: 'utf8' });

  const data = JSON.parse(curlOut);
  const docs = data.documents || [];

  if (docs.length === 0) {
    console.log('  (no profiles found)');
  } else {
    docs.forEach((doc, i) => {
      const id = doc.name.split('/').pop();
      const f = doc.fields || {};
      const name = f.name?.stringValue || '(unnamed)';
      const slug = f.slug?.stringValue || '';
      const initials = f.initials?.stringValue || '';
      const color = f.color?.stringValue || '';
      const allowedEmails = (f.allowedEmails?.arrayValue?.values || []).map(v => v.stringValue);
      const groupId = f.groupId?.stringValue || null;
      const createdAt = f.createdAt?.timestampValue || null;

      console.log(`\n  [${i + 1}] Profile ID:  ${id}`);
      console.log(`       Name:       ${name} (${initials})`);
      console.log(`       Slug:       ${slug}`);
      console.log(`       Color:      ${color}`);
      console.log(`       Emails:     ${allowedEmails.join(', ') || '(none)'}`);
      if (groupId) console.log(`       Group ID:   ${groupId}`);
      if (createdAt) console.log(`       Created:    ${createdAt}`);
    });
    console.log(`\n  Total profiles: ${docs.length}`);
  }

  // Also check groups
  const groupUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/groups`;
  const groupOut = execFileSync('cmd', [
    '/c', 'curl', '-s', '-H', `Authorization: Bearer ${token}`, groupUrl,
  ], { encoding: 'utf8' });

  const groupData = JSON.parse(groupOut);
  const groups = groupData.documents || [];
  if (groups.length > 0) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  Firestore Groups');
    console.log('═══════════════════════════════════════════');
    groups.forEach((doc, i) => {
      const id = doc.name.split('/').pop();
      const f = doc.fields || {};
      const name = f.name?.stringValue || '(unnamed)';
      const profileIds = (f.profileIds?.arrayValue?.values || []).map(v => v.stringValue);
      const memberEmails = (f.memberEmails?.arrayValue?.values || []).map(v => v.stringValue);
      console.log(`\n  [${i + 1}] Group ID:    ${id}`);
      console.log(`       Name:       ${name}`);
      console.log(`       Profiles:   ${profileIds.join(', ')}`);
      console.log(`       Members:    ${memberEmails.join(', ')}`);
    });
  }
} catch (e) {
  console.error('  Error fetching profiles:', e.message);
}
