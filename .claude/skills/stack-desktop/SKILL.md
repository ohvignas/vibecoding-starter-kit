---
name: stack-desktop
description: Use when building a desktop app (Windows/Mac/Linux) with Electron in the vibecoding course. Triggers on "app desktop", "Electron", "logiciel bureau", "desktop app", or any installable computer app for beginners. Routes to the official electron:* skills and enforces secure defaults.
---

# Stack Desktop — Electron

Aide un·e débutant·e à construire une app desktop avec Electron. Réponds en français, simplement, **une étape à la fois**.

## Règle n°1 : utilise les skills electron:* officiels
Cet environnement a des skills Electron complets. Appuie-toi dessus au lieu de coder à l'aveugle :
- `electron:create-app` — démarrer (sécurisé par défaut)
- `electron:add-ipc` — communication renderer ↔ main sûre
- `electron:add-feature` — tray, notifications, raccourcis, deep links
- `electron:security` / `electron:security-audit` — sécurité (checklist 20 points)
- `electron:distribution` / `electron:package` — packaging, signature, auto-update
- `electron:doctor` — réparer (fenêtre blanche, crash démarrage)
- `electron:process-model-ipc`, `electron:testing-debugging`, `electron:review`, `electron:explain`

## Ordre de construction
1. `electron:create-app` (TypeScript + Vite).
2. Interface (renderer) en HTML/CSS.
3. IPC sûr si besoin d'accès système (`electron:add-ipc`).
4. Fonctionnalités natives (`electron:add-feature`).
5. Audit sécurité (`electron:security-audit`), puis packaging (`electron:distribution`).

## Sécurité (non négociable)
`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. CSP définie. Valider l'expéditeur IPC. Doc : https://www.electronjs.org/docs/latest/tutorial/security

## Setup
```bash
npx create-electron-app@latest mon-app --template=vite-typescript
cd mon-app && npm start
npm run make   # packager en installateur
```

## À savoir
- ⚠️ Electron **ne publie pas** de `llms.txt` ni de MCP officiel — ne les cherche pas. Doc officielle : https://www.electronjs.org/docs/latest
- Fichier de règles à copier dans le projet : `stacks/desktop/AGENTS.md`.
