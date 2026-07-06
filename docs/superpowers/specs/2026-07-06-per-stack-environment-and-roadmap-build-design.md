# Environnement IA par stack + Catalogue de domaines + Build piloté par la Roadmap — Design

**Date :** 2026-07-06
**Statut :** approuvé (design, en revue) — prêt pour writing-plans
**Langue projet :** français (code, commandes, URLs conservés verbatim)

## Objectif

Trois améliorations liées du Vibecoding Starter Kit, pour qu'un·e débutant·e obtienne un environnement **complet** (framework **et** métier) et **voie son app avancer visuellement** :

1. **Partie 1 — Environnement IA par stack.** Quand l'élève choisit une stack, le projet est préconfiguré avec le **max de capacités framework** : plugins d'assistant, MCP, skills portables, hooks, règles.
2. **Catalogue `domains`.** En plus du framework, un **catalogue de capacités métier vérifiées** (paiement, email, storage, analytics, erreurs, push, caméra, auto-update, licence…) que l'IA **pioche selon le PRD**. C'est la réponse à « pense à tout ce qu'il faut ».
3. **Partie 2 — Build piloté par la Roadmap.** Depuis PRD + tech spec + design, l'IA écrit une **Roadmap exhaustive**, génère les **plans complets**, puis lance un **run en boucle** (subagent-driven) qui met tout en place **fondations d'abord**, avec un **résultat visuel à chaque étape**.

Emboîtement : le **jalon 0** de la Roadmap = l'installation de l'environnement (Partie 1) ; chaque domaine sélectionné = un/des jalons.

## Principes

- **Additif, non destructif.** Rien ne casse. Writers additifs ; MCP mergé ; hooks framework **warn-only** (sauf scan secrets, bloquant).
- **Headless-testable.** `setup.mjs` tourne hors assistant → n'écrit que du **déclaratif** (config MCP, scripts de hooks, règles, scripts npm, catalogues). Actions **interactives** (plugin, `npx skills add`, auth MCP) → listées dans `docs/SETUP-AI.md`, jouées par l'IA.
- **Domaines pilotés par le PRD.** setup.mjs écrit le **catalogue complet** (`docs/DOMAINS.md`) ; `/new-project` **sélectionne** les domaines selon le PRD (mapping mot-clé→domaine), ajoute les jalons et les secrets `.env.example` correspondants. **Pas tout d'un coup** = pas de surcharge débutant.
- **Défensif.** Scripts de check tolèrent projet vide/pré-scaffold → no-op propre.
- **Débutant d'abord.** Warn-only, tranches verticales courtes, un visuel par jalon, `/doctor` = bilan santé. Par domaine : préférer **built-in / Better Auth / composant Convex officiel** ; externe seulement si le PRD le signale.
- **Vérifié.** Toutes les valeurs (commandes, URLs, paquets) issues de la recherche juillet 2026, vérifiées. Pièges/faux-positifs écartés documentés.

---

# Partie 1 — Environnement IA par stack

## 1.1 Modèle de données : `STACKS` (source unique de vérité)

Objet **pur données** dans `scripts/lib/matrix.mjs`, forme identique pour les 3 stacks :

```js
STACKS[stack] = {
  plugins: { 'claude-code':[{name,cmd,why}], cursor:[…], codex:[…] }, // l'IA les installe
  mcp:     { <server>: {command,args}|{transport:'http',url}, needsAuth? },// mergé .mcp.json
  skills:  [{ name, cmd }],                     // portables (npx skills add …)
  hooks:   ['<id>', …],                         // ids → scripts défensifs
  scripts: { <npmScript>: <cmd> },              // package.json
  rules:   [{ label, url }],                    // déjà mirrorés ai-context/
  domains: { <domainId>: { options:[…], default, note } }, // capacités métier (§1.7)
  extras:  ['<note débutant>', …],
}
```

Plus deux tables partagées (§1.7) : `SHARED_DOMAINS` (MCP cross-stack) et `DOMAIN_TRIGGERS` (mot-clé PRD→domaine). `resolveStackManifest(stack, assistant)` résout la vue de l'assistant courant.

## 1.2 Contenu framework vérifié (par stack)

### SaaS — Convex + TanStack Start + Better Auth
- **plugins.claude-code :** `convex` → `/plugin install convex@claude-plugins-official` (bundle MCP + hooks TS + skills + agents).
- **plugins.cursor :** `convex-agent-plugins` → cloner https://github.com/get-convex/convex-agent-plugins (18 règles + 6 skills + 2 agents).
- **plugins.codex :** aucun first-party ; `AGENTS.md` + shadcn MCP `--client codex`.
- **mcp :** `convex` = `npx -y convex@latest mcp start` (déjà) · `better-auth` = http `https://mcp.better-auth.com/mcp` (déjà) · `shadcn` = init `pnpm dlx shadcn@latest mcp init --client <claude|cursor|codex>`.
- **skills :** `npx skills add better-auth/skills` · `npx skills add get-convex/agent-skills --all`.
- **hooks :** `typecheck` (`tsc --noEmit`) · `lint` (`biome check .`) · `convex-dev` (`npx convex dev`, sessionStart, long-running — c'est LE check/codegen Convex) · `auth-generate` (`npx auth generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts`).
- **rules (ai-context/) :** convex_rules `https://convex.link/convex_rules.txt` · TanStack `https://tanstack.com/start/latest/llms.txt` · Better Auth `https://better-auth.com/llms.txt` · Convex `https://www.convex.dev/llms.txt` · guide 3-en-1 `https://labs.convex.dev/better-auth/framework-guides/tanstack-start`.
- **extras :** secrets auth via `npx convex env set …` (dans Convex, pas `.env`) · `.env.local` = `CONVEX_DEPLOYMENT`,`VITE_CONVEX_URL`,`VITE_CONVEX_SITE_URL`,`VITE_SITE_URL` · pin `better-auth@~1.6.15` · `convex/seed.ts` · `npx convex dashboard`.

### Mobile — React Native (Expo) + Convex
- **plugins.claude-code :** `expo` → `claude plugin install expo@claude-plugins-official` · `convex` → `/plugin install convex@claude-plugins-official`.
- **plugins.codex :** `codex plugin add expo@openai-curated` ; MCP `codex mcp add expo --url https://mcp.expo.dev/mcp`.
- **mcp :** `expo` = http `https://mcp.expo.dev/mcp` (**needsAuth**, `claude mcp add --transport http expo https://mcp.expo.dev/mcp`) · `convex`.
- **skills :** `npx skills add expo/skills` · `npx skills add get-convex/agent-skills --all` · `npx convex ai-files install`.
- **hooks :** `deps-check` (`npx expo install --check`) · `doctor` (`npx expo-doctor`) · `typecheck` (`tsc --noEmit`) · `lint` (`npx expo lint`) · `convex-dev` (`npx convex dev --once`, sessionStart).
- **rules :** Expo `https://docs.expo.dev/llms.txt` (+`llms-full.txt`) · RN `https://reactnative.dev/llms.txt` · convex_rules · hub `https://docs.expo.dev/agents.md`.
- **simulateur/appareil (skills `expo-dev-client`, `eas-simulator`) :** iOS = Xcode + `npx expo start` → `i` (ou `npx expo run:ios`) ; Android = Android Studio+AVD + `a` (ou `npx expo run:android`) ; physique = Expo Go + QR ; **piège** « marche dans Expo Go pas en build » → `expo-dev-client` + `expo start --dev-client`.
- **extras :** typed routes · dev client · EAS · OTA (`eas update`) · `app.config.ts` + `EXPO_PUBLIC_*`.

### Desktop — Electron
- **plugins.claude-code :** `electron` → `claude plugin marketplace add ohvignas/claude-electron-skills` puis `claude plugin install electron@claude-electron-skills` (14 skills + 8 commands, secure-by-default). Repo maison.
- **plugins.cursor :** awesome-cursorrules Electron/TS (fit faible).
- **mcp :** `chrome-devtools` = `npx chrome-devtools-mcp@latest --browser-url=http://127.0.0.1:9222` (debug renderer ; lancer l'app `--remote-debugging-port=9222`). Pas de MCP Electron officiel.
- **skills :** couverts par le plugin.
- **hooks :** `typecheck` (`tsc --noEmit`) · `lint` (`biome check .`) · `security` (`npx @doyensec/electronegativity -i .`, **pre-push+CI**) · `package-check` (`npm run make`/`electron-builder --dir`, CI) · `husky init`.
- **rules :** checklist sécu `https://www.electronjs.org/docs/latest/tutorial/security` · docs `https://www.electronjs.org/docs/latest` · Forge `https://www.electronforge.io` · `https://github.com/sindresorhus/awesome-electron`.
- **extras :** template Forge Vite+TS (`npx create-electron-app@latest my-app --template=vite-typescript`) · `@electron/fuses` · webPreferences sûrs + CSP · signature code = **payant** (Apple $99/an ; Windows EV ~$250–500/an) → débutant : non-signé + documenter l'avertissement.
- **écartés :** MCP Electron officiel (inexistant) · `llms.txt` Electron (404) · `@electron/lint-roller` (linter docs, pas sécu).

### Partagé — Design (déjà dans le kit)
5 skills : `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `shadcnblocks`, `brand-guidelines` — dans la règle design + rappelés dans SETUP-AI.md.

## 1.3 Ce que le moteur écrit (headless)

| Sortie | Mécanisme | Fichier lib |
|---|---|---|
| `.mcp.json` / `.cursor/mcp.json` | **merge** non destructif de `manifest.mcp` (base stack ; les MCP de domaine sont ajoutés à la sélection PRD, pas d'office) | `scripts/lib/mcp.mjs` (+test) |
| Hooks **Cursor** | étend `.cursor/hooks.json` : `afterFileEdit` → runner checks (warn) ; garde `sessionStart` inject-memory | `scripts/lib/hooks.mjs` (+test) |
| Hooks **Claude Code** | génère `.claude/settings.json` : `PostToolUse` (`Edit|Write`) → runner checks (warn). Mémoire déjà via `@docs/memory/index.md` → **pas** de hook mémoire (évite doublon) | idem |
| Hooks **git** | étend `.githooks/pre-commit` (typecheck+lint tolérants) + nouveau `.githooks/pre-push` (checks sécu/doctor) | `templates/hooks/` |
| Scripts de check | `templates/hooks/framework/checks.mjs` **défensif**, paramétré par stack | nouveau dossier |
| Scripts `package.json` | ajoutés si `package.json` existe ; sinon notés dans SETUP-AI | `setup.mjs` |
| `docs/SETUP-AI.md` | rendu depuis le manifeste (plugins + skills + MCP-auth) | `scripts/lib/setup-ai.mjs` (+test) |
| `docs/DOMAINS.md` | rendu du catalogue de domaines de la stack (§1.7) | `scripts/lib/domains.mjs` (+test) |

**Politique blocage :** `templates/hooks/pre-commit` scan secrets = **bloquant** (inchangé). Checks framework = **warn-only**. `/doctor` = bilan.

**Runner `templates/hooks/framework/checks.mjs`** — un script défensif : reçoit une liste d'ids (`typecheck`,`lint`,`deps-check`,`doctor`,`security`…) ; pour chaque, vérifie présence outil/fichier → skip si absent ; agrège les warnings ; **exit 0** (mode `--strict` CI plus tard, hors scope).

## 1.4 `docs/SETUP-AI.md` (joué par l'IA au 1er install)

Par stack **et** assistant. Checklist exécutable : `## Plugins`, `## Skills portables`, `## MCP à autoriser` (déjà dans `.mcp.json` → `/mcp` ; needsAuth → login), `## Design (5 skills)`, `## Scripts package.json`. `playbook/00-START.md` gagne l'étape « joue `docs/SETUP-AI.md` ». Le rapport final de `setup.mjs` y pointe.

## 1.5 `/doctor` étendu

Vérifie en plus : `.mcp.json` contient les serveurs stack (✓/✗) ; hooks câblés (`hooks.json`/`.claude/settings.json`/`.githooks/pre-push`) ; scripts `package.json` (`typecheck`,`lint`) ; cases `[ ]` restantes dans SETUP-AI ; (desktop) `@doyensec/electronegativity` dispo ; domaines sélectionnés : leurs secrets présents dans `.env.example`.

## 1.6 Corrections repo (recherche)

| Fichier | Correction |
|---|---|
| `.claude/skills/stack-saas/SKILL.md`, `stacks/saas/AGENTS.md` | Better Auth CLI = `npx auth generate` (pas `@better-auth/cli generate`) ; secrets auth via `npx convex env set` ; garder pin `~1.6.x` |
| `templates/env/saas.env.example` | ajouter `VITE_CONVEX_SITE_URL`, `VITE_SITE_URL` ; « secrets auth → Convex » |
| `ai-context/electron/README.md` | acter : pas de `llms.txt` Electron ; pointer la checklist sécu |

## 1.7 Catalogue `domains` (capacités métier)

### a) `SHARED_DOMAINS` — MCP cross-stack (vérifiés, officiels)

| domaine | MCP | install | coût/auth |
|---|---|---|---|
| payment | Stripe | remote `https://mcp.stripe.com` (OAuth) · local `npx -y @stripe/mcp --tools=all --api-key=…` | compte Stripe |
| email | Resend | remote `https://mcp.resend.com` (OAuth) · local `npx -y resend-mcp` (RESEND_API_KEY) | tier gratuit |
| analytics | PostHog | `https://mcp.posthog.com/mcp` (EU `mcp-eu…`) | clé projet |
| error-tracking | Sentry | `https://mcp.sentry.dev/mcp` (OAuth) | compte |
| docs | Context7 | `npx -y @upstash/context7-mcp` | gratuit |
| repo | GitHub | remote `https://api.githubcopilot.com/mcp/` (OAuth/Copilot) · local `github/github-mcp-server` (PAT) | compte |
| e2e | Playwright (web) · chrome-devtools (electron) | `npx @playwright/mcp@latest` | gratuit |

### b) Per-stack `domains` — paquets d'implémentation (verbatim vérifiés)

**SaaS :**
- **payment** (choix PRD, défaut `@better-auth/stripe`) : `@better-auth/stripe` (couplé auth) · `@convex-dev/stripe` (Convex-natif) · Polar `@polar-sh/better-auth` / `@convex-dev/polar` (merchant-of-record, gère TVA) · Autumn `@useautumn/convex` (usage/crédits). Webhooks secrets → env Convex.
- **email** : `@convex-dev/resend` + `@react-email/components`.
- **storage** : Convex File Storage (built-in, défaut) · UploadThing · `@convex-dev/r2`.
- **analytics** : `posthog-js` · **error** : `@sentry/react` · **jobs** : Convex Scheduler + `convex/crons.ts` (built-in) → `@convex-dev/workpool`/`workflow` si lourd · **search** : Convex `searchIndex` (built-in) · Algolia + `algolia/mcp`.

**Mobile :**
- **payment** : `@stripe/stripe-react-native` (physique/service) · **IAP digital** RevenueCat `react-native-purchases` (+ `react-native-purchases-ui`). **Règle** : Apple/Google **imposent** l'IAP pour le digital consommé dans l'app ; Stripe autorisé pour biens/services réels. `expo-in-app-purchases` **déprécié** (écarté).
- **push** : `expo-notifications` · **camera/media** : `expo-camera` · `expo-image-picker` · **maps/location** : `react-native-maps` + `expo-location` · **analytics** : `posthog-react-native` · **error** : `@sentry/react-native` · **auth** : `better-auth`+`@better-auth/expo`+`expo-secure-store` (guide Convex `https://labs.convex.dev/better-auth/framework-guides/expo`). La plupart des natifs → **dev build** requis (pas Expo Go).

**Desktop :**
- **payment/licence** : Stripe Checkout via `shell.openExternal` + **backend** (jamais la clé secrète dans l'app) · licence **Keygen** (`https://keygen.sh/integrate/electron/`) · offline `secure-electron-license-keys`.
- **auto-update** : `update-electron-app` (feed gratuit `update.electronjs.org` ; macOS exige signature) · `electron-updater` si feed self-host.
- **persistence** : `electron-store` (réglages) · `better-sqlite3` (SQL local ; **native module** → `@electron/rebuild`, skill `electron:native-node-modules`).
- **native-ui/système** : skills `electron:native-ui` (Notification/Tray/Menu) · `electron:system-integration` (globalShortcut/deep-link) · `electron:app-lifecycle`.
- **error** : `@sentry/electron`.

### c) `DOMAIN_TRIGGERS` — mot-clé PRD (FR) → domaine

`abonnement|premium|forfait|paywall|faire payer|checkout` → **payment** · `réservation payante|acheter|panier|commande` → **payment** (one-time) · (mobile) `débloquer|achat in-app|crédits` → **IAP** · `email|mail|magic link|reset` → **email** · `upload|fichier|image|avatar|PDF` → **storage** · `statistiques|analytics|funnel|feature flag|A/B` → **analytics** · `erreur|crash|monitoring|ça plante` → **error-tracking** · `cron|tous les jours|rappel|relance|en arrière-plan` → **jobs** · `recherche|filtrer|autocomplétion|catalogue` → **search** · `notification|push|alerte` → **push** · `photo|caméra|scanner` → **camera** · `carte|localisation|GPS|à proximité` → **maps** · `mise à jour|auto-update` → **auto-update** · `licence|activation|clé` → **licensing** · `base locale|offline|réglages` → **persistence**.

### d) Rendu & sélection

`setup.mjs` génère **`docs/DOMAINS.md`** = catalogue de la stack (domaine → options + quand l'utiliser + install + secrets + coût). L'agent **n'invente pas**, il pioche là. `/new-project` (§2.5) lit **PRD + DOMAINS.md**, applique `DOMAIN_TRIGGERS`, **sélectionne** les domaines, ajoute leurs **jalons** à la Roadmap, et **append** leurs placeholders de secrets à `.env.example` + leurs commandes à `SETUP-AI.md`. Règle : préférer built-in/Better Auth/composant Convex ; externe si le PRD le signale.

---

# Partie 2 — Build piloté par la Roadmap

## 2.1 `docs/ROADMAP.md` — exhaustif, visuel, fondations d'abord

Généré par `/new-project` depuis PRD + tech spec + design. Template **forçant à penser à tout** (checklist de dimensions) :
0. **Fondations** — env Partie 1 installé (SETUP-AI joué) + scaffold framework + 1er boot.
1. Modèle de données · 2. Auth · 3. **Chaque feature du PRD** (1 jalon = 1 tranche verticale) · 4. **Domaines sélectionnés** (§1.7d — paiement, email… selon PRD) · 5. Passe UI/design · 6. États (loading/vide/erreur) · 7. Tests · 8. Passe sécu · 9. Déploiement · 10. Docs.

**Chaque jalon :**
```markdown
- [ ] ## N. <titre>
  - Dépend de : <ids>
  - Livre : <tranche verticale>
  - ✅ Ce que tu vois : <résultat OBSERVABLE dans l'app>
  - Plan : docs/superpowers/plans/NN-<slug>.md
```
`✅ Ce que tu vois` **obligatoire** = acceptation visuelle → progrès perceptible à chaque étape.

## 2.2 Génération des plans (hybride)

Après la Roadmap, `/new-project` propose « générer tous les plans ? ». Si oui → pour **chaque** jalon, superpowers:writing-plans produit `docs/superpowers/plans/NN-<slug>.md`. Toute la roadmap est **pensée d'un coup** (« tout est en ligne »).

## 2.3 `/build` — driver de boucle (nouvelle commande)

`templates/commands/build.md` (rendu comme les 4 autres). **Un tour = un jalon :**
1. lit `ROADMAP.md` → 1er jalon non coché aux dépendances satisfaites ;
2. plan existe ? sinon → writing-plans ;
3. **exécute** via superpowers:subagent-driven-development (TDD + review + fix loop) — « ça boucle comme prévu » ;
4. **lance l'app** → checkpoint visuel (§2.4) ;
5. **coche** le jalon dans `ROADMAP.md`, met à jour `docs/memory/` ;
6. **gate hybride** : « continuer ? » — sauf `--all`/« enchaîne tout » → boucle auto jusqu'à la fin (visuel + ligne de progrès à chaque tour).

Jalon 0 = Partie 1 (SETUP-AI + scaffold) → visuel = app qui **démarre**. Garde-fou : run cassé → superpowers:systematic-debugging ; on ne passe pas au suivant tant que le visuel du jalon courant n'est pas atteint.

## 2.4 Visuel = la vraie app relancée (pas de dashboard)

| stack | run | ce que le débutant voit |
|---|---|---|
| saas | `npm run dev` | page sur `localhost` (screenshot via preview si dispo) |
| mobile | `npx expo start` → `i`/`a` | app sur simulateur iOS / émulateur Android / tel (QR) |
| desktop | `npm run start` | fenêtre Electron |

`templates/run/<stack>.md` (portable) documente la commande + « ce qu'il faut regarder ». Progrès **aussi textuel** : les cases `ROADMAP.md` se cochent.

## 2.5 Extension `/new-project`

`templates/commands/new-project.md` : après PRD + tech spec + design → **sélection des domaines** (PRD + `DOMAINS.md` + `DOMAIN_TRIGGERS`) → **ROADMAP exhaustive** (jalons features + domaines) → append secrets `.env.example` + commandes `SETUP-AI.md` → propose génération en lot des plans (§2.2) → enchaîne `/build`.

---

# Persistance & anti-oubli (« où l'agent regarde à chaque fois »)

- **`docs/ROADMAP.md`** = source unique de l'avancement. `/build` le **relit au début de chaque tour**. Cases cochées = fait. Rien n'est oublié car rien n'est en mémoire volatile.
- **`docs/DOMAINS.md`** = source unique des capacités. L'agent pioche, n'invente pas.
- **`docs/memory/`** = injecté à **chaque** sessionStart (hook Cursor) / `@import` (Claude) → décisions + pièges.
- **Amélioration `inject-memory.mjs`** : injecte AUSSI le **prochain jalon roadmap** (parse la 1re case `[ ]` de `ROADMAP.md`) → dès l'ouverture d'une session, l'agent sait où il en est.
- **`AGENTS.md`/`CLAUDE.md`** pointe ROADMAP + **DOMAINS** + memory (ajouter DOMAINS à la liste « Docs du projet »).
- **Commit** : `.githooks/pre-commit` à **chaque** commit (secrets **bloquant** + typecheck/lint warn). `/build` coche le jalon puis commit → progrès tracé dans git. `pre-push` = checks lourds (sécu Electron, expo-doctor).

---

# Architecture & responsabilités (fichiers)

**Nouveaux :**
- `scripts/lib/mcp.mjs` (+test) — merge MCP non destructif.
- `scripts/lib/hooks.mjs` (+test) — entrées hooks Cursor/Claude/git depuis les ids.
- `scripts/lib/setup-ai.mjs` (+test) — rend `docs/SETUP-AI.md`.
- `scripts/lib/domains.mjs` (+test) — `SHARED_DOMAINS`, `DOMAIN_TRIGGERS`, rend `docs/DOMAINS.md`.
- `templates/hooks/framework/checks.mjs` — runner défensif.
- `templates/hooks/pre-push` — checks sécu/doctor (warn-only).
- `templates/commands/build.md` — `/build`.
- `templates/run/{saas,mobile,desktop}.md` — cibles de run + « ce que tu vois ».

**Modifiés :**
- `scripts/lib/matrix.mjs` — `STACKS` (+ `domains`) + `resolveStackManifest`.
- `scripts/setup.mjs` — câble mcp/hooks/setup-ai/domains ; scripts `package.json` si présent.
- `templates/cursor/hooks/inject-memory.mjs` — injecte aussi le prochain jalon roadmap.
- `templates/commands/{new-project,doctor}.md` — sélection domaines + roadmap+plans+build ; santé.
- `playbook/00-START.md` — étape « joue SETUP-AI.md ».
- corrections §1.6 · `README.md` — mention env complet + domaines + build roadmap.

Manifeste (données) séparé des writers (logique) et du rendu (setup-ai/domains). Tout writer testable en isolation.

# Tests (`node --test`, zéro dépendance)

- `matrix` : forme `STACKS` (3 stacks) + `domains` ; `resolveStackManifest` aplatit par assistant ; ids hooks connus.
- `mcp` : merge ajoute sans écraser ; idempotent ; `.mcp.json` absent géré.
- `hooks` : bonnes entrées par assistant ; n'écrase pas l'existant ; ids inconnus ignorés.
- `setup-ai` : bonnes commandes selon (stack, assistant) ; cases `[ ]` needsAuth.
- `domains` : `DOMAIN_TRIGGERS` matche les mots-clés attendus ; `DOMAINS.md` liste les options par stack ; défauts corrects.
- `checks.mjs` : défensif — skip propre si absent ; exit 0.
- `setup` (dry-run) : plan inclut les nouvelles sorties par stack.

# Découpage build — 1 spec, 3 plans

- **Plan 1 — Partie 1 (fondations)** : `STACKS` framework + writers (mcp/hooks/setup-ai) + runner checks + `/doctor` + corrections repo + tests.
- **Plan 2 — Catalogue domaines** : `domains.mjs` (`SHARED_DOMAINS`/`DOMAIN_TRIGGERS`) + `domains` dans `STACKS` + rendu `DOMAINS.md` + append secrets + tests.
- **Plan 3 — Partie 2 (build)** : ROADMAP template + sélection domaines dans `/new-project` + `/build` + cibles run + inject-memory (jalon) + tests.

(Plan 2 dépend de Plan 1 ; Plan 3 dépend de 1+2.)

# Non-goals (YAGNI)

- Pas de dashboard/UI de progression (visuel = vraie app + cases roadmap).
- Pas d'install réseau pendant `setup.mjs` (déclaratif + SETUP-AI joué par l'IA).
- Pas de bascule de stack (Supabase, Lemon Squeezy…) — hors scope.
- `commitlint` écarté (surcharge débutant).
- Domaines **non** chargés d'office — uniquement si le PRD les signale.
- Pas de hooks bloquants au-delà du scan secrets.
