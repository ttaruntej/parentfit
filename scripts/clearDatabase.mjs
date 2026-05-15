/**
 * Wipes the app data to a clean slate: deletes every document in the
 * `profiles` collection (and their sessions/resources/meta subcollections)
 * and the `groups` collection.
 *
 * Firebase Authentication accounts are NOT touched — the admin
 * (taruntejthadana@gmail.com) and anyone else can still sign in; they will
 * simply start fresh with no profile.
 *
 * Run with:  node scripts/clearDatabase.mjs
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

for (const collection of ['profiles', 'groups']) {
  console.log(`Deleting the "${collection}" collection from "${PROJECT_ID}"...`);
  const out = firebase(['firestore:delete', collection, '--recursive', '--force', '--project', PROJECT_ID]);
  if (out) console.log(out);
}

console.log('Done. Database cleared — profiles and groups removed. Auth accounts are untouched.');
