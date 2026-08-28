# 07 — Scaffold

> Étape 07/08 de `/new-project` — mise en place du projet. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Mise en place du projet
1. Scaffold la stack choisie, **avec le preset shadcn** noté à l'étape `05-design-maquette.md` :
   - **vitrine** — **deux applications sous une seule racine, et l'ordre est une contrainte, pas une suggestion** : d'abord `site/` (Astro, les pages publiques), puis `dashboard/` (TanStack Start + Convex + Better Auth, la saisie du contenu), et **la racine en DERNIER**.
     ⚠️ **Pourquoi l'ordre**, mesuré sur `npm run typecheck --workspaces` (les scripts de la racine ratissent les deux applications, **sans `--if-present`**, délibérément) : tant qu'aucune application n'existe → `npm error No workspaces found!`, **exit 1** ; dès qu'une application existe sans son script → `npm error Missing script: "typecheck"`, **exit 1**. Dans les deux cas le hook `onEdit` affiche « ⚠ check typecheck : problème détecté » à **chaque écriture de fichier**. Et le cas intermédiaire est le pire parce qu'il est MUET : racine + `site/` seul, `dashboard/` déclaré mais pas encore là → **exit 0, sans un mot**, la moitié du projet jamais vérifiée. Pose donc la racine quand les deux applications sont là.
     1. **`site/`** : `npx shadcn@latest init --template astro --base base --no-monorepo --preset <code> --name site --yes` — crée l'app Astro complète, avec le thème, dans `site/`.
        ⚠️ **Les 5 drapeaux sont obligatoires** : sans eux `init` pose 4 questions (monorepo · bibliothèque · preset · nom), 3 aux flèches — `--yes` n'en saute aucune et **une IA reste bloquée sans erreur**. Pas de preset à l'étape `05-design-maquette.md` → `--preset nova`. **`--name` crée un SOUS-DOSSIER**, et ici c'est voulu : l'app Astro et son `package.json` vivent dans `site/`, `npm run dev` se lance **de là**.
     2. **`dashboard/`** : `npm create convex@latest dashboard -- -t tanstack-start` — crée l'app TanStack Start + Convex dans `dashboard/`. ⚠️ **Le `-t` est obligatoire** : sans lui, `create-convex` s'arrête sur un sélecteur aux flèches et une IA reste bloquée (même piège que la stack saas). Le template **n'inclut aucune auth** (`convex/` sort avec `schema.ts` + `myFunctions.ts`) : Better Auth s'ajoute juste après.
     3. **Better Auth — dans `dashboard/`, et nulle part ailleurs** : suis le guide officiel **TanStack Start** → https://labs.convex.dev/better-auth/framework-guides/tanstack-start. ⚠️ **N'invente pas la commande d'install** : le composant `@convex-dev/better-auth` épingle une version précise de `better-auth` (ex. `~1.6.x`) — installe **celle que ce guide indique**, jamais `better-auth@latest`. Il n'existe **aucun** guide Astro, et le site public n'en a pas besoin : il lit Convex **au build**, sans session.
     4. **La boucle de publication — décide-la MAINTENANT, pas au déploiement.** Le contenu vit dans Convex et les pages publiques le lisent au build : sans boucle, ce que le client publie n'atteint jamais le site en ligne. Deux modèles, et le README du projet doit dire lequel : **modèle 1** — tout prérendu, on reconstruit tout le site à chaque publication ; **modèle 2** — les routes CMS passent en SSR avec un **cache par tag**, et publier **purge la page concernée** sans rien reconstruire. Le critère : une page dont le contenu vient du CMS et peut changer **sans redéploiement** → SSR ; une page dont le contenu vit dans le code → prérendue. **Prends le modèle 2 dès que quelqu'un d'autre que toi écrira du contenu.**
        ⛔ **Ne recopie aucun code d'ailleurs** : construis les quatre pièces avec l'utilisateur, une à la fois, en interrogeant le **MCP astro-docs** pour l'API Cache d'Astro 7 (elle y est stable, et le kit n'en livre pas d'exemple).
        - **`site/astro.config.mjs`** : garder `output: "static"`, ajouter l'adaptateur **`@astrojs/node`** en `standalone` (il sert les pages prérendues **et** exécute les routes qui font l'opt-out, depuis le même conteneur), déclarer le fournisseur de cache **`memoryCache()`** et les **`routeRules`** de la ou des routes CMS. ⚠️ `routeRules` ne donne que des **indices** de cache par motif ; l'opt-out, lui, s'écrit **`export const prerender = false` dans la route elle-même**, jamais comme une absence d'entrée ici.
        - **La route CMS** (`site/src/pages/[...slug].astro` ou l'équivalent) : `export const prerender = false`, puis un `Astro.cache.set({ maxAge, swr, tags })` qui pose **son tag à elle** — `page:<slug>` — **en plus** du tag de route (`pages`). Sans le tag par page, publier une page purge **toutes** les pages en cache. Et sur la branche « page introuvable » : statut 404 + **`Astro.cache.set(false)`**, un 404 ne se cache jamais.
        - **`site/src/pages/api/revalidate.ts`** : `POST` seulement (n'exporte ni `GET` ni `ALL`), `export const prerender = false`, `cache.set(false)` en première instruction, secret partagé d'**au moins 32 caractères** lu **dans le handler** et comparé **haché des deux côtés** puis `timingSafeEqual`, corps **refusé** (400) plutôt que coercé en liste vide, et enfin `cache.invalidate({ tags })`.
        - **Dans `dashboard/convex/`** : une table d'**outbox** écrite dans la **même mutation** que la publication (elles commitent ensemble, ou pas du tout), et une action **`drain`** qui POSTe sur `/api/revalidate` avec des ré-essais espacés et un état terminal. Un `fetch` direct depuis la mutation serait perdu **sans trace** si le site redémarrait à cet instant.
        - 🔴 **Dis-le à l'utilisateur avant qu'il déploie** : `memoryCache()` est **par processus**. Une purge n'atteint que l'instance qui a reçu l'appel HTTP — donc **une seule réplique** du site, ou un fournisseur de cache **partagé** (Redis) **avant** d'en lancer une deuxième. À deux conteneurs, une publication sur deux ne se voit pas, et aucun message ne le dit.

     5. **Les quatre scripts — ils EXISTENT DÉJÀ. Vérifie-les, n'en réécris aucun.** ⚠️ Mesuré sur un scaffold réel : les deux templates posent `typecheck` **et** `lint`, et ils installent **eslint** avec sa config (`site/eslint.config.js`, `dashboard/eslint.config.mjs`). ⛔ **Ne remplace pas ces `lint` par un autre outil** : aucun des deux templates n'installe biome, et `npx @biomejs/biome init` écrit la config **sans rien installer**. Mesuré : `npm run lint` sort alors **127** (`sh: biome: command not found`) dans les DEUX workspaces — la CI meurt à son 2ᵉ pas, et le pre-commit affiche « ⚠ check lint : problème détecté » sur du code qui n'a aucun défaut.

        ```json
        // site/package.json (extrait) — POSÉ PAR LE TEMPLATE : vérifie, ne remplace pas
        { "scripts": { "typecheck": "astro check", "lint": "eslint ." } }
        ```

        ```json
        // dashboard/package.json (extrait) — POSÉ PAR LE TEMPLATE : vérifie, ne remplace pas
        { "scripts": { "typecheck": "tsc --noEmit", "lint": "npm run typecheck && eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0" } }
        ```
        ⚠️ **`astro check` n'est pas `tsc`** : `tsc --noEmit` ne lit AUCUN `.astro` et sortirait vert sans rien vérifier. Si l'un des quatre manque, ajoute-le : la racine les appelle **sans `--if-present`**, donc une application sans son script fait échouer la commande de la racine en la nommant.

     6. **UNE correction obligatoire dans `site/`**, sinon `npm run lint` est **rouge dès le premier jour**. Mesuré : `site/src/components/ui/button.tsx` — écrit par `shadcn init` — viole la config eslint écrite par `shadcn init` (`react-refresh/only-export-components` : le fichier exporte `Button` **et** `buttonVariants`). Ajoute cette entrée **à la fin** du tableau de `site/eslint.config.js`, juste avant le `])` :

        ```js
        // site/eslint.config.js — à COMPLÉTER (dernière entrée du tableau), jamais à remplacer
        {
          files: ["src/components/ui/**"],
          rules: { "react-refresh/only-export-components": "off" },
        },
        ```
        L'exception vise le **dossier**, pas le fichier : `src/components/ui/` est regénéré à chaque `npx shadcn add`, et chacun de ses composants exporte ses variantes à côté de lui. Le Fast Refresh ne concerne que les îlots React, jamais les pages Astro.

     7. **La racine, en dernier** — **un seul fichier**, puis `npm install` à la racine.

        ```json
        // package.json — à la racine, au-dessus des deux applications
        {
          "name": "<nom-du-projet>", "private": true,
          "workspaces": ["site", "dashboard"],
          "scripts": {
            "typecheck": "npm run typecheck --workspaces",
            "lint": "npm run lint --workspaces",
            "build": "npm run build --workspaces"
          }
        }
        ```
        ⚠️ **C'est ce fichier qui fait exister les contrôles** : le hook du kit lit le `package.json` du dossier COURANT et lance le SCRIPT qu'il y trouve. Sans lui, il retombe sur `npx tsc --noEmit` à la racine — qui n'entre dans aucun des deux workspaces et ne lit aucun `.astro` : vert, sans rien avoir vérifié.
        ⛔ **Ne pose ni `tsconfig.json` ni `biome.json` à la racine.** Aucun des deux n'est lu : la racine ne compile rien (chaque application a le sien) et aucun scaffold n'installe biome. Ce qui fait tourner les checks, c'est le script — pas un fichier de config posé pour faire joli.

   - **saas** : `npm create convex@latest <nom> -- -t tanstack-start` — ⚠️ **le `-t` est obligatoire** : sans lui, `create-convex` s'arrête sur un sélecteur aux flèches et une IA reste bloquée. Le template **n'inclut aucune auth** (`convex/` sort avec `schema.ts` + `myFunctions.ts`) : Better Auth s'ajoute ensuite. Puis, **dans le projet** : `npx shadcn@latest init --base base --no-monorepo --yes`, puis applique le thème (ci-dessous).
   - **desktop** : `npx create-electron-app@latest <nom> --template=vite-typescript`. ⚠️ **Forge n'a pas de template React** (ses 5 templates : `base`, `vite`, `vite-typescript`, `webpack`, `webpack-typescript`) — le projet sort **sans React**. Ajoute-le avant shadcn, qui en dépend : `npm i react react-dom` puis `npm i -D @vitejs/plugin-react@^4 @types/react @types/react-dom`. ⚠️ **La `^4` est obligatoire** : la v6 exige `vite@^8` alors que Forge livre `vite@5` (`ERESOLVE`), et la v5 est **ESM-only** alors que la config vite de Forge est chargée en `require`. Seule la v4 est dual-format. Branche `react()` dans `vite.renderer.config.ts`, renomme `src/renderer.ts` en `.tsx`, ajoute `<div id="root">` à `index.html` et monte un `createRoot`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`.
   - **mobile** : `npx create-expo-app@latest <nom> --yes`, puis **NativeWind** (pas de shadcn en React Native) : `npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context` — `expo install` choisit les versions compatibles de ton SDK, `npm i` ne le fait pas. Config officielle : [nativewind.dev](https://www.nativewind.dev/getting-started/installation).
2. **Applique le thème de l'étape `05-design-maquette.md`** — sur un projet **déjà créé**, ce n'est pas `init` mais : `npx shadcn@latest apply --preset <code> --yes` (`--only theme` ou `--only font` pour n'en prendre qu'une partie). Pour la vitrine, `init --preset` l'a déjà fait à la création.
3. **Prends les écrans tout faits avant d'en coder un.** Le registry **officiel** livre des blocs complets, **sans clé ni registry à déclarer** : `npx shadcn@latest add dashboard-01` · `login-01..05` · `signup-01..05` · `sidebar-01..12`. Ils **héritent du preset** appliqué à l'étape 2 — c'est la chaîne : thème → bloc → écran déjà à ta charte. Liste complète : `npx shadcn@latest search @shadcn -q <mot>`, et `npx shadcn@latest view <bloc>` pour regarder avant d'installer.
   ⚠️ **Sur la vitrine, lance ces commandes DEPUIS le dossier concerné** : `shadcn` écrit là où il trouve `components.json`, et seul `site/` en a un. Un `login-01` installé à la racine ou dans `site/` atterrit du mauvais côté — l'écran de connexion appartient au `dashboard/`, qui est la seule application à avoir une session.
   Blocs **shadcnblocks.com** (tiers, plus de choix) : ajoute d'abord le registry à **`components.json`** (fusionne, n'écrase pas) — `{ "registries": { "@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{name}", "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" } } } }` — puis `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé ; `SHADCNBLOCKS_API_KEY` dans `.env` pour le pro).
4. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, **`docs/A-FAIRE.md`**, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle d'ouvrir **`docs/A-FAIRE.md`** (tout ce qu'il reste à installer : gestes de base + ton projet) et d'utiliser `docs/RUN.md` pour lancer l'app.
5. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive).
