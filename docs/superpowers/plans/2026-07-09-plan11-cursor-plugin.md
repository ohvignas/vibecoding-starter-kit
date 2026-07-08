# Plugin Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Steps use `- [ ]`.

**Goal:** Un **plugin Cursor** installable en un geste (`/add-plugin vibecoding` via Team Marketplace, ou marketplace officielle) qui donne les **9 commandes** (`/new-project`, `/build`, `/sos`…) + la **règle de base** dans Cursor — sans cloner. Complément de `npm create vibecoding` (qui, lui, scaffolde un vrai projet). Le publish reste manuel (Antoine).

**Architecture:** Un script `scripts/build-cursor-plugin.mjs` **assemble** le dossier `cursor-plugin/` à partir des templates du kit (source de vérité unique → jamais de dérive). Structure Cursor réelle (cursor.com/docs/plugins) : `.cursor-plugin/plugin.json` (name requis) + `commands/*.md` + `rules/*.mdc` (auto-découverts). On n'embarque PAS les hooks (chemins fragiles hors projet) ni le MCP (stack-spécifique + clés) — ça reste le job du wizard.

**Tech Stack:** Node ESM zéro dépendance, `node:test`.

## Global Constraints
- Node ESM zéro dépendance ; tests `node --test` ; node = `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.
- Français ; le dossier `cursor-plugin/` généré ne doit PAS parler de « formation ».
- `cursor-plugin/` NE doit PAS être embarqué dans le paquet npm (hors whitelist `files`).

---

## Tâche 1 : `scripts/build-cursor-plugin.mjs` + test
**Files:** Create `scripts/build-cursor-plugin.mjs`, `scripts/lib/cursor-plugin.test.mjs`.
**Interfaces:** `pluginManifest()` → `{name:'vibecoding',…}` ; `buildCursorPlugin(kitRoot, outDir)` → `{done:string[]}` (écrit `.cursor-plugin/plugin.json` + `commands/<9>.md` + `rules/00-project.mdc`).
Test : après build dans un tmpdir, `plugin.json` a `name:'vibecoding'`, `commands/new-project.md` et `commands/sos.md` existent, `rules/00-project.mdc` existe, et le contenu de `new-project.md` est identique au template source.

## Tâche 2 : générer + documenter
**Files:** run le script (commit `cursor-plugin/`), Modify `README.md` (+ section plugin Cursor), `PUBLISH.md` (+ étapes marketplace), `.gitignore` du kit si besoin (ne rien ignorer — on commit le plugin).
Lancer `node scripts/build-cursor-plugin.mjs`, committer `cursor-plugin/`. README : « Déjà un projet ? `/add-plugin vibecoding` (Cursor) pour les commandes ». PUBLISH.md : publier le plugin (Team Marketplace = importer le repo ; ou cursor.com/marketplace/publish).

## Auto-revue
- [ ] plugin.json valide (name), commandes + règle présentes, source = templates (pas de copie divergente).
- [ ] `cursor-plugin/` hors whitelist npm `files`.
