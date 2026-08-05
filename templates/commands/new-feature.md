# /new-feature — Boucle de livraison d'une feature (runbook IA)

Argument : `$ARGUMENTS` = description de la feature à construire.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.
Suis la **boucle d'itération** de l'`AGENTS.md`, sans sauter d'étape. **Gates humains** au brainstorm et au plan ; autonome ensuite jusqu'au merge.
> **Deux chantiers en même temps ?** Un **worktree par chantier** (`superpowers:using-git-worktrees`) — jamais deux agents dans le même dossier. **Un seul serveur de dev** partagé : avant d'en lancer un, regarde s'il tourne déjà (`docs/RUN.md`). Et si tu touches au **schéma** de la base, **dis-le avant de le faire** — l'autre chantier travaille dessus.

## Boucle
> Ses 5 étapes vivent dans le dossier `new-feature/` posé **à côté de ce fichier** : `.cursor/commands/new-feature/` (Cursor) · `.claude/commands/new-feature/` (Claude Code) · `docs/commands/new-feature/` (Codex). Pour chacune : **ouvre le fichier, fais ce qu'il dit, passe à la suivante**. N'en saute aucune et ne la résume pas de mémoire — la sortie d'une étape est l'entrée de la suivante.
> *(Chez Codex, ce fichier-ci contient déjà les 5 étapes à la suite : tu peux simplement continuer à lire, dans le même ordre.)*

- [ ] **00** `new-feature/00-preflight.md` → GitHub joignable, un **remote** relié, et un **worktree** isolé sur une branche `feat/…`
- [ ] **01** `new-feature/01-spec-de-feature.md` → la **spec de feature** validée : story, `AC-*` testables, périmètre, plan de test live (gate)
- [ ] **02** `new-feature/02-plan-et-execution.md` → le **plan TDD** validé (gate), puis le code écrit tâche par tâche, test rouge → vert
- [ ] **03** `new-feature/03-verification.md` → le diff relu, **chaque `AC` vérifié en vrai**, la sécu passée, et le verdict **PROUVÉ** obtenu
- [ ] **04** `new-feature/04-livraison.md` → commit, PR, **CI verte**, la branche mergée sur `main`, et le contrôle de fin
