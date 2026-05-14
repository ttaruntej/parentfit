import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'data');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── HELPERS ────────────────────────────────────────────────────────────────

function parseWeight(str) {
  if (!str) return null;
  str = str.toLowerCase().trim();
  if (str === 'bw' || str === 'bodyweight' || str === 'emty' || str === 'empty') return null;
  const m = str.match(/([\d.]+)\s*kg?/);
  return m ? parseFloat(m[1]) : null;
}

function parseReps(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\s*rep/i);
  return m ? parseInt(m[1]) : null;
}

function parseSets(str) {
  if (!str) return 1;
  const m = str.match(/(\d+)\s*set/i);
  return m ? parseInt(m[1]) : 1;
}

// Parse "DD/MM/YY" or "DD/MM/YYYY" from header text
function parseDate(headerText) {
  // Try DD/MM/YY or DD/MM/YYYY
  let m = headerText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return null;
}

// Telugu day names map
const TELUGU_DAYS = {
  'సోమ': 'Monday',    // soma
  'మంగళ': 'Tuesday',  // mangala
  'బుధ': 'Wednesday', // budha
  'గురు': 'Thursday', // guru
  'శుక్ర': 'Friday',  // shukra
  'శని': 'Saturday',  // shani
  'ఆది': 'Sunday',    // aadi
  'ట్యూస్డే': 'Tuesday', // Tuesday in Telugu
  'వెడ్నెస్డే': 'Wednesday',
  'థర్స్డే': 'Thursday',
  'ఫ్రైడే': 'Friday',
  'సండే': 'Sunday',
};

function parseDayOfWeek(text) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const lower = text.toLowerCase();
  for (const d of days) {
    if (lower.includes(d) || lower.includes(d.substring(0,5))) return capitalize(d);
  }
  // Telugu day names
  for (const [tel, eng] of Object.entries(TELUGU_DAYS)) {
    if (text.includes(tel)) return eng;
  }
  // Misspellings
  if (/thurse|thurs/.test(lower)) return 'Thursday';
  if (/satur/.test(lower)) return 'Saturday';
  if (/tues/.test(lower)) return 'Tuesday';
  if (/wednes/.test(lower)) return 'Wednesday';
  return null;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function inferWorkoutType(text, exercises) {
  const lower = text.toLowerCase();
  if (lower.includes('push')) return 'push';
  if (lower.includes('pull')) return 'pull';
  if (lower.includes('leg')) return 'legs';
  if (lower.includes('hiit') || lower.includes('hit ') || lower.includes('cardio')) return 'hiit';
  // infer from exercises
  const exNames = exercises.map(e => e.rawName.toLowerCase()).join(' ');
  if (/squat|rdl|deadlift|lunge|calves|hamstring|leg press|abductor|adductor/.test(exNames)) return 'legs';
  if (/bench|push|shoulder|tricep|pec|incline|chest|dip/.test(exNames)) return 'push';
  if (/pull|row|bicep|lat|chin|tbar|t-bar|curl/.test(exNames)) return 'pull';
  return 'mixed';
}

// Normalize exercise names
const NAME_MAP = {
  'knee push up': 'Knee Push-Ups',
  'knee push-up': 'Knee Push-Ups',
  'push up': 'Push-Ups',
  'pushup': 'Push-Ups',
  'push ups': 'Push-Ups',
  'fush up': 'Push-Ups',
  'pushups': 'Push-Ups',
  'flat bench dumble press': 'Flat Dumbbell Press',
  'flat dumble press': 'Flat Dumbbell Press',
  'flat benchpress': 'Flat Bench Press',
  'flat bench press': 'Flat Bench Press',
  'flat bench': 'Flat Bench Press',
  'inclind dumble press': 'Incline Dumbbell Press',
  'incline dumble press': 'Incline Dumbbell Press',
  'incline dumble  press': 'Incline Dumbbell Press',
  'inclind benchpress': 'Incline Bench Press',
  'incline chest press mission empty wait': 'Incline Chest Press (Empty Barbell)',
  'shoulder dumble press': 'Shoulder Dumbbell Press',
  'shoulder press barble': 'Shoulder Barbell Press',
  'shoulder barble press': 'Shoulder Barbell Press',
  'shoulder press': 'Shoulder Press',
  'shoulderpress': 'Shoulder Press',
  'tricep push down': 'Tricep Pushdown',
  'tricep pushdown': 'Tricep Pushdown',
  'tricep push down': 'Tricep Pushdown',
  'tricep-overhead extension': 'Tricep Overhead Extension',
  'tricep overhead extension': 'Tricep Overhead Extension',
  'tricep overall extension': 'Tricep Overhead Extension',
  'tricep extension': 'Tricep Extension',
  'over head extension s': 'Overhead Extension',
  'over head': 'Overhead Press',
  'overhead extension': 'Overhead Extension',
  'latpulldown': 'Lat Pulldown',
  'lat pull down': 'Lat Pulldown',
  'lat pulldown': 'Lat Pulldown',
  'latpull down': 'Lat Pulldown',
  'seatedrows': 'Seated Rows',
  'seated rows': 'Seated Rows',
  'seated rowing': 'Seated Rows',
  'seatad rolls': 'Seated Rows',
  'seatedrows': 'Seated Rows',
  'one arm dumble row': 'One-Arm Dumbbell Row',
  'one arm dumble pull': 'One-Arm Dumbbell Row',
  'bicep curls': 'Bicep Curls',
  'bicep curl': 'Bicep Curls',
  'biceps': 'Bicep Curls',
  'biceps curl': 'Bicep Curls',
  'biceps curls barbell': 'Bicep Curls (Barbell)',
  'bicep curl barbell': 'Bicep Curls (Barbell)',
  'bicep curl ez bar': 'Bicep Curls (EZ Bar)',
  'bicep curls(bar)': 'Bicep Curls (Barbell)',
  'biceps curl(bar)': 'Bicep Curls (Barbell)',
  'bicep curls barbell': 'Bicep Curls (Barbell)',
  'hammer curl': 'Hammer Curls',
  'hamer curls': 'Hammer Curls',
  'hammer curls': 'Hammer Curls',
  'hamer curl': 'Hammer Curls',
  'tbar': 'T-Bar Rows',
  't bar': 'T-Bar Rows',
  't bar rows': 'T-Bar Rows',
  'tbar rows': 'T-Bar Rows',
  't bar rowing': 'T-Bar Rows',
  'barbell roll': 'Barbell Row',
  'barbell row': 'Barbell Row',
  'bend over rows': 'Bent-Over Rows',
  'renegade rows': 'Renegade Rows',
  'pec fly': 'Pec Fly',
  'lateral raises': 'Lateral Raises',
  'lateral': 'Lateral Raises',
  'front squat': 'Front Squat',
  'squat': 'Squat',
  'squad': 'Squat',
  'squats': 'Squat',
  'dumble squads': 'Dumbbell Squat',
  'free squat': 'Free Squat',
  'back squad': 'Back Squat',
  'back(bar) squad': 'Back Squat (Barbell)',
  'back squad emptybar': 'Back Squat (Empty Barbell)',
  'rdl': 'Romanian Deadlift (RDL)',
  'rdldumble': 'Romanian Deadlift (Dumbbell)',
  'rdl with dumle': 'Romanian Deadlift (Dumbbell)',
  'deadlift': 'Deadlift',
  'hamstrings curls': 'Hamstring Curls',
  'hamstring curls': 'Hamstring Curls',
  'leg extension': 'Leg Extension',
  'leg curl': 'Leg Curls',
  'leg curls': 'Leg Curls',
  'calf raises': 'Calf Raises',
  'calves': 'Calf Raises',
  'calf': 'Calf Raises',
  'calf with': 'Calf Raises',
  'calves raises': 'Calf Raises',
  'adductor': 'Adductor Machine',
  'abductor': 'Abductor Machine',
  'leg press': 'Leg Press',
  'standing lunges': 'Standing Lunges',
  'lunges': 'Lunges',
  'kick back lunges': 'Kickback Lunges',
  'assisted pullups': 'Assisted Pull-Ups',
  'assisted pull up': 'Assisted Pull-Ups',
  'assisted pull ups': 'Assisted Pull-Ups',
  'assiated pullups': 'Assisted Pull-Ups',
  'supported pull up': 'Assisted Pull-Ups',
  'supported pullups': 'Assisted Pull-Ups',
  'support pullups': 'Assisted Pull-Ups',
  'pull ups': 'Pull-Ups',
  'pullups': 'Pull-Ups',
  'chin up/ pulldown': 'Chin-Up / Pulldown',
  'assisted chin ups': 'Assisted Chin-Ups',
  'hyper extension': 'Hyperextension',
  'leg streches': 'Leg Stretches',
  'leg stretch': 'Leg Stretches',
  'leg stretch': 'Leg Stretches',
  'leg raises': 'Leg Raises',
  'abdomin crunches': 'Abdominal Crunches',
  'parlell dips': 'Parallel Bar Dips',
  'pect fly': 'Pec Fly',
  'worm అప్': 'Warm-Up',
  'పుషప్స్': 'Push-Ups',
  'hiit': 'HIIT',
  'hit': 'HIIT',
  'manual threadmill': 'Manual Treadmill',
  'eleptical cycle': 'Elliptical',
  'cardio': 'Cardio',
  'joging': 'Jogging',
  'jogging': 'Jogging',
  'knee raises': 'Knee Raises',
  'burpies': 'Burpees',
  'burpees': 'Burpees',
  'toe touch': 'Toe Touches',
  'jumping squats': 'Jumping Squats',
  'bare walk': 'Bear Walk',
};

function normalizeName(raw) {
  const key = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (NAME_MAP[key]) return NAME_MAP[key];
  // partial match
  for (const [k, v] of Object.entries(NAME_MAP)) {
    if (key.startsWith(k) || key === k) return v;
  }
  // title case fallback
  return raw.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ').trim();
}

// ─── PARSE EXERCISE LOG ──────────────────────────────────────────────────────

function parseExerciseLog() {
  const raw = fs.readFileSync(path.join(ROOT, 'Exercise data.md'), 'utf8');
  const lines = raw.split(/\r?\n/);

  // Split into sessions by WhatsApp header
  const SESSION_RE = /^\[[\d\/]+,\s*[\d:]+\s*[ap]m\]\s*APPARAO THADANA:\s*(.*)/i;

  const sessions = [];
  let current = null;
  let bodyLines = [];

  function flushSession() {
    if (!current) return;
    const session = buildSession(current, bodyLines);
    if (session) sessions.push(session);
    bodyLines = [];
  }

  for (const line of lines) {
    const m = line.match(SESSION_RE);
    if (m) {
      flushSession();
      current = m[1].trim();
    } else if (current !== null) {
      bodyLines.push(line.trim());
    }
  }
  flushSession();

  return {
    meta: {
      source: 'WhatsApp export — APPARAO THADANA',
      generated: new Date().toISOString(),
      totalSessions: sessions.length,
      dateRange: {
        from: sessions.find(s => s.date)?.date ?? null,
        to: [...sessions].reverse().find(s => s.date)?.date ?? null,
      },
      notes: [
        'Dates without year use context-inferred year (2025/2026).',
        'Assisted pull-up weights are counterweights (higher = easier).',
        'rawName preserves original spelling; name is normalized.',
        'weight_kg: null means bodyweight or unspecified.',
        'Telugu annotations preserved in notes field.',
      ],
    },
    sessions,
  };
}

let sessionCounter = 0;

function buildSession(headerText, bodyLines) {
  sessionCounter++;
  const id = `session_${String(sessionCounter).padStart(3, '0')}`;
  const date = parseDate(headerText);
  const dayOfWeek = parseDayOfWeek(headerText);

  // Collect all non-empty body lines
  const allLines = bodyLines.filter(l => l.length > 0);

  // Detect workout type hint from first few lines
  const typeHint = allLines.slice(0, 3).join(' ').toLowerCase();
  let isHiit = /hiit|hit\b|cardio|joging|jogging|treadmill|eleptical/.test(typeHint) ||
               /hiit|hit\b|cardio/.test(headerText.toLowerCase());

  if (isHiit) {
    return {
      id, date, dayOfWeek,
      workoutType: 'hiit',
      rawHeader: headerText,
      notes: allLines.join('; '),
      exercises: [],
    };
  }

  // Parse exercises
  const exercises = parseExercises(allLines);
  const workoutType = inferWorkoutType(headerText + ' ' + typeHint, exercises);

  return { id, date, dayOfWeek, workoutType, rawHeader: headerText, exercises };
}

// ─── EXERCISE BLOCK PARSER ───────────────────────────────────────────────────

// Weight patterns: "7.5kg", "10 kg", "2.5 kgs", "BW", "emty bar", "small barble"
const W_RE = /(\d+(?:\.\d+)?)\s*kgs?/i;
const R_RE = /(\d+)\s*reps?/i;
const S_RE = /(\d+)\s*sets?/i;
const TIMES_RE = /(\d+)\s*times?/i;

// A line is a "set line" if it contains weight/rep data
function isSetLine(line) {
  return W_RE.test(line) || R_RE.test(line) || /\bbw\b/i.test(line) ||
         /emty|empty|barble|barbell/.test(line.toLowerCase());
}

// A line is an exercise name if it does NOT look like a set line
// and is not a workout type label (Push, Pull, Leg, etc.)
const WORKOUT_LABELS = /^(push|pull|leg|hiit|hit|warm|cardio|worm)(\s+day)?$/i;

function isExerciseName(line) {
  if (!line || WORKOUT_LABELS.test(line.trim())) return false;
  if (isSetLine(line)) return false;
  // looks like a name if it has letters
  return /[a-zA-Z\u0C00-\u0C7F]/.test(line);
}

function parseExercises(lines) {
  const exercises = [];
  let currentExercise = null;

  function flush() {
    if (currentExercise) exercises.push(currentExercise);
    currentExercise = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (WORKOUT_LABELS.test(line.trim())) continue;

    if (isExerciseName(line) && !isSetLine(line)) {
      flush();
      // Check if the name line ALSO contains set data (e.g. "One arm dumble row 5kg 15reps 3sets")
      if (W_RE.test(line) || R_RE.test(line)) {
        const namePart = line.replace(W_RE, '').replace(R_RE, '').replace(S_RE, '').replace(/\d+/g, '').replace(/[()]/g, '').trim();
        currentExercise = {
          name: normalizeName(namePart || line),
          rawName: line,
          equipment: inferEquipment(line),
          sets: parseSetsFromLine(line),
          notes: extractNotes(line),
        };
      } else {
        currentExercise = {
          name: normalizeName(line),
          rawName: line,
          equipment: inferEquipment(line),
          sets: [],
          notes: null,
        };
      }
    } else if (currentExercise && isSetLine(line)) {
      // Expand multi-set shorthand: "15reps 3sets" at one weight
      const newSets = parseSetsFromLine(line);
      currentExercise.sets.push(...newSets);
      // Capture notes
      const note = extractNotes(line);
      if (note && !currentExercise.notes) currentExercise.notes = note;
    }
    // else: unrecognised line — skip (already preserved in rawHeader / source file)
  }
  flush();
  return exercises;
}

function parseSetsFromLine(line) {
  const sets = [];
  const lower = line.toLowerCase();

  const isBW = /\bbw\b/.test(lower) ||
    (/(empty|emty|emtybarble|emtybar|emty barble|emty barbel)/i.test(line) && !W_RE.test(line));

  // Detect counterweight (for assisted pull-ups) — applies to whole line context
  const isCounterweight = /(assisted|supported|support|chin up)/i.test(line);

  // Handle comma-separated multi-weight lines: "20kg, 25kg, 30kg, 35kg 12 reps"
  const multiWeightMatch = line.match(/((\d+(?:\.\d+)?\s*kgs?[,\s]+){2,})/i);
  if (multiWeightMatch) {
    const repsMatch = line.match(/(\d+)\s*reps?/i);
    const reps = repsMatch ? parseInt(repsMatch[1]) : null;
    const weights = [...line.matchAll(/(\d+(?:\.\d+)?)\s*kgs?/gi)].map(m => parseFloat(m[1]));
    for (const w of weights) {
      const setObj = { weight_kg: w };
      if (reps !== null) setObj.reps = reps;
      sets.push(setObj);
    }
    return sets;
  }

  // Extract weight
  let weight = null;
  const wm = line.match(/(\d+(?:\.\d+)?)\s*kgs?/i);
  if (wm) weight = parseFloat(wm[1]);

  // Extract reps
  let reps = null;
  const rm = line.match(/(\d+)\s*reps?/i);
  if (rm) reps = parseInt(rm[1]);

  // Extract set count
  let setCount = 1;
  const sm = line.match(/(\d+)\s*sets?/i);
  if (sm) setCount = parseInt(sm[1]);
  const tm = line.match(/(\d+)\s*times?/i);
  if (tm) setCount = parseInt(tm[1]);

  const setObj = {};
  if (isBW) {
    setObj.weight_kg = null;
    setObj.bodyweight = true;
  } else if (weight !== null) {
    if (isCounterweight) {
      setObj.counterweight_kg = weight;
      setObj.weight_kg = null;
    } else {
      setObj.weight_kg = weight;
    }
  } else {
    setObj.weight_kg = null;
  }
  if (reps !== null) setObj.reps = reps;

  for (let i = 0; i < setCount; i++) sets.push({ ...setObj });
  return sets;
}

function extractNotes(line) {
  // Capture parenthetical notes and Telugu annotations
  const paren = line.match(/\(([^)]+)\)/);
  const telugu = line.match(/([\u0C00-\u0C7F]+)/);
  const notes = [];
  if (paren) notes.push(paren[1]);
  if (telugu) notes.push(telugu[1]);
  return notes.length ? notes.join('; ') : null;
}

function inferEquipment(line) {
  const l = line.toLowerCase();
  if (/\bbw\b|bodyweight|push.?up|lunge|squat(?!.*bar)|dip|pull.?up|chin.?up|jogging|burpee|crunch/.test(l)) return 'bodyweight';
  if (/barble|barbell|barbel|bar\b|ez.bar/.test(l)) return 'barbell';
  if (/dumble|dumbbell|dumbell/.test(l)) return 'dumbbell';
  if (/machine|press(?!.*dumble|.*barb)|extension|curl(?!.*dumble|.*barb|.*ez)|adductor|abductor|pulldown|seated row|leg press/.test(l)) return 'machine';
  if (/cable|pushdown/.test(l)) return 'cable';
  if (/tbar|t.bar/.test(l)) return 'barbell';
  return 'dumbbell'; // default
}

// ─── PARSE RESOURCE LINKS ────────────────────────────────────────────────────

function parseResourceLinks() {
  const raw = fs.readFileSync(path.join(ROOT, 'Resourcelinks.md'), 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  const LINE_RE = /^\[(\d{2}\/\d{2}),\s*(\d{1,2}:\d{2}\s*[ap]m)\]\s*[\w\s]+:\s*(https?:\/\/\S+)/i;
  const seen = new Set();
  const links = [];
  let counter = 0;

  for (const line of lines) {
    const m = line.match(LINE_RE);
    if (!m) continue;

    const [, dayMonth, time, url] = m;
    const [day, month] = dayMonth.split('/').map(Number);

    // Infer year: months Jan-May → 2026 (based on context)
    const year = 2026;
    const isoDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    // Parse time to 24h
    const timeParsed = parse12hTo24h(time.trim());
    const sharedAt = `${isoDate}T${timeParsed}:00+05:30`;

    // Infer type from URL
    let type = 'post';
    if (/\/share\/v\//i.test(url)) type = 'video';
    else if (/\/share\/r\//i.test(url) || /\/reel\//i.test(url)) type = 'reel';

    const duplicate = seen.has(url);
    seen.add(url);

    counter++;
    links.push({
      id: `link_${String(counter).padStart(3, '0')}`,
      sharedAt,
      url,
      type,
      platform: 'facebook',
      duplicate,
    });
  }

  return {
    meta: {
      source: 'WhatsApp export — THADANA APPARAO',
      generated: new Date().toISOString(),
      totalLinks: links.length,
      platform: 'Facebook',
      yearAssumption: 'All timestamps assumed year 2026 (Jan–May context)',
      notes: [
        'type: reel = share/r/ or /reel/ URLs; video = share/v/; post = other',
        'duplicate: true marks exact URL duplicates (lines 132–133)',
      ],
    },
    links,
  };
}

function parse12hTo24h(timeStr) {
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return '00:00';
  let [, h, min, period] = m;
  h = parseInt(h);
  if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
  if (period.toLowerCase() === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${min}`;
}

// ─── WRITE OUTPUT ────────────────────────────────────────────────────────────

const exerciseLog = parseExerciseLog();
const resourceLinks = parseResourceLinks();

const exercisePath = path.join(OUT_DIR, 'exercise_log.json');
const resourcePath = path.join(OUT_DIR, 'resource_links.json');

fs.writeFileSync(exercisePath, JSON.stringify(exerciseLog, null, 2), 'utf8');
fs.writeFileSync(resourcePath, JSON.stringify(resourceLinks, null, 2), 'utf8');

console.log(`✅ exercise_log.json  — ${exerciseLog.sessions.length} sessions → ${exercisePath}`);
console.log(`✅ resource_links.json — ${resourceLinks.links.length} links  → ${resourcePath}`);

// Quick validation report
let totalSets = 0, totalExercises = 0;
for (const s of exerciseLog.sessions) {
  totalExercises += s.exercises.length;
  for (const e of s.exercises) totalSets += e.sets.length;
}
console.log(`   📊 ${totalExercises} exercise blocks, ${totalSets} sets parsed`);
console.log(`   🔗 ${resourceLinks.links.filter(l => l.duplicate).length} duplicate links flagged`);
