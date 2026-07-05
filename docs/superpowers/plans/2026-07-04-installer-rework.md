# Rework installeur (SP-F) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Retirer BMAD de l'installeur et câbler la génération, par assistant, des 3 commandes (`/new-project`, `/new-feature`, `/edit-design`) + mémoire (`docs/memory/`) + dream (`.github/workflows/dream.yml` + `docs/DREAM.md`) + un `AGENTS.md` composé (boucle superpowers + règle design + règles mémoire + `@import` index), et signaler l'install des 5 skills design.

**Architecture:** Task 1 remanie **d'un bloc** les 4 fichiers de code interdépendants (`matrix.mjs`, `external.mjs`, `templates.mjs`, `setup.mjs`) + leurs 4 tests → la suite reste verte. Task 2 met à jour la doc `playbook/` + le validateur `scripts/lib/validate.mjs`. Les templates sources (commandes, mémoire, dream, agents) existent déjà (SP-A..E).

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Node réel si bruit nvm : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.

## Global Constraints

- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- **Plus aucune référence BMAD** dans l'installeur (matrix, external, setup, templates, playbook, validate). superpowers = pilote.
- Destinations commandes : Cursor → `.cursor/commands/`, Claude Code → `.claude/commands/`, Codex → `docs/commands/`.
- L'`AGENTS.md` généré compose `@docs/memory/index.md` en tête + `loop-section.md` + `design-rule.md` + `memory-rules.md` + liens docs + section commandes + maquette. Claude Code : écrire aussi `CLAUDE.md`.
- Idempotent (`copyIfAbsent`) ; échecs capturés, jamais de crash. Les 4 fichiers de code changent **ensemble** (interdépendants) — la suite doit rester verte à la fin de Task 1.
- Ne rien casser des exports/tests non liés (args, fsops, prereqs, report, validate-commands, runbooks, memory/dream validators).

---

### Task 1 : Rework du cœur de l'installeur (4 fichiers de code + 4 tests, atomique)

**Files:**
- Modify: `scripts/lib/matrix.mjs`, `scripts/lib/matrix.test.mjs`
- Modify: `scripts/lib/external.mjs`, `scripts/lib/external.test.mjs`
- Modify: `scripts/lib/templates.mjs`, `scripts/lib/templates.test.mjs`
- Modify: `scripts/setup.mjs`, `scripts/setup.test.mjs`

**Interfaces (après cette tâche) :**
- `resolveAssets(stack, assistant) -> { copies, clones, inAssistant, skipped, commandsDir }` (plus de `bmad`).
- `external.mjs` sans `runBmad` (garde `cloneRepo`, `pickFromClone`, `selectByTags`, `installCaveman`).
- `renderProjectAgentsMd({ stack, assistant, commandsDir, loopSection, designRule, memoryRules }) -> string`.
- `setup.mjs main()` : génère AGENTS/CLAUDE composés + commandes + mémoire + dream ; plus de `runBmad`.

- [ ] **Step 1 : Mettre à jour les 4 fichiers de test** (ils échoueront jusqu'à l'implémentation)

`scripts/lib/matrix.test.mjs` (remplacer tout le contenu) :
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssets } from './matrix.mjs';

test('SaaS + Cursor : mdc stack, MCP cursor, 2 clones, commandsDir cursor, pas de bmad', () => {
  const p = resolveAssets('saas', 'cursor');
  assert.ok(p.copies.find(c => c.to === '.cursor/rules/stack-saas.mdc' && c.transform === 'mdc'));
  assert.ok(p.copies.find(c => c.to === '.cursor/mcp.json'));
  assert.equal(p.clones.length, 2);
  assert.equal(p.commandsDir, '.cursor/commands');
  assert.equal(p.inAssistant[0].command, '/add-plugin superpowers');
  assert.ok(p.inAssistant.some(s => /design/i.test(s.name)));
  assert.equal(p.bmad, undefined);
});
test('Desktop + Claude Code : pas de MCP, cursorrules sauté, skill dir, commandsDir claude', () => {
  const p = resolveAssets('desktop', 'claude-code');
  assert.ok(!p.copies.find(c => (c.to || '').includes('mcp.json')));
  assert.ok(p.skipped.find(s => s.name === 'awesome-cursorrules'));
  assert.ok(p.copies.find(c => c.to === '.claude/skills/stack-desktop' && c.transform === 'dir'));
  assert.equal(p.commandsDir, '.claude/commands');
  assert.equal(p.clones.length, 1);
});
test('Mobile + Codex : AGENTS brut, superpowers /plugins, commandsDir docs/commands', () => {
  const p = resolveAssets('mobile', 'codex');
  assert.ok(p.copies.find(c => c.from === 'stacks/mobile/AGENTS.md' && c.transform === 'raw'));
  assert.equal(p.commandsDir, 'docs/commands');
  assert.match(p.inAssistant[0].command, /plugins/);
});
test('assistant inconnu → throw', () => {
  assert.throws(() => resolveAssets('saas', 'windsurf'), /Assistant inconnu/);
});
```

`scripts/lib/external.test.mjs` : **supprimer** le `test('runBmad …')` et retirer `runBmad` de la ligne d'import `import { … } from './external.mjs'`. Garder les tests `selectByTags`, `pickFromClone`, et `installCaveman` s'il existe.

`scripts/lib/templates.test.mjs` : remplacer le test `renderProjectAgentsMd …` par :
```js
test('renderProjectAgentsMd compose la boucle + @import mémoire, sans BMAD', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', commandsDir: '.cursor/commands', loopSection: 'BOUCLE-SP', designRule: 'REGLE-DESIGN', memoryRules: 'REGLES-MEMOIRE' });
  assert.match(out, /@docs\/memory\/index\.md/);
  assert.match(out, /BOUCLE-SP/);
  assert.match(out, /REGLE-DESIGN/);
  assert.match(out, /REGLES-MEMOIRE/);
  assert.match(out, /saas/);
  assert.match(out, /new-project/);
  assert.doesNotMatch(out, /BMAD/i);
});
```
(garder le test `toCursorMdc …` intact.)

`scripts/setup.test.mjs` : remplacer l'assertion `assets.bmad.toolKey` par :
```js
  assert.equal(assets.commandsDir, '.cursor/commands');
```

- [ ] **Step 2 : Lancer → échec** — `node --test scripts/lib/matrix.test.mjs scripts/lib/templates.test.mjs scripts/setup.test.mjs` (FAIL attendu).

- [ ] **Step 3 : Réécrire `scripts/lib/matrix.mjs`**

```js
const TARGET = { cursor: '.cursor/commands', 'claude-code': '.claude/commands', codex: 'docs/commands' };
const SUPERPOWERS = {
  cursor: '/add-plugin superpowers',
  'claude-code': '/plugin install superpowers@claude-plugins-official',
  codex: '/plugins  (chercher « Superpowers » puis installer)',
};
const DESIGN_SKILLS = 'frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines';
const KARPATHY_REPO = 'https://github.com/multica-ai/andrej-karpathy-skills';
const CURSORRULES_REPO = 'https://github.com/PatrickJS/awesome-cursorrules';
const CURSOR_TAGS = { saas: ['typescript', 'react', 'clean-code'], mobile: ['react-native', 'typescript', 'expo'], desktop: ['typescript', 'clean-code'] };

export function resolveAssets(stack, assistant) {
  if (!TARGET[assistant]) throw new Error(`Assistant inconnu : ${assistant} (attendu: ${Object.keys(TARGET).join('|')})`);
  const copies = [], clones = [], inAssistant = [], skipped = [];
  const isCursor = assistant === 'cursor';
  const isClaude = assistant === 'claude-code';

  if (isCursor) {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles stack ${stack}` });
  } else {
    copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `AGENTS-stack.md`, transform: 'raw' });
    if (isClaude) copies.push({ from: `.claude/skills/stack-${stack}`, to: `.claude/skills/stack-${stack}`, transform: 'dir' });
  }
  copies.push({ from: `ai-context`, to: `ai-context`, transform: 'dir' });
  if (stack !== 'desktop') copies.push({ from: `.mcp.json`, to: isCursor ? `.cursor/mcp.json` : `.mcp.json`, transform: 'raw' });

  clones.push({
    repo: KARPATHY_REPO,
    picks: isCursor
      ? [{ src: '.cursor/rules/karpathy-guidelines.mdc', to: '.cursor/rules/karpathy.mdc' }]
      : [{ src: 'CLAUDE.md', to: 'AGENTS-karpathy.md' }],
  });
  if (isCursor) clones.push({ repo: CURSORRULES_REPO, matchTags: CURSOR_TAGS[stack], to: '.cursor/rules' });
  else skipped.push({ name: 'awesome-cursorrules', reason: 'Format .mdc spécifique à Cursor' });

  inAssistant.push({ name: 'superpowers', command: SUPERPOWERS[assistant] });
  inAssistant.push({ name: 'skills design (5)', command: `installe dans ton assistant : ${DESIGN_SKILLS} (voir guides/03 + la règle design de l'AGENTS.md)` });

  return { copies, clones, inAssistant, skipped, commandsDir: TARGET[assistant] };
}
```

- [ ] **Step 4 : Éditer `scripts/lib/external.mjs`** — supprimer entièrement `export function runBmad(...) { ... }`. Ne pas toucher à `cloneRepo`, `pickFromClone`, `selectByTags`, `installCaveman`, `defaultRun`.

- [ ] **Step 5 : Réécrire `renderProjectAgentsMd` dans `scripts/lib/templates.mjs`** (laisser `toCursorMdc` intact) :

```js
export function renderProjectAgentsMd({ stack, assistant, commandsDir = '', loopSection = '', designRule = '', memoryRules = '' }) {
  return `# Règles projet (généré par vibe-stack)

@docs/memory/index.md

Stack : **${stack}** · Assistant : **${assistant}**.

${loopSection}

${designRule}

${memoryRules}

## Contexte de la stack
Voir les règles de stack (\`.cursor/rules/\` ou \`.claude/skills/\`) et \`ai-context/\`. Si présents : \`AGENTS-stack.md\`, \`AGENTS-karpathy.md\`.

## Docs du projet
PRD : \`docs/PRD.md\` · Roadmap : \`docs/ROADMAP.md\` · Design : \`docs/design.md\` · Architecture : \`docs/superpowers/specs/\` · Propositions (dream) : \`docs/DREAM.md\`.

## Commandes
\`/new-project\` (fondation) · \`/new-feature\` (livrer) · \`/edit-design\` (UI). Runbooks dans \`${commandsDir}/\`.

## Maquette
La maquette de référence est dans \`maquette/\`.
`;
}
```

- [ ] **Step 6 : Éditer `scripts/setup.mjs`**

(a) Ligne d'import external → retirer `runBmad` :
```js
import { cloneRepo, pickFromClone, selectByTags, installCaveman } from './lib/external.mjs';
```
(b) Remplacer le bloc d'écriture AGENTS.md (`fs.writeFileSync(... renderProjectAgentsMd(args)); ensureDir(maquette); done.push('AGENTS.md + maquette/')`) par :
```js
  const snip = (f) => { try { return fs.readFileSync(path.join(args.source, `templates/agents/${f}`), 'utf8'); } catch { return ''; } };
  const agents = renderProjectAgentsMd({ ...args, commandsDir: assets.commandsDir, loopSection: snip('loop-section.md'), designRule: snip('design-rule.md'), memoryRules: snip('memory-rules.md') });
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), agents);
  if (args.assistant === 'claude-code') fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), agents);
  ensureDir(path.join(projectDir, 'maquette'));
  done.push('AGENTS.md + maquette/');
```
(c) Remplacer le bloc `try { runBmad(...); } catch { ... }` par :
```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design']) {
    try { copyIfAbsent(path.join(args.source, `templates/commands/${cmd}.md`), path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt); done.push(`${assets.commandsDir}/${cmd}.md`); }
    catch (e) { failed.push(`commande ${cmd} (${e.message})`); }
  }
  try { copyDirIfAbsent(path.join(args.source, 'templates/memory'), path.join(projectDir, 'docs/memory'), opt); done.push('docs/memory/'); }
  catch (e) { failed.push(`docs/memory (${e.message})`); }
  try {
    copyIfAbsent(path.join(args.source, 'templates/dream/dream.yml'), path.join(projectDir, '.github/workflows/dream.yml'), opt);
    copyIfAbsent(path.join(args.source, 'templates/dream/DREAM.md'), path.join(projectDir, 'docs/DREAM.md'), opt);
    done.push('dream (.github/workflows + docs/DREAM.md)');
  } catch (e) { failed.push(`dream (${e.message})`); }
```
(Le bloc `if (args.caveman)` et le `console.log(formatReport(...))` restent après. L'import `toCursorMdc` reste — utilisé par le transform 'mdc'.)

- [ ] **Step 7 : Lancer les tests ciblés → succès** — `node --test scripts/lib/matrix.test.mjs scripts/lib/external.test.mjs scripts/lib/templates.test.mjs scripts/setup.test.mjs`.

- [ ] **Step 8 : Dry-run** — `node scripts/setup.mjs --stack saas --assistant cursor --project /tmp/vf --dry-run` → JSON avec `commandsDir: ".cursor/commands"`, pas de `bmad`, aucun fichier écrit.

- [ ] **Step 9 : Smoke test réel** (desktop/claude-code) :
```bash
rm -rf /tmp/vf-demo && node scripts/setup.mjs --source "$PWD" --stack desktop --assistant claude-code --project /tmp/vf-demo
```
Vérifie : `AGENTS.md` (contient `@docs/memory/index.md`, la boucle, PAS de BMAD) + `CLAUDE.md` + `.claude/commands/{new-project,new-feature,edit-design}.md` + `docs/memory/index.md` + `.github/workflows/dream.yml` + `docs/DREAM.md`. (Clones réseau peuvent échouer → capturés, pas de crash.) Puis `rm -rf /tmp/vf-demo`.

- [ ] **Step 10 : Suite complète** — `node --test` → **tout PASS**.

- [ ] **Step 11 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/matrix.test.mjs scripts/lib/external.mjs scripts/lib/external.test.mjs scripts/lib/templates.mjs scripts/lib/templates.test.mjs scripts/setup.mjs scripts/setup.test.mjs
git commit -m "feat(setup): rework installeur — commandes/mémoire/dream/AGENTS composé, BMAD retiré"
```

---

### Task 2 : Playbook + validateur — superpowers pilote

**Files:**
- Delete: `playbook/bmad-kickoff.md`
- Modify: `playbook/00-START.md`, `playbook/install-tooling.md`
- Modify: `scripts/lib/validate.mjs`

**Interfaces:**
- Produces: `validatePlaybook(root)` avec un `REQUIRED` sans `bmad-kickoff` et avec les 3 runbooks.

- [ ] **Step 1 : Éditer `scripts/lib/validate.mjs`** — dans `REQUIRED`, remplacer `'playbook/bmad-kickoff.md'` par :
```js
  'templates/commands/new-project.md',
  'templates/commands/new-feature.md',
  'templates/commands/edit-design.md',
```
(garder `AGENTS.md`, `playbook/00-START.md`, `playbook/stack-saas.md`, `playbook/stack-mobile.md`, `playbook/stack-desktop.md`, `playbook/install-tooling.md`, `scripts/setup.mjs`.)

- [ ] **Step 2 : `git rm playbook/bmad-kickoff.md`**

- [ ] **Step 3 : Éditer `playbook/00-START.md`** — remplacer l'Étape 6 (BMAD) par :
```markdown
## Étape 6 — Démarrer le projet
- **Première fois** : lance **`/new-project`** (fondation : PRD + tech spec + design + roadmap).
- **Chaque feature** : **`/new-feature <description>`** (boucle → merge sur `dev`).
- **Éditer l'UI** : **`/edit-design`** (charge les skills design + `docs/design.md`).
La boucle d'itération et les règles sont dans l'`AGENTS.md` généré.
```

- [ ] **Step 4 : Éditer `playbook/install-tooling.md`** — remplacer la ligne `- **BMAD** (pilote) : …` par :
```markdown
- **superpowers** (PILOTE, dans l'assistant) : Cursor `/add-plugin superpowers` · Claude Code `/plugin install superpowers@claude-plugins-official` · Codex `/plugins`.
- **skills design (5)** : frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines (à installer dans l'assistant).
- **Commandes générées** : `/new-project`, `/new-feature`, `/edit-design` (dans `.cursor/commands` / `.claude/commands` / `docs/commands`).
- **Mémoire** : `docs/memory/` (index via `@import`). **Dream** : `.github/workflows/dream.yml` (propose-only).
```
et remplacer la « Règle d'or … BMAD pilote … » finale par : « **superpowers pilote la boucle** ; karpathy + cursorrules = garde-fous passifs. »

- [ ] **Step 5 : Lancer → succès** — `node --test scripts/lib/validate.test.mjs`, puis suite complète `node --test` → tout PASS.

- [ ] **Step 6 : Vérif anti-BMAD** — `grep -rIl BMAD scripts/ playbook/` → **aucun** fichier (le code/playbook actif ne mentionne plus BMAD ; les specs/plans historiques dans `docs/` peuvent en garder la trace).

- [ ] **Step 7 : Commit**

```bash
git add playbook/ scripts/lib/validate.mjs
git commit -m "docs(playbook): superpowers pilote, commandes/mémoire/dream (BMAD retiré)"
```
