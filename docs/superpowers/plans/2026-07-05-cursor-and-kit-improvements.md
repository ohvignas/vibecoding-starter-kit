# Améliorations Cursor + kit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 améliorations à l'installeur : (1) livrer les commandes en **Cursor Skills** + fix `$ARGUMENTS`, (2) **Cursor hooks** (mémoire auto) + `.cursorignore`, (3) sécurité (`.env.example` + gitleaks), (4) CI par stack + `ONBOARDING.md`.

**Architecture:** Nouveaux templates sous `templates/` (cursor/, env/, ci/, security/, ONBOARDING.md) ; `setup.mjs` les copie (certains par assistant) ; `templates.mjs` gagne `toSkillMd` ; `validate-commands.mjs` gagne `validateExtras`. TDD sur les fonctions pures ; contenu éditorial des templates garanti par le validateur + un smoke test.

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Node réel si bruit nvm : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.

## Global Constraints
- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- Cursor : commandes en `.cursor/skills/<nom>/SKILL.md` (frontmatter `name`+`description`) ; Claude Code garde `.claude/commands/` ; Codex garde `docs/commands/`.
- `$ARGUMENTS` : les 3 runbooks doivent demander la description si l'argument est vide (Cursor ne substitue pas).
- Ne rien casser (suite déjà 51/51). Idempotent (`copyIfAbsent`), échecs capturés.

---

### Task 1 : `toSkillMd` + fix `$ARGUMENTS` + livraison Cursor Skills

**Files:**
- Modify: `scripts/lib/templates.mjs` (ajoute `toSkillMd`)
- Modify: `scripts/lib/templates.test.mjs` (test `toSkillMd`)
- Modify: `templates/commands/new-project.md`, `new-feature.md`, `edit-design.md` (ligne fallback `$ARGUMENTS`)
- Modify: `scripts/setup.mjs` (import `toSkillMd` ; boucle commandes → Skills pour Cursor)

- [ ] **Step 1 : test `toSkillMd`** — ajoute dans `scripts/lib/templates.test.mjs` :
```js
test('toSkillMd produit un SKILL.md avec frontmatter name+description', () => {
  const out = toSkillMd({ name: 'new-project', description: 'Fondation', body: 'CONTENU' });
  assert.match(out, /^---\nname: new-project\n/);
  assert.match(out, /description: "Fondation"/);
  assert.match(out, /CONTENU/);
});
```
(ajoute `toSkillMd` à l'import depuis `./templates.mjs`.)

- [ ] **Step 2 : lancer → échec** — `node --test scripts/lib/templates.test.mjs`.

- [ ] **Step 3 : implémenter `toSkillMd`** dans `scripts/lib/templates.mjs` (à la suite de `toCursorMdc`) :
```js
export function toSkillMd({ name, description, body }) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(String(description).replace(/\r?\n/g, ' '))}\n---\n\n${body}\n`;
}
```

- [ ] **Step 4 : lancer → succès** — `node --test scripts/lib/templates.test.mjs`.

- [ ] **Step 5 : fix `$ARGUMENTS`** — dans CHACUN des 3 runbooks (`templates/commands/{new-project,new-feature,edit-design}.md`), juste après la ligne « Argument : `$ARGUMENTS`… », ajoute :
```markdown
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.
```

- [ ] **Step 6 : setup.mjs — Cursor Skills.** Ajoute `toSkillMd` à l'import ligne 9 :
```js
import { renderProjectAgentsMd, toCursorMdc, toSkillMd } from './lib/templates.mjs';
```
Remplace la boucle commandes (lignes 71-74) par :
```js
  for (const cmd of ['new-project', 'new-feature', 'edit-design']) {
    try {
      const src = path.join(args.source, `templates/commands/${cmd}.md`);
      if (args.assistant === 'cursor') {
        const dest = path.join(projectDir, `.cursor/skills/${cmd}/SKILL.md`);
        ensureDir(path.dirname(dest));
        if (!fs.existsSync(dest) || args.force) fs.writeFileSync(dest, toSkillMd({ name: cmd, description: `Commande vibe-stack : ${cmd}`, body: fs.readFileSync(src, 'utf8') }));
        done.push(`.cursor/skills/${cmd}/SKILL.md`);
      } else {
        copyIfAbsent(src, path.join(projectDir, assets.commandsDir, `${cmd}.md`), opt);
        done.push(`${assets.commandsDir}/${cmd}.md`);
      }
    } catch (e) { failed.push(`commande ${cmd} (${e.message})`); }
  }
```

- [ ] **Step 7 : suite + smoke** — `node --test` (tout PASS). Puis :
```bash
rm -rf /tmp/t1 && node scripts/setup.mjs --source "$PWD" --stack saas --assistant cursor --project /tmp/t1 >/dev/null 2>&1
ls /tmp/t1/.cursor/skills/*/SKILL.md && head -3 /tmp/t1/.cursor/skills/new-project/SKILL.md && rm -rf /tmp/t1
```
Attendu : 3 `SKILL.md` avec frontmatter `name:`.

- [ ] **Step 8 : commit** — `git add -A && git commit -m "feat(setup): commandes en Cursor Skills + fix \$ARGUMENTS"`

---

### Task 2 : Cursor hooks (mémoire auto) + `.cursorignore`

**Files:**
- Create: `templates/cursor/hooks.json`, `templates/cursor/hooks/inject-memory.mjs`, `templates/cursor/hooks/log-edit.mjs`, `templates/cursor/cursorignore`
- Modify: `scripts/setup.mjs` (wiring cursor-only, après le bloc dream)

- [ ] **Step 1 : `templates/cursor/hooks.json`**
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": "node .cursor/hooks/inject-memory.mjs", "type": "command" }],
    "afterFileEdit": [{ "command": "node .cursor/hooks/log-edit.mjs", "type": "command" }]
  }
}
```

- [ ] **Step 2 : `templates/cursor/hooks/inject-memory.mjs`**
```js
#!/usr/bin/env node
// Cursor sessionStart hook : injecte la mémoire du projet (docs/memory/index.md) dans le contexte.
import fs from 'node:fs';
let ctx = '';
try { ctx = fs.readFileSync('docs/memory/index.md', 'utf8'); } catch {}
process.stdout.write(JSON.stringify({ additional_context: ctx ? `# Mémoire du projet (docs/memory/index.md)\n\n${ctx}` : '' }));
```

- [ ] **Step 3 : `templates/cursor/hooks/log-edit.mjs`**
```js
#!/usr/bin/env node
// Cursor afterFileEdit hook : journalise les fichiers édités (aide la consolidation mémoire + le dream).
import fs from 'node:fs';
let file = '';
try { file = JSON.parse(fs.readFileSync(0, 'utf8')).file_path || ''; } catch {}
try { if (file) fs.appendFileSync('docs/memory/.edit-queue.log', file + '\n'); } catch {}
process.stdout.write('{}');
```

- [ ] **Step 4 : `templates/cursor/cursorignore`**
```
# Secrets & env — ne pas indexer (⚠️ ne bloque PAS l'accès terminal/MCP : ne commit jamais de secrets)
.env
.env.*
!.env.example
*.pem
*.key
secrets/
# Générés / volumineux
node_modules/
dist/
build/
.output/
convex/_generated/
.expo/
```

- [ ] **Step 5 : setup.mjs — wiring cursor-only.** Après le bloc dream (avant `if (args.caveman)`), ajoute :
```js
  if (args.assistant === 'cursor') {
    try {
      copyIfAbsent(path.join(args.source, 'templates/cursor/hooks.json'), path.join(projectDir, '.cursor/hooks.json'), opt);
      copyDirIfAbsent(path.join(args.source, 'templates/cursor/hooks'), path.join(projectDir, '.cursor/hooks'), opt);
      copyIfAbsent(path.join(args.source, 'templates/cursor/cursorignore'), path.join(projectDir, '.cursorignore'), opt);
      done.push('.cursor/hooks.json + .cursorignore (mémoire auto)');
    } catch (e) { failed.push(`cursor extras (${e.message})`); }
  }
```

- [ ] **Step 6 : smoke** — `rm -rf /tmp/t2 && node scripts/setup.mjs --source "$PWD" --stack saas --assistant cursor --project /tmp/t2 >/dev/null 2>&1 && ls /tmp/t2/.cursor/hooks.json /tmp/t2/.cursorignore /tmp/t2/.cursor/hooks/ && rm -rf /tmp/t2` → fichiers présents.

- [ ] **Step 7 : commit** — `git add -A && git commit -m "feat(setup): Cursor hooks (mémoire auto) + .cursorignore"`

---

### Task 3 : Sécurité — `.env.example` par stack + scan secrets gitleaks

**Files:**
- Create: `templates/env/saas.env.example`, `mobile.env.example`, `desktop.env.example`
- Create: `templates/security/secrets.yml`
- Modify: `scripts/setup.mjs` (wiring tous assistants)

- [ ] **Step 1 : `templates/env/saas.env.example`**
```
# Convex (backend)
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
# ⚠️ Ne commit JAMAIS ton vrai .env. Copie ce fichier en .env et remplis les valeurs.
```

- [ ] **Step 2 : `templates/env/mobile.env.example`**
```
# Convex (exposé au client Expo → préfixe EXPO_PUBLIC_)
EXPO_PUBLIC_CONVEX_URL=
# ⚠️ Ne commit JAMAIS ton vrai .env.
```

- [ ] **Step 3 : `templates/env/desktop.env.example`**
```
# Ajoute ici tes variables (clés API, etc.). Ne les mets JAMAIS dans le code du renderer.
# ⚠️ Ne commit JAMAIS ton vrai .env.
```

- [ ] **Step 4 : `templates/security/secrets.yml`**
```yaml
name: Secret scan
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 5 : setup.mjs — wiring (tous assistants).** Juste après le bloc dream, ajoute :
```js
  try { copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt); done.push('.env.example'); }
  catch (e) { failed.push(`.env.example (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/security/secrets.yml'), path.join(projectDir, '.github/workflows/secrets.yml'), opt); done.push('scan secrets (gitleaks)'); }
  catch (e) { failed.push(`secrets (${e.message})`); }
```

- [ ] **Step 6 : smoke** — `rm -rf /tmp/t3 && node scripts/setup.mjs --source "$PWD" --stack saas --assistant claude-code --project /tmp/t3 >/dev/null 2>&1 && ls /tmp/t3/.env.example /tmp/t3/.github/workflows/secrets.yml && rm -rf /tmp/t3`.

- [ ] **Step 7 : commit** — `git add -A && git commit -m "feat(setup): .env.example par stack + scan secrets gitleaks"`

---

### Task 4 : CI par stack + `ONBOARDING.md`

**Files:**
- Create: `templates/ci/saas.yml`, `mobile.yml`, `desktop.yml`
- Create: `templates/ONBOARDING.md`
- Modify: `scripts/setup.mjs` (wiring tous assistants)

- [ ] **Step 1 : `templates/ci/saas.yml`** (mobile.yml et desktop.yml = même contenu ; les steps `--if-present` s'adaptent)
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run typecheck --if-present
      - run: npm test --if-present
      - run: npm run build --if-present
```
Crée les 3 fichiers avec ce contenu (identique ; commentaire d'en-tête au nom de la stack facultatif).

- [ ] **Step 2 : `templates/ONBOARDING.md`**
```markdown
# Onboarding — étapes manuelles (2 min)

L'installeur a tout posé. Reste quelques réglages **manuels** (pas automatisables) :

## Cursor
- **Docs** : dans Cursor, `@Docs → Add new doc` et ajoute les docs de ta stack (Convex, TanStack Start, Better Auth / Expo / Electron) pour que Cursor les indexe.
- **Bugbot** (relecteur IA de PR, optionnel) : active-le sur ton repo depuis le dashboard Cursor. Complète l'étape sécu de `/new-feature`.
- **Mémoire native** : laisse « Generate Memories » **désactivé** — ce kit gère déjà la mémoire dans `docs/memory/` (portable, versionné).
- **Background Agents** (payant, optionnel) : plus tard, tu pourras faire tourner `/new-feature` en agent cloud.

## GitHub
- Ajoute le secret **`ANTHROPIC_API_KEY`** (Settings → Secrets → Actions) pour le dream hook.
- La CI (`.github/workflows/ci.yml`) et le scan de secrets (`secrets.yml`) tournent à chaque push/PR.

## Secrets
- Copie `.env.example` → `.env` et remplis. **Ne commit jamais `.env`.**

## Démarrer
- `/new-project "<ton idée>"` (fondation), puis `/new-feature "<une feature>"`.
```

- [ ] **Step 3 : setup.mjs — wiring.** Juste après le bloc sécurité de Task 3, ajoute :
```js
  try { copyIfAbsent(path.join(args.source, `templates/ci/${args.stack}.yml`), path.join(projectDir, '.github/workflows/ci.yml'), opt); done.push('.github/workflows/ci.yml'); }
  catch (e) { failed.push(`ci (${e.message})`); }
  try { copyIfAbsent(path.join(args.source, 'templates/ONBOARDING.md'), path.join(projectDir, 'docs/ONBOARDING.md'), opt); done.push('docs/ONBOARDING.md'); }
  catch (e) { failed.push(`onboarding (${e.message})`); }
```

- [ ] **Step 4 : smoke** — `rm -rf /tmp/t4 && node scripts/setup.mjs --source "$PWD" --stack mobile --assistant claude-code --project /tmp/t4 >/dev/null 2>&1 && ls /tmp/t4/.github/workflows/ci.yml /tmp/t4/docs/ONBOARDING.md && rm -rf /tmp/t4`.

- [ ] **Step 5 : commit** — `git add -A && git commit -m "feat(setup): CI par stack + ONBOARDING.md"`

---

### Task 5 : Validateur `validateExtras` + vérif finale 3 assistants

**Files:**
- Modify: `scripts/lib/validate-commands.mjs` (ajoute `validateExtras`)
- Test: `scripts/lib/validate-extras.test.mjs`

- [ ] **Step 1 : test d'intégration**
```js
// scripts/lib/validate-extras.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExtras } from './validate-commands.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
test('tous les templates extras existent', () => {
  assert.deepEqual(validateExtras(ROOT), []);
});
```

- [ ] **Step 2 : lancer → échec** — `node --test scripts/lib/validate-extras.test.mjs`.

- [ ] **Step 3 : implémenter `validateExtras`** dans `scripts/lib/validate-commands.mjs` (à la fin) :
```js
export function validateExtras(root) {
  const errors = [];
  const files = [
    'templates/cursor/hooks.json', 'templates/cursor/hooks/inject-memory.mjs', 'templates/cursor/hooks/log-edit.mjs', 'templates/cursor/cursorignore',
    'templates/security/secrets.yml', 'templates/ONBOARDING.md',
    'templates/env/saas.env.example', 'templates/env/mobile.env.example', 'templates/env/desktop.env.example',
    'templates/ci/saas.yml', 'templates/ci/mobile.yml', 'templates/ci/desktop.yml',
  ];
  for (const f of files) if (!fs.existsSync(path.join(root, f))) errors.push(`extra manquant : ${f}`);
  return errors;
}
```

- [ ] **Step 4 : lancer → succès** — `node --test scripts/lib/validate-extras.test.mjs`, puis suite complète `node --test`.

- [ ] **Step 5 : vérif finale — dry-run + install des 3 assistants**
```bash
for a in cursor claude-code codex; do rm -rf /tmp/vf-$a && node scripts/setup.mjs --source "$PWD" --stack saas --assistant $a --project /tmp/vf-$a >/dev/null 2>&1; echo "== $a =="; ls /tmp/vf-$a/.env.example /tmp/vf-$a/.github/workflows/{ci,secrets}.yml /tmp/vf-$a/docs/ONBOARDING.md 2>&1; rm -rf /tmp/vf-$a; done
```
Attendu : chaque assistant a `.env.example`, `ci.yml`, `secrets.yml`, `ONBOARDING.md` ; cursor a en plus `.cursor/skills/*/SKILL.md` + `.cursor/hooks.json` + `.cursorignore`.

- [ ] **Step 6 : commit** — `git add -A && git commit -m "test(setup): validateExtras + vérif 3 assistants"`

---

## Notes
- Merge sur `dev` après la Task 5 (`git checkout dev && git merge --no-ff feat/cursor-and-kit-improvements`).
- `secrets.yml` + `ci.yml` cohabitent avec `dream.yml` dans `.github/workflows/`.
