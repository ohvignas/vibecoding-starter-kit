# Le kit s'installe sur un projet qui existe déjà — design v2

**Date :** 2026-08-21 · **Base :** `513d1f2`, kit 0.16.0, 432 tests verts.
**v1 : À REPRENDRE** (revue par agent frais, 2026-08-21). Six bloquants, dont une prémisse fausse.
Tout ce qui suit a été **remesuré**.

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

**→ Les 6 phrases sont réécrites pour tenir SANS maquette**, en gardant leur exigence : comparer au
**rendu attendu** quand il existe, et le dire quand il n'existe pas. Le rendu adopté descend à
~1860 mots, sans renvoi mort.

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
   **→ autoskills est proposé APRÈS l'installation du kit, et l'écran de résultat nomme les skills
   remplacés.** Un `--dry-run` obligatoire d'abord.

Garde-fous : `--dry-run` toujours en premier · masqué sous Cursor et Codex · l'outil, son auteur et
sa licence sont nommés — ces skills ne viennent pas du kit et n'ont pas été relus par lui.

## Décision 6 — Le point d'entrée est un drapeau, pas une question

**⛔ Ce que la v1 avait raté :** le wizard demande la **stack en question 1** (`wizard.mjs:89`) et le
**dossier en question 3** (`:94`). Il choisit une stack deux questions avant de savoir où il
atterrit. Une « question 0 » décalerait le script que `degraissage.test.mjs:50` fige — donc casserait
le test que la v1 promettait de garder vert.

**→ `npx create-vibecoding-kit@latest --adopt`, lancé depuis le projet.** Pas de question ajoutée au
wizard ; le parcours neuf est **strictement inchangé**, ses 5 questions et son test aussi.

**Critère d'adoption** : le dossier contient ≥ 1 entrée hors `.git/`, `.DS_Store`, `node_modules/`,
`.vibecoding.json`. Le kit **montre ce qu'il a trouvé et demande** — jamais de devinette silencieuse.
Cas limites assumés : dossier vide sous git → *neuf* (rien à adopter) · projet non-JS sans
`package.json` → adopté, mais `RUN.md` restera vide et le dira · monorepo → `gitinit.mjs:37-42`
saute déjà les hooks proprement, mais les fichiers iront au niveau visé par `--project`, et on le dit.

`/init-vibecoding` `00-detecter-l-etat.md` gagne son **troisième cas** : pas de `.vibecoding.json`
mais un dossier non vide → propose `--adopt`, jamais le scaffold.

## Décision 7 — On ne touche pas à son `package.json`

C'est son fichier de build. `environment.mjs:107-110` n'est **pas** appelé sur le parcours adopté.
Conséquence assumée et dite : les checks du kit (`typecheck`, `lint`) ne tourneront pas
automatiquement. L'état des lieux relève les scripts **qui existent** et s'en sert.

## Décision 8 — Le `.gitignore` est complété, pas ignoré

⛔ Régression mesurée : projet avec `.gitignore` ne contenant que `node_modules/` → le kit pose
`.env.example` (donc invite à créer un `.env`) et `copyIfAbsent` (`setup.mjs:279`) **saute** le
`.gitignore`. Résultat : `git check-ignore .env` → **non ignoré**. Son secret part au commit.

**→ Sur le parcours adopté : pas de `.env.example` (stack absente, décision 1), et les lignes
`.env` / `.env.*` / `!.env.example` sont AJOUTÉES à son `.gitignore` si elles manquent**, après
accord, en fin de fichier, sans rien réordonner.

---

## Périmètre — hors de ce chantier, mais DIT

Chacun est un défaut réel, mesuré, laissé de côté volontairement :

| Laissé | Ce que ça fait en attendant |
|---|---|
| **`docs/ROADMAP.md` squelette** (`setup.mjs:242`) | **Non posé sur le parcours adopté** — sinon `/build` exécute un plan fictif. `/build` sans roadmap renvoie déjà à `/next` |
| **`/doctor` sur projet adopté** | Items 8/10/11/15/16/17 supposent des fichiers du kit, et le verdict (`doctor.md:37`) renvoie à `/new-project`. **Un item de plus dira que sur `stack: aucune`, ces items sont sans objet** — l'adapter en profondeur est un autre lot |
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
- `--refresh` **idempotent** sur projet adopté : deux passages, un seul bloc, et **aucun fichier de
  stack re-livré**.
- Fichier perso contenant un marqueur littéral → **refus explicite**, zéro perte.
- Parcours neuf : **5 questions**, forme des réponses inchangée, `degraissage.test.mjs` vert.
- Sous **Cursor et Codex** : la question autoskills n'apparaît pas.
