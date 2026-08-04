# 00 — Détecte l'état

> Étape 00/04 de `/init-vibecoding` — savoir où on met les pieds avant de toucher à quoi que ce soit. **Les règles de conduite** (une question / une action à la fois, dire ce que tu vas faire avant, jamais de secret en clair) valent ici comme partout : elles sont dans le sommaire, `../init-vibecoding.md`.

## Étape 0 — Détecte l'état
Regarde si **`.vibecoding.json`** existe dans le dossier courant.

- **Il existe** → le projet est **déjà initialisé**. Lis sa `kitVersion`. Dis-le, et propose de **mettre à jour** :
  1. Montre d'abord ce qui changerait : `npx -y create-vibecoding-kit@latest --project . --refresh --dry-run`.
  2. Si l'utilisateur est d'accord : `npx -y create-vibecoding-kit@latest --project . --refresh`.
  3. Si le message parle d'« ancienne version / bloc en double », **ouvre `AGENTS.md`** et supprime l'ancien bloc de règles sous `vibecoding:end` (garde ses notes perso). Explique-lui ce que tu fais.
  → **Stop ici** (pas de re-scaffold). Termine par « ton projet est à jour ✅ ».

- **Il n'existe pas** → nouveau projet, continue.
