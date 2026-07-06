# Plan 1 — Environnement IA par stack (fondations framework) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le générateur (`setup.mjs`) préconfigure chaque projet, selon sa stack, avec un manifeste de capacités framework écrit en déclaratif : MCP mergé, hooks de checks (warn-only), `docs/SETUP-AI.md`, scripts npm — plus `/doctor` étendu et corrections repo.

**Architecture :** Un objet données `STACKS` (source unique) dans `matrix.mjs` → des writers purs et testables (`mcp.mjs`, `hooks.mjs`, `setup-ai.mjs`) orchestrés par `environment.mjs` → appelés par `setup.mjs`. Un runner de checks défensif (`templates/hooks/framework/checks.mjs`) copié dans chaque projet. Tout est additif et non destructif ; les checks framework sont **warn-only** (seul le scan secrets reste bloquant).

**Tech Stack :** Node.js ESM, `node --test` (zéro dépendance externe), macOS/Linux.

## Global Constraints

- Node ≥ 20.12 ; ESM (`import`/`export`) ; **zéro dépendance externe** (tests via `node:test` + `node:assert/strict`).
- Le binaire `node` du shell peut être un wrapper nvm cassé (`_nvm_lazy_load`/`FUNCNEST`). En cas d'échec, utiliser `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.
- Style existant : fichiers courts, français dans les messages/commentaires, code identifiers en anglais. Suivre `scripts/lib/*.mjs`.
- Format `.mcp.json` (et `.cursor/mcp.json`) : `{ "mcpServers": { "<name>": {"command","args"} | {"type":"http","url"} } }`. `needsAuth` est une **méta interne au manifeste**, jamais écrite dans le fichier.
- Hooks framework = **warn-only** (exit 0). Scan secrets (`.githooks/pre-commit`) = **bloquant** (inchangé).
- Ids de checks connus : `typecheck`, `lint`, `lint-expo`, `deps-check`, `doctor`, `security`.
- Commits fréquents, un par tâche. Terminer chaque tâche de code par `node --test` (suite entière verte).

---

### Task 1 : Manifeste `STACKS` + `resolveStackManifest` (matrix.mjs)

**Files:**
- Modify: `scripts/lib/matrix.mjs` (exporter `DESIGN_SKILLS` ligne 7 ; retirer la copie `.mcp.json` de `resolveAssets` ; ajouter `STACKS` + `resolveStackManifest` en fin de fichier)
- Modify: `scripts/lib/matrix.test.mjs` (retirer l'assertion `.cursor/mcp.json`)
- Test: `scripts/lib/matrix-manifest.test.mjs` (nouveau)

**Interfaces:**
- Produces: `export const STACKS` ; `export function resolveStackManifest(stack, assistant)` → `{ plugins: [{name,cmd}], mcp: {<name>:cfg}, skills: [{name,cmd}], checks: {onEdit:[],preCommit:[],prePush:[]}, scripts: {<k>:<v>}, rules: [{label,url}] }` ; `export const DESIGN_SKILLS` (string).
- Consumes: rien.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/matrix-manifest.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACKS, resolveStackManifest, DESIGN_SKILLS } from './matrix.mjs';

test('STACKS a les 3 stacks avec la bonne forme', () => {
  for (const s of ['saas', 'mobile', 'desktop']) {
    assert.ok(STACKS[s], `stack ${s} présente`);
    assert.ok(STACKS[s].mcp && typeof STACKS[s].mcp === 'object');
    assert.ok(Array.isArray(STACKS[s].checks.preCommit));
  }
});

test('resolveStackManifest(saas, claude-code) : plugin convex + MCP shadcn + lint en preCommit', () => {
  const m = resolveStackManifest('saas', 'claude-code');
  assert.ok(m.plugins.some((p) => p.cmd.includes('convex@claude-plugins-official')));
  assert.ok('shadcn' in m.mcp);
  assert.ok(m.checks.preCommit.includes('lint'));
  assert.equal(m.scripts.typecheck, 'tsc --noEmit');
});

test('resolveStackManifest(mobile, cursor) : pas de plugin cursor, MCP expo avec needsAuth, lint-expo', () => {
  const m = resolveStackManifest('mobile', 'cursor');
  assert.deepEqual(m.plugins, []);
  assert.equal(m.mcp.expo.needsAuth, true);
  assert.ok(m.checks.preCommit.includes('lint-expo'));
});

test('resolveStackManifest(desktop, claude-code) : MCP chrome-devtools, security en prePush', () => {
  const m = resolveStackManifest('desktop', 'claude-code');
  assert.ok('chrome-devtools' in m.mcp);
  assert.ok(m.checks.prePush.includes('security'));
});

test('stack inconnue → throw', () => {
  assert.throws(() => resolveStackManifest('flutter', 'cursor'), /Stack inconnue/);
});

test('DESIGN_SKILLS liste les 5 skills design', () => {
  assert.match(DESIGN_SKILLS, /frontend-design/);
  assert.match(DESIGN_SKILLS, /shadcnblocks/);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/matrix-manifest.test.mjs`
Expected: FAIL (`STACKS`/`resolveStackManifest`/`DESIGN_SKILLS` non exportés).

- [ ] **Step 3 : Exporter `DESIGN_SKILLS` et retirer la copie `.mcp.json`**

Dans `scripts/lib/matrix.mjs` ligne 7, remplacer :
```js
const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
```
par :
```js
export const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
```

Puis **supprimer** la ligne (dans `resolveAssets`) :
```js
  if (stack !== 'desktop') copies.push({ from: `.mcp.json`, to: isCursor ? `.cursor/mcp.json` : `.mcp.json`, transform: 'raw' });
```
(La config MCP sera désormais écrite par `environment.mjs` depuis le manifeste, par stack — évite d'embarquer le serveur `expo` dans un projet SaaS.)

- [ ] **Step 4 : Ajouter `STACKS` + `resolveStackManifest` en fin de `scripts/lib/matrix.mjs`**

```js
export const STACKS = {
  saas: {
    plugins: {
      'claude-code': [{ name: 'convex', cmd: '/plugin install convex@claude-plugins-official' }],
      cursor: [{ name: 'convex-agent-plugins', cmd: 'git clone https://github.com/get-convex/convex-agent-plugins ~/.cursor/plugins/convex-agent-plugins' }],
      codex: [],
    },
    mcp: {
      convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] },
      'better-auth': { type: 'http', url: 'https://mcp.better-auth.com/mcp' },
      shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] },
    },
    skills: [
      { name: 'better-auth', cmd: 'npx skills add better-auth/skills' },
      { name: 'convex-agent-skills', cmd: 'npx skills add get-convex/agent-skills --all' },
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: [] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
      { label: 'TanStack Start llms', url: 'https://tanstack.com/start/latest/llms.txt' },
      { label: 'Better Auth llms', url: 'https://better-auth.com/llms.txt' },
    ],
  },
  mobile: {
    plugins: {
      'claude-code': [
        { name: 'expo', cmd: 'claude plugin install expo@claude-plugins-official' },
        { name: 'convex', cmd: '/plugin install convex@claude-plugins-official' },
      ],
      cursor: [],
      codex: [{ name: 'expo', cmd: 'codex plugin add expo@openai-curated' }],
    },
    mcp: {
      convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] },
      expo: { type: 'http', url: 'https://mcp.expo.dev/mcp', needsAuth: true },
    },
    skills: [
      { name: 'expo', cmd: 'npx skills add expo/skills' },
      { name: 'convex-agent-skills', cmd: 'npx skills add get-convex/agent-skills --all' },
    ],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint-expo', 'deps-check'], prePush: ['doctor'] },
    scripts: { typecheck: 'tsc --noEmit' },
    rules: [
      { label: 'Expo llms', url: 'https://docs.expo.dev/llms.txt' },
      { label: 'React Native llms', url: 'https://reactnative.dev/llms.txt' },
      { label: 'Convex rules', url: 'https://convex.link/convex_rules.txt' },
    ],
  },
  desktop: {
    plugins: {
      'claude-code': [{ name: 'electron', cmd: 'claude plugin marketplace add ohvignas/claude-electron-skills && claude plugin install electron@claude-electron-skills' }],
      cursor: [],
      codex: [],
    },
    mcp: {
      'chrome-devtools': { command: 'npx', args: ['chrome-devtools-mcp@latest', '--browser-url=http://127.0.0.1:9222'] },
    },
    skills: [],
    checks: { onEdit: ['typecheck'], preCommit: ['typecheck', 'lint'], prePush: ['security'] },
    scripts: { typecheck: 'tsc --noEmit', lint: 'biome check .' },
    rules: [
      { label: 'Electron security checklist', url: 'https://www.electronjs.org/docs/latest/tutorial/security' },
      { label: 'Electron docs', url: 'https://www.electronjs.org/docs/latest' },
    ],
  },
};

export function resolveStackManifest(stack, assistant) {
  const s = STACKS[stack];
  if (!s) throw new Error(`Stack inconnue : ${stack} (attendu: ${Object.keys(STACKS).join('|')})`);
  return {
    plugins: s.plugins[assistant] ?? [],
    mcp: s.mcp,
    skills: s.skills,
    checks: s.checks,
    scripts: s.scripts,
    rules: s.rules,
  };
}
```

- [ ] **Step 5 : Mettre à jour `scripts/lib/matrix.test.mjs`** — retirer la ligne 8 (l'assertion sur `.cursor/mcp.json` n'a plus lieu d'être) :

Supprimer :
```js
  assert.ok(p.copies.find(c => c.to === '.cursor/mcp.json'));
```
Et dans le titre du 1er test, retirer « MCP cursor, » pour rester exact :
```js
test('SaaS + Cursor : mdc stack, 2 clones, commandsDir cursor, pas de bmad', () => {
```

- [ ] **Step 6 : Lancer les tests, vérifier le succès**

Run: `node --test scripts/lib/matrix-manifest.test.mjs scripts/lib/matrix.test.mjs`
Expected: PASS (tous).

- [ ] **Step 7 : Suite entière (régression)**

Run: `node --test`
Expected: PASS (aucune régression ; `validate.mjs` itère toujours les copies restantes sans erreur).

- [ ] **Step 8 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix.test.mjs scripts/lib/matrix-manifest.test.mjs
git commit -m "feat(matrix): manifeste STACKS + resolveStackManifest par stack"
```

---

### Task 2 : Merge MCP non destructif (`mcp.mjs`)

**Files:**
- Create: `scripts/lib/mcp.mjs`
- Test: `scripts/lib/mcp.test.mjs`

**Interfaces:**
- Produces: `export function mergeMcpConfig(existingJson: string|null, mcpServers: object) → string` (JSON `.mcp.json` mergé, `needsAuth` retiré, `\n` final).
- Consumes: rien.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/mcp.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMcpConfig } from './mcp.mjs';

test('crée depuis rien', () => {
  const out = mergeMcpConfig(null, { convex: { command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] } });
  const j = JSON.parse(out);
  assert.deepEqual(j.mcpServers.convex.args, ['-y', 'convex@latest', 'mcp', 'start']);
});

test('préserve un serveur existant, ajoute le nouveau', () => {
  const existing = JSON.stringify({ mcpServers: { convex: { command: 'npx', args: ['keep'] } } });
  const out = mergeMcpConfig(existing, { convex: { command: 'npx', args: ['IGNORE'] }, shadcn: { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'] } });
  const j = JSON.parse(out);
  assert.deepEqual(j.mcpServers.convex.args, ['keep'], 'ne réécrit pas l’existant');
  assert.ok(j.mcpServers.shadcn, 'ajoute le nouveau');
});

test('retire la méta needsAuth du fichier écrit', () => {
  const out = mergeMcpConfig(null, { expo: { type: 'http', url: 'https://mcp.expo.dev/mcp', needsAuth: true } });
  const j = JSON.parse(out);
  assert.equal(j.mcpServers.expo.url, 'https://mcp.expo.dev/mcp');
  assert.equal('needsAuth' in j.mcpServers.expo, false);
});

test('idempotent', () => {
  const servers = { convex: { command: 'npx', args: ['a'] } };
  const once = mergeMcpConfig(null, servers);
  const twice = mergeMcpConfig(once, servers);
  assert.equal(once, twice);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/mcp.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/mcp.mjs`**

```js
// Merge non destructif de config MCP (.mcp.json / .cursor/mcp.json).
// Ne réécrit jamais un serveur déjà présent. Retire la méta interne `needsAuth`.
export function mergeMcpConfig(existingJson, mcpServers) {
  const base = existingJson ? JSON.parse(existingJson) : {};
  const servers = { ...(base.mcpServers || {}) };
  for (const [name, cfg] of Object.entries(mcpServers)) {
    if (!(name in servers)) {
      const { needsAuth, ...rest } = cfg;
      servers[name] = rest;
    }
  }
  base.mcpServers = servers;
  return JSON.stringify(base, null, 2) + '\n';
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/mcp.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/mcp.mjs scripts/lib/mcp.test.mjs
git commit -m "feat(mcp): merge non destructif de config MCP"
```

---

### Task 3 : Runner de checks défensif (`templates/hooks/framework/checks.mjs`)

**Files:**
- Create: `templates/hooks/framework/checks.mjs`
- Test: `scripts/lib/checks.test.mjs`

**Interfaces:**
- Produces: `export const CHECKS` (registre id→{cmd,needs}) ; `export function selectChecks(ids, {cwd}) → [{id, willRun, cmd?, reason?}]` ; `export function runChecks(ids, {cwd}) → 0`.
- Consumes: rien. Copié tel quel dans `.githooks/checks.mjs` (Task 6). CLI : `node .githooks/checks.mjs <id...>`.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/checks.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectChecks, CHECKS } from '../../templates/hooks/framework/checks.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'checks-')); }

test('id inconnu → willRun false, raison inconnu', () => {
  const [r] = selectChecks(['nope'], { cwd: tmp() });
  assert.equal(r.willRun, false);
  assert.equal(r.reason, 'inconnu');
});

test('typecheck sauté si pas de tsconfig.json', () => {
  const [r] = selectChecks(['typecheck'], { cwd: tmp() });
  assert.equal(r.willRun, false);
  assert.match(r.reason, /tsconfig\.json/);
});

test('typecheck sélectionné si tsconfig.json présent', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'tsconfig.json'), '{}');
  const [r] = selectChecks(['typecheck'], { cwd: d });
  assert.equal(r.willRun, true);
  assert.deepEqual(r.cmd, ['npx', 'tsc', '--noEmit']);
});

test('le registre couvre les ids connus', () => {
  for (const id of ['typecheck', 'lint', 'lint-expo', 'deps-check', 'doctor', 'security']) {
    assert.ok(CHECKS[id], `check ${id} défini`);
  }
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/checks.test.mjs`
Expected: FAIL (fichier introuvable).

- [ ] **Step 3 : Implémenter `templates/hooks/framework/checks.mjs`**

```js
#!/usr/bin/env node
// Runner de checks vibe-stack — défensif et WARN-ONLY (exit 0 toujours).
// Skip proprement si l'outil/fichier n'est pas là (projet vide ou pré-scaffold).
// Usage : node .githooks/checks.mjs typecheck lint
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CHECKS = {
  typecheck:    { cmd: ['npx', 'tsc', '--noEmit'],                         needs: 'tsconfig.json' },
  lint:         { cmd: ['npx', 'biome', 'check', '.'],                     needs: 'biome.json' },
  'lint-expo':  { cmd: ['npx', 'expo', 'lint'],                            needs: 'app.json' },
  'deps-check': { cmd: ['npx', 'expo', 'install', '--check'],             needs: 'app.json' },
  doctor:       { cmd: ['npx', 'expo-doctor'],                            needs: 'app.json' },
  security:     { cmd: ['npx', '@doyensec/electronegativity', '-i', '.'], needs: 'package.json' },
};

export function selectChecks(ids, { cwd = process.cwd() } = {}) {
  return ids.map((id) => {
    const def = CHECKS[id];
    if (!def) return { id, willRun: false, reason: 'inconnu' };
    if (!fs.existsSync(path.join(cwd, def.needs))) return { id, willRun: false, reason: `absent: ${def.needs}` };
    return { id, willRun: true, cmd: def.cmd };
  });
}

export function runChecks(ids, { cwd = process.cwd() } = {}) {
  let warnings = 0;
  for (const c of selectChecks(ids, { cwd })) {
    if (!c.willRun) { console.log(`· check ${c.id} sauté (${c.reason})`); continue; }
    const r = spawnSync(c.cmd[0], c.cmd.slice(1), { cwd, stdio: 'inherit' });
    if (r.status !== 0) { warnings++; console.log(`⚠ check ${c.id} : problème détecté (non bloquant)`); }
  }
  if (warnings) console.log(`⚠ ${warnings} avertissement(s) — corrige quand tu peux (/doctor pour le bilan).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runChecks(process.argv.slice(2)));
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/checks.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Vérifier le comportement CLI défensif à la main**

Run: `node templates/hooks/framework/checks.mjs typecheck lint`
Expected: sortie `· check typecheck sauté (absent: tsconfig.json)` etc., **exit 0** (`echo $?` → `0`).

- [ ] **Step 6 : Commit**

```bash
git add templates/hooks/framework/checks.mjs scripts/lib/checks.test.mjs
git commit -m "feat(hooks): runner de checks défensif warn-only"
```

---

### Task 4 : Câblage des hooks (`hooks.mjs`)

**Files:**
- Create: `scripts/lib/hooks.mjs`
- Test: `scripts/lib/hooks.test.mjs`

**Interfaces:**
- Produces:
  - `export function extendCursorHooks(existingJson: string|null, onEditIds: string[]) → string`
  - `export function claudeSettings(existingJson: string|null, onEditIds: string[]) → string`
  - `export function prePushScript(prePushIds: string[]) → string`
  - `export function preCommitCheckLine(preCommitIds: string[]) → string`
- Convention commune : commande = `node .githooks/checks.mjs <ids...>`.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/hooks.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extendCursorHooks, claudeSettings, prePushScript, preCommitCheckLine } from './hooks.mjs';

test('extendCursorHooks ajoute un afterFileEdit checks, idempotent', () => {
  const start = JSON.stringify({ version: 1, hooks: { afterFileEdit: [{ command: 'node .cursor/hooks/log-edit.mjs', type: 'command' }] } });
  const once = extendCursorHooks(start, ['typecheck']);
  const j = JSON.parse(once);
  assert.equal(j.hooks.afterFileEdit.length, 2);
  assert.ok(j.hooks.afterFileEdit.some((h) => h.command === 'node .githooks/checks.mjs typecheck'));
  const twice = extendCursorHooks(once, ['typecheck']);
  assert.equal(JSON.parse(twice).hooks.afterFileEdit.length, 2, 'idempotent');
});

test('claudeSettings crée un PostToolUse Edit|Write', () => {
  const out = claudeSettings(null, ['typecheck']);
  const j = JSON.parse(out);
  const entry = j.hooks.PostToolUse[0];
  assert.equal(entry.matcher, 'Edit|Write');
  assert.equal(entry.hooks[0].command, 'node .githooks/checks.mjs typecheck');
});

test('prePushScript vide → true ; non vide → commande checks', () => {
  assert.match(prePushScript([]), /\ntrue\n/);
  assert.match(prePushScript(['security']), /node \.githooks\/checks\.mjs security/);
});

test('preCommitCheckLine', () => {
  assert.equal(preCommitCheckLine(['typecheck', 'lint']), 'node .githooks/checks.mjs typecheck lint');
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/hooks.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/hooks.mjs`**

```js
// Construit le câblage des hooks (Cursor / Claude Code / git) à partir des ids de checks.
// Toutes les commandes appellent le runner copié dans .githooks/checks.mjs.
const RUN = (ids) => `node .githooks/checks.mjs ${ids.join(' ')}`;

export function extendCursorHooks(existingJson, onEditIds) {
  const base = existingJson ? JSON.parse(existingJson) : { version: 1, hooks: {} };
  base.hooks = base.hooks || {};
  base.hooks.afterFileEdit = base.hooks.afterFileEdit || [];
  const cmd = RUN(onEditIds);
  if (!base.hooks.afterFileEdit.some((h) => h.command === cmd)) {
    base.hooks.afterFileEdit.push({ command: cmd, type: 'command' });
  }
  return JSON.stringify(base, null, 2) + '\n';
}

export function claudeSettings(existingJson, onEditIds) {
  const base = existingJson ? JSON.parse(existingJson) : {};
  base.hooks = base.hooks || {};
  base.hooks.PostToolUse = base.hooks.PostToolUse || [];
  const cmd = RUN(onEditIds);
  const already = base.hooks.PostToolUse.some((e) => (e.hooks || []).some((h) => h.command === cmd));
  if (!already) {
    base.hooks.PostToolUse.push({ matcher: 'Edit|Write', hooks: [{ type: 'command', command: cmd }] });
  }
  return JSON.stringify(base, null, 2) + '\n';
}

export function prePushScript(prePushIds) {
  const body = prePushIds.length ? RUN(prePushIds) : 'true';
  return `#!/usr/bin/env bash\n# Pre-push vibe-stack : checks plus lourds (non bloquants).\nset -e\n${body}\n`;
}

export function preCommitCheckLine(preCommitIds) {
  return RUN(preCommitIds);
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/hooks.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/hooks.mjs scripts/lib/hooks.test.mjs
git commit -m "feat(hooks): câblage Cursor/Claude/git depuis les ids de checks"
```

---

### Task 5 : Rendu `docs/SETUP-AI.md` (`setup-ai.mjs`)

**Files:**
- Create: `scripts/lib/setup-ai.mjs`
- Test: `scripts/lib/setup-ai.test.mjs`

**Interfaces:**
- Produces: `export function renderSetupAi({ stack, assistant, manifest, designSkills }) → string`.
- Consumes: `manifest` = sortie de `resolveStackManifest` ; `designSkills` = `DESIGN_SKILLS` (Task 1).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/setup-ai.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStackManifest, DESIGN_SKILLS } from './matrix.mjs';
import { renderSetupAi } from './setup-ai.mjs';

test('SaaS/claude-code : plugin, skills, MCP, design', () => {
  const md = renderSetupAi({ stack: 'saas', assistant: 'claude-code', manifest: resolveStackManifest('saas', 'claude-code'), designSkills: DESIGN_SKILLS });
  assert.match(md, /\/plugin install convex@claude-plugins-official/);
  assert.match(md, /npx skills add better-auth\/skills/);
  assert.match(md, /shadcn/);
  assert.match(md, /frontend-design/);
});

test('Mobile : MCP expo marqué login requis', () => {
  const md = renderSetupAi({ stack: 'mobile', assistant: 'claude-code', manifest: resolveStackManifest('mobile', 'claude-code'), designSkills: DESIGN_SKILLS });
  assert.match(md, /expo.*login requis/);
});

test('assistant sans plugin → mention aucun', () => {
  const md = renderSetupAi({ stack: 'saas', assistant: 'codex', manifest: resolveStackManifest('saas', 'codex'), designSkills: DESIGN_SKILLS });
  assert.match(md, /aucun plugin/i);
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/setup-ai.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/setup-ai.mjs`**

```js
// Rend docs/SETUP-AI.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/design).
export function renderSetupAi({ stack, assistant, manifest, designSkills }) {
  const L = [];
  L.push(`# Setup IA — stack ${stack} · assistant ${assistant}`);
  L.push('');
  L.push('Joue chaque case dans ton assistant IA. Coche au fur et à mesure.');
  L.push('');
  L.push('## 1. Plugins');
  if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})`);
  else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  L.push('');
  L.push('## 2. Skills portables');
  if (manifest.skills.length) for (const s of manifest.skills) L.push(`- [ ] ${s.cmd}`);
  else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : lance \`/mcp\` pour connecter${cfg.needsAuth ? ' (login requis)' : ' (déjà dans .mcp.json)'}`);
  }
  L.push('');
  L.push('## 4. Design (5 skills)');
  L.push(`- [ ] installe / active : ${designSkills}`);
  L.push('');
  L.push('## 5. Scripts package.json (à ajouter si absents après le scaffold)');
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/setup-ai.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/setup-ai.mjs scripts/lib/setup-ai.test.mjs
git commit -m "feat(setup-ai): rendu de docs/SETUP-AI.md depuis le manifeste"
```

---

### Task 6 : Orchestrateur `environment.mjs`

**Files:**
- Create: `scripts/lib/environment.mjs`
- Test: `scripts/lib/environment.test.mjs`

**Interfaces:**
- Produces: `export function writeStackEnvironment({ projectDir, source, stack, assistant, force }) → { done: string[], failed: string[] }`.
- Consumes: `resolveStackManifest`, `DESIGN_SKILLS` (matrix), `mergeMcpConfig` (mcp), `extendCursorHooks`/`claudeSettings`/`prePushScript`/`preCommitCheckLine` (hooks), `renderSetupAi` (setup-ai), `ensureDir` (fsops), `templates/hooks/framework/checks.mjs` (copié).

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/environment.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeStackEnvironment } from './environment.mjs';

function project() { return fs.mkdtempSync(path.join(os.tmpdir(), 'env-')); }
const SOURCE = process.cwd(); // la suite tourne à la racine du repo

test('SaaS/claude-code : MCP, checks.mjs, pre-push, settings, SETUP-AI', () => {
  const dir = project();
  const { done, failed } = writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  assert.deepEqual(failed, [], 'aucun échec');
  const mcp = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
  assert.ok(mcp.mcpServers.shadcn, 'MCP shadcn écrit');
  assert.ok(!('expo' in mcp.mcpServers), 'pas de serveur expo dans un projet SaaS');
  assert.ok(fs.existsSync(path.join(dir, '.githooks/checks.mjs')), 'runner copié');
  assert.ok(fs.existsSync(path.join(dir, '.githooks/pre-push')), 'pre-push écrit');
  const settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.hooks.PostToolUse[0].matcher, 'Edit|Write');
  const setup = fs.readFileSync(path.join(dir, 'docs/SETUP-AI.md'), 'utf8');
  assert.match(setup, /convex@claude-plugins-official/);
});

test('Cursor : écrit .cursor/mcp.json et étend .cursor/hooks.json', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cursor/hooks.json'), JSON.stringify({ version: 1, hooks: { afterFileEdit: [] } }));
  const { failed } = writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'cursor' });
  assert.deepEqual(failed, []);
  assert.ok(fs.existsSync(path.join(dir, '.cursor/mcp.json')));
  const hooks = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/hooks.json'), 'utf8'));
  assert.ok(hooks.hooks.afterFileEdit.some((h) => h.command === 'node .githooks/checks.mjs typecheck'));
});

test('pre-commit existant → ligne de checks ajoutée', () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.githooks/pre-commit'), '#!/usr/bin/env bash\nset -e\n');
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'desktop', assistant: 'claude-code' });
  const pc = fs.readFileSync(path.join(dir, '.githooks/pre-commit'), 'utf8');
  assert.match(pc, /node \.githooks\/checks\.mjs typecheck lint/);
});

test('package.json présent → scripts ajoutés sans écraser', () => {
  const dir = project();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'garde' } }));
  writeStackEnvironment({ projectDir: dir, source: SOURCE, stack: 'saas', assistant: 'claude-code' });
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.typecheck, 'garde', 'ne réécrit pas');
  assert.equal(pkg.scripts.lint, 'biome check .', 'ajoute le manquant');
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test scripts/lib/environment.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter `scripts/lib/environment.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { resolveStackManifest, DESIGN_SKILLS } from './matrix.mjs';
import { mergeMcpConfig } from './mcp.mjs';
import { extendCursorHooks, claudeSettings, prePushScript, preCommitCheckLine } from './hooks.mjs';
import { renderSetupAi } from './setup-ai.mjs';
import { ensureDir } from './fsops.mjs';

// Écrit l'environnement IA d'une stack dans un projet (déclaratif, additif, non destructif).
export function writeStackEnvironment({ projectDir, source, stack, assistant }) {
  const done = [], failed = [];
  const manifest = resolveStackManifest(stack, assistant);
  const isCursor = assistant === 'cursor';
  const abs = (rel) => path.join(projectDir, rel);
  const read = (rel) => { try { return fs.readFileSync(abs(rel), 'utf8'); } catch { return null; } };
  const write = (rel, content) => { ensureDir(path.dirname(abs(rel))); fs.writeFileSync(abs(rel), content); };

  // 1. MCP mergé (par stack)
  try {
    const rel = isCursor ? '.cursor/mcp.json' : '.mcp.json';
    write(rel, mergeMcpConfig(read(rel), manifest.mcp));
    done.push(`${rel} (MCP)`);
  } catch (e) { failed.push(`mcp (${e.message})`); }

  // 2. Runner de checks
  try {
    ensureDir(abs('.githooks'));
    fs.copyFileSync(path.join(source, 'templates/hooks/framework/checks.mjs'), abs('.githooks/checks.mjs'));
    done.push('.githooks/checks.mjs');
  } catch (e) { failed.push(`checks.mjs (${e.message})`); }

  // 3. pre-push (checks lourds)
  try {
    write('.githooks/pre-push', prePushScript(manifest.checks.prePush));
    fs.chmodSync(abs('.githooks/pre-push'), 0o755);
    done.push('.githooks/pre-push');
  } catch (e) { failed.push(`pre-push (${e.message})`); }

  // 4. pre-commit : ajoute la ligne de checks si le hook existe déjà (le scan secrets reste)
  try {
    const pc = read('.githooks/pre-commit');
    if (pc) {
      const line = preCommitCheckLine(manifest.checks.preCommit);
      if (!pc.includes(line)) {
        write('.githooks/pre-commit', pc.replace(/\s*$/, '\n') + line + '\n');
        fs.chmodSync(abs('.githooks/pre-commit'), 0o755);
        done.push('.githooks/pre-commit (checks)');
      }
    }
  } catch (e) { failed.push(`pre-commit checks (${e.message})`); }

  // 5. Câblage hooks assistant
  try {
    if (isCursor) { write('.cursor/hooks.json', extendCursorHooks(read('.cursor/hooks.json'), manifest.checks.onEdit)); done.push('.cursor/hooks.json (checks)'); }
    else { write('.claude/settings.json', claudeSettings(read('.claude/settings.json'), manifest.checks.onEdit)); done.push('.claude/settings.json (checks)'); }
  } catch (e) { failed.push(`hooks assistant (${e.message})`); }

  // 6. SETUP-AI.md
  try { write('docs/SETUP-AI.md', renderSetupAi({ stack, assistant, manifest, designSkills: DESIGN_SKILLS })); done.push('docs/SETUP-AI.md'); }
  catch (e) { failed.push(`SETUP-AI (${e.message})`); }

  // 7. Scripts package.json si présent
  try {
    const pkg = read('package.json');
    if (pkg) {
      const j = JSON.parse(pkg); j.scripts = j.scripts || {};
      let changed = false;
      for (const [k, v] of Object.entries(manifest.scripts)) if (!(k in j.scripts)) { j.scripts[k] = v; changed = true; }
      if (changed) { write('package.json', JSON.stringify(j, null, 2) + '\n'); done.push('package.json (scripts)'); }
    }
  } catch (e) { failed.push(`package.json (${e.message})`); }

  return { done, failed };
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `node --test scripts/lib/environment.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/environment.mjs scripts/lib/environment.test.mjs
git commit -m "feat(environment): orchestrateur d'écriture de l'env par stack"
```

---

### Task 7 : Brancher `writeStackEnvironment` dans `setup.mjs`

**Files:**
- Modify: `scripts/setup.mjs` (import + appel après la copie du pre-commit)

**Interfaces:**
- Consumes: `writeStackEnvironment({ projectDir, source, stack, assistant })` (Task 6).

- [ ] **Step 1 : Ajouter l'import** en haut de `scripts/setup.mjs`, après la ligne `import { formatReport } ...` :

```js
import { writeStackEnvironment } from './lib/environment.mjs';
```

- [ ] **Step 2 : Appeler l'orchestrateur** — dans `main()`, juste après le bloc `.githooks/pre-commit` (le `try { const hook = ... copyIfAbsent(... 'templates/hooks/pre-commit' ...) ... }` qui se termine par `catch (e) { failed.push(\`pre-commit (${e.message})\`); }`), insérer :

```js
  try {
    const env = writeStackEnvironment({ projectDir, source: args.source, stack: args.stack, assistant: args.assistant });
    done.push(...env.done);
    failed.push(...env.failed);
  } catch (e) { failed.push(`environnement (${e.message})`); }
```

(Note : `projectDir` existe déjà via `buildRunPlan`. L'appel vient **après** la copie du pre-commit pour que la ligne de checks puisse y être ajoutée.)

- [ ] **Step 3 : Vérifier à la main l'écriture réelle (dry d'intégration)**

Run:
```bash
rm -rf /tmp/vs-smoke && node scripts/setup.mjs --source . --stack saas --assistant claude-code --project /tmp/vs-smoke >/dev/null && node -e "const j=require('/tmp/vs-smoke/.mcp.json'); if(!j.mcpServers.shadcn) throw new Error('shadcn manquant'); if(j.mcpServers.expo) throw new Error('expo ne doit pas être là'); const fs=require('fs'); for(const f of ['.githooks/checks.mjs','.githooks/pre-push','.claude/settings.json','docs/SETUP-AI.md']) if(!fs.existsSync('/tmp/vs-smoke/'+f)) throw new Error('manque '+f); console.log('OK env saas')"
```
Expected: `OK env saas`.

- [ ] **Step 4 : Suite entière**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/setup.mjs
git commit -m "feat(setup): écrit l'environnement IA par stack (MCP+hooks+SETUP-AI)"
```

---

### Task 8 : `/doctor` étendu + playbook + corrections repo (docs)

**Files:**
- Modify: `templates/commands/doctor.md`
- Modify: `playbook/00-START.md`
- Modify: `stacks/saas/AGENTS.md:36`
- Modify: `.claude/skills/stack-saas/SKILL.md:32`
- Modify: `templates/env/saas.env.example`
- Modify: `ai-context/electron/README.md`

**Interfaces:** aucune (édition de docs). Validé par la suite existante (`validate*.test.mjs`).

- [ ] **Step 1 : Étendre `templates/commands/doctor.md`** — après la ligne 8 (`8. **Node ≥ 20.12**...`), ajouter :

```markdown
9. **Environnement IA de la stack** :
   - `.mcp.json` (ou `.cursor/mcp.json`) contient les serveurs MCP de la stack (SaaS : convex, better-auth, shadcn ; mobile : convex, expo ; desktop : chrome-devtools).
   - `.githooks/checks.mjs` présent + `.githooks/pre-push` présent + `git config core.hooksPath` vaut `.githooks` (sinon : `git config core.hooksPath .githooks`).
   - Câblage checks : `.cursor/hooks.json` (Cursor) ou `.claude/settings.json` (Claude Code) référence `checks.mjs`.
   - Scripts `package.json` : `typecheck` (+ `lint` hors mobile) présents.
   - `docs/SETUP-AI.md` : s'il reste des cases `[ ]`, rappelle de les jouer.
   - (desktop) `npx @doyensec/electronegativity --version` fonctionne (sécu).
```

- [ ] **Step 2 : Mettre à jour `playbook/00-START.md`** — remplacer le contenu de l'Étape 4 (lignes 23-25) par :

```markdown
## Étape 4 — Étapes « dans l'assistant » (SETUP-AI.md)
Ouvre **`docs/SETUP-AI.md`** dans le projet généré : c'est la checklist des plugins, skills et MCP à installer/autoriser DANS ton assistant. Exécute chaque case, puis coche-la.
Correspondances et détails : `playbook/install-tooling.md`.
```

- [ ] **Step 3 : Corriger `stacks/saas/AGENTS.md`** — ligne 36, remplacer :

```markdown
- Génère le schéma d'auth avec le CLI (`npx @better-auth/cli@latest generate`) plutôt qu'à la main.
```
par :
```markdown
- Génère le schéma d'auth avec `npx auth generate` (setup composant Convex), pas `@better-auth/cli generate`.
```

Puis, ligne 40, remplacer :
```markdown
- Ne mets jamais de secret (clés API, tokens) dans le code client. Utilise les variables d'environnement Convex / `.env`.
```
par :
```markdown
- Ne mets jamais de secret (clés API, tokens) dans le code client. Les secrets d'auth (`BETTER_AUTH_SECRET`, `SITE_URL`, OAuth) vont dans **Convex** via `npx convex env set …`, **pas** dans `.env`.
```

- [ ] **Step 4 : Corriger `.claude/skills/stack-saas/SKILL.md`** — ligne 32, remplacer `Génère le schéma via \`npx @better-auth/cli@latest generate\`.` par `Génère le schéma via \`npx auth generate\` (setup composant Convex).`

- [ ] **Step 5 : Corriger `templates/env/saas.env.example`** — remplacer tout le contenu par :

```bash
# Convex (backend) — côté client
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=
VITE_SITE_URL=http://localhost:3000

# ⚠️ Les secrets d'auth NE vont PAS ici : mets-les dans Convex avec
#   npx convex env set BETTER_AUTH_SECRET <valeur>
#   npx convex env set SITE_URL http://localhost:3000
# (ils s'exécutent dans Convex, pas dans le client).

# ⚠️ Copie ce fichier en .env.local et remplis les valeurs. Ne commit JAMAIS ton vrai .env.
```

- [ ] **Step 6 : Corriger `ai-context/electron/README.md`** — après la ligne 11 (la doc officielle), ajouter :

```markdown

Checklist sécurité officielle (à donner à l'IA pour toute app Electron) :
https://www.electronjs.org/docs/latest/tutorial/security
```

- [ ] **Step 7 : Suite entière (les validations de docs restent vertes)**

Run: `node --test`
Expected: PASS (`validate.test.mjs`, `validate-commands.test.mjs`, etc. inchangés).

- [ ] **Step 8 : Commit**

```bash
git add templates/commands/doctor.md playbook/00-START.md stacks/saas/AGENTS.md .claude/skills/stack-saas/SKILL.md templates/env/saas.env.example ai-context/electron/README.md
git commit -m "docs: /doctor étendu (env stack) + playbook SETUP-AI + corrections SaaS/Electron"
```

---

## Self-Review

**Spec coverage (Partie 1 de la spec) :**
- §1.1 modèle `STACKS` + `resolveStackManifest` → Task 1 ✓
- §1.2 contenu framework vérifié (3 stacks) → Task 1 (données) ✓
- §1.3 moteur écrit : MCP mergé → Task 2+6+7 ✓ ; hooks Cursor/Claude/git → Task 4+6 ✓ ; runner défensif → Task 3 ✓ ; scripts package.json → Task 6 ✓
- §1.4 `docs/SETUP-AI.md` → Task 5+6 ✓ ; playbook étape → Task 8 ✓
- §1.5 `/doctor` étendu → Task 8 ✓
- §1.6 corrections repo → Task 8 ✓
- Politique blocage (warn-only sauf secrets) → Task 3 (exit 0) + pre-commit inchangé ✓
- Persistance (inject-memory jalon) → **hors Plan 1** (Plan 3, dépend de la Roadmap) — non couvert ici, volontaire.
- Catalogue `domains` (§1.7) → **hors Plan 1** (Plan 2) — volontaire.

**Placeholder scan :** aucun TBD/TODO ; chaque étape de code montre le code complet ; commandes exactes avec sortie attendue. ✓

**Type consistency :** `resolveStackManifest` renvoie `{plugins,mcp,skills,checks,scripts,rules}` — mêmes clés consommées par `renderSetupAi` (plugins/skills/mcp/scripts) et `writeStackEnvironment` (mcp/checks/scripts). `checks.{onEdit,preCommit,prePush}` cohérent Task 1↔4↔6. Commande runner `node .githooks/checks.mjs <ids>` identique Task 3 (CLI), 4 (RUN), 6 (copie). ✓

## Notes d'exécution

- Ordre imposé : Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (6 dépend de 1-5 ; 7 de 6).
- Ne pas démarrer sur `main` sans accord : créer une branche de feature (`git checkout -b feat/env-par-stack`) avant Task 1.
- Après Plan 1 : Plan 2 (catalogue `domains`) puis Plan 3 (roadmap + `/build`).
