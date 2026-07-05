# Outils IA installés (correspondances par assistant)

- **superpowers** (PILOTE, dans l'assistant) : Cursor `/add-plugin superpowers` · Claude Code `/plugin install superpowers@claude-plugins-official` · Codex `/plugins`.
- **skills design (5)** : frontend-design, ui-ux-pro-max, web-design-guidelines, shadcnblocks, brand-guidelines (à installer dans l'assistant).
- **Commandes générées** : `/new-project`, `/new-feature`, `/edit-design` (dans `.cursor/commands` / `.claude/commands` / `docs/commands`).
- **Mémoire** : `docs/memory/` (index via `@import`). **Dream** : `.github/workflows/dream.yml` (propose-only).
- **karpathy** : copié depuis `multica-ai/andrej-karpathy-skills` (fichiers, pas le marketplace).
- **awesome-cursorrules** : Cursor uniquement (sous-ensemble ciblé) ; sauté ailleurs.
- **caveman** (optionnel, coûts) : installé par `setup.mjs` **seulement** avec le drapeau `--caveman` (défaut : non). Compresse la sortie de l'IA. ⚠️ Coupe les explications utiles à l'apprentissage — voir `guides/03-securite-et-couts.md`.

Règle d'or (déjà écrite dans l'`AGENTS.md` du projet) : **superpowers pilote la boucle** ; karpathy + cursorrules = garde-fous passifs.

## Hors installeur (ressources optionnelles à documenter, pas à installer d'office)
- **Strix** (sécurité) : scan de vulnérabilités avant publication. **Pas** dans l'installeur (exige Docker + clé LLM payante). Voir `guides/03-securite-et-couts.md`.
