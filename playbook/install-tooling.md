# Outils IA installés (correspondances par assistant)

- **superpowers** (PILOTE, dans l'assistant) : Cursor `/add-plugin superpowers` · Claude Code `/plugin install superpowers@claude-plugins-official` · Codex `/plugins`.
- **skills design (4)** : frontend-design, ui-ux-pro-max, web-design-guidelines, brand-guidelines — **installés par le wizard**. `shadcnblocks` n'en fait **pas** partie : c'est un *registry* du CLI shadcn (`npx shadcn add @shadcnblocks/<bloc>`), pas un skill.
- **Runbooks générés (10)** : `/help` (l'entrée), `/init-vibecoding`, `/new-project`, `/build`, `/new-feature`, `/edit-design`, `/doctor`, `/next`, `/sos`, `/deploy` — dans `.cursor/commands` / `.claude/commands` / `docs/commands`.
- **Crew (7 sous-agents)** : `verificateur`, `test-runner`, `code-reviewer`, `security-reviewer`, `critique-produit`, `critique-donnees`, `critique-ux` — dans `.cursor/agents/` / `.claude/agents/` / `docs/agents/crew/`. Leur mémoire partagée : `docs/agents/JOURNAL.md`, `state.yaml`, `inventaire.md`.
- **Mémoire** : `docs/memory/` (index via `@import`), consolidée **à la demande** dans le fil — aucune tâche planifiée.
- **Glossaire** : `guides/glossaire.md` est **embarqué** dans le projet, en `docs/glossaire.md` — c'est là qu'on envoie l'élève quand un mot bloque.
- **karpathy** : copié depuis `multica-ai/andrej-karpathy-skills` (fichiers, pas le marketplace). **C'est le seul dépôt externe que le wizard clone.**
- **caveman** (optionnel, coûts) : installé par `setup.mjs` **seulement** avec le drapeau `--caveman` (défaut : non). Compresse la sortie de l'IA. ⚠️ Coupe les explications utiles à l'apprentissage — voir `guides/03-securite-et-couts.md`.

Règle d'or (déjà écrite dans l'`AGENTS.md` du projet) : **superpowers pilote la boucle** ; karpathy = garde-fou passif.

## Hors installeur (ressources optionnelles à documenter, pas à installer d'office)
- **Strix** (sécurité) : scan de vulnérabilités avant publication. **Pas** dans l'installeur (exige Docker + clé LLM payante). Voir `guides/03-securite-et-couts.md`.
