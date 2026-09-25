/* ── FixFlow app.js ────────────────────────────────────────────── */
'use strict';

// ── Example presets ────────────────────────────────────────────────
const EXAMPLES = {
  auth: {
    title: 'JWT token not invalidated on logout',
    severity: 'high',
    description:
      'After a user logs out, their JWT token is still accepted by protected API endpoints for up to 15 minutes. An attacker who captures a token can continue making authenticated requests.\n\nSteps to reproduce:\n1. Log in and copy the Authorization header.\n2. Click "Log out".\n3. Replay the captured header against GET /api/profile — returns 200 OK.',
    environment: 'Node 20.11, Express 4.18, Redis 7, Chrome 124',
  },
  perf: {
    title: 'Dashboard loads 8 s on first visit (cold cache)',
    severity: 'medium',
    description:
      'The /dashboard route triggers N+1 queries against the projects table. With 200+ projects each project fires an individual SELECT for its owner. Total DB round-trips observed: 214.\n\nExpected: single JOIN query ≤ 50 ms.\nActual: 8–12 s page load on cold PostgreSQL cache.',
    environment: 'PostgreSQL 15, Sequelize 6, Next.js 14, Vercel Edge',
  },
  ui: {
    title: 'Dropdown menu clips outside viewport on mobile',
    severity: 'low',
    description:
      'The user-profile dropdown in the top-right corner renders partially off-screen on viewports narrower than 400 px. The "Sign out" option is unreachable without scrolling, which is not possible inside the dropdown overlay.\n\nAffected: iOS Safari 17, Android Chrome 124.',
    environment: 'React 18, Tailwind CSS 3.4, iOS 17 / Android 14',
  },
};

// ── Data generators ────────────────────────────────────────────────
function generateStages(title, severity, description, environment) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();

  // ── helpers ──────────────────────────────────────────────────────
  const isAuth  = /jwt|token|auth|login|logout|session|password|oauth/.test(t + d);
  const isPerf  = /n\+1|query|slow|load|cache|latency|perf|ms|second/.test(t + d);
  const isUI    = /dropdown|clip|viewport|mobile|css|render|layout/.test(t + d);
  const isDB    = /sql|postgres|mysql|sequelize|prisma|orm|query/.test(t + d);
  const isFE    = /react|vue|angular|tailwind|css|safari|chrome/.test(t + d);

  // ── pick template branch ──────────────────────────────────────────
  if (isAuth)  return authPlan(title, severity, environment);
  if (isPerf)  return perfPlan(title, severity, environment);
  if (isUI)    return uiPlan(title, severity, environment);
  if (isDB)    return dbPlan(title, severity, environment);
  if (isFE)    return fePlan(title, severity, environment);
  return genericPlan(title, severity, environment);
}

// ── Template: Auth ────────────────────────────────────────────────
function authPlan(title, severity, env) {
  return {
    stages: [
      {
        label: 'Reproduce',
        heading: 'Reproduction Steps',
        icon: iconReproduce(),
        body: `
          <ul class="checklist">
            <li>Stand up a local instance with <code>npm run dev</code>.</li>
            <li>Register a test account and log in; capture the <code>Authorization: Bearer &lt;token&gt;</code> header via DevTools → Network.</li>
            <li>Click <strong>Log out</strong> in the UI.</li>
            <li>Replay the header using <code>curl</code> or Postman against <code>GET /api/profile</code>.</li>
            <li class="warn">Expected <strong>401 Unauthorized</strong> — observed <strong>200 OK</strong> up to ~15 min later.</li>
          </ul>
          <div class="code-block"><span class="cmt"># Reproduce in one command after logout</span>
curl -H <span class="str">"Authorization: Bearer &lt;captured_token&gt;"</span> \
  http://localhost:3000/api/profile
<span class="cmt"># → {"id":42,"email":"test@example.com"} ← should be 401</span></div>`,
      },
      {
        label: 'Diagnose',
        heading: 'Root-Cause Diagnosis',
        icon: iconDiagnose(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;">JWT verification middleware relies solely on the signature/expiry encoded
          in the token. No server-side revocation store is consulted on logout.</p>
          <div class="code-block"><span class="cmt">// src/middleware/auth.js  (current — BROKEN)</span>
<span class="kw">export</span> <span class="kw">const</span> <span class="fn">requireAuth</span> = (req, res, next) => {
  <span class="kw">const</span> token = req.headers.authorization?.split(<span class="str">' '</span>)[<span class="num">1</span>];
  <span class="kw">try</span> {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    <span class="fn">next</span>(); <span class="cmt">// ← never checks revocation list</span>
  } <span class="kw">catch</span> { res.sendStatus(<span class="num">401</span>); }
};</div>
          <hr class="divider"/>
          <p style="font-size:.88rem;margin-bottom:.5rem;"><strong>Contributing factors:</strong></p>
          <ul class="checklist">
            <li>No token blocklist (Redis set) populated on <code>POST /auth/logout</code>.</li>
            <li>Token TTL is 15 min — window for exploitation.</li>
            <li>Logout endpoint only clears the HTTP-only cookie; does not persist the JTI.</li>
          </ul>`,
      },
      {
        label: 'Fix Plan',
        heading: 'Structured Fix Plan',
        icon: iconFix(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;"><strong>Strategy:</strong> Maintain a Redis-backed JTI (JWT ID) blocklist. On logout, add the JTI with TTL equal to the token's remaining lifetime. Middleware checks the blocklist before passing the request.</p>
          <ol class="num-list">
            <li>Add <code>jti</code> claim when signing tokens in <code>src/services/auth.service.js</code>.</li>
            <li>Update <code>POST /auth/logout</code> — decode the token, <code>SETEX jti ttl 1</code> in Redis.</li>
            <li>Update <code>requireAuth</code> middleware — after signature verification, call <code>redis.get(jti)</code>; return 401 if present.</li>
            <li>Write integration tests covering the post-logout replay scenario.</li>
          </ol>
          <div class="code-block"><span class="cmt">// src/middleware/auth.js  (patched)</span>
<span class="kw">export</span> <span class="kw">const</span> <span class="fn">requireAuth</span> = <span class="kw">async</span> (req, res, next) => {
  <span class="kw">const</span> token = req.headers.authorization?.split(<span class="str">' '</span>)[<span class="num">1</span>];
  <span class="kw">try</span> {
    <span class="kw">const</span> payload = jwt.verify(token, process.env.JWT_SECRET);
    <span class="kw">if</span> (<span class="kw">await</span> redis.<span class="fn">get</span>(<span class="str">\`blocklist:\${payload.jti}\`</span>))
      <span class="kw">return</span> res.<span class="fn">sendStatus</span>(<span class="num">401</span>);
    req.user = payload;
    <span class="fn">next</span>();
  } <span class="kw">catch</span> { res.<span class="fn">sendStatus</span>(<span class="num">401</span>); }
};</div>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.5rem;">Estimated effort: <strong>2–3 h</strong> · Risk: Low (additive change)</p>`,
      },
      {
        label: 'Validate',
        heading: 'Test & Validation Suite',
        icon: iconValidate(),
        body: `
          <ul class="checklist">
            <li>Unit: <code>auth.middleware.test.js</code> — blocklisted JTI returns 401.</li>
            <li>Unit: valid JTI not in blocklist passes through.</li>
            <li>Integration: full logout → replay cycle returns 401 within TTL window.</li>
            <li>Integration: token still works before logout.</li>
            <li>Security: expired token still returns 401 (regression guard).</li>
          </ul>
          <div class="code-block"><span class="cmt">// tests/auth.integration.test.js</span>
<span class="fn">it</span>(<span class="str">'rejects replayed token after logout'</span>, <span class="kw">async</span> () => {
  <span class="kw">const</span> { token } = <span class="kw">await</span> <span class="fn">login</span>(testUser);
  <span class="kw">await</span> <span class="fn">logout</span>(token);
  <span class="kw">const</span> res = <span class="kw">await</span> api.<span class="fn">get</span>(<span class="str">'/api/profile'</span>)
    .<span class="fn">set</span>(<span class="str">'Authorization'</span>, <span class="str">\`Bearer \${token}\`</span>);
  <span class="fn">expect</span>(res.status).<span class="fn">toBe</span>(<span class="num">401</span>);
});</div>`,
      },
    ],
    pr: {
      rootCause:
        'JWT revocation was never implemented. The middleware validates only cryptographic signature and expiry, so any captured token remains valid until its TTL expires. Logout only clears the browser cookie without persisting revocation state server-side.',
      files: [
        'src/middleware/auth.js',
        'src/services/auth.service.js',
        'src/routes/auth.router.js',
        'src/config/redis.js',
        'tests/auth.integration.test.js',
      ],
      acceptance: [
        'POST /auth/logout responds 204 and adds JTI to Redis blocklist.',
        'Replaying a logged-out token against any protected route returns 401.',
        'All existing auth tests remain green.',
        'Redis blocklist entry expires automatically at token TTL.',
      ],
      tests: 'jest --testPathPattern=auth --coverage (target ≥ 90 % branch coverage on auth.js)',
    },
  };
}

// ── Template: Performance ─────────────────────────────────────────
function perfPlan(title, severity, env) {
  return {
    stages: [
      {
        label: 'Reproduce',
        heading: 'Reproduction Steps',
        icon: iconReproduce(),
        body: `
          <ul class="checklist">
            <li>Seed the local DB: <code>npm run db:seed -- --projects 200</code>.</li>
            <li>Open the dashboard route and record the network waterfall in DevTools.</li>
            <li>Enable Sequelize query logging: <code>logging: console.log</code> in <code>db.config.js</code>.</li>
            <li class="warn">Observe 200+ individual <code>SELECT * FROM users WHERE id = ?</code> queries in the console.</li>
            <li>Measure: cold-cache load > 8 s. Warm-cache: ~1.2 s (still unacceptable).</li>
          </ul>
          <div class="code-block"><span class="cmt">-- Representative slow query log excerpt</span>
<span class="kw">SELECT</span> * <span class="kw">FROM</span> users <span class="kw">WHERE</span> id = <span class="num">7</span>;  <span class="cmt">-- 4 ms</span>
<span class="kw">SELECT</span> * <span class="kw">FROM</span> users <span class="kw">WHERE</span> id = <span class="num">8</span>;  <span class="cmt">-- 3 ms</span>
<span class="cmt">-- ... repeated 214 times</span></div>`,
      },
      {
        label: 'Diagnose',
        heading: 'Root-Cause Diagnosis',
        icon: iconDiagnose(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;">The <code>ProjectsController.list()</code> first fetches all projects, then lazily accesses <code>project.owner</code> in a template loop, triggering one DB round-trip per project — a classic <strong>N+1 query</strong> problem.</p>
          <div class="code-block"><span class="cmt">// src/controllers/projects.controller.js (current)</span>
<span class="kw">const</span> projects = <span class="kw">await</span> Project.<span class="fn">findAll</span>(); <span class="cmt">// 1 query</span>
<span class="kw">for</span> (<span class="kw">const</span> p <span class="kw">of</span> projects) {
  p.ownerName = (<span class="kw">await</span> p.<span class="fn">getOwner</span>()).name; <span class="cmt">// N queries ← BUG</span>
}</div>
          <hr class="divider"/>
          <ul class="checklist">
            <li>Missing <code>include: [User]</code> eager-load option in <code>findAll</code>.</li>
            <li>No query-result cache (Redis) for the projects list.</li>
            <li>Database index on <code>projects.owner_id</code> absent (confirmed via <code>EXPLAIN ANALYZE</code>).</li>
          </ul>`,
      },
      {
        label: 'Fix Plan',
        heading: 'Structured Fix Plan',
        icon: iconFix(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;"><strong>Strategy:</strong> Replace lazy-load loop with a single JOIN query using Sequelize eager loading, add a DB index, and introduce a short-lived Redis cache for the list endpoint.</p>
          <ol class="num-list">
            <li>Replace <code>Project.findAll()</code> with <code>Project.findAll({ include: [{ model: User, as: 'owner' }] })</code>.</li>
            <li>Add migration: <code>CREATE INDEX idx_projects_owner_id ON projects(owner_id);</code></li>
            <li>Wrap the controller response in a 30-second Redis cache key <code>projects:list</code>.</li>
            <li>Remove the <code>getOwner()</code> loop from the controller.</li>
          </ol>
          <div class="code-block"><span class="cmt">// src/controllers/projects.controller.js (fixed)</span>
<span class="kw">const</span> cacheKey = <span class="str">'projects:list'</span>;
<span class="kw">const</span> cached = <span class="kw">await</span> redis.<span class="fn">get</span>(cacheKey);
<span class="kw">if</span> (cached) <span class="kw">return</span> res.<span class="fn">json</span>(<span class="fn">JSON.parse</span>(cached));

<span class="kw">const</span> projects = <span class="kw">await</span> Project.<span class="fn">findAll</span>({
  include: [{ model: User, as: <span class="str">'owner'</span>, attributes: [<span class="str">'id'</span>, <span class="str">'name'</span>] }],
});
<span class="kw">await</span> redis.<span class="fn">setex</span>(cacheKey, <span class="num">30</span>, <span class="fn">JSON.stringify</span>(projects));
res.<span class="fn">json</span>(projects);</div>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.5rem;">Estimated effort: <strong>1–2 h</strong> · Risk: Low</p>`,
      },
      {
        label: 'Validate',
        heading: 'Test & Validation Suite',
        icon: iconValidate(),
        body: `
          <ul class="checklist">
            <li>Integration: confirm single SQL query emitted for <code>GET /api/projects</code>.</li>
            <li>Performance: p95 response ≤ 120 ms with 200 seeded projects.</li>
            <li>Cache: second request within 30 s served from Redis (no DB hit).</li>
            <li>Cache invalidation: creating a project clears <code>projects:list</code>.</li>
          </ul>
          <div class="code-block"><span class="cmt">// tests/projects.perf.test.js</span>
<span class="fn">it</span>(<span class="str">'fetches 200 projects in a single query'</span>, <span class="kw">async</span> () => {
  <span class="kw">const</span> queries = [];
  sequelize.addHook(<span class="str">'beforeQuery'</span>, sql => queries.<span class="fn">push</span>(sql));
  <span class="kw">await</span> api.<span class="fn">get</span>(<span class="str">'/api/projects'</span>);
  <span class="fn">expect</span>(queries.length).<span class="fn">toBeLessThanOrEqual</span>(<span class="num">2</span>); <span class="cmt">// 1 JOIN + cache</span>
});</div>`,
      },
    ],
    pr: {
      rootCause:
        'ProjectsController.list() triggers an N+1 query pattern: one initial SELECT for all projects followed by one SELECT per project to resolve its owner. With 200+ projects this produces 200+ round-trips and 8+ second load times on cold cache.',
      files: [
        'src/controllers/projects.controller.js',
        'src/models/project.model.js',
        'db/migrations/YYYYMMDD_add_owner_id_index.js',
        'src/config/redis.js',
        'tests/projects.perf.test.js',
      ],
      acceptance: [
        'GET /api/projects emits ≤ 2 SQL queries regardless of project count.',
        'Cold-cache p95 response time ≤ 200 ms with 200 projects.',
        'Cache hit rate ≥ 80 % under normal load (30 s TTL).',
        'All existing project CRUD tests remain green.',
      ],
      tests: 'jest --testPathPattern=projects --verbose && k6 run perf/dashboard.k6.js',
    },
  };
}

// ── Template: UI / CSS ────────────────────────────────────────────
function uiPlan(title, severity, env) {
  return {
    stages: [
      {
        label: 'Reproduce',
        heading: 'Reproduction Steps',
        icon: iconReproduce(),
        body: `
          <ul class="checklist">
            <li>Open the app on a viewport ≤ 400 px (Chrome DevTools → 390 × 844 iPhone 14 preset).</li>
            <li>Click the user-profile avatar in the top-right corner.</li>
            <li class="warn">The dropdown appears but the right edge and "Sign out" option are cut off by the viewport boundary.</li>
            <li>Scroll inside the dropdown is not possible — item is unreachable.</li>
            <li>Reproducible on iOS Safari 17 and Android Chrome 124; fine on desktop.</li>
          </ul>
          <div class="code-block"><span class="cmt">/* DevTools console: element bounding rect */</span>
document.<span class="fn">querySelector</span>(<span class="str">'.profile-dropdown'</span>).<span class="fn">getBoundingClientRect</span>()
<span class="cmt">// → { left: 310, right: 430, width: 120 }  (viewport width: 390)</span>
<span class="cmt">// right (430) > viewport (390) — 40 px overflow</span></div>`,
      },
      {
        label: 'Diagnose',
        heading: 'Root-Cause Diagnosis',
        icon: iconDiagnose(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;">The dropdown is positioned with <code>left: 0</code> relative to the avatar, which places it off-screen on narrow viewports. No <code>right</code>-anchor or viewport-overflow guard exists.</p>
          <div class="code-block"><span class="cmt">/* src/components/ProfileMenu.css (current) */</span>
.<span class="fn">profile-dropdown</span> {
  position: absolute;
  top: 100%;
  left: <span class="num">0</span>;          <span class="cmt">/* ← expands rightward, clips on small screens */</span>
  min-width: <span class="num">180px</span>;
  z-index: <span class="num">50</span>;
}</div>
          <hr class="divider"/>
          <ul class="checklist">
            <li>Absolute positioning anchored to <code>left: 0</code> of parent, no right-side clamp.</li>
            <li>Parent container uses <code>overflow: visible</code> — browser never clips it.</li>
            <li>No responsive CSS or JS position correction on narrow viewports.</li>
          </ul>`,
      },
      {
        label: 'Fix Plan',
        heading: 'Structured Fix Plan',
        icon: iconFix(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;"><strong>Strategy:</strong> Anchor the dropdown to the <em>right</em> edge of its parent instead of the left. Add a <code>max-width</code> and a viewport-clamp media query as a safety net.</p>
          <ol class="num-list">
            <li>Change <code>left: 0</code> to <code>right: 0</code> in <code>ProfileMenu.css</code>.</li>
            <li>Add <code>max-width: calc(100vw - 1rem)</code> to prevent overshooting on very narrow screens.</li>
            <li>Add <code>overflow-y: auto; max-height: 80vh</code> so the list scrolls if it's taller than the screen.</li>
          </ol>
          <div class="code-block"><span class="cmt">/* src/components/ProfileMenu.css (fixed) */</span>
.<span class="fn">profile-dropdown</span> {
  position: absolute;
  top: 100%;
  right: <span class="num">0</span>;                         <span class="cmt">/* ← anchor to right edge */</span>
  left: auto;
  min-width: <span class="num">180px</span>;
  max-width: <span class="fn">calc</span>(<span class="num">100vw</span> - <span class="num">1rem</span>);  <span class="cmt">/* ← viewport clamp */</span>
  max-height: <span class="num">80vh</span>;
  overflow-y: auto;
  z-index: <span class="num">50</span>;
}</div>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.5rem;">Estimated effort: <strong>30 min</strong> · Risk: Very low (CSS-only)</p>`,
      },
      {
        label: 'Validate',
        heading: 'Test & Validation Suite',
        icon: iconValidate(),
        body: `
          <ul class="checklist">
            <li>Visual regression: Storybook snapshot for <code>ProfileMenu</code> at 390 px, 768 px, 1440 px.</li>
            <li>E2E (Playwright): open dropdown on mobile viewport, assert "Sign out" is visible and clickable.</li>
            <li>Cross-browser: iOS Safari 17, Android Chrome 124, Firefox 125.</li>
            <li>No overflow: <code>getBoundingClientRect().right ≤ window.innerWidth</code>.</li>
          </ul>
          <div class="code-block"><span class="cmt">// tests/e2e/profileMenu.spec.ts</span>
<span class="fn">test</span>(<span class="str">'dropdown stays in viewport on 390 px'</span>, <span class="kw">async</span> ({ page }) => {
  <span class="kw">await</span> page.<span class="fn">setViewportSize</span>({ width: <span class="num">390</span>, height: <span class="num">844</span> });
  <span class="kw">await</span> page.<span class="fn">click</span>(<span class="str">'.profile-avatar'</span>);
  <span class="kw">const</span> box = <span class="kw">await</span> page.<span class="fn">locator</span>(<span class="str">'.profile-dropdown'</span>).<span class="fn">boundingBox</span>();
  <span class="fn">expect</span>(box.x + box.width).<span class="fn">toBeLessThanOrEqual</span>(<span class="num">390</span>);
});</div>`,
      },
    ],
    pr: {
      rootCause:
        'ProfileMenu dropdown is absolutely positioned with left: 0, causing it to extend rightward and overflow the viewport on screens narrower than ~400 px. No viewport overflow guard or right-anchor was in place.',
      files: [
        'src/components/ProfileMenu.css',
        'src/components/ProfileMenu.tsx',
        'tests/e2e/profileMenu.spec.ts',
        'tests/storybook/ProfileMenu.stories.tsx',
      ],
      acceptance: [
        'Dropdown is fully visible on viewports from 320 px to 2560 px.',
        '"Sign out" option is reachable and clickable on iOS Safari 17.',
        'Playwright E2E passes on all three target browsers.',
        'No horizontal scrollbar introduced on any page.',
      ],
      tests: 'npx playwright test profileMenu --project=chromium,webkit,firefox',
    },
  };
}

// ── Template: Database generic ────────────────────────────────────
function dbPlan(title, severity, env) {
  return genericPlan(title, severity, env, 'database');
}
function fePlan(title, severity, env) {
  return genericPlan(title, severity, env, 'frontend');
}

// ── Template: Generic fallback ────────────────────────────────────
function genericPlan(title, severity, env, type = 'backend') {
  const layer = { database: 'data layer', frontend: 'UI layer', backend: 'service layer' }[type] || 'service layer';
  return {
    stages: [
      {
        label: 'Reproduce',
        heading: 'Reproduction Steps',
        icon: iconReproduce(),
        body: `
          <ul class="checklist">
            <li>Pull the latest <code>main</code> branch and install dependencies.</li>
            <li>Configure environment: <code>cp .env.example .env</code> and set required variables.</li>
            <li>Run the application locally: <code>npm run dev</code>.</li>
            <li>Follow the described steps in the bug report to trigger the issue.</li>
            <li class="warn">Confirm the behaviour diverges from the expected outcome.</li>
          </ul>
          <div class="code-block"><span class="cmt"># Capture debug output</span>
DEBUG=* npm run dev <span class="num">2</span>&gt;&amp;<span class="num">1</span> | tee /tmp/debug.log
<span class="cmt"># Then grep for errors</span>
grep -i error /tmp/debug.log</div>`,
      },
      {
        label: 'Diagnose',
        heading: 'Root-Cause Diagnosis',
        icon: iconDiagnose(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;">Based on the report, the defect originates in the <strong>${layer}</strong>. Initial investigation suggests a missing guard condition or an unhandled edge case during normal operation.</p>
          <hr class="divider"/>
          <ul class="checklist">
            <li>Add targeted logging or a debugger breakpoint at the suspected call site.</li>
            <li>Inspect state/payload at the point of failure to confirm the hypothesis.</li>
            <li class="warn">Verify no related issue exists in open PRs or the issue tracker.</li>
          </ul>`,
      },
      {
        label: 'Fix Plan',
        heading: 'Structured Fix Plan',
        icon: iconFix(),
        body: `
          <p style="font-size:.88rem;margin-bottom:.85rem;"><strong>Strategy:</strong> Apply a minimal, targeted patch to the identified code path. Avoid broad refactors to reduce regression risk.</p>
          <ol class="num-list">
            <li>Identify the exact file and function responsible — use git blame and stack traces.</li>
            <li>Implement the guard condition or correct the logic error.</li>
            <li>Add an inline comment referencing this issue number for traceability.</li>
            <li>Update or add unit tests to cover the failing scenario.</li>
          </ol>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.85rem;">Estimated effort: <strong>2–4 h</strong> · Risk: Low (targeted patch)</p>`,
      },
      {
        label: 'Validate',
        heading: 'Test & Validation Suite',
        icon: iconValidate(),
        body: `
          <ul class="checklist">
            <li>Unit test covering the exact failing scenario added and passing.</li>
            <li>All pre-existing tests remain green (<code>npm test</code>).</li>
            <li>Manual verification against the reproduction steps confirms resolution.</li>
            <li>Code reviewed by at least one peer before merge.</li>
          </ul>
          <div class="code-block"><span class="cmt"># Run full test suite</span>
npm test -- --coverage
<span class="cmt"># Verify no regressions</span>
npm run lint && npm run typecheck</div>`,
      },
    ],
    pr: {
      rootCause:
        `The defect is located in the application's ${layer}. A missing validation or guard condition allows an edge case to propagate, producing the observed incorrect behaviour described in the bug report.`,
      files: [
        'src/controllers/<relevant>.controller.js',
        'src/services/<relevant>.service.js',
        'tests/<relevant>.test.js',
      ],
      acceptance: [
        'The originally reported steps no longer reproduce the bug.',
        'All existing tests remain green after the change.',
        'New unit test added that directly exercises the fixed code path.',
        'No new lint or typecheck warnings introduced.',
      ],
      tests: 'npm test -- --coverage && npm run lint',
    },
  };
}

// ── SVG icon helpers ───────────────────────────────────────────────
function iconReproduce() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
}
function iconDiagnose() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>`;
}
function iconFix() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}
function iconValidate() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
}

// ── DOM helpers ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showToast(msg, duration = 2400) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function severityBadgeClass(s) {
  return { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }[s] || 'badge-version';
}
function severityLabel(s) {
  return { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' }[s] || s;
}

// ── Workflow state ─────────────────────────────────────────────────
let currentStage = 0;
let stagesVisited = new Set();
let planData = null;

function renderStage(idx) {
  currentStage = idx;
  stagesVisited.add(idx);

  const stage = planData.stages[idx];
  const content = $('stageContent');
  content.innerHTML = `
    <h3>${stage.icon} ${stage.heading}</h3>
    ${stage.body}
    <div class="stage-nav">
      ${idx > 0 ? `<button class="btn btn-secondary" id="prevBtn">← Back</button>` : ''}
      ${idx < planData.stages.length - 1
        ? `<button class="btn btn-primary" id="nextBtn">Next →</button>`
        : `<button class="btn btn-primary" id="nextBtn">View PR Summary ✓</button>`}
    </div>`;

  // Update tab states
  document.querySelectorAll('.stage-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
    if (stagesVisited.has(i) && i !== idx) tab.classList.add('done');
    else if (i !== idx) tab.classList.remove('done');
  });

  content.style.animation = 'none';
  requestAnimationFrame(() => { content.style.animation = ''; });

  // Wire nav buttons
  const nextBtn = $('nextBtn');
  const prevBtn = $('prevBtn');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (idx < planData.stages.length - 1) {
      renderStage(idx + 1);
    } else {
      renderPRSummary();
    }
  });
  if (prevBtn) prevBtn.addEventListener('click', () => renderStage(idx - 1));
}

function renderPRSummary() {
  const pr = planData.pr;
  const summary = $('prSummary');
  const content = $('prSummaryContent');

  content.innerHTML = `
    <div class="pr-section">
      <div class="pr-section-label">Likely Root Cause</div>
      <p>${pr.rootCause}</p>
    </div>
    <div class="pr-section">
      <div class="pr-section-label">Suggested Changed Files</div>
      <div class="file-chips">
        ${pr.files.map(f => `<span class="file-chip">${f}</span>`).join('')}
      </div>
    </div>
    <div class="pr-section">
      <div class="pr-section-label">Acceptance Criteria</div>
      <ul class="ac-list">
        ${pr.acceptance.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
    <div class="pr-section">
      <div class="pr-section-label">Test Command</div>
      <div class="code-block">${pr.tests}</div>
    </div>`;

  summary.hidden = false;
  summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Mark all tabs done
  document.querySelectorAll('.stage-tab').forEach(t => t.classList.add('done'));
}

function buildPRText() {
  const pr = planData.pr;
  const title = $('wfTitle').textContent;
  const sev = document.querySelector('#wfSeverityBadge').textContent;
  return [
    `## ${title}  [${sev}]`,
    '',
    '### Root Cause',
    pr.rootCause,
    '',
    '### Files Changed',
    pr.files.map(f => `- \`${f}\``).join('\n'),
    '',
    '### Acceptance Criteria',
    pr.acceptance.map(a => `- [ ] ${a}`).join('\n'),
    '',
    '### Test Command',
    '```',
    pr.tests,
    '```',
  ].join('\n');
}

// ── Main analysis flow ─────────────────────────────────────────────
function runAnalysis(title, severity, description, environment) {
  const btn = $('analyzeBtn');
  btn.classList.add('loading');
  btn.textContent = ' Analyzing…';

  // Simulate async analysis (1.4 s)
  setTimeout(() => {
    btn.classList.remove('loading');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
      Analyze Issue`;

    planData = generateStages(title, severity, description, environment);
    currentStage = 0;
    stagesVisited = new Set();

    // Show workflow area
    $('emptyState').hidden = true;
    $('prSummary').hidden = true;
    const wf = $('workflow');
    wf.hidden = false;

    // Set header
    $('wfTitle').textContent = title;
    const badge = $('wfSeverityBadge');
    badge.textContent = severityLabel(severity);
    badge.className = `badge ${severityBadgeClass(severity)}`;

    renderStage(0);
    showToast('✓ Analysis complete — 4 stages generated');
  }, 1400);
}

// ── Event wiring ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Form submit
  $('bugForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('bugTitle').value.trim();
    const severity = $('bugSeverity').value;
    const description = $('bugDescription').value.trim();
    const environment = $('bugEnvironment').value.trim();

    if (!title || !severity || !description) {
      showToast('⚠ Please fill in Title, Severity, and Description.');
      return;
    }
    runAnalysis(title, severity, description, environment);
  });

  // Stage tab clicks
  document.querySelectorAll('.stage-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (!planData) return;
      renderStage(parseInt(tab.dataset.stage, 10));
    });
  });

  // Example quick-fill
  document.querySelectorAll('[data-example]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ex = EXAMPLES[btn.dataset.example];
      if (!ex) return;
      $('bugTitle').value       = ex.title;
      $('bugSeverity').value    = ex.severity;
      $('bugDescription').value = ex.description;
      $('bugEnvironment').value = ex.environment;
      showToast(`📋 Loaded "${ex.title.slice(0, 30)}…" — click Analyze Issue`);
    });
  });

  // Copy PR summary
  $('copyBtn').addEventListener('click', () => {
    if (!planData) return;
    const text = buildPRText();
    navigator.clipboard.writeText(text)
      .then(() => showToast('✓ PR summary copied to clipboard'))
      .catch(() => {
        // Fallback for non-HTTPS
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('✓ PR summary copied (fallback)');
      });
  });

});
