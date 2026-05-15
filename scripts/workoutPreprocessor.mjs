import fs from 'fs';
import path from 'path';

export const PROFILES = [
  {
    slug: 'thadana-apparao',
    name: 'Thadana Apparao',
    initials: 'TA',
    color: '#FF6B35',
  },
  {
    slug: 'addipalli-vijaya-kumari',
    name: 'Addipalli Vijaya Kumari',
    initials: 'AV',
    color: '#00C896',
  },
];

const DEFAULT_PROFILE = 'thadana-apparao';
const KUMARI_PROFILE = 'addipalli-vijaya-kumari';
const TIME_ZONE = 'Asia/Kolkata';
const OFFSET = '+05:30';

const WORKOUT_CATEGORY = {
  push: 'Strength / Push',
  pull: 'Strength / Pull',
  legs: 'Strength / Legs',
  hiit: 'Cardio / HIIT',
  mixed: 'General Fitness',
};

const SOURCE_OVERRIDES = [
  ['2/12/25', '2025-12-03T06:37:00+05:30', '2025-12-02'],
  ['Wednes day 3/12/25', '2025-12-03T06:37:00+05:30', '2025-12-03'],
  [
    'Thurse day3/12/25',
    '2025-12-05T05:17:00+05:30',
    '2025-12-04',
    'Corrected written date from 3/12/25 to 4/12/25 because the note says Thursday and Dec 3, 2025 was Wednesday.',
  ],
  ['Friday', '2025-12-05T06:30:00+05:30', '2025-12-05', null, 'Push'],
  ['Saturday 6/12/25', '2025-12-06T10:29:00+05:30', '2025-12-06'],
  ['Monday', '2025-12-08T06:41:00+05:30', '2025-12-08'],
  ['Tuesday', '2025-12-09T06:33:00+05:30', '2025-12-09'],
  ['Wednesday', '2025-12-10T06:43:00+05:30', '2025-12-10'],
  ['Satur day 13/12/25', '2025-12-13T08:19:00+05:30', '2025-12-13'],
  ['Thurse day 11/12/2025', '2025-12-11T07:03:00+05:30', '2025-12-11'],
  ['Monday dt 15/12/25', '2025-12-15T06:47:00+05:30', '2025-12-15'],
  ['Thurse day-18/12/25', '2025-12-18T08:53:00+05:30', '2025-12-18'],
  ['24/12/25(Wednesday )', '2025-12-24T08:38:00+05:30', '2025-12-24'],
  ['Thurse day 25/12/25', '2025-12-25T08:53:00+05:30', '2025-12-25'],
  ['Friday (26/12/25)', '2025-12-26T06:34:00+05:30', '2025-12-26'],
  ['Saturday -27/12/25', '2025-12-27T06:32:00+05:30', '2025-12-27'],
  ['1/1/26(thurse day )', '2026-01-01T20:18:00+05:30', '2026-01-01'],
  [
    '2/2/26(Friday )',
    '2026-01-02T06:52:00+05:30',
    '2026-01-02',
    'Corrected written month from 2/2/26 to 2/1/26 because the source timestamp is Jan 2 and the note says Friday.',
  ],
  ['Satur day (3/1/26)', '2026-01-03T06:34:00+05:30', '2026-01-03'],
  ['Monday dt 5/1/26', '2026-01-05T06:27:00+05:30', '2026-01-05'],
  ['Tuesday dt 6/1/26', '2026-01-06T20:11:00+05:30', '2026-01-06'],
  ['Wednesday dt. 7/1/26-Leg DAY', '2026-01-07T06:36:00+05:30', '2026-01-07'],
  ['Thursday dt 8/1/26', '2026-01-08T20:15:00+05:30', '2026-01-08'],
  ['Monday dt 12/1/26', '2026-01-12T20:46:00+05:30', '2026-01-12'],
  ['Tuesday dt 13/1/26', '2026-01-13T09:19:00+05:30', '2026-01-13'],
  ['Friday dt 16/1/26', '2026-01-16T09:11:00+05:30', '2026-01-16'],
  ['Saturday dt 17/1/26', '2026-01-17T09:28:00+05:30', '2026-01-17'],
  ['Monday dt. 19/1/26', '2026-01-19T20:12:00+05:30', '2026-01-19'],
  ['Wednesday dt:28/1/26', '2026-01-28T20:44:00+05:30', '2026-01-28'],
  ['Friday dt30/1/26', '2026-01-30T06:43:00+05:30', '2026-01-30'],
  ['Monday dt:2/2/26', '2026-02-02T06:34:00+05:30', '2026-02-02'],
  ['Tuesday dt3/2/26', '2026-02-03T06:43:00+05:30', '2026-02-03'],
  ['Wednesday dt 4/2/26', '2026-02-04T06:47:00+05:30', '2026-02-04'],
  ['Friday dt, 6/2/26', '2026-02-06T06:30:00+05:30', '2026-02-06'],
  ['Saturday dt:7/2/26', '2026-02-07T06:37:00+05:30', '2026-02-07'],
  ['Monday dt:9/2/26', '2026-02-09T06:38:00+05:30', '2026-02-09'],
  ['Wednesday dt. 11/2/26', '2026-02-11T07:31:00+05:30', '2026-02-11'],
  ['Thursday 12/2/26', '2026-02-12T07:08:00+05:30', '2026-02-12'],
  ['Friday 13/2/26', '2026-02-13T06:43:00+05:30', '2026-02-13'],
  ['Saturday 14/2/26', '2026-02-14T06:34:00+05:30', '2026-02-14'],
  [
    'Wednesday 18/2/16',
    '2026-02-18T21:04:00+05:30',
    '2026-02-18',
    'Corrected written year from 2016 to 2026 using the WhatsApp source timestamp.',
  ],
  ['Friday', '2026-02-20T07:08:00+05:30', '2026-02-20', null, 'Pull day 20/2/26'],
  ['Saturday 21/2/26', '2026-02-21T06:59:00+05:30', '2026-02-21'],
  ['23/2/26 Monday', '2026-02-23T06:58:00+05:30', '2026-02-23'],
  ['Tuesday 24/2/26', '2026-02-24T06:49:00+05:30', '2026-02-24'],
  ['Wednesday 25/2/26', '2026-02-25T07:11:00+05:30', '2026-02-25'],
  ['Friday 27/2/26', '2026-02-27T07:18:00+05:30', '2026-02-27'],
  ['Saturday 28/2/26', '2026-02-28T07:03:00+05:30', '2026-02-28'],
  ['Monday 2/3/26', '2026-03-02T06:53:00+05:30', '2026-03-02'],
  ['Saturday 14/3/26', '2026-03-14T06:31:00+05:30', '2026-03-14'],
  ['Tuesday 17/3/26', '2026-03-17T20:19:00+05:30', '2026-03-17'],
  ['23/3/26Monday', '2026-03-23T20:27:00+05:30', '2026-03-23'],
  ['Thurse day 26/3/26', '2026-03-26T19:44:00+05:30', '2026-03-26'],
  ['Friday 27/3/26', '2026-03-27T17:50:00+05:30', '2026-03-27'],
  ['Saturday 28/3/26', '2026-03-28T20:53:00+05:30', '2026-03-28'],
].map(([header, sourceMessageAt, workoutDate, note, bodyIncludes]) => ({
  header,
  bodyIncludes,
  sourceMessageAt,
  workoutDate,
  notes: note ? [note] : [],
})).sort((a, b) => {
  const headerWeight = lowerClean(b.header).length - lowerClean(a.header).length;
  if (headerWeight) return headerWeight;
  return (b.bodyIncludes ? 1 : 0) - (a.bodyIncludes ? 1 : 0);
});

const EXTRA_MESSAGES = [
  {
    rawHeader: 'AV KUMARI',
    sourceSender: 'T. a. rao Airtel',
    sourceMessageAt: '2025-12-05T06:35:00+05:30',
    workoutDate: '2025-12-05',
    profileSlug: KUMARI_PROFILE,
    bodyLines: [
      'Leg extension 10.0kg 3sets 15 reps',
      'Leg curl 10.0kg 3sets 15 reps',
      'Lunges 2kg kettlebell 3sets 15reps',
      'Calf raises 3sets 15reps-body waight',
    ],
    preprocessingNotes: ['Single Addipalli Vijaya Kumari workout extracted from the AV KUMARI message.'],
  },
];

const NAME_MAP = {
  'knee push up': 'Knee Push-Ups',
  'knee push ups': 'Knee Push-Ups',
  'push up': 'Push-Ups',
  'push ups': 'Push-Ups',
  pushups: 'Push-Ups',
  'fush up': 'Push-Ups',
  'dumble press': 'Dumbbell Press',
  'dumbbell press': 'Dumbbell Press',
  'flat dumble press': 'Flat Dumbbell Press',
  'flat bench dumble press': 'Flat Dumbbell Press',
  'flat dumbbell press': 'Flat Dumbbell Press',
  'flat bench dumbbell press': 'Flat Dumbbell Press',
  'flat benchpress': 'Flat Bench Press',
  'flat bench press': 'Flat Bench Press',
  'flat bench': 'Flat Bench Press',
  'inclind dumble press': 'Incline Dumbbell Press',
  'incline dumble press': 'Incline Dumbbell Press',
  'inclind dumbbell press': 'Incline Dumbbell Press',
  'incline dumbbell press': 'Incline Dumbbell Press',
  'inclind benchpress': 'Incline Bench Press',
  'incline benchpress': 'Incline Bench Press',
  'incline chest press mission': 'Incline Chest Press Machine',
  'shoulder dumble press': 'Shoulder Dumbbell Press',
  'shoulder dumbbell press': 'Shoulder Dumbbell Press',
  shoulderpress: 'Shoulder Press',
  'shoulder press': 'Shoulder Press',
  'shoulder press barble': 'Shoulder Barbell Press',
  'shoulder barble press': 'Shoulder Barbell Press',
  lateral: 'Lateral Raises',
  'lateral raises': 'Lateral Raises',
  'tricep push down': 'Tricep Pushdown',
  'tricep pushdown': 'Tricep Pushdown',
  'tricep extension': 'Tricep Extension',
  'tricep overhead extension': 'Tricep Overhead Extension',
  'tricep overall extension': 'Tricep Overhead Extension',
  'over head extension': 'Overhead Extension',
  'over head extension s': 'Overhead Extension',
  'over head': 'Overhead Press',
  'parallel dips': 'Parallel Bar Dips',
  'parlell dips': 'Parallel Bar Dips',
  'pec fly': 'Pec Fly',
  'pect fly': 'Pec Fly',
  'latpulldown': 'Lat Pulldown',
  'lat pull down': 'Lat Pulldown',
  'lat pulldown': 'Lat Pulldown',
  'chin up/ pulldown': 'Chin-Up / Pulldown',
  seatedrows: 'Seated Rows',
  'seated rows': 'Seated Rows',
  'seated rowing': 'Seated Rows',
  'seatad rolls': 'Seated Rows',
  'one arm dumble row': 'One-Arm Dumbbell Row',
  'one arm dumble pull': 'One-Arm Dumbbell Row',
  'one arm dumbbell row': 'One-Arm Dumbbell Row',
  'one arm dumbbell pull': 'One-Arm Dumbbell Row',
  't bar': 'T-Bar Rows',
  tbar: 'T-Bar Rows',
  't bar rows': 'T-Bar Rows',
  'tbar rows': 'T-Bar Rows',
  't bar rowing': 'T-Bar Rows',
  'barbell roll': 'Barbell Row',
  'barbell row': 'Barbell Row',
  'bend over rows': 'Bent-Over Rows',
  'renegade rows': 'Renegade Rows',
  'bicep curls': 'Bicep Curls',
  'biceps dumbbell curl': 'Bicep Curls',
  'bicep curl': 'Bicep Curls',
  biceps: 'Bicep Curls',
  bicep: 'Bicep Curls',
  'biceps curl': 'Bicep Curls',
  'bicep curls barbell': 'Bicep Curls (Barbell)',
  'biceps curls barbell': 'Bicep Curls (Barbell)',
  'bicep curl barbell': 'Bicep Curls (Barbell)',
  'bicep curl ez bar': 'Bicep Curls (EZ Bar)',
  'bicep curls(bar)': 'Bicep Curls (Barbell)',
  'hammer curl': 'Hammer Curls',
  'hammer curls': 'Hammer Curls',
  'hamer curls': 'Hammer Curls',
  'front squat': 'Front Squat',
  'free squat': 'Free Squat',
  'back squad': 'Back Squat',
  'back squad emptybar': 'Back Squat (Empty Barbell)',
  'back(bar) squad': 'Back Squat (Barbell)',
  squat: 'Squat',
  squats: 'Squat',
  squad: 'Squat',
  'dumble squads': 'Dumbbell Squat',
  'dumble squats': 'Dumbbell Squat',
  'dumbbell squads': 'Dumbbell Squat',
  'dumbbell squats': 'Dumbbell Squat',
  rdl: 'Romanian Deadlift',
  'rdl with dumle': 'Romanian Deadlift (Dumbbell)',
  rdldumble: 'Romanian Deadlift (Dumbbell)',
  deadlift: 'Deadlift',
  'hamstrings curls': 'Hamstring Curls',
  'hamstring curls': 'Hamstring Curls',
  'leg extension': 'Leg Extension',
  'leg curl': 'Leg Curls',
  'leg curls': 'Leg Curls',
  'leg press': 'Leg Press',
  'calf raises': 'Calf Raises',
  'calves raises': 'Calf Raises',
  calves: 'Calf Raises',
  calf: 'Calf Raises',
  'calf with': 'Calf Raises',
  adductor: 'Adductor Machine',
  abductor: 'Abductor Machine',
  'adductor &adductor': 'Adductor / Abductor Machine',
  'abductor &adductor': 'Abductor / Adductor Machine',
  lunges: 'Lunges',
  'standing lunges': 'Standing Lunges',
  'kick back lunges': 'Kickback Lunges',
  'assisted pullups': 'Assisted Pull-Ups',
  'assisted pull ups': 'Assisted Pull-Ups',
  'assiated pullups': 'Assisted Pull-Ups',
  'supported pull up': 'Assisted Pull-Ups',
  'supported pullups': 'Assisted Pull-Ups',
  'support pullups': 'Assisted Pull-Ups',
  'assisted chin ups': 'Assisted Chin-Ups',
  'pull ups': 'Pull-Ups',
  pullups: 'Pull-Ups',
  'hyper extension': 'Hyperextension',
  'leg streches': 'Leg Stretches',
  'leg stretch': 'Leg Stretches',
  'leg raises': 'Leg Raises',
  'abdomin crunches': 'Abdominal Crunches',
  hiit: 'HIIT',
  hit: 'HIIT',
  cardio: 'Cardio',
  'manual threadmill': 'Manual Treadmill',
  'elliptical cycle': 'Elliptical',
  'eleptical cycle': 'Elliptical',
  jogging: 'Jogging',
  joging: 'Jogging',
  'knee raises': 'Knee Raises',
  burpies: 'Burpees',
  burpees: 'Burpees',
  'toe touch': 'Toe Touches',
  'jumping squats': 'Jumping Squats',
  'bare walk': 'Bear Walk',
  'worm up': 'Warm-Up',
};

const NAME_KEYS = Object.keys(NAME_MAP).sort((a, b) => b.length - a.length);
const WORKOUT_LABELS = /^(push|push\s*day|pushday|pull|pull\s*day|pullday|leg|leg\s*day|legday|squat|hiit|hit|cardio|different forms|warm|warm up|worm up)$/i;
const DATE_RE = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
const HEADER_RE = /^\[(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?),\s*([\d:]+)\s*([ap])m\]\s*([^:]+):\s*(.*)$/i;

function cleanText(value) {
  return String(value || '')
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/(\d+(?:\.\d+)?)\s*k[dhf]\b/gi, '$1kg')
    .replace(/(\d+(?:\.\d+)?)\s*\.\s*kgs?\b/gi, '$1kg')
    .replace(/\s+/g, ' ')
    .trim();
}

function lowerClean(value) {
  return cleanText(value).toLowerCase();
}

function parseSourceDate(datePart, contextYear = null) {
  const m = cleanText(datePart).match(DATE_RE);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (!y) y = contextYear || (Number(mo) >= 12 ? '2025' : '2026');
  if (y.length === 2) y = `20${y}`;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseTime(timePart, period) {
  const m = cleanText(timePart).match(/(\d{1,2}):(\d{2})/);
  if (!m) return '00:00';
  let hours = Number(m[1]);
  const minutes = m[2];
  const p = lowerClean(period);
  if (p === 'p' && hours !== 12) hours += 12;
  if (p === 'a' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function buildDateTime(date, time) {
  return `${date}T${time}:00${OFFSET}`;
}

function parseDayOfWeek(text) {
  const value = lowerClean(text);
  if (/monday|mon\b/.test(value)) return 'Monday';
  if (/tuesday|tues|tue\b/.test(value)) return 'Tuesday';
  if (/wednes|wed\b/.test(value)) return 'Wednesday';
  if (/thurse|thurs|thu\b/.test(value)) return 'Thursday';
  if (/friday|fri\b/.test(value)) return 'Friday';
  if (/satur|sat\b/.test(value)) return 'Saturday';
  if (/sunday|sun\b/.test(value)) return 'Sunday';
  return null;
}

function findOverride(rawHeader, bodyLines) {
  const header = lowerClean(rawHeader);
  const body = lowerClean(bodyLines.join(' '));
  return SOURCE_OVERRIDES.find((entry) => {
    const entryHeader = lowerClean(entry.header);
    const headerMatch = header === entryHeader || (/^\d+\/\d+/.test(entryHeader) && header.startsWith(entryHeader));
    const bodyMatch = !entry.bodyIncludes || body.includes(lowerClean(entry.bodyIncludes));
    return headerMatch && bodyMatch;
  });
}

function firstDateFromText(text) {
  const m = cleanText(text).match(DATE_RE);
  if (!m) return null;
  return parseSourceDate(m[0]);
}

function inferWorkoutType(text, exercises) {
  const value = lowerClean(text);
  if (/hiit|hit\b|cardio|threadmill|treadmill|elliptical|eleptical/.test(value)) return 'hiit';
  if (/push/.test(value)) return 'push';
  if (/pull|pullday/.test(value)) return 'pull';
  if (/leg|squat|squad/.test(value)) return 'legs';

  const names = exercises.map((e) => lowerClean(`${e.name} ${e.rawName}`)).join(' ');
  if (/squat|squad|rdl|deadlift|lunge|calf|calves|hamstring|leg press|leg extension|leg curl|abductor|adductor/.test(names)) {
    return 'legs';
  }
  if (/bench|press|push|shoulder|tricep|pec|incline|chest|dip/.test(names)) return 'push';
  if (/pull|row|bicep|lat|chin|t-bar|tbar|curl/.test(names)) return 'pull';
  return 'mixed';
}

function titleCase(raw) {
  return cleanText(raw)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeName(rawName) {
  let key = lowerClean(rawName)
    .replace(/^\*+/, '')
    .replace(/[-:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  key = key
    .replace(/^with\s+/, '')
    .replace(/\bbarble\b/g, 'barbell')
    .replace(/\bbarbel\b/g, 'barbell')
    .replace(/\bdumble\b/g, 'dumbbell')
    .replace(/\bwaight\b/g, 'weight')
    .trim();

  if (NAME_MAP[key]) return NAME_MAP[key];
  for (const nameKey of NAME_KEYS) {
    if (key.startsWith(nameKey)) return NAME_MAP[nameKey];
  }
  return titleCase(rawName);
}

function inferEquipment(line, name) {
  const value = lowerClean(`${line} ${name}`);
  if (/bw|body\s*weight|body\s*waight|push.?up|lunge|burpee|crunch|knee raise|toe touch|bear walk|bare walk|pull.?up|chin.?up/.test(value)) {
    return 'bodyweight';
  }
  if (/cable|pushdown/.test(value)) return 'cable';
  if (/barbell|barble|barbel|bar\b|ez bar|t-?bar/.test(value)) return 'barbell';
  if (/dumbbell|dumble|dumbell|kettlebell/.test(value)) return 'dumbbell';
  if (/machine|mission|pulldown|seated row|leg press|extension|curl|adductor|abductor|pec fly/.test(value)) return 'machine';
  return 'unspecified';
}

function stripSetData(line) {
  return cleanText(line)
    .replace(/\([^)]+\)/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*\.?\s*kgs?\b/gi, ' ')
    .replace(/\b\d+\s*(?:reps?|rows?|sets?|times?|mnt|minutes?|minits?|rounds?|clas)\b/gi, ' ')
    .replace(/\bkgs?\b/gi, ' ')
    .replace(/\bBW\b/gi, ' ')
    .replace(/\bbody\s*waight\b/gi, ' ')
    .replace(/\bempty\b|\bemty\b|\bwait\b|\bweight\b/gi, ' ')
    .replace(/[*:,;()\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitInlineExercise(line) {
  const cleaned = cleanText(line);
  const normalized = lowerClean(cleaned);
  const known = NAME_KEYS.find((key) => normalized.startsWith(key));
  if (known) {
    return {
      namePart: cleaned.slice(0, known.length).trim(),
      setPart: cleaned.slice(known.length).trim(),
    };
  }

  const firstMetric = cleaned.search(/(\d+(?:\.\d+)?\s*kgs?|\d+\s*(?:reps?|rows?|sets?|times?|mnt|minutes?|minits?)|\bBW\b|body\s*waight|emty|empty)/i);
  if (firstMetric > 0 && /[a-z]/i.test(cleaned.slice(0, firstMetric))) {
    return {
      namePart: cleaned.slice(0, firstMetric).replace(/[-:]+$/g, '').trim(),
      setPart: cleaned.slice(firstMetric).trim(),
    };
  }

  return { namePart: cleaned, setPart: '' };
}

function isMetricOnly(line) {
  const stripped = stripSetData(line);
  if (!stripped) return true;
  return !/[a-zA-Z\u0C00-\u0C7F]/.test(stripped);
}

function isWorkoutLabel(line) {
  return WORKOUT_LABELS.test(stripSetData(line) || cleanText(line));
}

function isCounterweightExercise(name, rawName) {
  return /assisted|supported|support pull|chin/.test(lowerClean(`${name} ${rawName}`));
}

function parseWeightFromSegment(segment) {
  const plus = segment.match(/\((\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\)\s*kgs?/i);
  if (plus) return Number(plus[1]) + Number(plus[2]);

  const weight = segment.match(/(\d+(?:\.\d+)?)\s*\.?\s*kgs?/i);
  return weight ? Number(weight[1]) : null;
}

function parseRepsFromSegment(segment) {
  const reps = segment.match(/(\d+)\s*(?:reps?|rows?)/i);
  return reps ? Number(reps[1]) : null;
}

function parseSetCountFromSegment(segment) {
  const sets = segment.match(/(\d+)\s*(?:sets?|times?)/i);
  if (sets) return Number(sets[1]);
  return 1;
}

function parseDurationFromSegment(segment) {
  const duration = segment.match(/(\d+)\s*(?:mnt|minutes?|minits?|min)\b/i);
  return duration ? Number(duration[1]) : null;
}

function extractNotes(line) {
  const notes = [];
  const parenthetical = [...String(line).matchAll(/\(([^)]+)\)/g)].map((m) => cleanText(m[1]));
  notes.push(...parenthetical);

  if (/not perfect/i.test(line)) notes.push('not perfect');
  if (/body\s*waight/i.test(line)) notes.push('body weight');
  if (/different forms/i.test(line)) notes.push('different forms');
  if (/empty|emty/i.test(line)) notes.push('empty bar');
  if (/both/i.test(line)) notes.push('both sides');
  if (/go&back/i.test(line)) notes.push('go and back');

  return [...new Set(notes.filter(Boolean))];
}

function segmentsFromLine(line) {
  return cleanText(line)
    .replace(/\s+-\s*/g, '; ')
    .split(/[;,]/)
    .map(cleanText)
    .filter(Boolean);
}

function parseSetsFromLine(line, exercise) {
  const segments = segmentsFromLine(line);
  const sets = [];
  const lineNotes = extractNotes(line);
  const exerciseName = lowerClean(`${exercise?.name || ''} ${exercise?.rawName || ''}`);
  const bodyweightByContext = /push.?up|pull.?up|chin.?up|lunge|calf raises|squat without/.test(exerciseName);
  const counterweight = isCounterweightExercise(exercise?.name, exercise?.rawName);

  for (const segment of segments) {
    const reps = parseRepsFromSegment(segment);
    const durationMinutes = parseDurationFromSegment(segment);
    const weight = parseWeightFromSegment(segment);
    const setCount = parseSetCountFromSegment(segment);
    const bodyweight = /\bBW\b|body\s*waight|body\s*weight/i.test(segment) || (bodyweightByContext && weight === null);

    if (reps === null && weight === null && durationMinutes === null && !/empty|emty|BW|body/i.test(segment)) {
      continue;
    }

    const base = {};
    if (counterweight && weight !== null) {
      base.counterweight_kg = weight;
      base.weight_kg = null;
    } else {
      base.weight_kg = bodyweight ? null : weight;
    }
    if (bodyweight) base.bodyweight = true;
    if (/empty|emty/i.test(segment)) {
      base.weight_kg = null;
      base.emptyBar = true;
    }
    if (reps !== null) base.reps = reps;
    if (durationMinutes !== null) base.durationMinutes = durationMinutes;

    const notes = extractNotes(segment);
    if (notes.length) base.notes = notes.join('; ');

    for (let i = 0; i < Math.max(1, setCount); i += 1) {
      sets.push({ ...base });
    }
  }

  if (sets.length === 0 && lineNotes.length && exercise) {
    exercise.notes = mergeNotes(exercise.notes, lineNotes);
  }

  return sets;
}

function mergeNotes(existing, incoming) {
  const current = existing ? existing.split(';').map(cleanText) : [];
  return [...new Set([...current, ...incoming].filter(Boolean))].join('; ') || null;
}

function parseExercises(lines) {
  const exercises = [];
  let current = null;
  let currentWorkoutLabel = null;

  function flush() {
    if (!current) return;
    if (current.sets.length || current.notes) exercises.push(current);
    current = null;
  }

  for (const rawLine of lines) {
    let line = cleanText(rawLine).replace(/^\*+/, '').replace(/^with\s+/i, '').trim();
    if (!line) continue;
    if (isWorkoutLabel(line)) {
      currentWorkoutLabel = lowerClean(line);
      continue;
    }

    const { namePart, setPart } = splitInlineExercise(line);
    const hasInlineSet = setPart && !isMetricOnly(line);
    const metricOnly = isMetricOnly(line);

    if (!metricOnly && (hasInlineSet || !current || !/^\d/.test(line))) {
      const candidateName = stripSetData(namePart || line);
      if (candidateName && !isWorkoutLabel(candidateName)) {
        flush();
        const name = normalizeName(candidateName);
        current = {
          name,
          rawName: cleanText(candidateName),
          equipment: inferEquipment(line, name),
          sets: [],
          notes: null,
        };
        const notes = extractNotes(line);
        if (notes.length) current.notes = mergeNotes(current.notes, notes);
        if (setPart) current.sets.push(...parseSetsFromLine(setPart, current));
        continue;
      }
    }

    if (!current) {
      const inferredName = currentWorkoutLabel?.includes('push') && parseRepsFromSegment(line) !== null && parseWeightFromSegment(line) === null
        ? 'Push-Ups'
        : currentWorkoutLabel?.includes('pull') && parseWeightFromSegment(line) !== null
          ? 'Lat Pulldown'
          : stripSetData(line) || line;
      const name = normalizeName(inferredName);
      current = {
        name,
        rawName: inferredName,
        equipment: inferEquipment(line, name),
        sets: [],
        notes: null,
      };
    }
    current.sets.push(...parseSetsFromLine(line, current));
  }

  flush();
  return exercises;
}

function splitMessages(raw) {
  const lines = raw.split(/\r?\n/);
  const messages = [];
  let current = null;

  for (const line of lines) {
    const header = line.match(HEADER_RE);
    if (header) {
      if (current) messages.push(current);
      const [, datePart, timePart, period, sender, firstLine] = header;
      current = {
        rawHeader: cleanText(firstLine),
        sourceSender: cleanText(sender),
        sourceDatePart: cleanText(datePart),
        sourceTime: parseTime(timePart, period),
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(cleanText(line));
    }
  }

  if (current) messages.push(current);
  return messages.filter((message) => message.rawHeader || message.bodyLines.some(Boolean));
}

function getMessageTiming(message) {
  const override = findOverride(message.rawHeader, message.bodyLines);
  if (override) {
    return {
      sourceMessageAt: override.sourceMessageAt,
      workoutDate: override.workoutDate,
      preprocessingNotes: override.notes,
    };
  }

  const sourceDate = parseSourceDate(message.sourceDatePart);
  const sourceMessageAt = sourceDate ? buildDateTime(sourceDate, message.sourceTime) : null;
  const workoutDate = firstDateFromText([message.rawHeader, ...message.bodyLines].join(' ')) || sourceDate;
  return {
    sourceMessageAt,
    workoutDate,
    preprocessingNotes: [],
  };
}

function makeId(profileSlug, performedAt, index) {
  const stamp = performedAt.replace(/[-:T+]/g, '').slice(0, 12);
  return `session_${profileSlug}_${stamp}_${String(index + 1).padStart(3, '0')}`;
}

function buildSession(message, index) {
  const profileSlug = message.profileSlug || DEFAULT_PROFILE;
  const bodyLines = message.bodyLines.filter(Boolean);
  const timing = message.sourceMessageAt
    ? {
        sourceMessageAt: message.sourceMessageAt,
        workoutDate: message.workoutDate,
        preprocessingNotes: message.preprocessingNotes || [],
      }
    : getMessageTiming(message);

  const sourceTime = timing.sourceMessageAt?.slice(11, 16) || message.sourceTime || '00:00';
  const date = timing.workoutDate;
  const performedAt = buildDateTime(date, sourceTime);
  const exercises = parseExercises(bodyLines);
  const workoutType = inferWorkoutType(`${message.rawHeader} ${bodyLines.slice(0, 3).join(' ')}`, exercises);
  const dayOfWeek = parseDayOfWeek(`${message.rawHeader} ${bodyLines.join(' ')}`)
    || new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: TIME_ZONE }).format(new Date(performedAt));
  const label = workoutType === 'legs' ? 'Leg Day' : `${workoutType.charAt(0).toUpperCase()}${workoutType.slice(1)} Day`;
  const titleDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(new Date(performedAt));

  const notes = [];
  if (workoutType === 'hiit' && exercises.length === 0) {
    notes.push(...bodyLines);
  }
  if (timing.preprocessingNotes?.length) notes.push(...timing.preprocessingNotes);

  return {
    id: makeId(profileSlug, performedAt, index),
    profileSlug,
    date,
    timeOfDay: sourceTime,
    timeZone: TIME_ZONE,
    performedAt,
    sourceMessageAt: timing.sourceMessageAt,
    sourceSender: message.sourceSender && message.sourceSender !== 'APPARAO THADANA'
      ? message.sourceSender
      : 'T. a. rao Airtel',
    dayOfWeek,
    workoutType,
    category: WORKOUT_CATEGORY[workoutType] || WORKOUT_CATEGORY.mixed,
    title: `${label} - ${titleDate}`,
    durationMinutes: null,
    intensity: workoutType === 'hiit' ? 'High' : 'Moderate',
    notes: notes.join('; '),
    exercises,
    rawHeader: message.rawHeader,
  };
}

function parseResourceLinks(rootDir) {
  const filePath = path.join(rootDir, 'Resourcelinks.md');
  if (!fs.existsSync(filePath)) {
    return { meta: { totalLinks: 0 }, links: [] };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  const links = [];
  const seen = new Set();

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}\/\d{2}),\s*(\d{1,2}:\d{2})\s*([ap])m\]\s*[^:]+:\s*(https?:\/\/\S+)/i);
    if (!match) continue;
    const [, datePart, timePart, period, url] = match;
    const sourceDate = parseSourceDate(datePart, '2026');
    const sourceTime = parseTime(timePart, period);
    const sharedAt = buildDateTime(sourceDate, sourceTime);
    let type = 'post';
    if (/\/share\/v\//i.test(url)) type = 'video';
    if (/\/share\/r\/|\/reel\//i.test(url)) type = 'reel';

    links.push({
      id: `link_${String(links.length + 1).padStart(3, '0')}`,
      sharedAt,
      url,
      type,
      platform: 'facebook',
      duplicate: seen.has(url),
    });
    seen.add(url);
  }

  return {
    meta: {
      source: 'WhatsApp resource links',
      generatedAt: new Date().toISOString(),
      totalLinks: links.length,
    },
    links,
  };
}

export function buildWorkoutDataset(rootDir) {
  const sourcePath = path.join(rootDir, 'Exercise data.md');
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const sourceMessages = splitMessages(raw);
  const messages = [...sourceMessages, ...EXTRA_MESSAGES];
  const sessions = messages
    .map(buildSession)
    .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());

  const byProfile = Object.fromEntries(PROFILES.map((profile) => [profile.slug, []]));
  for (const session of sessions) {
    byProfile[session.profileSlug] ||= [];
    byProfile[session.profileSlug].push(session);
  }

  return {
    meta: {
      source: 'WhatsApp workout export',
      generatedAt: new Date().toISOString(),
      timeZone: TIME_ZONE,
      totalSessions: sessions.length,
      profileTotals: Object.fromEntries(Object.entries(byProfile).map(([slug, items]) => [slug, items.length])),
      dateRange: {
        from: sessions[0]?.performedAt || null,
        to: sessions.at(-1)?.performedAt || null,
      },
      notes: [
        'performedAt combines the workout date with the WhatsApp message time in Asia/Kolkata.',
        'sourceMessageAt preserves the original WhatsApp message timestamp when available.',
        'Known date typos were corrected and recorded in session notes.',
      ],
    },
    profiles: PROFILES,
    sessions,
    sessionsByProfile: byProfile,
    resourceLinks: parseResourceLinks(rootDir),
  };
}
