# `/init-vibecoding` — commande d'onboarding tout-en-un — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une commande `/init-vibecoding` (dans le plugin Cursor + scaffoldée) : l'agent **détecte** l'état du projet, puis **scaffolde via npx** (nouveau projet) **ou met à jour via `--refresh`** (projet existant), en posant les questions en langage simple et en déroulant l'onboarding — le terminal devient invisible pour le débutant.

**Architecture:** La commande est un **runbook** que l'agent suit. Elle s'appuie sur deux primitives npx : `npx create-vibecoding-kit@latest --stack … --assistant … --project . --yes` (scaffold) et `npx create-vibecoding-kit@latest --project . --refresh` (**nouveau mode** du bin). Le mode `--refresh` du bin réutilise `refreshProject` (déplacé de `update.mjs` vers `scripts/lib/refresh.mjs`, partagé). Un projet est « déjà initialisé » ssi `.vibecoding.json` existe.

**Tech Stack:** Node ESM (zéro dépendance), `node --test`. Runbook Markdown + logique bin/lib dans `scripts/`.

## Global Constraints

- Node ESM, **zéro dépendance runtime**. Tests via `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`.
- **Non destructif** : `--refresh` ne touche que la section managée d'`AGENTS.md`/`CLAUDE.md` + `kitOwnedFiles()`. Jamais `src/`/`docs/`/`.env`.
- Comportement scaffold **par défaut** (sans `--refresh`) **inchangé**.
- Pas d'import circulaire : `refreshProject` + `readVibecodingManifest` vivent dans `scripts/lib/refresh.mjs` ; `setup.mjs` et `update.mjs` les importent.
- Français, accents corrects. Jamais « formation »/« accompagnement » dans les fichiers générés.
- Après ajout de la commande : régénérer `cursor-plugin/` (`node scripts/build-cursor-plugin.mjs`).
- `/init-vibecoding` = commande d'**entrée** (bootstrap), présentée à part des « 10 commandes de cycle de vie » (ne pas réécrire le nombre 10).

---

## File Structure

- `scripts/lib/refresh.mjs` — **créer** : déplacer `readVibecodingManifest` + `refreshProject` (depuis `update.mjs`) ; `refreshProject` renvoie aussi `migrated[]`.
- `scripts/update.mjs` — importe depuis `refresh.mjs` (retire les définitions locales) ; affiche le hint migration.
- `scripts/lib/args.mjs` — parse `--refresh`.
- `scripts/setup.mjs` — branche `--refresh` (early return) via `refreshProject`.
- `scripts/lib/refresh.test.mjs` — **créer** (déplacer/étendre les tests d'update-refresh + migrated).
- `templates/commands/init-vibecoding.md` — **créer** (le runbook).
- `scripts/build-cursor-plugin.mjs` — `COMMANDS` += `init-vibecoding`.
- `scripts/setup.mjs` — boucle commandes += `init-vibecoding`.
- `templates/commands/help.md` — mentionne `/init-vibecoding`.
- `PUBLISH.md` — corrige le nombre de commandes.
- Tests : `cursor-plugin.test.mjs` (assert init dans le plugin), un test contenu pour `init-vibecoding.md`.
- `package.json` — bump `0.6.0`.

---

## Task 1 : `scripts/lib/refresh.mjs` — extraire refresh (DRY, + `migrated`)

**Files:**
- Create: `scripts/lib/refresh.mjs`, `scripts/lib/refresh.test.mjs`
- Modify: `scripts/update.mjs` (importe au lieu de définir)

**Interfaces:**
- Produces: `readVibecodingManifest(projectDir)`, `refreshProject({ source, projectDir, manifest, dryRun })→{ changed, skipped, migrated }`.
- `migrated` = liste des fichiers `AGENTS.md`/`CLAUDE.md` qui n'avaient **pas** de marqueurs (bloc préfixé → l'utilisateur doit nettoyer l'ancien bloc).

- [ ] **Step 1 : Test (échoue)**

Crée `scripts/lib/refresh.test.mjs` (reprend les 2 cas de `update-refresh.test.mjs` + un cas migration) :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshProject, readVibecodingManifest } from './refresh.mjs';
import { MARK_START_PREFIX } from './managed-section.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('refresh : régénère le bloc managé, préserve zone user + src/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} vieux -->\nVIEUX\n<!-- vibecoding:end -->\n\n## Perso\nGARDE-MOI`);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  fs.mkdirSync(path.join(dir, 'src')); fs.writeFileSync(path.join(dir, 'src/a.ts'), 'CODE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'claude-code' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Règle design/); assert.doesNotMatch(agents, /VIEUX/); assert.match(agents, /GARDE-MOI/);
  assert.equal(fs.readFileSync(path.join(dir, 'src/a.ts'), 'utf8'), 'CODE');
  assert.ok(r.changed.includes('AGENTS.md')); assert.equal(r.migrated.length, 0, 'marqueurs présents → pas de migration');
});

test('refresh : projet SANS marqueurs → migrated signalé, contenu conservé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-old-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Vieux\nANCIENNE REGLE');
  const r = refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: false });
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /ANCIENNE REGLE/, 'ancien contenu conservé');
  assert.match(agents, /Règle design/, 'nouveau bloc ajouté');
  assert.ok(r.migrated.includes('AGENTS.md'), 'migration signalée');
});

test('refresh --dry-run : n\'écrit rien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-dry-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${MARK_START_PREFIX} v -->\nX\n<!-- vibecoding:end -->`);
  const before = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  refreshProject({ source: KIT, projectDir: dir, manifest: { stack: 'saas', assistant: 'cursor' }, dryRun: true });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), before);
});

test('readVibecodingManifest : lit stack/assistant, jette si absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-'));
  assert.throws(() => readVibecodingManifest(dir), /vibecoding\.json/);
  fs.writeFileSync(path.join(dir, '.vibecoding.json'), '{"stack":"saas","assistant":"cursor"}');
  assert.equal(readVibecodingManifest(dir).stack, 'saas');
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/refresh.test.mjs`
Expected : FAIL (`refresh.mjs` absent).

- [ ] **Step 3 : Créer `scripts/lib/refresh.mjs`**

Déplace `readVibecodingManifest` + `refreshProject` de `update.mjs` vers ce fichier, en ajoutant le suivi `migrated` :

```js
import fs from 'node:fs';
import path from 'node:path';
import { renderAgentsFile } from './agents-file.mjs';
import { mergeManagedSection, MARK_START_PREFIX } from './managed-section.mjs';
import { kitOwnedFiles } from './kit-owned.mjs';
import { resolveAssets } from './matrix.mjs';

export function readVibecodingManifest(projectDir) {
  const mf = path.join(projectDir, '.vibecoding.json');
  if (!fs.existsSync(mf)) throw new Error(`Pas de .vibecoding.json dans ${projectDir} — ce dossier n'a pas été généré par le kit (lance d'abord le scaffold).`);
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!m.stack || !m.assistant) throw new Error('.vibecoding.json incomplet (stack/assistant manquant).');
  return m;
}

// Régénère la section managée d'AGENTS.md/CLAUDE.md + écrase les fichiers 100% kit. Ne touche RIEN d'autre.
export function refreshProject({ source, projectDir, manifest, dryRun = false }) {
  const { stack, assistant } = manifest;
  const { commandsDir } = resolveAssets(stack, assistant);
  const changed = [], skipped = [], migrated = [];
  const fresh = renderAgentsFile({ source, stack, assistant, commandsDir });
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(dest)) { skipped.push(`${name} (absent)`); continue; }
    const existing = fs.readFileSync(dest, 'utf8');
    if (!existing.includes(MARK_START_PREFIX)) migrated.push(name); // vieux projet : bloc préfixé, ancien contenu conservé dessous
    const merged = mergeManagedSection(existing, fresh);
    if (merged !== existing) { if (!dryRun) fs.writeFileSync(dest, merged); changed.push(name); }
  }
  for (const { from, to } of kitOwnedFiles(stack, assistant)) {
    const src = path.join(source, from), dst = path.join(projectDir, to);
    if (!fs.existsSync(src)) { skipped.push(`${to} (source absente)`); continue; }
    const next = fs.readFileSync(src, 'utf8');
    const prev = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (prev !== next) { if (!dryRun) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); } changed.push(to); }
  }
  return { changed, skipped, migrated };
}
```

- [ ] **Step 4 : Rebrancher `update.mjs` sur le lib**

Dans `scripts/update.mjs` : retire les définitions locales de `readVibecodingManifest` et `refreshProject` ; importe-les : `import { readVibecodingManifest, refreshProject } from './lib/refresh.mjs';` (retire les imports devenus inutiles : `renderAgentsFile`, `mergeManagedSection`, `kitOwnedFiles`, `resolveAssets`). Dans le bloc CLI, après `refreshProject(...)`, ajoute le hint migration :

```js
      if (migrated.length) console.log(`\n⚠️ Projet d'une ancienne version (sans marqueurs) : les nouvelles règles ont été ajoutées EN HAUT de ${migrated.join(', ')}. Ouvre le(s) fichier(s) et supprime l'ancien bloc de règles en double sous « vibecoding:end » (garde tes notes perso).`);
```

(récupère `migrated` du retour : `const { changed, skipped, migrated } = refreshProject(...)`.)

- [ ] **Step 5 : Lancer → passe (refresh + update)**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/refresh.test.mjs scripts/lib/update-refresh.test.mjs`
Expected : PASS. (Si `update-refresh.test.mjs` importait `refreshProject` depuis `../update.mjs`, mets-le à jour pour importer depuis `./refresh.mjs`, ou supprime-le au profit de `refresh.test.mjs` — au choix, garde une seule source de tests.)

- [ ] **Step 6 : Commit**

```bash
git add scripts/lib/refresh.mjs scripts/lib/refresh.test.mjs scripts/update.mjs scripts/lib/update-refresh.test.mjs
git commit -m "refactor(update): refresh.mjs partagé (setup+update) + hint migration (migrated)"
```

---

## Task 2 : `--refresh` dans le bin (`args.mjs` + `setup.mjs`)

**Files:**
- Modify: `scripts/lib/args.mjs` (parse `--refresh`), `scripts/setup.mjs` (branche early)
- Test: `scripts/lib/args.test.mjs`, `scripts/setup.test.mjs`

**Interfaces:**
- Consumes: `refreshProject`, `readVibecodingManifest` (Task 1).
- Produces: `npx create-vibecoding-kit@latest --project <dir> --refresh [--dry-run]` régénère un projet existant sans scaffolder.

- [ ] **Step 1 : Test parse `--refresh` (échoue)**

Ajoute à `scripts/lib/args.test.mjs` :

```js
test('parseArgs : --refresh', () => {
  assert.equal(parseArgs(['--refresh']).refresh, true);
  assert.equal(parseArgs([]).refresh, false);
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/args.test.mjs`
Expected : FAIL (`refresh` undefined).

- [ ] **Step 3 : Parser `--refresh`**

`scripts/lib/args.mjs` : dans l'objet initial (l.8) ajoute `refresh: false,` ; dans le switch, ajoute `case '--refresh': args.refresh = true; break;`.

- [ ] **Step 4 : Brancher `setup.mjs` (early return refresh)**

Dans `scripts/setup.mjs` : ajoute l'import `import { readVibecodingManifest, refreshProject } from './lib/refresh.mjs';`. Puis, dans `main()`, **juste après** `const kitRoot = kitRootFromModuleUrl(import.meta.url);` (avant `needsWizard`), insère :

```js
  if (argv.includes('--refresh')) {
    const a = parseArgs(argv);
    a.source = a.source ?? kitRoot;
    const baseDir = projectBaseDir(kitRoot, process.cwd());
    const projectDir = resolveProjectDir(expandHome(a.project ?? '.', os.homedir()), baseDir);
    const manifest = readVibecodingManifest(projectDir);
    const { changed, migrated } = refreshProject({ source: a.source, projectDir, manifest, dryRun: a.dryRun });
    console.log(a.dryRun ? '[dry-run] Régénérerait :' : 'Régénéré (kit) :');
    for (const c of changed) console.log(`  ~ ${c}`);
    if (!changed.length) console.log('  (déjà à jour)');
    if (migrated.length) console.log(`\n⚠️ Ancienne version détectée : nouvelles règles ajoutées en haut de ${migrated.join(', ')} — supprime l'ancien bloc en double sous « vibecoding:end ».`);
    console.log('\nsrc/, docs/ (PRD/design/mémoire), ta zone perso : NON touchés.');
    return;
  }
```

- [ ] **Step 5 : Test intégration bin refresh (échoue puis passe)**

Ajoute à `scripts/setup.test.mjs` un test : scaffolde un projet (via `main`/exec), casse une règle dans `AGENTS.md`, relance le bin avec `--refresh --project <dir>`, vérifie que la règle est régénérée et `src/` intact. (Utilise `execFileSync(process.execPath, ['scripts/setup.mjs', '--project', dir, '--refresh'])` sur un projet préparé avec un `.vibecoding.json` + `AGENTS.md` marqué.)

- [ ] **Step 6 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/args.test.mjs scripts/setup.test.mjs`
Expected : PASS.

- [ ] **Step 7 : Commit**

```bash
git add scripts/lib/args.mjs scripts/lib/args.test.mjs scripts/setup.mjs scripts/setup.test.mjs
git commit -m "feat(update): npx create-vibecoding-kit --refresh (met à jour un projet existant sans clone)"
```

---

## Task 3 : Le runbook `/init-vibecoding`

**Files:**
- Create: `templates/commands/init-vibecoding.md`
- Test: `scripts/lib/init-command.test.mjs` (créer)

**Interfaces:**
- Produces: `templates/commands/init-vibecoding.md` — référence `create-vibecoding-kit`, `.vibecoding.json`, `--refresh`, `docs/A-FAIRE.md`, `/new-project`.

- [ ] **Step 1 : Test contenu (échoue)**

Crée `scripts/lib/init-command.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('init-vibecoding : détecte, scaffolde OU met à jour, onboarde', () => {
  const t = fs.readFileSync(path.join(ROOT, 'templates/commands/init-vibecoding.md'), 'utf8');
  for (const s of ['.vibecoding.json', 'create-vibecoding-kit@latest', '--refresh', 'docs/A-FAIRE.md', '/new-project']) {
    assert.ok(t.includes(s), `manque « ${s} »`);
  }
});
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/init-command.test.mjs`
Expected : FAIL (fichier absent).

- [ ] **Step 3 : Écrire `templates/commands/init-vibecoding.md`**

```md
# /init-vibecoding — Tout installer (ou mettre à jour) pour toi (runbook IA)

Tu installes l'environnement vibecoding **à la place de l'utilisateur** : tu exécutes les commandes du terminal, tu poses les questions en **langage simple**, tu expliques. L'utilisateur répond juste dans le chat. En français, chaleureux, zéro jargon non expliqué.

## Étape 0 — Détecte l'état
Regarde si **`.vibecoding.json`** existe dans le dossier courant.

- **Il existe** → le projet est **déjà initialisé**. Lis sa `kitVersion`. Dis-le, et propose de **mettre à jour** :
  1. Montre d'abord ce qui changerait : `npx -y create-vibecoding-kit@latest --project . --refresh --dry-run`.
  2. Si l'utilisateur est d'accord : `npx -y create-vibecoding-kit@latest --project . --refresh`.
  3. Si le message parle d'« ancienne version / bloc en double », **ouvre `AGENTS.md`** et supprime l'ancien bloc de règles sous `vibecoding:end` (garde ses notes perso). Explique-lui ce que tu fais.
  → **Stop ici** (pas de re-scaffold). Termine par « ton projet est à jour ✅ ».

- **Il n'existe pas** → nouveau projet, continue.

## Étape 1 — Les 2 questions (simples)
1. **Quel type d'app ?** (donne des exemples) :
   - **saas** — site/app web avec comptes (SaaS, dashboard, réservation…)
   - **mobile** — app iPhone/Android
   - **desktop** — logiciel installable (Windows/Mac/Linux)
   - **vitrine** — site vitrine / portfolio / blog (optimisé Google + IA)
2. **Le nom du projet ?** (ou « ici » pour installer dans le dossier courant).

L'**assistant** = celui où tu tournes (Cursor / Claude Code / Codex) — ne le demande pas, déduis-le.

## Étape 2 — Scaffold (tu le fais)
Lance (remplace `<stack>`, `<assistant>`, `<dossier>` ; `.` = dossier courant) :

```bash
npx -y create-vibecoding-kit@latest --stack <stack> --assistant <assistant> --project <dossier> --yes
```

Montre le résultat, confirme que les fichiers sont créés (AGENTS.md, docs/, .mcp.json…).

## Étape 3 — Onboarding (déroule `docs/A-FAIRE.md` AVEC lui)
Ouvre **`docs/A-FAIRE.md`** (généré, adapté à sa stack) et traite chaque section :
- **Ce que tu peux faire toi** : skills (`npx skills add …` s'ils manquent), MCP en ligne de commande pour Claude Code (`claude mcp add …`). Fais-les, montre le résultat.
- **Ce qui demande son clic** (explique simplement, une action à la fois) : installer le plugin **superpowers**, installer le plugin de sa stack s'il y en a un, autoriser les **MCP** (toggle Cursor / `/mcp`). Attends qu'il confirme avant de passer au suivant.
- Coche mentalement chaque case ; ne le noie pas — **une étape à la fois**.

## Étape 4 — Vérifie + lance
- Si superpowers est installé : lance **`/doctor`** (dit ce qui manque encore).
- Termine : « Tout est prêt 🎉 — tape **`/new-project`** et décris ton idée, je m'occupe du reste. »

## Règles
- Ne submerge pas : **une question / une action à la fois**, attends la réponse.
- Chaque commande terminal : dis **ce que tu vas faire** avant, montre le résultat après.
- Jamais de secret en clair ; ne commit rien sans le dire.
```

- [ ] **Step 4 : Lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/init-command.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add templates/commands/init-vibecoding.md scripts/lib/init-command.test.mjs
git commit -m "feat(init): runbook /init-vibecoding — scaffold OU update + onboarding conversationnel"
```

---

## Task 4 : Câbler la commande (plugin + scaffold + help + PUBLISH)

**Files:**
- Modify: `scripts/build-cursor-plugin.mjs` (`COMMANDS`), `scripts/setup.mjs` (boucle commandes), `templates/commands/help.md`, `PUBLISH.md`
- Test: `scripts/lib/cursor-plugin.test.mjs`

**Interfaces:**
- Produces: `/init-vibecoding` présent dans `cursor-plugin/commands/` **et** dans les projets scaffoldés.

- [ ] **Step 1 : Test plugin (échoue)**

Dans `scripts/lib/cursor-plugin.test.mjs`, ajoute `init-vibecoding` à la liste vérifiée :

```js
  for (const c of ['init-vibecoding', 'new-project', 'build', 'sos', 'debug', 'deploy']) {
    assert.ok(fs.existsSync(path.join(out, 'commands', `${c}.md`)), `commands/${c}.md`);
  }
```

- [ ] **Step 2 : Lancer → échoue**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/cursor-plugin.test.mjs`
Expected : FAIL (init pas dans le plugin).

- [ ] **Step 3 : Ajouter la commande aux deux boucles**

`scripts/build-cursor-plugin.mjs:10` — ajoute `'init-vibecoding'` en tête de `COMMANDS` :

```js
const COMMANDS = ['init-vibecoding', 'help', 'new-project', 'build', 'new-feature', 'edit-design', 'doctor', 'next', 'sos', 'debug', 'deploy'];
```

`scripts/setup.mjs` (boucle commandes, ~l.127) — ajoute `'init-vibecoding'` en tête du tableau `['help', 'new-project', …]`.

- [ ] **Step 4 : help.md + PUBLISH.md**

`templates/commands/help.md` — ajoute, tout en haut de « ## Pour démarrer / avancer » :

```md
- **/init-vibecoding** — **Le tout-en-un pour démarrer** : l'IA installe l'environnement pour toi (ou met à jour ton projet) et te guide pas à pas. C'est la 1re commande à taper.
```

`PUBLISH.md` — remplace « Le plugin donne les 9 commandes + la règle de base. » par « Le plugin donne les commandes vibecoding (dont **/init-vibecoding** pour tout installer) + la règle de base. »

- [ ] **Step 5 : Régénérer le plugin + lancer → passe**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/cursor-plugin.test.mjs`
Expected : PASS.

- [ ] **Step 6 : Commit**

```bash
git add scripts/build-cursor-plugin.mjs scripts/setup.mjs templates/commands/help.md PUBLISH.md cursor-plugin scripts/lib/cursor-plugin.test.mjs
git commit -m "feat(init): câble /init-vibecoding (plugin + scaffold + help) ; PUBLISH à jour"
```

---

## Task 5 : Suite + vérif réelle + bump 0.6.0

**Files:**
- Modify: `package.json:3`

- [ ] **Step 1 : Suite complète → verte**

Run : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test`
Expected : `# fail 0`.

- [ ] **Step 2 : Bump + regen plugin**

`package.json:3` → `"version": "0.6.0",`. Puis `node scripts/build-cursor-plugin.mjs`.

- [ ] **Step 3 : Vérif réelle — bin `--refresh` sur projet existant**

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
T=/private/tmp/init-e2e; rm -rf "$T"
$N scripts/setup.mjs "$T" --stack saas --assistant cursor --no-skills --yes >/dev/null
printf '\nMA NOTE PERSO\n' >> "$T/AGENTS.md"; mkdir -p "$T/src"; echo CODE > "$T/src/a.ts"
$N -e "let f='$T/AGENTS.md',s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s.replace('Règle secrets & coûts','VIEUX'))"
$N scripts/setup.mjs --project "$T" --refresh
echo "règle régénérée (1): $(grep -c 'Règle secrets & coûts' "$T/AGENTS.md")"
echo "note perso (1): $(grep -c 'MA NOTE PERSO' "$T/AGENTS.md")"
echo "src (CODE): $(cat "$T/src/a.ts")"
echo "init dans le projet: $(ls "$T/.cursor/commands/init-vibecoding.md" 2>/dev/null && echo OUI)"
```
Expected : règle régénérée **1**, note perso **1**, src `CODE`, `init-vibecoding.md` présent.

- [ ] **Step 4 : Commit**

```bash
git add package.json cursor-plugin
git commit -m "chore(init): bump 0.6.0 + plugin régénéré"
```

---

## Self-Review

**1. Spec coverage** — (a) commande `/init-vibecoding` scaffold OU update → Task 3 ; (b) détecte via `.vibecoding.json` → Task 3 Étape 0 ; (c) update via npx (sans clone) → Task 2 (`bin --refresh`) ; (d) onboarding conversationnel → Task 3 Étapes 3-4 ; (e) dans le plugin Cursor → Task 4 ; (f) migration vieux projet signalée → Task 1 (`migrated`) + Task 2/1 hints. ✅

**2. Placeholder scan** — aucun « TBD ». Task 2 Step 5 décrit le test à écrire avec sa mécanique exacte (exec bin `--refresh`) — à compléter par l'implémenteur avec le style des tests `setup.test.mjs` existants (pas un trou : le comportement attendu est spécifié).

**3. Type consistency** — `refreshProject` renvoie `{ changed, skipped, migrated }` partout (Task 1) ; consommé par `update.mjs` (Task 1 Step 4) ET `setup.mjs` (Task 2 Step 4) avec les mêmes champs. `readVibecodingManifest`/`refreshProject` importés depuis `./lib/refresh.mjs` par les deux entrées → pas de cycle. `parseArgs(...).refresh` (bool) posé Task 2 Step 3, lu Task 2 Step 4.

**4. Non-régression** — `COMMANDS`/boucle : ajout en tête, les autres commandes inchangées ; `cursor-plugin.test` vérifie un sur-ensemble. Scaffold par défaut inchangé (la branche `--refresh` fait un early return AVANT toute la logique wizard/scaffold). « 10 commandes » de cycle de vie non renommé (init = commande d'entrée, à part).
```
