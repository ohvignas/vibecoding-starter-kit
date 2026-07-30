# Stack Site vitrine — Astro + shadcn/ui + Keystatic

**Pour quoi ?** Un site qui **présente** (entreprise, portfolio, resto, assos) ou un **blog** : contenu, pages, SEO. Pas de comptes utilisateurs, pas de données temps réel — pour ça, prends la stack SaaS.

## Les briques
| Brique | Rôle | Pourquoi celle-là |
|---|---|---|
| **Astro 7** | le framework | HTML statique par défaut → ultra rapide, imbattable en SEO. **Node ≥ 22.12 requis** |
| **shadcn/ui** | les composants (React en îlots) | beaux composants copiés dans TON code, thème par preset |
| **Tailwind v4** | le style | utilitaire, marche main dans la main avec shadcn |
| **Keystatic** | le CMS | admin visuel sur `/keystatic`, contenu **dans le git** (gratuit, zéro serveur) |

## Ce que cette stack optimise : SEO **et** GEO
- **SEO** (Google) : sitemap auto, robots.txt, meta/OG par page, JSON-LD, perfs au max.
- **GEO** (ChatGPT, Perplexity…) : `llms.txt` du site + données structurées → ton site peut être **cité par les IA**.

## Ordre de construction
0. **Vérifie ta version de Node** : `node --version` doit afficher **22.12 ou plus**. En dessous, Astro 7 s'arrête net avec `Please upgrade Node.js to a supported version: ">=22.12.0"`.
1. **Setup** : `npx shadcn@latest init --preset <ton-code> --template astro` (crée l'app Astro + shadcn avec TON thème) — le preset se choisit sur [ui.shadcn.com/create](https://ui.shadcn.com/create). Contrôle ensuite `npx astro --version` : **ce kit est écrit pour Astro 7**. Si tu vois un majeur plus récent, demande au MCP `astro-docs` ce qui a changé avant de suivre ces règles.
2. **Keystatic** : `npx astro add react markdoc` + `@keystatic/core @keystatic/astro` → admin `/keystatic`.
3. **Pages** depuis la maquette (accueil, offres, contact…), contenu via collections déclarées dans `src/content.config.ts` (une entrée par collection, avec son `loader`).
4. **SEO/GEO** : sitemap + robots.txt + `<SEO />` + JSON-LD + `public/llms.txt`.
5. **Déploiement** : pousse sur GitHub → **Cloudflare Pages** (gratuit, bande passante illimitée) ou Netlify/Vercel.

## Lancer
```bash
npm run dev        # http://localhost:4321
# admin CMS : http://localhost:4321/keystatic
```

## FAQ débutant
- **C'est quoi un îlot ?** Ta page est du HTML pur ; un îlot = un composant React chargé UNIQUEMENT là où il faut de l'interactivité. C'est pour ça que c'est rapide.
- **Je veux changer les couleurs.** Refais un preset sur ui.shadcn.com/create ou règle les variables CSS sur tweakcn.com — jamais dans les fichiers de composants.
- **Le client peut éditer le contenu ?** Oui : `/keystatic` (en local) ; en ligne, passe le storage en mode `github`.
