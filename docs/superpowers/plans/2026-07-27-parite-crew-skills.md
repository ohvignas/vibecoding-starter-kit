# Parité assistants + crew réellement opérationnel + skills officiels — Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 22 manques prouvés par trois audits en contexte frais, et brancher les meilleurs skills officiels sur chaque agent. **v2** : intègre les 12 corrections issues de deux critiques du plan v1 (6 bloquants + 6 importants) — parseur robuste, chemins réels vérifiés, Codex servi, MCP jamais déclaré hors stack, suite jamais rouge, CI qui prouve la parité.

**Architecture:** (1) **Parité** : les sous-agents sont écrits dans le dossier natif de chaque assistant — `.cursor/agents/` (frontmatter transformé), `.claude/agents/` (brut), `docs/agents/crew/` (Codex, qui n'a pas de dossier d'agents). (2) **Crew opérationnel** : droits corrects, frontmatter en forme documentée, règles portées, `verificateur` câblé en gate. (3) **Skills** : specs **vérifiées par exécution** avant d'être câblées, installation non bloquante.

**Tech Stack:** Markdown + JS (Node ESM, zéro dépendance) + `node --test`.

## Global Constraints

- Tests : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`. **Suite verte à la fin de CHAQUE task** (aucun commit ne laisse le rouge).
- **Formes de frontmatter (Claude Code)** : `tools`/`disallowedTools` = scalaire à virgules ; `skills`/`mcpServers` = **liste YAML**.
- **Cursor** (2.4+) lit `.cursor/agents/` ; champs supportés : `name`, `description`, `model`, `readonly`, `is_background`. Tout le reste passe **dans le corps**.
- **Codex** n'a pas de dossier d'agents → les 7 agents vont dans **`docs/agents/crew/`** et la Règle sous-agents y renvoie. Ne rien inventer d'autre.
- 🔴 **Aucun `mcpServers:` dans le frontmatter des agents.** Aucun MCP n'est présent sur les 4 stacks (`playwright` : saas+vitrine · `maestro` : mobile · `chrome-devtools` : desktop · `convex` : saas+mobile). Les outils sont cités **dans le corps**, conditionnés à la stack.
- 🔴 **Chemins vérifiés** : les règles typées sont copiées **à plat** → `.cursor/rules/convex.mdc` (jamais `.cursor/rules/<stack>/…`). Le skill de stack est un **dossier** → ne viser que `.claude/skills/stack-<stack>/SKILL.md`.
- 🔴 **`memory-rules.md` doit conserver la chaîne littérale `consolidate-memory`** (exigée par `validate-commands.mjs:55`).
- Skills : **vérifier par exécution** (`npx skills add <repo> --list`) avant de câbler. Échec d'installation = **« sauté »**, jamais `failed` (sinon un scaffold réussi sort en `exit 1`).
- Français, accents corrects. Jamais « formation »/« accompagnement ». `cursor-plugin/` régénéré dès qu'une commande change.

---

## File Structure

- `scripts/lib/agent-frontmatter.mjs` + test — **créer** : `toCursorAgent(md)`.
- `scripts/setup.mjs` — agents par assistant ; libellé ; install des skills d'agents.
- `scripts/lib/kit-owned.mjs` + `scripts/lib/refresh.mjs` — agents des 3 assistants, règles typées (à plat), hooks Cursor, `SKILL.md`.
- `templates/agents/subagents/*.md` (7) — droits, frontmatter, règles portées, skills.
- `scripts/lib/matrix.mjs` — `AGENT_SKILL_SPECS`, `VERIF_TOOLS_NOTE`, retrait `pixelbrowse`.
- `scripts/lib/setup-ai.mjs` — outils de vérification (hors branche conditionnelle) ; MCP à 3 branches.
- `scripts/lib/environment.mjs` — pas de `.claude/` pour Codex ; note checks idempotente.
- `scripts/lib/hooks.mjs` — `claudeSettings` : + SessionStart (mémoire) et PreToolUse (garde-shell).
- `templates/commands/{build,new-feature,doctor,help,new-project}.md`, `templates/agents/{verify-rule,loop-section,memory-rules,subagents-rule}.md`, `README.md`.
- `scripts/smoke-e2e.mjs` + `.github/workflows/rot-check.yml`.
- `package.json` → `0.12.0`.

---

## Task 1 : `toCursorAgent` — robuste, testé sur les VRAIS fichiers

**Files:**
- Create: `scripts/lib/agent-frontmatter.mjs`, `scripts/lib/agent-frontmatter.test.mjs`

**Interfaces:**
- Produces: `toCursorAgent(markdown) → markdown`. Normalise CRLF ; garde `name`/`description` (**description quotée**) ; `model: inherit` ; `readonly: true` si l'agent **ne peut pas** écrire (déduit de `tools` **ou** de `disallowedTools`) ; retire `tools`/`disallowedTools`/`skills`/`mcpServers` du frontmatter et les **réinjecte dans le corps**.

- [ ] **Step 1 : Test (échoue) — sur les 7 fichiers réels, pas une fixture**

Crée `scripts/lib/agent-frontmatter.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCursorAgent } from './agent-frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'templates/agents/subagents');
const AGENTS = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const fmOf = (out) => out.split('---')[1];

test('les 7 agents réels produisent un frontmatter Cursor valide', () => {
  assert.ok(AGENTS.length >= 7, `7 agents attendus, ${AGENTS.length} trouvés`);
  for (const f of AGENTS) {
    const out = toCursorAgent(read(f));
    const fm = fmOf(out);
    assert.match(fm, /\nname: \S+/, `${f} : name`);
    assert.match(fm, /\ndescription: "/, `${f} : description quotée`);
    assert.match(fm, /\nmodel: inherit/, `${f} : modèle hérité`);
    assert.doesNotMatch(fm, /tools:|skills:|mcpServers:/, `${f} : champs non supportés retirés du frontmatter`);
    assert.doesNotMatch(out, /undefined/, `${f} : aucun champ perdu`);
  }
});

test('readonly déduit de tools OU disallowedTools', () => {
  const ro = toCursorAgent('---\nname: a\ndescription: d\ntools: Read, Grep\n---\ncorps\n');
  assert.match(ro, /readonly: true/, 'tools sans Write → readonly');
  const ro2 = toCursorAgent('---\nname: a\ndescription: d\ndisallowedTools: Write, Edit\n---\ncorps\n');
  assert.match(ro2, /readonly: true/, 'disallowedTools Write/Edit → readonly');
  const rw = toCursorAgent('---\nname: a\ndescription: d\ntools: Read, Write\n---\ncorps\n');
  assert.doesNotMatch(rw, /readonly: true/, 'peut écrire → pas readonly');
});

test('CRLF (Windows) ne casse pas le frontmatter', () => {
  const out = toCursorAgent(read(AGENTS[0]).replace(/\n/g, '\r\n'));
  assert.doesNotMatch(out, /undefined/);
  assert.equal((out.match(/^---$/gm) || []).length, 2, 'un seul frontmatter');
});

test('description contenant « : » reste du YAML valide', () => {
  const out = toCursorAgent('---\nname: a\ndescription: Fait X : puis Y\n---\ncorps\n');
  assert.match(out, /description: "Fait X : puis Y"/);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agent-frontmatter.test.mjs`
Expected : FAIL (module absent).

- [ ] **Step 3 : Écrire `scripts/lib/agent-frontmatter.mjs`**

```js
// Cursor (2.4+) lit .cursor/agents/ mais ne connaît que name/description/model/readonly/is_background.
// On transforme le frontmatter Claude Code → Cursor SANS rien perdre : outils, skills et serveurs MCP
// sont réinjectés en tête de corps. CRLF normalisé (checkout Windows), description quotée (« : » sûr).
const FM = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const WRITERS = /^(Write|Edit|NotebookEdit)$/;

function parseFrontmatter(src) {
  const m = src.match(FM);
  if (!m) return { fields: {}, body: src };
  const fields = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fields[key] = kv[2].trim(); continue; }
    const item = line.match(/^\s*-\s*(.+)$/);
    if (item && key) fields[key] = [...(Array.isArray(fields[key]) ? fields[key] : []), item[1].trim()];
  }
  return { fields, body: m[2] };
}

const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean));

export function toCursorAgent(src) {
  const { fields, body } = parseFrontmatter(String(src).replace(/\r\n/g, '\n'));
  const tools = asList(fields.tools);
  const denied = asList(fields.disallowedTools);
  const skills = asList(fields.skills);
  const mcp = asList(fields.mcpServers);
  // Lecture seule si l'agent n'a pas d'outil d'écriture, OU si l'écriture lui est explicitement refusée.
  const readonly = (tools.length > 0 && !tools.some((t) => WRITERS.test(t))) || denied.some((t) => WRITERS.test(t));

  const head = ['---', `name: ${fields.name}`, `description: ${JSON.stringify(String(fields.description || ''))}`, 'model: inherit'];
  if (readonly) head.push('readonly: true');
  head.push('---', '');

  const notes = [];
  if (skills.length) notes.push(`- **Skills à charger** : ${skills.join(', ')}.`);
  if (mcp.length) notes.push(`- **Outils (MCP)** : ${mcp.join(', ')} — si le serveur n'est pas branché sur cette stack, dis-le au lieu de deviner.`);
  if (tools.length) notes.push(`- **Périmètre** : ${tools.join(', ')}.`);
  if (denied.length) notes.push(`- **Interdit** : ${denied.join(', ')} — tu rapportes, tu ne modifies aucun fichier.`);
  const block = notes.length ? `## Outils et périmètre\n${notes.join('\n')}\n\n` : '';

  return `${head.join('\n')}${block}${body}`;
}
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agent-frontmatter.test.mjs`
Expected : PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/agent-frontmatter.mjs scripts/lib/agent-frontmatter.test.mjs
git commit -m "feat(parité): toCursorAgent — frontmatter Cursor robuste (CRLF, description quotée, readonly déduit)"
```

---

## Task 2 : Les agents arrivent chez les 3 assistants

**Files:**
- Modify: `scripts/setup.mjs`, `scripts/lib/environment.mjs`
- Test: `scripts/lib/agents-copy.test.mjs` (créer)

**Interfaces:**
- Produces: `cursor` → `.cursor/agents/*.md` (transformés) · `claude-code` → `.claude/agents/*.md` (bruts) · `codex` → `docs/agents/crew/*.md` (bruts). **Codex n'a aucun dossier `.claude/`.**

> ⚠️ La restriction de `.claude/settings.json` est **dans cette task** (pas en Task 9) : sans elle, l'assertion « Codex n'a pas de `.claude/` » échoue ici et laisserait la suite rouge jusqu'à la Task 9. Preuve : `scripts/lib/environment.mjs:57` écrit `.claude/settings.json` dans la branche `else` (donc aussi pour Codex).

- [ ] **Step 1 : Test (échoue)**

Crée `scripts/lib/agents-copy.test.mjs` : pour chaque assistant, scaffolde dans un dossier temporaire (`execFileSync(process.execPath, [setup, dir, '--stack','saas','--assistant',A,'--no-skills','--yes'])`, en s'inspirant de `scripts/setup.test.mjs` pour l'env git) et vérifie :

```js
const DEST = { cursor: '.cursor/agents', 'claude-code': '.claude/agents', codex: 'docs/agents/crew' };
// pour chaque assistant : 7 fichiers dans DEST[a], 0 dans les deux autres dossiers
// + cursor : le contenu contient 'model: inherit'
// + codex : pas de dossier .claude/ du tout
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-copy.test.mjs`
Expected : FAIL (tout va aujourd'hui dans `.claude/agents`).

- [ ] **Step 3 : Copier par assistant**

Dans `scripts/setup.mjs`, remplace le bloc :

```js
  try { trackDir('.claude/agents/ (code-reviewer + security-reviewer)', copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt)); }
```

par une copie dépendante de l'assistant : dossier cible `.cursor/agents` / `.claude/agents` / `docs/agents/crew` ; pour Cursor, écrire `toCursorAgent(contenu)` fichier par fichier (ne jamais écraser sauf `args.force`) ; pour les deux autres, `copyDirIfAbsent`. Libellé du rapport : `« agents du crew (7) »`. Importe `toCursorAgent`.

**Puis, dans le même commit** — `scripts/lib/environment.mjs` ligne ~57 :

```js
    else { write('.claude/settings.json', claudeSettings(read('.claude/settings.json'), manifest.checks.onEdit)); done.push('.claude/settings.json (checks)'); }
```

devient une branche à trois cas : `cursor` → `.cursor/hooks.json` (inchangé) · `claude-code` → `.claude/settings.json` (inchangé) · `codex` → **rien** (Codex n'a pas de hook d'édition ; la note utilisateur est ajoutée en Task 9 Step 4).

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/agents-copy.test.mjs scripts/setup.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add scripts/setup.mjs scripts/lib/agents-copy.test.mjs
git commit -m "fix(parité): les 7 agents livrés à Cursor (.cursor/agents), Claude Code et Codex (docs/agents/crew)"
```

---

## Task 3 : Droits, frontmatter, MCP hors frontmatter

**Files:**
- Modify: les 7 agents
- Test: `scripts/lib/proof.test.mjs`

- [ ] **Step 1 : Test (échoue)**

```js
const AGENTS = ['verificateur', 'test-runner', 'security-reviewer', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];

test('droits : rédacteurs d\'artefacts écrivent, les autres sont bridés', () => {
  for (const a of ['verificateur', 'security-reviewer']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^tools:.*\bWrite\b/m, `${a} écrit son artefact`);
  }
  for (const a of ['test-runner', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux']) {
    assert.match(read(`templates/agents/subagents/${a}.md`), /^disallowedTools:.*\bEdit\b/m, `${a} ne modifie pas le code`);
  }
});

test('frontmatter : skills en liste, AUCUN mcpServers (aucun MCP n\'est présent sur les 4 stacks)', () => {
  for (const a of AGENTS) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.doesNotMatch(t, /^skills: \S/m, `${a} : skills doit être une liste`);
    assert.doesNotMatch(t, /^mcpServers:/m, `${a} : pas de mcpServers en frontmatter (dépend de la stack)`);
  }
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `… --test scripts/lib/proof.test.mjs` → FAIL.

- [ ] **Step 3 : Corriger les 7 frontmatters**

- `verificateur`, `security-reviewer` : `tools: Read, Grep, Glob, Bash, Write`.
- 5 autres : `disallowedTools: Write, Edit, NotebookEdit` (pas de ligne `tools:`).
- **Supprimer toutes les lignes `mcpServers:`.** Dans le corps de chaque agent concerné, remplacer par une phrase conditionnée, ex. pour `test-runner` : « **Outils selon la stack** : web (saas, vitrine) → Playwright MCP · mobile → Maestro MCP · desktop → chrome-devtools MCP. Si le serveur n'est pas branché, dis-le (`BLOQUÉ`) au lieu de deviner. » Idem `critique-donnees` (Convex MCP sur saas/mobile) et `critique-ux` (chrome-devtools sur desktop).
- `skills:` en liste partout où il y en a.

- [ ] **Step 4 : Lancer → passe**

Run : `… --test scripts/lib/proof.test.mjs scripts/lib/agents-templates.test.mjs scripts/lib/critics.test.mjs scripts/lib/agent-frontmatter.test.mjs`
Expected : PASS (le test CRLF/readonly de Task 1 valide maintenant le cas `disallowedTools`).

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents scripts/lib/proof.test.mjs
git commit -m "fix(crew): droits cohérents, skills en liste, MCP sortis du frontmatter (dépendants de la stack)"
```

---

## Task 4 : Chaque agent porte ses règles

**Files:** les 7 agents · Test: `scripts/lib/proof.test.mjs`

- [ ] **Step 1 : Test (échoue) — assertions qui prouvent vraiment**

```js
test('règles portées par chaque agent (il ne voit pas AGENTS.md)', () => {
  for (const a of AGENTS) {
    const t = read(`templates/agents/subagents/${a}.md`);
    assert.match(t, /3 tentatives/, `${a} : règle d'arrêt`);
    assert.match(t, /ne (modifies?|touches?)[^.]*tests?/i, `${a} : tests intouchables`);
    assert.match(t, /Règles que tu portes/, `${a} : bloc de règles présent`);
  }
});
```

> Ces trois chaînes sont absentes des 7 fichiers aujourd'hui (vérifié) — le test échoue donc réellement, contrairement à `PROUVÉ|MANQUE` qui matchait déjà.

- [ ] **Step 2 : Lancer → échoue** — `… --test scripts/lib/proof.test.mjs`.

- [ ] **Step 3 : Ajouter le bloc à chaque agent** (avant la ligne finale sur le journal)

```md
## Règles que tu portes (tu ne vois pas `AGENTS.md`)
- Tu conclus par un **statut**, jamais un avis : `PROUVÉ` / `NON PROUVÉ` / `BLOQUÉ` (critiques : des `MANQUE : … — PREUVE : …`, ou « complet »).
- **Maximum 3 tentatives** sur le même point. À la 3ᵉ : `BLOQUÉ` + ce qui échoue + ce que tu as essayé + ton hypothèse.
- Tu ne **modifies ni ne désactives aucun test**. Un test doit changer ? Signale-le, n'y touche pas.
- **Zéro invention** : ce que tu affirmes se vérifie (fichier, ligne, sortie de commande). Sans preuve, tu ne le signales pas.
```

`code-reviewer` (7 lignes aujourd'hui) : ajoute aussi « signale bugs et risques, pas le style — le linter s'en charge » et « tu ne codes pas ».

- [ ] **Step 4 : Lancer → passe** — `… --test scripts/lib/proof.test.mjs scripts/lib/critics.test.mjs scripts/lib/agents-templates.test.mjs`.

- [ ] **Step 5 : Commit**

```bash
git add templates/agents/subagents scripts/lib/proof.test.mjs
git commit -m "fix(crew): chaque agent porte ses règles (statuts, 3 tentatives, tests intouchables)"
```

---

## Task 5 : Skills officiels — vérifiés PAR EXÉCUTION avant câblage

**Files:** `scripts/lib/matrix.mjs`, `scripts/setup.mjs`, `scripts/lib/setup-ai.mjs`, agents, `.github/workflows/rot-check.yml` · Test: `scripts/lib/agent-skills.test.mjs`

- [ ] **Step 1 : VÉRIFIER d'abord (aucun câblage à l'aveugle)**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
npx -y skills@latest add anthropics/skills --list | grep -i webapp-testing
npx -y skills@latest add getsentry/skills --list | grep -Ei 'code-review|find-bugs'
npx -y skills@latest add openai/skills --list | grep -Ei 'security-best-practices|security-threat-model'
```
**Règle** : ne câbler que les skills **listés par cette sortie**. `openai/skills` range certains skills sous `skills/.curated/` — si le nom n'apparaît pas, **retire-le de la spec** et note-le dans le rapport plutôt que de l'inventer.

- [ ] **Step 2 : Test (échoue)**

```js
test('AGENT_SKILL_SPECS : forme valide, jamais --all, pas de doublon de dépôt avec DESIGN_SKILL_SPECS', () => {
  const repos = new Set(DESIGN_SKILL_SPECS.map((s) => s.repo));
  for (const s of AGENT_SKILL_SPECS) {
    assert.ok(s.repo && s.label && Array.isArray(s.skills) && s.skills.length);
    assert.equal(s.all, undefined);
    assert.equal(repos.has(s.repo), false, `${s.repo} : déjà cloné par DESIGN_SKILL_SPECS → fusionner`);
  }
});

test('chaque skill installé est déclaré par l\'agent qui l\'utilise', () => {
  const all = [...DESIGN_SKILL_SPECS, ...AGENT_SKILL_SPECS].flatMap((s) => s.skills);
  for (const [agent, skill] of [['test-runner', 'webapp-testing'], ['security-reviewer', 'security-threat-model'], ['code-reviewer', 'find-bugs']]) {
    assert.ok(all.includes(skill), `${skill} doit être installé`);
    // \bskills:\b … le nom doit apparaître comme ÉLÉMENT DE LISTE, pas dans le champ name
    assert.match(read(`templates/agents/subagents/${agent}.md`), new RegExp(`^\\s*-\\s*${skill}\\s*$`, 'm'), `${agent} déclare ${skill}`);
  }
});
```

> L'assertion `^\s*-\s*<skill>$` évite le faux positif de la v1 (`/code-review/` matchait `name: code-reviewer`).

- [ ] **Step 3 : Lancer → échoue** — `… --test scripts/lib/agent-skills.test.mjs`.

- [ ] **Step 4 : `matrix.mjs`**

`webapp-testing` vient du dépôt **déjà cloné** `github.com/anthropics/skills` → **l'ajouter à la spec existante** (`skills: ['frontend-design', 'brand-guidelines', 'webapp-testing']`), pas de second clone. Puis :

```js
// Skills des agents du crew — chaque nom a été vérifié par `npx skills add <repo> --list`.
// Jamais `--all` : ces dépôts contiennent des dizaines de skills hors sujet.
export const AGENT_SKILL_SPECS = [
  { label: 'revue de code (Sentry)', repo: 'github.com/getsentry/skills', skills: ['code-review', 'find-bugs'] },
  { label: 'sécurité (OpenAI)', repo: 'github.com/openai/skills', skills: ['security-best-practices', 'security-threat-model'] },
];
```
(Retire toute entrée que le Step 1 n'a pas confirmée.)

- [ ] **Step 5 : Installation NON bloquante**

Dans `scripts/setup.mjs`, installe `AGENT_SKILL_SPECS` comme `DESIGN_SKILL_SPECS` (même helper, même `cwd`, sous `!args.noSkills`), **mais range les échecs dans la liste « sauté »** (comme les clones), jamais dans `failed` — un skill indisponible ne doit pas faire sortir le scaffold en `exit 1`.

- [ ] **Step 6 : Déclarer dans les agents**

`test-runner` → `- webapp-testing` · `security-reviewer` → `- security-best-practices`, `- security-threat-model` · `code-reviewer` → `- code-review`, `- find-bugs` · `critique-ux` → les 4 skills design (`web-design-guidelines`, `frontend-design`, `ui-ux-pro-max`, `brand-guidelines`). `verificateur`/`critique-produit`/`critique-donnees` : pas de skill officiel adapté → cite `superpowers:verification-before-completion` / `superpowers:brainstorming` / `superpowers:systematic-debugging` **dans le corps** (fournis par le plugin).

- [ ] **Step 7 : A-FAIRE + rot-check**

`setup-ai.mjs` : la section design liste `DESIGN_SKILL_SPECS` quand `skillsInstalled === false` → fais de même pour `AGENT_SKILL_SPECS`, et cite-les dans la ligne « ✅ déjà installés ».
`.github/workflows/rot-check.yml` : ajoute `getsentry/skills` et `openai/skills` à la liste des dépôts surveillés (ligne 17-20).

- [ ] **Step 8 : Lancer → passe** — `… --test scripts/lib/agent-skills.test.mjs scripts/lib/setup-ai.test.mjs scripts/lib/matrix-manifest.test.mjs`.

- [ ] **Step 9 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/setup.mjs scripts/lib/setup-ai.mjs templates/agents/subagents .github/workflows/rot-check.yml scripts/lib/agent-skills.test.mjs
git commit -m "feat(crew): skills officiels vérifiés (webapp-testing, Sentry, OpenAI) + install non bloquante + rot-check"
```

---

## Task 6 : Outils de vérification documentés — pour TOUTES les stacks

**Files:** `scripts/lib/matrix.mjs`, `scripts/lib/setup-ai.mjs` · Test: `scripts/lib/pixelrag.test.mjs`

- [ ] **Step 1 : Test (échoue) — les 4 stacks**

```js
test('A-FAIRE documente les outils de vérification sur TOUTES les stacks', () => {
  for (const s of ['saas', 'mobile', 'desktop', 'vitrine']) {
    const md = renderFor(s); // helper local, comme `call` mais paramétré
    for (const t of ['semgrep', 'gitleaks', 'osv-scanner']) assert.match(md, new RegExp(t), `${s} : ${t}`);
  }
});
```

- [ ] **Step 2 : Lancer → échoue.**

- [ ] **Step 3 : `VERIF_TOOLS_NOTE` + rendu HORS de la branche conditionnelle**

`matrix.mjs` :
```js
// Outils lancés par l'agent sécurité et le vérificateur. Gratuits, sans compte.
export const VERIF_TOOLS_NOTE = 'Outils de vérification (l\'agent sécurité les lance) : `brew install semgrep gitleaks osv-scanner` (ou `pipx install semgrep`). Sans eux, l\'agent ne peut pas produire de preuve et répondra NON PROUVÉ. Les autres (`npx oxlint`, `npx knip`) s\'exécutent sans installation.';
```
`setup-ai.mjs` : rends la section **après** le bloc `if (VISUAL_CHECK_STACKS.includes(stack)) { … }` (donc **hors** de la condition) — sinon mobile n'a rien.

- [ ] **Step 4 : Lancer → passe.**

- [ ] **Step 5 : Commit**

```bash
git add scripts/lib/matrix.mjs scripts/lib/setup-ai.mjs scripts/lib/pixelrag.test.mjs
git commit -m "fix(preuve): outils semgrep/gitleaks/osv-scanner documentés sur les 4 stacks"
```

---

## Task 7 : Le `verificateur` devient un gate

**Files:** `templates/commands/{build,new-feature}.md`, `templates/agents/{verify-rule,loop-section}.md` · Test: `scripts/lib/proof.test.mjs`

- [ ] **Step 1 : Test (échoue)**

```js
test('verificateur câblé en gate + state.yaml lu', () => {
  for (const f of ['templates/commands/build.md', 'templates/commands/new-feature.md', 'templates/agents/verify-rule.md']) {
    assert.match(read(f), /verificateur/, `${f}`);
  }
  assert.match(read('templates/agents/verify-rule.md'), /state\.yaml/);
});
```

- [ ] **Step 2 : Lancer → échoue.**

- [ ] **Step 3 : `/build` — insérer AVANT la ligne 10 (chaîne exacte)**

Repère `5. **Coche** le jalon dans \`docs/ROADMAP.md\`, note tout piège dans \`docs/memory/\`, commit` et insère **juste avant** cette ligne :

```md
5. **Gate avant de cocher** : lance le sous-agent **`verificateur`** (contexte frais, diff du jalon + critères), puis **`security-reviewer`** sur les features touchées. Tant que l'un des deux ne répond pas **PROUVÉ**, le jalon n'est **pas** coché : corrige, ou passe-le en `BLOQUÉ` dans `docs/agents/state.yaml`.
```
Renumérote les points suivants (l'ancien 5 devient 6, etc.).

- [ ] **Step 4 : `/new-feature` — insérer entre les étapes 6 et 7 (chaînes exactes)**

Entre `### 6. Sécu (\`/security-review\`)` (+ sa ligne) et `### 7. Commit …`, insère :

```md
### 6bis. Verdict (obligatoire avant commit)
Lance **`verificateur`** en contexte frais : il ne voit que le diff + les `AC`. **PROUVÉ** requis pour continuer. **NON PROUVÉ** → retour à l'étape 3. **BLOQUÉ** → dis ce qui bloque, ne commit pas.
```

- [ ] **Step 5 : `verify-rule` + `loop-section`**

`verify-rule.md`, à la fin : « **Verdict final** — quand tu penses avoir fini, lance le sous-agent **`verificateur`** (contexte frais). C'est **lui** qui prononce `PROUVÉ`, pas toi. Reporte son verdict dans `docs/agents/state.yaml` (`status`, `repair_attempts`, `blocked_reason`) et une ligne dans `docs/agents/JOURNAL.md`. »
`loop-section.md`, ligne « Test live » : ajouter « → verdict par le sous-agent `verificateur` ».

- [ ] **Step 6 : Lancer → passe** — `… --test scripts/lib/proof.test.mjs scripts/lib/validate-build.test.mjs scripts/lib/validate-new-feature.test.mjs scripts/lib/agents-templates.test.mjs`.

- [ ] **Step 7 : Commit** — `git commit -m "feat(preuve): le verificateur devient un gate (/build fin de jalon, /new-feature avant commit)"`.

---

## Task 8 : `--refresh` couvre agents (3 assistants), règles typées (à plat), hooks

**Files:** `scripts/lib/kit-owned.mjs`, `scripts/lib/refresh.mjs` · Test: `scripts/lib/kit-owned.test.mjs`

- [ ] **Step 1 : Test (échoue) — chemins RÉELS**

```js
test('kitOwnedFiles : agents des 3 assistants + règles typées À PLAT + hooks Cursor', () => {
  const c = kitOwnedFiles('saas', 'cursor');
  assert.ok(c.some((f) => f.to === '.cursor/agents/verificateur.md' && f.transform === 'cursor-agent'));
  assert.ok(c.some((f) => f.to === '.cursor/rules/convex.mdc'), 'règles typées copiées à plat');
  assert.equal(c.some((f) => f.to.includes('.cursor/rules/saas/')), false, 'jamais de sous-dossier de stack');
  assert.ok(c.some((f) => f.to === '.cursor/hooks/inject-memory.mjs'));
  assert.ok(kitOwnedFiles('saas', 'codex').some((f) => f.to === 'docs/agents/crew/verificateur.md'));
});
```
Corrige aussi le titre du test existant `kitOwnedFiles(saas, cursor) : … PAS de subagents` → il devient faux ; renomme-le et remplace l'assertion `.claude/` par « aucun chemin `.claude/` côté cursor ».

- [ ] **Step 2 : Lancer → échoue.**

- [ ] **Step 3 : Étendre `kitOwnedFiles`**

- `cursor` : 7 agents (`transform: 'cursor-agent'`) + les `.mdc` de `templates/cursor/rules/<stack>/` mappés **à plat** vers `.cursor/rules/<fichier>.mdc` + les 3 hooks vers `.cursor/hooks/`.
- `claude-code` : les 7 agents (déjà) + le skill de stack — **chemin source vérifié** : `.claude/skills/stack-<stack>/SKILL.md` **à la racine du kit** (il n'y a aucun `SKILL.md` sous `templates/` — `find templates -name SKILL.md` est vide) → `to: '.claude/skills/stack-<stack>/SKILL.md'`. Viser le **fichier**, jamais le dossier (`refresh.mjs` ferait `EISDIR`). L'assertion `kit-owned.test.mjs:20` (« la source existe ») valide ce chemin.
- `codex` : 7 agents vers `docs/agents/crew/`.

- [ ] **Step 4 : `refresh.mjs` — appliquer le transform + rester idempotent**

Au point de lecture de `from`, applique `toCursorAgent` quand `transform === 'cursor-agent'` **avant** la comparaison avec l'existant (sinon le fichier serait réécrit à chaque passage). Ajoute un `try/catch` autour de la lecture pour qu'un chemin invalide soit `skipped`, jamais un crash.

- [ ] **Step 5 : Lancer → passe + vérif réelle**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
$N --test scripts/lib/kit-owned.test.mjs scripts/lib/refresh.test.mjs
T=/private/tmp/ref-cursor; rm -rf "$T"; $N scripts/setup.mjs "$T" --stack saas --assistant cursor --no-skills --yes >/dev/null 2>&1
echo CASSÉ > "$T/.cursor/agents/verificateur.md"; echo CASSÉ > "$T/.cursor/rules/convex.mdc"
$N scripts/setup.mjs --project "$T" --refresh | head -8
$N scripts/setup.mjs --project "$T" --refresh | grep -c "déjà à jour"   # idempotent : 1
```

- [ ] **Step 6 : Commit** — `git commit -m "fix(update): --refresh couvre les agents des 3 assistants, les règles typées (à plat) et les hooks"`.

---

## Task 9 : Codex servi correctement + hooks Claude Code

**Files:** `scripts/lib/setup-ai.mjs`, `scripts/lib/environment.mjs`, `scripts/lib/hooks.mjs`, `scripts/setup.mjs`, `templates/claude/hooks/{guard-shell,inject-memory}.mjs` (créer), `templates/commands/doctor.md` · Test: `scripts/lib/codex.test.mjs` (créer)

- [ ] **Step 1 : Test (échoue) — assertions qui prouvent**

```js
test('A-FAIRE : instruction MCP propre à chaque assistant', () => {
  assert.match(call('claude-code'), /lance `\/mcp`/);
  assert.match(call('cursor'), /Settings.*MCP/i);
  const codex = call('codex');
  assert.doesNotMatch(codex, /lance `\/mcp`/);
  assert.match(codex, /recopie la définition|\.mcp\.json/, 'Codex : dire quoi recopier');
});

test('Codex : aucun fichier .claude/ écrit', () => { /* scaffold codex, assert !existsSync('.claude') */ });

test('claudeSettings : mémoire au démarrage + garde-fou shell', () => {
  const s = JSON.parse(claudeSettings(null, ['typecheck']));
  assert.ok(s.hooks.SessionStart, 'injection mémoire');
  assert.ok(s.hooks.PreToolUse, 'garde-fou avant commande shell');
});
```
> `/config(uration)? Codex/i` de la v1 était déjà satisfait par `matrix.mjs:49` → remplacé par une chaîne réellement nouvelle.

- [ ] **Step 2 : Lancer → échoue.**

- [ ] **Step 3 : `setup-ai.mjs` — MCP à 3 branches**

Remplace le ternaire `connect` par une table : `cursor` → « ouvre **Settings → MCP** et active-le » · `claude-code` → « lance `/mcp` pour connecter » · `codex` → « **recopie la définition** du serveur depuis `.mcp.json` dans ta configuration MCP Codex ».

- [ ] **Step 4 : `environment.mjs` — pas de `.claude/` pour Codex, note idempotente**

Restreins l'écriture de `.claude/settings.json` à `assistant === 'claude-code'`. Pour Codex, ajoute **une seule fois** (garde `includes(...)`, comme le correctif « Backend en local » couvert par `setup-idempotent.test.mjs`) une ligne dans `docs/RUN.md` : « Codex n'a pas de hook d'édition : lance `npm run typecheck` après tes modifications. »

- [ ] **Step 5 : hooks Claude Code — scripts au FORMAT CLAUDE (pas Cursor)**

⚠️ Les hooks Cursor existants sont **inutilisables tels quels** : `templates/cursor/hooks/guard-shell.mjs:24` lit `JSON.parse(stdin).command` et répond `{"permission":"deny"}` — c'est le protocole **Cursor `beforeShellExecution`**. Claude Code passe la commande dans `tool_input.command` et bloque par **code de sortie 2** (message sur `stderr`). Il faut donc **deux nouveaux fichiers**, pas une réutilisation.

1. Crée `templates/claude/hooks/guard-shell.mjs` : lit le JSON sur stdin, prend `tool_input.command`, **réutilise la fonction `isDangerous`** de `templates/cursor/hooks/guard-shell.mjs` (copie-la, les deux fichiers restent indépendants), et si la commande est dangereuse → écrit l'explication sur `stderr` puis `process.exit(2)` ; sinon `process.exit(0)`.
2. Crée `templates/claude/hooks/inject-memory.mjs` : imprime sur `stdout` le contenu de `docs/memory/index.md` + le prochain jalon non coché de `docs/ROADMAP.md` (même intention que la version Cursor, sortie texte simple).
3. `scripts/setup.mjs` : copie ces deux fichiers vers `.claude/hooks/` **quand `assistant === 'claude-code'`** (les hooks Cursor ne sont copiés que pour Cursor, `setup.mjs:160-166` — même motif).
4. `scripts/lib/hooks.mjs` : dans `claudeSettings`, ajoute `SessionStart` → `node .claude/hooks/inject-memory.mjs` et `PreToolUse` matcher `Bash` → `node .claude/hooks/guard-shell.mjs`, **idempotents** (même motif `already` que `PostToolUse`).

Le test du Step 1 doit vérifier **les deux** : la présence des clés dans `claudeSettings` **et** l'existence des fichiers `templates/claude/hooks/*.mjs` (sinon le hook pointerait dans le vide).

> `scripts/setup.mjs` est donc ajouté aux **Files** de cette task.

- [ ] **Step 6 : `doctor.md`**

Remplace l'item unique `/add-plugin superpowers` par une ligne par assistant (Cursor `/add-plugin` · Claude Code `/plugin install superpowers@claude-plugins-official` · Codex `/plugins`) ; remplace `/brainstorm` par « tape `/` et cherche `superpowers:brainstorming` » ; ajoute deux items : présence des agents (`.cursor/agents/` · `.claude/agents/` · `docs/agents/crew/`) et MCP de test (`playwright`/`maestro`) branchés.

- [ ] **Step 7 : Lancer → passe** — `… --test scripts/lib/codex.test.mjs scripts/lib/hooks.test.mjs scripts/lib/environment.test.mjs scripts/lib/setup-idempotent.test.mjs scripts/lib/validate-commands.test.mjs`.

- [ ] **Step 8 : Commit** — `git commit -m "fix(codex): MCP recopiable, plus de .claude fantôme ; hooks mémoire + garde-shell pour Claude Code ; doctor par assistant"`.

---

## Task 10 : Références mortes et `.claude/agents/` cité partout

**Files:** `scripts/lib/matrix.mjs`, `templates/agents/memory-rules.md`, `templates/commands/{help,new-project}.md`, `templates/agents/subagents-rule.md`, `README.md` · Test: `scripts/lib/proof.test.mjs`

- [ ] **Step 1 : Test (échoue)**

```js
test('aucune référence morte ni chemin d\'agents figé sur un seul assistant', () => {
  assert.doesNotMatch(read('scripts/lib/matrix.mjs'), /pixelbrowse/);
  for (const f of ['templates/commands/help.md', 'templates/commands/new-project.md']) {
    assert.doesNotMatch(read(f), /`\.claude\/agents\/`/, `${f} : chemin figé claude-code`);
  }
  // la chaîne exigée par validateMemoryTemplates reste présente
  assert.match(read('templates/agents/memory-rules.md'), /consolidate-memory/);
});
```

- [ ] **Step 2 : Lancer → échoue.**

- [ ] **Step 3 : Corriger**

- `matrix.mjs` : retirer « Claude Code : skill `pixelbrowse`. » de `PIXELRAG_NOTE`.
- `memory-rules.md` : reformuler **en gardant la chaîne littérale** — ex. « lance la consolidation de mémoire (Action hebdomadaire `consolidate-memory`) » ⇒ `validate-commands.mjs:55` reste satisfait.
- `help.md`, `new-project.md`, `subagents-rule.md` : remplacer `.claude/agents/` par « le dossier d'agents de ton assistant (`.cursor/agents/`, `.claude/agents/`, ou `docs/agents/crew/` pour Codex) ».
- `README.md` : ligne 63 (« Subagents `code-reviewer` · `security-reviewer` · `test-runner` ») **et** ligne 248 (arbre) → mentionner les **7 agents** dont `verificateur`.

- [ ] **Step 4 : Lancer → passe (suite COMPLÈTE)** — `… --test` → `# fail 0`.

- [ ] **Step 5 : Commit** — `git commit -m "fix(refs): plus de skill fantôme, chemin d'agents neutre, README à jour (7 agents)"`.

---

## Task 11 : La CI prouve la parité

**Files:** `scripts/smoke-e2e.mjs`

- [ ] **Step 1 : Étendre le smoke test**

`scripts/smoke-e2e.mjs` ne scaffolde que `cursor` et vérifie une liste de fichiers. Ajoute :
- à la liste vérifiée : `.cursor/agents/verificateur.md` ;
- un second scaffold **codex** dans un autre dossier temporaire, avec deux checks : `docs/agents/crew/verificateur.md` **existe** et `.claude/` **n'existe pas**.

Garde le style existant (`check(label, bool)`), et nettoie les dossiers temporaires comme le fait déjà le script.

- [ ] **Step 2 : Lancer**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/smoke-e2e.mjs`
Expected : tous les checks verts.

- [ ] **Step 3 : Commit** — `git commit -m "test(ci): le smoke e2e prouve la parité des agents (Cursor + Codex)"`.

---

## Task 12 : Plugin, suite, bump 0.12.0, vérification finale

- [ ] **Step 1 : Régénérer le plugin** — `… node scripts/build-cursor-plugin.mjs`.
- [ ] **Step 2 : Bump** — `package.json:3` → `"version": "0.12.0",`.
- [ ] **Step 3 : Suite complète** — `… --test` → `# fail 0`.
- [ ] **Step 4 : Vérification réelle des 3 assistants**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
for A in cursor claude-code codex; do
  T=/private/tmp/final-$A; rm -rf "$T"
  $N scripts/setup.mjs "$T" --stack saas --assistant $A --no-skills --yes >/dev/null 2>&1; echo "exit=$?"
  echo "── $A : cursor=$(ls "$T/.cursor/agents" 2>/dev/null | wc -l) claude=$(ls "$T/.claude/agents" 2>/dev/null | wc -l) codex=$(ls "$T/docs/agents/crew" 2>/dev/null | wc -l) | .claude présent=$([ -d "$T/.claude" ] && echo oui || echo non)"
  echo "   semgrep documenté : $(grep -c semgrep "$T/docs/A-FAIRE.md") | verificateur dans build : $(grep -c verificateur "$T"/{.cursor,.claude,docs}/commands/build.md 2>/dev/null | head -1)"
done
$N scripts/setup.mjs /private/tmp/final-mobile --stack mobile --assistant cursor --no-skills --yes >/dev/null 2>&1
echo "mobile — semgrep : $(grep -c semgrep /private/tmp/final-mobile/docs/A-FAIRE.md)"
```
Expected : `exit=0` partout · cursor 7/0/0 · claude-code 0/7/0 · codex 0/0/7 avec **`.claude` absent** · `semgrep` documenté y compris sur **mobile** · `verificateur` présent dans `/build`.

- [ ] **Step 5 : Commit** — `git commit -m "chore(parité): régénère plugin + bump 0.12.0"`.

---

## Self-Review (v2)

**Corrections apportées depuis la v1** (12) : readonly déduit aussi de `disallowedTools` + réinjection dans le corps (T1) · CRLF normalisé + description quotée (T1) · test du parseur sur les **7 fichiers réels** (T1) · Codex reçoit ses agents dans `docs/agents/crew/` (T2, T8, T11) · **aucun `mcpServers:` en frontmatter** (T3) · assertions non-vides (T4, T5, T9) · skills **vérifiés par exécution** + fusion du dépôt Anthropic + échec non bloquant + `rot-check` (T5) · outils de vérif **hors branche conditionnelle** (T6) · chaînes d'insertion **exactes** relevées dans les fichiers (T7) · chemins `.cursor/rules/` **à plat** + `SKILL.md` fichier + idempotence du transform (T8) · `hooks.mjs` a enfin sa task (T9 Step 5) · `consolidate-memory` **conservé littéralement** (T10) · `help.md`/`new-project.md`/`README:63` (T10) · CI qui prouve la parité (T11).

**Reste connu, non traité (assumé)** : (a) `--refresh` **n'efface pas** l'ancien `.claude/agents/` d'un projet Cursor déjà scaffoldé — la suppression automatique est plus risquée que le résidu ; à documenter dans le message de refresh plutôt qu'à automatiser. (b) Les commandes Codex ne sont pas typables (`docs/commands/`) : limite de l'assistant, signalée dans `doctor`, non contournée. (c) Aucun test « en session réelle » (Cursor/Claude ouverts) : hors de portée d'une suite `node --test`.

**Ordre** : T1 (outil) → T2 (copie) → T3-T4 (agents) → T5-T6 (skills/outils) → T7 (gate) → T8 (refresh) → T9 (codex/hooks) → T10 (refs) → T11 (CI) → T12 (release). Chaque task se termine sur une suite verte ; T10 Step 4 et T12 Step 3 lancent la suite **complète**.
