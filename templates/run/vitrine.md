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

## Publier ne met pas le site à jour — il faut le RECONSTRUIRE

Les pages publiques lisent Convex **au build**. Quand tu publies depuis le dashboard, le contenu part
bien dans la base — mais les pages en ligne restent **celles du dernier build** jusqu'à ce que tu le
relances. La commande, depuis la racine du projet :

```bash
npm run build --workspace site
```

⚠️ **En local, tu ne verras pas le problème** : le serveur de développement d'Astro réexécute le code
de la page à chaque requête, donc ton contenu y est toujours frais. L'écart n'apparaît qu'**après un
build** — c'est-à-dire **en ligne**. C'est pour ça que le rebuild fait partie de la publication, et
pas d'une corvée du lendemain.

## Mettre en ligne — Docker sur un VPS

**Deux images**, une par application :

- **`site/`** → `npm run build --workspace site` produit `site/dist/`, des fichiers **statiques** ;
  l'image finale est un simple serveur web (nginx, Caddy) qui sert ce dossier.
- **`dashboard/`** → `npm run build --workspace dashboard` produit un **serveur Node** ; l'image le lance.

**Un reverse-proxy TLS devant les deux** — Caddy ou Traefik obtiennent le certificat Let's Encrypt
tout seuls. `ton-domaine.fr` va sur l'image du site, `admin.ton-domaine.fr` sur celle du dashboard.

**Convex tourne en cloud**, c'est le chemin par défaut : `cd dashboard && npx convex deploy` crée le
déploiement de production, il n'y a aucune image à faire pour lui. (Convex publie aussi une version
auto-hébergée et écrit lui-même « Self hosting is not for everyone » — ce n'est pas la voie de ce kit.)

**Les variables, et surtout QUAND elles sont lues** — c'est la conséquence directe de la lecture au
build, et elle se paie cher si on la rate :

| Variable | Où | Quand |
| --- | --- | --- |
| `PUBLIC_CONVEX_URL`, `SITE_URL` (adresse publique du site) | image du site, dans **`build.args:`** du `compose.yaml` — **pas** `environment:` | **au BUILD** de l'image : le contenu est lu à ce moment-là. Mises dans `environment:`, elles n'arrivent qu'au démarrage du conteneur, **trop tard**, et le site part vide. |
| `PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL` | image du dashboard, dans `environment:` | au démarrage du conteneur |
| `BETTER_AUTH_SECRET`, `SITE_URL` (= origine du dashboard) | dans Convex, jamais dans une image | `cd dashboard && npx convex env set <CLÉ> <valeur>` |

**Reconstruire le site à la publication.** Nomme tes services `site` et `dashboard` dans le
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

Trois façons de la déclencher, de la plus simple à la plus réactive — choisis-en **une** et écris-la
dans le README du projet :

1. **À la main**, juste après avoir publié. Rien à installer, et c'est un choix acceptable le premier
   jour : au moins, personne ne croit que ça se fait tout seul.
2. **Planifiée** : un `cron` sur le VPS rejoue cette ligne (toutes les 15 min, ou la nuit). Le site a
   alors un retard **connu et écrit** — dis lequel à qui publie.
3. **Au signal** : la fonction Convex qui publie appelle une URL de reconstruction sur le VPS (un
   petit service qui rejoue cette ligne, protégé par un jeton). C'est la seule qui met le site à jour
   en quelques secondes, et c'est **du code à écrire**, pas un réglage.

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

Le site écoute sur **http://localhost:4321** et le dashboard sur **http://localhost:3000** ; Convex tourne en cloud, donc rien n'écoute en local pour lui.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
