# 02 — Scaffold

> Étape 02/04 de `/init-vibecoding` — la seule commande qui crée le projet. Elle prend les réponses de `01-les-2-questions.md`. **Les règles de conduite** (une question / une action à la fois, dire ce que tu vas faire avant, jamais de secret en clair) valent ici comme partout : elles sont dans le sommaire, `../init-vibecoding.md`.

## Étape 2 — Scaffold (tu le fais)
Lance (remplace `<stack>`, `<assistant>`, `<dossier>` ; `.` = dossier courant). Les valeurs sont
**littérales** : le CLI refuse tout le reste et sort en erreur — pas de « Claude Code », pas de `claude`.

```bash
# <stack> = saas | mobile | desktop | vitrine
# <assistant> = cursor | claude-code | codex
npx -y create-vibecoding-kit@latest --stack <stack> --assistant <assistant> --project <dossier> --yes
```

Montre le résultat, confirme que les fichiers sont créés (AGENTS.md, docs/, .mcp.json…).
