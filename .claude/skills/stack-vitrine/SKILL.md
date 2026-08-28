---
name: stack-vitrine
description: Use when building a showcase website / blog with the vibecoding stack Astro (public site) + TanStack Start (dashboard) + Convex + Better Auth. Triggers on "site vitrine", "portfolio", "blog", "landing", "Astro site", "site pour mon entreprise/restaurant/assos", or any content-first website with a private editing dashboard. Loads the correct workflow, official rules, the build-time reading rule, SEO/GEO requirements, and known pitfalls.
---

# Stack Vitrine — Astro 7 + TanStack Start + Convex + Better Auth (SEO/GEO first)

Aide un·e débutant·e à construire un site vitrine/blog **plus son espace de saisie**. Réponds en français, simplement, **une étape à la fois**, et fais valider chaque plan avant de coder.

Le projet porte **deux applications sous une seule racine** : `site/` (Astro, les pages publiques) et `dashboard/` (TanStack Start, la saisie du contenu). Convex porte les données des deux.

## La règle qui commande tout le reste
Les pages publiques lisent Convex **au BUILD** : client serveur `ConvexHttpClient`, dans le frontmatter d'une page `.astro` ou dans `getStaticPaths()`. Le HTML part du serveur déjà rempli.

⛔ **Jamais `useQuery` ni `ConvexProvider` dans une page publique** : le contenu arriverait après le chargement, le HTML servi serait **vide**, et le **JSON-LD** n'aurait plus rien à décrire. Le SEO est la raison d'être de cette stack.
`useQuery` est réservé au `dashboard/` : privé, réactif, jamais indexé.

**Conséquence à dire au débutant dès le premier jour :** publier dans le dashboard ne met le site public à jour **qu'au rebuild**.

## Ordre de construction
0. **Node ≥ 22.12** (`node --version`) — Astro 7 refuse de démarrer en dessous.
1. **`site/`** — `npx shadcn@latest init --template astro --base base --no-monorepo --preset <code> --name site --yes` (le preset vient de ui.shadcn.com/create). Les 5 drapeaux sont obligatoires.
2. **`dashboard/`** — `npm create convex@latest dashboard -- -t tanstack-start` (le `-t` est obligatoire), puis Better Auth via `@convex-dev/better-auth`, guide officiel TanStack Start.
3. **Les quatre scripts** — posés par les templates, à vérifier, pas à réécrire : `astro check` + `eslint .` (`site/`), `tsc --noEmit` + `eslint …` (`dashboard/`). ⛔ Pas biome : aucun scaffold ne l'installe, `npm run lint` sortirait 127. ⚠️ Ajoute `{ files: ["src/components/ui/**"], rules: { "react-refresh/only-export-components": "off" } }` à `site/eslint.config.js`, sinon le lint est rouge sur le code que `shadcn init` écrit.
4. **La racine, en dernier** — un `package.json` (`workspaces: ["site", "dashboard"]` + les scripts qui ratissent les deux). Ni `tsconfig.json` ni `biome.json` : rien ne les lit à la racine.
4. **Schéma Convex** — une table par type de contenu, avec les champs du SEO (slug, titre, description, date).
5. **Pages** depuis la maquette, alimentées par la lecture au build. Le contenu figé (mentions légales) peut rester en content collections, déclarées dans `site/src/content.config.ts` avec leur `loader`.
6. **SEO/GEO** — sitemap + `site/public/robots.txt` (IA autorisées) + `<SEO />`/JSON-LD + `site/public/llms.txt`. ⚠️ Ces fichiers vont dans `site/public/`, **pas à la racine du projet** : posés à la racine, rien ne les sert et le GEO tombe en silence.
7. **Déploiement** — Docker sur un VPS : une image par application, reverse-proxy TLS, Convex en cloud. Le rebuild du site fait partie de la publication : `npm run build --workspace site`, puis la reconstruction de son image sur le VPS.

## Pièges connus
- **L'ordre de création** : les scripts de la racine ratissent les deux applications. Posés avant que `dashboard/` existe, ils échouent à chaque écriture de fichier — et le cas « racine + `site/` seul » sort en 0 **sans un mot**, la moitié du projet jamais vérifiée.
- **`astro check`** : sans ce script dans `site/`, le typecheck retombe sur `tsc --noEmit`, qui ne lit pas les `.astro` et sort vert sans rien vérifier.
- **Îlots** : le contexte React n'est pas partagé — composants shadcn interactifs liés dans UN .tsx. Un îlot public reçoit ses données en props, il ne se connecte pas à Convex.
- Sitemap silencieusement absent si le champ `site` manque dans `site/astro.config.mjs`.
- **Collections** : `getCollection('x')` ne renvoie rien tant que `x` n'est pas déclarée dans `site/src/content.config.ts` avec un `loader`. Depuis Astro 6, un simple dossier ne crée plus de collection.
- **APIs supprimées en Astro 6** : `Astro.glob()` et `<ViewTransitions />` (→ `<ClientRouter />`). Si l'IA les propose, elle raisonne sur Astro 4/5.
- Astro n'a **plus** de llms.txt officiel → MCP `astro-docs` pour la doc.
- **Better Auth** : le composant Convex épingle une version précise de `better-auth`. Ne jamais installer `@latest`.

## Références n°1
- shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
- Convex + Better Auth × TanStack Start : https://labs.convex.dev/better-auth/framework-guides/tanstack-start
- Déployer Astro en Docker : https://docs.astro.build/en/recipes/docker/
