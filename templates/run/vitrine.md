# Lancer le site — Vitrine (Astro + Convex + Better Auth)

Ce projet porte **deux applications** — `site/` (les pages publiques) et `dashboard/` (la saisie du
contenu, privée) — plus **un backend Convex**. Ce sont **trois processus qui restent ouverts**, donc
**trois terminaux**, dans cet ordre :

1. `cd dashboard && npx convex dev` — le backend Convex + la génération des types (laisse tourner).
2. `cd site && npm run dev` — les pages publiques.
3. `cd dashboard && npm run dev` — le tableau de bord.

Ouvre **http://localhost:4321** (le site public) et **http://localhost:3000** (le dashboard).

**Ce que tu dois voir :** la page d'accueil se charge sur **4321** avec son contenu **déjà présent dans
le HTML** (clic droit → « code source de la page » : le texte y est), et le dashboard demande une
connexion sur **3000**.

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

**Convex tourne en cloud**, c'est le chemin par défaut : `npx convex deploy` crée le déploiement de
production, il n'y a aucune image à faire pour lui. (Convex publie aussi une version auto-hébergée et
écrit lui-même « Self hosting is not for everyone » — ce n'est pas la voie de ce kit.)

**Les variables, et surtout QUAND elles sont lues** — c'est la conséquence directe de la lecture au
build, et elle se paie cher si on la rate :

| Variable | Où | Quand |
| --- | --- | --- |
| `PUBLIC_CONVEX_URL`, `SITE_URL` | image du site | **au BUILD** de l'image — le contenu est lu à ce moment-là. Passée seulement au démarrage du conteneur, elle arrive **trop tard** et le site part vide. |
| `PUBLIC_CONVEX_URL`, `BETTER_AUTH_URL` | image du dashboard | au démarrage du conteneur |
| `BETTER_AUTH_SECRET`, `SITE_URL` | dans Convex, jamais dans une image | `npx convex env set <CLÉ> <valeur>` |

**Reconstruire le site à la publication.** Nomme tes services `site` et `dashboard` dans le
`compose.yaml` ; la reconstruction du site tient alors en une ligne, sur le VPS :

```bash
docker compose build site && docker compose up -d site
```

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

Le backend Convex écoute sur **http://localhost:3210**, le site sur **http://localhost:4321**, le dashboard sur **http://localhost:3000**.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
