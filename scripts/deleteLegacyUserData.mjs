/**
 * One-off cleanup: deletes the pre-migration `users/{uid}/...` data tree.
 *
 * Before the email-allowlist migration, every profile's data lived under
 * users/{uid}/profiles/.... The app now reads the top-level `profiles`
 * collection, and firestore.rules denies all access to `users/**`, so the
 * old tree is orphaned, inaccessible duplicate data. This removes it.
 *
 * The current `profiles` collection is NOT touched.
 *
 * Run with:  node scripts/deleteLegacyUserData.mjs
 * Requires the Firebase CLI to be logged in (npx firebase-tools login).
 */
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'parentfit-prod';

function firebase(args) {
  const isWin = process.platform === 'win32';
  const command = isWin ? 'cmd' : 'npx';
  const commandArgs = isWin
    ? ['/c', 'npx', '-y', 'firebase-tools@latest', ...args]
    : ['-y', 'firebase-tools@latest', ...args];
  return execFileSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

console.log(`Deleting the legacy "users" collection from project "${PROJECT_ID}"...`);
console.log('This removes users/{uid}/profiles/... — the pre-migration data tree.');
console.log('The top-level "profiles" collection (current data) is NOT affected.\n');

const output = firebase([
  'firestore:delete', 'users',
  '--recursive',
  '--force',
  '--project', PROJECT_ID,
]);
if (output) console.log(output);

console.log('Done. Legacy users/{uid} data deleted.');
