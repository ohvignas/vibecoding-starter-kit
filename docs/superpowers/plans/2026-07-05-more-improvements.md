# Améliorations supplémentaires (A→F) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6 ajouts à l'installeur : (A) subagents review+sécu, (B) `.gitignore` par stack, (C) consolidation mémoire planifiée, (D) commande `/doctor`, (E) hook pre-commit, (F) feature d'exemple par stack.

**Architecture:** Nouveaux templates sous `templates/` ; `setup.mjs` les copie (certains cursor-only ou tous assistants) ; `validate-commands.mjs` étend `validateExtras`. Contenu éditorial garanti par le validateur + smoke tests.

**Tech Stack:** Node ESM, `node --test`, zéro dépendance. Node réel si bruit nvm : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.

## Global Constraints
- Node ≥ 20.12, pure ESM, `node --test`, ZERO dépendance. Copy **français**.
- Idempotent (`copyIfAbsent`), échecs capturés, jamais de crash. Ne rien casser (suite déjà 53/53).
- Commande `/doctor` livrée comme les autres : Cursor → `.cursor/skills/doctor/SKILL.md`, Claude Code → `.claude/commands/doctor.md`, Codex → `docs/commands/doctor.md`.

---

### Task A : Subagents review + sécu

**Files:** Create `templates/agents/subagents/code-reviewer.md`, `templates/agents/subagents/security-reviewer.md` ; Modify `scripts/setup.mjs` (copie → `.claude/agents/`) ; Modify `templates/commands/new-feature.md` (référence).

- [ ] **Step 1 : `templates/agents/subagents/code-reviewer.md`**
```markdown
---
name: code-reviewer
description: Relit un diff pour bugs, conventions, lisibilité. À lancer sur le diff d'une PR.
---
Tu es un relecteur de code senior. Analyse UNIQUEMENT le diff fourni. Cherche : bugs / erreurs de logique, cas limites non gérés, erreurs avalées, duplication de blocs, nommage flou, tests qui n'assertent rien. Ignore le style pur (le linter s'en charge). Par finding : `fichier:ligne — problème — pourquoi ça compte — fix`. Trie par sévérité (critique/important/mineur). Pas de compliment, pas de hors-scope.
```

- [ ] **Step 2 : `templates/agents/subagents/security-reviewer.md`**
```markdown
---
name: security-reviewer
description: Revue sécurité d'un diff : secrets, autorisation, validation d'entrées, webhooks.
---
Tu es un auditeur sécurité. Sur le diff : secrets en dur, autorisation manquante ou contournable, validation d'entrée absente, injection, signatures de webhook non vérifiées, données sensibles loguées, `service_role`/clé exposée au client. Par finding : `fichier:ligne — risque — impact — fix`. Sévérité (critique/haut/moyen). Concis, pas de hors-scope.
```

- [ ] **Step 3 : setup.mjs — copie (tous assistants).** Après le bloc CI/onboarding (avant `if (args.caveman)`), ajoute :
```js
  try { copyDirIfAbsent(path.join(args.source, 'templates/agents/subagents'), path.join(projectDir, '.claude/agents'), opt); done.push('.claude/agents/ (code-reviewer + security-reviewer)'); }
  catch (e) { failed.push(`agents (${e.message})`); }
```

- [ ] **Step 4 : `templates/commands/new-feature.md`** — dans l'étape 4, après « Bugs, conventions, sécurité du diff. », ajoute : « Peut lancer le subagent `code-reviewer` sur le diff. » ; dans l'étape 6, après « Revue sécurité des changements de la branche. », ajoute : « Peut lancer le subagent `security-reviewer`. »

- [ ] **Step 5 : smoke** — `rm -rf /tmp/tA && node scripts/setup.mjs --source "$PWD" --stack saas --assistant claude-code --project /tmp/tA >/dev/null 2>&1 && ls /tmp/tA/.claude/agents/ && rm -rf /tmp/tA`.
- [ ] **Step 6 : commit** — `git add -A && git commit -m "feat(setup): subagents code-reviewer + security-reviewer"`

---

### Task B : `.gitignore` par stack

**Files:** Create `templates/gitignore/{saas,mobile,desktop}.gitignore` ; Modify `scripts/setup.mjs`.

- [ ] **Step 1 : `templates/gitignore/saas.gitignore`**
```
node_modules/
.env
.env.*
!.env.example
dist/
.output/
convex/_generated/
docs/memory/.edit-queue.log
.DS_Store
```
- [ ] **Step 2 : `templates/gitignore/mobile.gitignore`**
```
node_modules/
.env
.env.*
!.env.example
.expo/
dist/
docs/memory/.edit-queue.log
.DS_Store
```
- [ ] **Step 3 : `templates/gitignore/desktop.gitignore`**
```
node_modules/
.env
.env.*
!.env.example
dist/
out/
release/
docs/memory/.edit-queue.log
.DS_Store
```
- [ ] **Step 4 : setup.mjs** — après le bloc agents, ajoute :
```js
  try { copyIfAbsent(path.join(args.source, `templates/gitignore/${args.stack}.gitignore`), path.join(projectDir, '.gitignore'), opt); done.push('.gitignore'); }
  catch (e) { failed.push(`.gitignore (${e.message})`); }
```
- [ ] **Step 5 : smoke** — `rm -rf /tmp/tB && node scripts/setup.mjs --source "$PWD" --stack desktop --assistant codex --project /tmp/tB >/dev/null 2>&1 && cat /tmp/tB/.gitignore && rm -rf /tmp/tB`.
- [ ] **Step 6 : commit** — `git add -A && git commit -m "feat(setup): .gitignore par stack"`

---

### Task C : Consolidation mémoire planifiée

**Files:** Create `templates/memory-consolidate/consolidate.yml` ; Modify `scripts/setup.mjs`.

- [ ] **Step 1 : `templates/memory-consolidate/consolidate.yml`**
```yaml
name: Memory consolidate
on:
  schedule:
    - cron: "0 6 * * 1"   # tous les lundis 6h UTC
  workflow_dispatch: {}
permissions:
  contents: write
jobs:
  consolidate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Consolide docs/memory/ : fusionne les doublons dans gotchas.md/conventions.md/decisions.md,
            déplace les entrées obsolètes vers archive.md (ne supprime pas), garde docs/memory/index.md
            à jour et < 50 lignes. N'édite QUE les fichiers sous docs/memory/.
          claude_args: "--max-turns 8 --model claude-sonnet-5 --allowedTools Read,Edit(docs/memory/*)"
      - name: Commit
        run: |
          git config user.name "memory-bot"
          git config user.email "memory-bot@users.noreply.github.com"
          git add docs/memory
          git diff --cached --quiet || git commit -m "chore: consolidation mémoire $(date -u +%Y-%m-%d)"
          git push
```
- [ ] **Step 2 : setup.mjs** — après le bloc `.gitignore`, ajoute :
```js
  try { copyIfAbsent(path.join(args.source, 'templates/memory-consolidate/consolidate.yml'), path.join(projectDir, '.github/workflows/memory-consolidate.yml'), opt); done.push('consolidation mémoire (hebdo)'); }
  catch (e) { failed.push(`memory-consolidate (${e.message})`); }
```
- [ ] **Step 3 : smoke** — `rm -rf /tmp/tC && node scripts/setup.mjs --source "$PWD" --stack saas --assistant cursor --project /tmp/tC >/dev/null 2>&1 && ls /tmp/tC/.github/workflows/memory-consolidate.yml && rm -rf /tmp/tC`.
- [ ] **Step 4 : commit** — `git add -A && git commit -m "feat(setup): consolidation mémoire planifiée (Action hebdo)"`

---

### Task D : Commande `/doctor`

**Files:** Create `templates/commands/doctor.md` ; Modify `scripts/setup.mjs` (ajouter 'doctor' à la boucle commandes) ; Modify `scripts/lib/validate-commands.mjs` + son test (ajouter doctor aux runbooks requis).

- [ ] **Step 1 : `templates/commands/doctor.md`**
```markdown
# /doctor — Diagnostic du projet (runbook IA)

Vérifie que le projet est bien configuré et rends un rapport clair (✓ / ✗ + comment corriger). Ne modifie rien sans demander.

1. **AGENTS.md** et **CLAUDE.md** présents à la racine.
2. **docs/memory/index.md** présent (+ gotchas/conventions/decisions/archive).
3. **MCP** : `.mcp.json` (Claude Code/Codex) ou `.cursor/mcp.json` (Cursor) présent si stack SaaS/mobile.
4. **Secrets non commités** : `git ls-files | grep -E '(^|/)\.env$'` doit être VIDE. Sinon → alerte : retire le fichier du suivi (`git rm --cached`), vérifie `.gitignore`.
5. **.gitignore** ignore bien `.env`.
6. **Commandes** installées : `/new-project`, `/new-feature`, `/edit-design`.
7. **Workflows** : `.github/workflows/{ci,secrets,dream,memory-consolidate}.yml` présents.
8. **Node ≥ 20.12** et **git** disponibles.

Termine par un résumé : ce qui va, ce qui manque, et les commandes exactes pour corriger.
```
- [ ] **Step 2 : setup.mjs** — dans la boucle commandes, remplace la liste `['new-project', 'new-feature', 'edit-design']` par `['new-project', 'new-feature', 'edit-design', 'doctor']`.
- [ ] **Step 3 : validate-commands.mjs** — dans `validateExtras` (Task G), ajoute `'templates/commands/doctor.md'` (fait en Task G). *(Pas d'autre changement validateur ici.)*
- [ ] **Step 4 : smoke** — `rm -rf /tmp/tD && node scripts/setup.mjs --source "$PWD" --stack saas --assistant claude-code --project /tmp/tD >/dev/null 2>&1 && ls /tmp/tD/.claude/commands/doctor.md && rm -rf /tmp/tD` ; et cursor → `.cursor/skills/doctor/SKILL.md`.
- [ ] **Step 5 : suite + commit** — `node --test` ; `git add -A && git commit -m "feat(commands): /doctor (auto-diagnostic projet)"`

---

### Task E : Hook pre-commit

**Files:** Create `templates/hooks/pre-commit` ; Modify `scripts/setup.mjs` (copie + chmod) ; Modify `templates/ONBOARDING.md` (note d'activation).

- [ ] **Step 1 : `templates/hooks/pre-commit`**
```bash
#!/usr/bin/env bash
# Pre-commit vibe-stack : bloque les secrets évidents + lance le linter si dispo.
set -e
if git diff --cached -U0 | grep -Eq '(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'; then
  echo "⛔ Secret potentiel détecté dans le diff — retire-le avant de commit."
  exit 1
fi
npm run lint --if-present --silent || true
```
- [ ] **Step 2 : setup.mjs** — après le bloc consolidation mémoire, ajoute :
```js
  try {
    const hook = path.join(projectDir, '.githooks/pre-commit');
    copyIfAbsent(path.join(args.source, 'templates/hooks/pre-commit'), hook, opt);
    if (fs.existsSync(hook)) fs.chmodSync(hook, 0o755);
    done.push('.githooks/pre-commit');
  } catch (e) { failed.push(`pre-commit (${e.message})`); }
```
- [ ] **Step 3 : `templates/ONBOARDING.md`** — dans la section GitHub (ou une nouvelle « Git »), ajoute :
```markdown
## Git — activer le hook pre-commit
`git config core.hooksPath .githooks` (bloque les secrets évidents + linte avant chaque commit).
```
- [ ] **Step 4 : smoke** — `rm -rf /tmp/tE && node scripts/setup.mjs --source "$PWD" --stack saas --assistant claude-code --project /tmp/tE >/dev/null 2>&1 && test -x /tmp/tE/.githooks/pre-commit && echo "hook exécutable ✓" && rm -rf /tmp/tE`.
- [ ] **Step 5 : commit** — `git add -A && git commit -m "feat(setup): hook pre-commit (scan secrets + lint)"`

---

### Task F : Feature d'exemple par stack (patron de référence)

**Files:** Create `templates/examples/{saas,mobile,desktop}.md` ; Modify `scripts/setup.mjs`. *(Contenu = patron de référence documenté que `/new-feature` peut imiter, PAS une app qui tourne.)*

- [ ] **Step 1 : `templates/examples/saas.md`**
```markdown
# Exemple de référence — feature « Tâches » (Convex + TanStack Start)

## Schéma — `convex/schema.ts`
\`\`\`ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  tasks: defineTable({ text: v.string(), done: v.boolean(), userId: v.string() }).index("by_user", ["userId"]),
});
\`\`\`

## Backend — `convex/tasks.ts`
\`\`\`ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({ args: {}, handler: async (ctx) => {
  const id = (await ctx.auth.getUserIdentity())?.subject; if (!id) return [];
  return ctx.db.query("tasks").withIndex("by_user", q => q.eq("userId", id)).collect();
}});
export const add = mutation({ args: { text: v.string() }, handler: async (ctx, { text }) => {
  const id = (await ctx.auth.getUserIdentity())?.subject; if (!id) throw new Error("non connecté");
  await ctx.db.insert("tasks", { text, done: false, userId: id });
}});
\`\`\`

## Front — dans une route TanStack Start
\`\`\`tsx
const tasks = useQuery(api.tasks.list) ?? [];
const add = useMutation(api.tasks.add);
// <form onSubmit={e => { e.preventDefault(); add({ text }); }}> … {tasks.map(t => <li key={t._id}>{t.text}</li>)}
\`\`\`
Points clés : scoping par `userId` (jamais voir les tâches d'un autre), query réactive, mutation vérifie l'auth.
```
- [ ] **Step 2 : `templates/examples/mobile.md`**
```markdown
# Exemple de référence — feature « Tâches » (Expo + Convex)
Même backend Convex que le SaaS (`convex/schema.ts` + `convex/tasks.ts`, voir l'exemple SaaS).
## Écran — `app/index.tsx`
\`\`\`tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
const tasks = useQuery(api.tasks.list) ?? [];
const add = useMutation(api.tasks.add);
// <FlatList data={tasks} renderItem={({item}) => <Text>{item.text}</Text>} />
\`\`\`
Points clés : `EXPO_PUBLIC_CONVEX_URL`, `<ConvexProvider>` dans `app/_layout.tsx`, hooks réactifs.
```
- [ ] **Step 3 : `templates/examples/desktop.md`**
```markdown
# Exemple de référence — feature « Notes » (Electron)
## IPC sûr — `preload.js`
\`\`\`js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("notes", {
  save: (text) => ipcRenderer.invoke("notes:save", text),
  load: () => ipcRenderer.invoke("notes:load"),
});
\`\`\`
## Main — `main.js`
\`\`\`js
const fs = require("node:fs"); const path = require("node:path");
const file = path.join(app.getPath("userData"), "notes.txt");
ipcMain.handle("notes:save", (_e, text) => fs.writeFileSync(file, String(text)));
ipcMain.handle("notes:load", () => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } });
\`\`\`
Points clés : `contextIsolation: true`, jamais `nodeIntegration`, l'accès disque reste dans le main.
```
- [ ] **Step 4 : setup.mjs** — après le bloc pre-commit, ajoute :
```js
  try { copyIfAbsent(path.join(args.source, `templates/examples/${args.stack}.md`), path.join(projectDir, 'docs/examples/feature-exemple.md'), opt); done.push('docs/examples/feature-exemple.md'); }
  catch (e) { failed.push(`exemple (${e.message})`); }
```
- [ ] **Step 5 : smoke** — `rm -rf /tmp/tF && node scripts/setup.mjs --source "$PWD" --stack saas --assistant cursor --project /tmp/tF >/dev/null 2>&1 && head -3 /tmp/tF/docs/examples/feature-exemple.md && rm -rf /tmp/tF`.
- [ ] **Step 6 : commit** — `git add -A && git commit -m "feat(setup): feature d'exemple (patron) par stack"`

---

### Task G : `validateExtras` étendu + vérif finale

**Files:** Modify `scripts/lib/validate-commands.mjs` (`validateExtras` : ajouter les nouveaux fichiers) ; le test `validate-extras.test.mjs` existe déjà.

- [ ] **Step 1 : `validate-commands.mjs`** — dans `validateExtras`, ajoute à la liste `files` :
```js
    'templates/agents/subagents/code-reviewer.md', 'templates/agents/subagents/security-reviewer.md',
    'templates/gitignore/saas.gitignore', 'templates/gitignore/mobile.gitignore', 'templates/gitignore/desktop.gitignore',
    'templates/memory-consolidate/consolidate.yml',
    'templates/commands/doctor.md',
    'templates/hooks/pre-commit',
    'templates/examples/saas.md', 'templates/examples/mobile.md', 'templates/examples/desktop.md',
```
- [ ] **Step 2 : lancer** — `node --test scripts/lib/validate-extras.test.mjs` → PASS (tous les fichiers existent). Puis suite complète `node --test`.
- [ ] **Step 3 : vérif finale 3 assistants** — 
```bash
for a in cursor claude-code codex; do rm -rf /tmp/vf-$a && node scripts/setup.mjs --source "$PWD" --stack saas --assistant $a --project /tmp/vf-$a >/dev/null 2>&1; echo "== $a =="; ls /tmp/vf-$a/.gitignore /tmp/vf-$a/.claude/agents/ /tmp/vf-$a/.github/workflows/memory-consolidate.yml /tmp/vf-$a/.githooks/pre-commit /tmp/vf-$a/docs/examples/feature-exemple.md 2>&1; rm -rf /tmp/vf-$a; done
```
- [ ] **Step 4 : commit** — `git add -A && git commit -m "test(setup): validateExtras étendu (A→F)"`

---

## Notes
- Merge sur `dev` après Task G.
- `.github/workflows/` finit avec : `ci.yml`, `secrets.yml`, `dream.yml`, `memory-consolidate.yml`.
