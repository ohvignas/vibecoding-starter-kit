# Détails stack Site vitrine (Astro + TanStack Start + Convex + Better Auth)
Astro 7 : **Node ≥ 22.12** obligatoire (vérifier `node --version` avant tout).
Le projet porte **deux applications sous une seule racine** : `site/` (Astro, les pages publiques) et `dashboard/` (TanStack Start + Convex + Better Auth, la saisie du contenu). Le contenu vit dans Convex et le site le lit **au build** — publier ne suffit pas, il faut reconstruire `site/`.
Après l'install et la validation du PRD, le scaffold se fait **dans cet ordre**, la racine en dernier :
1. `npx shadcn@latest init --template astro --base base --no-monorepo --preset <ton-code> --name site --yes` (le preset se compose sur ui.shadcn.com/create ; les 5 drapeaux sont obligatoires, sinon `init` s'arrête sur des questions aux flèches).
2. `npm create convex@latest dashboard -- -t tanstack-start`, puis Better Auth **dans `dashboard/` uniquement** : https://labs.convex.dev/better-auth/framework-guides/tanstack-start
3. Les scripts `typecheck`/`lint` dans chaque application, puis `package.json` + `tsconfig.json` + `biome.json` à la racine.
Le détail complet, avec les pièges mesurés, est dans `templates/commands/new-project/07-scaffold.md`.
Réfère-toi à `stacks/vitrine/README.md` et `ai-context/astro/` pour les règles. Objectif : SEO + GEO dès le départ.
shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
