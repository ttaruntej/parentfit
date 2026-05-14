import { Octokit } from '@octokit/rest';
import exerciseLogJson from '../data/exercise_log.json';
import resourceLinksJson from '../data/resource_links.json';

// ─── Users ───────────────────────────────────────────────────────────────────

export const USERS = [
  {
    id: 'apparao',
    name: 'Thadana Apparao',
    initials: 'TA',
    color: '#FF6B35',
  },
  {
    id: 'vijaya',
    name: 'Addipalli Vijaya Kumari',
    initials: 'VK',
    color: '#00C896',
  },
];

// ─── Map structured JSON → App schema ────────────────────────────────────────

const WORKOUT_CATEGORY = {
  push:  'Strength / Push',
  pull:  'Strength / Pull',
  legs:  'Lower Body / Legs',
  hiit:  'Cardio / HIIT',
  mixed: 'General Fitness',
};

function mapSessionToLog(session) {
  const exerciseList = (session.exercises || []).map(ex => {
    const setsSummary = (ex.sets || []).map(s => {
      if (s.bodyweight) return `BW×${s.reps ?? '?'}`;
      if (s.counterweight_kg != null) return `CW${s.counterweight_kg}kg×${s.reps ?? '?'}`;
      return `${s.weight_kg ?? '?'}kg×${s.reps ?? '?'}`;
    }).join(', ');
    return {
      name: ex.name,
      sets: (ex.sets || []).length,
      reps: setsSummary,
      rawName: ex.rawName,
      equipment: ex.equipment,
      notes: ex.notes || undefined,
    };
  });

  return {
    id: session.id,
    date: session.date ? `${session.date}T06:00:00+05:30` : new Date().toISOString(),
    category: WORKOUT_CATEGORY[session.workoutType] || 'General Fitness',
    title: session.rawHeader || `${session.workoutType} Day`,
    durationMinutes: session.workoutType === 'hiit' ? 30 : 45,
    intensity: session.workoutType === 'hiit' ? 'High' : 'Moderate',
    notes: session.notes || '',
    exercises: exerciseList,
    workoutType: session.workoutType,
    dayOfWeek: session.dayOfWeek,
  };
}

function mapLinkToResource(link, index) {
  const typeLabel = link.type === 'video' ? 'Video' : 'Reel';
  return {
    id: link.id,
    title: `FB ${typeLabel} #${index + 1}`,
    url: link.url,
    type: 'video',
    addedAt: link.sharedAt,
    tags: ['Facebook', link.type === 'reel' ? 'Reel' : 'Video', 'Imported'],
    duplicate: link.duplicate,
  };
}

// ─── Configuration — NO tokens hardcoded here ────────────────────────────────

export const getConfig = () => ({
  token:  localStorage.getItem('parentfit_gh_token') || import.meta.env.VITE_GH_TOKEN || '',
  owner:  localStorage.getItem('parentfit_gh_owner') || 'ttaruntej',
  repo:   localStorage.getItem('parentfit_gh_repo')  || 'parentfit',
  branch: localStorage.getItem('parentfit_gh_branch') || 'main',
});

export const saveConfig = ({ token, owner, repo, branch }) => {
  if (token !== undefined) localStorage.setItem('parentfit_gh_token', token.trim());
  if (owner)  localStorage.setItem('parentfit_gh_owner', owner.trim());
  if (repo)   localStorage.setItem('parentfit_gh_repo', repo.trim());
  if (branch) localStorage.setItem('parentfit_gh_branch', branch.trim());
};

// ─── Active user ─────────────────────────────────────────────────────────────

export const getActiveUserId = () =>
  localStorage.getItem('parentfit_active_user') || 'apparao';

export const setActiveUserId = (id) =>
  localStorage.setItem('parentfit_active_user', id);

// ─── Per-user file paths ─────────────────────────────────────────────────────

const userFilePaths = (userId) => ({
  exercises: `data/${userId}/exercise_data.json`,
  resources: `data/${userId}/resource_links.json`,
  exerciseMd: `data/${userId}/Exercise_data.md`,
  resourceMd:  `data/${userId}/Resourcelinks.md`,
});

// ─── Seed data (Apparao's historical data from bundled JSON) ─────────────────

const INITIAL_EXERCISES_APPARAO = {
  logs: (exerciseLogJson.sessions || []).map(mapSessionToLog),
};

const INITIAL_RESOURCES_APPARAO = {
  resources: (resourceLinksJson.links || [])
    .filter(l => !l.duplicate)
    .map((l, i) => mapLinkToResource(l, i)),
};

// Vijaya starts with an empty slate
const INITIAL_EXERCISES_VIJAYA = { logs: [] };
const INITIAL_RESOURCES_VIJAYA = { resources: [] };

const getInitialData = (userId) => ({
  exercises: userId === 'apparao' ? INITIAL_EXERCISES_APPARAO : INITIAL_EXERCISES_VIJAYA,
  resources: userId === 'apparao' ? INITIAL_RESOURCES_APPARAO : INITIAL_RESOURCES_VIJAYA,
});

// ─── Demo mode check ─────────────────────────────────────────────────────────
// Demo = missing token AND no injected secret
const isDemoMode = () => {
  const cfg = getConfig();
  const token = cfg.token;
  return !token || token.length < 5;
};

// ─── Generic JSON File Reader ─────────────────────────────────────────────────

export const fetchJsonFile = async (path, fallbackData) => {
  const { token, owner, repo, branch } = getConfig();

  if (isDemoMode()) {
    console.log(`[Demo Mode] Serving local data for ${path}`);
    const localSaved = localStorage.getItem(`parentfit_mock_${path}`);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        const arrKey = path.includes('resource') ? 'resources' : 'logs';
        if (parsed?.[arrKey]?.length >= (fallbackData?.[arrKey]?.length || 0)) {
          return parsed;
        }
      } catch (e) {}
    }
    localStorage.setItem(`parentfit_mock_${path}`, JSON.stringify(fallbackData));
    return fallbackData;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    if (response.data?.content) {
      const decoded = decodeURIComponent(escape(atob(response.data.content)));
      return JSON.parse(decoded);
    }
    return fallbackData;
  } catch (error) {
    console.warn(`Could not fetch ${path}. Using local cache / fallback.`, error.message);
    const localSaved = localStorage.getItem(`parentfit_mock_${path}`);
    if (localSaved) {
      try { return JSON.parse(localSaved); } catch (e) {}
    }
    return fallbackData;
  }
};

// ─── Generic JSON File Writer ─────────────────────────────────────────────────

export const saveJsonFile = async (path, contentObj) => {
  const { token, owner, repo, branch } = getConfig();
  const contentString = JSON.stringify(contentObj, null, 2);

  // Always persist locally for offline resilience
  localStorage.setItem(`parentfit_mock_${path}`, contentString);

  if (isDemoMode()) {
    console.log(`[Demo Mode] Saved locally for ${path}. Add GitHub token in Settings to sync.`);
    return { success: true, simulated: true };
  }

  try {
    const octokit = new Octokit({ auth: token });
    let sha;
    try {
      const existing = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      sha = existing.data?.sha;
    } catch (_) {} // 404 = new file, no sha needed

    const encodedContent = btoa(unescape(encodeURIComponent(contentString)));
    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path, branch, sha,
      message: `sync(${path}): update via ParentFit App`,
      content: encodedContent,
    });

    return { success: true, simulated: false };
  } catch (error) {
    console.error(`Failed to push ${path} to GitHub:`, error.message);
    throw error;
  }
};

// ─── Generic Text File Writer ─────────────────────────────────────────────────

export const saveTextFile = async (path, contentString) => {
  if (isDemoMode()) return { success: true, simulated: true };
  const { token, owner, repo, branch } = getConfig();
  try {
    const octokit = new Octokit({ auth: token });
    let sha;
    try {
      const existing = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      sha = existing.data?.sha;
    } catch (_) {}
    const encodedContent = btoa(unescape(encodeURIComponent(contentString)));
    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path, branch, sha,
      message: `docs: sync markdown mirror ${path}`,
      content: encodedContent,
    });
    return { success: true };
  } catch (err) {
    console.error(`Failed pushing markdown to ${path}:`, err.message);
  }
};

// ─── Domain-specific helpers (user-aware) ────────────────────────────────────

export const getExerciseLogs = (userId) => {
  const paths = userFilePaths(userId);
  const initial = getInitialData(userId).exercises;
  return fetchJsonFile(paths.exercises, initial);
};

export const saveExerciseLogs = async (logsObj, userId) => {
  const paths = userFilePaths(userId);
  const res = await saveJsonFile(paths.exercises, logsObj);

  // Non-blocking markdown mirror
  let md = `# 🏋️ ParentFit: Exercise Log — ${USERS.find(u => u.id === userId)?.name || userId}\n\n`;
  md += `| Date | Title | Category | Duration | Intensity | Exercises | Notes |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  (logsObj.logs || []).forEach(item => {
    const dt = item.date ? item.date.split('T')[0] : '—';
    const exStr = (item.exercises || []).map(e => `• ${e.name}`).join(', ');
    const safeNotes = (item.notes || '').replace(/\|/g, '-');
    md += `| ${dt} | **${(item.title || '').replace(/\|/g, '-')}** | ${item.category} | ${item.durationMinutes}m | ${item.intensity} | ${exStr || '-'} | ${safeNotes || '-'} |\n`;
  });
  saveTextFile(paths.exerciseMd, md);
  return res;
};

export const getResourceLinks = (userId) => {
  const paths = userFilePaths(userId);
  const initial = getInitialData(userId).resources;
  return fetchJsonFile(paths.resources, initial);
};

export const saveResourceLinks = async (resourcesObj, userId) => {
  const paths = userFilePaths(userId);
  const res = await saveJsonFile(paths.resources, resourcesObj);

  let md = `# 🎬 ParentFit: Resource Links — ${USERS.find(u => u.id === userId)?.name || userId}\n\n`;
  md += `| Title | Type | URL | Tags | Added |\n| :--- | :--- | :--- | :--- | :--- |\n`;
  (resourcesObj.resources || []).forEach(item => {
    const dt = item.addedAt ? item.addedAt.split('T')[0] : '—';
    const tagsStr = (item.tags || []).map(t => `#${t}`).join(' ');
    md += `| **${(item.title || '').replace(/\|/g, '-')}** | ${item.type} | [Link](${item.url}) | ${tagsStr || '-'} | ${dt} |\n`;
  });
  saveTextFile(paths.resourceMd, md);
  return res;
};
