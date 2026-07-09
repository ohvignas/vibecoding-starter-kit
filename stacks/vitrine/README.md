# Stack Site vitrine — Astro + shadcn/ui + Keystatic

**Pour quoi ?** Un site qui **présente** (entreprise, portfolio, resto, assos) ou un **blog** : contenu, pages, SEO. Pas de comptes utilisateurs, pas de données temps réel — pour ça, prends la stack SaaS.

## Les briques
| Brique | Rôle | Pourquoi celle-là |
|---|---|---|
| **Astro 5** | le framework | HTML statique par défaut → ultra rapide, imbattable en SEO |
| **shadcn/ui** | les composants (React en îlots) | beaux composants copiés dans TON code, thème par preset |
| **Tailwind v4** | le style | utilitaire, marche main dans la main avec shadcn |
| **Keystatic** | le CMS | admin visuel sur `/keystatic`, contenu **dans le git** (gratuit, zéro serveur) |

## Ce que cette stack optimise : SEO **et** GEO
- **SEO** (Google) : sitemap auto, robots.txt, meta/OG par page, JSON-LD, perfs au max.
- **GEO** (ChatGPT, Perplexity…) : `llms.txt` du site + données structurées → ton site peut être **cité par les IA**.

## Ordre de construction
1. **Setup** : `npx shadcn@latest init --preset <ton-code> --template astro` (crée l'app Astro + shadcn avec TON thème) — le preset se choisit sur [ui.shadcn.com/create](https://ui.shadcn.com/create).
2. **Keystatic** : `npx astro add react markdoc` + `@keystatic/core @keystatic/astro` → admin `/keystatic`.
3. **Pages** depuis la maquette (accueil, offres, contact…), contenu via collections.
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
