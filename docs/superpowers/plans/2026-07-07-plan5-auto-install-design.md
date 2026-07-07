# Plan 5 — Auto-install des skills design + prompt de démarrage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le wizard **auto-installe les 4 skills design gratuits** (`npx skills add -a <assistant>`, échec gracieux), réduit la liste « à faire dans l'assistant » à superpowers, et **imprime un prompt de démarrage** à coller.

**Architecture :** Construction de commande pure et testée (`buildSkillAddArgs`) + boucle gracieuse à `run` injecté (`installSkills`), comme `installCaveman`. `docs/SETUP-AI.md` devient la source unique (plugins + skills stack + MCP + superpowers + note shadcnblocks). Un flag `--no-skills` évite les installs réseau dans les tests.

**Tech Stack :** Node.js ESM, `node --test` (zéro dépendance externe ; le CLI `skills` est lancé via `npx`, pas une dépendance du repo).

## Global Constraints

- Node ≥ 20.12 ; ESM ; zéro dépendance du repo ; tests `node:test`.
- `node` du shell peut être un wrapper nvm cassé → `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node` ; suite via `node --test` (racine).
- Français dans messages/commentaires ; identifiers anglais.
- `-a` = l'id assistant du kit : `cursor` | `claude-code` | `codex` (jamais `--all`).
- Échec gracieux : une install ratée va dans `failed`, ne bloque jamais.
- Les tests/smokes qui lancent `setup.mjs` en vrai passent `--no-skills` (pas de réseau).
- MANDATORY avant commit : `node --test` vert, coller la fin (`# tests N`) dans le rapport.
- Interfaces existantes : `installCaveman(run=defaultRun)` (external.mjs, `run` injectable) ; `resolveAssets` pousse `inAssistant` = [superpowers, design] (matrix.mjs ~L36-37) ; `renderSetupAi({stack,assistant,manifest,designSkills})` (setup-ai.mjs) appelé par `environment.mjs` (`write('docs/SETUP-AI.md', renderSetupAi({..., designSkills: DESIGN_SKILLS}))`) ; `SUPERPOWERS` (const non exportée dans matrix.mjs) ; `main()` de setup.mjs a un `fromWizard` booléen et un bloc caveman à la fin.

---

### Task 1 : `buildSkillAddArgs` + `installSkills` (external.mjs)

**Files:**
- Modify: `scripts/lib/external.mjs`
- Test: `scripts/lib/external.test.mjs` (ajouts)

**Interfaces:**
- Produces: `buildSkillAddArgs(spec, assistant) → string[]` ; `installSkills(specs, assistant, run=defaultRun) → {done:string[], failed:string[]}`. `spec = {label, repo, skills?}`.

- [ ] **Step 1 : Écrire les tests qui échouent** — ajouter à `scripts/lib/external.test.mjs` (réutilise les imports existants `test`/`assert` ; ajoute `buildSkillAddArgs, installSkills` à l'import depuis `./external.mjs`)

```js
test('buildSkillAddArgs : repo + skills + assistant', () => {
  const args = buildSkillAddArgs({ label: 'x', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines'] }, 'cursor');
  assert.deepEqual(args, ['-y', 'skills', 'add', 'github.com/anthropics/skills', '--skill', 'frontend-design', 'brand-guidelines', '-a', 'cursor', '--yes']);
});

test('buildSkillAddArgs : sans skills → pas de --skill', () => {
  const args = buildSkillAddArgs({ label: 'x', repo: 'owner/repo' }, 'codex');
  assert.deepEqual(args, ['-y', 'skills', 'add', 'owner/repo', '-a', 'codex', '--yes']);
});

test('installSkills : lance chaque spec, échec gracieux', () => {
  const calls = [];
  const run = (cmd, args) => { calls.push([cmd, args]); if (args.includes('boom/repo')) throw new Error('offline'); };
  const specs = [
    { label: 'ok1', repo: 'a/b', skills: ['s1'] },
    { label: 'ko', repo: 'boom/repo' },
    { label: 'ok2', repo: 'c/d' },
  ];
  const res = installSkills(specs, 'cursor', run);
  assert.deepEqual(res.done, ['ok1', 'ok2']);
  assert.equal(res.failed.length, 1);
  assert.match(res.failed[0], /ko .*offline/);
  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'npx');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test scripts/lib/external.test.mjs`
Expected: FAIL (`buildSkillAddArgs`/`installSkills` non exportés).

- [ ] **Step 3 : Implémenter dans `scripts/lib/external.mjs`** — ajouter en fin de fichier :

```js
// Construit les arguments de `npx skills add <repo> [--skill …] -a <assistant> --yes`.
export function buildSkillAddArgs(spec, assistant) {
  const args = ['-y', 'skills', 'add', spec.repo];
  if (spec.skills && spec.skills.length) args.push('--skill', ...spec.skills);
  args.push('-a', assistant, '--yes');
  return args;
}

// Installe une liste de skills (CLI skills.sh) pour l'assistant choisi. Échec gracieux.
export function installSkills(specs, assistant, run = defaultRun) {
  const done = [], failed = [];
  for (const spec of specs) {
    try { run('npx', buildSkillAddArgs(spec, assistant)); done.push(spec.label); }
    catch (e) { failed.push(`${spec.label} (${e.message})`); }
  }
  return { done, failed };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test scripts/lib/external.test.mjs`
Expected: PASS.

- [ ] **Step 5 : Suite + commit**

Run: `node --test` (vert).
```bash
git add scripts/lib/external.mjs scripts/lib/external.test.mjs
git commit -m "feat(external): installSkills via le CLI skills (headless, échec gracieux)"
```

---

### Task 2 : `DESIGN_SKILL_SPECS` + export `SUPERPOWERS` + retrait design de `inAssistant` (matrix.mjs)

**Files:**
- Modify: `scripts/lib/matrix.mjs`
- Modify: `scripts/lib/matrix.test.mjs`
- Test: `scripts/lib/matrix-design.test.mjs` (nouveau)

**Interfaces:**
- Produces: `export const DESIGN_SKILL_SPECS` ; `export const SHADCN_NOTE` ; `export const SUPERPOWERS` (rendre exporté) ; `resolveAssets(...).inAssistant` ne contient **plus** l'entrée design.

- [ ] **Step 1 : Écrire le test qui échoue** — `scripts/lib/matrix-design.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_SKILL_SPECS, SHADCN_NOTE, SUPERPOWERS, resolveAssets } from './matrix.mjs';

test('DESIGN_SKILL_SPECS : 3 specs, repos vérifiés, 4 skills', () => {
  assert.equal(DESIGN_SKILL_SPECS.length, 3);
  const repos = DESIGN_SKILL_SPECS.map((s) => s.repo);
  assert.ok(repos.includes('github.com/anthropics/skills'));
  assert.ok(repos.includes('github.com/vercel-labs/agent-skills'));
  assert.ok(repos.includes('github.com/nextlevelbuilder/ui-ux-pro-max-skill'));
  const all = DESIGN_SKILL_SPECS.flatMap((s) => s.skills);
  assert.deepEqual(all.sort(), ['brand-guidelines', 'frontend-design', 'ui-ux-pro-max', 'web-design-guidelines']);
});

test('SUPERPOWERS exporté + SHADCN_NOTE mentionne la clé payante', () => {
  assert.match(SUPERPOWERS['claude-code'], /plugin install superpowers/);
  assert.match(SHADCN_NOTE, /clé|payante|API/i);
});

test('resolveAssets : design retiré de inAssistant, superpowers gardé', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(!p.inAssistant.some((s) => /design/i.test(s.name)), 'plus de design dans inAssistant');
  assert.ok(p.inAssistant.some((s) => s.name === 'superpowers'));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test scripts/lib/matrix-design.test.mjs`
Expected: FAIL.

- [ ] **Step 3 : Modifier `scripts/lib/matrix.mjs`**

Rendre `SUPERPOWERS` exporté — remplacer `const SUPERPOWERS = {` par `export const SUPERPOWERS = {`.

Dans `resolveAssets`, **supprimer** la ligne qui pousse le design dans `inAssistant` :
```js
  inAssistant.push({ name: 'skills design (5)', command: `installe dans ton assistant : ${DESIGN_SKILLS} (voir guides/03 + la règle design de l'AGENTS.md)` });
```
(Garder la ligne `inAssistant.push({ name: 'superpowers', ... })`.)

Ajouter en fin de fichier :
```js
// Skills design auto-installables (headless) via le CLI skills. shadcnblocks à part (clé payante).
export const DESIGN_SKILL_SPECS = [
  { label: 'frontend-design + brand-guidelines', repo: 'github.com/anthropics/skills', skills: ['frontend-design', 'brand-guidelines'] },
  { label: 'web-design-guidelines', repo: 'github.com/vercel-labs/agent-skills', skills: ['web-design-guidelines'] },
  { label: 'ui-ux-pro-max', repo: 'github.com/nextlevelbuilder/ui-ux-pro-max-skill', skills: ['ui-ux-pro-max'] },
];

export const SHADCN_NOTE = 'shadcnblocks (optionnel) : `npx -y skills add masonjames/Shadcnblocks-Skill -a <assistant> --yes` — nécessite une clé API ShadcnBlocks (payante) + `jq` pour récupérer des blocs.';
```

- [ ] **Step 4 : Mettre à jour `scripts/lib/matrix.test.mjs`** — remplacer l'assertion design (`assert.ok(p.inAssistant.some(s => /design/i.test(s.name)));`) par :
```js
  assert.ok(!p.inAssistant.some(s => /design/i.test(s.name)));
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run: `node --test scripts/lib/matrix-design.test.mjs scripts/lib/matrix.test.mjs`
Expected: PASS.

- [ ] **Step 6 : Suite + commit**

Run: `node --test` (vert).
```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix.test.mjs scripts/lib/matrix-design.test.mjs
git commit -m "feat(matrix): DESIGN_SKILL_SPECS + export SUPERPOWERS ; design hors inAssistant"
```

---

### Task 3 : `renderSetupAi` (superpowers + design auto) + câblage `environment.mjs`

**Files:**
- Modify: `scripts/lib/setup-ai.mjs`
- Modify: `scripts/lib/environment.mjs` (call-site + import)
- Modify: `scripts/lib/setup-ai.test.mjs`

**Interfaces:**
- Consumes: `SUPERPOWERS`, `SHADCN_NOTE` (matrix.mjs, Task 2).
- Produces: `renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote }) → string`.

- [ ] **Step 1 : Réécrire les tests** — remplacer le contenu de `scripts/lib/setup-ai.test.mjs` par :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStackManifest, SUPERPOWERS, SHADCN_NOTE } from './matrix.mjs';
import { renderSetupAi } from './setup-ai.mjs';

const call = (stack, assistant) => renderSetupAi({
  stack, assistant, manifest: resolveStackManifest(stack, assistant),
  superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE,
});

test('SETUP-AI : plugins, skills, MCP, superpowers, design auto', () => {
  const md = call('saas', 'claude-code');
  assert.match(md, /\/plugin install convex@claude-plugins-official/);
  assert.match(md, /npx skills add better-auth\/skills/);
  assert.match(md, /shadcn/);
  assert.match(md, /plugin install superpowers/);           // section superpowers
  assert.match(md, /déjà installés par le wizard/i);        // section design
  assert.match(md, /shadcnblocks/i);                        // note shadcnblocks
});

test('SETUP-AI mobile : MCP expo login requis', () => {
  assert.match(call('mobile', 'claude-code'), /expo.*login requis/);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test scripts/lib/setup-ai.test.mjs`
Expected: FAIL.

- [ ] **Step 3 : Réécrire `scripts/lib/setup-ai.mjs`**

```js
// Rend docs/SETUP-AI.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/superpowers).
// Les skills design sont déjà installés par le wizard.
export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote }) {
  const L = [];
  L.push(`# Setup IA — stack ${stack} · assistant ${assistant}`);
  L.push('');
  L.push('Joue chaque case dans ton assistant IA. Coche au fur et à mesure.');
  L.push('');
  L.push('## 1. Plugins');
  if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})`);
  else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  L.push('');
  L.push('## 2. Skills portables (stack)');
  if (manifest.skills.length) for (const s of manifest.skills) L.push(`- [ ] ${s.cmd}`);
  else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : lance \`/mcp\` pour connecter${cfg.needsAuth ? ' (login requis)' : ' (déjà dans .mcp.json)'}`);
  }
  L.push('');
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  L.push('');
  L.push('## 5. Design');
  L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, web-design-guidelines, ui-ux-pro-max');
  L.push(`- [ ] ${shadcnNote}`);
  L.push('');
  L.push('## 6. Scripts package.json (à ajouter si absents après le scaffold)');
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}
```

- [ ] **Step 4 : Mettre à jour le call-site dans `scripts/lib/environment.mjs`**

Remplacer l'import :
```js
import { resolveStackManifest, DESIGN_SKILLS } from './matrix.mjs';
```
par :
```js
import { resolveStackManifest, SUPERPOWERS, SHADCN_NOTE } from './matrix.mjs';
```

Remplacer l'appel (dans le bloc « 6. SETUP-AI.md ») :
```js
  try { write('docs/SETUP-AI.md', renderSetupAi({ stack, assistant, manifest, designSkills: DESIGN_SKILLS })); done.push('docs/SETUP-AI.md'); }
```
par :
```js
  try { write('docs/SETUP-AI.md', renderSetupAi({ stack, assistant, manifest, superpowersCmd: SUPERPOWERS[assistant], shadcnNote: SHADCN_NOTE })); done.push('docs/SETUP-AI.md'); }
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run: `node --test scripts/lib/setup-ai.test.mjs scripts/lib/environment.test.mjs`
Expected: PASS (environment.test asserte toujours `docs/SETUP-AI.md` incluant `convex@claude-plugins-official` — inchangé).

- [ ] **Step 6 : Suite + commit**

Run: `node --test` (vert).
```bash
git add scripts/lib/setup-ai.mjs scripts/lib/environment.mjs scripts/lib/setup-ai.test.mjs
git commit -m "feat(setup-ai): section superpowers + design marqué auto-installé (+ note shadcnblocks)"
```

---

### Task 4 : `--no-skills` + auto-install dans `setup.mjs` + prompt de démarrage

**Files:**
- Modify: `scripts/lib/args.mjs` (flag `--no-skills`)
- Modify: `scripts/setup.mjs` (import ; appel `installSkills` ; prompt final)
- Modify: `scripts/lib/setup-idempotent.test.mjs` (passer `--no-skills`)
- Test: `scripts/lib/args.test.mjs` (cas `--no-skills`)

**Interfaces:**
- Consumes: `installSkills`, `DESIGN_SKILL_SPECS`, `SUPERPOWERS`.

- [ ] **Step 1 : Ajouter un test `--no-skills`** à `scripts/lib/args.test.mjs` :

```js
test('--no-skills : drapeau lu', () => {
  const a = parseArgs(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x', '--no-skills']);
  assert.equal(a.noSkills, true);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test scripts/lib/args.test.mjs`
Expected: FAIL (`--no-skills` inconnu → throw).

- [ ] **Step 3 : Ajouter `--no-skills` dans `scripts/lib/args.mjs`** — dans le `switch` de `parseArgs`, après `case '--backend': args.backend = argv[++i]; break;`, ajouter :
```js
      case '--no-skills': args.noSkills = true; break;
```

- [ ] **Step 4 : Câbler `installSkills` dans `scripts/setup.mjs`**

En tête, ajouter à l'import depuis `./lib/external.mjs` la fonction `installSkills`, et à l'import depuis `./lib/matrix.mjs` : `DESIGN_SKILL_SPECS`, `SUPERPOWERS`. (Exemple : `import { cloneRepo, pickFromClone, selectByTags, installCaveman, installSkills } from './lib/external.mjs';` et `import { resolveAssets, DESIGN_SKILL_SPECS, SUPERPOWERS } from './lib/matrix.mjs';`.)

Juste après le bloc caveman (`if (args.caveman) { … installCaveman() … }`), insérer :
```js
  if (!args.noSkills) {
    try {
      const skl = installSkills(DESIGN_SKILL_SPECS, args.assistant);
      done.push(...skl.done.map((d) => `skill design : ${d}`));
      failed.push(...skl.failed.map((f) => `skill design : ${f}`));
    } catch (e) { failed.push(`skills design (${e.message})`); }
  }
```

- [ ] **Step 5 : Imprimer le prompt de démarrage** — remplacer la ligne existante :
```js
  if (fromWizard) console.log('\n' + ok('Config prête. Ouvre ton assistant IA dans le dossier du projet et lance /new-project.', on));
```
par :
```js
  if (fromWizard) {
    console.log('\n' + ok('Config prête. Skills design installés. Ouvre ton assistant IA dans le dossier du projet.', on));
    console.log('\n— Colle ce prompt dans ton assistant —\n');
    console.log([
      "Finalise l'install et démarre :",
      '1. Ouvre docs/SETUP-AI.md → installe les plugins + skills stack, et autorise les MCP (/mcp).',
      `2. Boucle superpowers : ${SUPERPOWERS[args.assistant]}`,
      '3. /doctor pour vérifier.',
      '4. /new-project (PRD + tech spec + design), puis /build.',
    ].join('\n'));
  }
```

- [ ] **Step 6 : Mettre à jour `scripts/lib/setup-idempotent.test.mjs`** — ajouter `'--no-skills'` à la liste d'arguments (pour éviter tout appel réseau pendant le test) : remplacer
```js
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--backend', 'local'],
```
par
```js
    ['scripts/setup.mjs', '--source', '.', '--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--backend', 'local', '--no-skills'],
```

- [ ] **Step 7 : Smoke (flags + --no-skills : pas de réseau, SETUP-AI a superpowers)**

Run:
```bash
rm -rf /tmp/vs-sk && node scripts/setup.mjs --source . --stack saas --assistant claude-code --project /tmp/vs-sk --no-skills >/dev/null && node -e "const fs=require('fs');const s=fs.readFileSync('/tmp/vs-sk/docs/SETUP-AI.md','utf8');if(!/plugin install superpowers/.test(s))throw new Error('superpowers manquant');if(!/déjà installés par le wizard/.test(s))throw new Error('design auto manquant');console.log('OK setup-ai superpowers+design')"
```
Expected: `OK setup-ai superpowers+design`.

- [ ] **Step 8 : Suite complète + commit**

Run: `node --test` (vert).
```bash
git add scripts/lib/args.mjs scripts/setup.mjs scripts/lib/setup-idempotent.test.mjs scripts/lib/args.test.mjs
git commit -m "feat(setup): auto-install skills design (--no-skills pour tests) + prompt de démarrage"
```

---

## Self-Review

**Spec coverage :** auto-install 4 design → Task 1 (installSkills) + Task 2 (specs) + Task 4 (appel) ✓ ; design hors inAssistant → Task 2 ✓ ; SETUP-AI source unique + superpowers + note shadcnblocks → Task 3 ✓ ; prompt de démarrage imprimé → Task 4 ✓ ; `--no-skills` (tests offline) → Task 4 ✓.

**Placeholder scan :** pas de TBD ; code complet ; commandes vérifiées (repos issus de la recherche). ✓

**Type consistency :** `spec = {label, repo, skills?}` cohérent Task 1↔2↔4. `buildSkillAddArgs(spec, assistant) → argv` consommé par `installSkills`. `renderSetupAi({…, superpowersCmd, shadcnNote})` (Task 3) ↔ call-site environment.mjs (mêmes clés) ↔ test (Task 3). `SUPERPOWERS`/`DESIGN_SKILL_SPECS` exportés Task 2, importés Task 3/4. ✓

## Notes d'exécution

- Ordre : Task 1 → 2 → 3 → 4 (3 dépend de 2 ; 4 de 1+2).
- Branche : `git checkout -b feat/auto-skills` depuis `main` avant Task 1.
- Ne PAS lancer `installSkills` en vrai dans les tests (réseau) — le flag `--no-skills` + le `run` injecté couvrent ça.
