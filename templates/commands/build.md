# /build — Construire la roadmap, jalon par jalon (runbook IA)

Argument : `$ARGUMENTS` = l'option éventuelle (`--all`).
> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), traite l'appel comme un `/build` nu : **un** jalon, puis on redemande.

Tu exécutes `docs/ROADMAP.md` **une tranche à la fois**, en montrant un résultat **visuel** à chaque étape. Réutilise la boucle du kit (`superpowers:subagent-driven-development` ; cadre de délégation : **« Règle sous-agents »** dans `AGENTS.md`). En français.

## Un tour = un jalon
1. **Lis `docs/ROADMAP.md`** → prends le **1er jalon non coché** dont les dépendances sont cochées. (Rien n'est en mémoire volatile : la roadmap est la source de vérité, relue à chaque tour.)
2. **Plan** : si `docs/superpowers/plans/NN-*.md` du jalon n'existe pas → crée-le avec `superpowers:writing-plans` (dérivé du PRD + `docs/design.md` + la **maquette** `maquette/` (l'écran cible du jalon) + `docs/DOMAINS.md` pour les domaines).
3. **Exécute** le plan avec `superpowers:subagent-driven-development` (TDD + review + fix). C'est la **boucle** du projet.
4. **Montre le visuel** (voir **« Règle de vérification »** dans `AGENTS.md`) : lance l'app (`docs/RUN.md`) et vérifie le `✅ Ce que tu vois` du jalon — navigateur (web), simulateur (mobile), fenêtre (desktop), screenshot à l'appui. **Compare à l'écran correspondant de `maquette/`** : le rendu doit s'en approcher. Non atteint → `superpowers:systematic-debugging`, on ne passe pas au suivant.
5. **Rejoue le parcours en vrai, mais pas dans ce fil** : délègue l'end-to-end au sous-agent **`test-runner`** (contexte frais, MCP Playwright en web · Maestro en mobile · chrome-devtools en desktop) avec le flux, les critères du jalon et l'écran de départ. Toi, tu as écrit le code : ton propre test ne prouve rien.
6. **Gate avant de cocher** : lance le sous-agent **`verificateur`** (contexte frais, diff du jalon + critères), puis **`security-reviewer`** sur les features touchées. Tant que l'un des deux ne répond pas **PROUVÉ**, le jalon n'est **pas** coché : corrige, ou arrête-toi et dis ce qui bloque. Tu ne touches pas à l'état du projet : le `verificateur` est le **seul écrivain de `docs/agents/state.yaml`** (il y consigne `status`, `repair_attempts`, `blocked_reason`).
7. **Coche** le jalon dans `docs/ROADMAP.md`, note tout piège dans `docs/memory/`, commit — puis pose un **point de restauration** : un tag **annoté**, `git tag -a jalon-NN-<slug> -m "jalon NN"` (NN = numéro du jalon), et **publie-le avec le commit** : `git push -u origin main --follow-tags`. Le tag doit être **annoté** : `--follow-tags` ne pousse que ceux-là, un `git tag` nu resterait en local — et un tag resté en local ne sauve rien si la machine lâche. C'est le filet de `/sos` (retour à un état qui marche).
   - **Avant de pousser, vérifie qu'il y a où pousser** : `git remote`. Un projet qui sort du scaffold n'a **aucun** dépôt distant, et le push répondrait `fatal: No configured push destination` — un débutant ne doit pas découvrir ça au 1er jalon. Réponse vide → propose `gh repo create` (+ `gh auth status` si besoin) et relie le projet. S'il préfère rester en local, dis-le en une phrase — le point de restauration existe, mais il **ne survivra pas** à la perte de la machine — coche le jalon et continue.
8. **Gate** : demande « on continue au jalon suivant ? ». **`--all` (enchaîner toute la roadmap sans repasser par l'utilisateur) est désactivé** tant que le mode apprentissage est actif : le but est qu'il **voie** chaque jalon marcher. Si on te le demande quand même, dis-le et continue jalon par jalon, en montrant le visuel + une ligne de progrès à chaque tour.

## Jalon 0 (fondations)
Joue `docs/A-FAIRE.md` (plugins/skills/MCP), scaffold la stack, fais **démarrer** l'app. Visuel = l'app boote.

## Fini quand
Tous les jalons de `docs/ROADMAP.md` sont cochés **et** chaque `✅ Ce que tu vois` a été constaté en vrai. Si un blocage externe empêche d'aller au bout → dis exactement ce qui manque.
