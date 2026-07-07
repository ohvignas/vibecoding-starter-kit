# Règles de review Bugbot — projet vibecoding

- **Sécurité d'abord** : signale tout secret / clé API / token dans le code ou un fichier `.env`.
- **Convex** : signale un accès DB hors `query`/`mutation` ; signale un argument sans validateur `v.*`.
- **Electron** : signale `nodeIntegration: true`, l'absence de `contextIsolation`, un IPC sans validation du `senderFrame`, `shell.openExternal` sur une entrée non fiable.
- **Qualité** : signale les `any`, les `catch` vides, les checks type/lint désactivés.
- **Débutant** : préfère une explication claire du bug + un correctif concret à une note laconique.

> Activer Bugbot : connecte le dépôt dans le dashboard Cursor (Settings → Bugbot). Ce fichier pilote la review ; l'activation est un réglage de compte.
