# Remise en cohérence complète — Plan maître orchestré (8 lots)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan lot-by-lot. **Un lot = un agent en contexte frais.** Steps use checkbox (`- [ ]`) syntax.

**Goal:** Corriger les **~84 trouvailles restantes** des 9 audits en contexte frais (parité, boucles, règles, commandes, onboarding 12 combos, code, stacks, docs, stratégie). Le Lot 0 (6 bugs destructeurs) est déjà livré en `0.13.0`.

**Architecture:** 8 lots **séquentiels**, un **agent frais par lot**, chacun **propriétaire exclusif** de ses fichiers (aucun agent en parallèle n'écrit — c'est la règle que le kit lui-même impose). Entre chaque lot : **gate de contrôle** (suite verte + vérification réelle + pas de régression sur les lots précédents).

---

## Orchestration

### Ordre et raison

| # | Lot | Pourquoi à cette place |
|---|---|---|
| **A** | **Dégraissage** | Supprimer d'abord ce qu'on ne veut plus : inutile de réparer ce qui part |
| **B** | **Règles réconciliées** | Les règles gouvernent tout le reste ; les commandes s'y réfèrent |
| **C** | **Crew opérationnel** | Dépend des règles (statuts, droits) |
| **D** | **Commandes** | Dépend des règles + du crew qu'elles invoquent |
| **E** | **Code & robustesse** | Indépendant du contenu, mais après pour ne pas gêner les lots A-D |
| **F** | **Stacks techniques** | Indépendant ; touche `matrix.mjs` que A a déjà modifié |
| **G** | **Parcours utilisateur** | Dépend de C+D (ce que l'utilisateur doit faire dépend de ce qui existe) |
| **H** | **Docs & README** | **En dernier** : documente l'état final, sinon il faudrait le refaire |

### Propriété des fichiers (aucun chevauchement entre lots)

| Lot | Fichiers possédés |
|---|---|
| A | `.gitignore`, `templates/dream/`, `templates/ONBOARDING.md`, `templates/commands/debug.md`, `scripts/lib/license.mjs`, `scripts/lib/wizard.mjs`, `scripts/lib/matrix.mjs` (§PixelRAG/karpathy uniquement), `scripts/setup.mjs` (§suppressions) |
| B | `templates/agents/*.md` (les 9 règles) |
| C | `templates/agents/subagents/*.md` (7 agents), `templates/journal/` |
| D | `templates/commands/*.md` (sauf `debug.md`, supprimé en A) |
| E | `scripts/*.mjs`, `scripts/lib/*.mjs` (sauf `matrix.mjs`), `templates/hooks/`, `.gitattributes` |
| F | `stacks/`, `templates/cursor/rules/`, `templates/ci/`, `templates/env/`, `templates/examples/`, `.claude/skills/`, `scripts/lib/matrix.mjs` (§stacks), `scripts/lib/domains.mjs`, `.github/workflows/rot-check.yml` |
| G | `scripts/lib/setup-ai.mjs`, `scripts/lib/environment.mjs` (§rendu), `scripts/setup.mjs` (§COLLE-MOI) |
| H | `README.md`, `guides/`, `.github/assets/hero.svg`, `PUBLISH.md`, `playbook/` |

### Gate entre chaque lot (obligatoire)

```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
$N --test                      # doit afficher : # fail 0
$N scripts/smoke-e2e.mjs       # tous les checks verts
$N scripts/build-cursor-plugin.mjs   # si le lot a touché templates/commands/
```
Un lot qui laisse le rouge n'est pas terminé. **Aucun `git push`, aucun `npm publish`** pendant tout le plan.

### Contraintes globales (tous les lots)

- Binaire Node : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.
- Français, accents corrects. Jamais « formation » / « accompagnement ».
- **Un test par correction** : rouge d'abord, vert ensuite. Un test qui passerait avant le correctif ne prouve rien.
- **Ne jamais inventer** : si une chaîne, un chemin ou un paquet n'est pas vérifié, le signaler dans le rapport plutôt que de deviner.
- Commit par lot (message donné dans le lot).

---

## Lot A — Dégraissage

**Agent :** frais. **Sortie :** le kit fait moins de choses, mieux.

**Pourquoi :** l'audit stratégique montre que ~70 % du kit est en train d'être absorbé nativement (Cursor 2.5 empaquette skills+agents+MCP+hooks ; Claude Code livre `/verify`, `autoVerify`, `/doctor` qui **élague CLAUDE.md**). Ce qui reste défendable : opinion sur les stacks, pédagogie, français, chaîne maquette→roadmap. Le reste alourdit.

- [ ] **A1 — Supprimer le dream hook.** `templates/dream/`, sa copie dans `scripts/setup.mjs`, `validateDreamTemplate` + son test, la mention dans `README`(laisser à H) et `templates.mjs` (§Docs du projet). *Raison : Action toutes les 4 h qui exige une `ANTHROPIC_API_KEY` chez un débutant, coûte de l'argent, utilité non démontrée.*
- [ ] **A2 — Supprimer le code d'accès.** `scripts/lib/license.mjs` + tests + le champ `--license` (`args.mjs` est à E : **laisser un TODO précis dans le rapport** au lieu d'y toucher) + la question du wizard. *Raison : constante en clair dans un paquet open source, que le code qualifie lui-même de « PAS un verrou ».*
- [ ] **A3 — Supprimer `templates/ONBOARDING.md`.** Le kit écrit que `A-FAIRE.md` est « le **seul** fichier d'install » puis en livre un second, identique pour les 3 assistants (il montre une section « Cursor » à un utilisateur Claude Code) et périmé (« 2 min », « skills Stitch déjà installés »).
- [ ] **A4 — Supprimer `/debug`.** 13 lignes qui paraphrasent `superpowers:systematic-debugging`, invoqué dès sa ligne 3. Retirer de `setup.mjs`, `kit-owned.mjs`, `build-cursor-plugin.mjs`, `help.md` (D en hérite), et **rediriger `/sos` vers `systematic-debugging`** directement.
- [ ] **A5 — PixelRAG n'est plus un prérequis.** Dans `matrix.mjs` : retirer `PIXELRAG_NOTE` de la section obligatoire (le rendu est à G) ; il reste **mentionnable** comme signal non bloquant, jamais comme dépendance `pip`. *Raison : le kit l'a déjà rétrogradé en signal, mais l'impose encore à l'install.*
- [ ] **A6 — `karpathy.mdc` ne doit plus être `alwaysApply: true`** (`matrix.mjs` §clones/copies) : contenu tiers, chargé à chaque tour, sans lien avec la stack.
- [ ] **A7 — `.superpowers/` dans `.gitignore`** (1 Mo présent sur le disque).
- [ ] **A8 — Gate.** Suite verte. `git commit -m "refactor(kit): dégraissage — dream hook, code d'accès, ONBOARDING, /debug, PixelRAG en prérequis"`.

---

## Lot B — Règles réconciliées

**Agent :** frais. **Sortie :** 0 contradiction, volume réduit d'au moins 25 %.

**Preuves à corriger** (audit règles, 7 contradictions + 8 doublons) :

- [ ] **B1 — Qui prononce `PROUVÉ`.** `proof-rule.md:6` autorise l'auto-déclaration (« PROUVÉ = tu colles la sortie ») ; `verify-rule.md:24` l'interdit (« c'est **lui** qui prononce, pas toi »). **Trancher** : l'agent peut déclarer `PROUVÉ` pour **une tâche** ; seul le `verificateur` peut le prononcer pour **un jalon ou une feature**. Écrire cette distinction dans les deux fichiers, en ces termes.
- [ ] **B2 — PixelRAG non bloquant, partout.** `verify-rule.md:17` est correct ; corriger `reality-rule.md:8` (« itère jusqu'à ce que PixelRAG confirme » → comparaison visuelle indicative). (`A-FAIRE` est à G, `edit-design` à D — **le signaler dans le rapport**.)
- [ ] **B3 — `subagents-rule.md` se contredit elle-même** : `:30` interdit le fan-out d'écrivains, `:9` et `:19` donnent « 1 écran de maquette » + `maquette/parts/<ecran>.html` comme exemple de fan-out parallèle. Retirer l'exemple contradictoire, garder l'interdit.
- [ ] **B4 — Modèle des sous-agents.** `subagents-rule.md:15` impose `claude-sonnet-5` à tous ; `secrets-cost-rule.md:10` dit « modèle adapté » ; le kit livre `security-reviewer` en `claude-opus-5`. **Trancher** : Sonnet 5 par défaut, Opus 5 pour architecture et sécurité — et l'écrire une seule fois.
- [ ] **B5 — Budget de tentatives.** `loop-section.md:22` (3 échecs → rollback + nouvelle conversation) vs `proof-rule.md:26` (à la 3ᵉ → BLOQUÉ). Unifier : **3 tentatives, puis BLOQUÉ**, et le rollback devient une **option proposée**, pas une obligation. Une seule formulation, référencée par l'autre.
- [ ] **B6 — Mocks.** `reality-rule.md:5` « zéro mock » absolu vs `proof-rule.md:21` « hors fichiers de test » — alors que le TDD est imposé. Écrire l'exception **une seule fois** : mocks autorisés **uniquement** dans les fichiers de test.
- [ ] **B7 — Dédoublonner.** 8 consignes répétées 2 à 6 fois (~450-500 mots) : règle des 3 essais (3×), « jamais fini sans preuve » (6×), screenshot (4×), comparer à `maquette/` (4×), fan-out indépendant (4×), zéro mock (3×), boutons câblés (3×), `systematic-debugging` (2×). **Garder une seule occurrence canonique** ; les autres deviennent un renvoi d'une ligne.
- [ ] **B8 — Ordre de lecture.** Placer `proof-rule` **avant** `verify-rule` (qui utilise son vocabulaire), et `design-rule` **après** les règles transverses (elle ne sert qu'aux tâches UI). Modifier l'ordre dans `templates.mjs`… **qui appartient à E** → écrire l'ordre voulu dans le rapport, E l'applique.
- [ ] **B9 — Volume.** Objectif : passer de **2 955 mots à ≤ 2 200**. `subagents-rule` (613 mots) et `verify-rule` (490) sont les plus lourdes ; leur pédagogie (« un sous-agent = une copie de l'IA… ») relève du runbook, pas d'une règle lue à chaque message.
- [ ] **B10 — Gate.** Suite verte + un test qui compte les mots du rendu (`renderProjectAgentsMd`) et **échoue au-dessus de 2 300**. `git commit -m "fix(règles): 7 contradictions résolues, doublons fusionnés, volume réduit"`.

---

## Lot C — Crew opérationnel

**Agent :** frais. **Sortie :** les 7 agents peuvent faire ce qu'on leur demande.

- [ ] **C1 — Droits vs journal.** 5 agents ont `disallowedTools: Write, Edit, NotebookEdit` **et** l'ordre « écris une ligne dans `JOURNAL.md` » (contradiction visible dans le fichier généré). **Trancher** : les critiques et le `test-runner` **rendent** leur ligne de journal dans leur rapport ; **l'orchestrateur** l'écrit. Retirer l'ordre d'écrire de ces 5 fichiers, l'ajouter au contrat de dispatch (`subagents-rule` est à B → le signaler).
- [ ] **C2 — L'inventaire de complétude n'a aucun chemin.** Les 3 critiques déclarent le recevoir, `/new-project` demande de le produire, **aucun fichier n'est défini**. Créer le chemin canonique **`docs/agents/inventaire.md`** et l'écrire dans les 3 critiques (et le signaler pour `/new-project`, lot D).
- [ ] **C3 — Le `verificateur` invalide le TDD.** Son check n°1 (« le diff ne doit pas avoir touché les tests ») échoue sur tout jalon TDD, que le kit impose. **Reformuler** : les tests **ajoutés** sont normaux ; ce qui est interdit, c'est de **modifier ou supprimer** un test existant (`git diff --diff-filter=MD` sur `tests/`), et de désactiver un test (`.skip`, `it.only`).
- [ ] **C4 — `state.yaml` sans lecteur.** Ajouter au `verificateur` : lire `docs/agents/state.yaml` en début de mission, y reporter `status`/`repair_attempts`/`blocked_reason` en fin. (Les commandes lectrices sont à D.)
- [ ] **C5 — Cohérence des statuts.** Vérifier que les 7 portent le même vocabulaire (`PROUVÉ`/`NON PROUVÉ`/`BLOQUÉ` pour les vérificateurs, `MANQUE : … — PREUVE : …` pour les critiques) et la même règle de 3 tentatives — sans la redéfinir (renvoi à la règle canonique de B).
- [ ] **C6 — Gate.** Suite verte + scaffold réel : aucun agent ne contient à la fois `disallowedTools: …Write` et « Écris … JOURNAL ». `git commit -m "fix(crew): droits cohérents, inventaire tracé, verificateur compatible TDD"`.

---

## Lot D — Commandes

**Agent :** frais. **Sortie :** 10 commandes (après suppression de `/debug`) toutes exactes et cohérentes.

- [ ] **D1 — Plugin fantôme.** `/new-feature` étapes 7-8 appellent `commit-commands:commit` / `commit-push-pr` — **jamais installé**. Remplacer par les commandes réelles (`git commit`, `gh pr create`) avec le format Conventional Commits décrit en clair.
- [ ] **D2 — Branche `dev` inexistante.** `/new-feature:53` finit sur « merge sur `dev` » ; le scaffold ne crée que `main`. Corriger vers `main`, ou expliquer la création de `dev` en préflight.
- [ ] **D3 — `/deploy` : stack vitrine absente.** Ajouter la section Astro/Keystatic. Ajouter aussi : **gate pré-déploiement** (CI verte + `security-reviewer` PROUVÉ), section secrets pour desktop, et retirer `electron:distribution` comme référence unique (indisponible hors Claude Code).
- [ ] **D4 — Les 4 commandes figées au 9 juillet.** `/next` doit lire `docs/agents/state.yaml` (un jalon `BLOQUÉ` ne doit pas donner « continue ») et lister les 10 commandes ; `/sos` doit utiliser `git switch -c reprise-<tag>` (pas `git checkout <tag>` qui laisse en HEAD détachée) et lire `state.yaml` ; `/deploy` cf. D3. (`/debug` a été supprimé en A.)
- [ ] **D5 — `/doctor`.** Vérifier les **10** commandes (pas 3), la présence des agents dans le dossier de l'assistant, `docs/agents/{JOURNAL.md,state.yaml}`, les MCP **complets** par stack (desktop : `chrome-devtools` **et** `shadcn` ; saas/vitrine : `playwright` ; mobile : `maestro`), les outils de vérification. **Supprimer** l'item `STITCH_API_KEY` (variable qui n'existe nulle part). Une ligne par assistant pour l'install de superpowers.
- [ ] **D6 — `/build`.** Ajouter la ligne `$ARGUMENTS` (sinon `--all` est perdu sur Cursor), **appeler `test-runner`** au lieu de tester dans le fil principal, pousser les tags (`git push --tags`). Trancher la contradiction `--all` vs mode apprentissage : `--all` **désactivé** tant que le mode apprentissage est actif, et le dire.
- [ ] **D7 — `/help`.** Se lister elle-même ; aide-mémoire complet (10 commandes) ; une seule réponse à « quelle est la 1ʳᵉ commande ? » — cohérente avec ce que dira `COLLE-MOI` (lot G).
- [ ] **D8 — `/edit-design` et `/new-project`.** Retirer PixelRAG comme gate (« avant de conclure », « avant de la rendre ») → signal indicatif. Dans `/new-project` : citer `docs/agents/inventaire.md` (C2), corriger l'appel `npx shadcn add @shadcnblocks/…` en Phase 5 alors que le registry est configuré en Phase 7, et **réduire** le fichier (197 lignes = 48 % du corpus) en déplaçant les templates PRD/archi vers `templates/` référencés.
- [ ] **D9 — Gate.** Suite verte + `build-cursor-plugin.mjs` + validateurs. `git commit -m "fix(commandes): plugin fantôme, branche dev, vitrine, 4 commandes remises à niveau"`.

---

## Lot E — Code & robustesse

**Agent :** frais. **Sortie :** les 7 bugs de code restants corrigés, les duplications supprimées.

- [ ] **E1 — Garde d'entrée manquant** (`update.mjs`, `build-cursor-plugin.mjs`) : ils comparent `import.meta.url` à `process.argv[1]` **sans `realpathSync`** → **no-op silencieux** via un chemin symlinké (or `/tmp` est un symlink sur macOS, et `npm link` aussi). Reporter le correctif déjà présent dans `setup.mjs`.
- [ ] **E2 — `--refresh` peut vider `AGENTS.md`** (20 044 → 1 435 o) si `--source` ne contient pas `templates/agents/` : `agents-file.mjs` avale l'erreur (`catch { return '' }`). **Refuser** d'écrire un rendu dégénéré (ex. si un snippet obligatoire est vide → erreur explicite).
- [ ] **E3 — Dépôt git existant** : `core.hooksPath` n'est jamais posé, mais le rapport affiche ✅ pour les hooks → **le scan de secrets ne tourne jamais**. Poser le hooksPath ou **dire la vérité** dans le rapport (`kept` + avertissement).
- [ ] **E4 — `--refresh` réactive le mode apprentissage** : `learning` n'est pas stocké dans `.vibecoding.json`. L'y écrire et le relire.
- [ ] **E5 — Le rapport ment sur les clones** : le retour de `pickFromClone` (`missing-src`, `skipped-exists`) est ignoré, `done.push` inconditionnel.
- [ ] **E6 — Couverture de `--refresh`** : `.claude/hooks/`, `.githooks/`, `.github/workflows/`, `.mcp.json`, `docs/RUN.md` ne sont **jamais** régénérés. Ajouter ce qui est sûr (hooks Claude, `checks.mjs`) à `kitOwnedFiles`.
- [ ] **E7 — Windows** : `checks.mjs` appelle `spawnSync('npx', …)` sans `shell: true` (le correctif existe dans `external.mjs`) → « problème détecté » alors que **rien n'a tourné**. Ajouter aussi un `.gitattributes` (`* text=auto`, `*.mjs text eol=lf`) pour les hooks en CRLF.
- [ ] **E8 — Duplications** (3 ont **déjà** divergé) : regex de projet (`args.mjs` vs `wizard.mjs`), listes de skills design (4 sources), listes de commandes (3 sources), `TARGET`/`CMD_DIR`, tableau `DANGER` des deux guard-shell, copie des agents (`setup.mjs` vs `kit-owned.mjs`). **Une seule source par notion**, importée.
- [ ] **E9 — Code mort** : `KNOWN`, `--mockup` (parsé, jamais lu), `args.yes`, `skipped` toujours vide, `DESIGN_SKILLS`, `toSkillMd`, `selectDomains`, `DOMAIN_TRIGGERS` (référencés uniquement par leurs tests). Supprimer ou brancher — **décider explicitement pour chacun** et le dire dans le rapport.
- [ ] **E10 — Appliquer l'ordre des règles** décidé en B8 (`templates.mjs`).
- [ ] **E11 — Gate.** Suite verte + un test qui **simule le paquet npm publié** (copier uniquement les dossiers de `files[]` dans un dossier temporaire, scaffolder depuis là, exiger exit 0 pour les 3 assistants). `git commit -m "fix(code): garde d'entrée, refresh non dégénéré, hooks, duplications, code mort"`.

---

## Lot F — Stacks techniques

**Agent :** frais, **avec accès web** (vérifier chaque version/paquet avant d'écrire).

- [ ] **F1 — Vitrine : Astro 5 → 7.** Le kit documente Astro 5, le scaffold installe **7.1.3**. Mettre à jour `stacks/vitrine/*`, `templates/cursor/rules/vitrine/astro.mdc`, `.claude/skills/stack-vitrine/` : API de collections (l'ancienne est **supprimée sans compatibilité**), `Astro.glob()` supprimé, `<ViewTransitions />` supprimé, comportement de `<Image />` changé, **Node ≥ 22.12**. Corriger le prérequis Node du kit **pour la stack vitrine**.
- [ ] **F2 — L'exemple vitrine ne compile pas** : `templates/examples/vitrine.md` appelle `getCollection('temoignages')` **sans** `src/content.config.ts` (obligatoire, avec `loader`). Ajouter le fichier de config dans l'exemple.
- [ ] **F3 — Typecheck vitrine mensonger** : `matrix.mjs` déclare `astro check`, mais `templates/hooks/framework/checks.mjs` lance en dur `npx tsc --noEmit`, qui **ne lit pas les `.astro`** → check vert sans rien vérifier. Faire exécuter la commande déclarée par la stack.
- [ ] **F4 — Paquets morts.** `@react-email/components` (**135 versions dépréciées**) → `react-email` ; `@doyensec/electronegativity` (abandonné 03/2023, câblé en pre-push « sécurité ») → retirer ou remplacer ; `get-convex/expo-convex-auth` présenté comme « repo officiel » = **exemple abandonné depuis 09/2024** → `get-convex/convex-auth`.
- [ ] **F5 — Étiquettes d'autorité fausses.** Les skills Electron sont annoncés « officiels » : c'est `ohvignas/claude-electron-skills` (1 ★, Electron 42 ; npm est à 43.2.0). Dire ce que c'est.
- [ ] **F6 — Faits techniques faux.** Push Expo Go : bloqué **sur iOS aussi** (SDK 53+), pas seulement Android. Convex Auth est **en bêta** (la doc Convex le dit et met Clerk/WorkOS en avant) — le mentionner.
- [ ] **F7 — CI.** `actions/checkout@v4` et `setup-node@v4` → **v7** (4 fichiers `templates/ci/` + les workflows du dépôt).
- [ ] **F8 — Mécanismes morts.** `selectDomains()` n'est appelé **nulle part** en production → les `DOMAIN_TRIGGERS` ne pilotent rien : le brancher (ou le supprimer, cf. E9 — **se coordonner via le rapport**). Les `secrets` déclarés dans `matrix.mjs` ne sont **jamais injectés** dans `.env.example` → les injecter.
- [ ] **F9 — `rot-check` aveugle aux dépréciations.** Il ne teste que les codes HTTP (c'est pourquoi react-email est passé). Ajouter une vérification `npm view <pkg> deprecated` pour les paquets recommandés.
- [ ] **F10 — Gate.** Suite verte + rapport listant **chaque version vérifiée en ligne**. `git commit -m "fix(stacks): Astro 7, paquets dépréciés, faits techniques, CI v7, domaines branchés"`.

---

## Lot G — Parcours utilisateur

**Agent :** frais. **Sortie :** les 12 combinaisons (4 stacks × 3 assistants) sont cohérentes de bout en bout.

- [ ] **G1 — `COLLE-MOI-DANS-L-IA.md` impose `/mcp` aux 3 assistants** (chaîne codée en dur dans `setup.mjs`) → une instruction **par assistant**, cohérente avec `A-FAIRE`.
- [ ] **G2 — Codex ne peut exécuter aucune commande** (`docs/commands/`, non typable). **Dire la vérité** dans `COLLE-MOI` et `A-FAIRE` : « sur Codex, ouvre le fichier de la commande et demande à l'IA de le suivre ». Ne rien inventer d'autre.
- [ ] **G3 — `/init-vibecoding` fait échouer le scaffold** : il dit « Claude Code » → l'IA passe `--assistant claude` → exit 1. Écrire les **valeurs exactes** (`cursor` · `claude-code` · `codex`).
- [ ] **G4 — Mobile : shadcn/shadcnblocks imposé** dans `A-FAIRE` et `AGENTS.md` alors que la règle dit « mobile : jamais shadcn ». Conditionner le rendu aux stacks web.
- [ ] **G5 — Promesses fausses dans le rendu** : « skills Stitch déjà installés » (faux avec `--no-skills`, et démenti 3 lignes plus bas), « registry `@shadcnblocks` ajouté au scaffold » (aucun `components.json` généré), renvoi « voir le glossaire » (jamais copié dans le projet), section « Scripts package.json » (aucun `package.json` scaffoldé).
- [ ] **G6 — Contradiction « 1ʳᵉ commande »** : aligner `COLLE-MOI` et la sortie console (`report.mjs`) sur ce que dit `/help` (lot D7) — une seule réponse.
- [ ] **G7 — Outils de vérification** : `A-FAIRE` présente `semgrep`/`gitleaks`/`osv-scanner` comme obligatoires alors que le gate `/build` en dépend et que `/doctor` ne les teste pas (D5 le corrige). Formuler honnêtement : optionnels, et ce qu'on perd sans eux.
- [ ] **G8 — Gate.** Scaffolder les **12 combinaisons** et vérifier : exit 0 partout, aucune instruction inapplicable, aucune promesse non tenue. `git commit -m "fix(parcours): instructions par assistant, promesses tenues, 12 combinaisons cohérentes"`.

---

## Lot H — Docs & README

**Agent :** frais. **Sortie :** tout ce qu'on raconte correspond à l'état final du kit.

- [ ] **H1 — La bannière** (`.github/assets/hero.svg`) annonce « **5 commandes** » et **3 stacks**. Réalité : 10 commandes, 4 stacks.
- [ ] **H2 — README : « 2 à 3 gestes »** → réalité mesurée. Donner un nombre honnête (ou renvoyer à `A-FAIRE` sans promettre de chiffre).
- [ ] **H3 — Prérequis** : ajouter ce qui est réellement nécessaire (Node, git, + Homebrew/Python **si** l'utilisateur veut les outils de vérification — après le dégraissage du lot A, vérifier ce qui reste vrai).
- [ ] **H4 — Fonctionnalités non documentées** : `/init-vibecoding`, `npx create-vibecoding-kit --refresh` (les utilisateurs npm ne savent pas qu'ils peuvent se mettre à jour), le journal du crew, la **Règle Preuve** et la **Règle Réalité** (les plus contraignantes, absentes de la liste).
- [ ] **H5 — Guides périmés** : `guides/02` enseigne `git clone` au lieu de `npm create` ; `guides/03` décrit une question caveman supprimée ; `guides/01` annonce 3 stacks.
- [ ] **H6 — Glossaire** : lien mort `SETUP-AI.md`, « 5 skills design » (c'est 4), et **20 termes utilisés dans les templates n'y sont pas** — dont **Astro** et **Keystatic**, les deux briques de la stack Vitrine.
- [ ] **H7 — `AGENTS.md` n'annonce que 4 commandes sur 10** — il cache `/sos`, `/doctor`, `/next`, `/deploy`, exactement les commandes de secours. (Le fichier est rendu par `templates.mjs`, propriété de E → **écrire la liste voulue dans le rapport**, ou demander à l'orchestrateur.)
- [ ] **H8 — Parcours de lecture** : aucun template ne renvoie vers `guides/`. Créer le lien depuis `A-FAIRE` (propriété G → signaler) ou embarquer le glossaire dans le projet généré.
- [ ] **H9 — Gate.** Suite verte + relecture croisée : chaque affirmation du README vérifiée contre un projet généré. `git commit -m "docs: README, bannière, guides et glossaire alignés sur l'état réel du kit"`.

---

## Contrôle final (après les 8 lots)

- [ ] **Z1 — Audit de vérification en contexte frais.** Un agent qui n'a participé à aucun lot reçoit : la liste des ~84 trouvailles d'origine + le diff complet. Il rend, par trouvaille : **CORRIGÉ** (avec la preuve) / **NON CORRIGÉ** / **HORS PÉRIMÈTRE ASSUMÉ**. Pas d'avis, un statut.
- [ ] **Z2 — Les 12 combinaisons rescaffoldées** : exit 0, agents présents dans le bon dossier, aucune référence morte.
- [ ] **Z3 — Suite + smoke + plugin** verts.
- [ ] **Z4 — Rapport final à l'utilisateur** : ce qui est corrigé, ce qui ne l'est pas et pourquoi. Aucune publication sans son accord.

---

## Self-Review

**Couverture** : les 8 lots couvrent les 9 audits — dégraissage (stratégie) · règles (audit règles) · crew (audit boucles + cohérence crew) · commandes (audit commandes) · code (audit code) · stacks (audit stacks) · parcours (audit onboarding) · docs (audit docs). Le Lot 0 (6 bugs destructeurs) est déjà livré.

**Conflits de fichiers** : chaque fichier a **un seul propriétaire**. Les dépendances croisées (B→E pour `templates.mjs`, C→D pour `/new-project`, F↔E pour `selectDomains`) sont traitées par **signalement dans le rapport de lot**, jamais par une écriture hors périmètre.

**Risque principal** : le Lot B (règles) modifie ce que les lots C, D, G citent. C'est pourquoi il passe **en deuxième**, juste après le dégraissage — et pourquoi l'ordre est **séquentiel, jamais parallèle** (règle du kit : pas de fan-out d'écrivains).

**Ce que ce plan ne fait pas** : aucun test en session réelle (hors de portée de `node --test`) ; ne traite pas les mouvements stratégiques (banc d'essai, preuve mécanique, extraction du skill maquette→roadmap) — ce sont des **constructions**, pas des corrections, à décider après.
