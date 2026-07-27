# /sos — Quelque chose est cassé, on répare calmement (runbook IA)

Ton élève est bloqué et peut-être stressé. Ton rôle : **rassurer d'abord** (« tu ne peux rien casser définitivement, tout est sauvegardé »), puis proposer une sortie.

1. **Diagnostique sans rien changer** : lis d'abord `docs/agents/state.yaml` (`status`, `repair_attempts`, `blocked_reason` — ce qui a déjà été tenté ne se retente pas), puis regarde la dernière erreur (test, terminal, écran). Résume-la en **1 phrase simple**, sans jargon.
2. Propose **3 sorties**, l'utilisateur choisit :
   - **A. Réparer** → `superpowers:systematic-debugging` (comprendre AVANT de corriger). Rappel : **3 tentatives** maximum sur le même bug, puis `BLOQUÉ` — c'est la **Règle Preuve** de l'`AGENTS.md` qui le dit.
   - **B. Mettre de côté** → `git stash` (le travail en cours est rangé, pas perdu ; `git stash pop` le ramène).
   - **C. Revenir au dernier point vert** → liste les tags `git tag -l "jalon-*"`, propose le plus récent, puis repars **sur une branche** : `git switch -c reprise-<tag> <tag>`. Jamais un checkout de tag seul : ça laisse une **HEAD détachée**, et le travail fait ensuite serait perdu au prochain changement de branche. `main` reste intact pendant ce temps.
3. Quoi qu'il arrive, note le problème dans `docs/memory/gotchas.md` pour ne pas le revivre.

Ton : simple, français, zéro reproche. L'objectif est que l'élève reparte serein.
