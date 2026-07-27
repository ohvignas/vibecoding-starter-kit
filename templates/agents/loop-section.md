## Boucle d'itération (NON négociable)

Le cycle, chaque étape validée avant la suite :

- **Brainstorming** `superpowers:brainstorming` · **Plan** `superpowers:writing-plans` · **Exécution** `superpowers:subagent-driven-development` + `superpowers:test-driven-development`.
- **Review code** `superpowers:requesting-code-review` puis le sous-agent **`code-reviewer`** · **Sécu** le sous-agent **`security-reviewer`** : ces sous-agents existent sur les 3 assistants, `/code-review` et `/security-review` seulement sur Claude Code.
- **Test live** « Règle de vérification » + `docs/RUN.md` : E2E délégué à `test-runner`, verdict par `verificateur`.
- **Commit** `git commit` (Conventional Commits) · **PR** `git push -u origin <branche>` puis `gh pr create` · **CI** `gh run watch <id> --exit-status` · **Merge (main)** `superpowers:finishing-a-development-branch` (squash).

**Transverses** : pas de code avant plan validé ; toujours **TDD** ; **un worktree par feature** (`superpowers:using-git-worktrees`) ; bloqué 3 fois → « Règle Preuve ».

**Finir le travail — anti-flemme (NON négociable)**. Une IA s'arrête à moitié, reporte, ou fait semblant :
- **Zéro placeholder** : jamais `// TODO`, `// reste du code`, `// … inchangé`, `...`, ni stub bidon. Chaque fonction est **entièrement écrite** ou pas incluse.
- **Zéro report** : ni « pour l'instant », ni « plus tard », ni « je te laisse finir ». Tu livres le **périmètre complet** de l'étape, maintenant.
- **Bloqué ≠ à moitié** : vraiment coincé (info manquante, décision humaine) → dis **quoi** et **pourquoi**, pose la question. Jamais de partiel présenté comme fini ; découpe plutôt.

**« Fini »** = mergé sur **`main`** (CI verte, review OK, un PR à la fois) **ET** parcours refait en vrai avec le `PROUVÉ` du `verificateur` (« Règle Preuve »). Tests + CI verte : nécessaires, **pas** suffisants. Seul motif d'arrêt admis : un blocage externe au test live — et il se dit.
