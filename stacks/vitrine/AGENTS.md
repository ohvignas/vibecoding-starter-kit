# Règles projet pour l'IA — Site vitrine (Astro + shadcn/ui + Keystatic)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Renomme-le en `CLAUDE.md` si tu utilises uniquement Claude Code (les deux noms fonctionnent).

## Contexte du projet
Je construis un **site vitrine / blog** rapide et trouvable. Stack imposée :
- **Astro 5** — framework orienté contenu : HTML statique par défaut, zéro JS sauf demandé.
- **shadcn/ui** (Tailwind v4 + React) — les composants UI, montés en **îlots** uniquement où il faut de l'interactivité.
- **Keystatic** — CMS **git** : le contenu vit dans le dépôt, admin visuel sur `/keystatic`.

Je débute. Explique tes choix simplement et avance **une étape à la fois**.

## Règles Astro (îlots)
- **Statique d'abord** : tout est `.astro` sans JS. N'ajoute `client:load` / `client:visible` QUE sur ce qui est vraiment interactif (menu mobile, carrousel, formulaire).
- ⚠️ **Le contexte React n'est PAS partagé entre îlots.** Des composants shadcn qui interagissent (ex. `Dialog` + son bouton) doivent vivre dans **UN seul fichier `.tsx`**, importé une fois dans le `.astro`. Jamais éparpillés dans le `.astro`.
- Contenu structuré = **content collections** (`src/content/`), jamais des données en dur dans les pages.
- Images : **toujours** `astro:assets` (`<Image />`), jamais `<img>` brut sur une photo.
- En cas de doute sur une API Astro : interroge le **MCP astro-docs** (la doc à jour — Astro n'a plus de llms.txt).

## Règles shadcn/ui
- Installe via le CLI : `npx shadcn@latest add <composant>` — ne recopie jamais un composant à la main.
- Le **thème** vient du preset (`npx shadcn@latest init --preset <code> --template astro`) ou de tweakcn — modifie les **variables CSS**, pas les fichiers de composants.
- Style : classes Tailwind + tokens (`bg-primary`, `text-muted-foreground`…), pas de couleurs en dur.

## Règles Keystatic (CMS)
- Config dans `keystatic.config.ts` : une **collection par type de contenu** (pages, articles, témoignages…), storage `{ kind: 'local' }` (le contenu est committé).
- Admin : `http://localhost:4321/keystatic`. Montre à l'utilisateur comment éditer SANS toucher au code.
- Le contenu Keystatic alimente les content collections Astro — ne duplique jamais le contenu.

## SEO (non négociable — dès le premier jalon)
- `@astrojs/sitemap` installé + champ **`site`** renseigné dans `astro.config` (sinon pas de sitemap).
- `public/robots.txt` : pointe le sitemap, autorise tout par défaut **y compris les crawlers IA** (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`).
- Chaque page a : `<title>` unique (50-60 car.), meta description (150-160 car.), canonical, Open Graph (titre, description, image) — via `astro-seo` ou un composant `<SEO />` maison.
- Une seule `<h1>` par page ; hiérarchie `h2`/`h3` propre ; texte alternatif sur chaque image.

## GEO — être cité par ChatGPT / Perplexity / Claude (non négociable)
- Maintiens **`public/llms.txt`** : aperçu du site en Markdown (qui on est, offres, pages clés avec URLs). **Mets-le à jour à chaque nouvelle page.**
- **JSON-LD schema.org** par type de page : `Organization` ou `LocalBusiness` (accueil), `FAQPage` (FAQ), `Article` (blog), `BreadcrumbList` (navigation). Google lit le JSON-LD ; les IA lisent JSON-LD **et** llms.txt.
- Écris **dense et factuel** : chiffres, listes, réponses directes — les moteurs génératifs citent ce qui est précis.

## Sécurité & bonnes pratiques
- Site statique : **aucun secret** dans le code. Formulaire de contact → service externe (Web3Forms/Formspree), la clé publique va dans `.env` (préfixe `PUBLIC_`).
- Performance : vise Lighthouse ≥ 95 (peu de JS, `astro:assets`, polices locales).
- Commit Git après chaque étape qui fonctionne.
