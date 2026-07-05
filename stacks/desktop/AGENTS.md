# Règles projet pour l'IA — App desktop (Electron)

> Copie ce fichier à la **racine de ton projet**. Claude Code et Cursor le lisent automatiquement.
> Renomme-le en `CLAUDE.md` si tu utilises uniquement Claude Code.

## Contexte du projet
Je construis une **app desktop** (Windows / Mac / Linux) avec **Electron** (HTML/CSS/JS + Chromium + Node.js). Je débute. Explique simplement et avance **une étape à la fois**.

## Règle spéciale : utilise les skills Electron
Cet environnement Claude Code contient des **skills Electron officiels**. Utilise-les activement :
- `electron:create-app` pour démarrer, `electron:add-ipc` pour la communication, `electron:add-feature` pour tray/notifications/raccourcis, `electron:security` / `electron:security-audit` pour la sécurité, `electron:distribution` pour packager, `electron:doctor` si l'app est cassée.
- Quand je te demande quelque chose sur Electron, **appuie-toi sur le skill correspondant**.

## Règles d'architecture
- Comprends et respecte le **modèle de processus** : `main` (Node.js, gère fenêtres + système) vs `renderer` (affiche l'UI, comme une page web). Doc : https://www.electronjs.org/docs/latest/tutorial/process-model
- La communication renderer ↔ main passe par un **canal IPC sûr** : `preload` + `contextBridge` côté renderer, `ipcMain.handle` côté main. **Jamais** `nodeIntegration: true` avec du contenu distant.

## Sécurité (checklist officielle — non négociable)
- Garde **`contextIsolation: true`** et **`sandbox: true`**, **`nodeIntegration: false`** dans les `webPreferences`.
- Définis une **Content-Security-Policy**. Valide l'expéditeur des messages IPC. N'ouvre pas d'URL externe sans `shell.openExternal` contrôlé.
- Réfère-toi à : https://www.electronjs.org/docs/latest/tutorial/security (et au skill `electron:security`).

## Outillage
- Scaffolding + packaging via **Electron Forge** : `npx create-electron-app@latest mon-app` ; build : `npm run make`.
- ⚠️ Electron **ne publie pas** de `llms.txt` ni de MCP officiel — ne cherche pas ces fichiers, appuie-toi sur les **skills locaux** et la doc officielle https://www.electronjs.org/docs/latest.

## Bonnes pratiques
- Ne mets jamais de secret dans le code renderer.
- Commit Git après chaque étape qui fonctionne.
