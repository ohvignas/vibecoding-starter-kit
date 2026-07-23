# Update pro — sections managées + `update --refresh` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un vieux projet de **récupérer les mises à jour du kit** (règles standing dans `AGENTS.md`, runbooks, subagents) via `node <kit>/scripts/update.mjs --refresh`, **sans jamais toucher** le code ni les docs de l'utilisateur.

**Architecture:** Le contenu généré de `AGENTS.md`/`CLAUDE.md` est entouré de **marqueurs** `vibecoding:start/end` (« section managée »). `update --refresh` régénère **uniquement** entre les marqueurs (la zone utilisateur en dessous est préservée) et **écrase** une liste explicite de **fichiers 100% kit** (commandes, règles globales, subagents). Tout le reste (`src/`, `docs/PRD.md`, `docs/design.md`, `docs/memory/`, code) est **intouché**. Un `--dry-run` liste ce qui changerait avant d'agir.

**Tech Stack:** Node ESM (zéro dépendance), `node --test`. Fonctions pures testables dans `scripts/lib/`.

## Global Constraints

- Node ESM, **zéro dépendance runtime**. Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- **Non destructif absolu** : `update --refresh` ne touche QUE (a) la section managée d'`AGENTS.md`/`CLAUDE.md`, (b) les fichiers listés par `kitOwnedFiles()`. Jamais `src/`, `docs/` (hors rien), `.env`, code utilisateur.
- Le comportement **par défaut** de `update.mjs` (sans `--refresh`) reste **inchangé** (`copyIfAbsent`, n'ajoute que le neuf).
- Français, accents corrects. Jamais « formation »/« accompagnement » dans les fichiers générés.
- **DRY** : le rendu d'`AGENTS.md` doit être partagé entre `setup.mjs` et `update.mjs` (une seule source).
- Marqueurs verbatim : début `<!-- vibecoding:start` … , fin `<!-- vibecoding:end -->`.
- Après modif d'un template de commande : régénérer `cursor-plugin/`.

---

## File Structure

- `scripts/lib/managed-section.mjs` — **créer** : `MARK_START`, `MARK_END`, `wrapManaged`, `extractManaged`, `mergeManagedSection` (fonctions pures).
- `scripts/lib/managed-section.test.mjs` — **créer**.
- `scripts/lib/templates.mjs` — `renderProjectAgentsMd` enveloppe le corps dans les marqueurs + ajoute la zone utilisateur.
- `scripts/lib/agents-file.mjs` — **créer** : `renderAgentsFile({ source, stack, assistant, commandsDir, learning })` (charge les snips + `renderProjectAgentsMd`) — partagé setup/update.
- `scripts/setup.mjs` — utilise `renderAgentsFile()` (DRY, remplace le bloc `snip`/`renderProjectAgentsMd` inline).
- `scripts/lib/kit-owned.mjs` — **créer** : `kitOwnedFiles(stack, assistant)` → paires `{ from, to }`.
- `scripts/lib/kit-owned.test.mjs` — **créer**.
- `scripts/update.mjs` — `--refresh` + `--dry-run` : merge section managée + écrase kit-owned + résumé.
- `scripts/lib/update-refresh.test.mjs` — **créer** (intégration temp-dir).
- `README.md` — section « Mise à jour » documente `--refresh`.
- `package.json` — bump `0.5.0` (nouvelle capacité).

---

## Task 1 : `managed-section.mjs` — fonctions pures de fusion

**Files:**
- Create: `scripts/lib/managed-section.mjs`
- Test: `scripts/lib/managed-section.test.mjs`

**Interfaces:**
- Produces: `MARK_START` (string), `MARK_END` (string), `wrapManaged(body)→string`, `extractManaged(content)→string|null`, `mergeManagedSection(existing, fresh)→string`.

- [ ] **Step 1 : Écrire les tests (échouent)**

Crée `scripts/lib/managed-section.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK_START, MARK_END, wrapManaged, extractManaged, mergeManagedSection } from './managed-section.mjs';

test('wrapManaged entoure des marqueurs', () => {
  const w = wrapManaged('CORPS');
  assert.ok(w.startsWith(MARK_START));
  assert.ok(w.trimEnd().endsWith(MARK_END));
  assert.match(w, /CORPS/);
});

test('extractManaged récupère le bloc, null si absent', () => {
  assert.equal(extractManaged('rien'), null);
  const block = wrapManaged('X');
  assert.equal(extractManaged(`avant\n${block}\naprès`), block);
});

test('merge : marqueurs présents → remplace en place, zone utilisateur préservée', () => {
  const existing = `${wrapManaged('VIEUX')}\n\n## Mes règles\nGARDE-MOI`;
  const fresh = wrapManaged('NEUF');
  const out = mergeManagedSection(existing, fresh);
  assert.match(out, /NEUF/);
  assert.doesNotMatch(out, /VIEUX/);
  assert.match(out, /GARDE-MOI/);
});

test('merge : marqueurs absents → préfixe le bloc, ancien contenu conservé dessous', () => {
  const out = mergeManagedSection('ANCIEN SANS MARQUEURS', wrapManaged('NEUF'));
  assert.ok(out.indexOf('NEUF') < out.indexOf('ANCIEN SANS MARQUEURS'));
  assert.match(out, /ANCIEN SANS MARQUEURS/);
});

test('merge est idempotent (rejouer ne change rien)', () => {
  const fresh = wrapManaged('NEUF');
  const once = mergeManagedSection(`${fresh}\n\nUSER`, fresh);
  const twice = mergeManagedSection(once, fresh);
  assert.equal(once, twice);
});

test('merge jette si le frais n\'a pas de marqueurs', () => {
  assert.throws(() => mergeManagedSection('x', 'pas de marqueurs'), /marqueurs/);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/managed-section.test.mjs`
Expected : FAIL (`managed-section.mjs` n'existe pas).

- [ ] **Step 3 : Écrire `scripts/lib/managed-section.mjs`**

```js
// Bloc « managé » dans AGENTS.md/CLAUDE.md : régénéré par `update --refresh`.
// Tout ce qui est HORS des marqueurs appartient à l'utilisateur et n'est jamais touché.
export const MARK_START = '<!-- vibecoding:start — bloc généré, régénéré par `node <kit>/scripts/update.mjs --refresh` ; n\'édite pas ici -->';
export const MARK_END = '<!-- vibecoding:end -->';

export function wrapManaged(body) {
  return `${MARK_START}\n${body}\n${MARK_END}`;
}

// Extrait le bloc managé (marqueurs inclus). null si absent/malformé.
export function extractManaged(content) {
  const s = content.indexOf(MARK_START);
  const e = content.indexOf(MARK_END);
  if (s === -1 || e === -1 || e < s) return null;
  return content.slice(s, e + MARK_END.length);
}

// Fusionne : remplace le bloc managé de `existing` par celui de `fresh`.
// - marqueurs présents dans existing → remplacement EN PLACE (zone utilisateur préservée).
// - absents → migration douce : bloc frais en tête, ancien contenu conservé dessous.
export function mergeManagedSection(existing, fresh) {
  const freshBlock = extractManaged(fresh);
  if (!freshBlock) throw new Error('Contenu frais sans marqueurs vibecoding.');
  const s = existing.indexOf(MARK_START);
  const e = existing.indexOf(MARK_END);
  if (s !== -1 && e !== -1 && e > s) {
    return existing.slice(0, s) + freshBlock + existing.slice(e + MARK_END.length);
  }
  return `${freshBlock}\n\n${existing}`;
}
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/managed-section.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/managed-section.mjs scripts/lib/managed-section.test.mjs
git commit -m "feat(update): managed-section — fusion non destructive par marqueurs"
```

---

## Task 2 : `renderProjectAgentsMd` avec marqueurs + helper `renderAgentsFile` (DRY)

**Files:**
- Modify: `scripts/lib/templates.mjs` (import `wrapManaged` ; enveloppe le corps ; ajoute la zone utilisateur)
- Create: `scripts/lib/agents-file.mjs`
- Modify: `scripts/setup.mjs` (utilise `renderAgentsFile`)
- Test: `scripts/lib/templates.test.mjs`

**Interfaces:**
- Consumes: `wrapManaged` (Task 1).
- Produces: `renderProjectAgentsMd(...)` → fichier avec marqueurs + zone utilisateur ; `renderAgentsFile({ source, stack, assistant, commandsDir, learning })` → string identique à ce que setup écrit aujourd'hui.

- [ ] **Step 1 : Test rendu marqueurs (échoue)**

Ajoute à `scripts/lib/templates.test.mjs` :

```js
import { MARK_START, MARK_END } from './managed-section.mjs';

test('renderProjectAgentsMd : corps managé entre marqueurs + zone utilisateur dessous', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', loopSection: 'BOUCLE' });
  assert.ok(out.includes(MARK_START) && out.includes(MARK_END), 'marqueurs présents');
  assert.ok(out.indexOf('BOUCLE') > out.indexOf(MARK_START) && out.indexOf('BOUCLE') < out.indexOf(MARK_END), 'boucle DANS le bloc managé');
  assert.ok(out.indexOf('Tes règles à toi') > out.indexOf(MARK_END), 'zone utilisateur APRÈS le bloc');
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/templates.test.mjs`
Expected : FAIL (pas de marqueurs).

- [ ] **Step 3 : Envelopper le corps dans `renderProjectAgentsMd`**

Dans `scripts/lib/templates.mjs` : ajoute en tête `import { wrapManaged } from './managed-section.mjs';`. Puis dans `renderProjectAgentsMd`, mets tout le contenu actuellement retourné dans une variable `body`, et remplace le `return \`...\`` final par :

```js
  const body = `# Règles projet (généré par vibe-stack)
@docs/memory/index.md

Stack : **${stack}** · Assistant : **${assistant}**.

${loopSection}

${designRule}

${subagentsRule}

${verifyRule}

${secretsRule}

${cssMaquetteRule}

${memoryRules}

${learningSection}## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et \`ai-context/\`. Si présents : \`AGENTS-stack.md\`, \`AGENTS-karpathy.md\`.

## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Capacités : \`docs/DOMAINS.md\` · Architecture : \`docs/superpowers/specs/\` · Propositions (dream) : \`docs/DREAM.md\`.

## Commandes
\`/new-project\` (fondation) · \`/build\` (construire la roadmap, jalon par jalon) · \`/new-feature\` (livrer une feature) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.

## Maquette
La maquette de référence est dans \`maquette/\`.`;
  return `${wrapManaged(body)}

## Tes règles à toi (préservées lors des mises à jour)
<!-- Ajoute ici tes règles projet perso. \`update --refresh\` ne touche JAMAIS cette zone. -->
`;
```

> Note : reprends le corps EXACT depuis le fichier actuel (le bloc ci-dessus doit refléter les sections déjà présentes). Ne change pas le contenu, seulement l'enveloppe.

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/templates.test.mjs`
Expected : PASS. (Les tests existants `BOUCLE-SP`/`REGLE-*` restent verts : le contenu est le même, seulement enveloppé.)

- [ ] **Step 5 : Créer `renderAgentsFile` (DRY)**

Lis d'abord le bloc actuel de `scripts/setup.mjs` (autour de `const snip =` / `renderProjectAgentsMd(...)`). Crée `scripts/lib/agents-file.mjs` qui **reproduit** ce câblage :

```js
import fs from 'node:fs';
import path from 'node:path';
import { renderProjectAgentsMd } from './templates.mjs';

// Source unique du rendu AGENTS.md/CLAUDE.md — utilisée par setup ET update --refresh.
export function renderAgentsFile({ source, stack, assistant, commandsDir, learning = true }) {
  const snip = (f) => { try { return fs.readFileSync(path.join(source, `templates/agents/${f}`), 'utf8'); } catch { return ''; } };
  return renderProjectAgentsMd({
    stack, assistant, commandsDir, learning,
    loopSection: snip('loop-section.md'), designRule: snip('design-rule.md'),
    subagentsRule: snip('subagents-rule.md'), verifyRule: snip('verify-rule.md'),
    secretsRule: snip('secrets-cost-rule.md'), cssMaquetteRule: snip('css-maquette-rule.md'),
    memoryRules: snip('memory-rules.md'),
  });
}
```

- [ ] **Step 6 : Brancher `setup.mjs` sur le helper**

Dans `scripts/setup.mjs`, remplace la ligne `const snip = …` + `const agents = renderProjectAgentsMd({ … });` par :

```js
  const agents = renderAgentsFile({ source: args.source, stack: args.stack, assistant: args.assistant, commandsDir: assets.commandsDir, learning: args.learning });
```

et ajoute l'import `import { renderAgentsFile } from './lib/agents-file.mjs';` (retire l'import `renderProjectAgentsMd` de setup s'il n'est plus utilisé ailleurs). `args.learning` peut être `undefined` → `renderProjectAgentsMd` a `learning = true` par défaut, cohérent avec l'existant.

- [ ] **Step 7 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 8 : Commit**

```bash
git add scripts/lib/templates.mjs scripts/lib/templates.test.mjs scripts/lib/agents-file.mjs scripts/setup.mjs
git commit -m "feat(update): AGENTS.md en section managée (marqueurs) + renderAgentsFile partagé"
```

---

## Task 3 : `kit-owned.mjs` — liste des fichiers régénérables

**Files:**
- Create: `scripts/lib/kit-owned.mjs`, `scripts/lib/kit-owned.test.mjs`

**Interfaces:**
- Produces: `kitOwnedFiles(stack, assistant)` → `Array<{ from: string, to: string }>` (chemins relatifs kit → projet).

- [ ] **Step 1 : Vérifier le mapping réel des commandes**

Lis `scripts/setup.mjs` : comment les commandes sont écrites par assistant (dossier cible = `assets.commandsDir`, source = `templates/commands/<c>.md`). Confirme la liste des commandes et les dossiers cibles (`cursor`→`.cursor/commands`, `claude-code`→`.claude/commands`, `codex`→`docs/commands`). Ce mapping doit être **identique** dans `kit-owned.mjs`.

- [ ] **Step 2 : Test (échoue)**

Crée `scripts/lib/kit-owned.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitOwnedFiles } from './kit-owned.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('kitOwnedFiles(saas, claude-code) : commandes + subagents, sources existantes', () => {
  const files = kitOwnedFiles('saas', 'claude-code');
  assert.ok(files.some((f) => f.to === '.claude/commands/new-project.md'));
  assert.ok(files.some((f) => f.to === '.claude/agents/test-runner.md'));
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f.from)), `source existe : ${f.from}`);
});

test('kitOwnedFiles(saas, cursor) : commandes + règles globales, PAS de subagents', () => {
  const files = kitOwnedFiles('saas', 'cursor');
  assert.ok(files.some((f) => f.to === '.cursor/commands/build.md'));
  assert.ok(files.some((f) => f.to === '.cursor/rules/10-css-maquette.mdc'));
  assert.equal(files.some((f) => f.to.startsWith('.claude/')), false);
});

test('kitOwnedFiles ne contient AUCUN chemin utilisateur (src/docs/.env)', () => {
  for (const a of ['cursor', 'claude-code', 'codex']) {
    for (const f of kitOwnedFiles('saas', a)) {
      assert.doesNotMatch(f.to, /^src\/|^docs\/(PRD|ROADMAP|design|memory)|\.env/, `chemin utilisateur interdit : ${f.to}`);
    }
  }
});
```

- [ ] **Step 3 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/kit-owned.test.mjs`
Expected : FAIL (module absent).

- [ ] **Step 4 : Écrire `scripts/lib/kit-owned.mjs`**

```js
// Fichiers 100% kit (aucune édition utilisateur attendue) → régénérables par `update --refresh`.
// Retourne des paires { from (relatif au kit), to (relatif au projet) }. JAMAIS de chemin utilisateur.
const COMMANDS = ['help', 'new-project', 'new-feature', 'edit-design', 'doctor', 'build', 'next', 'sos', 'debug', 'deploy'];
const CMD_DIR = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };

export function kitOwnedFiles(stack, assistant) {
  const dir = CMD_DIR[assistant];
  if (!dir) throw new Error(`Assistant inconnu : ${assistant}`);
  const pairs = COMMANDS.map((c) => ({ from: `templates/commands/${c}.md`, to: `${dir}/${c}.md` }));
  if (assistant === 'cursor') {
    pairs.push({ from: 'templates/cursor/rules/00-project.mdc', to: '.cursor/rules/00-project.mdc' });
    pairs.push({ from: 'templates/cursor/rules/10-css-maquette.mdc', to: '.cursor/rules/10-css-maquette.mdc' });
  }
  if (assistant === 'claude-code') {
    for (const a of ['code-reviewer', 'security-reviewer', 'test-runner']) {
      pairs.push({ from: `templates/agents/subagents/${a}.md`, to: `.claude/agents/${a}.md` });
    }
  }
  return pairs;
}
```

- [ ] **Step 5 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/kit-owned.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add scripts/lib/kit-owned.mjs scripts/lib/kit-owned.test.mjs
git commit -m "feat(update): kitOwnedFiles — liste blanche des fichiers régénérables"
```

---

## Task 4 : `update.mjs --refresh` (+ `--dry-run`)

**Files:**
- Modify: `scripts/update.mjs`
- Test: `scripts/lib/update-refresh.test.mjs` (créer)

**Interfaces:**
- Consumes: `renderAgentsFile` (Task 2), `mergeManagedSection` (Task 1), `kitOwnedFiles` (Task 3), `resolveAssets` (existant, pour `commandsDir`).
- Produces: `refreshProject({ source, projectDir, manifest, dryRun })` → `{ changed: string[], skipped: string[] }` ; drapeaux CLI `--refresh`, `--dry-run`.

- [ ] **Step 1 : Test intégration (échoue)**

Crée `scripts/lib/update-refresh.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshProject } from '../update.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  // AGENTS.md avec un vieux bloc managé + une zone utilisateur à préserver
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '<!-- vibecoding:start x -->\nVIEILLE REGLE\n<!-- vibecoding:end -->\n\n## Mes règles\nGARDE-MOI');
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '<!-- vibecoding:start x -->\nVIEUX\n<!-- vibecoding:end -->');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/app.ts'), 'MON CODE');
  return dir;
}

test('refresh : régénère le bloc managé, préserve zone utilisateur ET src/', () => {
  const dir = fakeProject();
  const res = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Règle design/, 'nouvelles règles injectées');
  assert.doesNotMatch(agents, /VIEILLE REGLE/, 'ancien bloc remplacé');
  assert.match(agents, /GARDE-MOI/, 'zone utilisateur préservée');
  assert.equal(fs.readFileSync(path.join(dir, 'src/app.ts'), 'utf8'), 'MON CODE', 'src/ intouché');
  assert.ok(res.changed.includes('AGENTS.md'));
});

test('refresh --dry-run : n\'écrit rien', () => {
  const dir = fakeProject();
  const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: true });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before, 'inchangé en dry-run');
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/update-refresh.test.mjs`
Expected : FAIL (`refreshProject` non exporté).

- [ ] **Step 3 : Implémenter `refreshProject` + les drapeaux dans `scripts/update.mjs`**

Ajoute les imports en tête :

```js
import { renderAgentsFile } from './lib/agents-file.mjs';
import { mergeManagedSection } from './lib/managed-section.mjs';
import { kitOwnedFiles } from './lib/kit-owned.mjs';
import { resolveAssets } from './lib/matrix.mjs';
```

Ajoute la fonction (exportée) :

```js
// Régénère la section managée d'AGENTS.md/CLAUDE.md + écrase les fichiers 100% kit.
// Ne touche RIEN d'autre. dryRun=true → calcule sans écrire.
export function refreshProject({ source, projectDir, manifest, dryRun = false }) {
  const { stack, assistant } = manifest;
  const { commandsDir } = resolveAssets(stack, assistant);
  const changed = [], skipped = [];

  // 1) AGENTS.md / CLAUDE.md : fusion de la section managée
  const fresh = renderAgentsFile({ source, stack, assistant, commandsDir });
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(dest)) { skipped.push(`${name} (absent)`); continue; }
    const existing = fs.readFileSync(dest, 'utf8');
    const merged = mergeManagedSection(existing, fresh);
    if (merged !== existing) { if (!dryRun) fs.writeFileSync(dest, merged); changed.push(name); }
  }

  // 2) Fichiers 100% kit : écrasement ciblé (seulement si le contenu diffère)
  for (const { from, to } of kitOwnedFiles(stack, assistant)) {
    const src = path.join(source, from), dst = path.join(projectDir, to);
    if (!fs.existsSync(src)) { skipped.push(`${to} (source absente)`); continue; }
    const next = fs.readFileSync(src, 'utf8');
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (prev !== next) {
      if (!dryRun) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); }
      changed.push(to);
    }
  }
  return { changed, skipped };
}
```

Enfin, dans le bloc `if (import.meta.url === …)`, gère les drapeaux : après avoir lu `manifest`, ajoute :

```js
    const refresh = process.argv.includes('--refresh');
    const dryRun = process.argv.includes('--dry-run');
    if (refresh) {
      const { changed, skipped } = refreshProject({ source: kitRoot, projectDir, manifest, dryRun });
      console.log(dryRun ? '\n[dry-run] Fichiers qui seraient régénérés :' : '\nFichiers régénérés (kit) :');
      for (const c of changed) console.log(`  ~ ${c}`);
      if (!changed.length) console.log('  (rien à changer — déjà à jour)');
      console.log('\nZone « Tes règles à toi », src/, docs/ (PRD/design/mémoire) : NON touchés.');
      if (!dryRun) console.log('Astuce : relance avec `--dry-run` d\'abord pour prévisualiser.');
    } else {
      execFileSync(process.execPath, buildUpdateArgs(manifest, projectDir, kitRoot), { stdio: 'inherit' });
      console.log('\nÀ jour (fichiers neufs ajoutés). Pour aussi rafraîchir les règles/runbooks du kit : relance avec `--refresh`.');
    }
```

(Remplace l'appel `execFileSync(...)` existant par ce `if/else` ; garde le message de version `kitVersion` au-dessus.)

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/update-refresh.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/update.mjs scripts/lib/update-refresh.test.mjs
git commit -m "feat(update): update.mjs --refresh (+ --dry-run) — régénère règles/runbooks sans toucher ton code"
```

---

## Task 5 : Docs + vérif bout-en-bout + bump

**Files:**
- Modify: `README.md` (section mise à jour), `package.json:3`

- [ ] **Step 1 : README — documenter `--refresh`**

Dans `README.md`, sous le `> [!TIP]` qui mentionne `scripts/update.mjs`, ajoute :

```md
> [!TIP]
> **Récupérer les nouveautés du kit dans un vieux projet** :
> - `node <kit>/scripts/update.mjs` — **ajoute** les fichiers neufs, n'écrase rien.
> - `node <kit>/scripts/update.mjs --refresh` — **régénère aussi** les règles (`AGENTS.md`, entre les marqueurs) + runbooks + subagents. Ta zone « Tes règles à toi », ton `src/` et tes `docs/` (PRD, design, mémoire) ne sont **jamais** touchés. Ajoute `--dry-run` pour prévisualiser.
```

- [ ] **Step 2 : Bump + régénère plugin**

`package.json:3` → `"version": "0.5.0",`. Puis : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs`.

- [ ] **Step 3 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 4 : Vérif réelle « vieux projet → refresh »**

```bash
T=/private/tmp/refresh-e2e; rm -rf "$T"
# 1) scaffold « ancienne » version
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/setup.mjs "$T" --stack saas --assistant claude-code --no-skills --yes
# 2) l'utilisateur ajoute SA règle dans la zone utilisateur + du code
printf '\nMA REGLE PERSO A MOI\n' >> "$T/AGENTS.md"
mkdir -p "$T/src"; echo 'MON CODE' > "$T/src/app.ts"
# 3) simule une vieille version : casse une règle dans le bloc managé
node -e "let f='$T/AGENTS.md',s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s.replace(/Règle secrets & coûts/,'VIEUX TITRE'))"
# 4) refresh
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/update.mjs --project "$T" --refresh
# 5) vérifs
grep -c "Règle secrets & coûts" "$T/AGENTS.md"     # 1 = règle régénérée
grep -c "MA REGLE PERSO A MOI" "$T/AGENTS.md"       # 1 = zone user préservée
cat "$T/src/app.ts"                                  # MON CODE = intact
```
Expected : règle régénérée (**1**), règle perso préservée (**1**), `src/app.ts` = `MON CODE`.

- [ ] **Step 5 : Commit**

```bash
git add README.md package.json cursor-plugin
git commit -m "docs(update): documente update --refresh + bump 0.5.0"
```

---

## Self-Review

**1. Spec coverage** — (a) sections managées avec marqueurs → Task 1+2 ; (b) `update --refresh` régénère règles/runbooks → Task 4 ; (c) ne touche jamais code/docs user → `kitOwnedFiles` whitelist (Task 3) + zone utilisateur (Task 2) + vérif E2E (Task 5 Step 4) ; (d) version dans le manifeste → **déjà fait** (0.4.8) ; (e) `--dry-run` preview → Task 4. ✅

**2. Placeholder scan** — aucun « TBD ». Le seul renvoi à « lire le fichier » (Task 2 Step 3, Task 3 Step 1) est une **vérification d'alignement** contre le code existant, pas un trou — le code à écrire est donné.

**3. Type consistency** — `renderAgentsFile({ source, stack, assistant, commandsDir, learning })` : même signature consommée par setup (Task 2 Step 6) et update (`refreshProject`, Task 4). `mergeManagedSection(existing, fresh)` : `fresh` est toujours la sortie de `renderAgentsFile` (contient les marqueurs via `wrapManaged`) → l'invariant « fresh a des marqueurs » tient. `kitOwnedFiles` renvoie `{from,to}` ; `refreshProject` lit `from`/`to` → cohérent. `resolveAssets(stack,assistant).commandsDir` existe déjà (utilisé par setup).

**4. Non-régression** — `update.mjs` sans `--refresh` = comportement actuel exact (branche `else`). `renderProjectAgentsMd` : contenu identique, seulement enveloppé → les tests existants (`BOUCLE-SP`, `REGLE-*`) restent verts car ils cherchent des sous-chaînes, toujours présentes dans le bloc.
