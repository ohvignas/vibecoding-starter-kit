# Installeur vibecoding piloté par l'IA — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à `best_practices_vibecoding` un installeur piloté par l'IA : l'élève donne le lien du repo à son assistant, l'IA suit un playbook et lance `scripts/setup.mjs` qui pose la stack + les outils IA au bon format, puis démarre BMAD.

**Architecture:** Un moteur Node ESM (`scripts/setup.mjs`) découpé en petits modules purs et testables sous `scripts/lib/` (parsing d'arguments, matrice stack×assistant, templates, ops fichier idempotentes, prérequis, clone externe, rapport). Un `playbook/` en Markdown pilote l'IA et appelle ce moteur ; un validateur (`scripts/lib/validate.mjs`) garantit que le playbook et la matrice pointent vers des fichiers réels.

**Tech Stack:** Node.js ≥ 20.12 (ESM), test runner intégré `node --test` + `node:assert/strict`. Pas de dépendance externe.

## Global Constraints

- **Node ≥ 20.12** requis (imposé par BMAD). Vérifié au démarrage de `setup.mjs`.
- **BMAD v4 stable**, installé non-interactivement : `npx bmad-method install --directory <dir> --modules bmm --tools <toolKey> --yes`. Clés outil : `cursor`, `claude-code`, `codex` (toutes supportées).
- **superpowers** = commande de plugin **exécutée dans l'assistant** (jamais par le script) : Cursor `/add-plugin superpowers`, Claude Code `/plugin install superpowers@claude-plugins-official`, Codex `/plugins` → Superpowers. Le script ne fait que la **lister** dans son rapport.
- **karpathy** copié **depuis `github.com/multica-ai/andrej-karpathy-skills`** par clone+copie de fichiers (jamais via le slug marketplace, qui pointe par erreur vers `forrestchang`).
- **awesome-cursorrules** = **Cursor uniquement** ; sauté (avec raison) sur Claude Code/Codex.
- **Aucune commande tapée par l'élève** : `setup.mjs` est invoqué par l'IA. Idempotent : ne réécrit pas un fichier existant sans `--force`.
- **Copy user-facing en français.**
- **Règle méthodo** inscrite dans l'`AGENTS.md` généré : BMAD pilote, superpowers = boîte à outils (ne relance jamais son propre planning).
- Modules ESM ; `setup.mjs` ne doit **exécuter `main()` que s'il est lancé en direct** (garde `import.meta`), pour rester testable.

Chemins des sources déjà présents dans le repo (utilisés par la matrice) : `stacks/<stack>/AGENTS.md`, `.claude/skills/stack-<stack>/`, `ai-context/`, `.mcp.json`.

---

### Task 1 : Scaffolding du projet Node + parsing d'arguments

**Files:**
- Create: `package.json`
- Create: `scripts/lib/args.mjs`
- Test: `scripts/lib/args.test.mjs`

**Interfaces:**
- Produces: `parseArgs(argv: string[]) -> Args` où `Args = { stack, assistant, project, mockup, source, dryRun, force }`. `validateArgs(args: Args) -> string[]` (liste d'erreurs, vide si OK).

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/args.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateArgs } from './args.mjs';

test('parseArgs lit les drapeaux', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'mon-app', '--dry-run']);
  assert.equal(a.stack, 'saas');
  assert.equal(a.assistant, 'cursor');
  assert.equal(a.project, 'mon-app');
  assert.equal(a.dryRun, true);
  assert.equal(a.source, '.'); // défaut
});

test('parseArgs rejette un drapeau inconnu', () => {
  assert.throws(() => parseArgs(['--nope']), /inconnu/);
});

test('validateArgs signale stack/assistant/projet invalides', () => {
  assert.deepEqual(validateArgs(parseArgs(['--stack','x','--assistant','y','--project','!!'])).length, 3);
  assert.deepEqual(validateArgs(parseArgs(['--stack','saas','--assistant','cursor','--project','ok'])), []);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/args.test.mjs`
Expected: FAIL (`Cannot find module './args.mjs'`).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/args.mjs
const STACKS = ['saas', 'mobile', 'desktop'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  const args = { stack: null, assistant: null, project: null, mockup: null, source: '.', dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--stack': args.stack = argv[++i]; break;
      case '--assistant': args.assistant = argv[++i]; break;
      case '--project': args.project = argv[++i]; break;
      case '--mockup': args.mockup = argv[++i]; break;
      case '--source': args.source = argv[++i]; break;
      case '--dry-run': args.dryRun = true; break;
      case '--force': args.force = true; break;
      default: throw new Error(`Argument inconnu : ${a}`);
    }
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!STACKS.includes(args.stack)) errors.push(`--stack doit valoir ${STACKS.join('|')}`);
  if (!ASSISTANTS.includes(args.assistant)) errors.push(`--assistant doit valoir ${ASSISTANTS.join('|')}`);
  if (!args.project || !/^[a-z0-9][a-z0-9-_]*$/i.test(args.project)) errors.push('--project : nom invalide');
  return errors;
}

export const KNOWN = { STACKS, ASSISTANTS };
```

```json
// package.json
{
  "name": "vibe-stack",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/args.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/lib/args.mjs scripts/lib/args.test.mjs
git commit -m "feat(setup): parsing et validation des arguments CLI"
```

---

### Task 2 : Templates (`.mdc` Cursor + AGENTS.md généré)

**Files:**
- Create: `scripts/lib/templates.mjs`
- Test: `scripts/lib/templates.test.mjs`

**Interfaces:**
- Produces: `toCursorMdc({ description, body, alwaysApply=true }) -> string` ; `renderProjectAgentsMd({ stack, assistant }) -> string`.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCursorMdc, renderProjectAgentsMd } from './templates.mjs';

test('toCursorMdc encadre le corps avec un frontmatter', () => {
  const out = toCursorMdc({ description: 'Règles X', body: 'CONTENU' });
  assert.match(out, /^---\n/);
  assert.match(out, /description: Règles X/);
  assert.match(out, /alwaysApply: true/);
  assert.match(out, /CONTENU/);
});

test('renderProjectAgentsMd inscrit la règle méthodo et la stack', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor' });
  assert.match(out, /BMAD pilote/);
  assert.match(out, /superpowers/);
  assert.match(out, /saas/);
  assert.match(out, /maquette\//);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/templates.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/templates.mjs
export function toCursorMdc({ description, body, alwaysApply = true }) {
  return `---\ndescription: ${description}\nglobs:\nalwaysApply: ${alwaysApply}\n---\n\n${body}\n`;
}

export function renderProjectAgentsMd({ stack, assistant }) {
  return `# Règles projet (généré par vibe-stack)

Stack : **${stack}** · Assistant : **${assistant}**.

## Méthodologie (IMPORTANT)
- **BMAD pilote le projet** : planning → PRD → architecture → build (story par story).
- **superpowers = boîte à outils** (TDD, systematic-debugging) utilisée PENDANT le build.
  superpowers ne relance JAMAIS son propre brainstorming/planning ici — c'est BMAD qui dirige.
- **karpathy** : réfléchis avant de coder, diffs chirurgicaux, vérifie ton travail.

## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et le dossier \`ai-context/\`.
Si présents à la racine, lis aussi \`AGENTS-stack.md\` et \`AGENTS-karpathy.md\`.

## Maquette
La maquette de référence est dans \`maquette/\`. Respecte-la pour construire l'UI.
`;
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/templates.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/templates.mjs scripts/lib/templates.test.mjs
git commit -m "feat(setup): templates .mdc Cursor et AGENTS.md généré"
```

---

### Task 3 : Matrice d'installation (stack × assistant)

**Files:**
- Create: `scripts/lib/matrix.mjs`
- Test: `scripts/lib/matrix.test.mjs`

**Interfaces:**
- Consumes: rien (pur).
- Produces: `resolveAssets(stack, assistant) -> InstallPlan` où
  `InstallPlan = { copies: Copy[], clones: Clone[], inAssistant: Step[], skipped: Skip[], bmad: { toolKey, targetDir } }`,
  `Copy = { from, to, transform: 'raw'|'mdc'|'dir', description? }`,
  `Clone = { repo, picks?: {src,to}[], matchTags?: string[], to? }`,
  `Step = { name, command }`, `Skip = { name, reason }`.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/matrix.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssets } from './matrix.mjs';

test('SaaS + Cursor : mdc de stack, MCP cursor, 2 clones, bmad cursor', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc' && c.transform === 'mdc'));
  assert.ok(p.copies.find(c => c.to === '.cursor/mcp.json'));
  assert.equal(p.clones.length, 2); // karpathy + awesome-cursorrules
  assert.equal(p.bmad.toolKey, 'cursor');
  assert.equal(p.bmad.targetDir, '.agents/skills');
  assert.equal(p.inAssistant[0].command, '/add-plugin superpowers');
});

test('Desktop + Claude Code : pas de MCP, awesome-cursorrules sauté, skill copié', () => {
  const p = resolveAssets('desktop', 'claude-code');
  assert.ok(!p.copies.find(c => (c.to || '').includes('mcp.json')));
  assert.ok(p.skipped.find(s => s.name === 'awesome-cursorrules'));
  assert.ok(p.copies.find(c => c.to === '.claude/skills/stack-desktop' && c.transform === 'dir'));
  assert.equal(p.bmad.targetDir, '.claude/skills');
  assert.equal(p.clones.length, 1); // karpathy seulement
});

test('Mobile + Codex : AGENTS brut, superpowers via /plugins', () => {
  const p = resolveAssets('mobile', 'codex');
  assert.ok(p.copies.find(c => c.from === 'stacks/mobile/AGENTS.md' && c.transform === 'raw'));
  assert.equal(p.bmad.toolKey, 'codex');
  assert.match(p.inAssistant[0].command, /plugins/);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/matrix.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/matrix.mjs
const BMAD = {
  cursor: { toolKey: 'cursor', targetDir: '.agents/skills' },
  'claude-code': { toolKey: 'claude-code', targetDir: '.claude/skills' },
  codex: { toolKey: 'codex', targetDir: '.agents/skills' },
};
const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
const CURSORRULES_REPO = 'https://github.com/PatrickJS/awesome-cursorrules';
const CURSOR_TAGS = {
  saas: ['typescript', 'react', 'clean-code'],
  mobile: ['react-native', 'typescript', 'expo'],
  desktop: ['typescript', 'clean-code'],
};

export function resolveAssets(stack, assistant) {
  const copies = [], clones = [], inAssistant = [], skipped = [];
  const isCursor = assistant === 'cursor';
  const isClaude = assistant === 'claude-code';

  // 1. Règles de stack (les nôtres)
  if (isCursor) {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles stack ${stack}` });
  } else {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `AGENTS-stack.md`, transform: 'raw' });
    if (isClaude) copies.push({ from: `.claude/skills/stack-${stack}`, to: `.claude/skills/stack-${stack}`, transform: 'dir' });
  }

  // 2. ai-context (référence)
  copies.push({ from: `ai-context`, to: `ai-context`, transform: 'dir' });

  // 3. MCP (saas/mobile)
  if (stack !== 'desktop') {
    copies.push({ from: `.mcp.json`, to: isCursor ? `.cursor/mcp.json` : `.mcp.json`, transform: 'raw' });
  }

  // 4. karpathy (tous)
  clones.push({
    repo: KARPATHY_REPO,
    picks: isCursor
      ? [{ src: '.cursor/rules/karpathy-guidelines.mdc', to: '.cursor/rules/karpathy.mdc' }]
      : [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }],
  });

  // 5. awesome-cursorrules (cursor seulement)
  if (isCursor) clones.push({ repo: CURSORRULES_REPO, matchTags: CURSOR_TAGS[stack], to: '.cursor/rules' });
  else skipped.push({ name: 'awesome-cursorrules', reason: 'Format .mdc spécifique à Cursor' });

  // 6. superpowers (dans l'assistant)
  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });

  return { copies, clones, inAssistant, skipped, bmad: BMAD[assistant] };
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/matrix.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix.test.mjs
git commit -m "feat(setup): matrice d'installation stack x assistant"
```

---

### Task 4 : Rapport final

**Files:**
- Create: `scripts/lib/report.mjs`
- Test: `scripts/lib/report.test.mjs`

**Interfaces:**
- Produces: `formatReport({ project, stack, assistant, done: string[], inAssistant: Step[], skipped: Skip[], failed: string[] }) -> string`.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from './report.mjs';

test('le rapport liste installé, à-faire-dans-l-IA, sauté, échecs', () => {
  const out = formatReport({
    project: 'mon-app', stack: 'saas', assistant: 'cursor',
    done: ['.cursor/rules/stack-saas.mdc'],
    inAssistant: [{ name: 'superpowers', command: '/add-plugin superpowers' }],
    skipped: [{ name: 'awesome-cursorrules', reason: 'Cursor only' }],
    failed: ['BMAD (timeout)'],
  });
  assert.match(out, /✅ .*stack-saas\.mdc/);
  assert.match(out, /superpowers : \/add-plugin superpowers/);
  assert.match(out, /awesome-cursorrules/);
  assert.match(out, /❌ BMAD/);
  assert.match(out, /BMAD/); // prochaine étape
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/report.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/report.mjs
export function formatReport({ project, stack, assistant, done, inAssistant, skipped, failed }) {
  const L = [];
  L.push(`\n=== vibe-stack : ${project} (${stack} / ${assistant}) ===`);
  L.push('\nInstallé :');
  for (const d of done) L.push(`  ✅ ${d}`);
  if (failed.length) { L.push('\nÉchecs (relance le script) :'); for (const f of failed) L.push(`  ❌ ${f}`); }
  if (inAssistant.length) { L.push('\nÀ lancer DANS ton assistant IA :'); for (const s of inAssistant) L.push(`  ▸ ${s.name} : ${s.command}`); }
  if (skipped.length) { L.push('\nSauté :'); for (const s of skipped) L.push(`  – ${s.name} (${s.reason})`); }
  L.push('\nProchaine étape : dis à ton IA « démarre le projet avec BMAD ».');
  return L.join('\n');
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/report.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/report.mjs scripts/lib/report.test.mjs
git commit -m "feat(setup): rapport final d'installation"
```

---

### Task 5 : Opérations fichier idempotentes

**Files:**
- Create: `scripts/lib/fsops.mjs`
- Test: `scripts/lib/fsops.test.mjs`

**Interfaces:**
- Produces: `ensureDir(dir)` ; `copyIfAbsent(src, dest, {force}) -> {dest, status:'copied'|'skipped-exists'}` ; `copyDirIfAbsent(srcDir, destDir, {force}) -> Result[]`.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/fsops.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, copyIfAbsent, copyDirIfAbsent } from './fsops.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-fsops-')); }

test('copyIfAbsent copie puis saute si présent', () => {
  const d = tmp();
  const src = path.join(d, 'a.txt'); fs.writeFileSync(src, 'x');
  const dest = path.join(d, 'out', 'a.txt');
  assert.equal(copyIfAbsent(src, dest).status, 'copied');
  assert.equal(fs.readFileSync(dest, 'utf8'), 'x');
  assert.equal(copyIfAbsent(src, dest).status, 'skipped-exists');
  assert.equal(copyIfAbsent(src, dest, { force: true }).status, 'copied');
});

test('copyDirIfAbsent recopie récursivement', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, 'src', 'sub'), { recursive: true });
  fs.writeFileSync(path.join(d, 'src', 'a.txt'), '1');
  fs.writeFileSync(path.join(d, 'src', 'sub', 'b.txt'), '2');
  const res = copyDirIfAbsent(path.join(d, 'src'), path.join(d, 'dst'));
  assert.equal(res.length, 2);
  assert.ok(fs.existsSync(path.join(d, 'dst', 'sub', 'b.txt')));
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/fsops.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/fsops.mjs
import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function copyIfAbsent(src, dest, { force = false } = {}) {
  if (fs.existsSync(dest) && !force) return { dest, status: 'skipped-exists' };
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return { dest, status: 'copied' };
}

export function copyDirIfAbsent(srcDir, destDir, opts = {}) {
  const out = [];
  for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, e.name), d = path.join(destDir, e.name);
    if (e.isDirectory()) out.push(...copyDirIfAbsent(s, d, opts));
    else out.push(copyIfAbsent(s, d, opts));
  }
  return out;
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/fsops.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/fsops.mjs scripts/lib/fsops.test.mjs
git commit -m "feat(setup): copies fichier idempotentes"
```

---

### Task 6 : Vérification des prérequis (Node, git)

**Files:**
- Create: `scripts/lib/prereqs.mjs`
- Test: `scripts/lib/prereqs.test.mjs`

**Interfaces:**
- Produces: `parseNodeVersion(v) -> {major,minor}` ; `meetsNode(v, min?) -> boolean` ; `ensureGit(run?) -> boolean`.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/prereqs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNodeVersion, meetsNode, ensureGit } from './prereqs.mjs';

test('parseNodeVersion', () => {
  assert.deepEqual(parseNodeVersion('v20.12.1'), { major: 20, minor: 12 });
});
test('meetsNode applique le plancher 20.12', () => {
  assert.equal(meetsNode('v18.19.0'), false);
  assert.equal(meetsNode('v20.11.0'), false);
  assert.equal(meetsNode('v20.12.0'), true);
  assert.equal(meetsNode('v22.3.0'), true);
});
test('ensureGit renvoie false si git absent', () => {
  assert.equal(ensureGit(() => { throw new Error('no git'); }), false);
  assert.equal(ensureGit(() => 'git version 2.4'), true);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/prereqs.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/prereqs.mjs
import { execFileSync } from 'node:child_process';

export function parseNodeVersion(v) {
  const [maj, min] = v.replace(/^v/, '').split('.').map(Number);
  return { major: maj || 0, minor: min || 0 };
}

export function meetsNode(v, min = { major: 20, minor: 12 }) {
  const { major, minor } = parseNodeVersion(v);
  return major > min.major || (major === min.major && minor >= min.minor);
}

export function ensureGit(run = () => execFileSync('git', ['--version'])) {
  try { run(); return true; } catch { return false; }
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/prereqs.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/prereqs.mjs scripts/lib/prereqs.test.mjs
git commit -m "feat(setup): vérification des prérequis Node/git"
```

---

### Task 7 : Récupération des repos externes (clone/pick/tags/BMAD)

**Files:**
- Create: `scripts/lib/external.mjs`
- Test: `scripts/lib/external.test.mjs`

**Interfaces:**
- Consumes: `copyIfAbsent` (Task 5).
- Produces: `cloneRepo(repo, dest, run?)` ; `pickFromClone(cloneDir, picks, projectDir) -> Result[]` ; `selectByTags(rulesDir, tags) -> string[]` ; `runBmad(projectDir, toolKey, run?)`. `run` par défaut = `execFileSync` (injectable pour les tests).

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/external.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectByTags, pickFromClone, runBmad } from './external.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vs-ext-')); }

test('selectByTags filtre par sous-chaîne', () => {
  const d = tmp();
  for (const f of ['typescript.mdc', 'react.mdc', 'python.mdc']) fs.writeFileSync(path.join(d, f), '');
  assert.deepEqual(selectByTags(d, ['typescript', 'react']).sort(), ['react.mdc', 'typescript.mdc']);
});

test('pickFromClone signale une source manquante', () => {
  const clone = tmp(), proj = tmp();
  fs.writeFileSync(path.join(clone, 'CLAUDE.md'), 'k');
  const res = pickFromClone(clone, [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }, { src: 'NOPE', to: 'x' }], proj);
  assert.equal(res[0].status, 'copied');
  assert.equal(res[1].status, 'missing-src');
});

test('runBmad appelle npx avec les bons arguments', () => {
  const calls = [];
  runBmad('/p', 'cursor', (cmd, args) => calls.push([cmd, args]));
  assert.equal(calls[0][0], 'npx');
  assert.deepEqual(calls[0][1], ['bmad-method','install','--directory','/p','--modules','bmm','--tools','cursor','--yes']);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/external.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/lib/external.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { copyIfAbsent } from './fsops.mjs';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

export function cloneRepo(repo, dest, run = defaultRun) {
  run('git', ['clone', '--depth', '1', repo, dest]);
  return dest;
}

export function pickFromClone(cloneDir, picks, projectDir) {
  const out = [];
  for (const p of picks) {
    const src = path.join(cloneDir, p.src);
    if (!fs.existsSync(src)) { out.push({ to: p.to, status: 'missing-src' }); continue; }
    out.push(copyIfAbsent(src, path.join(projectDir, p.to)));
  }
  return out;
}

export function selectByTags(rulesDir, tags) {
  if (!fs.existsSync(rulesDir)) return [];
  return fs.readdirSync(rulesDir).filter(f => tags.some(t => f.toLowerCase().includes(t)));
}

export function runBmad(projectDir, toolKey, run = defaultRun) {
  run('npx', ['bmad-method', 'install', '--directory', projectDir, '--modules', 'bmm', '--tools', toolKey, '--yes']);
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/lib/external.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/external.mjs scripts/lib/external.test.mjs
git commit -m "feat(setup): clone/pick/tags externes + invocation BMAD"
```

---

### Task 8 : Point d'entrée `setup.mjs` (wiring + `--dry-run`)

**Files:**
- Create: `scripts/setup.mjs`
- Test: `scripts/setup.test.mjs`

**Interfaces:**
- Consumes: tous les modules `lib/` ci-dessus.
- Produces: `buildRunPlan(args) -> { assets, projectDir }` (pur, testable) ; `main()` (effets de bord, garde `import.meta`).

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/setup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildRunPlan } from './setup.mjs';

test('buildRunPlan résout la matrice et le dossier projet absolu', () => {
  const { assets, projectDir } = buildRunPlan({ stack: 'saas', assistant: 'cursor', project: 'mon-app', source: '.' });
  assert.equal(assets.bmad.toolKey, 'cursor');
  assert.equal(projectDir, path.resolve('mon-app'));
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/setup.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/setup.mjs
#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs, validateArgs } from './lib/args.mjs';
import { resolveAssets } from './lib/matrix.mjs';
import { renderProjectAgentsMd, toCursorMdc } from './lib/templates.mjs';
import { ensureDir, copyIfAbsent, copyDirIfAbsent } from './lib/fsops.mjs';
import { cloneRepo, pickFromClone, selectByTags, runBmad } from './lib/external.mjs';
import { formatReport } from './lib/report.mjs';
import { meetsNode, ensureGit } from './lib/prereqs.mjs';

export function buildRunPlan(args) {
  const assets = resolveAssets(args.stack, args.assistant);
  const projectDir = path.resolve(args.project);
  return { assets, projectDir };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errs = validateArgs(args);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  if (!meetsNode(process.version)) { console.error('Node ≥ 20.12 requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }
  if (!ensureGit()) { console.error('git requis (voir guides/02-installer-les-outils.md)'); process.exit(1); }

  const { assets, projectDir } = buildRunPlan(args);
  if (args.dryRun) { console.log(JSON.stringify({ projectDir, ...assets }, null, 2)); return; }

  const done = [], failed = [];
  const opt = { force: args.force };

  ensureDir(projectDir);
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), renderProjectAgentsMd(args));
  ensureDir(path.join(projectDir, 'maquette'));
  done.push('AGENTS.md + maquette/');

  for (const c of assets.copies) {
    try {
      const src = path.join(args.source, c.from);
      const dest = path.join(projectDir, c.to);
      if (c.transform === 'dir') copyDirIfAbsent(src, dest, opt);
      else if (c.transform === 'mdc') {
        ensureDir(path.dirname(dest));
        if (!fs.existsSync(dest) || args.force) fs.writeFileSync(dest, toCursorMdc({ description: c.description, body: fs.readFileSync(src, 'utf8') }));
      } else copyIfAbsent(src, dest, opt);
      done.push(c.to);
    } catch (e) { failed.push(`${c.to} (${e.message})`); }
  }

  for (const cl of assets.clones) {
    let tmp;
    try {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-clone-'));
      cloneRepo(cl.repo, tmp);
      if (cl.picks) pickFromClone(tmp, cl.picks, projectDir);
      else if (cl.matchTags) {
        const rulesDir = path.join(tmp, 'rules');
        for (const f of selectByTags(rulesDir, cl.matchTags)) copyIfAbsent(path.join(rulesDir, f), path.join(projectDir, cl.to, f), opt);
      }
      done.push(cl.repo);
    } catch (e) { failed.push(`${cl.repo} (${e.message})`); }
    finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  try { runBmad(projectDir, assets.bmad.toolKey); done.push(`BMAD (${assets.bmad.toolKey})`); }
  catch (e) { failed.push(`BMAD (${e.message})`); }

  console.log(formatReport({ project: args.project, stack: args.stack, assistant: args.assistant, done, inAssistant: assets.inAssistant, skipped: assets.skipped, failed }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

- [ ] **Step 4: Lancer le test → succès**

Run: `node --test scripts/setup.test.mjs`
Expected: PASS.

- [ ] **Step 5: Vérifier le `--dry-run` de bout en bout (sans réseau)**

Run: `node scripts/setup.mjs --stack saas --assistant cursor --project /tmp/vs-demo --dry-run`
Expected: un JSON affiché avec `projectDir`, `copies`, `clones`, `bmad.toolKey: "cursor"`. Aucun fichier écrit.

- [ ] **Step 6: Lancer toute la suite**

Run: `node --test`
Expected: PASS (tous les fichiers `*.test.mjs`).

- [ ] **Step 7: Commit**

```bash
git add scripts/setup.mjs scripts/setup.test.mjs
git commit -m "feat(setup): point d'entrée setup.mjs (wiring + dry-run)"
```

---

### Task 9 : Playbook IA + routeur AGENTS.md + validateur

**Files:**
- Create: `AGENTS.md` (racine du repo — routeur)
- Create: `playbook/00-START.md`, `playbook/stack-saas.md`, `playbook/stack-mobile.md`, `playbook/stack-desktop.md`, `playbook/install-tooling.md`, `playbook/bmad-kickoff.md`
- Create: `scripts/lib/validate.mjs`
- Test: `scripts/lib/validate.test.mjs`

**Interfaces:**
- Consumes: `resolveAssets` (Task 3).
- Produces: `validatePlaybook(root) -> string[]` (erreurs). Vide = OK.

- [ ] **Step 1: Écrire le test qui échoue**

```js
// scripts/lib/validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlaybook } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('le playbook et les sources de la matrice existent', () => {
  assert.deepEqual(validatePlaybook(ROOT), []);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `node --test scripts/lib/validate.test.mjs`
Expected: FAIL (module introuvable, puis fichiers playbook manquants).

- [ ] **Step 3: Implémenter le validateur**

```js
// scripts/lib/validate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { resolveAssets } from './matrix.mjs';

const REQUIRED = [
  'AGENTS.md',
  'playbook/00-START.md', 'playbook/stack-saas.md', 'playbook/stack-mobile.md',
  'playbook/stack-desktop.md', 'playbook/install-tooling.md', 'playbook/bmad-kickoff.md',
  'scripts/setup.mjs',
];

export function validatePlaybook(root) {
  const errors = [];
  for (const f of REQUIRED) if (!fs.existsSync(path.join(root, f))) errors.push(`fichier manquant : ${f}`);
  for (const stack of ['saas', 'mobile', 'desktop']) {
    for (const assistant of ['cursor', 'claude-code', 'codex']) {
      for (const c of resolveAssets(stack, assistant).copies) {
        if (!fs.existsSync(path.join(root, c.from))) errors.push(`source de copie manquante (${stack}/${assistant}) : ${c.from}`);
      }
    }
  }
  if (fs.existsSync(path.join(root, 'AGENTS.md'))) {
    const a = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    if (!a.includes('playbook/00-START.md')) errors.push('AGENTS.md ne renvoie pas vers playbook/00-START.md');
  }
  return errors;
}
```

- [ ] **Step 4: Écrire le routeur `AGENTS.md` (racine)**

```markdown
# vibe-stack — instructions pour l'assistant IA

Si on te demande d'**installer / configurer ce projet**, suis exactement **`playbook/00-START.md`**.
Ne devine pas : lis le playbook, pose les questions à l'utilisateur, puis exécute les étapes.
```

- [ ] **Step 5: Écrire `playbook/00-START.md`** (orchestrateur)

```markdown
# Playbook d'installation (lu par l'IA)

Tu es l'assistant d'un·e débutant·e. Objectif : créer un nouveau projet et le configurer.
Va étape par étape, en français, sans jargon.

## Étape 1 — Cloner la source (toi, l'IA)
Clone ce repo dans un dossier temporaire pour disposer du moteur et des assets :
`git clone --depth 1 <URL_DE_CE_REPO> .vibe-stack-src`

## Étape 2 — Poser les questions (dans le chat)
1. « Que veux-tu construire ? » → SaaS / mobile / desktop.
2. « Quel assistant utilises-tu ? » (souvent tu le sais déjà : Cursor / Claude Code / Codex).
3. « Quel nom pour le projet ? » (dossier).
4. « As-tu une maquette ? » (image, HTML de Claude, ou lien) — sinon on en génère une plus tard.

## Étape 3 — Lancer l'installeur (toi, l'IA)
Exécute :
`node .vibe-stack-src/scripts/setup.mjs --source .vibe-stack-src --stack <STACK> --assistant <ASSISTANT> --project <NOM>`
Puis lis le rapport affiché.

## Étape 4 — Étapes « dans l'assistant »
Le rapport liste des commandes de plugin à lancer DANS ton assistant (superpowers). Lance-les.
Détails et correspondances : `playbook/install-tooling.md`.

## Étape 5 — Détails par stack
Ouvre le fichier correspondant : `playbook/stack-saas.md` · `playbook/stack-mobile.md` · `playbook/stack-desktop.md`.

## Étape 6 — Démarrer le projet
Demande : « On démarre ? ». Si oui, suis `playbook/bmad-kickoff.md`.
```

- [ ] **Step 6: Écrire `playbook/install-tooling.md`**

```markdown
# Outils IA installés (correspondances par assistant)

- **BMAD** (pilote) : posé par `setup.mjs` via `npx bmad-method install … --tools <cursor|claude-code|codex>`.
- **superpowers** (boîte à outils, à lancer DANS l'assistant) :
  - Cursor : `/add-plugin superpowers`
  - Claude Code : `/plugin install superpowers@claude-plugins-official`
  - Codex : `/plugins` puis chercher « Superpowers ».
- **karpathy** : copié depuis `multica-ai/andrej-karpathy-skills` (fichiers, pas le marketplace).
- **awesome-cursorrules** : Cursor uniquement (sous-ensemble ciblé) ; sauté ailleurs.

Règle d'or (déjà écrite dans l'`AGENTS.md` du projet) : **BMAD pilote, superpowers = outils**. Ne lance pas le brainstorming/planning de superpowers sur un projet BMAD.
```

- [ ] **Step 7: Écrire `playbook/stack-saas.md`, `stack-mobile.md`, `stack-desktop.md`**

```markdown
<!-- playbook/stack-saas.md -->
# Détails stack SaaS (Convex + TanStack Start + Better Auth)
Après l'install et la validation du PRD, le scaffold se fait avec :
`npm create convex@latest -- -t tanstack-start` puis `npm install @convex-dev/better-auth better-auth`.
Réfère-toi à `stacks/saas/README.md` et `ai-context/` pour les règles. Guide 3-en-1 :
https://labs.convex.dev/better-auth/framework-guides/tanstack-start
```

```markdown
<!-- playbook/stack-mobile.md -->
# Détails stack mobile (Expo + Convex)
Scaffold post-PRD : `npx create-expo-app@latest <nom>` puis `npm install convex`.
Auth : Convex Auth (simple) ou Better Auth. Réfère-toi à `stacks/mobile/README.md`.
Piège : jamais `expo eject` → `npx expo prebuild`.
```

```markdown
<!-- playbook/stack-desktop.md -->
# Détails stack desktop (Electron)
Scaffold post-PRD : `npx create-electron-app@latest <nom> --template=vite-typescript`.
Utilise les skills `electron:*` de Claude Code. Réfère-toi à `stacks/desktop/README.md`.
Electron n'a pas de llms.txt/MCP officiel.
```

- [ ] **Step 8: Écrire `playbook/bmad-kickoff.md`**

```markdown
# Démarrage BMAD (après installation)

1. **Interview** : lance l'agent d'analyse BMAD ; pose les questions projet dans le chat.
2. **Maquette** : regarde le dossier `maquette/`. S'il contient une image/HTML/lien, lis-la et
   sers-t'en comme référence UX. Sinon, propose d'en générer une avant de coder.
3. **PRD** : produis le PRD complet avec BMAD → fais-le **valider** par l'utilisateur (point d'arrêt).
4. **Architecture** : la stack est déjà fixée ; concentre-toi sur le découpage en composants/épics.
5. **Scaffold** : lance la commande de la stack (voir `playbook/stack-*.md`).
6. **Build** : construis story par story (cycle dev BMAD), en utilisant les skills superpowers
   (TDD, systematic-debugging) et les règles de la stack. Respecte la maquette.
```

- [ ] **Step 9: Lancer le validateur → succès**

Run: `node --test scripts/lib/validate.test.mjs`
Expected: PASS (tous les fichiers requis existent, toutes les sources de la matrice existent, AGENTS.md route bien).

- [ ] **Step 10: Lancer toute la suite**

Run: `node --test`
Expected: PASS (tous les tests).

- [ ] **Step 11: Commit**

```bash
git add AGENTS.md playbook/ scripts/lib/validate.mjs scripts/lib/validate.test.mjs
git commit -m "feat(playbook): playbook IA + routeur AGENTS.md + validateur"
```

---

## Vérification finale (manuelle, hors suite auto)

> À faire une fois après la Task 9 — nécessite réseau + npx (non couvert par les tests unitaires).

- [ ] **Smoke test réel** : dans un dossier jetable,
  `node scripts/setup.mjs --source . --stack desktop --assistant cursor --project /tmp/vibe-demo`
  Vérifier : `/tmp/vibe-demo/AGENTS.md` (règle « BMAD pilote »), `maquette/`, `.cursor/rules/stack-desktop.mdc`, `.cursor/rules/karpathy.mdc`, un sous-ensemble de cursorrules, et que BMAD s'est installé (ou apparaît en échec réseau dans le rapport, pas en crash). Rapport final affiché avec la ligne superpowers `/add-plugin superpowers`.
- [ ] **Mettre à jour le README principal** : ajouter une section « Installer via l'IA » (parle à ton IA + donne le lien + elle suit le playbook).

---

## Notes de mise en œuvre (points ouverts de la spec)

- **awesome-cursorrules** : les `matchTags` (`typescript`/`react`/`react-native`/`expo`/`clean-code`) sont résolus au clone par `selectByTags` en scannant `rules/`. Si le repo a renommé ses fichiers, ajuster les tags (aucun nom de fichier n'est codé en dur → robuste).
- **BMAD v4 vs v6** : ✅ **Résolu au smoke test (2026-07-04).** `npx bmad-method install` pose **v6** (skills `bmad-*` : `bmad-help`, `bmad-create-prd`, `bmad-create-architecture`, `bmad-dev-story`…). **Décision : accepter v6** — c'est le défaut actuel, l'install est propre, et v6 apporte la **phase UX/maquette native** souhaitée. Pas d'épinglage v4. `playbook/bmad-kickoff.md` réaligné sur `bmad-help` + noms de skills v6.
- **Codex App** : superpowers s'y installe via l'UI (pas de commande) ; le rapport l'indique déjà en texte.
- **Codex/Claude — fichiers de règles** : les règles non-Cursor sont posées en `AGENTS-stack.md` / `AGENTS-karpathy.md` et **référencées depuis l'`AGENTS.md` généré** (que ces agents lisent). Si un futur test montre qu'un agent n'ouvre pas les fichiers référencés, les **concaténer** directement dans `AGENTS.md`.
