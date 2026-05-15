# ParentFit — Remediation Plan

> Companion to `AUDIT.md`. This file is **prescriptive**: each entry is a self-contained ticket that an AI agent or a full-stack engineer can pick up and execute without re-deriving context.
>
> Every ticket carries: a fixed `[ID]`, the **file:line** it touches, the **current code** snippet, the **proposed code** snippet (or a precise change description), an **acceptance criterion**, and any **dependencies** on other tickets.
>
> Execution order is encoded by the section ordering. Tickets in the same section can be parallelised unless a `depends-on` line says otherwise. **Do not skip the P0 section.**

---

## Progress — 2026-05-15 (Firebase Migration Shipped)

Commit `fe44339` on `main` migrated the backend to Firebase (Auth + Firestore). The deploy workflow no longer ships any GitHub token. Many tickets below are now closed; others are unblocked. Status by ticket:

### Done
- **P0-1** PAT rotation — DONE (owner revoked the leaked token).
- **P0-2** Strip token from bundle — DONE (workflow updated; `VITE_GH_TOKEN_PART*` removed; `getConfig()` deleted).
- **P0-3** Magic Link confirmation — MOOT (Magic Link flow deleted with the GitHub backend).
- **P0-4** Dashboard recent-sessions order — DONE (`Dashboard.jsx` sort by date desc).
- **P0-5** Optimistic add rollback / auto-sync gate — MOOT (listener-driven `AppContext`; no manual optimism; no 5-min interval).
- **P0-6** `forceManualSync` success/error reconciliation — MOOT (function is now a trivial success toast since the listener is live).
- **P1-8** Demo-mode trip wire by `!token` — MOOT (no demo mode).
- **P1-9** Empty default owner/repo — MOOT (no GitHub config at all).
- **P2-1** ErrorBoundary — DONE (`src/components/ErrorBoundary.jsx`, wired in `main.jsx`).
- **P2-2** `aria-live` toasts — DONE (`App.jsx` wraps toast region; error toast has `role="alert"`).
- **P2-6** Replace Octokit with fetch — MOOT (Octokit not in bundle; Firebase SDK replaces it).
- **P2-7** Drop `escape`/`unescape` — MOOT (base64 path gone with the GitHub backend; legacy file `src/services/githubBackend.js` slated for deletion in P6).
- **P2-10** Lazy-init seed mapping — MOOT (seed mapping no longer runs at runtime).
- **P3-2** `npm ci` + Node engine — PARTIAL (workflow uses `npm ci`; `engines` in `package.json` still not added).
- **P4-1** Backend proxy — DONE in spirit (Firebase plays the proxy role; secret never reaches browser).
- **P4-7** Multi-user seed from `USERS` const — MOOT (Firestore profile docs replace the const).
- **C-1 … C-15** (Appendix C migration tickets) — DONE through C-15. C-16/C-17 (data migration script + run) still open. C-18 (rules emulator tests) optional, still open. C-19 (legacy code cleanup) merged into the new **P6** section below.

### Still open (highest impact first)
- **P1-1** Knowledge Hub images 404 in production — visible regression on live site.
- **P1-3** Empty sessions can be submitted.
- **P1-4** URL parser hardening (Media player + ResourceHub).
- **P1-5** `category` schema drift — new logs still emit `"Push Day"`-style strings instead of canonical `"Strength / Push"`. One-line fix.
- **P1-6** Stop fabricating the 06:00 IST timestamp.
- **P2-3** Focus indicators.
- **P2-4** History card keyboard accessibility.
- **P2-5** User-switcher overlay → document listener.
- **P3-1** Untrack `dist/index.html`.
- **P3-3** Drive `base` from CI environment.
- **P3-5** ESLint + Prettier.
- **P3-6** Vitest + smoke tests.
- All MEDIUM/LOW items in section P2/P3 remain open.

### New post-migration cleanup tickets — see **P6** section below
- **P6-1** Delete legacy `githubBackend.js`, JSON seed files, Octokit dep.
- **P6-2** Remove compat aliases from `AppContext` after Navbar update.
- **P6-3** Update `Navbar.jsx` to use native `profiles` / `activeProfile`.
- **P6-4** Delete the old `VITE_GH_TOKEN` repository secret.
- **P6-5** Write & run the data migration script (Appendix C.10) if historical data must come over.
- **P6-6** Smoke-test the live deploy.

---

## How to use this file

- Each ticket header is `### [ID] Title — [severity]`.
- IDs are stable. When work splits, suffix `.a`, `.b`.
- "Verification" is the manual or automated check that proves the fix.
- "Risk" lists the way the fix can go wrong — read it before merging.
- When a ticket says "delete a file" or "rotate a secret," the human owner must do that step; an agent can prepare the PR but should NOT delete remote resources, rewrite shared git history, or push tokens.

---

## P0 — Security & data-loss (do these first; halt all other work)

### [P0-1] Rotate the leaked GitHub PAT — [CRITICAL]
- **Owner action required.** No code change in this repo.
- **Steps:**
  1. Open <https://github.com/settings/tokens> (or the org's fine-grained-tokens settings).
  2. Locate the PAT with prefix `ghp_uv4...` (the one historically committed in `Implementation_Plan.md`, also the one stored as the `VITE_GH_TOKEN` repo secret).
  3. Click **Revoke**.
  4. Issue a new fine-grained token, scoped only to the single `<owner>/<repo>` used for storage, with `Contents: Read and Write` and **no other scopes**.
  5. Update the GitHub Actions secret `VITE_GH_TOKEN` (Settings → Secrets and variables → Actions) — but **only if** you keep the public-bundle injection. Otherwise delete that secret entirely (recommended; see P0-2).
- **Verification:** the old token must return `401` on `GET /user`.
- **Risk:** any user with a previously-injected build of the site loses sync until they paste the new token. Acceptable.

### [P0-2] Stop shipping the token in the public bundle — [CRITICAL]
- **File:** `.github/workflows/deploy.yml:26-31` and `src/services/githubBackend.js:79-89`.
- **Current `deploy.yml`:**
  ```yaml
  - name: Build
    run: |
      TOKEN="${{ secrets.VITE_GH_TOKEN }}"
      export VITE_GH_TOKEN_PART1="${TOKEN:0:20}"
      export VITE_GH_TOKEN_PART2="${TOKEN:20}"
      npm run build
  ```
- **Proposed `deploy.yml`:**
  ```yaml
  - name: Build
    run: npm run build
  ```
- **Current `getConfig` in `githubBackend.js`:**
  ```js
  export const getConfig = () => {
    const part1 = import.meta.env.VITE_GH_TOKEN_PART1 || '';
    const part2 = import.meta.env.VITE_GH_TOKEN_PART2 || '';
    const injectedToken = (part1 && part2) ? (part1 + part2) : (import.meta.env.VITE_GH_TOKEN || '');

    return {
      token:  localStorage.getItem('parentfit_gh_token') || injectedToken,
      owner:  localStorage.getItem('parentfit_gh_owner') || 'ttaruntej',
      repo:   localStorage.getItem('parentfit_gh_repo')  || 'parentfit',
      branch: localStorage.getItem('parentfit_gh_branch') || 'main',
    };
  };
  ```
- **Proposed `getConfig`:**
  ```js
  export const getConfig = () => ({
    token:  localStorage.getItem('parentfit_gh_token')  || '',
    owner:  localStorage.getItem('parentfit_gh_owner')  || '',
    repo:   localStorage.getItem('parentfit_gh_repo')   || '',
    branch: localStorage.getItem('parentfit_gh_branch') || 'main',
  });
  ```
- **Verification:**
  - Build locally. `grep -r 'VITE_GH_TOKEN' dist/` returns nothing.
  - Live deployed bundle does not contain any string matching `/[A-Za-z0-9_]{20,}/` that resembles a token (eyeball-grep).
  - First-run user sees the Settings modal prompt and can paste their own token.
- **Risk:** existing users who relied on auto-injection now need to paste a token. Coordinate the rollout with a brief README update.
- **Depends on:** P0-1.

### [P0-3] Confirm before applying Magic Link config — [CRITICAL]
- **File:** `src/context/AppContext.jsx:62-83`.
- **Current code:**
  ```js
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get('owner');
    const repo  = params.get('repo');
    const branch = params.get('branch');

    if (owner || repo) {
      persistConfig({ owner: owner || ghConfig.owner, repo: repo || ghConfig.repo, branch: branch || ghConfig.branch || 'main' });
      setGhConfig(getConfig());
      triggerSuccess('Magic Link detected! Configuration synced ✓');
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => loadData(activeUserId), 500);
    }
  }, [ghConfig, activeUserId, loadData]);
  ```
- **Proposed approach:**
  1. Capture the proposed config to React state, do NOT persist immediately.
  2. Render a confirmation modal: "A link wants to change your storage to `<owner>/<repo>`. Apply?" with Apply / Reject buttons.
  3. On Apply: `persistConfig`, reload.
  4. On Reject: clear URL params (`replaceState`) and discard.
  5. Strip `[ghConfig, loadData]` from the dep list; only the first mount should read URL params (`useEffect(..., [])`).
- **Verification:**
  - Manual: visit `/?owner=evil&repo=test`. App shows a confirmation modal, does not change storage until confirmed.
  - Magic Link toast is replaced by the modal.
- **Risk:** flow change. Existing users who shared bookmarked Magic Links will see the new modal — acceptable.

### [P0-4] Fix "Recent Sessions" ordering bug — [CRITICAL]
- **File:** `src/components/Dashboard.jsx:57`.
- **Current code:**
  ```js
  const logs = useMemo(() => (exerciseData?.logs || []).slice().reverse(), [exerciseData]);
  ```
- **Proposed code:**
  ```js
  const logs = useMemo(() => {
    const all = exerciseData?.logs || [];
    return [...all].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [exerciseData]);
  ```
- **Verification:** log a new session via the wizard. It appears at index 0 of "Recent Sessions" on the Home tab. Logging multiple sessions across days produces stable date-desc ordering regardless of seed order.
- **Risk:** none — the new behaviour matches the explicit claim in the section title.

### [P0-5] Roll back optimistic add on failure; gate auto-sync by `syncing` — [HIGH]
- **File:** `src/context/AppContext.jsx:93-108, 173-191`.
- **Current `addExerciseLog`:**
  ```js
  const addExerciseLog = async (newLog) => {
    setSyncing(true);
    const updated = { ...exerciseData, logs: [newLog, ...(exerciseData.logs || [])] };
    setExerciseData(updated);
    try {
      const res = await saveExerciseLogs(updated, activeUserId);
      triggerSuccess(res.simulated ? '...' : '...');
    } catch (err) {
      triggerError('Failed to sync session to cloud. Cached locally.');
    } finally {
      setSyncing(false);
    }
  };
  ```
- **Proposed `addExerciseLog`:**
  ```js
  const addExerciseLog = async (newLog) => {
    const prev = exerciseData;
    const updated = { ...exerciseData, logs: [newLog, ...(exerciseData.logs || [])] };
    setSyncing(true);
    setExerciseData(updated);
    try {
      const res = await saveExerciseLogs(updated, activeUserId);
      triggerSuccess(res.simulated
        ? 'Session logged locally! Add access token in Settings to sync.'
        : 'Session synced to cloud ✓');
    } catch (err) {
      setExerciseData(prev);  // rollback
      triggerError('Failed to save session. Please try again.');
    } finally {
      setSyncing(false);
    }
  };
  ```
- **Auto-sync gate:** in the interval and `visibilitychange` handlers, skip `loadData` while `syncing === true`. Read the latest `syncing` via a ref to avoid stale closure:
  ```js
  const syncingRef = useRef(syncing);
  useEffect(() => { syncingRef.current = syncing; }, [syncing]);

  // inside the effect:
  const interval = setInterval(() => {
    if (!syncingRef.current) loadData(activeUserId, true);
  }, 5 * 60 * 1000);
  ```
- **Verification:**
  - Throttle network → submit a session → kill network → observe rollback toast and the session disappears from "Recent Sessions."
  - With dev tools throttling a save, switch tabs and back; the in-flight save completes uninterrupted (no overwrite by auto-sync).
- **Risk:** the rollback can flicker if the save takes >100ms. Acceptable.

### [P0-6] Fix `forceManualSync` success/error mismatch — [HIGH]
- **File:** `src/context/AppContext.jsx:160-163, 40-57`.
- **Refactor `loadData` to return a boolean:**
  ```js
  const loadData = useCallback(async (userId, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const uid = userId || activeUserId;
      const [exercises, resources] = await Promise.all([
        getExerciseLogs(uid),
        getResourceLinks(uid),
      ]);
      setExerciseData(exercises || { logs: [] });
      setResourceData(resources || { resources: [] });
      return true;
    } catch (err) {
      console.error('Failed loading data:', err);
      if (!silent) triggerError('Could not sync with cloud storage. Serving cached data.');
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeUserId]);

  const forceManualSync = async () => {
    const ok = await loadData(activeUserId);
    if (ok) triggerSuccess('Synced from cloud storage ✓');
  };
  ```
- **Verification:** disconnect the network, hit the Refresh button. Only the red error toast appears; no green success toast.

---

## P1 — Bugs, schema, and user-facing correctness

### [P1-1] Fix Knowledge Hub images for production — [HIGH]
- **File:** `src/App.jsx:32-57`.
- **Option A (preferred): Vite imports.** Move PNGs into `src/assets/content/` (already there). Change:
  ```js
  // top of file
  import microWorkoutsImg from './assets/content/micro_workouts.png';
  import dadStrengthImg   from './assets/content/dad_strength.png';
  import nutritionImg     from './assets/content/nutrition.png';
  import familyFitnessImg from './assets/content/family_fitness.png';

  // inside knowledgeItems
  { title: 'Micro-Workouts', desc: '...', tag: 'Efficiency', img: microWorkoutsImg },
  ```
- **Option B:** move PNGs to `public/content/` and reference them as `/content/<file>.png`. Combine with the Vite `base` to use `import.meta.env.BASE_URL + 'content/...'`.
- **Verification:** `npm run build && npx serve dist/` → all four cards render.
- **Risk:** Option B couples the path to the deploy base path; Option A is portable.

### [P1-2] Reset `workoutType` after submit — [MEDIUM]
- **File:** `src/components/ExerciseLogger.jsx:289`.
- **Current:**
  ```js
  await addExerciseLog(payload);
  setNotes(''); setExercises([emptyEx()]); setDuration(45); setStep(0);
  ```
- **Proposed:**
  ```js
  await addExerciseLog(payload);
  setNotes('');
  setExercises([emptyEx()]);
  setDuration(45);
  setWorkoutType('push'); // explicit default
  setStep(0);
  ```
- **Verification:** log a Pull session, immediately open the wizard; Step 0 shows no selection (or the explicit default).

### [P1-3] Reject empty sessions — [MEDIUM]
- **File:** `src/components/ExerciseLogger.jsx:259-290`.
- **Add at the top of `handleSubmit`:**
  ```js
  const named = exercises.filter(ex => ex.name.trim());
  if (named.length === 0) {
    // Use a toast via context if available; for now block submit:
    alert('Add at least one named exercise before saving.');
    return;
  }
  ```
- **Better:** disable the submit button on the Finish step when `named.length === 0`. Compute `const canSubmit = exercises.some(ex => ex.name.trim());` and pass to `FinishStep`.
- **Verification:** advance through the wizard without naming any exercise; submit is disabled / blocks.

### [P1-4] Use `URL` API for video host detection — [MEDIUM]
- **Files:**
  - `src/components/MediaPlayerModal.jsx:11-31`
  - `src/components/ResourceHub.jsx:9-32, 116-118`
- **Proposed helper (extract to `src/lib/url.js`):**
  ```js
  export function parseMediaUrl(raw) {
    try {
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./, '');
      const pathname = u.pathname;

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = u.searchParams.get('v');
        return id ? { kind: 'youtube', id, embed: `https://www.youtube.com/embed/${id}?autoplay=1` } : null;
      }
      if (host === 'youtu.be') {
        const id = pathname.replace(/^\//, '').split('/')[0];
        return id ? { kind: 'youtube', id, embed: `https://www.youtube.com/embed/${id}?autoplay=1` } : null;
      }
      if (host === 'vimeo.com') {
        const id = pathname.replace(/^\//, '').split('/')[0];
        return id ? { kind: 'vimeo', id, embed: `https://player.vimeo.com/video/${id}?autoplay=1` } : null;
      }
      if (host === 'facebook.com' || host === 'fb.watch') {
        return { kind: 'facebook', embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=500` };
      }
      if (pathname.toLowerCase().endsWith('.mp4')) return { kind: 'mp4', src: raw };
      if (pathname.toLowerCase().endsWith('.mp3')) return { kind: 'mp3', src: raw };
      return null;
    } catch {
      return null;
    }
  }

  export const isPlayable = (raw) => parseMediaUrl(raw) !== null;
  ```
- **Replace** the substring-based logic in `MediaPlayerModal` with a `switch (kind)` over the parser result.
- **Replace** `isPlayable` in `ResourceHub`.
- **Verification:**
  - `parseMediaUrl('https://cdn/clip.mp4?v=2')` → `{ kind: 'mp4', src: ... }`.
  - `parseMediaUrl('https://attacker/?facebook.com=')` → `null`.
  - `parseMediaUrl('javascript:alert(1)?v=evil')` → `null` (URL parse throws on `javascript:` for relative? actually parses; check `u.protocol !== 'http:' && u.protocol !== 'https:'` → return null).
- **Additional check:** reject non-http(s) protocols up front:
  ```js
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  ```

### [P1-5] Reconcile the `category` schema drift — [HIGH]
- **Files:**
  - `src/services/githubBackend.js:24-30, 32-60`
  - `src/components/ExerciseLogger.jsx:262-275`
- **Decision:** new sessions should store the same `category` strings the seed mapper uses.
- **Change in `ExerciseLogger.handleSubmit`:**
  ```js
  // before:
  category: typeInfo.name,
  // after:
  category: WORKOUT_CATEGORY[workoutType] || 'General Fitness',
  ```
  Export `WORKOUT_CATEGORY` from `githubBackend.js` and import it (or move the constant to a shared module `src/lib/workoutTypes.js`).
- **Optional follow-up:** add a one-time migration that rewrites any stored `category: '<Type> Day'` to the canonical value on next load (`AppContext.loadData`).
- **Verification:** log a new Push session; in localStorage (`parentfit_mock_data/<user>/exercise_data.json`) the `category` is `Strength / Push`. HistoryView filters keyed by `workoutType` continue to work unchanged.

### [P1-6] Stop fabricating the `06:00 IST` stamp — [MEDIUM]
- **Files:**
  - `src/components/ExerciseLogger.jsx:262-265`
  - `src/services/githubBackend.js:51` (seed mapper; leave as-is for historical data, or backfill if you want consistency)
- **Proposed for fresh logs:**
  ```js
  const now = new Date();
  // ...
  date: now.toISOString(),
  ```
- **Verification:** new sessions have the real submission timestamp. Streak/heatmap math (which slices on `T`) unchanged.

### [P1-7] Heatmap: use IST-local date keys — [LOW]
- **File:** `src/components/HistoryView.jsx:30-37`.
- **Replace** `cur.toISOString().split('T')[0]` with a local-date formatter:
  ```js
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  ```
- **Verification:** between midnight-IST and 05:30-IST, "today" cell matches IST calendar.

### [P1-8] Demo-mode trip wire by `!token`, not length — [MEDIUM]
- **File:** `src/services/githubBackend.js:138-143`.
- **Current:** `return !token || token.length < 10;`
- **Proposed:** `return !token || !token.trim();`
- **Reason:** length-based heuristic surprises users who paste short test tokens. Empty-string is the canonical "demo".
- **Verification:** an empty Settings token → Demo pill. Any non-empty token → Live pill (the cloud call's own auth failure still produces a clear error toast).

### [P1-9] Default `owner`/`repo` empty; require Settings — [MEDIUM]
- See P0-2 — already covered.

### [P1-10] Resource type fidelity in seed mapper — [LOW]
- **File:** `src/services/githubBackend.js:63-74`.
- **Current:** `type: 'video'` regardless of input.
- **Proposed:** `type: link.type === 'audio' ? 'audio' : link.type === 'article' ? 'article' : 'video'`.

---

## P2 — Accessibility, performance, and DX

### [P2-1] Add an `ErrorBoundary` around `<App />` — [HIGH]
- **File:** new `src/components/ErrorBoundary.jsx`; wrap in `src/main.jsx`.
- **Component skeleton:**
  ```jsx
  import React from 'react';
  export default class ErrorBoundary extends React.Component {
    state = { err: null };
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) { console.error('Render error:', err, info); }
    render() {
      if (this.state.err) {
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
            <h2>Something went wrong.</h2>
            <pre style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
              {String(this.state.err)}
            </pre>
            <button className="btn btn-fire" onClick={() => location.reload()}>Reload</button>
          </div>
        );
      }
      return this.props.children;
    }
  }
  ```
- **`main.jsx`:**
  ```jsx
  <ErrorBoundary>
    <AppProvider><App /></AppProvider>
  </ErrorBoundary>
  ```
- **Verification:** temporarily throw inside a component; the fallback renders.

### [P2-2] Make toasts screen-reader-friendly — [HIGH]
- **File:** `src/App.jsx:134-144`.
- **Wrap toasts in an `aria-live` region:**
  ```jsx
  <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 'calc(var(--nav-h) + 1rem)', left: 0, right: 0, pointerEvents: 'none' }}>
    {successMsg && <div className="toast toast-success" style={{ pointerEvents: 'auto' }}>...</div>}
    {error && <div className="toast toast-error" role="alert" style={{ pointerEvents: 'auto' }}>...</div>}
  </div>
  ```
- **Verification:** VoiceOver / NVDA announces success and error toasts.

### [P2-3] Restore keyboard focus indicators globally — [HIGH]
- **File:** `src/index.css` (append at the end).
- **Add:**
  ```css
  :focus-visible {
    outline: 2px solid var(--fire);
    outline-offset: 2px;
    border-radius: 4px;
  }
  button:focus { outline: none; } /* baseline reset */
  button:focus-visible {
    outline: 2px solid var(--fire);
    outline-offset: 2px;
  }
  ```
- **Verification:** tab through the app; a visible focus ring follows the active control on every button.

### [P2-4] Make HistoryView session cards keyboard accessible — [HIGH]
- **File:** `src/components/HistoryView.jsx:91`.
- **Replace** the outer `<div onClick={...}>` with:
  ```jsx
  <div
    className="session-card"
    role="button"
    tabIndex={0}
    aria-expanded={expanded}
    onClick={() => setExpanded(v => !v)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v); }
    }}
    style={{ flexDirection: 'column', gap: 0, cursor: 'pointer' }}
  >
  ```
- **Verification:** tab into a session row, press Enter — it expands. Press Space — toggles. Screen reader announces "button, expanded/collapsed."

### [P2-5] Replace user-switcher full-viewport overlay with a document listener — [MEDIUM]
- **File:** `src/components/Navbar.jsx:9, 137-141`.
- **Pattern:**
  ```jsx
  const menuRef = useRef(null);
  useEffect(() => {
    if (!showUserMenu) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, [showUserMenu]);
  ```
  Wrap the button + dropdown in `<div ref={menuRef}>`. Remove the full-viewport overlay div.
- **Verification:** click outside closes the menu; clicks elsewhere in the navbar do not trigger the overlay (verified by inspecting z-stack).

### [P2-6] Replace `@octokit/rest` with a tiny fetch wrapper — [HIGH]
- **File:** `src/services/githubBackend.js`.
- **Drop the dependency** in `package.json`.
- **Add helper:**
  ```js
  const GH_API = 'https://api.github.com';

  async function ghGet(path, { token }) {
    const res = await fetch(`${GH_API}${path}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`);
    return res.json();
  }

  async function ghPut(path, body, { token }) {
    const res = await fetch(`${GH_API}${path}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub PUT ${path}: ${res.status}`);
    return res.json();
  }

  function ghContentsPath({ owner, repo, path }) {
    return `/repos/${owner}/${repo}/contents/${path}`;
  }
  ```
- **Replace `octokit.rest.repos.getContent` / `createOrUpdateFileContents`** with these helpers. Use modern base64 helpers:
  ```js
  function b64encodeUtf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64decodeUtf8(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  ```
- **Verification:**
  - `npm run build`. Bundle size drops dramatically (compare `dist/assets/*.js` before/after).
  - Live sync still works end-to-end.
- **Risk:** small; the GitHub Contents API is stable. Make sure error paths still throw so `addExerciseLog`'s catch fires.
- **Closes also:** ticket [P2-7] below by removing `escape`/`unescape`.

### [P2-7] Replace `escape`/`unescape` UTF-8 hack — [LOW]
- **File:** `src/services/githubBackend.js:170, 206, 232`.
- See P2-6 helpers; this gets fixed for free if P2-6 is done.
- **Standalone fix (if P2-6 is deferred):**
  ```js
  // decode:
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(content), c => c.charCodeAt(0)));
  // encode:
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(str)));
  ```

### [P2-8] Memoize `HistoryView.FILTERS` — [MEDIUM]
- **File:** `src/components/HistoryView.jsx:162-169`.
- **Replace** with a single grouping pass:
  ```js
  const filterCounts = useMemo(() => {
    const counts = { all: allLogs.length, push: 0, pull: 0, legs: 0, hiit: 0, mixed: 0 };
    for (const l of allLogs) {
      const t = l.workoutType || 'mixed';
      if (counts[t] != null) counts[t]++;
    }
    return counts;
  }, [allLogs]);

  const FILTERS = [
    { v: 'all',   label: 'All',         count: filterCounts.all },
    { v: 'push',  label: '💪 Push',     count: filterCounts.push },
    // ...
  ];
  ```
- **Verification:** filter counts match prior behaviour; React DevTools shows fewer wasted renders on log scrolling.

### [P2-9] Memoize streak / totals in `Dashboard` — [LOW]
- **File:** `src/components/Dashboard.jsx:60-72`.
- Wrap totals + streak + greeting in `useMemo([logs])`. Cosmetic for now.

### [P2-10] Lazy-init seed mapping — [MEDIUM]
- **File:** `src/services/githubBackend.js:117-134`.
- **Replace** module-top constants with a memoized function:
  ```js
  let _seedApparao = null;
  const getApparaoSeed = () => {
    if (_seedApparao) return _seedApparao;
    _seedApparao = {
      exercises: { logs: (exerciseLogJson.sessions || []).map(mapSessionToLog) },
      resources: { resources: (resourceLinksJson.links || []).filter(l => !l.duplicate).map(mapLinkToResource) },
    };
    return _seedApparao;
  };

  const getInitialData = (userId) => userId === 'apparao'
    ? getApparaoSeed()
    : { exercises: { logs: [] }, resources: { resources: [] } };
  ```
- **Verification:** Vijaya cold start does not parse Apparao seed (verify via `console.time`).

### [P2-11] Extract shared `CAT_MAP` — [LOW]
- **Files:** `src/components/Dashboard.jsx:5-11`, `src/components/HistoryView.jsx:5-11`.
- **Create** `src/lib/categories.js`:
  ```js
  export const CAT_MAP = {
    push:  { emoji: '💪', cls: 'cat-push',  label: 'Push' },
    pull:  { emoji: '🏋️', cls: 'cat-pull',  label: 'Pull' },
    legs:  { emoji: '🦵', cls: 'cat-legs',  label: 'Legs' },
    hiit:  { emoji: '⚡', cls: 'cat-hiit',  label: 'HIIT' },
    mixed: { emoji: '🔀', cls: 'cat-mixed', label: 'Mixed' },
  };
  ```
  Import from both files.

### [P2-12] Per-tab `document.title` — [LOW]
- **File:** `src/App.jsx`.
- **Add:**
  ```js
  useEffect(() => {
    document.title = `${PAGE_TITLE[tab]} · ParentFit`;
  }, [tab]);
  ```

### [P2-13] Add a favicon + PWA basics — [LOW]
- **Files:** `index.html`, new `public/icon-192.png`, `public/icon-512.png`, `public/manifest.webmanifest`.
- **Add to `<head>`:**
  ```html
  <link rel="icon" type="image/png" href="/parentfit/icon-192.png" />
  <link rel="apple-touch-icon" href="/parentfit/icon-192.png" />
  <link rel="manifest" href="/parentfit/manifest.webmanifest" />
  <meta name="theme-color" content="#FF6B35" />
  ```
- **Manifest:**
  ```json
  {
    "name": "ParentFit",
    "short_name": "ParentFit",
    "start_url": "/parentfit/",
    "scope": "/parentfit/",
    "display": "standalone",
    "background_color": "#0a0808",
    "theme_color": "#FF6B35",
    "icons": [
      { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- **Verification:** Lighthouse PWA card lights up for the basics (no SW yet).

### [P2-14] Add SPA 404 fallback for GitHub Pages — [LOW]
- **File:** new `public/404.html`.
- **Content:** standard "spa-github-pages" trick (`<script>sessionStorage.redirect = location.href; location.replace('/parentfit/');</script>`). Not needed today (single tab via state), but cheap and forward-proof.

### [P2-15] Fix font loading mismatch — [MEDIUM]
- **Files:** `index.html`, `src/index.css`.
- **Decision:** keep one font for headers + one for body, in one location.
- **Recommended:** drop the `@import` in CSS (render-blocking), declare in HTML only:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  ```
  Remove the `@import` line in `src/index.css:1`. Remove Outfit (unused).
- **Verification:** DevTools Network shows two font requests (Inter, Poppins) issued in parallel from `<head>`, not after CSS parse. No Outfit fetch.

### [P2-16] Add `inputMode="decimal"` on weight inputs — [LOW]
- **File:** `src/components/ExerciseLogger.jsx:137-145`.
- Add `inputMode="decimal"` and `pattern="[0-9]*\.?[0-9]*"` to the weight `<input>`.
- For reps: `inputMode="numeric"`.

---

## P3 — Build, deploy, repo hygiene

### [P3-1] Untrack `dist/` — [HIGH]
- **Steps:**
  ```bash
  git rm --cached -r dist/
  git commit -m "chore: untrack built dist (already in .gitignore)"
  ```
- Confirm `.gitignore:11` still has `dist`.
- **Verification:** `git ls-files | grep '^dist/'` returns nothing on the next branch state.

### [P3-2] Switch CI to `npm ci`; pin Node — [HIGH]
- **File:** `.github/workflows/deploy.yml:23-24`.
- **Replace:**
  ```yaml
  - name: Install dependencies
    run: npm ci
  ```
- **Add to `package.json`:**
  ```json
  "engines": { "node": ">=18.18 <21" }
  ```

### [P3-3] Drive Vite `base` from CI — [HIGH]
- **File:** `vite.config.js`.
- **Replace** hardcoded `base: '/parentfit/'` with:
  ```js
  export default defineConfig(({ mode }) => {
    const base = process.env.VITE_BASE_PATH
      ?? (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/');
    return {
      plugins: [react()],
      base,
    };
  });
  ```
- **In `deploy.yml`:** the env vars are already available; nothing to add.
- **Verification:** rename repo locally, `npm run build`, inspect `dist/index.html` — asset paths match the new repo name.

### [P3-4] Use GitHub's native Pages deploy chain — [MEDIUM]
- **File:** `.github/workflows/deploy.yml`.
- **Proposed end-state:**
  ```yaml
  name: Deploy ParentFit to GitHub Pages

  on:
    push:
      branches: [ main ]

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: pages
    cancel-in-progress: false

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: 'npm' }
        - run: npm ci
        - run: npm run build
        - uses: actions/upload-pages-artifact@v3
          with: { path: dist }
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment: github-pages
      steps:
        - id: deployment
          uses: actions/deploy-pages@v4
  ```
- **Verification:** Pages build URL is reported in the workflow logs; site loads.
- **Risk:** the Pages settings in the repo must be switched from "Deploy from branch" to "GitHub Actions" once.

### [P3-5] Add ESLint + Prettier (no Husky needed yet) — [HIGH]
- **Files:** new `.eslintrc.cjs`, `.prettierrc.json`; update `package.json`.
- **Install:**
  ```bash
  npm i -D eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier
  ```
- **`.eslintrc.cjs` (minimal):**
  ```js
  module.exports = {
    root: true,
    env: { browser: true, es2022: true },
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    settings: { react: { version: 'detect' } },
    plugins: ['react', 'react-hooks', 'jsx-a11y'],
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react/jsx-runtime',
      'plugin:react-hooks/recommended',
      'plugin:jsx-a11y/recommended',
    ],
    rules: {
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  };
  ```
- **`package.json` scripts:**
  ```json
  "lint": "eslint src --ext .js,.jsx",
  "format": "prettier --write \"src/**/*.{js,jsx,css,json,md}\""
  ```
- **CI step (insert before `npm run build`):**
  ```yaml
  - run: npm run lint
  ```

### [P3-6] Add Vitest + a smoke test suite — [HIGH]
- **Install:**
  ```bash
  npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```
- **`vite.config.js`** add `test: { environment: 'jsdom', setupFiles: './src/test/setup.js' }`.
- **`src/test/setup.js`:** `import '@testing-library/jest-dom';`
- **Initial targets** (pure functions, no UI mocking):
  - `src/lib/url.js#parseMediaUrl`
  - `streak` from `src/components/Dashboard.jsx` (extract to `src/lib/streak.js`)
  - `mapSessionToLog` / `mapLinkToResource` (extract pure mappers if needed)
- **CI step:**
  ```yaml
  - run: npm test -- --run
  ```

### [P3-7] Add an `npm run typecheck` via JSDoc + `tsc --noEmit` — [MEDIUM]
- Even without TS, you can typecheck JSDoc:
  ```bash
  npm i -D typescript
  ```
  Add `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "jsx": "react-jsx",
      "allowJs": true,
      "checkJs": true,
      "noEmit": true,
      "strict": false,
      "skipLibCheck": true,
      "esModuleInterop": true
    },
    "include": ["src"]
  }
  ```
  Add JSDoc shapes for `Log`, `Resource`, `Config` in `src/lib/types.js`. Add `"typecheck": "tsc --noEmit"`. CI step optional, lint catches most issues.

### [P3-8] Tighten workflow permissions — [MEDIUM]
- See P3-4. Job-level `permissions: { contents: read }` for build; `pages: write, id-token: write` for the deploy job only.

### [P3-9] Drop `Outfit` font from preconnect — [LOW]
- **File:** `index.html:10`.
- See P2-15.

### [P3-10] Remove dead imports in `App.jsx` — [LOW]
- **File:** `src/App.jsx:11, 28`.
- Run `npm run lint -- --fix` after P3-5; ESLint will flag/remove.

### [P3-11] Document local dev in README — [LOW]
- Add a section: "Local development with sync disabled" — explains that without a token, all writes hit localStorage only and the UI shows Demo mode.

---

## P4 — Refactors and forward-looking improvements

### [P4-1] Move ParentFit token & writes to a backend proxy — [HIGH]
- **Problem:** even after P0-2, every user must own a PAT to sync. This is friction and a security model bad for non-technical "parent" users.
- **Solution sketch:**
  - Cloudflare Worker (or any serverless function) with one secret: a fine-grained PAT scoped to the data repo.
  - Endpoints: `GET /api/data/<user>/<file>`, `PUT /api/data/<user>/<file>` (authenticated against a simple shared key per user, e.g., Magic Link login → JWT in localStorage).
  - Frontend calls the proxy; PAT never leaves the worker.
- **Verification:** the deployed bundle has no `gh_token`, the network panel shows only `parentfit.example/api/...` calls.
- **Effort:** ~1 weekend.

### [P4-2] Convert source to TypeScript incrementally — [MEDIUM]
- **Path:** rename files one tab at a time (`Dashboard.jsx` → `Dashboard.tsx`), add explicit types for `Log`, `Resource`, `User`, `Config`. Keep `allowJs: true` until the migration is done.

### [P4-3] Replace inline-style blocks with utility classes — [MEDIUM]
- **Files:** every component.
- **Approach:** identify the 10 most repeated inline-style patterns (e.g., the form-label style block appears in `ResourceHub`, `SettingsModal`, `ExerciseLogger`). Promote to `.form-label`, `.flex-row-between`, etc., in `index.css`.
- **Heuristic:** any inline-style block ≥ 4 lines and repeated ≥ 3 times is a class.

### [P4-4] Service Worker + offline cache — [LOW]
- **File:** add `vite-plugin-pwa` or hand-roll a SW.
- **Strategy:** cache-first for the bundle + assets; stale-while-revalidate for `/repos/<owner>/<repo>/contents/...` calls.
- **Risk:** SW + data sync = correctness traps. Defer until P4-1 is done (the proxy can issue cache headers).

### [P4-5] One canonical version string — [LOW]
- **Files:** `README.md`, `src/App.jsx` footer, all release commit messages going forward.
- **Source of truth:** `package.json#version`. Read in app via `import.meta.env.PACKAGE_VERSION` (set via `define` in `vite.config.js`).

### [P4-6] Replace "AI Curated" copy with something true — [LOW]
- See AUDIT 9.2.

### [P4-7] Multi-user seed driven from `USERS` constant — [LOW]
- **File:** `src/services/githubBackend.js:117-134`.
- Replace the `if/else` with a map keyed by `USERS[].id`. Newly added users inherit empty seeds without code changes.

### [P4-8] Add an explicit "Edit session" flow — [LOW]
- Currently sessions are immutable post-creation. The 3.2 counterweight issue and any typo in a workout becomes permanent. Low priority but commonly requested.

---

## P6 — Post-Firebase-Migration Cleanup

These tickets exist because the migration intentionally left the legacy GitHub-backend files in place to keep `main` shippable mid-transition. Execute these in order; each is small.

### [P6-1] Delete legacy GitHub-backend code — [HIGH]
- **Files:** `src/services/githubBackend.js`, `src/data/exercise_log.json`, `src/data/resource_links.json`.
- **Why now:** these are unused at runtime (verified by `grep` — only `githubBackend.js` references itself); they're dead weight in the repo and dead code in any future tree-shake graph if accidentally imported.
- **Steps:**
  ```powershell
  git rm src/services/githubBackend.js src/data/exercise_log.json src/data/resource_links.json
  ```
- **Verification:** `npm run build` succeeds. `Grep` for `githubBackend|exerciseLogJson|resourceLinksJson` returns no matches outside of `scripts/parseData.mjs` (which is a one-shot ETL script, not runtime).
- **Depends on:** P6-5 if you need to preserve the seed data in Firestore — run the migration first, then delete.
- **Risk:** none if P6-5 already ran. Else the seed JSON is lost from the live experience.

### [P6-2] Remove compat aliases from `AppContext` — [MEDIUM]
- **File:** `src/context/AppContext.jsx`, the bottom of the `value` object passed to the provider.
- **Current code:**
  ```js
  users: profiles,
  activeUserId: activeProfileId,
  switchUser: switchProfile,
  ghConfig: { token: 'firebase', owner: '', repo: '', branch: 'main' },
  ```
- **Why they exist:** `Navbar.jsx` and (transitively) some `Dashboard.jsx` code still destructure `users`, `activeUserId`, `switchUser`, `ghConfig`. Removing the aliases without updating the consumers would white-screen the app.
- **Depends on:** P6-3.
- **Acceptance:** the four lines above are gone, app still builds.

### [P6-3] Update `Navbar.jsx` to native names — [MEDIUM]
- **File:** `src/components/Navbar.jsx`.
- **Current** destructure: `const { syncing, forceManualSync, ghConfig, setIsSettingsOpen, activeUserId, switchUser, users } = useApp();`
- **Proposed**: `const { syncing, forceManualSync, setIsSettingsOpen, activeProfileId, switchProfile, profiles } = useApp();`
  - Rename internal var `activeUser` → `activeProfile`.
  - Replace `users.find(u => u.id === activeUserId)` with `profiles.find(p => p.id === activeProfileId)`.
  - Replace `users.map(...)` in the dropdown with `profiles.map(...)`.
  - Remove the `isDemo` computation (`!ghConfig.token || ghConfig.token.length < 10`). Hard-code the pill to "Live" since the user is, by definition, authenticated when this renders. Optional: detect `navigator.onLine === false` and show an "Offline" pill instead.
- **Verification:** open the app signed in, dropdown lists your real profile(s), navbar pill says "Live".

### [P6-4] Delete the old `VITE_GH_TOKEN` repository secret — [LOW]
- **Where:** GitHub → repo Settings → Secrets and variables → Actions → **Secrets** tab.
- **Action:** delete `VITE_GH_TOKEN`. Nothing references it anymore.
- **Verification:** secrets list does not contain `VITE_GH_TOKEN`. Next workflow run still succeeds.

### [P6-5] Run the data migration script (Appendix C.10) — [HIGH, optional]
- **Skip entirely if you don't care about historical Apparao data.** The app works fine starting from zero.
- **Steps:** see Appendix C.10. Generate a service account JSON, set `GOOGLE_APPLICATION_CREDENTIALS` + `ACCOUNT_EMAIL`, run `node scripts/migrateToFirebase.mjs`.
- **Pre-req:** `scripts/migrateToFirebase.mjs` does not exist yet — you must first paste the script from Appendix C.10 into that path.
- **Acceptance:** Firestore console shows session and resource documents under `users/<your-uid>/profiles/apparao/sessions` matching the legacy counts.
- **Cleanup after success:** delete the service account JSON from your local machine, or move it to a password manager.

### [P6-6] Smoke-test the live deploy — [HIGH]
- **Where:** <https://ttaruntej.github.io/parentfit/> (or your deployed URL).
- **Checklist:**
  - [ ] Loads to SignIn screen on first visit.
  - [ ] Magic link email arrives within 1 minute.
  - [ ] Sign in succeeds; ProfileSetup renders.
  - [ ] Creating a profile lands on the empty dashboard.
  - [ ] Logging a workout persists across hard refresh.
  - [ ] Open a second device → same email → both see the same data within seconds.
  - [ ] Open the deployed URL in incognito (no auth) and try the anonymous-read test from Appendix C.4. Expect `permission-denied`.
- **If any step fails:** open browser DevTools console; paste the error and which step.

### [P6-7] Cleanup tracked-but-stale `dist/index.html` — [LOW]
- See [P3-1]. Run `git rm --cached dist/index.html` and commit. `.gitignore` already covers `dist`.

### [P6-8] Optional: shrink Firebase bundle — [LOW]
- **Current:** 772 KB raw / 197 KB gzip — Firebase SDK is the largest contributor.
- **Approach:** dynamic-import `firebase/firestore` inside `dataAdapter.js` so it lazy-loads after first auth. Likely shaves 100–200 KB off initial bundle.
- **Skip unless** mobile users complain about cold-start latency.

---

## P5 — Verification & rollout checklist

After all P0/P1 fixes merge:

- [ ] `git log --all -p -S 'ghp_'` returns no real-looking tokens (only the rotated one, plus historical mention is acceptable post-rotation since the token is revoked).
- [ ] `npm ci && npm run build` succeeds; `grep -RIE '[A-Za-z0-9_-]{30,}' dist/assets/*.js | grep -vE '(declineInvitation|Authenticated|GraphqlResponse|getAllPackage|listBlockedBy)'` returns no obvious tokens.
- [ ] Deploy to a preview environment; verify:
  - Demo mode works without a token.
  - Settings → paste a (test) token → Live pill turns green; data round-trips to GitHub.
  - Add a session offline → see rollback toast → optimistic state reverts.
  - Tab through every page → focus ring visible everywhere.
  - VoiceOver / NVDA: success and error toasts announce.
  - Knowledge Hub: all four images render.
  - Recent Sessions: the most recent log is at the top.
  - Magic Link: visit `/?owner=evil&repo=x` → confirmation modal blocks the change.
- [ ] Lighthouse mobile run: Accessibility ≥ 95, Best Practices ≥ 90.
- [ ] ESLint: zero errors, zero warnings.
- [ ] Bundle size: P2-6 should shave > 60% off the JS bundle.

---

## Appendix A — File-by-file fix index (cross-reference)

| File | Tickets |
|---|---|
| `.github/workflows/deploy.yml` | P0-2, P3-2, P3-3, P3-4, P3-5 (CI step), P3-6 (CI step), P3-8 |
| `vite.config.js` | P3-3, P3-6 (test config) |
| `package.json` | P0-2 (indirectly), P2-6, P3-2 (engines), P3-5, P3-6, P3-7 |
| `index.html` | P2-13, P2-15, P3-9 |
| `src/main.jsx` | P2-1 |
| `src/App.jsx` | P0-3 (indirectly), P0-4 (via Dashboard), P1-1, P2-2, P2-12, P3-10 |
| `src/context/AppContext.jsx` | P0-3, P0-5, P0-6, P4-1 (in part) |
| `src/services/githubBackend.js` | P0-2, P1-5, P1-8, P1-9, P1-10, P2-6, P2-7, P2-10, P4-7 |
| `src/components/Navbar.jsx` | P2-3, P2-5 |
| `src/components/BottomNav.jsx` | — (clean) |
| `src/components/Dashboard.jsx` | P0-4, P2-9, P2-11 |
| `src/components/ExerciseLogger.jsx` | P1-2, P1-3, P1-5, P1-6, P2-16 |
| `src/components/HistoryView.jsx` | P1-7, P2-4, P2-8, P2-11 |
| `src/components/ResourceHub.jsx` | P1-4 |
| `src/components/MediaPlayerModal.jsx` | P1-4 |
| `src/components/SettingsModal.jsx` | — (clean) |
| `src/index.css` | P2-3, P4-3 |
| `dist/` | P3-1 (untrack) |

---

## Appendix B — One-shot agent prompt template

When asking an AI agent to execute a single ticket, use this template:

```
You are working on the ParentFit repo. Apply ticket [<ID>] from FIX_PLAN.md.

Constraints:
- Make the minimal change described in the ticket. Do not refactor unrelated code.
- Preserve existing tests. If the ticket changes behaviour, add a Vitest unit test in src/test/.
- Run `npm run lint` and `npm test -- --run` before declaring done.
- If a step in the ticket requires a manual action (e.g., rotate a secret), STOP and ask the user.

Output:
1. A diff of the changes.
2. The exact verification commands you ran and their output.
3. Anything in the ticket you could not complete and why.
```

Use one ticket per agent invocation. Do not bundle tickets unless their `Depends on:` lines explicitly chain them.

---

## Appendix C — Firebase Migration (Architectural Alternative)

> This appendix specifies a full replacement of the GitHub-as-database architecture with **Firebase** (Firestore + Firebase Auth). It supersedes [P4-1] and makes the following tickets redundant (delete them from the plan once this migration ships): **P0-2**, **P0-3** (Magic Link becomes a real email-link sign-in), **P0-5** (auto-sync race), **P0-6** (silent sync errors disappear with realtime), **P1-8**, **P1-9**, **P2-6** (no more Octokit), **P2-7** (no more base64 hack), **P2-10** (no more seed re-parse on cold start), **P4-1**, **P4-7**.
>
> Effort estimate: **one weekend** end-to-end including data migration. Skill prerequisite: comfort with NoSQL document modelling and basic React context.
>
> This appendix is structured for both AI agents and engineers. Each subsection has explicit deliverables, file paths, acceptance criteria, and verification commands.

---

### C.1 Why this exists

The current architecture is a clever hack: GitHub's Contents API as a JSON backend, PAT in browser, optimistic UI, JSON over Git. It works for one developer with a token. It does not work for two parents who do not want to manage tokens. The Firebase migration:

- moves the secret server-side (the only Firebase config in the bundle is the **public web SDK config**, which is designed to be public and is gated by Firestore Security Rules)
- replaces "paste a PAT" with "email-link sign-in"
- replaces "fetch the entire 90 KB JSON file on every refresh" with "read only the docs you need"
- replaces 5-minute polling with `onSnapshot` realtime subscriptions
- eliminates the SHA-conflict class of bugs entirely (each session is an independent document)
- gives you **best-in-class offline persistence for free** (Firestore caches reads/writes in IndexedDB and reconciles when the network returns)
- unlocks future features (image attachments via Cloud Storage, push notifications via FCM) without architectural changes

**Firebase-specific advantages over Supabase:**
- The Spark (free) plan **does not pause idle projects** — Supabase pauses after 1 week of inactivity.
- Firestore offline mode is more mature than Supabase's.
- Hosting + Auth + DB all under one console; no SMTP setup needed (Firebase uses Google's mail infrastructure for email-link sends).

**Trade-offs:**
- NoSQL: no DB-level schema enforcement. The data adapter is your only schema.
- Free-tier quotas are read/write-based, not storage-based: **50 k reads / 20 k writes / 20 k deletes per day**. Family scale is nowhere near this; an app with >100 active users would need Blaze (pay-as-you-go).
- Vendor lock-in is slightly higher than Supabase (Postgres is portable; Firestore query syntax is bespoke).

---

### C.2 Project setup (one-time, manual)

**Owner action required.** No code changes yet.

1. Go to <https://console.firebase.google.com> → **Add project** → name `parentfit-prod`. Disable Google Analytics (not needed; reduces SDK size).
2. Once the project exists:
   - Build → **Firestore Database** → **Create database** → **Start in production mode** (locked rules; we'll deploy our own) → region: closest to users (e.g. `asia-south1` for India).
   - Build → **Authentication** → **Get started** → enable **Email/Password** → in the same panel, tick **Email link (passwordless sign-in)**.
   - Authentication → **Settings** → **Authorized domains** → add `localhost` and your Pages domain (e.g. `<owner>.github.io`).
3. Project settings (gear icon) → **General** → scroll to **Your apps** → **Add app** → **Web** (`</>`) → register with a nickname (`parentfit-web`) → **do not** enable Firebase Hosting (you're using GitHub Pages) → copy the six config keys.
4. **Service account for the one-time migration script (C.10):**
   - Project settings → **Service accounts** → **Generate new private key** → downloads a JSON file (e.g. `parentfit-prod-firebase-adminsdk-xxxxx.json`).
   - **Save it outside the repo.** Treat like a master password. Never commit. Never paste into a public chat.

**Local environment.** Create `.env.local` (already covered by `*.local` in `.gitignore`):

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=parentfit-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parentfit-prod
VITE_FIREBASE_STORAGE_BUCKET=parentfit-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123def456
```

**Note on safety:** these six values are **public by design**. Google explicitly documents this. Security is enforced by Firestore Rules (C.4), not by hiding the config.

**Deploy workflow.** Add the same six values as **plain repository variables** (Settings → Secrets and variables → Actions → **Variables** tab, not Secrets). Update `.github/workflows/deploy.yml`:

```yaml
- name: Build
  env:
    VITE_FIREBASE_API_KEY:             ${{ vars.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN:         ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_PROJECT_ID:          ${{ vars.VITE_FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_STORAGE_BUCKET:      ${{ vars.VITE_FIREBASE_STORAGE_BUCKET }}
    VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ vars.VITE_FIREBASE_MESSAGING_SENDER_ID }}
    VITE_FIREBASE_APP_ID:              ${{ vars.VITE_FIREBASE_APP_ID }}
  run: npm run build
```

**Firebase CLI (for deploying rules + indexes):**

```bash
npm i -g firebase-tools
firebase login
cd /path/to/exercise-website
firebase init firestore
# When prompted:
#   - Use an existing project → parentfit-prod
#   - firestore.rules         → accept default name
#   - firestore.indexes.json  → accept default name
```

This creates `firestore.rules` and `firestore.indexes.json` at the repo root. Both are version-controlled; commit them.

**Verification:** `grep VITE_FIREBASE_ dist/assets/*.js` after `npm run build` shows all six values inlined. **That is intentional and safe.**

---

### C.3 Data model

Firestore is schemaless; the data adapter (C.7.3) is the only schema enforcer. The model uses **subcollections under the auth user**, which makes security rules a one-liner and prevents accidental cross-account access by construction.

```
users/{uid}                                 ← optional account-level doc (prefs etc.)
  profiles/{profileId}                      ← household member
    fields: slug, name, initials, color, createdAt

    sessions/{sessionId}                    ← logged workout
      fields:
        date              (string, ISO 8601)
        workoutType       ('push'|'pull'|'legs'|'hiit'|'mixed')
        category          (string)
        title             (string)
        durationMinutes   (number)
        intensity         ('Low'|'Moderate'|'High')
        notes             (string)
        exercises         (array<map>)      ← nested as-is
        dayOfWeek         (string)
        rawHeader         (string)
        createdAt         (serverTimestamp)

    resources/{resourceId}                  ← saved fitness link
      fields:
        title, url
        type              ('video'|'audio'|'article')
        tags              (array<string>)
        addedAt           (string, ISO 8601)
        createdAt         (serverTimestamp)
```

**Why subcollections (not flat top-level collections with a `profileId` field):** security rules become trivial (one `match` clause for everything under `users/{uid}`), and Firestore listeners on a subcollection only see writes within that subcollection — no risk of cross-tenant leakage from a bad rule.

**Trade-off accepted:** Firestore `collectionGroup` queries are required if you ever want to query across all profiles (e.g. "leaderboard across the family"). They work fine with this model; you just have to define a collection-group index when needed. Not needed today.

**Document IDs:** let Firestore generate them via `addDoc()`. The current app generates IDs like `session_${Date.now()}`; we ignore those and use Firestore's IDs (the field name `id` on objects in React state will be set from `doc.id`).

**Why ISO strings for `date` / `addedAt` instead of Firestore Timestamps:** the existing UI does `new Date(item.date)` throughout. Storing as ISO strings keeps the React code identical. The downside is no native time-range queries on the field — but the app does all date filtering client-side anyway. If that changes, add a parallel `dateTs` field of type Timestamp and migrate.

---

### C.4 Security Rules (firestore.rules)

Rules are the single line of defence. Without them, the public Firebase config in the bundle would expose every document to every visitor. With them, every read and write is automatically gated to the authenticated user's subtree.

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Everything under users/{uid} is owned by that auth user.
    // The recursive wildcard {document=**} matches profiles, sessions, resources,
    // and any future subcollection — no rule updates needed when you add features.
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Belt-and-braces: deny anything else at the root.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Deploy the rules:**

```bash
firebase deploy --only firestore:rules
```

You'll see `✔ firestore: released rules firestore.rules to cloud.firestore`.

**Manual verification before going live (this is the single most important check):**

1. In a private/incognito window, open the deployed app. Do **not** sign in.
2. Open DevTools → Console:
   ```js
   const m = await import('firebase/firestore');
   const { getFirestore, collection, getDocs } = m;
   await getDocs(collection(getFirestore(), 'users'));
   ```
   You should get a `permission-denied` error. If you get any documents back, **stop and review the rules.**
3. Sign in. Try to read another user's UID path manually:
   ```js
   await getDocs(collection(getFirestore(), 'users', 'SOME_OTHER_UID_HERE', 'profiles'));
   ```
   You should get `permission-denied`. If you get data, **stop and review.**

**Optional: validate fields on write.** A stricter ruleset that prevents writing unknown fields:

```
match /users/{uid}/profiles/{profileId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create, update: if request.auth != null
    && request.auth.uid == uid
    && request.resource.data.keys().hasOnly(['slug', 'name', 'initials', 'color', 'createdAt'])
    && request.resource.data.slug is string
    && request.resource.data.name is string;
  allow delete: if request.auth != null && request.auth.uid == uid;
}
```

For a personal app, the simple recursive rule is fine. Add field validation when (and only when) you expose write paths from untrusted clients.

---

### C.5 Auth flow

**Sign-up / sign-in (single flow):** Email Link (passwordless).

1. User opens the app for the first time (no session).
2. `<App />` renders `<SignIn />`.
3. User types email and submits. App calls `sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true })` and stores `email` in `localStorage` under `parentfit_emailForSignIn` (Firebase requires the same email when the link is consumed).
4. User clicks the link in their inbox → returns to the app URL with hash params.
5. On load, `AuthContext` calls `isSignInWithEmailLink(auth, location.href)`. If true: read the email from localStorage (or prompt if missing — happens when the link is opened on a different device) → `signInWithEmailLink(auth, email, location.href)` → strip the auth params from the URL.
6. `onAuthStateChanged` fires with the user object → app renders.
7. First-time accounts have zero profile docs. The app shows `<ProfileSetup />`, which writes one doc to `users/{uid}/profiles`.

**Sign-out:** `signOut(auth)`.

**Session persistence:** `firebase/auth` persists the ID token in `IndexedDB` (or `localStorage` if IDB unavailable) and auto-refreshes it before expiry. Survives refresh and browser restart by default.

**Multi-profile switching:** unchanged from today — the Navbar dropdown lists all profile docs for `auth.uid()`. The selected `profileId` is stored in `localStorage` so it survives reloads.

---

### C.6 New file structure

```
src/
├── lib/
│   ├── firebase.js              ← NEW: single app + auth + db instance
│   ├── url.js                   ← NEW: from P1-4
│   ├── categories.js            ← NEW: from P2-11
│   └── workoutTypes.js          ← NEW: shared WORKOUT_CATEGORY (from P1-5)
├── services/
│   ├── dataAdapter.js           ← NEW: abstracts Firestore reads/writes/listeners
│   └── githubBackend.js         ← DELETE after migration verified
├── context/
│   ├── AuthContext.jsx          ← NEW: session state, sign-in/out
│   └── AppContext.jsx           ← REWRITE: uses dataAdapter; subscribes via onSnapshot
├── components/
│   ├── SignIn.jsx               ← NEW: email-link form (send + consume)
│   ├── AccountSettings.jsx      ← NEW: replaces SettingsModal token form
│   ├── ProfileSetup.jsx         ← NEW: shown when account has zero profiles
│   ├── SettingsModal.jsx        ← DELETE
│   └── ErrorBoundary.jsx        ← NEW: from P2-1
firestore.rules                  ← NEW: deployed via firebase CLI
firestore.indexes.json           ← NEW: composite indexes (C.11)
```

---

### C.7 Implementation: file-by-file

#### C.7.1 `src/lib/firebase.js` (new)

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const config = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

for (const [k, v] of Object.entries(config)) {
  if (!v) throw new Error(`Missing Firebase env: VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
}

export const app = initializeApp(config);
export const auth = getAuth(app);

// Offline-first cache. Multi-tab manager lets two tabs share the same cache safely.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

Install:

```bash
npm i firebase
npm uninstall @octokit/rest
```

#### C.7.2 `src/context/AuthContext.jsx` (new)

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(null);
const STORED_EMAIL_KEY = 'parentfit_emailForSignIn';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // ── 1. Consume the email-link callback if present ────────────────────────
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let email = window.localStorage.getItem(STORED_EMAIL_KEY);
    if (!email) {
      // Happens when the link is opened on a different device/browser.
      email = window.prompt('Confirm the email you used to sign in:');
    }
    if (!email) return;
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(STORED_EMAIL_KEY);
        // Strip the magic params from the URL.
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((err) => {
        console.error('Email-link sign-in failed:', err);
      });
  }, []);

  // ── 2. Subscribe to auth state ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingSession(false);
    });
    return unsub;
  }, []);

  // ── 3. Public API ───────────────────────────────────────────────────────
  const sendSignInLink = async (email) => {
    const actionCodeSettings = {
      url: window.location.origin + import.meta.env.BASE_URL,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem(STORED_EMAIL_KEY, email);
  };

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, loadingSession, sendSignInLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
};
```

#### C.7.3 `src/services/dataAdapter.js` (new)

A thin abstraction so the UI does not import `firebase/firestore` directly. Mirrors today's `githubBackend.js` surface; existing components do not change their data shape.

```js
import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// ─── Path helpers ────────────────────────────────────────────────────────────
const uid = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in');
  return u;
};

const profilesCol  = ()           => collection(db, 'users', uid(), 'profiles');
const sessionsCol  = (profileId)  => collection(db, 'users', uid(), 'profiles', profileId, 'sessions');
const resourcesCol = (profileId)  => collection(db, 'users', uid(), 'profiles', profileId, 'resources');

const sessionDoc  = (profileId, id) => doc(db, 'users', uid(), 'profiles', profileId, 'sessions',  id);
const resourceDoc = (profileId, id) => doc(db, 'users', uid(), 'profiles', profileId, 'resources', id);

// ─── Profiles ────────────────────────────────────────────────────────────────
export async function listProfiles() {
  const snap = await getDocs(query(profilesCol(), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProfile({ slug, name, initials, color }) {
  const ref = await addDoc(profilesCol(), {
    slug, name, initials, color,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, slug, name, initials, color };
}

// ─── Sessions ────────────────────────────────────────────────────────────────
export async function listSessions(profileId) {
  const snap = await getDocs(query(sessionsCol(profileId), orderBy('date', 'desc')));
  return snap.docs.map((d) => docToSession(d));
}

export async function addSession(profileId, session) {
  const payload = sessionToDoc(session);
  const ref = await addDoc(sessionsCol(profileId), { ...payload, createdAt: serverTimestamp() });
  return { id: ref.id, ...session };
}

export async function deleteSession(profileId, id) {
  await deleteDoc(sessionDoc(profileId, id));
}

// ─── Resources ──────────────────────────────────────────────────────────────
export async function listResources(profileId) {
  const snap = await getDocs(query(resourcesCol(profileId), orderBy('addedAt', 'desc')));
  return snap.docs.map((d) => docToResource(d));
}

export async function addResource(profileId, resource) {
  const payload = {
    title: resource.title,
    url: resource.url,
    type: resource.type || 'video',
    tags: resource.tags || [],
    addedAt: resource.addedAt || new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(resourcesCol(profileId), payload);
  return { id: ref.id, ...resource, addedAt: payload.addedAt };
}

export async function deleteResource(profileId, id) {
  await deleteDoc(resourceDoc(profileId, id));
}

// ─── Realtime subscriptions ─────────────────────────────────────────────────
// onSnapshot fires immediately with the cached value and again on every change.
// Returns an unsubscribe function.
export function subscribeSessions(profileId, onChange) {
  return onSnapshot(
    query(sessionsCol(profileId), orderBy('date', 'desc')),
    (snap) => onChange(snap.docs.map(docToSession)),
    (err) => console.error('sessions listener error:', err),
  );
}

export function subscribeResources(profileId, onChange) {
  return onSnapshot(
    query(resourcesCol(profileId), orderBy('addedAt', 'desc')),
    (snap) => onChange(snap.docs.map(docToResource)),
    (err) => console.error('resources listener error:', err),
  );
}

// ─── Shape mappers ──────────────────────────────────────────────────────────
function docToSession(d) {
  const data = d.data();
  return {
    id: d.id,
    date: data.date,
    workoutType: data.workoutType,
    category: data.category,
    title: data.title,
    durationMinutes: data.durationMinutes,
    intensity: data.intensity,
    notes: data.notes || '',
    exercises: data.exercises || [],
    dayOfWeek: data.dayOfWeek,
    rawHeader: data.rawHeader,
  };
}

function sessionToDoc(s) {
  // Whitelist fields. Anything else (like client-generated ids) is dropped.
  return {
    date: s.date,
    workoutType: s.workoutType,
    category: s.category,
    title: s.title,
    durationMinutes: s.durationMinutes,
    intensity: s.intensity,
    notes: s.notes ?? '',
    exercises: s.exercises ?? [],
    dayOfWeek: s.dayOfWeek,
    rawHeader: s.rawHeader,
  };
}

function docToResource(d) {
  const data = d.data();
  return {
    id: d.id,
    title: data.title,
    url: data.url,
    type: data.type,
    tags: data.tags || [],
    addedAt: data.addedAt,
  };
}
```

**Note on the listener pattern:** `onSnapshot` fires synchronously with the local cache (sub-50 ms feels) and again when the server confirms. This means:
- You do **not** need optimistic UI updates for inserts/deletes — the cache write triggers the listener immediately.
- A `hasPendingWrites` flag on the snapshot tells you whether the data is still in-flight; you can use this to grey out items if you want.

The rewritten `AppContext` (C.7.4) drops manual optimistic state in favour of listener-driven state.

#### C.7.4 `src/context/AppContext.jsx` (rewrite)

The listener (`onSnapshot`) is now the source of truth for sessions and resources. Mutators write to Firestore and let the listener push the result back into React state.

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listProfiles, createProfile,
  addSession, deleteSession,
  addResource, deleteResource,
  subscribeSessions, subscribeResources,
} from '../services/dataAdapter';

const AppContext = createContext(null);
const ACTIVE_PROFILE_KEY = 'parentfit_active_profile';

export const AppProvider = ({ children }) => {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(
    () => localStorage.getItem(ACTIVE_PROFILE_KEY) || null
  );

  const [exerciseData, setExerciseData] = useState({ logs: [] });
  const [resourceData, setResourceData] = useState({ resources: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [mediaPlayer, setMediaPlayer] = useState({ isOpen: false, url: '', title: '', type: 'video' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const triggerSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };
  const triggerError   = (msg) => { setError(msg);      setTimeout(() => setError(null), 6000); };

  // ── Load profiles when the auth user changes ─────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setExerciseData({ logs: [] });
      setResourceData({ resources: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ps = await listProfiles();
        if (cancelled) return;
        setProfiles(ps);
        if (!activeProfileId && ps[0]) {
          setActiveProfileId(ps[0].id);
          localStorage.setItem(ACTIVE_PROFILE_KEY, ps[0].id);
        }
        if (ps.length === 0) setLoading(false); // ProfileSetup will render
      } catch (e) {
        triggerError('Could not load profiles.');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Realtime: listener IS the source of truth ────────────────────────────
  useEffect(() => {
    if (!user || !activeProfileId) return;
    setLoading(true);

    let sessionsReady = false;
    let resourcesReady = false;
    const finish = () => {
      if (sessionsReady && resourcesReady) setLoading(false);
    };

    const unsubA = subscribeSessions(activeProfileId, (logs) => {
      setExerciseData({ logs });
      sessionsReady = true; finish();
    });
    const unsubB = subscribeResources(activeProfileId, (resources) => {
      setResourceData({ resources });
      resourcesReady = true; finish();
    });

    return () => { unsubA(); unsubB(); };
  }, [user, activeProfileId]);

  // ── Mutators (no manual optimistic state; listener reconciles) ───────────
  const addExerciseLog = async (newLog) => {
    if (!activeProfileId) return;
    setSyncing(true);
    try {
      await addSession(activeProfileId, newLog);
      triggerSuccess('Session synced ✓');
    } catch (e) {
      triggerError('Failed to save session.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteExerciseLog = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    setSyncing(true);
    try {
      await deleteSession(activeProfileId, id);
      triggerSuccess('Session removed.');
    } catch (e) {
      triggerError('Failed to delete session.');
    } finally {
      setSyncing(false);
    }
  };

  const addResourceLink = async (newResource) => {
    if (!activeProfileId) return;
    setSyncing(true);
    try {
      await addResource(activeProfileId, newResource);
      triggerSuccess('Resource saved ✓');
    } catch (e) {
      triggerError('Failed to save resource.');
    } finally {
      setSyncing(false);
    }
  };

  const deleteResourceLink = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    setSyncing(true);
    try {
      await deleteResource(activeProfileId, id);
      triggerSuccess('Resource removed.');
    } catch (e) {
      triggerError('Failed to delete resource.');
    } finally {
      setSyncing(false);
    }
  };

  const switchProfile = (profileId) => {
    setActiveProfileId(profileId);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  };

  const addProfile = async (input) => {
    const created = await createProfile(input);
    setProfiles((ps) => [...ps, created]);
    if (!activeProfileId) switchProfile(created.id);
    return created;
  };

  // Manual "Refresh" is now essentially a no-op since the listener is live,
  // but we keep the button for UX. It just shows a success toast.
  const forceManualSync = async () => {
    triggerSuccess('Live ✓');
  };

  const openPlayer  = (url, title, type = 'video') => setMediaPlayer({ isOpen: true, url, title, type });
  const closePlayer = () => setMediaPlayer({ isOpen: false, url: '', title: '', type: 'video' });

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  return (
    <AppContext.Provider value={{
      exerciseData, resourceData,
      loading, syncing, error, successMsg,
      mediaPlayer, isSettingsOpen, setIsSettingsOpen,
      profiles, activeProfile, activeProfileId,
      switchProfile, addProfile,
      addExerciseLog, deleteExerciseLog,
      addResourceLink, deleteResourceLink,
      forceManualSync,
      openPlayer, closePlayer,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside <AppProvider>');
  return ctx;
};
```

#### C.7.5 `src/components/SignIn.jsx` (new)

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Mail } from 'lucide-react';

export default function SignIn() {
  const { sendSignInLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // 'sent' | 'error' | null
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await sendSignInLink(email.trim());
      setStatus('sent');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '2rem', textAlign: 'center' }}>
        <div className="brand-icon" style={{ width: 56, height: 56, margin: '0 auto 1rem' }}>
          <Dumbbell size={28} strokeWidth={2.5} />
        </div>
        <h1 className="brand-name" style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>ParentFit</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Sign in with a link sent to your email — no password.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email" required autoFocus
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn btn-fire btn-full">
            <Mail size={16} /> {busy ? 'Sending...' : 'Send sign-in link'}
          </button>
        </form>
        {status === 'sent' && (
          <p style={{ color: 'var(--teal)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Check <strong>{email}</strong>. Open the link on this device to finish signing in.
          </p>
        )}
        {status === 'error' && (
          <p style={{ color: '#F87171', fontSize: '0.85rem', marginTop: '1rem' }}>
            Could not send the link. Check the address and try again.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Important note for users:** the email link must be opened in the **same browser** that submitted the email (Firebase stores the email in `localStorage` between send and click). If it's opened elsewhere, `AuthContext` falls back to `window.prompt()` for the email — clunky but functional.

#### C.7.6 `src/components/ProfileSetup.jsx` (new)

Shown when the signed-in account has zero profile rows. One-shot form: name, initials, color.

```jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ProfileSetup() {
  const { addProfile } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
      const initials = name.split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');
      await addProfile({ slug, name: name.trim(), initials, color: '#FF6B35' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.4rem' }}>Set up your profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Each household member gets their own profile. You can add more later.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text" required autoFocus
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn btn-fire btn-full">
            {busy ? 'Creating...' : 'Create profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### C.7.7 `src/components/AccountSettings.jsx` (replaces `SettingsModal.jsx`)

Sign-out and account summary. No tokens, no owner/repo/branch.

```jsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, X } from 'lucide-react';

export default function AccountSettings() {
  const { isSettingsOpen, setIsSettingsOpen, profiles } = useApp();
  const { user, signOut } = useAuth();
  if (!isSettingsOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ width: '100%', maxWidth: 430, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-head)' }}>Account</h3>
          <button onClick={() => setIsSettingsOpen(false)} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Signed in as <strong>{user?.email}</strong>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          {profiles.length} profile{profiles.length !== 1 ? 's' : ''} in this household.
        </div>
        <button onClick={signOut} className="btn btn-ghost btn-full">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
```

#### C.7.8 `src/App.jsx` (modify root gating)

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import SignIn from './components/SignIn';
import ProfileSetup from './components/ProfileSetup';
import { Dumbbell } from 'lucide-react';
// ...existing imports for Navbar, BottomNav, etc...

const FullScreenSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ color: 'var(--fire)', animation: 'spin 2s linear infinite' }}>
      <Dumbbell size={48} />
    </div>
  </div>
);

export default function App() {
  const { user, loadingSession } = useAuth();
  const { loading, profiles, activeProfileId } = useApp();
  const [tab, setTab] = useState('home');

  useEffect(() => {
    document.title = `${PAGE_TITLE[tab]} · ParentFit`;
  }, [tab]);

  if (loadingSession)                              return <FullScreenSpinner />;
  if (!user)                                       return <SignIn />;
  if (!loading && profiles.length === 0)           return <ProfileSetup />;
  if (!activeProfileId)                            return <FullScreenSpinner />;

  return (
    <>
      {/* existing shell, navbar, page-content, bottom nav, toasts, modals */}
    </>
  );
}
```

#### C.7.9 `src/main.jsx` (wrap providers)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext.jsx';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

#### C.7.10 `src/components/Navbar.jsx` (minor edits)

- Replace `activeUser` / `users` references with `activeProfile` / `profiles` from `useApp()`.
- Replace the Demo/Live pill with a status pill that reads "Live" when `auth.currentUser` is non-null (always, since `<App />` only renders post-auth). Optional: detect offline via `navigator.onLine` and `window.addEventListener('online'|'offline', ...)` for an "Offline" pill — Firestore continues to serve cached data and queues writes in this state.
- Delete the "Activate Sync" hero button in `Dashboard.jsx` (it points to the removed token Settings modal).

---

### C.8 Realtime: what changes from polling

Delete the 5-minute interval and the `visibilitychange` handler in `AppContext`. They are replaced by the `subscribeSessions` / `subscribeResources` listeners — Firestore pushes changes to all connected clients in **under 1 second** typically.

**Quota note:** each listener counts ongoing reads against your daily quota: 1 read per existing document on initial connect, plus 1 read per changed doc on each update. With 2 family members each running 2 tabs and ~100 sessions in history, expect ~400 reads per cold start of the app per user. Far below the 50 k/day Spark limit.

**Test:** open the app on two browsers (or two devices) signed into the same account. Log a session in browser A. Browser B sees it appear in its Recent Sessions list within ~1 second, without any refresh.

---

### C.9 Offline persistence (Firebase advantage)

With `persistentLocalCache` configured in `src/lib/firebase.js`:

- Reads are served from IndexedDB when offline. The app **opens and renders the full history** even with no network.
- Writes are **queued in IndexedDB** when offline. `addDoc` resolves immediately with a local snapshot (`hasPendingWrites: true`). When the network returns, Firestore flushes the queue to the server transparently. No code changes needed — your existing `addExerciseLog` flow Just Works.
- Multi-tab safety: `persistentMultipleTabManager` lets two tabs in the same browser share the cache without corruption.

**Test:**
1. Open the app. Log a session. It appears.
2. DevTools → Network → set to **Offline**.
3. Log another session. It still appears in the UI. `Network` tab shows no outbound request.
4. Set back to **Online**. Watch the Network tab: Firestore flushes the pending write.

**Caveat:** offline mode does not work in private/incognito windows (IndexedDB is wiped on close). The cache falls back to in-memory automatically — no crash, just no persistence.

---

### C.10 Data migration script (one-shot)

For users who have existing data in `data/<userId>/exercise_data.json` and `data/<userId>/resource_links.json` (in the GitHub repo, or the bundled seed `src/data/exercise_log.json`), a single Node script imports it into Firestore.

**Install the admin SDK locally (do not add to runtime deps):**

```bash
npm i -D firebase-admin
```

**File:** `scripts/migrateToFirebase.mjs`

```js
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/parentfit-prod-firebase-adminsdk-xxxxx.json \
//   ACCOUNT_EMAIL=family@example.com \
//   node scripts/migrateToFirebase.mjs
//
// NEVER commit the service account JSON. It bypasses Firestore Rules.

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.ACCOUNT_EMAIL) {
  console.error('Missing env: GOOGLE_APPLICATION_CREDENTIALS, ACCOUNT_EMAIL');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db   = admin.firestore();
const auth = admin.auth();

const email = process.env.ACCOUNT_EMAIL;

// 1. Ensure the auth user exists.
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (e) {
  if (e.code === 'auth/user-not-found') {
    user = await auth.createUser({ email, emailVerified: true });
    console.log('Created user', user.uid);
  } else {
    throw e;
  }
}
const uid = user.uid;

// 2. Profile catalogue (mirror the current USERS const).
const SEED_PROFILES = [
  { slug: 'apparao', name: 'Thadana Apparao', initials: 'TA', color: '#FF6B35' },
  { slug: 'vijaya',  name: 'Addipalli Vijaya Kumari', initials: 'VK', color: '#00C896' },
];

const profileIds = {};
for (const p of SEED_PROFILES) {
  // Idempotent: query by slug, create if missing.
  const profilesCol = db.collection(`users/${uid}/profiles`);
  const existing = await profilesCol.where('slug', '==', p.slug).limit(1).get();
  let id;
  if (!existing.empty) {
    id = existing.docs[0].id;
  } else {
    const ref = await profilesCol.add({
      ...p,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    id = ref.id;
  }
  profileIds[p.slug] = id;
}
console.log('Profiles ready:', profileIds);

// 3. Walk the local data tree and import.
const dataDir = path.resolve('src/data');
for (const slug of Object.keys(profileIds)) {
  const profileId = profileIds[slug];
  const sessionsCol  = db.collection(`users/${uid}/profiles/${profileId}/sessions`);
  const resourcesCol = db.collection(`users/${uid}/profiles/${profileId}/resources`);

  // ─── Sessions ────────────────────────────────────────────────────────────
  const exFile = path.join(
    dataDir,
    slug === 'apparao' ? 'exercise_log.json' : `${slug}/exercise_data.json`
  );
  if (fs.existsSync(exFile)) {
    const raw = JSON.parse(fs.readFileSync(exFile, 'utf8'));
    const logs = raw.logs || (raw.sessions || []).map(mapSeedSession);

    // Wipe existing rows so the script is idempotent.
    await wipeCollection(sessionsCol);

    // Batched writes: Firestore caps at 500 ops per batch.
    let batch = db.batch();
    let count = 0;
    for (const l of logs) {
      const ref = sessionsCol.doc();
      batch.set(ref, {
        date: l.date,
        workoutType: l.workoutType || 'mixed',
        category: l.category,
        title: l.title,
        durationMinutes: l.durationMinutes,
        intensity: l.intensity,
        notes: l.notes || '',
        exercises: l.exercises || [],
        dayOfWeek: l.dayOfWeek || null,
        rawHeader: l.rawHeader || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    if (count % 400 !== 0) await batch.commit();
    console.log(`Imported ${count} sessions for ${slug}`);
  }

  // ─── Resources ───────────────────────────────────────────────────────────
  const resFile = path.join(
    dataDir,
    slug === 'apparao' ? 'resource_links.json' : `${slug}/resource_links.json`
  );
  if (fs.existsSync(resFile)) {
    const raw = JSON.parse(fs.readFileSync(resFile, 'utf8'));
    const items = raw.resources || (raw.links || []).filter((l) => !l.duplicate);

    await wipeCollection(resourcesCol);

    let batch = db.batch();
    let count = 0;
    for (const r of items) {
      const ref = resourcesCol.doc();
      batch.set(ref, {
        title: r.title || `FB ${r.type || 'Video'}`,
        url: r.url,
        type: ['video','audio','article'].includes(r.type) ? r.type : 'video',
        tags: r.tags || [],
        addedAt: r.addedAt || r.sharedAt || new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    if (count % 400 !== 0) await batch.commit();
    console.log(`Imported ${count} resources for ${slug}`);
  }
}

console.log('Migration complete.');
process.exit(0);

// ─── Helpers ────────────────────────────────────────────────────────────────
async function wipeCollection(colRef) {
  const snap = await colRef.get();
  if (snap.empty) return;
  let batch = db.batch();
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count++;
    if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (count % 400 !== 0) await batch.commit();
}

function mapSeedSession(s) {
  // Port from src/services/githubBackend.js::mapSessionToLog
  // ... (paste the existing function here, returning the UI shape) ...
}
```

**How to run:**

```bash
# In a separate terminal, NEVER in CI.
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/parentfit-prod-firebase-adminsdk-xxxxx.json
export ACCOUNT_EMAIL=you@example.com
node scripts/migrateToFirebase.mjs
```

**Verification (in Firebase Console → Firestore):**

Navigate to `users/{your-uid}/profiles/{profileId}/sessions` and verify document count matches the source JSON's session count. Repeat for `resources`.

Alternatively from a Node REPL:

```js
import admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const uid = 'YOUR_UID';
const profiles = await admin.firestore().collection(`users/${uid}/profiles`).get();
for (const p of profiles.docs) {
  const sessions = await admin.firestore().collection(`users/${uid}/profiles/${p.id}/sessions`).get();
  console.log(p.data().slug, 'sessions:', sessions.size);
}
```

**Cleanup after a successful production run:**
- Remove the `VITE_GH_TOKEN` repository secret.
- Delete `src/data/exercise_log.json` and `src/data/resource_links.json`.
- Delete `src/services/githubBackend.js`.
- Drop `@octokit/rest` from `package.json` (`npm uninstall @octokit/rest`).
- Drop `firebase-admin` from devDependencies if you don't plan to re-run the migration (`npm uninstall firebase-admin`).
- Delete the service account JSON from your local machine, or move it to a password manager.

---

### C.11 Composite indexes (`firestore.indexes.json`)

Firestore auto-creates **single-field indexes** for every field. **Composite indexes** are needed when you `where()` and `orderBy()` on different fields in the same query.

The current React code does **all filtering client-side** (HistoryView filters by `workoutType` after fetching the whole list), so the only server-side ordering is `orderBy('date', 'desc')` — which works on the auto-created single-field index. No composite indexes are needed today.

If you later add server-side filtering, e.g. `where('workoutType', '==', 'push').orderBy('date', 'desc')`, Firestore will return an error on first run with a one-click "Create index" deep link in the error message. Either click that, or pre-declare in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "workoutType", "order": "ASCENDING" },
        { "fieldPath": "date",        "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy with:

```bash
firebase deploy --only firestore:indexes
```

---

### C.12 Tests to add

New unit + integration tests live in `src/test/`:

- `dataAdapter.test.js`: mock Firestore via `firebase/firestore`'s in-memory mode or `@firebase/rules-unit-testing`. Assert that `docToSession` / `sessionToDoc` round-trip cleanly.
- `rules.test.js` (recommended): use `@firebase/rules-unit-testing` to spin up the local emulator and verify:
  - Anonymous reads return `permission-denied`.
  - Authenticated user A cannot read user B's path.
  - Authenticated user A can read their own path.

Example skeleton with the emulator:

```js
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setDoc, getDoc, doc } from 'firebase/firestore';

let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'parentfit-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());

test('user cannot read another user document', async () => {
  const alice = env.authenticatedContext('alice');
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), 'users/bob/profiles/p1'), { slug: 'b' })
  );
  await assertFails(getDoc(doc(alice.firestore(), 'users/bob/profiles/p1')));
});
```

Running the emulator: `firebase emulators:start --only firestore`.

- `parseMediaUrl.test.js`: unchanged, still applies.
- Manual rules sanity test documented in C.4 (incognito read attempt).

---

### C.13 Risks and rollback

| Risk | Mitigation |
|---|---|
| Rules misconfiguration leaks data | Verify with the manual test in C.4 *before* announcing the change. Cross-account read attempt MUST return `permission-denied`. Also run `rules.test.js` against the emulator in CI. |
| Email-link opened on a different device | `AuthContext` falls back to `window.prompt('Confirm the email')`. Document this in README. |
| Email delivery to Gmail spam | Firebase Auth sends from `noreply@<project>.firebaseapp.com` by default. To improve deliverability, configure a custom sender domain: Firebase Console → Authentication → Templates → Customize from address (requires DNS records). For a family app, default is usually fine. |
| Service account JSON accidentally committed | `.gitignore` covers `*.json` patterns selectively — be careful. Add an explicit line to `.gitignore`: `**/firebase-adminsdk-*.json`. Run `git secrets` or `gitleaks` as a pre-commit. |
| Migration script duplicates rows on re-run | The script `wipeCollection`s sessions and resources before inserting. Profile creation is idempotent (queries by slug). Safe to re-run. |
| Firestore free-tier read quota burned by aggressive listeners | Each `onSnapshot` reattach costs the current document count in reads. Don't re-mount the listener on every render — the `useEffect` in `AppContext` keys on `[user, activeProfileId]`, which is correct. |
| `persistentLocalCache` exceeds browser IndexedDB quota | Unlikely at family scale (~10 MB for thousands of sessions). Firestore evicts least-recently-used docs automatically. |
| Loss of "data is a git repo" backup | Add a manual export: Firebase Console → Firestore → ⋮ → Export. Or build a one-click "Download my data" button later that reads the collections and returns JSON. |
| Spark plan does not pause idle projects | This is an advantage over Supabase. No mitigation needed. |
| Quota reset is 00:00 Pacific Time | Unlikely to hit limits at family scale; mentioned only for awareness. |

**Rollback plan:** if the migration goes wrong mid-deploy, the GitHub-backed code path still exists on the `pre-firebase` branch. Revert `main` to the last commit before C.7 changes and redeploy. Firebase data is untouched and can be retried later. If you need to wipe the Firestore project to start clean: Firebase Console → Firestore → ⋮ → Delete database.

---

### C.14 Ticket index (Firebase-specific)

| ID | Title | Section |
|---|---|---|
| C-1 | Create Firebase project, enable Firestore + Auth | C.2 |
| C-2 | Copy six web SDK config values to `.env.local` + GitHub Actions Variables | C.2 |
| C-3 | Run `firebase init firestore`; commit `firestore.rules` + `firestore.indexes.json` | C.2, C.4 |
| C-4 | Deploy security rules (`firebase deploy --only firestore:rules`) | C.4 |
| C-5 | Manual rules verification (incognito read attempt + cross-account attempt) | C.4 |
| C-6 | Install `firebase`, remove `@octokit/rest` | C.7.1 |
| C-7 | Add `src/lib/firebase.js` with `persistentLocalCache` | C.7.1 |
| C-8 | Add `AuthContext` with email-link send + consume handling | C.7.2 |
| C-9 | Add `SignIn` component | C.7.5 |
| C-10 | Add `dataAdapter.js` (Firestore reads/writes/listeners) | C.7.3 |
| C-11 | Rewrite `AppContext` to use `dataAdapter` (listener-driven) | C.7.4 |
| C-12 | Add `ProfileSetup` component | C.7.6 |
| C-13 | Replace `SettingsModal` with `AccountSettings` | C.7.7 |
| C-14 | Update `Navbar` to use `activeProfile` / `profiles` instead of `USERS` | C.7.10 |
| C-15 | Gate `App.jsx` on auth + profile state; wrap providers in `main.jsx` | C.7.8, C.7.9 |
| C-16 | Write data migration script `scripts/migrateToFirebase.mjs` | C.10 |
| C-17 | Run migration script against production project | C.10 |
| C-18 | Add `rules.test.js` via `@firebase/rules-unit-testing` + emulator step in CI | C.12 |
| C-19 | Delete legacy GitHub backend code, JSON seed, `@octokit/rest`, GH token secret | C.10 cleanup |
| C-20 | Update README to document the new auth flow + first-run profile setup | C.10 cleanup |

Execute roughly in order. C-1 → C-7 are pure setup. C-8 through C-15 are the React rewrite — do them on a feature branch so the existing app keeps working. C-16 → C-17 are the data migration. C-18 → C-20 are cleanup.

---

*End of plan.*
