# /doctor — Diagnostic du projet (runbook IA)

Vérifie que le projet est bien configuré et rends un rapport clair (✓ / ✗ + comment corriger). Ne modifie rien sans demander.

1. **AGENTS.md** et **CLAUDE.md** présents à la racine.
2. **docs/memory/index.md** présent (+ gotchas/conventions/decisions/archive).
3. **MCP** : `.mcp.json` (Claude Code/Codex) ou `.cursor/mcp.json` (Cursor) présent (toutes les stacks ont des MCP — détail par stack à l'item 9).
4. **Secrets non commités** : `git ls-files | grep -E '(^|/)\.env$'` doit être VIDE. Sinon → alerte : retire le fichier du suivi (`git rm --cached <fichier>`) et vérifie `.gitignore`.
5. **.gitignore** ignore bien `.env`.
6. **Commandes (les 10)** installées dans le dossier de ton assistant — `.cursor/commands/` (Cursor) · `.claude/commands/` (Claude Code) · `docs/commands/` (Codex) : `/init-vibecoding`, `/help`, `/new-project`, `/build`, `/new-feature`, `/edit-design`, `/next`, `/sos`, `/doctor`, `/deploy`. Manquantes → `npx create-vibecoding-kit --refresh`.
7. **Workflows** : `.github/workflows/{ci,secrets}.yml` présents.
8. **Node ≥ 20.12** et **git** disponibles.
9. **Environnement IA de la stack** :
   - `.mcp.json` (ou `.cursor/mcp.json`) contient les serveurs MCP de la stack (saas : convex, better-auth, shadcn, playwright ; mobile : convex, expo, maestro ; desktop : chrome-devtools, shadcn ; vitrine : astro-docs, shadcn, playwright).
   - `.githooks/checks.mjs` présent + `.githooks/pre-push` présent + `git config core.hooksPath` vaut `.githooks` (sinon : `git config core.hooksPath .githooks`).
   - Câblage checks : `.cursor/hooks.json` (Cursor) ou `.claude/settings.json` (Claude Code) référence `checks.mjs`.
   - Scripts `package.json` : `typecheck` (+ `lint` hors mobile) présents.
   - `docs/A-FAIRE.md` : s'il reste des cases `[ ]`, rappelle de les jouer.
   - (desktop) `.githooks/pre-push` lance `npm audit` (il tourne au `git push`). La sécurité **Electron**, elle, ne se scanne pas : c'est la checklist officielle des 20 points, à repasser avant de distribuer.
10. **Skills installés** : le dossier `.claude/skills/` (Claude Code/Codex) ou `.cursor/…` (Cursor) **du projet** contient bien les skills attendus (design + stack). Sinon → relance les commandes de `docs/A-FAIRE.md` section Skills.
11. **MCP joignables** : pour chaque serveur HTTP de `.cursor/mcp.json`/`.mcp.json`, teste `curl -m 5 -o /dev/null -s -w '%{http_code}' <url>` — un code (même 401/405) prouve qu'il répond ; « timeout » = pas joignable.
12. **Plugin superpowers** : demande à l'utilisateur de taper `/` et de chercher `superpowers:brainstorming` — s'il apparaît dans le menu, c'est bon. Sinon, réinstaller selon l'assistant :
    - Cursor : `/add-plugin superpowers`
    - Claude Code : `/plugin install superpowers@claude-plugins-official`
    - Codex : `/plugins` (chercher « Superpowers » puis installer)
13. **Maquette Stitch (optionnel)** : si l'utilisateur veut Stitch, vérifie que le MCP `stitch` est configuré **au niveau utilisateur** (la clé voyage dans l'en-tête `X-Goog-Api-Key` de ce serveur, il n'y a aucune variable d'environnement à poser dans le projet). Absent → section Stitch de `docs/A-FAIRE.md`.
14. **Mémoire partagée du crew** : `docs/agents/JOURNAL.md`, `docs/agents/state.yaml` et `docs/agents/inventaire.md` présents. Les sous-agents les reçoivent **par leur chemin** : absents, ils lisent le vide. Manquants → `npx create-vibecoding-kit --refresh`.
15. **Agents du crew (7)** présents dans le dossier de ton assistant : `.cursor/agents/` (Cursor) · `.claude/agents/` (Claude Code) · `docs/agents/crew/` (Codex). Attendus : `verificateur`, `test-runner`, `code-reviewer`, `security-reviewer`, `critique-produit`, `critique-donnees`, `critique-ux`. Manquants → `npx create-vibecoding-kit --refresh`.
16. **MCP de test branché** : `playwright` (saas, vitrine) · `maestro` (mobile) · `chrome-devtools` (desktop). Sans lui, le sous-agent `test-runner` ne peut rien prouver et répondra `BLOQUÉ`.
17. **Outils de preuve (optionnels, mais rien ne les remplace)** : `semgrep --version`, `gitleaks version`, `osv-scanner --version` répondent. Absents → `brew install semgrep gitleaks osv-scanner` (ou `pipx install semgrep`) ; sans eux l'agent sécurité ne peut produire aucune preuve et répondra `NON PROUVÉ`, et le gate sécurité de `/deploy` ne passera pas. `npx oxlint` et `npx knip` tournent sans installation : ne les signale pas comme manquants.

> `docs/A-FAIRE.md` est le **seul** fichier d'install : l'étape 9 couvre déjà toutes ses cases `[ ]` (gestes de base **+** section « Pour ton projet » ajoutée par `/new-project`).

**Verdict final** : si TOUT est ✓ **de 1 à 16**, écris clairement : « ✅ Ton environnement est prêt — tu peux lancer `/new-project` ». C'est le **critère officiel de fin d'installation**. L'item **17 est optionnel** : signale-le s'il manque, avec ce qu'on y perd, mais il ne bloque pas le verdict. Sinon, liste les ✗ et la commande exacte pour chacun.

Termine par un résumé : ce qui va, ce qui manque, et les commandes exactes pour corriger.
