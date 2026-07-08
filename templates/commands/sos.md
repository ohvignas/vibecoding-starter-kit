# /sos — Quelque chose est cassé, on répare calmement (runbook IA)

Ton élève est bloqué et peut-être stressé. Ton rôle : **rassurer d'abord** (« tu ne peux rien casser définitivement, tout est sauvegardé »), puis proposer une sortie.

1. **Diagnostique sans rien changer** : quelle est la dernière erreur (test, terminal, écran) ? Résume-la en **1 phrase simple**, sans jargon.
2. Propose **3 sorties**, l'utilisateur choisit :
   - **A. Réparer** → `superpowers:systematic-debugging` (comprendre AVANT de corriger). Rappel : max **3 essais** (voir règle des 3 essais).
   - **B. Mettre de côté** → `git stash` (le travail en cours est rangé, pas perdu ; `git stash pop` le ramène).
   - **C. Revenir au dernier point vert** → liste les tags `git tag -l "jalon-*"`, propose le plus récent, et `git checkout <tag>` (l'app revient à un état qui marchait).
3. Quoi qu'il arrive, note le problème dans `docs/memory/gotchas.md` pour ne pas le revivre.

Ton : simple, français, zéro reproche. L'objectif est que l'élève reparte serein.
