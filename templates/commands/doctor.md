# /doctor — Diagnostic du projet (runbook IA)

Vérifie que le projet est bien configuré et rends un rapport clair (✓ / ✗ + comment corriger). Ne modifie rien sans demander.

1. **AGENTS.md** et **CLAUDE.md** présents à la racine.
2. **docs/memory/index.md** présent (+ gotchas/conventions/decisions/archive).
3. **MCP** : `.mcp.json` (Claude Code/Codex) ou `.cursor/mcp.json` (Cursor) présent si stack SaaS/mobile.
4. **Secrets non commités** : `git ls-files | grep -E '(^|/)\.env$'` doit être VIDE. Sinon → alerte : retire le fichier du suivi (`git rm --cached <fichier>`) et vérifie `.gitignore`.
5. **.gitignore** ignore bien `.env`.
6. **Commandes** installées : `/new-project`, `/new-feature`, `/edit-design`.
7. **Workflows** : `.github/workflows/{ci,secrets,dream,memory-consolidate}.yml` présents.
8. **Node ≥ 20.12** et **git** disponibles.

Termine par un résumé : ce qui va, ce qui manque, et les commandes exactes pour corriger.
