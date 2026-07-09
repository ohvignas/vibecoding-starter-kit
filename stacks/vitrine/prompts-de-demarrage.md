# Prompts de démarrage — Site vitrine (Astro + shadcn + Keystatic)

## 1. Setup (premier prompt)
> Crée le projet : `npx shadcn@latest init --preset <MON_CODE> --template astro` (mon preset vient de ui.shadcn.com/create). Ajoute ensuite Keystatic (`npx astro add react markdoc`, puis `@keystatic/core @keystatic/astro`) avec storage local. Vérifie que `npm run dev` marche et que `/keystatic` s'ouvre. Ne code rien d'autre.

## 2. Une page depuis la maquette
> Réalise la page « <nom> » de `maquette/<ecran>.html` en `.astro` : structure statique, composants shadcn pour l'UI, et UNIQUEMENT le <composant interactif> en îlot (`client:visible`, un seul .tsx). Ajoute le `<SEO />` (title, description, OG) et le JSON-LD adapté.

## 3. Contenu éditable (CMS)
> Transforme la section « <nom> » en collection Keystatic (`keystatic.config.ts`) branchée sur une content collection Astro. Montre-moi comment l'éditer sur /keystatic sans toucher au code.

## 4. Audit SEO/GEO
> Passe le site au crible SEO/GEO : sitemap OK, robots.txt (crawlers IA autorisés), meta/OG/canonical par page, JSON-LD par type, `public/llms.txt` à jour, images en astro:assets, Lighthouse ≥ 95. Liste ce qui manque puis corrige.
