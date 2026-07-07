# Cursor power-setup — Design

**Date :** 2026-07-07
**Statut :** en revue
**Cible :** Cursor (assistant principal). Tout vérifié contre `cursor.com/docs` (juillet 2026).

## Objectif

Exploiter à fond la surface de config Cursor que le kit n'utilise pas encore. 5 ajouts **réels et vérifiés**, du plus fort au plus petit :

1. **Hook sécu `beforeShellExecution`** — bloque les commandes dangereuses (`rm -rf /`, `curl|bash`, `git push --force`, lecture/exfiltration de `.env`). Transforme la promesse « security-first » en garde-fou réel, au moment exact où ça compte pour un débutant. Contrat vérifié : stdin `{command,…}` → stdout `{permission:'deny'|'ask'|'allow', user_message, agent_message}` ; `deny` bloque. (docs : cursor.com/docs/hooks)
2. **Règles `.cursor/rules/*.mdc` typées** — au lieu d'un seul gros blob `alwaysApply`, un `00-project.mdc` **Always** minuscule + des règles **Auto-Attached par glob** par framework (`convex/**`, `src/routes/**`, `**/*.ts`, electron main/preload). La bonne guidance se charge quand on touche le bon dossier ; suit la reco Cursor « <500 lignes, composables ». (docs : cursor.com/docs/context/rules)
3. **`.cursor/BUGBOT.md`** — instructions de review PR auto (checklist sécu du kit). Fichier committable ; activer Bugbot = via le dashboard (compte, à documenter). (docs : cursor.com/docs/bugbot)
4. **`.cursor/environment.json`** par stack — dev reproductible « clone → ça tourne » (`install` + `terminals`). (docs : cursor.com/docs/cloud-agent/setup)
5. **`.cursorindexingignore`** — sort les fichiers générés du search (`convex/_generated/`, `ios/`, `android/`, lockfiles) sans bloquer l'accès. `.env` reste dans `.cursorignore`. (docs : cursor.com/docs/context/ignore-files)

## Principes

- **Réel uniquement** : chaque mécanisme est une feature Cursor documentée (URLs ci-dessus). Rien d'inventé. Memories (non committable) et @Docs (compte) → **hors scope**, juste mentionnés en doc.
- **Zéro dépendance ; testable** : les scripts (guard-shell) exposent une fonction pure testée `node --test` ; les fichiers de config sont validés par leur contenu.
- **Additif, non destructif** ; le hook sécu **fail-open** (un bug du hook ne bloque pas le terminal) mais **deny** sur la liste noire.

## Détail

### 1. Hook sécu (`templates/cursor/hooks/guard-shell.mjs` + entrée `hooks.json`)
- `isDangerous(cmd) → bool` (liste noire regex, exportée + testée). CLI : lit stdin JSON, `deny` si dangereux (avec `user_message` FR + `agent_message` EN qui demande à l'IA de proposer une alternative sûre), sinon `allow`. Commentaire : passer `allow`→`ask` pour tout faire confirmer.
- `templates/cursor/hooks.json` gagne `"beforeShellExecution": [{ "command": "node .cursor/hooks/guard-shell.mjs", "type": "command" }]` (déjà copié pour Cursor).

### 2. Règles typées (`templates/cursor/rules/`)
- `00-project.mdc` (**Always**, ~12 lignes) : TypeScript strict, jamais de secret commité, demander avant action destructive, préférer les docs officielles, suivre `AGENTS.md`. → copié dans `.cursor/rules/00-project.mdc`.
- Par stack `templates/cursor/rules/<stack>/*.mdc` (**Auto-Attached**, `alwaysApply:false` + `globs`), courtes :
  - **saas** : `typescript.mdc` (globs `**/*.ts,**/*.tsx`) · `convex.mdc` (`convex/**`) · `tanstack.mdc` (`src/routes/**`) · `better-auth.mdc` (`**/auth*.ts,convex/betterAuth/**`)
  - **mobile** : `typescript.mdc` · `convex.mdc` · `expo.mdc` (`app/**,**/*.tsx`)
  - **desktop** : `typescript.mdc` · `electron-security.mdc` (`**/main.ts,**/preload.ts,**/main/**`)
- `setup.mjs` (bloc cursor) : copie `00-project.mdc` + `copyDirIfAbsent(templates/cursor/rules/<stack>` → `.cursor/rules/`.
- La règle `stack-<stack>.mdc` existante (issue de l'AGENTS.md) passe de **Always** à **Agent-Requested** (`alwaysApply:false` + description), pour ne plus saturer le contexte à chaque tour. (via un champ `alwaysApply` dans le spec de copie mdc + `toCursorMdc`.)

### 3–5. Petits fichiers
- `templates/cursor/BUGBOT.md` → `.cursor/BUGBOT.md` (checklist : secrets, Convex hors query/mutation, Electron nodeIntegration/contextIsolation/IPC, `any`/catch vides, explications pour débutant).
- `templates/cursor/environment/<stack>.json` → `.cursor/environment.json` (saas : `install: npm install` + terminals `npx convex dev` & `npm run dev` ; mobile : `npx expo start` ; desktop : `npm run dev`).
- `templates/cursor/cursorindexingignore` → `.cursorindexingignore`.
- Tous copiés dans le bloc `if (assistant === 'cursor')` de `setup.mjs`.

## Fichiers

**Nouveaux :** `templates/cursor/hooks/guard-shell.mjs` · `templates/cursor/rules/00-project.mdc` + `templates/cursor/rules/{saas,mobile,desktop}/*.mdc` · `templates/cursor/BUGBOT.md` · `templates/cursor/environment/{saas,mobile,desktop}.json` · `templates/cursor/cursorindexingignore` · tests (`guard-shell.test.mjs`, un test de présence/validité des fichiers cursor).
**Modifiés :** `templates/cursor/hooks.json` (entrée beforeShellExecution) · `scripts/setup.mjs` (bloc cursor : copies rules/BUGBOT/environment/cursorindexingignore) · `scripts/lib/matrix.mjs` + `scripts/lib/templates.mjs` (stack rule → alwaysApply:false) · `README`/guide (note Cursor : Bugbot via dashboard, `/create-rule`).

## Non-goals
- Pas de Memories (non committable) ni @Docs (compte) — mentionnés en doc seulement.
- Le hook ne prétend pas être une sandbox : c'est une liste noire best-effort (comme Cursor le dit de `.cursorignore`).
- Pas de nested `.cursor/rules` (glob-scoped root rules + AGENTS.md nested = le pattern supporté).
