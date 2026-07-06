# Environnement IA par stack + Build piloté par la Roadmap — Design

**Date :** 2026-07-06
**Statut :** approuvé (design) — prêt pour writing-plans
**Langue projet :** français (code, commandes, URLs conservés verbatim)

## Objectif

Deux améliorations liées du Vibecoding Starter Kit, pour qu'un·e débutant·e obtienne un environnement **complet** et **voie son app avancer visuellement** :

1. **Partie 1 — Environnement IA par stack.** Quand l'élève choisit une stack (SaaS / mobile / desktop), le projet généré est préconfiguré avec le **maximum de capacités réelles** de ce framework : plugins d'assistant, serveurs MCP, skills portables, hooks framework, règles/contexte. L'« interface » = la surface de dev pilotée par l'IA, pas une nouvelle UI.
2. **Partie 2 — Build piloté par la Roadmap.** Depuis le PRD + tech spec + design, l'IA écrit une **Roadmap exhaustive**, génère les **plans d'implémentation complets** de toute la roadmap, puis lance un **run en boucle** (subagent-driven, comme le reste du kit) qui met tout en place **fondations d'abord**, avec un **résultat visuel à chaque étape**.

Les deux s'emboîtent : le **jalon 0** de la Roadmap = l'installation de l'environnement de la Partie 1.

## Principes

- **Additif, non destructif.** Rien de l'existant ne casse. Nouveaux writers additifs ; MCP mergé ; hooks framework en **warn-only** (sauf scan secrets, bloquant).
- **Headless-testable.** `setup.mjs` tourne hors assistant → il n'écrit que du **déclaratif** (config MCP, scripts de hooks, règles, scripts npm). Les actions **interactives** (installer un plugin, `npx skills add`, autoriser un MCP) sont listées dans `docs/SETUP-AI.md` et jouées par l'IA au 1er install (modèle « parle à ton IA » déjà en place).
- **Défensif.** Les scripts de check tolèrent un projet vide/pré-scaffold : si l'outil ou le fichier cible est absent → no-op propre, jamais de crash.
- **Débutant d'abord.** Warn-only, tranches verticales courtes, un visuel à chaque jalon, `/doctor` pour le bilan santé.
- **Vérifié.** Toutes les valeurs du manifeste (commandes, URLs) sont issues de la recherche de juillet 2026 et vérifiées. Pièges écartés documentés.

---

# Partie 1 — Environnement IA par stack

## 1.1 Modèle de données : `STACKS` (source unique de vérité)

Objet **pur données** dans `scripts/lib/matrix.mjs`. Forme identique pour les 3 stacks :

```js
STACKS[stack] = {
  plugins: {                    // par assistant — l'IA les installe (SETUP-AI.md)
    'claude-code': [{ name, cmd, why }],
    cursor:        [{ name, cmd, why }],
    codex:         [{ name, cmd, why }],
  },
  mcp: {                        // écrit/mergé dans .mcp.json (déclaratif)
    <server>: { command, args } | { transport:'http', url }, needsAuth?: bool
  },
  skills: [{ name, cmd }],       // portables cross-agent (npx skills add …)
  hooks:  ['<id>', …],           // ids → scripts défensifs copiés depuis templates/
  scripts:{ <npmScript>: <cmd> },// ajoutés à package.json s'il existe
  rules:  [{ label, url }],      // déjà mirrorés dans ai-context/ ; référencés par SETUP-AI
  extras: ['<note débutant>', …],// env, seed, deploy, pièges
}
```

`resolveStackManifest(stack, assistant)` résout la vue pour l'assistant courant (aplatit `plugins[assistant]`, choisit les chemins MCP, etc.). `resolveAssets` existant est conservé ; le manifeste vient **en plus**.

## 1.2 Contenu vérifié du manifeste

### SaaS — Convex + TanStack Start + Better Auth
- **plugins.claude-code :** `convex` → `/plugin install convex@claude-plugins-official` (bundle MCP + hooks TS + skills + agents). Source : docs.convex.dev/ai/using-claude-code
- **plugins.cursor :** `convex-agent-plugins` → cloner https://github.com/get-convex/convex-agent-plugins (18 règles + 6 skills + 2 agents).
- **plugins.codex :** aucun first-party ; s'appuie sur `AGENTS.md` + shadcn MCP `--client codex`.
- **mcp :** `convex` = `npx -y convex@latest mcp start` (déjà présent) · `better-auth` = http `https://mcp.better-auth.com/mcp` (déjà présent) · `shadcn` = `npx -y shadcn@latest mcp` (init : `pnpm dlx shadcn@latest mcp init --client <claude|cursor|codex>`).
- **skills :** `npx skills add better-auth/skills` · `npx skills add get-convex/agent-skills --all`.
- **hooks :** `typecheck` (`tsc --noEmit`) · `lint` (`biome check .`) · `convex-dev` (`npx convex dev`, long-running, note sessionStart : c'est LE check/codegen de Convex, pas de `convex typecheck` séparé) · `auth-generate` (`npx auth generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts`).
- **rules (déjà dans ai-context/) :** convex_rules `https://convex.link/convex_rules.txt` (.mdc pour Cursor) · TanStack `https://tanstack.com/start/latest/llms.txt` · Better Auth `https://better-auth.com/llms.txt` · Convex `https://www.convex.dev/llms.txt` · guide 3-en-1 `https://labs.convex.dev/better-auth/framework-guides/tanstack-start`.
- **extras :** secrets auth (`BETTER_AUTH_SECRET`, `SITE_URL`, OAuth) via `npx convex env set …` (dans Convex, **pas** `.env`) · `.env.local` = seulement `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL` · pin `better-auth@~1.6.15` · `convex/seed.ts` + `npx convex run seed` · `npx convex dashboard`.

### Mobile — React Native (Expo) + Convex
- **plugins.claude-code :** `expo` → `claude plugin install expo@claude-plugins-official` · `convex` → `/plugin install convex@claude-plugins-official`.
- **plugins.codex :** `codex plugin add expo@openai-curated` ; MCP `codex mcp add expo --url https://mcp.expo.dev/mcp`.
- **mcp :** `expo` = http `https://mcp.expo.dev/mcp` (**needsAuth** : compte Expo via `/mcp`) — ajout : `claude mcp add --transport http expo https://mcp.expo.dev/mcp` · `convex` (idem SaaS).
- **skills :** `npx skills add expo/skills` · `npx skills add get-convex/agent-skills --all` · règles Convex dans le repo : `npx convex ai-files install` (`status`/`update`).
- **hooks :** `deps-check` (`npx expo install --check`, pre-commit/CI, exit≠0) · `doctor` (`npx expo-doctor`, pre-push/CI) · `typecheck` (`tsc --noEmit`) · `lint` (`npx expo lint`, `eslint-config-expo/flat`) · `convex-dev` (`npx convex dev --once`, sessionStart, regénère les types).
- **rules :** Expo `https://docs.expo.dev/llms.txt` (+ `llms-full.txt`) · React Native `https://reactnative.dev/llms.txt` · convex_rules (idem). Hub agents : `https://docs.expo.dev/agents.md`.
- **extras :** typed routes (`app.json` → `experiments.typedRoutes:true` + `npx expo customize tsconfig.json`) · dev client (`expo-dev-client`) · EAS (`eas.json`, build/update/submit — free tier limité) · OTA (`eas update`) · `app.config.ts` + `EXPO_PUBLIC_*` / `expo-constants`.

### Desktop — Electron
- **plugins.claude-code :** `electron` → `claude plugin marketplace add ohvignas/claude-electron-skills` puis `claude plugin install electron@claude-electron-skills` (14 skills + 8 commands, secure-by-default). Repo maison.
- **plugins.cursor :** awesome-cursorrules entrée Electron/TS (fit faible — seulement « VSCode-Extension Electron/TS »).
- **mcp :** `chrome-devtools` = `npx chrome-devtools-mcp@latest --browser-url=http://127.0.0.1:9222` (debug du **renderer** ; lancer l'app avec `--remote-debugging-port=9222`). Pas de MCP Electron officiel (confirmé absent).
- **skills :** couverts par le plugin electron.
- **hooks :** `typecheck` (`tsc --noEmit`, pre-commit+CI) · `lint` (`biome check .`, pre-commit) · `security` (`npx @doyensec/electronegativity -i .`, **pre-push+CI** — LE check sécu : nodeIntegration, contextIsolation, CSP, openExternal…) · `package-check` (`npm run make` / `electron-builder --dir`, CI) · `husky init` (one-time).
- **rules :** checklist sécu `https://www.electronjs.org/docs/latest/tutorial/security` · docs `https://www.electronjs.org/docs/latest` · context-isolation, sandbox, process-model, web-preferences, code-signing, fuses · Forge `https://www.electronforge.io` · `https://github.com/sindresorhus/awesome-electron`.
- **extras :** template Forge Vite+TS (`npx create-electron-app@latest my-app --template=vite-typescript`) · `@electron/fuses` (`OnlyLoadAppFromAsar`, désactiver `RunAsNode`) · webPreferences sûrs + CSP · `update-electron-app` · signature code = **payant** (Apple $99/an ; Windows EV ~$250–500/an) → chemin débutant : non-signé + documenter l'avertissement.
- **écartés (ne pas wire) :** MCP Electron officiel (inexistant) · `llms.txt` Electron (404 — ne pas inventer) · `@electron/lint-roller` (linter de **docs markdown**, pas sécu).

### Partagé (déjà dans le kit) — Design
5 skills : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines`. Restent dans la règle design de l'`AGENTS.md`/`CLAUDE.md` et rappelés dans SETUP-AI.md.

## 1.3 Ce que le moteur écrit (headless)

`setup.mjs` consomme `resolveStackManifest` et produit :

| Sortie | Mécanisme | Fichier lib |
|---|---|---|
| `.mcp.json` (claude/codex) ou `.cursor/mcp.json` (cursor) | **merge** non destructif de `manifest.mcp` dans l'existant | `scripts/lib/mcp.mjs` (+test) |
| Hooks **Cursor** | étend le `.cursor/hooks.json` généré : `afterFileEdit` → runner de checks (warn) ; garde `sessionStart` inject-memory | `scripts/lib/hooks.mjs` (+test) |
| Hooks **Claude Code** | génère `.claude/settings.json` : `PostToolUse` (matcher `Edit|Write`) → runner de checks (warn). Mémoire déjà chargée via `@docs/memory/index.md` dans `CLAUDE.md` → **pas** de hook mémoire (évite le doublon) | idem |
| Hooks **git** | étend `.githooks/pre-commit` (typecheck+lint tolérants) + nouveau `.githooks/pre-push` (checks sécu/doctor de la stack) | `templates/hooks/` |
| Scripts de check | copie `templates/hooks/framework/checks.mjs` — **défensif**, paramétré par stack (lit les ids `hooks`) | nouveau dossier |
| Scripts `package.json` | si `package.json` existe → ajoute les `scripts` manquants ; sinon → note dans SETUP-AI (le scaffold le créera) | `setup.mjs` |
| `docs/SETUP-AI.md` | rendu depuis le manifeste (plugins + skills + MCP-auth pour l'assistant) | `scripts/lib/setup-ai.mjs` (+test) |

**Politique blocage :** `templates/hooks/pre-commit` scan secrets = **bloquant** (inchangé). Tous les checks framework = **warn-only** (exit 0 + message). `/doctor` fait le bilan.

**Runner de checks (`templates/hooks/framework/checks.mjs`)** — un seul script, défensif :
- reçoit une liste d'ids (`typecheck`, `lint`, `deps-check`, `doctor`, `security`, …) ;
- pour chaque : vérifie la présence de l'outil/fichier (`package.json`, binaire via `npx --no-install` ou existence de config) ; si absent → skip silencieux ;
- exécute, agrège les warnings, **exit 0 toujours** (sauf appelé en mode `--strict` par la CI plus tard, hors scope initial).

## 1.4 `docs/SETUP-AI.md` (joué par l'IA au 1er install)

Généré par stack **et** assistant. Checklist exécutable :

```markdown
# Setup IA — stack <stack> · assistant <assistant>
## 1. Plugins
- [ ] <cmd plugin 1>
## 2. Skills portables
- [ ] <cmd skill 1>
## 3. MCP à autoriser
- [ ] <serveurs déjà dans .mcp.json> → lance `/mcp` pour connecter
- [ ] <serveurs needsAuth> → `/mcp` puis login
## 4. Design (5 skills) — voir la règle design de l'AGENTS.md
## 5. Scripts package.json (si absents après scaffold)
- [ ] ajoute : "typecheck": "...", "lint": "..."
```

`playbook/00-START.md` gagne une étape : « après `setup.mjs`, ouvre `docs/SETUP-AI.md` et exécute chaque case ». Le rapport final de `setup.mjs` (section `inAssistant`) pointe aussi vers ce fichier.

## 1.5 `/doctor` étendu

`templates/commands/doctor.md` vérifie en plus :
- `.mcp.json` contient les serveurs de la stack (✓/✗ par serveur) ;
- hooks câblés : `.cursor/hooks.json` / `.claude/settings.json` / `.githooks/pre-push` présents ;
- scripts `package.json` `typecheck` + `lint` présents ;
- cases `[ ]` restantes dans `SETUP-AI.md` → rappelle de le jouer ;
- (desktop) `@doyensec/electronegativity` disponible.

## 1.6 Corrections repo (issues de la recherche)

| Fichier | Correction |
|---|---|
| `.claude/skills/stack-saas/SKILL.md`, `stacks/saas/AGENTS.md` | Better Auth CLI = `npx auth generate` (composant Convex) et non `@better-auth/cli generate` ; secrets auth via `npx convex env set` (pas `.env`) ; garder pin `~1.6.x` |
| `templates/env/saas.env.example` | ajouter `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL` ; commenter « secrets auth → Convex, pas ici » |
| `ai-context/electron/README.md` | acter : pas de `llms.txt` Electron (ne pas en générer) ; pointer la checklist sécu |

---

# Partie 2 — Build piloté par la Roadmap

## 2.1 `docs/ROADMAP.md` — exhaustif, visuel, fondations d'abord

Généré par `/new-project` depuis PRD + tech spec + design. Un **template qui force à penser à tout** : le générateur parcourt une checklist de dimensions pour n'en oublier aucune.

**Dimensions obligatoires (ordre = fondations d'abord) :**
0. **Fondations** — environnement Partie 1 installé (SETUP-AI.md joué) + scaffold framework + 1er boot.
1. **Modèle de données** (schéma Convex / tables).
2. **Auth**.
3. **Chaque feature du PRD** (une par jalon, tranche verticale).
4. **Passe UI/design** (les 5 skills, `design.md`).
5. **États** : loading / vide / erreur.
6. **Tests** (les critères d'acceptation).
7. **Passe sécu** (subagents review + scan).
8. **Déploiement**.
9. **Docs / onboarding**.

**Chaque jalon :**
```markdown
- [ ] ## N. <titre>
  - Dépend de : <ids>
  - Livre : <tranche verticale>
  - ✅ Ce que tu vois : <résultat OBSERVABLE dans l'app>
  - Plan : docs/superpowers/plans/NN-<slug>.md
```

Le `✅ Ce que tu vois` est **obligatoire** — c'est l'acceptation visuelle qui garantit un progrès perceptible à chaque étape.

## 2.2 Génération des plans (mode hybride)

Après la Roadmap, `/new-project` propose : « générer tous les plans maintenant ? ». Si oui → pour **chaque** jalon, superpowers:writing-plans produit `docs/superpowers/plans/NN-<slug>.md`. Résultat : **toute la roadmap est pensée/planifiée d'un coup** (« tout est en ligne »).

## 2.3 `/build` — le driver de boucle (nouvelle commande)

`templates/commands/build.md` (rendu comme les 4 autres : Cursor Skill / commande Claude / réf. AGENTS Codex).

**Boucle (un tour = un jalon) :**
1. lit `ROADMAP.md` → 1er jalon non coché dont les dépendances sont cochées ;
2. son plan existe ? sinon → superpowers:writing-plans ;
3. **exécute** via superpowers:subagent-driven-development (TDD + task-review + fix loop) — « ça boucle comme prévu dans le projet » ;
4. **lance l'app** et montre le checkpoint visuel (§2.4) ;
5. **coche** le jalon dans `ROADMAP.md`, met à jour la mémoire (`docs/memory/`) ;
6. **gate hybride** : demande « continuer au jalon suivant ? » — sauf si l'utilisateur a dit « enchaîne tout » (`/build --all` ou langage naturel) → boucle auto jusqu'à roadmap complète, en affichant quand même le visuel + une ligne de progrès à chaque tour.

Le **jalon 0** exécute la Partie 1 (SETUP-AI.md + scaffold) → son visuel = l'app qui **démarre** (page/écran/fenêtre « hello »).

Garde-fous débutant : tranches courtes (visuel fréquent) ; si un run casse → superpowers:systematic-debugging, on ne passe pas au jalon suivant tant que le visuel du jalon courant n'est pas atteint.

## 2.4 Visuel à chaque étape = la vraie app relancée

Pas de dashboard. Après chaque tranche, `/build` lance la cible de run de la stack et pointe l'utilisateur vers le résultat :

| stack | commande run | ce que le débutant voit |
|---|---|---|
| saas | `npm run dev` | page sur `localhost` (screenshot via l'outil preview si dispo) |
| mobile | `npx expo start` | QR → app sur téléphone / simulateur |
| desktop | `npm run start` | fenêtre Electron |

Un `templates/run/<stack>.md` (portable, tous assistants) documente la commande + « ce qu'il faut regarder ». Progrès **aussi textuel** : les cases de `ROADMAP.md` se cochent → la roadmap remplie EST la vue d'ensemble « tout est en ligne ».

## 2.5 Extension `/new-project`

`templates/commands/new-project.md` : après PRD + tech spec + design, ajoute **génération de la ROADMAP exhaustive** (template §2.1) puis propose la génération en lot des plans (§2.2) et enchaîne sur `/build` (§2.3).

---

# Architecture & responsabilités (fichiers)

**Nouveaux :**
- `scripts/lib/mcp.mjs` (+`.test.mjs`) — merge non destructif de config MCP.
- `scripts/lib/hooks.mjs` (+`.test.mjs`) — construit les entrées hooks Cursor / Claude / git depuis les ids du manifeste.
- `scripts/lib/setup-ai.mjs` (+`.test.mjs`) — rend `docs/SETUP-AI.md`.
- `templates/hooks/framework/checks.mjs` — runner de checks défensif, paramétré par stack.
- `templates/hooks/pre-push` — checks sécu/doctor (warn-only, sauf usage CI ultérieur).
- `templates/commands/build.md` — la commande `/build`.
- `templates/run/{saas,mobile,desktop}.md` — cibles de run + « ce que tu vois ».

**Modifiés :**
- `scripts/lib/matrix.mjs` — ajoute `STACKS` + `resolveStackManifest` (existant conservé).
- `scripts/setup.mjs` — câble les nouveaux writers (mcp, hooks, setup-ai) ; ajoute scripts `package.json` si présent.
- `templates/commands/{new-project,doctor}.md` — roadmap+plans+build ; checks santé.
- `playbook/00-START.md` — étape « joue SETUP-AI.md ».
- `stacks/saas/AGENTS.md`, `.claude/skills/stack-saas/SKILL.md`, `templates/env/saas.env.example`, `ai-context/electron/README.md` — corrections §1.6.
- `README.md` — mention « environnement complet par stack + build piloté par roadmap ».

Chaque fichier a une responsabilité unique ; le manifeste (données) est séparé des writers (logique), eux-mêmes séparés du rendu (SETUP-AI). Tout writer est testable en isolation.

# Tests (`node --test`, zéro dépendance)

- `matrix` : `STACKS` a la bonne forme pour les 3 stacks ; `resolveStackManifest` aplatit par assistant ; ids de hooks connus.
- `mcp` : merge ajoute sans écraser l'existant ; idempotent ; gère `.mcp.json` absent.
- `hooks` : génère les bonnes entrées par assistant ; n'écrase pas un `hooks.json` existant ; ids inconnus ignorés.
- `setup-ai` : rend les bonnes commandes plugins/skills/MCP selon (stack, assistant) ; cases `[ ]` pour needsAuth.
- `checks.mjs` : défensif — skip propre si outil/fichier absent ; exit 0 en warn.
- `setup` (intégration, dry-run) : le plan inclut les nouvelles sorties par stack.

# Découpage build

**1 spec (ce document), 2 plans d'implémentation :**
- **Plan 1 — Partie 1** (fondations dont dépend la Partie 2) : manifeste + writers (mcp/hooks/setup-ai) + runner de checks + `/doctor` + corrections repo + tests.
- **Plan 2 — Partie 2** : ROADMAP template + extension `/new-project` + `/build` + cibles de run + tests.

# Non-goals (YAGNI)

- Pas de dashboard / UI de progression (le visuel = la vraie app + cases roadmap).
- Pas d'installation réseau pendant `setup.mjs` (approche A : déclaratif + SETUP-AI joué par l'IA).
- Pas de bascule de stack (ex. Supabase) — hors scope, décision cours.
- `commitlint` volontairement écarté (surcharge débutant).
- Pas de hooks bloquants au-delà du scan secrets (débutant jamais hard-stop).
