# /doctor — Diagnostic du projet (runbook IA)

Vérifie que le projet est bien configuré et rends un rapport clair (✓ / ✗ + comment corriger). Ne modifie rien sans demander.

1. **AGENTS.md** et **CLAUDE.md** présents à la racine.
2. **docs/memory/index.md** présent (+ gotchas/conventions/decisions/archive).
3. **MCP** : `.mcp.json` (Claude Code/Codex) ou `.cursor/mcp.json` (Cursor) présent (toutes les stacks ont des MCP — détail par stack à l'item 10).
4. **Secrets non commités** : `git ls-files | grep -E '(^|/)\.env$'` doit être VIDE. Sinon → alerte : retire le fichier du suivi (`git rm --cached <fichier>`) et vérifie `.gitignore`.
5. **.gitignore** ignore bien `.env`.
6. **Commandes (les 10)** installées dans le dossier de ton assistant — `.cursor/commands/` (Cursor) · `.claude/commands/` (Claude Code) · `docs/commands/` (Codex) : `/init-vibecoding`, `/help`, `/new-project`, `/build`, `/new-feature`, `/edit-design`, `/next`, `/sos`, `/doctor`, `/deploy`. Manquantes → `npx create-vibecoding-kit --refresh`.
7. **Étapes des runbooks découpés** : un runbook long n'est pas UN fichier — son entrée est une **checklist** dont chaque case `- [ ]` cite un fichier `<commande>/NN-nom.md`, posé dans un **sous-dossier à côté d'elle** (mêmes dossiers qu'à l'item 6). Ne devine aucun nom : pour chacune des 10 commandes, ouvre l'entrée, relève les chemins cités en case, **liste le sous-dossier**, **compare les deux listes**. Aucune case de ce genre = runbook non découpé, rien à vérifier pour lui. Un chemin cité sans fichier en face est un ✗ — **nomme-le tel quel** : la commande démarrerait, puis renverrait dans le vide dès sa première case. Manquantes → `npx create-vibecoding-kit --refresh`.
8. **Workflows** : `.github/workflows/{ci,secrets}.yml` présents.
9. **Node ≥ 20.12** et **git** disponibles.
10. **Environnement IA de la stack** :
   - `.mcp.json` (ou `.cursor/mcp.json`) contient les serveurs MCP de la stack (saas : convex, better-auth, shadcn, playwright ; mobile : convex, expo, maestro ; desktop : chrome-devtools, shadcn ; vitrine : astro-docs, shadcn, playwright).
   - `.githooks/checks.mjs` présent + `.githooks/pre-push` présent + `git config core.hooksPath` vaut `.githooks` (sinon : `git config core.hooksPath .githooks`).
   - Câblage checks : `.cursor/hooks.json` (Cursor) ou `.claude/settings.json` (Claude Code) référence `checks.mjs`.
   - Scripts `package.json` : `typecheck` (+ `lint` hors mobile) présents.
   - `docs/A-FAIRE.md` : s'il reste des cases `[ ]`, rappelle de les jouer.
   - (desktop) `.githooks/pre-push` lance `npm audit` (il tourne au `git push`). La sécurité **Electron**, elle, ne se scanne pas : c'est la checklist officielle des 20 points, à repasser avant de distribuer.
11. **Skills installés** : le dossier `.claude/skills/` (Claude Code/Codex) ou `.cursor/…` (Cursor) **du projet** contient bien les skills attendus (design + stack). Sinon → relance les commandes de `docs/A-FAIRE.md` section Skills.
12. **MCP joignables** : pour chaque serveur HTTP de `.cursor/mcp.json`/`.mcp.json`, teste `curl -m 5 -o /dev/null -s -w '%{http_code}' <url>` — un code (même 401/405) prouve qu'il répond ; « timeout » = pas joignable.
13. **Plugin superpowers** : demande à l'utilisateur de taper `/` et de chercher `superpowers:brainstorming` — s'il apparaît dans le menu, c'est bon. Sinon, réinstaller selon l'assistant :
    - Cursor : `/add-plugin superpowers`
    - Claude Code : `/plugin install superpowers@claude-plugins-official`
    - Codex : `/plugins` (chercher « Superpowers » puis installer)
14. **Maquette Stitch (optionnel)** : si l'utilisateur veut Stitch, vérifie que le MCP `stitch` est configuré **au niveau utilisateur** (la clé voyage dans l'en-tête `X-Goog-Api-Key` de ce serveur, il n'y a aucune variable d'environnement à poser dans le projet). Absent → section Stitch de `docs/A-FAIRE.md`.
15. **Mémoire partagée du crew** : `docs/agents/JOURNAL.md`, `docs/agents/state.yaml` et `docs/agents/inventaire.md` présents. Les sous-agents les reçoivent **par leur chemin** : absents, ils lisent le vide. Manquants → `npx create-vibecoding-kit --refresh`.
16. **Agents du crew (7)** présents dans le dossier de ton assistant : `.cursor/agents/` (Cursor) · `.claude/agents/` (Claude Code) · `docs/agents/crew/` (Codex). Attendus : `verificateur`, `test-runner`, `code-reviewer`, `security-reviewer`, `critique-produit`, `critique-donnees`, `critique-ux`. Manquants → `npx create-vibecoding-kit --refresh`.
17. **MCP de test branché** : `playwright` (saas, vitrine) · `maestro` (mobile) · `chrome-devtools` (desktop). Sans lui, le sous-agent `test-runner` ne peut rien prouver et répondra `BLOQUÉ`.
18. **Outils de preuve (optionnels, mais rien ne les remplace)** : `semgrep --version`, `gitleaks version`, `osv-scanner --version` répondent. Absents → `brew install semgrep gitleaks osv-scanner` (ou `pipx install semgrep`) ; sans eux l'agent sécurité ne peut produire aucune preuve et répondra `NON PROUVÉ`, et le gate sécurité de `/deploy` ne passera pas. `npx oxlint` et `npx knip` tournent sans installation : ne les signale pas comme manquants.

> `docs/A-FAIRE.md` est le **seul** fichier d'install : l'item 10 couvre déjà toutes ses cases `[ ]` (gestes de base **+** section « Pour ton projet » ajoutée par `/new-project`).

19. **Mises à jour du kit en attente (optionnel)** : liste les fichiers `*.new` du projet (`docs/RUN.md.new` et compagnie). Un `--refresh` ne réécrit **jamais** un fichier où tu as pu écrire : il dépose la version du kit à côté, en `.new`. Il y en a ? Dis-le, montre la différence, et laisse l'utilisateur choisir ce qu'il reprend — puis supprime le `.new` une fois traité. Aucun `.new` = rien à faire.

**Verdict final** : si TOUT est ✓ **de 1 à 17**, écris clairement : « ✅ Ton environnement est prêt — tu peux lancer `/new-project` ». C'est le **critère officiel de fin d'installation**. L'item **18 est optionnel** : signale-le s'il manque, avec ce qu'on y perd, mais il ne bloque pas le verdict. L'item **19 est optionnel** lui aussi : un `.new` non repris n'est pas une installation cassée. Sinon, liste les ✗ et la commande exacte pour chacun.

Termine par un résumé : ce qui va, ce qui manque, et les commandes exactes pour corriger.
