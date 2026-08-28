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
- ⚠️ **Ce qui est non négociable, c'est le CÔTÉ, pas le moment** : le même client serveur sert au build (page prérendue) **et** à la requête (route en SSR, modèle 2 ci-dessous). Dans les deux cas, le HTML part du serveur déjà rempli. Ce qui est interdit, c'est de lire depuis le **navigateur**.
- ⛔ **Jamais `useQuery`, jamais `ConvexProvider` dans une page publique.** Ce sont des hooks de **navigateur** : le contenu arriverait **après** le chargement, le HTML servi serait **vide**, et le **JSON-LD n'aurait plus rien à décrire**. Google et les moteurs génératifs indexeraient une coquille — or le SEO est la raison d'être de cette stack.
- `useQuery` et `ConvexProvider` sont **réservés au `dashboard/`** : là, le temps réel est exactement le bon outil, et personne n'a besoin d'indexer la page.
- Conséquence à assumer : ce que le `dashboard/` écrit n'atteint le site public que par une **boucle de publication**, et il y en a **deux** (section suivante). Choisis-en une **avant** d'écrire la première page.

## Publier — deux modèles, et le critère qui les départage
1. **Modèle 1 — tout prérendu, rebuild complet.** `output: "static"`, aucun cache à administrer : le site est un dossier de fichiers. Publier ne change rien en ligne tant que le site n'est pas reconstruit. Simple, et suffisant pour un site dont le contenu ne bouge presque jamais.
2. **Modèle 2 — prérendu + routes CMS en SSR, avec cache par tag.** La page qui vient d'être publiée est **purgée seule**, et la requête suivante la re-rend. **Aucun rebuild, aucun cron, aucun retard à annoncer.** C'est le modèle dès que quelqu'un d'autre que toi écrit du contenu.

**Le critère de décision, page par page** — c'est lui qui tranche, jamais l'habitude :
- contenu venu du **CMS**, qui peut changer **sans redéploiement** → **SSR + cache par tag** ;
- contenu qui vit **dans le code** ou dans une content collection (accueil figée, mentions légales) → **prérendue**.
- ⚠️ **L'opt-out est `export const prerender = false` DANS la route elle-même**, jamais une absence d'entrée dans `routeRules`. `routeRules` ne donne que des **indices de cache** par motif de route, lus quand la route n'appelle pas `Astro.cache.set(...)` elle-même : une route absente y reste **prérendue**, elle ne devient pas SSR.
- Le modèle 2 réclame un **adaptateur serveur** (`@astrojs/node` en `standalone`) : il sert les pages prérendues **et** exécute les routes qui ont fait l'opt-out, depuis le même conteneur.

**La boucle du modèle 2**, de bout en bout : publication dans le `dashboard/` → Convex écrit une ligne d'**outbox** dans la **même mutation** → une action **`drain`** POSTe sur **`/api/revalidate`** du site → le site purge le tag **`page:<slug>`** → la requête suivante re-rend **cette page-là**.
- **Chaque page porte SON tag** (`page:<slug>`) en plus du tag de route (`pages`) : sans lui, publier une page purge **toutes** les pages en cache, et le site entier se re-rend pour une virgule.
- **Un 404 ne se cache jamais** : `Astro.cache.set(false)`. Sinon il faudrait qu'une future publication de ce slug exact pense à l'invalider.
- **Une ligne d'outbox, jamais un `fetch` direct depuis la mutation** : si le site redémarre juste à cet instant, un appel direct est perdu **sans trace**. Une ligne rejouée par `drain` (avec ré-essais et un état terminal) ne l'est pas.
- 🔴 **`memoryCache()` est PAR PROCESSUS.** Une purge n'atteint que l'instance qui a reçu l'appel HTTP : tourne à **UNE SEULE RÉPLIQUE** du site, ou passe à un fournisseur de cache **partagé** (Redis) **avant** d'en lancer une deuxième. À deux conteneurs, une publication sur deux semble ne rien faire, et rien ne le dira.

## `/api/revalidate` — la porte qui peut tout purger
- **Secret d'au moins 32 caractères**, partagé avec Convex, **lu DANS le handler** et pas au chargement du module : une variable absente doit **jeter** (500 visible), pas devenir un refus indiscernable d'un mauvais secret.
- **Comparaison en temps constant, les DEUX côtés hachés d'abord** : `createHash("sha256")…digest()` puis `timingSafeEqual`.
- ⛔ **Aucun contrôle de longueur avant `timingSafeEqual`.** `String.length` compte des unités **UTF-16**, Node lit les en-têtes HTTP en **latin1**, donc un octet ≥ `0x80` devient **deux** octets en UTF-8 : un secret de même longueur en caractères mais différente en octets passait le contrôle puis faisait **jeter** `timingSafeEqual` — un **500** au lieu d'un **401**, qui laisse retrouver la longueur du vrai secret par dichotomie. Hacher d'abord supprime la classe entière : un digest fait toujours 32 octets.
- **Un corps mal formé est refusé (400), jamais coercé en `[]`** — sinon un **200 « purgé »** répond sans avoir rien purgé.
- La route ne se prérend pas et ne se cache pas : `export const prerender = false` + `cache.set(false)` en première instruction.

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
- **Deux images**, et l'image du site dépend du modèle choisi : en **modèle 1**, le build statique d'Astro servi par un serveur web ; en **modèle 2**, le serveur Node d'Astro (adaptateur `@astrojs/node` en `standalone`), qui sert les pages prérendues **et** exécute les routes CMS. Plus le serveur Node du dashboard. Un reverse-proxy TLS devant les deux.
- Convex tourne **en cloud** par défaut (l'auto-hébergement existe, ce n'est pas le chemin par défaut).
- Variables au déploiement, jamais committées : `CONVEX_DEPLOYMENT`, `PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SITE_URL`. Chaque app lit le `.env` de SON dossier (`site/`, `dashboard/`), pas celui de la racine. ⚠️ Le `SITE_URL` posé dans Convex vaut l'origine du `dashboard/` (= `BETTER_AUTH_URL`), pas l'adresse publique du site.
- ⚠️ **En modèle 1, publier ne suffit pas** : le contenu change dans Convex, les pages publiques restent celles du dernier build. Le rebuild fait alors partie de la publication, pas d'une corvée du lendemain — la commande est `npm run build --workspace site`, puis la reconstruction de l'image du site sur le VPS.
- En **modèle 2**, il n'y a rien à reconstruire : `drain` POSTe sur `/api/revalidate`, le tag `page:<slug>` est purgé, la requête suivante re-rend cette page. Les variables nécessaires côté Convex sont le secret de revalidation **et** l'adresse publique du site — une variable distincte du `SITE_URL` de Better Auth.

## Sécurité & bonnes pratiques
- **Aucun secret dans les pages publiques** : ce qui part au navigateur est public par construction. Les secrets vivent dans les variables d'environnement Convex (`npx convex env set`).
- Formulaire de contact → service externe (Web3Forms/Formspree), la clé publique va dans `.env` (préfixe `PUBLIC_`).
- Performance : vise Lighthouse ≥ 95 (peu de JS, `astro:assets`, polices locales).
- Commit Git après chaque étape qui fonctionne.
