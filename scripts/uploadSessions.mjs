import fs from 'fs';
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

// Convert normal JS object to Firestore REST API 'fields' format
function toFirestore(obj) {
  if (obj === null) return { nullValue: null };
  if (typeof obj === 'boolean') return { booleanValue: obj };
  if (typeof obj === 'number') {
    if (Number.isInteger(obj)) return { integerValue: String(obj) };
    return { doubleValue: obj };
  }
  if (typeof obj === 'string') return { stringValue: obj };
  if (Array.isArray(obj)) return { arrayValue: { values: obj.map(toFirestore) } };
  if (typeof obj === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) fields[k] = toFirestore(v);
    }
    return { mapValue: { fields } };
  }
}

async function run() {
  console.log('Loading exercise_log.json...');
  const jsonPath = path.join(ROOT, 'src', 'data', 'exercise_log.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sessions = data.sessions || [];
  
  if (sessions.length === 0) {
    console.log('No sessions to upload.');
    return;
  }

  console.log(`Getting CLI access token for ${PROJECT_ID}...`);
  const token = 'YOUR_OAUTH_TOKEN_HERE';
  
  console.log(`Uploading ${sessions.length} sessions...`);
  
  const slugToId = {
    'thadana-apparao': 'Kv5Xx8JlKM6gJFA9z1To',
    'addipalli-vijaya-kumari': 'dHBCBnioktVCyUx1LFBb'
  };

  let successCount = 0;
  let failCount = 0;

  for (const session of sessions) {
    const profileSlug = session.profileSlug;
    const profileId = slugToId[profileSlug];
    const docId = session.id;
    
    // Convert performedAt to actual timestamp roughly for sorting if needed, but we just use new Date
    const payload = {
      ...session,
      createdAt: new Date().toISOString()
    };
    
    const firestoreData = { fields: toFirestore(payload).mapValue.fields };
    firestoreData.fields.createdAt = { timestampValue: new Date().toISOString() };
    
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/profiles/${profileId}/sessions?documentId=${docId}`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firestoreData)
      });
      
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 409) {
           console.log(`  - [SKIP] Session ${docId} already exists`);
           successCount++;
        } else {
           console.error(`  - [ERROR] Failed to upload ${docId}: ${res.status} ${text}`);
           failCount++;
        }
      } else {
        console.log(`  - [OK] Uploaded ${docId} to true profile ${profileId}`);
        successCount++;
      }
    } catch (err) {
      console.error(`  - [ERROR] Exception on ${docId}: ${err.message}`);
      failCount++;
    }
  }
  
  console.log(`\nFinished! Successfully processed: ${successCount}. Failed: ${failCount}.`);
}

run().catch(console.error);
