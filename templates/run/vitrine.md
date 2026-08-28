# Lancer le site — Vitrine (Astro + Convex + Better Auth)

Ce projet porte **deux applications** — `site/` (les pages publiques) et `dashboard/` (la saisie du
contenu, privée) — plus **un backend Convex**. Ça fait **deux terminaux**, pas trois, dans cet ordre :

1. `cd dashboard && npm run dev` — ⚠️ **cette commande démarre DEUX choses** : le template pose
   `"dev": "convex dev --start 'vite dev'"`, donc elle lance le backend Convex (et la génération
   des types) **puis** le tableau de bord. Ne lance pas `npx convex dev` à côté : tu aurais **deux
   Convex sur le même déploiement**, des logs en double, et rien pour te dire pourquoi.
2. `cd site && npm run dev` — les pages publiques.

Ouvre **http://localhost:4321** (le site public) et **http://localhost:3000** (le dashboard).

⚠️ **Astro 7 rend la main, et ce n'est pas un plantage** : `npm run dev` dans `site/` **rend la main en quelques
secondes, avec le code 0** et laisse le serveur tourner **en tâche de fond** — ton terminal n'est pas bloqué,
le site répond quand même sur 4321. Pour savoir où il en est : `cd site && npx astro dev status` ;
pour l'arrêter : `cd site && npx astro dev stop`. Le `dev` du dashboard, lui, occupe son terminal.

**Ce que tu dois voir :** la page d'accueil se charge sur **4321** avec son contenu **déjà présent dans
le HTML** (clic droit → « code source de la page » : le texte y est), et le dashboard demande une
connexion sur **3000**.

## Où va le `.env` — pas à la racine

⚠️ Le `.env.example` posé à la racine par le kit est **l'inventaire** de ce qu'il faut remplir. Ce
n'est **pas** un fichier que tes applications lisent : Astro et TanStack Start cherchent leur `.env`
**dans leur propre dossier**. Trois destinations, et elles ne portent pas la même chose :

| Fichier | Ce qu'il porte |
| --- | --- |
| `site/.env` | `PUBLIC_CONVEX_URL` · `SITE_URL` (l'adresse **publique du site**, celle du sitemap et des canonical) · `PUBLIC_WEB3FORMS_KEY` |
| `dashboard/.env.local` | écrit **tout seul** par `npx convex dev` (`CONVEX_DEPLOYMENT` et l'URL du déploiement) ; ajoute-y `BETTER_AUTH_URL` |
| dans Convex, jamais dans un fichier | `cd dashboard && npx convex env set BETTER_AUTH_SECRET <valeur>` et `... SITE_URL <origine du dashboard>` |

⚠️ **`SITE_URL` porte DEUX adresses différentes, et les confondre casse la connexion.** Dans
`site/.env`, c'est l'adresse publique du site (`https://ton-domaine.fr`). Dans **Convex**, c'est
l'origine de l'application qui porte l'authentification, donc le **dashboard** — la même valeur que
`BETTER_AUTH_URL` (`http://localhost:3000` en local). Y mettre l'URL publique casse les redirections
et le CORS de la connexion, sans message compréhensible.

## Publier — deux modèles, et le projet en choisit UN

Les pages publiques lisent Convex **côté serveur** — au build pour une page prérendue, à la requête
pour une route en SSR. Quand tu publies depuis le dashboard, le contenu part
bien dans la base — et ce qui se passe ensuite dépend entièrement du modèle que le projet a retenu.
Il y en a deux. **Écris lequel dans le README du projet**, sinon personne ne saura, dans six mois,
pourquoi une publication met vingt minutes ou deux secondes à se voir.

**Le critère, page par page** : une page dont le contenu vient du CMS et peut changer **sans
redéploiement** relève du modèle 2 ; une page dont le contenu vit dans le code (accueil figée,
mentions légales) reste prérendue. L'opt-out d'une route s'écrit **`export const prerender = false`
dans la route elle-même**, jamais comme une absence d'entrée dans `routeRules`.

### Modèle 1 — tout est prérendu, et on reconstruit

Rien à administrer : le site est un dossier de fichiers. Le prix est écrit noir sur blanc —
**publier ne met pas les pages en ligne à jour**, elles restent celles du dernier build tant que tu
ne le relances pas. La commande, depuis la racine du projet :

```bash
npm run build --workspace site
```

⚠️ **En local, tu ne verras pas le problème** : le serveur de développement d'Astro réexécute le code
de la page à chaque requête, donc ton contenu y est toujours frais. L'écart n'apparaît qu'**après un
build** — c'est-à-dire **en ligne**. C'est pour ça que le rebuild fait partie de la publication, et
pas d'une corvée du lendemain.

### Modèle 2 — la page publiée est purgée, rien n'est reconstruit

Les routes qui affichent du contenu du CMS font l'opt-out (`export const prerender = false`) et
posent leur cache elles-mêmes. Publier ne reconstruit alors **rien du tout** : ça purge **une** page.

```
publication (dashboard)
  → Convex écrit une ligne d'outbox, dans la MÊME mutation
  → une action `drain` POSTe sur /api/revalidate du site
  → le site purge le tag `page:<slug>`
  → la requête suivante re-rend cette page-là
```

Cinq points à ne pas rater, chacun pour une raison qui se paie comptant :

1. **Chaque page porte SON tag** — `page:<slug>`, en plus du tag de route (`pages`) — et **la
   publication n'envoie QUE `page:<slug>`**. ⚠️ Les deux moitiés comptent, et c'est la seconde qu'on
   rate : `invalidate()` travaille en **OU**, une entrée part dès qu'elle porte **au moins un** des
   tags cités. Poser le tag par page puis publier `["pages", "page:<slug>"]` purge donc **toutes**
   les pages en cache — le site entier se re-rend pour une virgule, exactement ce qu'on voulait
   éviter. Garde `pages` pour le cas rare où tu veux vraiment tout purger (changement de gabarit).
2. **Un 404 ne se cache jamais** : `Astro.cache.set(false)` sur la branche « page introuvable ».
   Sinon il faudrait qu'une future publication de ce slug exact pense à l'invalider — elle n'y
   pensera pas, et l'adresse restera en 404 alors que la page existe. **Et le miroir : dépublier
   et supprimer écrivent une ligne d'outbox, exactement comme publier.** Sans ça, une page retirée
   reste **servie depuis le cache jusqu'à l'expiration de `maxAge`** — le dashboard la dit retirée,
   le monde continue de la lire.
3. 🔴 **`memoryCache()` est PAR PROCESSUS.** Une purge n'atteint que l'instance qui a reçu l'appel
   HTTP. Tu tournes donc à **UNE SEULE RÉPLIQUE** du site, ou tu passes à un fournisseur de cache
   **partagé** (Redis) **avant** d'en lancer une deuxième. À deux conteneurs, une publication sur
   deux semble ne rien faire — et rien, nulle part, ne te le dira.
4. **Une ligne d'outbox, pas un `fetch` direct depuis la mutation.** Si le site est en train de
   redémarrer à l'instant de la publication, un appel direct est perdu **sans trace**. Une ligne
   d'outbox rejouée par `drain` — avec ré-essais espacés et un état terminal quand ça n'a jamais
   marché — ne l'est pas.
5. **`drain` a DEUX déclencheurs, et le second n'est pas décoratif.** La mutation le planifie tout
   de suite (le chemin rapide), **et** un **cron de rattrapage** le rebalaye périodiquement (~60 s).
   Convex **ne rejoue pas** une action planifiée : si l'appel rapide se perd — le sinistre même
   contre lequel l'outbox existe —, sans balayage la ligne reste `pending` pour toujours. Écrire
   l'outbox sans le balayage, c'est promettre une durabilité qui n'a aucun support.

⚠️ **`/api/revalidate` peut purger tout le cache du site.** Secret partagé d'**au moins 32
caractères**, lu **dans le handler** (une variable absente doit faire un **500 visible**, pas un
refus qu'on confond avec un mauvais secret), comparé **haché des deux côtés** puis `timingSafeEqual`,
et **corps mal formé refusé, jamais coercé** en liste vide.

## Mettre en ligne — Docker sur un VPS

**Deux images**, une par application :

- **`site/`** → `npm run build --workspace site`. En **modèle 1**, ça produit `site/dist/`, des
  fichiers **statiques** : l'image finale est un simple serveur web (nginx, Caddy) qui sert ce
  dossier. En **modèle 2**, il faut l'adaptateur `@astrojs/node` en `standalone` : la sortie est un
  **serveur Node** qui sert les pages prérendues **et** exécute les routes CMS, depuis le même
  conteneur — pas d'hébergeur de statique séparé.
- **`dashboard/`** → `npm run build --workspace dashboard` produit un **serveur Node** ; l'image le lance.

**Un reverse-proxy TLS devant les deux** — Caddy ou Traefik obtiennent le certificat Let's Encrypt
tout seuls. `ton-domaine.fr` va sur l'image du site, `admin.ton-domaine.fr` sur celle du dashboard.

**Convex tourne en cloud**, c'est le chemin par défaut : `cd dashboard && npx convex deploy` crée le
déploiement de production, il n'y a aucune image à faire pour lui. (Convex publie aussi une version
auto-hébergée et écrit lui-même « Self hosting is not for everyone » — ce n'est pas la voie de ce kit.)

**Les variables, et surtout QUAND elles sont lues.** ⚠️ **La ligne qui départage `build.args:` de
`environment:`, et elle décide seule :** Vite/Astro **remplacent `import.meta.env.CLÉ` par sa valeur
AU BUILD** — y compris dans la sortie **SSR**, y compris pour une clé **sans** préfixe `PUBLIC_`.
Donc : ce que le code lit avec `import.meta.env` (l'URL de Convex) **doit** être là au build, sinon
c'est `undefined` figé dans l'artefact pour toujours → `build.args:`. Ce qui doit rester réglable
par conteneur et **rotatable** (les secrets) se lit avec `process.env`, une vraie lecture à
l'exécution → `environment:`. ⛔ Déplacer l'URL dans `environment:` « par symétrie » avec le secret
la rend `undefined` au runtime : en modèle 2, **chaque page CMS rend 500**.

| Variable | Où | Quand |
| --- | --- | --- |
| `PUBLIC_CONVEX_URL`, `SITE_URL` (adresse publique du site) | image du site, dans **`build.args:`** du `compose.yaml` — **pas** `environment:` | **au BUILD** de l'image, parce qu'elles sont lues via `import.meta.env` et donc **inlinées dans l'artefact à ce moment-là**. En modèle 1 s'ajoute le contenu lui-même, lu au build. Mises dans `environment:`, elles n'arrivent qu'au démarrage du conteneur, **trop tard** : le site part vide (modèle 1) ou rend 500 sur chaque page CMS (modèle 2). |
| `PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL` | image du dashboard, dans `environment:` | au démarrage du conteneur |
| `BETTER_AUTH_SECRET`, `SITE_URL` (= origine du dashboard) | dans Convex, jamais dans une image | `cd dashboard && npx convex env set <CLÉ> <valeur>` |
| **Modèle 2 seulement** — le secret de revalidation | image du site, dans **`environment:`** ; et le **même** secret dans Convex (`npx convex env set`) | à la requête, **lu via `process.env`** — jamais `import.meta.env`, qui le figerait dans l'artefact au build et le rendrait non rotatable. ⛔ **Jamais dans `build.args:`** non plus : un argument de build reste lisible dans l'historique de l'image. |
| **Modèle 2 seulement** — l'adresse publique du site, côté Convex | dans Convex, sous une clé **à part** | c'est l'origine que `drain` POSTe. Ne réutilise pas `SITE_URL`, qui vaut déjà l'origine du dashboard : les confondre fait pointer, en silence, soit la connexion soit la purge vers la mauvaise application. |

### Modèle 1 — reconstruire le site à la publication

Nomme tes services `site` et `dashboard` dans le
`compose.yaml`, et fais déclarer à ton `Dockerfile` du site un `ARG CONTENU_REV` **juste avant** son
`RUN npm run build`. La reconstruction tient alors en une ligne, sur le VPS :

```bash
docker compose build --build-arg CONTENU_REV=$(date +%s) site && docker compose up -d site
```

⚠️ **Le `--build-arg` n'est pas décoratif, il est le cœur de la manœuvre.** Quand ton client publie,
**tes sources ne bougent pas** : sans cet argument qui change à chaque fois, Docker réutilise son
cache, ne rejoue jamais `npm run build`, et `up -d` répond « up-to-date ». Tu croirais reconstruire
en ne reconstruisant rien. (`docker compose build --no-cache site` marche aussi, en plus brutal :
il réinstalle aussi les dépendances.)

Deux façons de la déclencher — choisis-en **une** et écris-la dans le README du projet :

1. **À la main**, juste après avoir publié. Rien à installer, et c'est un choix acceptable le premier
   jour : au moins, personne ne croit que ça se fait tout seul.
2. **Planifiée** : un `cron` sur le VPS rejoue cette ligne (toutes les 15 min, ou la nuit). Le site a
   alors un retard **connu et écrit** — dis lequel à qui publie.

### Modèle 2 — rien à reconstruire, rien à planifier

`docker compose up -d site` une fois, et c'est tout : ensuite, chaque publication déclenche `drain`,
qui POSTe sur `/api/revalidate`, qui purge `page:<slug>`. Pas de `--build-arg`, pas de rebuild, pas de
retard à annoncer. En échange, **une seule réplique du service `site`** tant que le cache n'est pas
partagé (voir le point 🔴 plus haut) : `deploy.replicas: 2` casserait une publication sur deux, en
silence.

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

Le site écoute sur **http://localhost:4321** et le dashboard sur **http://localhost:3000** ; Convex tourne en cloud, donc rien n'écoute en local pour lui.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
