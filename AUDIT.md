# ParentFit — Comprehensive Codebase Audit

> Snapshot of every observation surfaced during a full-repo review.
> Scope: every file under `src/`, build config, deploy workflow, git state, and the bundled `dist/`.
> Audience: human reviewers establishing context. The companion file `FIX_PLAN.md` translates these into actionable work.

Severity labels:
- **[CRITICAL]** — security exposure, data loss, or fundamentally broken behaviour. Fix first.
- **[HIGH]** — visible UX/correctness bug, code-health risk, or a foot-gun that will bite soon.
- **[MEDIUM]** — quality, accessibility, performance, or DX papercut.
- **[LOW]** — cosmetic, branding, dead-code, or "nice to have."

Each finding includes: location → evidence → impact → context.

---

## Table of Contents

1. [Security](#1-security)
2. [Correctness / Functional Bugs](#2-correctness--functional-bugs)
3. [Data Layer & Schema](#3-data-layer--schema)
4. [State Management & Sync](#4-state-management--sync)
5. [UX & Accessibility](#5-ux--accessibility)
6. [Performance](#6-performance)
7. [Build / Deploy / CI](#7-build--deploy--ci)
8. [Code Quality & Hygiene](#8-code-quality--hygiene)
9. [Branding & Copy Drift](#9-branding--copy-drift)
10. [Inventory of dead/unused code](#10-inventory-of-deadunused-code)

---

## 1. Security

### 1.1 [CRITICAL] Real GitHub PAT permanently exposed in git history
- **Where:** historical commits prior to `880ca76`, in the file `Implementation_Plan.md`.
- **Evidence:** `git log --all -p -S 'ghp_'` returns a literal `ghp_uv4…` token embedded in the deleted plan doc (full value omitted from this report; verify locally if needed).
- **Impact:** if the repository is or has ever been public, the token is forever retrievable from history. Deleting the file in a later commit does **not** remove it from history.
- **Note:** the commit message `880ca76` says "remove sensitive token" — only true for the current tree. The blob is still reachable by SHA.

### 1.2 [CRITICAL] CI deploy workflow ships the GitHub token to every visitor
- **Where:** `.github/workflows/deploy.yml:28-31` + `src/services/githubBackend.js:79-81`.
- **Evidence:**
  ```yaml
  TOKEN="${{ secrets.VITE_GH_TOKEN }}"
  export VITE_GH_TOKEN_PART1="${TOKEN:0:20}"
  export VITE_GH_TOKEN_PART2="${TOKEN:20}"
  ```
  combined with:
  ```js
  const part1 = import.meta.env.VITE_GH_TOKEN_PART1 || '';
  const part2 = import.meta.env.VITE_GH_TOKEN_PART2 || '';
  const injectedToken = (part1 && part2) ? (part1 + part2) : '';
  ```
- **Impact:** Vite inlines `import.meta.env.VITE_*` as plain string literals at build time. Both halves end up in `dist/assets/index-*.js`, served publicly by GitHub Pages. Anyone with View-Source can concatenate them and obtain a write-scoped PAT. The split bypasses GitHub's push-time secret scanning only — not extraction from the live bundle.
- **Honesty check:** commit message `b9eb682` ("decouple GitHub token to bypass secret scanning push protection") confirms the author's intent was to evade the scanner, not to harden access.

### 1.3 [CRITICAL] Magic Link silently rewrites data-source config
- **Where:** `src/context/AppContext.jsx:62-83`.
- **Evidence:** `?owner=&repo=&branch=` query params are read and immediately persisted to localStorage via `persistConfig(...)`. No confirmation, no whitelist. The toast (`Magic Link detected! Configuration synced ✓`) is positive-toned.
- **Impact:** a malicious link of the form `https://parentfit.example/?owner=attacker&repo=evil` redirects the user's subsequent writes to an attacker-owned repo. If the user has set their own PAT, the attacker repo silently receives their data. Even without a PAT, the user's view of their own workouts is replaced by attacker-controlled content.
- **Side-effect:** `useEffect` depends on `ghConfig`, `activeUserId`, `loadData` — so the effect re-runs whenever those values mutate; the URL clean-up (`history.replaceState`) makes it idempotent in practice, but the dependency list is wider than necessary.

### 1.4 [HIGH] No Content-Security-Policy; arbitrary `<iframe>` / `<video>` src
- **Where:** `src/components/MediaPlayerModal.jsx`, `index.html`.
- **Evidence:** user-pasted URLs are interpolated into `<iframe src={embedUrl}>`. The host page declares no CSP meta tag.
- **Impact:** the embed surface is open to anything that loads in an iframe. For a personal app the risk is low, but combined with **1.3** it is wider than necessary.

### 1.5 [HIGH] Facebook embed branch matches any URL containing "facebook.com"
- **Where:** `src/components/MediaPlayerModal.jsx:26-28`.
- **Evidence:** `else if (url.includes('facebook.com'))` — substring match, not host check.
- **Impact:** `https://attacker.example/?facebook.com=` slips through to be passed to Facebook's plugin endpoint as `href=...`. Facebook will reject malformed input, but the application should be parsing `new URL(url).hostname`.

### 1.6 [MEDIUM] YouTube/Vimeo URL parsers are substring-based
- **Where:** `src/components/MediaPlayerModal.jsx:17-25`, `src/components/ResourceHub.jsx:11-14`.
- **Evidence:** `url.includes('youtube.com/watch?v=')`, `url.split('v=')[1]?.split('&')[0]`.
- **Impact:** brittle; an attacker URL containing the literal substring `youtube.com/watch?v=evil` would be embedded as if it were a YouTube video. Risk is contained to YouTube's domain (the iframe still loads `youtube.com/embed/<id>`), but the parsing logic is wrong-by-construction. Use the `URL` API and check `hostname`.

### 1.7 [MEDIUM] `localStorage` is the only token store
- **Where:** `src/services/githubBackend.js:84, 92`.
- **Impact:** any XSS on the deployed origin can exfiltrate the PAT. Acceptable for a personal tool; not acceptable if the app is ever embedded in or alongside untrusted content.

### 1.8 [LOW] `escape` / `unescape` (deprecated globals) used for UTF-8 base64
- **Where:** `src/services/githubBackend.js:170, 206, 232`.
- **Evidence:** `decodeURIComponent(escape(atob(...)))` / `btoa(unescape(encodeURIComponent(...)))`.
- **Impact:** legacy idiom. Removed in many sandboxed contexts (some CSPs, some workers). Will work today; fragile tomorrow.

---

## 2. Correctness / Functional Bugs

### 2.1 [CRITICAL] Dashboard "Recent Sessions" displays the OLDEST sessions
- **Where:** `src/components/Dashboard.jsx:57`.
- **Evidence:**
  ```js
  const logs = useMemo(() => (exerciseData?.logs || []).slice().reverse(), [exerciseData]);
  // ...
  const recent = logs.slice(0, 8);
  ```
- **Root cause:** `addExerciseLog` (AppContext) prepends new entries (newest-first). The historical seed from `mapSessionToLog` is also broadly newest-first based on parser output. Reversing then slicing 0–8 returns the **oldest 8 entries**.
- **Impact:** the Home tab's "Recent Sessions" is misleading. Newly logged sessions never appear here even though the success toast says they synced. HistoryView does its own sort, masking the bug.

### 2.2 [HIGH] Knowledge Hub images 404 in production
- **Where:** `src/App.jsx:38, 44, 49, 55`.
- **Evidence:** `img: "./src/assets/content/micro_workouts.png"` (etc.) used as raw `<img src>`.
- **Impact:** Vite only rewrites assets it sees through `import` or `import.meta.url`. Raw `./src/...` strings pass through unprocessed. With `base: '/parentfit/'`, the browser requests `/parentfit/src/assets/content/<name>.png` — these files do not exist in `dist/`. Result: four broken thumbnails on the "More" tab in production.
- **Dev caveat:** even in dev, `./src/...` resolves relative to the page URL, not the JSX file. Likely broken on every environment except possibly root-mounted dev.

### 2.3 [HIGH] Optimistic add on failure is not rolled back
- **Where:** `src/context/AppContext.jsx:93-107`.
- **Evidence:** state is updated before the await; the catch block only triggers an error toast.
- **Impact:** UI shows the new session; cloud and localStorage may or may not — `saveJsonFile` writes to localStorage before attempting the network call, so the local cache *is* preserved on network failure. But once the 5-minute auto-sync (`loadData` silent) runs, the in-memory state is replaced by cloud state, which lacks the failed write. The session vanishes from view.
- **Inconsistency:** `deleteExerciseLog` *does* roll back via `loadData(activeUserId)` on failure.

### 2.4 [HIGH] Auto-sync races with in-flight writes
- **Where:** `src/context/AppContext.jsx:173-191`.
- **Evidence:** `setInterval(loadData, 5 * 60 * 1000)` and `visibilitychange → loadData(silent=true)` both ignore the `syncing` flag.
- **Impact:** mid-write tab-switch or a 5-minute crossing during slow upload will overwrite local state with stale cloud state. Last-write-wins is implicit and silent.

### 2.5 [HIGH] `forceManualSync` reports success even when load failed
- **Where:** `src/context/AppContext.jsx:160-163`.
- **Evidence:**
  ```js
  const forceManualSync = async () => {
    await loadData(activeUserId);
    triggerSuccess('Synced from cloud storage ✓');
  };
  ```
- **Root cause:** `loadData` swallows its own errors via `triggerError`. `forceManualSync` cannot distinguish success from failure.
- **Impact:** the user sees both a red error toast and a green success toast on a failed manual sync. Contradictory feedback.

### 2.6 [HIGH] Empty sessions can be submitted
- **Where:** `src/components/ExerciseLogger.jsx:273-274`.
- **Evidence:** `exercises.filter(ex => ex.name.trim())` — if every exercise name is blank, the payload still saves with `exercises: []`.
- **Impact:** stat counters tick up; heatmap / streak / history all show ghost sessions.

### 2.7 [MEDIUM] `ExerciseLogger` does not reset `workoutType` between sessions
- **Where:** `src/components/ExerciseLogger.jsx:289`.
- **Evidence:** post-submit reset sets `notes`, `exercises`, `duration`, `step` — but not `workoutType`.
- **Impact:** next session always opens on Push (because the previously chosen workout type is still selected and immediately advances past Step 1 on user tap; but Step 0 *is* re-entered, so the visual selection is preserved which can mislead users into thinking they chose it).

### 2.8 [MEDIUM] `ResourceHub.isPlayable` fails on URLs with query strings
- **Where:** `src/components/ResourceHub.jsx:116-118`.
- **Evidence:** `url.endsWith('.mp4')` is false for `https://cdn/clip.mp4?v=2`.
- **Impact:** the "Play" button is hidden and the user gets "Open" instead. Minor.

### 2.9 [MEDIUM] Time-of-day stamp is fabricated as 06:00 IST
- **Where:** `src/components/ExerciseLogger.jsx:265`, `src/services/githubBackend.js:51`.
- **Evidence:** every fresh session writes `${YYYY-MM-DD}T06:00:00+05:30`; every mapped seed session writes `${session.date}T06:00:00+05:30`.
- **Impact:** future "time-of-day" analytics, ordering within a day, and any client in another timezone will see fake stamps. Streak/heatmap math (which only uses `split('T')[0]`) is unaffected today.

### 2.10 [MEDIUM] Heatmap timezone drift near midnight
- **Where:** `src/components/HistoryView.jsx:30-37`.
- **Evidence:** `cur.toISOString().split('T')[0]` returns a UTC date; stored `l.date` is `YYYY-MM-DDT06:00:00+05:30`, splitting at `T` yields the IST date.
- **Impact:** when "today" in IST and UTC differ (IST 00:00–05:30), the heatmap's "today" cell is the previous day. Cosmetic; off-by-one for ~5h/day for IST users.

### 2.11 [MEDIUM] Demo-mode trip wire is "token length < 10"
- **Where:** `src/services/githubBackend.js:138-143`.
- **Evidence:**
  ```js
  return !token || token.length < 10;
  ```
- **Impact:** a user who pastes a short or partial token silently enters demo mode. The Navbar pill still shows "Demo" but the Settings modal shows their token, which is confusing.

### 2.12 [MEDIUM] Hardcoded default `owner: 'ttaruntej'`, `repo: 'parentfit'`
- **Where:** `src/services/githubBackend.js:85-86`.
- **Impact:** any visitor who pastes a token without changing owner/repo immediately writes to the original author's repo. There is no in-UI warning. Defaults should be empty and the Settings form should require both.

### 2.13 [LOW] `forceManualSync` is destructured into `MorePage` but unused
- **Where:** `src/App.jsx:28` (after the latest uncommitted edits removed the consumer markup).

### 2.14 [LOW] Streak math considers the day immediately before "today" as part of the streak even if the user did not work out today
- **Where:** `src/components/Dashboard.jsx:42-53`.
- **Evidence:** `prev = today; for each day from newest, diff <= 1 → count++`. If today has no log but yesterday does, `diff = 1` so count = 1.
- **Impact:** "streak: 1" when the actual current streak is broken-by-omission. Debatable UX, but inconsistent with how Duolingo / typical streak apps treat it.

---

## 3. Data Layer & Schema

### 3.1 [HIGH] `category` field has two incompatible meanings
- **Where:**
  - Seed mapper at `src/services/githubBackend.js:32-60` writes `category: WORKOUT_CATEGORY[type]` — values are `"Strength / Push"`, `"Lower Body / Legs"`, etc.
  - Fresh-log writer at `src/components/ExerciseLogger.jsx:268` writes `category: typeInfo.name` — values are `"Push Day"`, `"Pull Day"`, etc.
- **Impact:** any future filter / chart keyed off `category` will silently split the dataset by ingestion source. The constant `WORKOUT_CATEGORY` is otherwise dead code.

### 3.2 [HIGH] Counterweight sets are representable in seed JSON but not in the logger
- **Where:**
  - `scripts/parseData.mjs` (not fully read, but `mapSessionToLog` references `s.counterweight_kg`).
  - `src/components/ExerciseLogger.jsx` only renders `weight_kg`, `reps`, and a `bodyweight` boolean.
- **Impact:** if a user opens a historical counterweight session in any future "edit" flow, the counterweight value is lost. Today there is no edit flow so the data is preserved on disk but invisible in the UI.

### 3.3 [MEDIUM] Per-user seed branching is hardcoded by user ID
- **Where:** `src/services/githubBackend.js:131-134`.
- **Evidence:** `userId === 'apparao' ? INITIAL_EXERCISES_APPARAO : INITIAL_EXERCISES_VIJAYA`.
- **Impact:** adding a third user requires code changes. The `USERS` constant array is the source of truth for IDs; the seed branch should drive off it (e.g., a `seedFor(userId)` lookup).

### 3.4 [MEDIUM] Per-cold-start re-mapping of 90 KB seed JSON
- **Where:** `src/services/githubBackend.js:117-125`.
- **Evidence:** `INITIAL_EXERCISES_APPARAO` runs `.map(mapSessionToLog)` at module init.
- **Impact:** unconditional work on every cold start, even for the Vijaya user who never reads the seed. Lazy-init via a getter would skip this for non-Apparao sessions.

### 3.5 [MEDIUM] `mapLinkToResource` always sets `type: 'video'`
- **Where:** `src/services/githubBackend.js:63-74`.
- **Evidence:** ignores the original `link.type` (`"video" | "reel"`) when assigning the mapped resource's `type`.
- **Impact:** all seed resources display with the video icon/color. Reels are functionally equivalent here so the visual loss is small.

### 3.6 [LOW] Resource titles auto-generated as `FB Video #N`
- **Where:** `src/services/githubBackend.js:65-66`.
- **Impact:** human-unfriendly titles for the entire seed. A YouTube-style URL fetch (or just preserving original captions if present) would help.

### 3.7 [LOW] `WORKOUT_CATEGORY` constant referenced only by `mapSessionToLog`
- **Where:** `src/services/githubBackend.js:24-30`.
- **Evidence:** see 3.1. The constant is otherwise dead.

---

## 4. State Management & Sync

### 4.1 [HIGH] Missing `loadData` dependency in `useEffect`
- **Where:** `src/context/AppContext.jsx:60`.
- **Evidence:** `useEffect(() => { loadData(activeUserId); }, [activeUserId]);` — React's exhaustive-deps rule flags this. `loadData` itself is memoized via `useCallback`, but it depends on `activeUserId`, so including it would cause a re-trigger loop.
- **Impact:** the suppressed warning hides the fact that `loadData`'s `activeUserId` capture is redundant when called as `loadData(activeUserId)`. Either accept `userId` and remove the closure-over `activeUserId`, or include `loadData` in deps after rewriting it.

### 4.2 [HIGH] Magic Link effect runs on every `ghConfig`, `activeUserId`, `loadData` change
- **Where:** `src/context/AppContext.jsx:63-83`.
- **Evidence:** the dependency array is `[ghConfig, activeUserId, loadData]`.
- **Impact:** it only does work when URL params are present, and clears them via `replaceState`, so the second invocation is a no-op. Still: the effect should run once on mount.

### 4.3 [MEDIUM] React StrictMode + Octokit fetches double-fire in dev
- **Where:** `src/main.jsx:8`.
- **Impact:** every `loadData` runs twice in dev, doubling GitHub API call counts. Eats your 60/hr unauthenticated quota fast when iterating.

### 4.4 [MEDIUM] `setTimeout(loadData, 500)` after Magic Link & after `updateConfig`
- **Where:** `src/context/AppContext.jsx:81, 170`.
- **Evidence:** magic numbers with no comment.
- **Impact:** racy; not deterministic. Should be an explicit await on `persistConfig` (which is synchronous against localStorage today) followed by `loadData()`.

### 4.5 [LOW] `triggerSuccess` / `triggerError` overlap toasts
- **Where:** `src/context/AppContext.jsx:30-37`.
- **Evidence:** previous toast timer is not cleared when a new one fires.
- **Impact:** fast successive operations can show toast A vanishing prematurely as toast B's timer takes over. Cosmetic.

---

## 5. UX & Accessibility

### 5.1 [HIGH] Toasts have no `role="status"` / `aria-live`
- **Where:** `src/App.jsx:135-144`.
- **Impact:** blind users get no audible confirmation of sync events.

### 5.2 [HIGH] HistoryView session card is not keyboard accessible
- **Where:** `src/components/HistoryView.jsx:91`.
- **Evidence:** `<div className="session-card" onClick={() => setExpanded(...)}>` — no `tabIndex`, no `role="button"`, no `onKeyDown`.
- **Impact:** keyboard-only users cannot expand a session.

### 5.3 [HIGH] Custom buttons lose focus indicators
- **Where:** Navbar refresh button (`src/components/Navbar.jsx:122-129`), MorePage FAB (`src/components/ResourceHub.jsx:208-230`), user-switcher buttons (Navbar lines 24-50), MediaPlayerModal close, and many `.btn` instances inline-styled.
- **Evidence:** `border: 'none'`, `outline` not customized.
- **Impact:** tab focus is invisible. Browsers show `:focus-visible` by default for many of these, but inline overrides defeat it. A global `:focus-visible { outline: 2px solid var(--fire); outline-offset: 2px; }` would restore the indicator.

### 5.4 [MEDIUM] User-switcher overlay covers the entire viewport
- **Where:** `src/components/Navbar.jsx:137-141`.
- **Evidence:** `<div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowUserMenu(false)} />`.
- **Impact:** intercepts touches under the dropdown z-stack. Stops working as soon as another floating element (e.g., a future toast or tooltip) raises its z-index. The conventional pattern is a `useEffect` outside-click listener bound to `document`.

### 5.5 [MEDIUM] No `inputMode="decimal"` on weight inputs
- **Where:** `src/components/ExerciseLogger.jsx:138-145`.
- **Impact:** mobile keyboards default to integer numpad. Acceptable; not optimal for `2.5 kg` entry.

### 5.6 [MEDIUM] `tab title` is static across pages
- **Where:** `index.html:6`, never updated by React.
- **Impact:** the tab title remains the full marketing string regardless of which tab is open. Browser history is harder to scan.

### 5.7 [MEDIUM] Empty-state CTA "Add your first resource" duplicates the FAB
- **Where:** `src/components/ResourceHub.jsx:158-159, 208-230`.
- **Impact:** two CTAs in the same visual region. Minor.

### 5.8 [MEDIUM] Knowledge Hub presents "AI Curated" content that is hardcoded
- **Where:** `src/App.jsx:32-57, 66`.
- **Evidence:** the four objects are inline arrays; the "AI Curated" pill is decorative.
- **Impact:** trust-erosion if the user looks closely.

### 5.9 [LOW] No favicon
- **Where:** `index.html` has no `<link rel="icon">`.
- **Impact:** browsers issue a `GET /favicon.ico` that 404s in DevTools; tab shows a generic icon.

### 5.10 [LOW] No PWA manifest, no service worker, no `apple-touch-icon`, no `theme-color`
- **Impact:** marketing copy says "Mobile-First" and "Cloud Synchronization across devices"; reality is a regular web page wrapped in a 430px shell.

### 5.11 [LOW] No 404 fallback for GitHub Pages SPA
- **Where:** `dist/` has only `index.html`.
- **Impact:** deep links / refresh on any non-root path on Pages return 404. The conventional workaround is a `404.html` that re-routes to `index.html` (`spa-github-pages` pattern). The app today has only one route, so this is latent; if router-based routing is ever added, the trap appears.

### 5.12 [LOW] Stat-pill grid breaks visually when grid items are emoji-rich
- **Where:** `src/components/Dashboard.jsx:125-153`.
- **Impact:** at narrow widths, the numeric value plus label can wrap unexpectedly. Cosmetic.

### 5.13 [LOW] BottomNav center FAB overlap on iOS safe area
- **Where:** `src/index.css:127-145` — `padding-bottom: env(safe-area-inset-bottom, 0px)`.
- **Evidence:** the FAB has `margin-top: -20px`, which can collide with the safe-area inset on devices with a home-indicator.
- **Impact:** the Log FAB is partially obscured on some iPhones in landscape.

### 5.14 [LOW] Greeting based purely on local hour with no user override
- **Where:** `src/components/Dashboard.jsx:71-72`.
- **Impact:** night-shift users see "Good evening" before their workout. Cosmetic.

---

## 6. Performance

### 6.1 [HIGH] `@octokit/rest` ships full client SDK for two endpoints
- **Where:** `package.json:12`, `src/services/githubBackend.js`.
- **Evidence:** `dist/assets/index-*.js` contains generated method names for hundreds of unused GitHub endpoints (`addRepoToInstallationForAuthenticatedUser`, `createGpgKeyForAuthenticatedUser`, …).
- **Impact:** uncompressed bundle bloat; first-load cost on slow mobile networks. The app only calls `repos.getContent` and `repos.createOrUpdateFileContents`; a ~30-line `fetch` wrapper is a drop-in replacement.

### 6.2 [MEDIUM] `HistoryView.FILTERS` recomputed per render with 6× full-array filter
- **Where:** `src/components/HistoryView.jsx:162-169`.
- **Evidence:** each render reconstructs the array and walks `allLogs` six times.
- **Impact:** noticeable with hundreds of logs; trivial today. Should be derived from a single grouping pass and memoized.

### 6.3 [MEDIUM] `Object.entries(grouped)` iteration order depends on insertion order, which depends on sort order
- **Where:** `src/components/HistoryView.jsx:312`.
- **Impact:** if sort is "oldest first", the first group rendered is the oldest year-month, which is fine. But there is no explicit ordering of group keys — purely insertion order. Acceptable but fragile.

### 6.4 [MEDIUM] Seed JSON re-parsed and re-mapped on every cold start
- **Where:** `src/services/githubBackend.js:117-125`.
- **Impact:** see 3.4. ~90 KB JSON × full map.

### 6.5 [LOW] Inline styles all over the JSX
- **Where:** every component file (`Navbar.jsx`, `Dashboard.jsx`, `ExerciseLogger.jsx`, `HistoryView.jsx`, `ResourceHub.jsx`, `SettingsModal.jsx`, `MediaPlayerModal.jsx`).
- **Impact:** small perf cost (object allocation per render), bigger maintenance cost (the design system in `:root` CSS variables is excellent but undermined by hundreds of one-off `style={{}}` blocks). Moving these to classes would shrink JSX by ~30%.

### 6.6 [LOW] `localStorage.setItem` per write has no quota guard
- **Where:** `src/services/githubBackend.js:191`.
- **Impact:** quota errors throw synchronously and would currently surface only via the saving promise's reject path (which is the GitHub call's; localStorage write happens before the await but is uncaught). For 5MB cap and ~100KB seed, you're fine, but if a user attaches many resources you may hit it. Defensive try/catch is appropriate.

### 6.7 [LOW] Streak calculation re-walks days set on every render
- **Where:** `src/components/Dashboard.jsx:42-53`.
- **Impact:** cheap; not memoized. Wrap in `useMemo` for consistency with the other derived values.

---

## 7. Build / Deploy / CI

### 7.1 [HIGH] `dist/` is `.gitignore`d but `dist/index.html` is committed
- **Where:** `.gitignore:11`, plus the tracked file `dist/index.html`.
- **Evidence:** `git ls-files | grep '^dist/'` returns one entry; `git log -- dist/` shows multiple historical commits to it.
- **Impact:** the committed `dist/index.html` is stale relative to what the workflow produces. Confuses anyone inspecting the repo. Either fully untrack (`git rm --cached -r dist/` + clean .gitignore) or commit the entire directory deliberately.

### 7.2 [HIGH] CI uses `npm install`, not `npm ci`
- **Where:** `.github/workflows/deploy.yml:24`.
- **Impact:** `npm install` is allowed to mutate `package-lock.json` and resolve newer versions silently. Builds are not reproducible. Use `npm ci`.

### 7.3 [HIGH] `vite.config.js` hardcodes `base: '/parentfit/'`
- **Where:** `vite.config.js:7`.
- **Impact:** anyone forking under a different repo name produces a bundle with absolute asset paths pointing to `/parentfit/` and ships a broken site. The base path should be derived from `process.env.GITHUB_REPOSITORY` in CI (or read from an env var).

### 7.4 [MEDIUM] No engines field in `package.json`
- **Where:** `package.json`.
- **Impact:** CI pins Node 20 but local dev is unconstrained. Add `"engines": { "node": ">=18.18" }` (matching React 18 minimum and modern Vite).

### 7.5 [MEDIUM] No lint / test / typecheck step in CI
- **Where:** `.github/workflows/deploy.yml`.
- **Impact:** dead `@types/*` devDeps; no signal on regressions before deploy.

### 7.6 [MEDIUM] Permissions on the workflow are wider than needed
- **Where:** `.github/workflows/deploy.yml:8`.
- **Evidence:** `contents: write` for the entire job, including the install/build steps that don't need it.
- **Impact:** principle of least privilege. Scope `contents: write` to the deploy step only via job-level `permissions: { contents: read }` and step-level overrides — or switch to the native `actions/deploy-pages` flow which uses GH-issued OIDC tokens.

### 7.7 [LOW] Deploy uses third-party action `JamesIves/github-pages-deploy-action@v4`
- **Where:** `.github/workflows/deploy.yml:34-37`.
- **Impact:** stable maintainer, but the GitHub-native deploy chain (`actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`) avoids the third-party dependency and uses signed OIDC.

---

## 8. Code Quality & Hygiene

### 8.1 [HIGH] No error boundary
- **Where:** `src/main.jsx`, all components.
- **Impact:** any uncaught render throw blanks `#root`. Wrapping `<App />` in an `ErrorBoundary` with a Reload button is one tiny class.

### 8.2 [HIGH] No tests anywhere
- **Where:** `package.json` has no `test` script; no `__tests__` / `*.test.*` files.
- **Impact:** every change is a black-box. The data-mapping in `mapSessionToLog`, the streak math, and the URL-parsing helpers are pure functions and trivial to test.

### 8.3 [HIGH] No ESLint, no Prettier, no Husky pre-commit
- **Where:** repo root.
- **Impact:** missing-deps warnings (4.1), inline-style inconsistency, dead-import drift, and trailing-whitespace churn all merge unchallenged. Vite's React template ships ESLint by default; absence is intentional removal.

### 8.4 [HIGH] No TypeScript despite `@types/react*` devDeps
- **Where:** `package.json:18-19`.
- **Impact:** wasted devDeps; structural drift in the `Log` and `Resource` shapes between consumers (Dashboard, HistoryView, Logger, githubBackend) is invisible without types.

### 8.5 [MEDIUM] Inline styles duplicate the CSS design system
- See **6.5** for performance; the larger cost is maintenance. When `--fire` changes, all `style={{ color: 'var(--fire)' }}` keep working — but `color: '#FF6B35'` literals (a few exist in inline opacity gradients) won't.

### 8.6 [MEDIUM] Dead imports in `src/App.jsx`
- **Where:** `src/App.jsx:11`.
- **Evidence:** `Settings`, `Cloud`, `Database` imported but no longer used after MorePage's System & Preferences card was removed (uncommitted edit).
- **Impact:** tree-shaking helps but the linter would catch it. Without lint, this rots.

### 8.7 [MEDIUM] Unused destructure in `MorePage`
- **Where:** `src/App.jsx:28`.
- **Evidence:** `ghConfig, syncing, forceManualSync` destructured; only `setIsSettingsOpen` is used (after the recent edit). `isDemo` is computed and unused.

### 8.8 [MEDIUM] Magic `setTimeout(..., 500)` × 2
- **Where:** `src/context/AppContext.jsx:81, 170`.
- **Impact:** see 4.4. Replace with explicit awaiting.

### 8.9 [LOW] Comments include emoji + unicode box-drawing
- **Where:** `src/context/AppContext.jsx`, `src/services/githubBackend.js`.
- **Impact:** harmless; some Windows terminals render the box-drawing glyphs poorly. Style preference.

### 8.10 [LOW] `console.log` and `console.warn` paths left in for normal flow
- **Where:** `src/services/githubBackend.js:152, 175, 194, 215, 240`.
- **Impact:** prod console noise. Should be gated behind a `DEBUG` flag or removed.

### 8.11 [LOW] Repeated category map (`CAT_MAP`) duplicated across `Dashboard.jsx` and `HistoryView.jsx`
- **Where:** `src/components/Dashboard.jsx:5-11`, `src/components/HistoryView.jsx:5-11`.
- **Impact:** two sources of truth for the same lookup. Extract to a shared module.

### 8.12 [LOW] `PAGE_TITLE` map in `App.jsx` not synchronized with `BottomNav` tab IDs naming convention
- **Where:** `src/App.jsx:82-88`.
- **Evidence:** the keys (`home`, `log`, `history`, `resources`, `settings`) match BottomNav, but the visible label ("Log Session") differs from the BottomNav label (empty/icon-only). Could be derived from a single source.

### 8.13 [LOW] No JSDoc / type annotations on the service layer
- **Where:** `src/services/githubBackend.js`.
- **Impact:** the shape of `logsObj` / `resourcesObj` is implicit; consumers learn by reading. JSDoc `@param`/`@returns` would help editors without adding TS.

---

## 9. Branding & Copy Drift

### 9.1 [LOW] Version string mismatch
- README: "ParentFit v1.2"
- App footer: "ParentFit v1.2 · Premium Experience"
- Recent commit (`1560a53`): "ParentFit v2 Full-Stack"
- Recent commit (`b3fc586`): "ParentFit v2 — mobile-first redesign"

Pick one version and propagate.

### 9.2 [LOW] "AI Curated" pill on a static array
- **Where:** `src/App.jsx:64`.
- See 5.8.

### 9.3 [LOW] Two different brand subtitles
- `index.html` title: "ParentFit - Seamless Exercise Routine Logger & Resource Hub"
- README tagline: "Seamless Exercise Routine Logger & Resource Hub for Busy Parents."
- App footer: "Premium Experience"

Consolidate.

### 9.4 [LOW] "Premium" framing in user-facing copy
- **Where:** README, App footer.
- **Impact:** subjective; flag for owner judgment. "Premium" without paywall or differentiation reads as marketing filler.

---

## 10. Inventory of dead / unused code

| File | Symbol | Status |
|---|---|---|
| `src/App.jsx:11` | `Settings`, `Cloud`, `Database` (lucide imports) | Unused after MorePage edit |
| `src/App.jsx:28` | `ghConfig`, `syncing`, `forceManualSync`, `isDemo` | Destructured / computed but unused |
| `src/services/githubBackend.js:24-30` | `WORKOUT_CATEGORY` | Only referenced by seed mapper; dead path for fresh logs |
| `src/services/githubBackend.js:79-81` | `VITE_GH_TOKEN_PART1/PART2` | Should be removed entirely (see 1.2) |
| `package.json:18-19` | `@types/react`, `@types/react-dom` | Dead until TS adopted |
| `dist/index.html` | Tracked stale build artefact | See 7.1 |
| `Exercise data.md`, `Resourcelinks.md` (repo root) | Source-of-truth-or-parser-input? | Unclear role given `scripts/parseData.mjs` writes into `src/data/` |

---

## 11. Things that are GOOD (worth preserving)

To balance the brutality:
- CSS design system via `:root` variables — coherent, themable.
- Three-step Logger wizard is well-structured and resumable.
- HistoryView grouping + heatmap + search + sort is a genuinely strong feature set.
- Per-user data partitioning at the path level (`data/<userId>/...`) is clean.
- StrictMode on by default.
- The `Octokit` write flow correctly handles "file does not exist yet" via try/catch sha lookup.
- 5-minute auto-sync and visibility-change refresh are thoughtful UX touches *if* the race conditions (4.4) are fixed.
- README is concise and accurate-enough.

---

*End of audit. See `FIX_PLAN.md` for the prioritized, code-level remediation plan.*
