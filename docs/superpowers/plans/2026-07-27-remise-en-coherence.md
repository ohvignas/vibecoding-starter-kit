# Remise en cohérence complète — Plan maître orchestré (v3)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. **Un lot = un agent frais + un reviewer frais.** Steps en `- [ ]`.

**Goal:** Corriger les **~84 trouvailles** des 9 audits en contexte frais. Le Lot 0 (6 bugs destructeurs + régression du paquet npm) est déjà livré.

**v3** : intègre les **21 corrections** de deux critiques du plan (8 risques bloquants + 13 manques). La correction structurelle majeure : **la règle « un fichier = un propriétaire » est abandonnée** — elle rendait la moitié des lots infaisables.

---

## Orchestration

### 🔴 Règle de périmètre (remplace la propriété par fichier)

La v2 partitionnait les fichiers entre lots. C'était faux : les 67 fichiers de test vivent dans `scripts/lib/`, donc tout lot qui touche un template devait « écrire chez un autre » — ou livrer rouge. Les critiques l'ont prouvé sur A, B, C, D, F et H.

**Nouvelle règle : un lot possède un THÈME, pas un dossier.**

1. **Un lot touche tout ce qu'il faut pour que son thème soit cohérent** — y compris les tests, validateurs, fixtures, `smoke-e2e.mjs`, `kit-owned.mjs`, `templates.mjs`.
2. **Aucun conflit n'est possible** : les lots sont **séquentiels**, jamais parallèles. C'est l'ordre qui protège, pas le partitionnement.
3. **Règle « zéro orphelin »** : un lot qui **supprime** ou **renomme** quelque chose doit éliminer **toutes** ses références, dans tout le dépôt — `templates/`, `scripts/`, `stacks/`, `guides/`, `playbook/`, `formateur/`, `.github/`, `README.md`. Commande de contrôle obligatoire avant de committer :
   ```bash
   grep -rn "<le-truc-supprimé>" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.claude/worktrees
   ```
   Sortie vide, ou justification écrite dans le rapport.
4. **Ce qu'un lot ne fait pas** : ce qui appartient explicitement au thème d'un lot **ultérieur** (il le signale dans son rapport, et l'orchestrateur le vérifie). Jamais de renvoi vers un lot **déjà passé** — si c'est nécessaire maintenant, le lot le fait.

### Ordre

| # | Lot | Thème | Pourquoi ici |
|---|---|---|---|
| **A** | Dégraissage | Supprimer ce qui part | Inutile de réparer ce qui disparaît |
| **B** | Règles standing | Les 9 règles + `loop-section` | Elles gouvernent tout le reste |
| **C** | Crew | Les 7 agents + journal | Dépend des règles |
| **D** | Commandes | Les 10 runbooks | Dépend des règles + du crew |
| **E** | Code | `scripts/` | Indépendant |
| **F** | Stacks | Contenu technique + `ai-context` | Indépendant |
| **G** | Parcours | Ce que l'utilisateur lit et fait | Dépend de C+D |
| **H** | Docs | README, guides, glossaire | En dernier : documente l'état final |

### Gate entre chaque lot — deux étapes

**1. Mécanique** (l'agent du lot) :
```bash
N=/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node
$N --test                            # # fail 0
$N scripts/smoke-e2e.mjs             # tous verts
$N scripts/build-cursor-plugin.mjs   # si templates/commands/ touché
$N -e "1" && $N --test scripts/lib/package-publish.test.mjs   # paquet sain
```

**2. Revue par un agent FRAIS** (c'est elle qui décide). Il reçoit **uniquement** le brief du lot + le diff (`git diff <base>..HEAD`) + l'accès lecture au dépôt. Il ne code pas. Il rend, item par item :
```
<item> : CORRIGÉ | NON CORRIGÉ | PARTIEL — PREUVE : <fichier:ligne ou commande + sortie>
```
puis un **verdict** `PROUVÉ` / `NON PROUVÉ` / `BLOQUÉ`, plus les **régressions** (ce qui marchait avant et ne marche plus) et les **orphelins** (références restantes vers du supprimé).

- Preuve obligatoire par constat, sinon non signalé.
- `NON PROUVÉ` → agent correcteur → re-revue. **2 tours max**, puis `BLOQUÉ` + arbitrage utilisateur.
- Le lot suivant démarre **uniquement** sur `PROUVÉ`.
- Chaque verdict est ajouté à `docs/superpowers/audits/2026-07-27-revues-lots.md`.

**Aucun `git push`, aucun `npm publish`** pendant tout le plan.

### 🔴 Décisions déjà tranchées (aucun agent ne re-décide)

| Sujet | Décision |
|---|---|
| **Qui prononce `PROUVÉ`** | L'agent pour **une tâche** (commande + sortie collée). Pour un **jalon** : le `verificateur` **seul**, en contexte frais. Pour une **feature** : `verificateur` (fonctionnel) **+** `security-reviewer` (sécurité) — c'est ce qu'exige le gate de `/build`. Canonique dans `proof-rule` ; `verify-rule` **applique** sans redéfinir. |
| **Modèle** | `claude-sonnet-5` par défaut · `claude-opus-5` pour `security-reviewer` **uniquement**. Écrit **une seule fois**, dans `subagents-rule`. |
| **Tentatives** | **3 puis `BLOQUÉ`**. Le retour au dernier état vert n'est jamais déclenché tout seul : `proof-rule` l'écrit « une **option que tu proposes, que l'utilisateur tranche** », et clôt par « **Ne boucle jamais** ». Canonique dans `proof-rule` ; ailleurs, un renvoi d'une ligne. |
| **`/build --all`** | Désactivé tant que le mode apprentissage est actif. `/build` doit le **dire**. |
| **Branche de merge** | **`main`**. Le scaffold ne crée que `main` ; n'inventer aucun `dev`. |
| **`selectDomains`** | **Le brancher** (lot F). E n'y touche pas. |
| **Paquets morts** | **Remplacer** s'il existe un successeur (`react-email`, `convex-auth`) ; **retirer** sinon (`electronegativity`). Étiquettes : « skills communautaires », jamais « officiels » pour un dépôt tiers. |
| **`karpathy.mdc`** | `alwaysApply: true` vient du dépôt tiers copié verbatim → **transformer la copie** pour forcer `false`. Ne pas supprimer le clone (un test l'exige). |
| **`memory-consolidate`** | **Même traitement que le dream hook** : l'Action planifiée est supprimée (cron + `ANTHROPIC_API_KEY` chez un débutant). La consolidation reste une **instruction à la demande** dans `memory-rules` — la boucle mémoire fonctionne par les hooks, pas par le cron. |
| **Recherche web** | **Indisponible**. Vérifier par `npm view <pkg> version deprecated` et `curl -s https://api.github.com/repos/<o>/<r>`. **Aucune affirmation sans l'une de ces sorties.** |
| **Seuil de volume** | `AGENTS.md` rendu : **≤ 2 200 mots**, et le test échoue **au-dessus de 2 200** (pas 2 300). |

### Contraintes globales

- Binaire Node : `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node`.
- Français, accents corrects. Jamais « formation »/« accompagnement ».
- **Un test par correction**, rouge d'abord. Un test qui passerait avant le correctif ne prouve rien.
- **Ne jamais inventer** : chaîne, chemin ou paquet non vérifié → le signaler, pas le deviner.
- Commit par lot.

---

## Lot A — Dégraissage

**Raison :** ~70 % du kit est absorbé par le natif (Cursor 2.5 empaquette skills+agents+MCP+hooks ; Claude Code livre `/verify`, `autoVerify`, et un `/doctor` qui **élague CLAUDE.md**). Ce qui reste défendable : opinion sur les stacks, pédagogie, français, chaîne maquette→roadmap.

- [ ] **A1 — Supprimer le dream hook** : `templates/dream/`, sa copie dans `setup.mjs`, `validateDreamTemplate` (`validate-commands.mjs`) + `validate-dream.test.mjs`, la mention `docs/DREAM.md` dans `templates.mjs` (§Docs du projet), l'item de `doctor.md:11` (`dream.yml`), et la ligne du `README` (H la retouchera).
- [ ] **A2 — Supprimer l'Action `memory-consolidate`** (même motif : cron + clé API chez un débutant) : `templates/memory-consolidate/`, sa copie, l'item de `doctor.md:11`. **Garder** la consolidation comme instruction à la demande dans `memory-rules.md`, en conservant la chaîne littérale `consolidate-memory` (exigée par `validateMemoryTemplates`).
- [ ] **A3 — Supprimer le code d'accès** : `scripts/lib/license.mjs`, `license.test.mjs`, `license-flow.test.mjs`, le flag `--license` (`args.mjs` + son test), la question du wizard + les assertions `license` de `wizard.test.mjs`, la mention dans `README`/`docs`.
- [ ] **A4 — Supprimer `templates/ONBOARDING.md`** : + `validateExtras` (`validate-commands.mjs:79`), `validate-extras.test.mjs`, la ligne `'docs/ONBOARDING.md'` de `smoke-e2e.mjs:33`, la copie dans `setup.mjs`.
- [ ] **A5 — Supprimer `/debug`** : `templates/commands/debug.md`, la liste de `setup.mjs`, `kit-owned.mjs:8`, `build-cursor-plugin.mjs:10`, les boucles de `cursor-commands.test.mjs:23` et `cursor-plugin.test.mjs:20`, la ligne de `help.md`, et `formateur/plan-de-cours.md:28`.
- [ ] **A6 — PixelRAG n'est plus un prérequis** : retirer la section obligatoire de `setup-ai.mjs:74-75` et l'assertion `pip install pixelrag` de `pixelrag.test.mjs`. PixelRAG peut rester **cité** comme comparaison visuelle indicative, jamais comme dépendance.
- [ ] **A7 — `karpathy` non permanent** : transformer la copie (`pickFromClone`/`matrix.mjs`) pour forcer `alwaysApply: false`. Le clone reste (`matrix.test.mjs` l'exige).
- [ ] **A8 — `.gitignore`** : `.superpowers/` et `.claude/worktrees/`.
- [ ] **A9 — Contrôle « zéro orphelin »** : `grep -rn` sur `ONBOARDING`, `dream`, `DREAM.md`, `memory-consolidate`, `/debug`, `license`, `VIBE-`, `pip install pixelrag` → vide ou justifié.
- [ ] **A10 — Gate** (mécanique + revue). `git commit -m "refactor(kit): dégraissage — dream, memory-consolidate, code d'accès, ONBOARDING, /debug, PixelRAG en prérequis"`.

---

## Lot B — Règles standing

**Portée :** les 9 fichiers de `templates/agents/*.md`, **`loop-section.md` incluse** (la critique a montré qu'elle porte 3 des problèmes attribués à tort aux commandes).

- [ ] **B1 — Qui prononce `PROUVÉ`** : appliquer la décision tranchée dans `proof-rule.md` **et** `verify-rule.md`.
- [ ] **B2 — PixelRAG non bloquant** : corriger `reality-rule.md:8` (« itère jusqu'à ce que PixelRAG confirme ») et **mettre à jour l'assertion** `agents-templates.test.mjs` qui exige la chaîne `PixelRAG` dans ce fichier.
- [ ] **B3 — `subagents-rule` se contredit** : `:30` interdit le fan-out d'écrivains, `:9`/`:19` le donnent en exemple (« 1 écran de maquette », `maquette/parts/<ecran>.html`). Retirer l'exemple.
- [ ] **B4 — Modèle** : appliquer la décision ; mettre à jour l'assertion `claude-sonnet-5` de `agents-templates.test.mjs`.
- [ ] **B5 — Tentatives** : unifier `loop-section.md:22` et `proof-rule.md:26` selon la décision ; ajuster `proof.test.mjs`.
- [ ] **B6 — Mocks** : l'exception « uniquement dans les fichiers de test » écrite **une seule fois**.
- [ ] **B7 — Plugin fantôme dans la règle** : `loop-section.md:15-16` cite `commit-commands:commit` et `commit-push-pr` — **jamais installé**. Remplacer par `git commit` / `gh pr create`.
- [ ] **B8 — Branche `dev` dans la règle** : `loop-section.md:5`, `:18`, `:31` → **`main`**.
- [ ] **B9 — Références inapplicables** : `loop-section.md:12` `/code-review` et `:14` `/security-review` n'existent que sur Claude Code ; `verify-rule.md:7` parle du navigateur de Cursor et Claude Code sans rien dire de Codex. Formuler par assistant, ou renvoyer aux sous-agents du kit (`code-reviewer`, `security-reviewer`) qui, eux, existent partout.
- [ ] **B10 — Dédoublonner** : 8 consignes répétées 2 à 6 fois (~450-500 mots). Une occurrence canonique, les autres en renvoi d'une ligne.
- [ ] **B11 — Ordre de lecture** : `proof-rule` **avant** `verify-rule` (qui utilise son vocabulaire) ; `design-rule` après les règles transverses. Modifier `templates.mjs` (autorisé : les tests suivent le code).
- [ ] **B12 — Volume** : ≤ **2 200 mots**. Ajouter un test qui rend le fichier **réel** (`renderAgentsFile({ source: ROOT, … })`, pas `renderProjectAgentsMd` dont les snippets valent `''` par défaut) et **échoue au-dessus de 2 200**.
- [ ] **B13 — Contrôle orphelins** + gate + revue. `git commit -m "fix(règles): contradictions résolues, plugin fantôme, branche main, doublons fusionnés, volume ≤2200"`.

---

## Lot C — Crew

- [ ] **C1 — Droits vs journal** : 5 agents ont `disallowedTools: Write` **et** l'ordre d'écrire `JOURNAL.md`. Les critiques et `test-runner` **rendent** leur ligne ; l'orchestrateur l'écrit. Retirer l'ordre de ces 5 fichiers, **l'ajouter au contrat de dispatch dans `subagents-rule`** (B est déjà passé → C le fait, la règle de périmètre l'autorise). Mettre à jour `critics.test.mjs` (exige `/JOURNAL\.md/` dans 4 agents).
- [ ] **C2 — L'inventaire n'a aucun chemin** : créer **`docs/agents/inventaire.md`** et l'écrire dans les 3 critiques.
- [ ] **C3 — Le `verificateur` invalide le TDD** : son check « le diff ne doit pas toucher les tests » échoue sur tout jalon TDD. Reformuler : les tests **ajoutés** sont normaux ; interdits = **modifier/supprimer** un test existant (`git diff --diff-filter=MD -- tests/`) et désactiver (`.skip`, `it.only`).
- [ ] **C4 — `state.yaml`** : le `verificateur` le lit en début de mission et y reporte `status`/`repair_attempts`/`blocked_reason`.
- [ ] **C5 — PixelRAG dans 2 agents** : `critique-ux.md:27` et `critique-produit.md:16` le traitent encore en référence forte → aligner sur « signal indicatif ».
- [ ] **C6 — Statuts homogènes** : les 7 portent le même vocabulaire et **renvoient** à la règle des 3 tentatives sans la redéfinir. Mettre à jour `proof.test.mjs` (exige `/3 tentatives/` dans les 7).
- [ ] **C7 — Contrôle orphelins** + gate + revue. `git commit -m "fix(crew): droits cohérents, inventaire tracé, verificateur compatible TDD"`.

---

## Lot D — Commandes

- [ ] **D1 — Plugin fantôme** : `/new-feature:45,47` → `git commit` / `gh pr create`. **Mettre à jour `validate-commands.mjs:37`** qui exige la chaîne `'commit-push-pr'`.
- [ ] **D2 — Branche** : `/new-feature:53` → `main`.
- [ ] **D3 — `/deploy`** : section **vitrine** (Astro/Keystatic), gate pré-déploiement (CI verte + `security-reviewer` PROUVÉ), secrets desktop, et ne plus faire de `electron:distribution` la seule voie (indisponible hors Claude Code).
- [ ] **D4 — `/next`** : lire `docs/agents/state.yaml` (un jalon `BLOQUÉ` ne doit pas donner « continue »). **Ne pas** y lister les 10 commandes (contrainte « 3 lignes maximum » du fichier + c'est le rôle de `/help`) : renvoyer vers `/help`.
- [ ] **D5 — `/sos`** : `git switch -c reprise-<tag>` au lieu de `git checkout <tag>` (HEAD détachée → perte de travail), lire `state.yaml`.
- [ ] **D6 — `/doctor`** : ajouter les **10 commandes** (il n'en vérifie que 3), `docs/agents/{JOURNAL.md,state.yaml}`, le MCP `shadcn` de desktop (item 9 l'oublie), les outils de vérification. **Supprimer** l'item `STITCH_API_KEY` (variable inexistante) et les workflows supprimés en A. *(Déjà corrects : superpowers par assistant, présence des agents, MCP playwright/maestro — ne pas refaire.)*
- [ ] **D7 — `/build`** : ligne `$ARGUMENTS` (sinon `--all` est perdu sur Cursor), **appeler `test-runner`** au lieu de tester dans le fil principal, `git push --tags`, et dire que `--all` est désactivé en mode apprentissage.
- [ ] **D8 — `/help`** : se lister ; aide-mémoire complet ; une seule réponse à « quelle est la 1ʳᵉ commande ? ».
- [ ] **D9 — `/edit-design` + `/new-project`** : PixelRAG en signal (pas « avant de conclure ») ; citer `docs/agents/inventaire.md` ; corriger l'appel `npx shadcn add @shadcnblocks/…` en Phase 5 alors que le registry n'existe qu'en Phase 7 ; **réduire** `new-project.md` (197 lignes = 48 % du corpus) en déplaçant les templates PRD/archi vers `templates/`. **Attention** : `validate-commands.mjs:9` exige 10 marqueurs `DEPTH` dans ce fichier → mettre à jour le validateur **et** son test en conséquence.
- [ ] **D10 — Contrôle orphelins** + gate + revue + `build-cursor-plugin`. `git commit -m "fix(commandes): plugin fantôme, branche main, vitrine, /next /sos /doctor /build remis à niveau"`.

---

## Lot E — Code

- [ ] **E1 — Garde d'entrée** : `update.mjs` et `build-cursor-plugin.mjs` comparent `import.meta.url` à `process.argv[1]` **sans `realpathSync`** → no-op silencieux via symlink (`/tmp` en est un sur macOS, `npm link` aussi). Reporter le correctif de `setup.mjs`.
- [ ] **E2 — `--refresh` peut vider `AGENTS.md`** (20 044 → 1 435 o) : `agents-file.mjs` avale l'erreur (`catch { return '' }`). Refuser d'écrire un rendu dégénéré.
- [ ] **E3 — Dépôt git existant** : `core.hooksPath` jamais posé mais rapport ✅ → le scan de secrets ne tourne jamais. Le poser, ou dire la vérité.
- [ ] **E4 — `--refresh` réactive le mode apprentissage** : stocker `learning` dans `.vibecoding.json` et le relire (+ `refresh.test.mjs`, `setup-rerun.test.mjs`).
- [ ] **E5 — Le rapport ment sur les clones** : le retour de `pickFromClone` est ignoré.
- [ ] **E6 — Couverture `--refresh`** : `.claude/hooks/`, `.githooks/`, `.mcp.json`, `docs/RUN.md` jamais régénérés.
- [ ] **E7 — Windows** : `templates/hooks/framework/checks.mjs` appelle `spawnSync('npx', …)` sans `shell: true` → « problème détecté » alors que rien n'a tourné. Ajouter `.gitattributes` (`* text=auto`, `*.mjs text eol=lf`).
- [ ] **E8 — Duplications** (3 ont **déjà** divergé) : regex de projet (`args.mjs` vs `wizard.mjs`), skills design (4 sources), listes de commandes (3 sources), `TARGET`/`CMD_DIR`, les deux `guard-shell` (`templates/claude/hooks/` et `templates/cursor/hooks/`), copie des agents (`setup.mjs` vs `kit-owned.mjs`). Une source par notion.
- [ ] **E9 — Code mort** : `KNOWN`, `--mockup`, `args.yes`, `skipped`, `DESIGN_SKILLS`, `toSkillMd`. **Ne pas toucher** `selectDomains`/`DOMAIN_TRIGGERS` (branchés par F).
- [ ] **E10 — `AGENTS.md` n'annonce que 4 commandes sur 10** (`templates.mjs:46-47`) → les 10, dont `/sos`, `/doctor`, `/next`, `/deploy`.
- [ ] **E11 — Test du paquet publié** : simuler l'installation npm (copier les dossiers de `files[]` dans un temp, scaffolder depuis là) et exiger **exit 0 pour les 3 assistants**.
- [ ] **E12 — Contrôle orphelins** + gate + revue. `git commit -m "fix(code): garde d'entrée, refresh non dégénéré, hooksPath, duplications, code mort"`.

---

## Lot F — Stacks

**Vérification obligatoire** : `npm view <pkg> version deprecated` · `curl -s https://api.github.com/repos/<o>/<r>`. Aucune affirmation sans sortie.

- [ ] **F1 — Vitrine : Astro 5 → 7.** Mettre à jour `stacks/vitrine/*`, `templates/cursor/rules/vitrine/astro.mdc`, `.claude/skills/stack-vitrine/` : API de collections (l'ancienne est supprimée **sans compatibilité**), `Astro.glob()` supprimé, `<ViewTransitions />` supprimé, `<Image />` changé, **Node ≥ 22.12** pour cette stack.
- [ ] **F2 — L'exemple vitrine ne compile pas** : `templates/examples/vitrine.md` appelle `getCollection('temoignages')` sans `src/content.config.ts` (obligatoire, avec `loader`).
- [ ] **F3 — Épingler Astro** : le scaffold installe `@latest` sans pin → la doc redeviendra fausse au prochain majeur. Épingler la version majeure quelque part de vérifiable.
- [ ] **F4 — Typecheck vitrine mensonger** : `matrix.mjs` déclare `astro check`, `templates/hooks/framework/checks.mjs` lance en dur `npx tsc --noEmit` qui **ne lit pas les `.astro`** → vert sans rien vérifier. Exécuter la commande déclarée par la stack.
- [ ] **F5 — Paquets morts** : `@react-email/components` (135 versions dépréciées) → `react-email` · `@doyensec/electronegativity` (abandonné 03/2023, câblé en pre-push « sécurité ») → retirer · `get-convex/expo-convex-auth` annoncé « repo officiel » = exemple abandonné 09/2024 → `get-convex/convex-auth`.
- [ ] **F6 — Étiquettes fausses** : les skills Electron sont annoncés « officiels » ; c'est `ohvignas/claude-electron-skills` (1 ★, Electron 42 ; npm est à 43.2.0).
- [ ] **F7 — Faits faux** : le push Expo Go est bloqué **sur iOS aussi** (SDK 53+), pas seulement Android. Convex Auth est **en bêta** — le dire.
- [ ] **F8 — CI `v4` → `v7`** : les 4 `templates/ci/*.yml`, **plus** `templates/security/secrets.yml:7` et (s'il survit à A2) `templates/memory-consolidate/consolidate.yml:12`, **plus** les workflows du dépôt.
- [ ] **F9 — `ai-context/` copié en entier pour toutes les stacks** (`matrix.mjs:25`) : une vitrine reçoit convex + expo `llms-full` (~4,7 Mo). Copier **la stack concernée** seulement. Corriger aussi `ai-context/README.md` (omet `astro/`) et `scripts/download-ai-context.sh` (aucune section Astro).
- [ ] **F10 — Skills de stack pointent dans le vide** : `.claude/skills/stack-mobile/SKILL.md:42` renvoie `stacks/mobile/AGENTS.md`, or `matrix.mjs:22` le copie en `AGENTS-stack.md` (idem saas, desktop).
- [ ] **F11 — Mécanismes morts** : brancher `selectDomains()` (les `DOMAIN_TRIGGERS` ne pilotent rien) ; injecter les `secrets` déclarés dans `matrix.mjs` dans les `.env.example`.
- [ ] **F12 — `rot-check` aveugle** : il ne teste que les codes HTTP (react-email est passé au travers). Ajouter `npm view <pkg> deprecated`.
- [ ] **F13 — Contrôle orphelins** + gate + revue. `git commit -m "fix(stacks): Astro 7, exemple compilable, paquets morts, ai-context par stack, domaines branchés"`.

---

## Lot G — Parcours utilisateur

- [ ] **G1 — `COLLE-MOI` impose `/mcp` aux 3 assistants** (codé en dur dans `setup.mjs`) → une instruction par assistant, cohérente avec `A-FAIRE`.
- [ ] **G2 — Codex ne peut exécuter aucune commande** (`docs/commands/`) → le **dire** dans `COLLE-MOI` et `A-FAIRE` : « ouvre le fichier de la commande et demande à l'IA de le suivre ».
- [ ] **G3 — `/init-vibecoding` fait échouer le scaffold** : il dit « Claude Code », l'IA passe `--assistant claude` → exit 1. Écrire les valeurs exactes (`cursor` · `claude-code` · `codex`).
- [ ] **G4 — Mobile : shadcn/shadcnblocks imposé** dans `A-FAIRE` et `AGENTS.md` alors que la règle dit « mobile : jamais shadcn » → conditionner aux stacks web.
- [ ] **G5 — Promesses fausses** : « skills Stitch déjà installés » (démenti 3 lignes plus bas), « registry `@shadcnblocks` ajouté au scaffold » (aucun `components.json`), « voir le glossaire » (jamais copié), section « Scripts package.json » (aucun `package.json`).
- [ ] **G6 — Contradiction « 1ʳᵉ commande »** : aligner `COLLE-MOI` et la sortie console (`report.mjs`) sur `/help`.
- [ ] **G7 — Outils de vérification** : présentés comme obligatoires alors que `/doctor` ne les teste pas → formuler honnêtement (optionnels + ce qu'on perd sans eux).
- [ ] **G8 — Les 12 combinaisons** : scaffolder les 4 stacks × 3 assistants, exit 0 partout, aucune instruction inapplicable, aucune promesse non tenue.
- [ ] **G9 — Contrôle orphelins** + gate + revue. `git commit -m "fix(parcours): instructions par assistant, promesses tenues, 12 combinaisons"`.

---

## Lot H — Docs

- [ ] **H1 — Bannière** (`.github/assets/hero.svg`) : « 5 commandes » → **10**, 3 stacks → **4**.
- [ ] **H2 — README « 2 à 3 gestes »** → chiffre honnête ou renvoi à `A-FAIRE` sans promesse.
- [ ] **H3 — Prérequis** : ce qui reste vrai après le dégraissage (A6 a retiré PixelRAG des prérequis).
- [ ] **H4 — Non documenté** : `/init-vibecoding`, `npx create-vibecoding-kit --refresh` (les utilisateurs npm l'ignorent), le journal du crew, la **Règle Preuve** et la **Règle Réalité**.
- [ ] **H5 — Guides périmés** : `guides/02` enseigne `git clone` au lieu de `npm create` ; `guides/03` décrit la question caveman supprimée ; `guides/01` annonce 3 stacks.
- [ ] **H6 — Glossaire** : lien mort `SETUP-AI.md`, « 5 skills design » (c'est 4), et **20 termes manquants** dont **Astro** et **Keystatic**.
- [ ] **H7 — Parcours de lecture** : aucun template ne renvoie vers `guides/` → créer le lien depuis `A-FAIRE`, ou embarquer le glossaire dans le projet généré.
- [ ] **H8 — `formateur/`** : cohérence avec l'état final (il cite `/debug`, supprimé en A).
- [ ] **H9 — Contrôle orphelins** + gate + revue. `git commit -m "docs: README, bannière, guides, glossaire et formateur alignés sur l'état réel"`.

---

## Contrôle final

> ⚠️ **La suite ne couvre pas la prose.** ~60 des 84 items sont du Markdown : une règle supprimée par erreur ne fera **jamais** rouge. D'où Z1bis et Z2.

- [ ] **Z1 — Vérification en contexte frais** : un agent n'ayant participé à aucun lot reçoit les ~84 trouvailles, le **journal des revues** et le diff complet. Par trouvaille : **CORRIGÉ** (preuve) / **NON CORRIGÉ** / **HORS PÉRIMÈTRE ASSUMÉ**.
- [ ] **Z1bis — « Qu'est-ce que le plan a cassé ? »** Balayage des orphelins sur **tout** le dépôt :
  ```bash
  for m in ONBOARDING dream DREAM.md memory-consolidate /debug license VIBE- pixelrag commit-commands "merge sur \`dev\`"; do
    echo "── $m"; grep -rn "$m" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.claude/worktrees | head
  done
  ```
- [ ] **Z2 — Les 12 combinaisons** rescaffoldées : exit 0, agents au bon endroit, **même balayage d'orphelins appliqué au projet généré**.
- [ ] **Z3 — Suite + smoke + plugin + paquet** verts.
- [ ] **Z4 — Rapport final** : ce qui est corrigé, ce qui ne l'est pas, pourquoi. **Aucune publication sans accord.**

---

## Self-Review (v3)

**Corrections depuis la v2 (21)** : règle de périmètre remplacée (la propriété par fichier rendait A, B, C, D, F, H infaisables) · liste nominative des tests par lot **supprimée au profit de « les tests suivent le code »** · règle « zéro orphelin » avec commande de contrôle · 13 manques placés (plugin fantôme → B7 · branche `dev` → B8 · références inapplicables → B9 · boucle mémoire → A2 · `doctor` dream → A1/D6 · `templates.mjs` DREAM → A1 · `ai-context` → F9 · CI hors `templates/ci` → F8 · pin Astro → F3 · skills pointant dans le vide → F10 · rendu PixelRAG → A6 · PixelRAG dans 2 agents → C5 · `AGENTS.md` 4/10 commandes → E10) · items déjà corrigés retirés de D6 · dépendances inverses supprimées (C1 fait lui-même ce que B aurait dû, D4 ne contredit plus D7) · seuil unifié à 2 200 · test de volume sur le rendu **réel** · `memory-consolidate` tranché · décisions ambiguës tranchées.

**Ce que ce plan ne fait pas** : aucun test en session réelle ; ne construit pas les mouvements stratégiques (banc d'essai, preuve mécanique branchée sur un hook `Stop`, extraction du skill maquette→roadmap) — ce sont des **constructions**, à décider après.
