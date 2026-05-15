import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = 'parentfit-prod';

// Helper to convert simple JS object to Firestore Document format
function toFirestore(obj) {
  if (obj === null) return { nullValue: null };
  if (typeof obj === 'boolean') return { booleanValue: obj };
  if (typeof obj === 'number') {
    return Number.isInteger(obj) ? { integerValue: obj.toString() } : { doubleValue: obj };
  }
  if (typeof obj === 'string') return { stringValue: obj };
  if (Array.isArray(obj)) {
    return { arrayValue: { values: obj.map(toFirestore) } };
  }
  if (typeof obj === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        fields[k] = toFirestore(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(obj) };
}

async function uploadResources() {
  const jsonPath = path.join(__dirname, '../src/data/resource_links.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Exclude duplicates
  const links = data.links.filter(l => !l.duplicate);

  console.log(`Getting CLI access token for ${PROJECT_ID}...`);
  // Will replace token before running
  const token = 'YOUR_OAUTH_TOKEN_HERE';
  
  console.log(`Uploading ${links.length} resources...`);
  
  const targetProfileId = 'Kv5Xx8JlKM6gJFA9z1To'; // Thadana Apparao
  
  let successCount = 0;
  let failCount = 0;

  for (const link of links) {
    const docId = link.id;
    
    // Map JSON link format to Firestore Resource format
    const payload = {
      title: `${link.platform || 'Resource'} ${link.type || 'link'}`,
      url: link.url,
      type: link.type || 'video',
      tags: [link.platform].filter(Boolean),
      addedAt: link.sharedAt || new Date().toISOString(),
    };
    
    const firestoreData = { fields: toFirestore(payload).mapValue.fields };
    firestoreData.fields.createdAt = { timestampValue: new Date().toISOString() };
    
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/profiles/${targetProfileId}/resources?documentId=${docId}`;
    
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
           console.log(`  - [SKIP] Resource ${docId} already exists`);
           successCount++;
        } else {
           console.error(`  - [ERROR] Failed to upload ${docId}: ${res.status} ${text}`);
           failCount++;
        }
      } else {
        console.log(`  - [OK] Uploaded resource ${docId} to true profile ${targetProfileId}`);
        successCount++;
      }
    } catch (err) {
      console.error(`  - [ERROR] Exception on ${docId}: ${err.message}`);
      failCount++;
    }
    
    // Small delay to avoid hitting API rate limits if there are many
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\nFinished! Successfully processed: ${successCount}. Failed: ${failCount}.`);
}

uploadResources().catch(console.error);
