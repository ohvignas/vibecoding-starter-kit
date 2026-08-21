# 00 — Détecte l'état

> Étape 00/04 de `/init-vibecoding` — savoir où on met les pieds avant de toucher à quoi que ce soit. **Les règles de conduite** (une question / une action à la fois, dire ce que tu vas faire avant, jamais de secret en clair) valent ici comme partout : elles sont dans le sommaire, `../init-vibecoding.md`.

## Étape 0 — Détecte l'état
Regarde si **`.vibecoding.json`** existe dans le dossier courant.

- **Il existe** → le projet est **déjà initialisé**. Lis sa `kitVersion`. Dis-le, et propose de **mettre à jour** :
  1. Montre d'abord ce qui changerait : `npx -y create-vibecoding-kit@latest --project . --refresh --dry-run`.
  2. Si l'utilisateur est d'accord : `npx -y create-vibecoding-kit@latest --project . --refresh`.
  3. Si le message parle d'« ancienne version / bloc en double », **ouvre `AGENTS.md`** et supprime l'ancien bloc de règles sous `vibecoding:end` (garde ses notes perso). Explique-lui ce que tu fais.
  → **Stop ici** (pas de re-scaffold). Termine par « ton projet est à jour ✅ ».

- **Il n'existe pas, mais le dossier contient déjà quelque chose** (autre chose que `.git/`, `node_modules/`, `.DS_Store`) → c'est un **projet qui existe déjà**. Ne scaffolde **jamais** par-dessus :
  1. **Montre-lui ce que tu vois** (2 ou 3 fichiers suffisent) et demande si c'est bien ce projet-là qu'il veut équiper. Ne devine pas à sa place.
  2. S'il confirme : `npx -y create-vibecoding-kit@latest --adopt` **depuis ce dossier**. Le kit lui demande son assistant, n'écrase aucun fichier, et ne revendique **aucune techno**.
  → **Stop ici** : pas de scaffold, pas de `--stack`. Termine par « la méthode est installée dans ton projet ✅ ».

- **Il n'existe pas** → nouveau projet, continue.
  (Ce cas suppose un dossier **vide** : s'il contient déjà du code, c'est le cas juste au-dessus.)
