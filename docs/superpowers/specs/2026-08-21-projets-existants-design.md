# Le kit s'installe sur un projet qui existe déjà — design v3

**Date :** 2026-08-21 · **Base :** `2fcf865`, kit 0.16.0, 432 tests verts.
Deux revues par agent frais. **v1 : À REPRENDRE** (prémisse fausse). **v2 : UTILISABLE APRÈS
AJOUTS** — architecture validée, 5 bloquants sur 6 fermés sur le fond. Tout est remesuré.

> **Deux fois, j'ai affirmé sans mesurer, et les deux fois pour justifier une coupe.**
> v1 : « `package.json` intact » — faux, il est réécrit. v2 : « `/build` sans roadmap renvoie déjà
> à `/next` » — faux, `grep -i next build.md` rend **zéro**. C'est la classe de défaut que ce dépôt
> traque, et elle vient de l'auteur de la spec. Toute affirmation de comportement ci-dessous porte
> sa mesure.

---

## Ce que la v1 affirmait de faux

> v1 : « rien n'est écrasé. `package.json`, `src/`, les règles personnelles : intacts. »

Faux. Sur un projet Next.js + Prisma sous git, après installation :

```
 M package.json
```

Le fichier est **entièrement réécrit** (reformaté par `JSON.stringify`) et `environment.mjs:107-110`
y injecte `typecheck` — et `lint: biome check .` si le projet n'en avait pas, sur un projet qui
utilise probablement eslint. Le test de la v1 vérifiait que le *nom* du projet survivait : il
survit à une réécriture complète. **Un test qui ne pouvait pas échouer pour la bonne raison.**

## Le problème, remesuré

| Ce qui se passe | Conséquence |
|---|---|
| `setup.mjs:103-113` refuse d'écrire `AGENTS.md` **et** `CLAUDE.md` → deux `.new` | **La méthodologie n'arrive jamais** |
| Les deux avertissements sont imprimés **lignes 57 et 58 sur 74** | Les 6 dernières lignes disent de lancer `/new-project` |
| `.env.example` est posé, mais `.gitignore` existant n'est **pas** complété | ⛔ **Régression de sécurité.** Mesuré : `git check-ignore .env` → **non ignoré**. Le kit invite à créer un `.env` qui partira au commit |
| Le wizard a posé `stack: saas` → Convex | Projet Next.js + Prisma. `AGENTS-stack.md`, `ai-context/`, `.env.example` d'une stack absente |
| `docs/ROADMAP.md` squelette posé (`setup.mjs:242`) | `/build` exécute un plan fictif |
| `maquette/` créé vide (`setup.mjs:119`) | L'IA croira qu'il y a une maquette à comparer |
| Rapport : « Projet créé » | Sur un dépôt qui a deux ans d'historique |

`/init-vibecoding` ne rattrape pas : `00-detecter-l-etat.md` ne connaît que deux cas —
`.vibecoding.json` présent (→ refresh) ou absent (→ **projet neuf**).

---

## Décision 1 — La méthode, pas la stack, et un endroit où l'écrire

Le kit **n'écrit aucune règle de techno** sur un projet adopté : il ne peut pas prouver ce qu'il n'a
pas vérifié, et une règle Convex dans un projet Prisma est **pire que pas de règle**.

**Observer n'est pas prescrire.** Écrire « ce projet se lance avec `pnpm dev` » est un constat
vérifiable. Écrire « avec Prisma, fais plutôt ceci » est une prescription non vérifiée.

**⛔ Ce que la v1 avait raté : la décision n'avait nulle part où s'écrire.** `args.mjs:56` et
`matrix.mjs:44` rejettent toute valeur hors des 4 stacks — mesuré : `refreshProject` avec
`stack:'existant'` jette `Stack inconnue`. Sans correctif, **chaque `--refresh` re-livrerait à vie**
`AGENTS-stack.md`, `.claude/skills/stack-X`, `ai-context/` et `.env.example` d'une stack fictive.

**→ Une 5ᵉ valeur : `aucune`.** Elle ne livre ni règles de stack, ni `ai-context/`, ni
`.env.example`, ni skill de stack. C'est le changement le plus profond du lot ; il est le socle de
tout le reste.

**Le coût, chiffré** (mesuré : `aucune` ajouté à `AI_CONTEXT` + `STACKS` + `args.mjs` → **427/432**) :

| Rouge | Ce qu'il réclame |
|---|---|
| `commands.test.mjs:132` (D6) | `/doctor` item 9 doit porter un segment « aucune : … » |
| `docs.test.mjs:80` · `:269` · `init-command.test.mjs:84` | bannière README, guide 01 et la question de `/init-vibecoding` doivent **PROPOSER `aucune` au débutant** |
| `docs.test.mjs:124` (H2) | README doit dire « 0 à 4 serveurs MCP » |

⛔ **Trois de ces tests encodent un invariant que la v2 n'avait pas vu** : *toute clé de `STACKS`
est une stack OFFERTE au débutant*. `aucune` n'est pas une offre.

**→ On scinde la notion.** `STACKS` reste le **catalogue offert** (4 entrées, la question du wizard
et la doc n'en voient pas d'autres). Une table technique séparée porte les 5 valeurs **légales du
manifeste**. `cablage-stacks.test.mjs:115` impose `Object.keys(AI_CONTEXT) === Object.keys(STACKS)` :
c'est donc la table technique, pas `STACKS`, qui gagne `aucune`.

**Et six artefacts stack-keyés que la v2 oubliait** — mesuré : `--stack aucune` rend **6 ENOENT et
exit 1**. Couverts par la v2 : `stacks/<s>/AGENTS.md`, `.claude/skills/stack-<s>`,
`templates/env/<s>`, `templates/run/<s>`. **Non couverts** : `templates/ci/<s>.yml`,
`templates/examples/<s>.md`, `templates/cursor/rules/<s>/`, `templates/cursor/environment/<s>.json`,
`templates/gitignore/<s>.gitignore`. Tous doivent être sautés sur `aucune`.

`templates/ci/<s>.yml` → `.github/workflows/ci.yml` est **la même classe que `secrets.yml`** que le
périmètre attrape : un workflow qui tourne au push chez quelqu'un d'autre. Ils sont à quatre lignes
d'écart (`setup.mjs:235` et `:239`). **Les deux se demandent.**

## Décision 2 — Réécrire les 6 renvois, pas les abandonner

Composition mesurée (2196 mots, `saas/*/learning=true`) : **1768 de méthode**, **338 qui pointent
des fichiers absents** (design 147 · CSS maquette 144 · Docs projet 27 · Contexte stack 20), 90 de
plomberie. On retire les 338.

**⛔ Ce que la v1 avait raté : 4 des 8 sections gardées citent ce qu'on retire.** Mesuré :

| Fichier gardé | Ligne | Renvoi |
|---|---|---|
| `reality-rule.md` | **1** | le **titre** : « maquette à l'identique » |
| `reality-rule.md` | **9** | « Reproduis la maquette à l'identique » |
| `verify-rule.md` | **7** | « Compare à `maquette/` » |
| `verify-rule.md` | **11** | comparaison d'images avec `maquette/` |
| `subagents-rule.md` | **12** | « charge les skills design (**Règle design**) » ← **renvoi interne vers la section supprimée** |
| `subagents-rule.md` | **19** | « même source pour tous (`docs/design.md`) » |

« Zéro règle perdue » devenait « une règle qui renvoie dans le vide ».

**→ Les phrases sont réécrites pour tenir SANS maquette**, en gardant leur exigence : comparer au
**rendu attendu** quand il existe, et le dire quand il n'existe pas.

**Le mécanisme existe déjà et porte un nom** : `adapterAuMobile` (`agents-file.mjs:28-37`) +
`SUBSTITUTIONS_MOBILE` (`:18-26`), appelé à `:64`. Substitution phrase par phrase **au rendu**, qui
**jette** si la phrase source a bougé. C'est la seule voie qui ne casse pas de test :
`agents-templates.test.mjs:74` asserte la chaîne littérale `maquette à l'identique` **sur le
fichier template** — éditer le template en place le rendrait rouge, substituer au rendu le garde vert.

**Deux renvois de plus, trouvés par la 2ᵉ revue** — la liste faisait 6, elle en fait 8 :

| Oublié | Pourquoi il devient mort |
|---|---|
| `secrets-cost-rule.md:5` | « `.env.example` liste les noms de variables » — décisions 1+8 : aucun `.env.example` posé |
| `verify-rule.md:7` | « lance l'app (`docs/RUN.md`) » — décision 4 : le fichier peut rester absent |

**Et deux hors des 338 mots :**
- La section **`## Commandes`** (`templates.mjs:57-59`, 35 mots) annonce `/new-project` (fondation)
  et `/build` (construire la roadmap) à un projet sans PRD ni roadmap.
- **Asymétrie Cursor** : `.cursor/rules/10-css-maquette.mdc` **atterrit quand même** sur `aucune`
  (mesuré). La règle retirée d'`AGENTS.md` survit en `.mdc`, et `promesses-livrees.test.mjs:159-170`
  exige que les deux restent d'accord.

Le rendu adopté descend à ~1860 mots, sans renvoi mort.

Rejeté : garder design + CSS-maquette (retour à 2196, et l'IA cherche une maquette absente).
Rejeté : couper les justifications des grosses règles — ce dépôt a mesuré qu'une règle sans son
pourquoi se fait contourner.

## Décision 3 — Fusion par marqueurs, après accord

`mergeManagedSection` (`managed-section.mjs:25`) remplace le bloc entre `vibecoding:start` et
`vibecoding:end` ; **tout ce qui est dehors n'est jamais touché**. Il n'est appelé que par
`refresh.mjs:36`. Le parcours « adopter » l'appelle aussi.

Vérifié par la revue, sur un projet réel : règles perso intactes, bloc du kit présent, **et
`refreshProject` joué deux fois ne duplique pas le bloc**.

**On montre, on demande une fois, on écrit.** Le fichier qui pilote son IA ne se modifie pas en
silence. `--refresh` ne redemande pas ensuite.

**⛔ Perte de texte mesurée.** Si le fichier perso contient une occurrence **littérale** de
`<!-- vibecoding:start` (cas réel : il a recopié des morceaux d'un `AGENTS.md.new`), `indexOf`
(`managed-section.mjs:28`) mord dedans et **supprime tout jusqu'au premier `vibecoding:end`**.
**→ Avant toute fusion : si le fichier contient un marqueur orphelin, on refuse et on le dit.**

**`CLAUDE.md` — trou de la v1.** `refresh.mjs:33` saute le fichier s'il est absent (mesuré :
`["CLAUDE.md (absent)"]`, jamais créé). Or Claude Code lit `CLAUDE.md` en priorité.
**→ Le parcours « adopter » crée les deux**, comme pour un projet neuf. Même bloc, même marqueurs.

## Décision 4 — Deux fichiers, écrits d'observation

- **`docs/RUN.md`** — comment lancer *ce* projet, **relevé dans son `package.json`**.
  **⛔ Conflit raté par la v1** : `setup.mjs:247` l'écrit depuis `templates/run/<stack>.md` — sur le
  projet mesuré, il a produit « Lancer l'app — SaaS (Convex + TanStack Start) · `npx convex dev` ».
  **→ Sur `stack: aucune`, aucun modèle de stack n'est posé.** L'analyse l'écrit, ou le fichier
  reste absent et on le dit.
- **`docs/ETAT-DES-LIEUX.md`** — technos vues, structure, comment on lance, comment on teste, **et
  ce que l'IA n'a pas su déterminer**. Première page de la mémoire.

Rejeté : un diagnostic de dette. C'est un audit, ça mérite sa commande, et ça commencerait la
relation en jugeant son code.

## Décision 5 — `autoskills` recommandé, jamais embarqué

[`midudev/autoskills`](https://github.com/midudev/autoskills) — `npx autoskills`, scanne les
fichiers de config, installe des skills curés, pose un `skills-lock.json` avec le SHA-256 de chacun.

**Le kit ne l'embarque pas.** Licence **CC BY-NC 4.0** contre un kit **MIT** (vérifié dans son
`LICENSE`) : l'embarquer redistribuerait du non-commercial sous MIT. Le faire lancer par
l'utilisateur ne redistribue rien — c'est déjà le traitement de superpowers et de `npx skills add`.

**⛔ Deux erreurs de la v1, corrigées :**

1. **Cursor n'est PAS supporté.** `skills-map.ts:1390` : `AGENT_FOLDER_MAP` liste `.claude`,
   `.cline`, `.junie`, `.codebuddy`, `.continue`, `.kiro`. Sous Cursor, aucun lien n'est créé.
   **→ La question est masquée sous Cursor ET Codex** — 2 assistants du kit sur 3.
2. **Collision prouvée.** `frontend-design` est dans le registre autoskills **et** dans
   `DESIGN_SKILL_NAMES` (`matrix.mjs:25`). `installer.ts` fait
   `rmSync(.claude/skills/<nom>, {recursive:true, force:true})` avant de lier : **il remplace le
   skill du kit par une autre révision, en silence**, et `/doctor` item 11 continue de dire ✅
   (il vérifie la présence, pas le contenu).
   ⛔ **« APRÈS » ne l'empêche pas — ça le GARANTIT.** Le `frontend-design` du kit est sur disque
   en premier, autoskills le `rmSync`. Les deux garde-fous de la v2 (`--dry-run`, « l'écran nomme
   les skills remplacés ») sont de la **divulgation après coup, pas de la prévention**.
   **→ Les 4 `DESIGN_SKILL_NAMES` sont exclus du run autoskills**, ou `installSkills` est rejoué
   derrière. On empêche, on ne raconte pas.
3. **Deuxième collision, non vue** : `updateSkillsLock` (`installer.ts:445-467`) écrit
   `skills-lock.json` — **le même fichier que le kit produit** via `npx skills add`. Le lock devient
   à provenance mixte (`sourceType: "github"` vs `"autoskills-registry"`) et plus personne ne sait
   quels skills le kit a relus. **→ On le dit, et `.agents/` + `skills-lock.json` entrent dans le
   `.gitignore` complété par la décision 8** — le kit les ignore chez lui (son `.gitignore:30-32`),
   il ne peut pas les laisser traîner chez l'utilisateur.

Garde-fous : `--dry-run` toujours en premier · masqué sous Cursor et Codex · l'outil, son auteur et
sa licence sont nommés — ces skills ne viennent pas du kit et n'ont pas été relus par lui.

## Décision 6 — Le point d'entrée est un drapeau, pas une question

**⛔ Ce que la v1 avait raté :** le wizard demande la **stack en question 1** (`wizard.mjs:89`) et le
**dossier en question 3** (`:94`). Il choisit une stack deux questions avant de savoir où il
atterrit. Une « question 0 » décalerait le script que `degraissage.test.mjs:50` fige — donc casserait
le test que la v1 promettait de garder vert.

**→ `npx create-vibecoding-kit@latest --adopt`, lancé depuis le projet.** Vérifié :
`degraissage.test.mjs:50-51` scripte `runWizard`, que `--adopt` n'atteint jamais → **intact**. Et
`parseArgs(['--adopt'])` jette aujourd'hui `Argument inconnu` ; un `case '--adopt':` calqué sur
`--refresh` (`args.mjs:27`) suffit, aucun test ne fige la forme de l'objet.

⛔ **Deux points que la v2 laissait en blanc.** Mesuré : `needsWizard(['--adopt'], true) === true`
(`wizard.mjs:22-26` exige `--stack` ET `--assistant` ET `--project`). **`--adopt` doit donc sortir
AVANT `needsWizard`**, comme `--refresh` à `setup.mjs:51`.

Et **le parcours adopté pose ses propres questions** — la v2 avait supprimé cette ligne de la v1 en
croyant répondre. Il en pose **deux**, car ni l'une ni l'autre ne se devine :
1. **Quel assistant ?** (Cursor · Claude Code · Codex) — indevinable depuis le disque.
2. **Scanner pour ajouter les skills de ta stack ?** — masquée sous Cursor et Codex (décision 5).

La stack n'est **pas** demandée : c'est `aucune`, par construction.

**Critère d'adoption** : le dossier contient ≥ 1 entrée hors `.git/`, `.DS_Store`, `node_modules/`,
`.vibecoding.json`. Le kit **montre ce qu'il a trouvé et demande** — jamais de devinette silencieuse.
Cas limites assumés : dossier vide sous git → *neuf* (rien à adopter) · projet non-JS sans
`package.json` → adopté, mais `RUN.md` restera vide et le dira · monorepo → `gitinit.mjs:37-42`
saute déjà les hooks proprement, mais les fichiers iront au niveau visé par `--project`, et on le dit.

`/init-vibecoding` `00-detecter-l-etat.md` gagne son **troisième cas** : pas de `.vibecoding.json`
mais un dossier non vide → propose `--adopt`, jamais le scaffold.

## Décision 7 — On ne touche pas à son `package.json`

C'est son fichier de build. Mesuré : avec un manifeste `aucune` portant `scripts: {}`,
`package.json` ressort **octet pour octet identique** — `environment.mjs:109` n'ajoute rien,
`changed` reste `false`, `:110` n'écrit jamais.

⛔ **Le mécanisme, pas la fonction.** La v2 écrivait « `environment.mjs:107-110` n'est pas appelé ».
**Faux et dangereux** : ces 4 lignes sont au fond d'une fonction à 8 responsabilités
(`environment.mjs:12-114`, un seul appel, `setup.mjs:292`). Ne pas l'appeler retirerait aussi
`.mcp.json`, les hooks, `.claude/settings.json`, `docs/A-FAIRE.md`, `docs/DOMAINS.md` — et
**`docs/agents/JOURNAL.md` + `state.yaml` + `inventaire.md`** (`:95-101`), que **deux règles
gardées** citent : `verify-rule.md:14` et `subagents-rule.md:12`. On aurait fabriqué deux renvois
morts neufs.

**→ La fonction est appelée normalement. C'est le manifeste `aucune` qui porte `scripts: {}`.**

Conséquence assumée : les checks du kit ne tourneront pas automatiquement. L'état des lieux relève
les scripts **qui existent** et s'en sert.

## Décision 8 — Le `.gitignore` est complété, pas ignoré

⛔ Régression mesurée : projet avec `.gitignore` ne contenant que `node_modules/` → le kit pose
`.env.example` (donc invite à créer un `.env`) et `copyIfAbsent` (`setup.mjs:279`) **saute** le
`.gitignore`. Résultat : `git check-ignore .env` → **non ignoré**. Son secret part au commit.

**→ Sur le parcours adopté : pas de `.env.example` (stack absente, décision 1), et les lignes
`.env` / `.env.*` / `!.env.example` sont AJOUTÉES à son `.gitignore` si elles manquent**, après
accord, en fin de fichier, sans rien réordonner.

**L'append en fin de fichier gagne — vérifié sur vrai git, 4 cas.** La dernière règle qui matche
décide, donc même un `!.env` volontaire est battu :

| Son `.gitignore` avant | `.env` après append |
|---|---|
| `node_modules/` | **ignoré** |
| `node_modules/` + `.env*` + **`!.env`** | **ignoré** |
| `node_modules/` + `.env.example` | **ignoré**, et `.env.example` reste **non** ignoré |

Deux ajouts de la 2ᵉ revue :
- **S'il bat une règle volontaire** (`!.env`), l'écran d'accord la **nomme**. On n'écrase pas une
  intention en silence.
- ⛔ **Le cas « pas de `.gitignore` du tout » n'était pas couvert.** Mesuré : sur `aucune`, aucun
  n'est créé (`templates/gitignore/aucune.gitignore` ENOENT) → **zéro protection `.env`**,
  précisément la régression que cette décision ferme. **→ Absent, on en crée un** avec ces lignes.
- `.agents/` et `skills-lock.json` y entrent aussi (décision 5), et sous Cursor
  `docs/memory/.edit-queue.log` (`templates/cursor/hooks/log-edit.mjs:6`).

## Décision 9 — Les trois fichiers qui disent encore « lance /new-project »

⛔ **Le trou le plus net des deux revues.** Toute la spec traite le symptôme « le kit croit qu'il
crée un projet neuf », et **les fichiers qui le disent vraiment** n'étaient couverts par aucune
décision. Mesuré sur le run adopté :

| Fichier | Ce qu'il dit | Mesure |
|---|---|---|
| **`COLLE-MOI-DANS-L-IA.md`** | « 5. `/new-project` (PRD + tech spec + design), puis `/build`. » | `colle-moi.mjs:23`, en dur. Écrit à la racine de son dépôt (`setup.mjs:353`) **et** imprimé en dernier |
| **`docs/A-FAIRE.md`** | titre : « installe ça, puis **lance /new-project** (stack aucune · claude-code) » | 482 mots sur `aucune`. « Plugins → (aucun) », « MCP à autoriser » = **titre vide**, et la section 5 pousse shadcnblocks + `components.json` + tout le flux maquette — **le contenu design que la décision 2 retire d'`AGENTS.md` y survit mot pour mot** |
| **le rapport final** | « ✓ Config prête. **Projet créé** dans : … » | `setup.mjs:350`, en dur, tous modes |

`docs/A-FAIRE.md` est le pivot : `COLLE-MOI` étape 1, `/doctor` item 10 et `/build` « Jalon 0 » le
désignent tous les trois. Et `docs/DOMAINS.md` sort à 114 mots, catalogue vide.

**→ Sur le parcours adopté, ces trois-là parlent d'adoption, pas de création.** `COLLE-MOI` envoie
vers `/help` et l'état des lieux, jamais vers `/new-project`. `A-FAIRE` ne liste que les gestes
réels (superpowers, MCP si l'utilisateur en veut) et perd sa section design. `DOMAINS.md` vide n'est
pas posé. Le rapport dit « **environnement installé dans un projet existant** ».

## Décision 10 — On ne change pas sa configuration git sans le lui dire

⛔ Mesuré : `gitinit.mjs:54` exécute `git config core.hooksPath .githooks` sur son dépôt existant —
`git config --get core.hooksPath` rend ensuite `.githooks`. **Tout ce qu'il avait dans `.git/hooks/`
est désactivé en silence.** C'est plus intrusif que l'append `.gitignore`, pour lequel la décision 8
exige un accord.

Le cas monorepo est déjà propre (`gitinit.mjs:36-43` compare les realpath et saute avec un motif) ;
c'est le cas **ordinaire** qui ne l'est pas.

**→ Sur le parcours adopté, `core.hooksPath` se demande.** Refus = pas de scan de secrets
automatique, dit en une phrase, et l'installation continue.

---

## Périmètre — hors de ce chantier, mais DIT

Chacun est un défaut réel, mesuré, laissé de côté volontairement :

| Laissé | Ce que ça fait en attendant |
|---|---|
| **`docs/ROADMAP.md` squelette** (`setup.mjs:242`) | **Non posé sur le parcours adopté.** ⛔ La v2 justifiait ça par « `/build` sans roadmap renvoie déjà à `/next` » — **faux, mesuré : `grep -i next build.md` rend zéro**, et aucune branche « roadmap absente » n'existe. Pire, `build.md:25` dit « **scaffold la stack** » à un dépôt de deux ans. La coupe reste juste, sa justification était fausse : **`/build` gagne une première ligne** — pas de `docs/ROADMAP.md` → dis-le et renvoie à `/next`, ne scaffolde rien |
| **`/doctor` sur projet adopté** | ⛔ La v2 proposait « un item de plus qui dit que ces items sont sans objet ». **Ça ne débloque rien** : les items 8/10/11/17 restent DANS la fourchette « de 1 à 17 » du verdict. **C'est la ligne de verdict `doctor.md:37` qu'il faut toucher**, plus l'item 17 (playwright/maestro/chrome-devtools par stack, sans cas `aucune`) et l'item 9 que `commands.test.mjs:132` force à porter un segment `aucune`. L'adapter en profondeur reste un autre lot |
| **3 des 7 agents du crew** (`critique-produit:11`, `critique-ux:16,27`, `critique-donnees:11`) citent `maquette/`, `docs/PRD.md`, `docs/ROADMAP.md` | Ils dégraderont mal sur un projet adopté. À traiter au lot suivant, avec les mêmes réécritures que la décision 2 |
| **`.github/workflows/secrets.yml`** posé sur un dépôt existant | **Non posé sans accord** : un workflow qui tourne au push chez quelqu'un d'autre se demande |
| **`maquette/` créé vide** (`setup.mjs:119`) | **Non créé** sur le parcours adopté |

## Ce qu'il faudra prouver

- Projet réel (Next.js + Prisma + `AGENTS.md` perso + `.gitignore` à une ligne) : les règles de
  méthode arrivent **dans** `AGENTS.md` **et** `CLAUDE.md`, entre marqueurs, perso **intact ligne à
  ligne**, et `git status` ne montre **aucun** ` M ` sur un fichier qu'il possédait.
- `git check-ignore .env` → **ignoré**.
- **Aucun renvoi mort** dans le bloc livré : un garde neuf, car `promesses-livrees.test.mjs` ne
  couvre PAS cette classe — sa regex (`:68`) ne lit que `scripts|templates|stacks|cursor-plugin`,
  son message (`:97`) **encourage** `docs/…`, et `AGENTS.md` n'est pas dans sa carte
  (`carte.has('AGENTS.md') === false`, mesuré).

  **La liste que ce garde doit connaître** — sans elle il est inécrivable, et la 2ᵉ revue a mesuré
  que personne ne peut la dériver du reste de la spec. Chemins **absents** d'un projet adopté :
  `maquette/` · `docs/design.md` · `docs/PRD.md` · `docs/ROADMAP.md` · `docs/ARCHITECTURE.md` ·
  `docs/DOMAINS.md` · `AGENTS-stack.md` · `ai-context/<stack>/` · `.env.example` ·
  `docs/RUN.md` **si l'analyse ne l'a pas écrit**.
  Présents, donc autorisés : `docs/agents/JOURNAL.md`, `state.yaml`, `inventaire.md` (décision 7 :
  la fonction est appelée), `docs/glossaire.md`, `docs/memory/`, `docs/APPRENTISSAGE.md`.
  **Ancrage** : le garde asserte sur `renderAgentsFile({stack:'aucune'})`, pas sur les templates
  sources — et il porte un garde de montage, convention du dépôt (`promesses-livrees.test.mjs:92`).
- `--refresh` **idempotent** sur projet adopté : deux passages, un seul bloc, et **aucun fichier de
  stack re-livré**.
- Fichier perso contenant un marqueur littéral → **refus explicite**, zéro perte.
- Parcours neuf : **5 questions**, forme des réponses inchangée, `degraissage.test.mjs` vert.
- Sous **Cursor et Codex** : la question autoskills n'apparaît pas.
- Les 4 skills design du kit **survivent** à un run autoskills (`frontend-design` en particulier).
- `--adopt` **sort avant `needsWizard`** et pose ses 2 questions ; `--stack aucune` scaffolde en
  **exit 0**, zéro ENOENT.
- Aucun des trois fichiers de la décision 9 ne dit « `/new-project` » sur un projet adopté.
- `git config --get core.hooksPath` n'a pas changé sans accord.
- `templates.mjs` « ## Commandes » et `.cursor/rules/10-css-maquette.mdc` sont d'accord avec le
  bloc livré (`promesses-livrees.test.mjs:159-170` compare déjà les deux).
