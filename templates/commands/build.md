# /build — Construire la roadmap, jalon par jalon (runbook IA)

Tu exécutes `docs/ROADMAP.md` **une tranche à la fois**, en montrant un résultat **visuel** à chaque étape. Réutilise la boucle du kit (`superpowers:subagent-driven-development`). En français.

## Un tour = un jalon
1. **Lis `docs/ROADMAP.md`** → prends le **1er jalon non coché** dont les dépendances sont cochées. (Rien n'est en mémoire volatile : la roadmap est la source de vérité, relue à chaque tour.)
2. **Plan** : si `docs/superpowers/plans/NN-*.md` du jalon n'existe pas → crée-le avec `superpowers:writing-plans` (dérivé du PRD + `docs/design.md` + la **maquette** `maquette/` (l'écran cible du jalon) + `docs/DOMAINS.md` pour les domaines).
3. **Exécute** le plan avec `superpowers:subagent-driven-development` (TDD + review + fix). C'est la **boucle** du projet.
4. **Montre le visuel** : lance l'app (`docs/RUN.md`) et vérifie le `✅ Ce que tu vois` du jalon — navigateur (web), simulateur (mobile), fenêtre (desktop), screenshot à l'appui. **Compare à l'écran correspondant de `maquette/`** : le rendu doit s'en approcher. Non atteint → `superpowers:systematic-debugging`, on ne passe pas au suivant.
5. **Coche** le jalon dans `docs/ROADMAP.md`, note tout piège dans `docs/memory/`, commit — puis pose un **point de restauration** : `git tag jalon-NN-<slug>` (NN = numéro du jalon). C'est le filet de `/sos` (retour à un état qui marche).
6. **Gate** : demande « on continue au jalon suivant ? » — sauf si l'utilisateur a dit « enchaîne tout » (ou `/build --all`) → boucle automatiquement jusqu'à la fin, en montrant le visuel + une ligne de progrès à chaque tour.

## Jalon 0 (fondations)
Joue `docs/SETUP-AI.md` (plugins/skills/MCP), scaffold la stack, fais **démarrer** l'app. Visuel = l'app boote.

## Fini quand
Tous les jalons de `docs/ROADMAP.md` sont cochés **et** chaque `✅ Ce que tu vois` a été constaté en vrai. Si un blocage externe empêche d'aller au bout → dis exactement ce qui manque.
