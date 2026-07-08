# /new-feature — Boucle de livraison d'une feature (runbook IA)

Argument : `$ARGUMENTS` = description de la feature à construire.
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.
Suis la **boucle d'itération** de l'`AGENTS.md` (issue de `templates/agents/loop-section.md`), sans sauter d'étape. **Gates humains** au brainstorm et au plan ; autonome ensuite jusqu'au merge.

> **Attribution** : le format story + critères d'acceptation ci-dessous est adapté de BMAD-METHOD (MIT © 2025 BMad Code, LLC). Adapté/traduit ; « BMAD » est une marque de BMad Code, LLC.

## Préflight
1. Vérifie GitHub : `gh auth status`. Vérifie le remote : `git remote`. Si aucun remote → propose `gh repo create` et relie le projet.
2. Crée un **worktree** isolé pour la feature (`superpowers:using-git-worktrees`) sur une branche `feat/…`.

## Boucle

### 1. Brainstorm → **Spec de feature** (`superpowers:brainstorming`) — gate
Scopé à la feature, référence `docs/PRD.md` (glossaire, UJ, FR concernés). Pose les questions **une à la fois**. Produis une **spec de feature** avec ce template, puis fais valider :

- **Intention** — quelle capacité, quel(s) parcours (UJ-X) et exigence(s) (FR-Y) du PRD ça réalise.
- **Story(s)** — format `En tant que [persona], je veux [action] [sous conditions], pour [bénéfice].` (numérote Story-1, Story-2… si plusieurs).
- **Critères d'acceptation (testables)** — `AC-1`, `AC-2`… chacun vérifiable : *« Étant donné [contexte], quand [action], alors [résultat observable]. »* Ce sont eux que le **test live** (étape 5) vérifiera.
- **Périmètre** — *dans* / *hors* (ce que cette feature ne fait **pas** ; renvoie aux Non-objectifs du PRD si besoin).
- **Impact** — fichiers/composants touchés, modèle de données, exigences non-fonctionnelles pertinentes (perf, sécu, accessibilité).
- **Plan de test live** — comment tu vérifieras en vrai (parcours navigateur / écran desktop / smoke mobile) que **chaque AC** passe.

→ **gate (validation utilisateur)**.

### 2. Plan (`superpowers:writing-plans`) — gate
Plan TDD, tâches bite-sized, **dérivées des critères d'acceptation** (chaque AC → au moins un test). → **gate (validation)**.

### 3. Exécution (`superpowers:subagent-driven-development` + TDD)
Tâche par tâche, test rouge → vert. Un `[À CLARIFIER]` bloquant → repasse par la gate.

### 4. Review code (`superpowers:requesting-code-review` + `/code-review`)
Bugs, conventions, sécurité du diff. Peut lancer le subagent `code-reviewer` sur le diff.

### 5. Test live — vérifie CHAQUE critère d'acceptation en vrai (`/verify` + `/run`)
Lance l'app et **valide chaque `AC-n`** de la spec : navigateur pour le web, fenêtre pour desktop, smoke pour mobile. Screenshot(s) à l'appui. Un AC non satisfait → retour étape 3 (`superpowers:systematic-debugging`).

### 6. Sécu (`/security-review`)
Revue sécurité des changements de la branche. Peut lancer le subagent `security-reviewer`.

### 7. Commit (`commit-commands:commit`, Conventional Commits)

### 8. PR (`commit-commands:commit-push-pr`)
Description = quoi + pourquoi + comment tester (les AC).

### 9. CI — surveille jusqu'au bout
`gh pr checks <n>` puis `gh run watch <id> --exit-status`. Rouge → diagnostiquer (`superpowers:systematic-debugging`), pas de merge.

### 10. Merge sur `dev` (`superpowers:finishing-a-development-branch`, squash)

## Fini quand
Mergé sur `dev` (CI verte + review OK, un PR à la fois) **ET** **chaque critère d'acceptation testé en live** par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche d'aller au bout → **dire exactement ce qui manque**.
