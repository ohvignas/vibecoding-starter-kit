# /deploy — Mettre ton app en ligne (runbook IA)

Lis la stack dans `AGENTS.md`, puis applique le chemin correspondant. **Rappel sécu** : les secrets de production se mettent chez l'hébergeur (variables d'environnement), **jamais commités**.

## Avant de déployer — le gate (toutes stacks, dans cet ordre)
1. **CI verte, prouvée** : `gh pr checks <n>` puis `gh run watch <id> --exit-status` sur le dernier run de `main`. Colle la sortie ; « ça a l'air vert » ne compte pas (**« Règle Preuve »** dans `AGENTS.md`).
2. **Sécurité** : lance le sous-agent **`security-reviewer`** sur ce qui part en production. Son **`PROUVÉ`** est requis ; `NON PROUVÉ` ou `BLOQUÉ` → on ne déploie pas, on corrige.
3. **Aucun secret dans le dépôt** : `git ls-files | grep -E '(^|/)\.env$'` doit être VIDE, et chaque clé listée dans `.env.example` doit exister chez l'hébergeur.
4. Dis à l'utilisateur **ce que tu vas mettre en ligne** et **ce que ça coûte** (plan gratuit ou non) avant de lancer la première commande.

## SaaS (Convex + TanStack Start)
1. Backend : `npx convex deploy` (crée le déploiement de production Convex).
2. Secrets prod : `npx convex env set <CLÉ> <valeur>` sur le déploiement prod (auth, paiement, email…).
3. Front : déploie sur **Vercel** ou **Netlify** (connecte le repo GitHub). Renseigne `VITE_CONVEX_URL` (prod) dans les variables de l'hébergeur.
4. Vérifie l'URL de prod en vrai (connexion, un parcours clé).

## Mobile (Expo)
1. `npx eas build --platform all` (build cloud EAS ; un compte Expo suffit).
2. Secrets : `eas secret:create` (jamais dans le repo). Modules natifs → dev build déjà requis.
3. Soumission stores : `eas submit` (App Store / Play Store — comptes développeur requis).
4. Mises à jour OTA : `eas update` pour pousser du JS sans re-soumettre.

## Desktop (Electron)
1. Build des installeurs : `npm run make` — le scaffold du kit est **Electron Forge** (`create-electron-app`), et c'est sa commande de packaging (Windows/Mac/Linux).
2. **Aucun secret dans l'app** : une app installée est lisible par qui la reçoit — pas de clé d'API privée, pas de clé secrète de paiement dans le bundle. Ce qui doit rester secret passe par un petit backend que tu appelles ; ce qui appartient à l'utilisateur (jeton de session) va dans le trousseau système via `safeStorage`.
3. **Signature** obligatoire pour distribuer : Developer ID + notarisation sur macOS, Authenticode sur Windows. Certificats et mots de passe = variables d'environnement du runner CI, **jamais** dans le dépôt. Sans signature, l'utilisateur voit « app endommagée » (macOS) ou un avertissement SmartScreen (Windows).
4. Auto-update : `update-electron-app` (ou l'`autoUpdater` d'Electron) branché sur les GitHub Releases du projet.
5. Sur **Claude Code uniquement**, le skill `electron:distribution` déroule les points 3 et 4 en détail. Sur Cursor et Codex il n'est pas installé → suis la doc officielle Electron, ne l'invoque pas.

## Vitrine (Astro + Convex + Better Auth) — Docker sur un VPS
1. **Vérifie, puis construis les DEUX applications** : à la racine, `npm run typecheck` puis `npm run lint` (ils ratissent `site/` et `dashboard/`), puis `npm run build` → le statique dans `site/dist/` et le serveur Node du dashboard.
2. **Backend** : `npx convex deploy` crée le déploiement de production, puis `npx convex env set <CLÉ> <valeur>` pour ses secrets (`BETTER_AUTH_SECRET`, `SITE_URL`). Convex tourne **en cloud** : c'est le chemin par défaut. L'auto-hébergement existe — Convex écrit lui-même « Self hosting is not for everyone » — ce n'est pas la voie de ce kit ; ne l'engage pas sans que l'utilisateur l'ait demandé.
3. **Deux images Docker sur le VPS, un reverse-proxy TLS devant** (Caddy ou Traefik : certificat Let's Encrypt automatique). `ton-domaine.fr` → un serveur web qui sert le dossier statique du site ; `admin.ton-domaine.fr` → le serveur Node du dashboard. Le kit ne fournit pas ces `Dockerfile` : écris-les avec l'utilisateur, une image à la fois.
4. ⚠️ **`PUBLIC_CONVEX_URL` et `SITE_URL` se passent AU BUILD de l'image du site**, pas à son démarrage : les pages publiques lisent Convex à ce moment-là. Passées au `run`, elles arrivent trop tard et le site part **sans contenu**. Côté dashboard, `PUBLIC_CONVEX_URL` et `BETTER_AUTH_URL` vont au démarrage du conteneur ; `BETTER_AUTH_SECRET` ne quitte jamais Convex.
5. Renseigne `site` dans `site/astro.config.mjs` **avant** le build : le sitemap (`@astrojs/sitemap`) et les URLs absolues en dépendent. Puis vérifie en prod que `/sitemap-index.xml` et `/robots.txt` répondent.
6. ⛔ **Publier dans le dashboard ne met PAS le site à jour** : les pages en ligne restent celles du dernier build. Le rebuild fait donc partie de la publication — `npm run build --workspace site`, et sur le VPS `docker compose build site && docker compose up -d site` (services nommés `site` et `dashboard`). **Décide qui le déclenche avant la mise en ligne**, et écris-le dans le README : à la main juste après avoir publié · un `cron` sur le VPS, avec le retard annoncé à qui publie · la fonction Convex qui publie appelant une URL de reconstruction protégée par un jeton.

Termine par : l'URL/artefact de prod + comment vérifier que ça tourne.
