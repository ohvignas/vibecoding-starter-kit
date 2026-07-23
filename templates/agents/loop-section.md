## Boucle d'itération (NON négociable)

Tout changement suit ce cycle. Chaque flèche = un livrable validé avant la suite :

`brainstorming → plan → exécution (sub-agents, TDD) → review → test live → sécu → commit → PR → CI → merge (dev)`

| Étape | Skill à invoquer |
|---|---|
| Brainstorming | `superpowers:brainstorming` |
| Plan | `superpowers:writing-plans` |
| Exécution (TDD) | `superpowers:subagent-driven-development` + `superpowers:test-driven-development` |
| Review code | `superpowers:requesting-code-review` + `/code-review` |
| Test live | **« Règle de vérification »** (ce fichier) + `docs/RUN.md` — navigateur/screenshot web · fenêtre desktop · simulateur mobile, parcours E2E via le sous-agent `test-runner` |
| Sécurité | `/security-review` |
| Commit | `commit-commands:commit` (Conventional Commits) |
| PR | `commit-commands:commit-push-pr` |
| CI | `gh pr checks <n>` + `gh run watch <id> --exit-status` |
| Merge (dev) | `superpowers:finishing-a-development-branch` (squash) |

**Transverses** : jamais de code avant plan validé ; toujours **TDD** ; `superpowers:verification-before-completion` avant de dire « fini » (preuve par la commande) ; `superpowers:systematic-debugging` avant tout fix ; **un worktree par feature** (`superpowers:using-git-worktrees`).

**Règle des 3 essais (anti-boucle infinie)** : si 3 corrections successives sur le **même** bug échouent → STOP. Reviens au dernier état vert (dernier commit/tag `jalon-*`), écris le bug dans `docs/memory/gotchas.md`, et **repars d'une conversation neuve**. Ne t'acharne jamais : re-corriger en boucle empire le code.

**Finir le travail — anti-flemme (NON négociable)** : une IA a tendance à s'arrêter à moitié, reporter, ou faire semblant. Interdit ici :
- **Zéro placeholder** : jamais `// TODO`, `// reste du code`, `// … inchangé`, `...`, ni fonction stub qui renvoie une valeur bidon. Chaque fonction est **entièrement écrite** ou pas incluse. Tu produis le **contenu complet**, pas un squelette.
- **Zéro report** : interdit « pour l'instant », « on verra plus tard », « à compléter ensuite », « je te laisse finir ». Tu termines le **périmètre complet** de l'étape demandée, maintenant.
- **Bloqué ≠ à moitié** : si tu ne peux VRAIMENT pas finir (info manquante, décision humaine), **dis-le explicitement** — ce qui bloque + pourquoi — et pose la question. Ne rends **jamais** du travail partiel en le présentant comme fini.
- **« Fini » = prouvé** : ne dis jamais « c'est fait » sans avoir **lancé la vérification** (test qui passe **et** l'app relancée pour voir le résultat). Voir la définition de « fini » ci-dessous.
- **Un petit pas COMPLET > un grand pas à moitié** : découpe si besoin, mais chaque morceau livré est **terminé et vérifié**.

**Définition de « fini » (NON négociable)** : mergé sur `dev` (CI verte + review OK, un PR à la fois) **ET** testé en live par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche le test live → le signaler explicitement comme seul motif d'arrêt.
