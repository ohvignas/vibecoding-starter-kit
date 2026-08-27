# Prompts de démarrage — Site vitrine (Astro + Convex + Better Auth)

Copie-colle ces prompts **dans l'ordre**, un par un. Chacun suppose que le précédent est fini et que ça marche.

## 1. Setup (premier prompt)
> Crée les deux applications du projet, **dans cet ordre**, et rien d'autre :
> 1. `site/` — `npx shadcn@latest init --template astro --base base --no-monorepo --preset <MON_CODE> --name site --yes` (mon preset vient de ui.shadcn.com/create).
> 2. `dashboard/` — `npm create convex@latest dashboard -- -t tanstack-start`.
>    ⚠️ Puis, dans `site/eslint.config.js`, ajoute en dernière entrée du tableau : `{ files: ["src/components/ui/**"], rules: { "react-refresh/only-export-components": "off" } }` — sans ça, `npm run lint` est rouge dès le premier jour sur le `button.tsx` que `shadcn init` vient d'écrire.
> 3. **Les scripts des DEUX applications** — ils sont **déjà posés par les templates**, vérifie-les seulement : `site/package.json` → `"typecheck": "astro check"` et `"lint": "eslint ."` ; `dashboard/package.json` → `"typecheck": "tsc --noEmit"` et `"lint": "npm run typecheck && eslint …"`. ⛔ Ne remplace aucun de ces `lint` par un autre outil : aucun des deux templates n'installe biome, `npm run lint` sortirait **127** (`command not found`) et le hook accuserait mon code. ⚠️ Et surtout pas `tsc --noEmit` comme typecheck de `site/` : il **ne lit pas les `.astro`** et sort vert sans rien vérifier. Les scripts de la racine les appellent **sans `--if-present`** : une application sans son script fait échouer la commande de la racine, et le hook affiche « ⚠ problème détecté » à chaque écriture de fichier.
> 4. La racine **en dernier** : un `package.json` avec `workspaces: ["site", "dashboard"]` et les scripts `typecheck` / `lint` / `build` qui ratissent les deux. C'est ce fichier qui fait exister les vérifications : sans lui, le hook retombe sur un repli qui n'entre dans aucun des deux dossiers et sort vert. Ne pose ni `tsconfig.json` ni `biome.json` à la racine : rien ne les lit.
>
> Vérifie ensuite que `cd site && npm run dev` répond sur http://localhost:4321, et que `npm run typecheck` **à la racine** passe sur les deux applications. Ne code aucune page.

## 2. La connexion au dashboard
> Ajoute Better Auth **dans `dashboard/` uniquement**, via `@convex-dev/better-auth`, en suivant le guide officiel TanStack Start (https://labs.convex.dev/better-auth/framework-guides/tanstack-start). Installe la version de `better-auth` que ce guide indique, jamais `@latest`. Mets les secrets avec `npx convex env set`. Montre-moi que la page d'accueil du dashboard est inaccessible sans connexion.

## 3. Le contenu dans Convex
> Écris le schéma Convex de « <type de contenu> » dans `dashboard/convex/schema.ts` : les champs métier, plus ceux dont le SEO a besoin (slug, titre, description, date de publication). Ajoute les fonctions de lecture et d'écriture, et un écran de saisie dans le dashboard. Explique-moi ce que chaque champ deviendra sur la page publique.

## 4. Une page publique depuis la maquette
> Réalise la page « <nom> » de `maquette/<ecran>.html` en `.astro` dans `site/` : structure statique, composants shadcn pour l'UI, et UNIQUEMENT le <composant interactif> en îlot (`client:visible`, un seul .tsx). Le contenu vient de Convex, **lu au build** avec `ConvexHttpClient` dans le frontmatter (ou `getStaticPaths()` pour les pages par slug).
>
> ⛔ Jamais `useQuery` ni `ConvexProvider` dans une page publique : le HTML servi serait vide et le JSON-LD n'aurait plus rien à décrire.
> `useQuery` est réservé au `dashboard/`.
>
> Ajoute le `<SEO />` (title, description, OG) et le JSON-LD adapté.

## 5. Audit SEO/GEO
> Passe le site public au crible SEO/GEO : sitemap OK, robots.txt (crawlers IA autorisés), meta/OG/canonical par page, JSON-LD par type, `site/public/llms.txt` à jour (dans `site/public/`, pas à la racine du projet), images en astro:assets, Lighthouse ≥ 95. Vérifie aussi qu'aucune page publique ne charge son contenu depuis le navigateur — coupe le JavaScript et regarde le HTML servi. Liste ce qui manque puis corrige.

## 6. Mise en ligne
> Prépare le déploiement Docker sur mon VPS : une image pour le build statique de `site/`, une pour le serveur de `dashboard/`, un reverse-proxy TLS devant. Liste les variables d'environnement à fournir. Et surtout : explique-moi **comment le site public se rebuild quand je publie**, parce que sans ça mon contenu changera dans Convex sans que personne ne le voie.
