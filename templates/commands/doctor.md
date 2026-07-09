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
9. **Environnement IA de la stack** :
   - `.mcp.json` (ou `.cursor/mcp.json`) contient les serveurs MCP de la stack (SaaS : convex, better-auth, shadcn ; mobile : convex, expo ; desktop : chrome-devtools).
   - `.githooks/checks.mjs` présent + `.githooks/pre-push` présent + `git config core.hooksPath` vaut `.githooks` (sinon : `git config core.hooksPath .githooks`).
   - Câblage checks : `.cursor/hooks.json` (Cursor) ou `.claude/settings.json` (Claude Code) référence `checks.mjs`.
   - Scripts `package.json` : `typecheck` (+ `lint` hors mobile) présents.
   - `docs/SETUP-AI.md` : s'il reste des cases `[ ]`, rappelle de les jouer.
   - (desktop) le scan sécu `@doyensec/electronegativity` est câblé dans `.githooks/pre-push` (il tourne au `git push` et en CI).
10. **Skills installés** : le dossier `.claude/skills/` (Claude Code/Codex) ou `.cursor/…` (Cursor) **du projet** contient bien les skills attendus (design + stack). Sinon → relance les commandes de `docs/SETUP-AI.md` section Skills.
11. **MCP joignables** : pour chaque serveur HTTP de `.cursor/mcp.json`/`.mcp.json`, teste `curl -m 5 -o /dev/null -s -w '%{http_code}' <url>` — un code (même 401/405) prouve qu'il répond ; « timeout » = pas joignable.
12. **Plugin superpowers** : demande à l'utilisateur de taper `/brainstorm` — si reconnu, c'est bon ; sinon, réinstaller (`/add-plugin superpowers`).
13. **Maquette Stitch (optionnel)** : si l'utilisateur veut Stitch, vérifie que le MCP `stitch` est configuré (user-scope) et que la clé `STITCH_API_KEY` est présente dans l'environnement.
14. **docs/A-INSTALLER.md (après `/new-project`)** : s'il existe, liste les cases `[ ]` non cochées — ce sont les installs **spécifiques à ce projet** (paquets / MCP / secrets par domaine) que l'utilisateur doit encore faire.

**Verdict final** : si TOUT est ✓ (1 à 14), écris clairement : « ✅ Ton environnement est prêt — tu peux lancer `/new-project` ». C'est le **critère officiel de fin d'installation**. Sinon, liste les ✗ et la commande exacte pour chacun.

Termine par un résumé : ce qui va, ce qui manque, et les commandes exactes pour corriger.
