---
name: stack-vitrine
description: Use when building a showcase website / blog with the vibecoding stack Astro + shadcn/ui + Keystatic. Triggers on "site vitrine", "portfolio", "blog", "landing", "Astro site", "site pour mon entreprise/restaurant/assos", or any content-first website for beginners in this course. Loads the correct workflow, official rules, SEO/GEO requirements, and known pitfalls.
---

# Stack Vitrine — Astro + shadcn/ui + Keystatic (SEO/GEO first)

Aide un·e débutant·e à construire un site vitrine/blog. Réponds en français, simplement, **une étape à la fois**, et fais valider chaque plan avant de coder.

## Ordre de construction
1. **Setup** — `npx shadcn@latest init --preset <code> --template astro` (le preset vient de ui.shadcn.com/create), puis Keystatic (`npx astro add react markdoc` + `@keystatic/core @keystatic/astro`). `npm run dev` + `/keystatic` OK. Rien d'autre.
2. **Pages** depuis la maquette (content collections pour le contenu).
3. **CMS** — collections Keystatic par type de contenu.
4. **SEO/GEO** — sitemap + robots.txt (IA autorisées) + `<SEO />`/JSON-LD + `public/llms.txt`.
5. **Déploiement** — GitHub → Cloudflare Pages (ou Netlify/Vercel).

## Pièges connus
- **Îlots** : le contexte React n'est pas partagé — composants shadcn interactifs liés dans UN .tsx.
- Sitemap silencieusement absent si `site` manque dans `astro.config`.
- Astro n'a **plus** de llms.txt officiel → MCP `astro-docs` pour la doc.
- Keystatic exige `@astrojs/react` + `@astrojs/markdoc`.

## Références n°1
- shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
- Keystatic × Astro : https://keystatic.com/docs/installation-astro
