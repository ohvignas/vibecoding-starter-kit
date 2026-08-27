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
     4. **Les scripts de chaque application** — ⚠️ **aucun des deux templates ne les pose**, et la racine les appelle sans `--if-present` : une application sans son script fait échouer la commande de la racine en la nommant. Sans `astro check`, le hook retombe sur `tsc --noEmit`, qui **ne lit pas les `.astro`** et sort vert sans rien vérifier.

        ```json
        // site/package.json (extrait) — à fusionner, ne remplace pas les scripts du template
        { "scripts": { "typecheck": "astro check", "lint": "biome check ." } }
        ```

        ```json
        // dashboard/package.json (extrait) — à fusionner, idem
        { "scripts": { "typecheck": "tsc --noEmit", "lint": "biome check ." } }
        ```

     5. **La racine, en dernier** — les trois fichiers ci-dessous, puis `npm install` à la racine. ⚠️ **Chacun pour sa raison** : le hook lit le `package.json` du dossier COURANT (sans lui, les scripts de la stack ne pilotent plus rien), il exige `tsconfig.json` avant de lancer `typecheck`, et `biome.json` avant de lancer `lint`. S'il en manque un, le check correspondant se saute **en silence** et le pre-commit sort vert sans avoir rien vérifié.

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

        ```json
        // tsconfig.json — il ne compile rien lui-même : chaque application a le sien. Sa raison
        // d'être ici est le check `typecheck`, qui exige sa présence avant de lancer quoi que ce soit.
        { "files": [] }
        ```

        ```json
        // biome.json — exigé par le check `lint`. `npx @biomejs/biome@latest init` écrit ce
        // fichier sans poser une seule question (mesuré, biome 2.5.10) :
        {
          "$schema": "https://biomejs.dev/schemas/2.5.10/schema.json",
          "formatter": { "enabled": true },
          "linter": { "enabled": true, "rules": { "preset": "recommended" } }
        }
        ```
        ℹ️ Un seul `biome.json`, à la racine : lancé depuis `site/` ou `dashboard/`, `biome check .` **remonte** jusqu'à lui (mesuré, biome 2.5.10).

   - **saas** : `npm create convex@latest <nom> -- -t tanstack-start` — ⚠️ **le `-t` est obligatoire** : sans lui, `create-convex` s'arrête sur un sélecteur aux flèches et une IA reste bloquée. Le template **n'inclut aucune auth** (`convex/` sort avec `schema.ts` + `myFunctions.ts`) : Better Auth s'ajoute ensuite. Puis, **dans le projet** : `npx shadcn@latest init --base base --no-monorepo --yes`, puis applique le thème (ci-dessous).
   - **desktop** : `npx create-electron-app@latest <nom> --template=vite-typescript`. ⚠️ **Forge n'a pas de template React** (ses 5 templates : `base`, `vite`, `vite-typescript`, `webpack`, `webpack-typescript`) — le projet sort **sans React**. Ajoute-le avant shadcn, qui en dépend : `npm i react react-dom` puis `npm i -D @vitejs/plugin-react@^4 @types/react @types/react-dom`. ⚠️ **La `^4` est obligatoire** : la v6 exige `vite@^8` alors que Forge livre `vite@5` (`ERESOLVE`), et la v5 est **ESM-only** alors que la config vite de Forge est chargée en `require`. Seule la v4 est dual-format. Branche `react()` dans `vite.renderer.config.ts`, renomme `src/renderer.ts` en `.tsx`, ajoute `<div id="root">` à `index.html` et monte un `createRoot`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`. Ensuite seulement : `npx shadcn@latest init --base base --no-monorepo --yes`.
   - **mobile** : `npx create-expo-app@latest <nom> --yes`, puis **NativeWind** (pas de shadcn en React Native) : `npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context` — `expo install` choisit les versions compatibles de ton SDK, `npm i` ne le fait pas. Config officielle : [nativewind.dev](https://www.nativewind.dev/getting-started/installation).
2. **Applique le thème de l'étape `05-design-maquette.md`** — sur un projet **déjà créé**, ce n'est pas `init` mais : `npx shadcn@latest apply --preset <code> --yes` (`--only theme` ou `--only font` pour n'en prendre qu'une partie). Pour la vitrine, `init --preset` l'a déjà fait à la création.
3. **Prends les écrans tout faits avant d'en coder un.** Le registry **officiel** livre des blocs complets, **sans clé ni registry à déclarer** : `npx shadcn@latest add dashboard-01` · `login-01..05` · `signup-01..05` · `sidebar-01..12`. Ils **héritent du preset** appliqué à l'étape 2 — c'est la chaîne : thème → bloc → écran déjà à ta charte. Liste complète : `npx shadcn@latest search @shadcn -q <mot>`, et `npx shadcn@latest view <bloc>` pour regarder avant d'installer.
   Blocs **shadcnblocks.com** (tiers, plus de choix) : ajoute d'abord le registry à **`components.json`** (fusionne, n'écrase pas) — `{ "registries": { "@shadcnblocks": { "url": "https://www.shadcnblocks.com/r/{name}", "headers": { "Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}" } } } }` — puis `npx shadcn add @shadcnblocks/<bloc>` (gratuits sans clé ; `SHADCNBLOCKS_API_KEY` dans `.env` pour le pro).
4. **Complète** l'`AGENTS.md` existant (déjà généré avec la boucle et la règle design — ne l'écrase pas) : ajoute des liens vers `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DOMAINS.md`, **`docs/A-FAIRE.md`**, `docs/design.md`, la spec architecture, et `docs/memory/`. Rappelle d'ouvrir **`docs/A-FAIRE.md`** (tout ce qu'il reste à installer : gestes de base + ton projet) et d'utiliser `docs/RUN.md` pour lancer l'app.
5. Crée le squelette `docs/memory/` (index + gotchas/conventions/decisions/archive).
