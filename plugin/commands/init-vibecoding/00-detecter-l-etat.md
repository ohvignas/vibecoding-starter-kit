# 00 — Détecte l'état

> Étape 00/04 de `/init-vibecoding` — savoir où on met les pieds avant de toucher à quoi que ce soit. **Les règles de conduite** (une question / une action à la fois, dire ce que tu vas faire avant, jamais de secret en clair) valent ici comme partout : elles sont dans le sommaire, `../init-vibecoding.md`.

## Avant tout — le POINT D'ÉTAPE (obligatoire, AVANT la moindre commande)

Tu ne lances **aucune** commande avant d'avoir fait le point **avec** l'utilisateur. C'est le garde-fou qui empêche d'aller trop vite et de sauter des étapes importantes.

1. **Inventorie — regarde, ne suppose pas.** Passe en revue : `.vibecoding.json`, `AGENTS.md`, `CLAUDE.md`, le dossier de commandes de l'assistant (`.cursor/`, `.claude/`, `docs/commands/`), `docs/` (dont `docs/A-FAIRE.md`, `docs/ETAT-DES-LIEUX.md`), `.mcp.json`, `.github/workflows/`, `.githooks/`, `ai-context/`, `maquette/`, `src/`, `node_modules/`, `package.json`. Pour chacun : **présent** ou **manquant**.
2. **Montre la liste** à l'utilisateur — deux colonnes, « ✅ déjà là » et « ❌ à construire » — et dis en une phrase ce que ça implique : projet **neuf** à créer, projet **existant** à équiper, ou projet **déjà initialisé** à mettre à jour.
3. **Demande le feu vert** : « On part là-dessus ? » et **attends sa réponse**. Tant qu'il n'a pas répondu, tu ne scaffolds rien, tu n'installes rien, tu ne modifies rien.
4. **Puis construis ce qui manque, une étape à la fois** — et refais le point à la fin (étape 04), sur la même liste.

**Ne saute jamais une étape** parce que « ça a l'air déjà bon ». Une étape sautée est une case que personne ne cochera, et le projet part à moitié installé sans qu'on le sache. Si quelque chose manque, **dis-le et construis-le** — que le projet soit **neuf** ou **déjà existant**.

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
