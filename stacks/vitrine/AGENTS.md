# Règles projet pour l'IA — Site vitrine (Astro + Convex + Better Auth)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Renomme-le en `CLAUDE.md` si tu utilises uniquement Claude Code (les deux noms fonctionnent).

## Contexte du projet
Je construis un **site vitrine / blog** rapide et trouvable. Le projet porte **deux applications sous une seule racine** :
- **`site/` — Astro 7** : les pages publiques. HTML statique par défaut, zéro JS sauf demandé. **Exige Node ≥ 22.12** (il refuse de démarrer en dessous).
- **`dashboard/` — TanStack Start** : la saisie du contenu. Privé, derrière une connexion, jamais indexé.
- **Convex** — la base de données et le backend, partagés par les deux applications. Le contenu vit là.
- **Better Auth** — la connexion au `dashboard/`, via le composant officiel `@convex-dev/better-auth`.
- **shadcn/ui** (Tailwind v4 + React) — les composants UI du site public, montés en **îlots**. Le scaffold ne l'installe que dans `site/`.

Je débute. Explique tes choix simplement et avance **une étape à la fois**.

⚠️ **L'ordre de création est une contrainte** : `site/`, puis `dashboard/`, puis le `package.json` de la racine. Les scripts de la racine ratissent les deux applications — posés trop tôt, ils échouent à chaque écriture de fichier.

## Règles Astro (les pages publiques, dans `site/`)
- **Statique d'abord** : tout est `.astro` sans JS. N'ajoute `client:load` / `client:visible` QUE sur ce qui est vraiment interactif (menu mobile, carrousel, formulaire).
- ⚠️ **Le contexte React n'est PAS partagé entre îlots.** Des composants shadcn qui interagissent (ex. `Dialog` + son bouton) doivent vivre dans **UN seul fichier `.tsx`**, importé une fois dans le `.astro`. Jamais éparpillés dans le `.astro`.
- **Un îlot ne parle pas à Convex** : il reçoit ses données **en props**, préparées par la page qui l'importe (voir la section suivante).
- Le contenu qui reste dans le dépôt (mentions légales, pages fixes) = **content collections**, jamais des données en dur dans les pages. Une collection se DÉCLARE dans **`site/src/content.config.ts`** avec un **`loader`** (`glob()` / `file()` de `astro/loaders`) : depuis Astro 6, un dossier ne suffit plus, et `src/content/config.ts` n'est plus lu.
- ⚠️ **APIs supprimées par Astro 6, ne les écris jamais** : `Astro.glob()` (→ `getCollection()` ou `import.meta.glob()`) et `<ViewTransitions />` (→ `<ClientRouter />`).
  **Le skill design `ui-ux-pro-max` te les proposera** : sa fiche Astro (`data/stacks/astro.csv`, dépôt tiers que le kit ne modifie pas) date d'avant leur suppression et recommande encore les deux. Cette règle-ci prime — si un skill et cette page se contredisent sur une API Astro, c'est cette page qui a raison.
- Images : **toujours** `astro:assets` (`<Image />`), jamais `<img>` brut sur une photo.
- En cas de doute sur une API Astro : interroge le **MCP astro-docs** (la doc à jour — Astro n'a plus de llms.txt).

## Convex — le site public lit au BUILD (non négociable)
Le contenu vit dans **Convex**, et deux applications le partagent : `site/` (Astro, les pages publiques) et `dashboard/` (TanStack Start, la saisie).
- **Les pages publiques lisent Convex au BUILD**, avec le client serveur `ConvexHttpClient`, dans le **frontmatter** d'une page `.astro` ou dans `getStaticPaths()`. Le HTML part du serveur **déjà rempli**.
- ⛔ **Jamais `useQuery`, jamais `ConvexProvider` dans une page publique.** Ce sont des hooks de **navigateur** : le contenu arriverait **après** le chargement, le HTML servi serait **vide**, et le **JSON-LD n'aurait plus rien à décrire**. Google et les moteurs génératifs indexeraient une coquille — or le SEO est la raison d'être de cette stack.
- `useQuery` et `ConvexProvider` sont **réservés au `dashboard/`** : là, le temps réel est exactement le bon outil, et personne n'a besoin d'indexer la page.
- Conséquence à assumer : **publier dans le `dashboard/` ne change rien au site public tant qu'il n'est pas rebuildé.** Déclenche le rebuild à la publication.

## Règles shadcn/ui
- Installe via le CLI : `npx shadcn@latest add <composant>` — ne recopie jamais un composant à la main.
- Le **thème** vient du preset (`npx shadcn@latest init --template astro --preset <code>`) ou de tweakcn — modifie les **variables CSS**, pas les fichiers de composants.
- Style : classes Tailwind + tokens (`bg-primary`, `text-muted-foreground`…), pas de couleurs en dur.
- ⚠️ **shadcn ne vit que dans `site/`** : c'est le preset qui l'y pose, et rien ne l'installe ailleurs. Pour en mettre aussi dans `dashboard/`, il faut y lancer `npx shadcn@latest init` — les deux applications auront alors chacune SES variables CSS, à garder d'accord à la main.

## Le dashboard (TanStack Start + Better Auth)
- **Toute la saisie du contenu vit ici**, et nulle part ailleurs : le site public n'a ni compte, ni session, ni écran d'admin.
- Auth via **`@convex-dev/better-auth`**, en suivant le guide officiel **TanStack Start** (https://labs.convex.dev/better-auth/framework-guides/tanstack-start). Il n'existe **aucun** guide Astro, et le site public n'en a pas besoin.
- ⚠️ **N'installe jamais `better-auth@latest`** : le composant épingle une version précise (ex. `~1.6.x`). Prends celle que le guide indique.
- Schéma d'auth : `npx auth generate` (pas `@better-auth/cli`). Secrets via `npx convex env set`, jamais dans un `.env` committé.
- **Chaque route privée se vérifie côté serveur** (la session, pas seulement un bouton caché).
- Le temps réel de Convex est ici chez lui : la page a le droit d'arriver vide et de se remplir après le chargement.

## Le schéma et les fonctions Convex
- La logique serveur = `query` / `mutation` / `action` dans `dashboard/convex/`. Jamais d'API REST maison pour les données.
- Schéma dans `dashboard/convex/schema.ts` ; indexe chaque champ filtré ou paginé.
- Un champ qui sert au SEO (slug, titre, description, date) fait partie du schéma **dès le départ** : c'est lui qui remplit les balises de la page publique.
- Règles officielles à donner à l'IA : `ai-context/convex/`.

## SEO (non négociable — dès le premier jalon)
- `@astrojs/sitemap` installé + champ **`site`** renseigné dans `site/astro.config.mjs` (sinon pas de sitemap).
- **`site/public/robots.txt`** : pointe le sitemap, autorise tout par défaut **y compris les crawlers IA** (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`).
- Chaque page a : `<title>` unique (50-60 car.), meta description (150-160 car.), canonical, Open Graph (titre, description, image) — via `astro-seo` ou un composant `<SEO />` maison.
- Une seule `<h1>` par page ; hiérarchie `h2`/`h3` propre ; texte alternatif sur chaque image.

## GEO — être cité par ChatGPT / Perplexity / Claude (non négociable)
- Maintiens **`site/public/llms.txt`** (à la racine du site public, pas à la racine du projet) : aperçu du site en Markdown (qui on est, offres, pages clés avec URLs). **Mets-le à jour à chaque nouvelle page.**
- **JSON-LD schema.org** par type de page : `Organization` ou `LocalBusiness` (accueil), `FAQPage` (FAQ), `Article` (blog), `BreadcrumbList` (navigation). Google lit le JSON-LD ; les IA lisent JSON-LD **et** llms.txt.
- Écris **dense et factuel** : chiffres, listes, réponses directes — les moteurs génératifs citent ce qui est précis.

## Déploiement — Docker sur un VPS
- **Deux images** : le build statique d'Astro servi par un serveur web, et le serveur Node du dashboard. Un reverse-proxy TLS devant les deux.
- Convex tourne **en cloud** par défaut (l'auto-hébergement existe, ce n'est pas le chemin par défaut).
- Variables au déploiement, jamais committées : `CONVEX_DEPLOYMENT`, `PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SITE_URL`.
- ⚠️ **Publier ne suffit pas** : le contenu change dans Convex, les pages publiques restent celles du dernier build. Le rebuild fait partie de la publication, pas d'une corvée du lendemain.

## Sécurité & bonnes pratiques
- **Aucun secret dans les pages publiques** : ce qui part au navigateur est public par construction. Les secrets vivent dans les variables d'environnement Convex (`npx convex env set`).
- Formulaire de contact → service externe (Web3Forms/Formspree), la clé publique va dans `.env` (préfixe `PUBLIC_`).
- Performance : vise Lighthouse ≥ 95 (peu de JS, `astro:assets`, polices locales).
- Commit Git après chaque étape qui fonctionne.
