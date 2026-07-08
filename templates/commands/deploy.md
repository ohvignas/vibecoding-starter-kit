# /deploy — Mettre ton app en ligne (runbook IA)

Lis la stack dans `AGENTS.md`, puis applique le chemin correspondant. **Rappel sécu** : les secrets de production se mettent chez l'hébergeur (variables d'environnement), **jamais commités**.

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
1. `npm run build` puis `electron-builder` (installeurs Windows/Mac/Linux).
2. **Signature** obligatoire pour distribuer : voir le skill `electron:distribution` (Developer ID macOS + notarisation, Authenticode Windows).
3. Auto-update : `update-electron-app` / `autoUpdater` (voir `electron:distribution`).

Termine par : l'URL/artefact de prod + comment vérifier que ça tourne.
