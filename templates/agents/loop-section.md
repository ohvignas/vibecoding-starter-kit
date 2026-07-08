## Boucle d'itération (NON négociable)

Tout changement suit ce cycle. Chaque flèche = un livrable validé avant la suite :

`brainstorming → plan → exécution (sub-agents, TDD) → review → test live → sécu → commit → PR → CI → merge (dev)`

| Étape | Skill à invoquer |
|---|---|
| Brainstorming | `superpowers:brainstorming` |
| Plan | `superpowers:writing-plans` |
| Exécution (TDD) | `superpowers:subagent-driven-development` + `superpowers:test-driven-development` |
| Review code | `superpowers:requesting-code-review` + `/code-review` |
| Test live | `/verify` + `/run` (navigateur pour le web, fenêtre pour desktop, smoke pour mobile) |
| Sécurité | `/security-review` |
| Commit | `commit-commands:commit` (Conventional Commits) |
| PR | `commit-commands:commit-push-pr` |
| CI | `gh pr checks <n>` + `gh run watch <id> --exit-status` |
| Merge (dev) | `superpowers:finishing-a-development-branch` (squash) |

**Transverses** : jamais de code avant plan validé ; toujours **TDD** ; `superpowers:verification-before-completion` avant de dire « fini » (preuve par la commande) ; `superpowers:systematic-debugging` avant tout fix ; **un worktree par feature** (`superpowers:using-git-worktrees`).

**Règle des 3 essais (anti-boucle infinie)** : si 3 corrections successives sur le **même** bug échouent → STOP. Reviens au dernier état vert (dernier commit/tag `jalon-*`), écris le bug dans `docs/memory/gotchas.md`, et **repars d'une conversation neuve**. Ne t'acharne jamais : re-corriger en boucle empire le code.

**Définition de « fini » (NON négociable)** : mergé sur `dev` (CI verte + review OK, un PR à la fois) **ET** testé en live par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche le test live → le signaler explicitement comme seul motif d'arrêt.
