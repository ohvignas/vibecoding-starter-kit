# /init-vibecoding — Tout installer (ou mettre à jour) pour toi (runbook IA)

Tu installes l'environnement vibecoding **à la place de l'utilisateur** : tu exécutes les commandes du terminal, tu poses les questions en **langage simple**, tu expliques. L'utilisateur répond juste dans le chat. En français, chaleureux, zéro jargon non expliqué.

## Étape 0 — Détecte l'état
Regarde si **`.vibecoding.json`** existe dans le dossier courant.

- **Il existe** → le projet est **déjà initialisé**. Lis sa `kitVersion`. Dis-le, et propose de **mettre à jour** :
  1. Montre d'abord ce qui changerait : `npx -y create-vibecoding-kit@latest --project . --refresh --dry-run`.
  2. Si l'utilisateur est d'accord : `npx -y create-vibecoding-kit@latest --project . --refresh`.
  3. Si le message parle d'« ancienne version / bloc en double », **ouvre `AGENTS.md`** et supprime l'ancien bloc de règles sous `vibecoding:end` (garde ses notes perso). Explique-lui ce que tu fais.
  → **Stop ici** (pas de re-scaffold). Termine par « ton projet est à jour ✅ ».

- **Il n'existe pas** → nouveau projet, continue.

## Étape 1 — Les 2 questions (simples)
1. **Quel type d'app ?** (donne des exemples) :
   - **saas** — site/app web avec comptes (SaaS, dashboard, réservation…)
   - **mobile** — app iPhone/Android
   - **desktop** — logiciel installable (Windows/Mac/Linux)
   - **vitrine** — site vitrine / portfolio / blog (optimisé Google + IA)
2. **Le nom du projet ?** (ou « ici » pour installer dans le dossier courant).

L'**assistant** = celui où tu tournes (Cursor / Claude Code / Codex) — ne le demande pas, déduis-le.

## Étape 2 — Scaffold (tu le fais)
Lance (remplace `<stack>`, `<assistant>`, `<dossier>` ; `.` = dossier courant) :

```bash
npx -y create-vibecoding-kit@latest --stack <stack> --assistant <assistant> --project <dossier> --yes
```

Montre le résultat, confirme que les fichiers sont créés (AGENTS.md, docs/, .mcp.json…).

## Étape 3 — Onboarding (déroule `docs/A-FAIRE.md` AVEC lui)
Ouvre **`docs/A-FAIRE.md`** (généré, adapté à sa stack) et traite chaque section :
- **Ce que tu peux faire toi** : skills (`npx skills add …` s'ils manquent), MCP en ligne de commande pour Claude Code (`claude mcp add …`). Fais-les, montre le résultat.
- **Ce qui demande son clic** (explique simplement, une action à la fois) : installer le plugin **superpowers**, installer le plugin de sa stack s'il y en a un, autoriser les **MCP** (toggle Cursor / `/mcp`). Attends qu'il confirme avant de passer au suivant.
- Coche mentalement chaque case ; ne le noie pas — **une étape à la fois**.

## Étape 4 — Vérifie + lance
- Si superpowers est installé : lance **`/doctor`** (dit ce qui manque encore).
- Termine : « Tout est prêt 🎉 — tape **`/new-project`** et décris ton idée, je m'occupe du reste. »

## Règles
- Ne submerge pas : **une question / une action à la fois**, attends la réponse.
- Chaque commande terminal : dis **ce que tu vas faire** avant, montre le résultat après.
- Jamais de secret en clair ; ne commit rien sans le dire.
