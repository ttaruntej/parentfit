import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildWorkoutDataset } from './workoutPreprocessor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'data');

fs.mkdirSync(OUT_DIR, { recursive: true });

const dataset = buildWorkoutDataset(ROOT);

const exercisePath = path.join(OUT_DIR, 'exercise_log.json');
const resourcePath = path.join(OUT_DIR, 'resource_links.json');

fs.writeFileSync(
  exercisePath,
  JSON.stringify({
    meta: dataset.meta,
    profiles: dataset.profiles,
    sessions: dataset.sessions,
    sessionsByProfile: dataset.sessionsByProfile,
  }, null, 2),
  'utf8',
);

fs.writeFileSync(
  resourcePath,
  JSON.stringify(dataset.resourceLinks, null, 2),
  'utf8',
);

const totalExercises = dataset.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
const totalSets = dataset.sessions.reduce(
  (sum, session) => sum + session.exercises.reduce((inner, exercise) => inner + exercise.sets.length, 0),
  0,
);

console.log(`exercise_log.json: ${dataset.sessions.length} sessions -> ${exercisePath}`);
console.log(`resource_links.json: ${dataset.resourceLinks.links.length} links -> ${resourcePath}`);
console.log(`profiles: ${dataset.profiles.map((profile) => `${profile.name} (${dataset.sessionsByProfile[profile.slug]?.length || 0})`).join(', ')}`);
console.log(`parsed detail: ${totalExercises} exercise blocks, ${totalSets} sets`);
