# Découper les runbooks en étapes — plan d'exécution (v2)

**But** : `/new-project` ne doit plus être **un mur de 170 lignes**. Un point d'entrée court, puis
**une étape = un fichier**.

**Décisions de l'utilisateur, non rediscutables** : étapes **portables** aux 3 assistants **et**
skill Claude Code · **les 10** commandes · **3 ajouts PRD** (arborescence, problème, objectifs
commerciaux).

> **v2** — la v1 a été critiquée en contexte frais et jugée **non exécutable**. Elle se trompait sur
> 5 points, en ratait 9, et proposait le pire ordre possible. Ce qui suit intègre la critique ;
> les erreurs de la v1 sont conservées en fin de document, pour ne pas les refaire.

---

## Contraintes mesurées

| Fait | Valeur |
|---|---|
| Tests | **404 / 0 fail** — aucune régression tolérée |
| Tailles | new-project **170** · new-feature 58 · init-vibecoding 54 · help 48 · doctor 36 · deploy 36 · build 23 · edit-design 20 · next 16 · sos 12 |
| Consommateurs | `commands-list.mjs` · `kit-owned.mjs` · `setup.mjs` · `build-cursor-plugin.mjs` · `validate-commands.mjs` · **`validate.mjs:9-11,18-23`** · **`refresh.mjs:36-38`** · **`smoke-e2e.mjs:33`** |
| Paquet npm | 232 fichiers (plafond `package-publish.test.mjs:78` : < 300) |
| Skills livrés | **Claude Code seulement** (`matrix.mjs:55`, `if (isClaude)`) |

---

## 🔴 Le vrai bloqueur : le `mkdir` seul casse la suite

`docs.test.mjs:488-489` fait `readdirSync('templates/commands')` **sans filtre `.md`** puis
`readFileSync` sur chaque entrée. **Mesuré** : créer le dossier vide suffit à lever
`EISDIR: illegal operation on a directory, read`. Avant qu'une ligne ait bougé.

Cinq autres lecteurs filtrent correctement (`commands.test.mjs:20`, `crew.test.mjs:316`,
`duplications.test.mjs:28`, `runbook-executable.test.mjs:43`) — **celui-là non**.

**C'est la première chose à corriger, avant tout le reste.**

## 🔴 La numérotation des phases fuit hors du runbook

« Phase 7 » et « Phase 5 » ne sont pas des repères internes : ils sont **rendus dans le
`docs/A-FAIRE.md` de chaque projet généré**.

| Où | Quoi |
|---|---|
| `matrix.mjs:280` (`SHADCN_NOTE`) | « `/new-project` **Phase 7** … » |
| `matrix.mjs:287` (`nativewindNote`) | « crée en **Phase 5** » |
| `setup-ai.mjs:97` | « quand `/new-project` (**Phase 7**) scaffoldera » |
| `parcours.test.mjs:150` | `assert.match(setup, /Phase 7/)` — **verrouille la promesse** |

Le test reste **vert** pendant que « Phase 7 » disparaît du runbook. Découper **est** réécrire :
ces trois textes et leur garde font partie du chantier.

## 🟠 T0 — le skill Claude Code, et pourquoi son issue (a) est la plus chère

Si Claude Code reçoit `.claude/commands/new-project.md` **et** `.claude/skills/new-project/SKILL.md`,
les deux réclament `/new-project`. **À mesurer.** Mais l'issue « le skill gagne, on supprime la
commande » **casse l'invariant fondateur** : `commands-list.mjs` existe pour qu'il n'y ait
**qu'une** liste de 10 commandes identique aux 3 assistants. La rendre dépendante de l'assistant fait
rougir `duplications.test.mjs:33-34`, `degraissage.test.mjs:63,67`, `kit-owned.test.mjs:12`,
`commands.test.mjs:32`, et laisse `colle-moi.mjs:23`, `report.mjs:16`, `setup-ai.mjs:11`,
`parcours.test.mjs:84` promettre `/new-project` à un Claude Code qui ne l'a plus.

**T0 ne bloque que le volet skill.** Le reste est portable par construction.

## 🟠 Codex y perd, et il faut le dire

Chez Codex les runbooks **ne sont pas des commandes** : ce sont des fichiers qu'un humain ouvre
(`commands-list.mjs:28`). Le découpage remplace **1 fichier à ouvrir par 8**, à la main, dans l'ordre.

**Parade** : l'entrée porte une **liste ordonnée numérotée** avec, pour chaque étape, son chemin
exact et sa sortie attendue — une checklist, pas une table des matières. À arbitrer si insuffisant :
générer pour Codex une version concaténée. **Ne pas prétendre que c'est neutre.**

---

## Structure cible

```
templates/commands/
  new-project.md              ← entrée ~30 lignes : parcours + checklist ordonnée des étapes
  new-project/
    00-mode-et-cadre.md       ← $ARGUMENTS vide · attribution légale · Mode de travail · tags transverses
    01-cadrage.md             ← brainstorm + PROBLÈME + ENTREPRISE + OBJECTIFS COMMERCIAUX
    02-prd.md
    03-stack-et-architecture.md ← la Phase 3 reste une étape (elle s'exécute APRÈS la PRD)
    04-arborescence.md        ← NOUVEAU
    05-design-maquette.md
    06-roadmap.md
    07-scaffold.md
    08-fini-quand.md          ← critères de fin
```

**Les 4 blocs que la v1 laissait sans destination** ont la leur : `:6-7` ($ARGUMENTS), `:9`
(**attribution légale BMAD/google-labs — obligatoire**), `:18-23` (Mode de travail + tags), `:169-170`
(Fini quand). Le bloc `:18-23` est **transverse** — référencé depuis `:90` (« mode pas à pas ») :
chaque étape qui s'en sert doit le **renvoyer explicitement**, sinon lue seule elle perd le sens.

Livraison : étapes dans `docs/commands/new-project/` pour **les 3 assistants**. Une seule copie.

---

## Ordre d'exécution — lecteurs → livraison → découpage

La v1 découpait d'abord : ~25 assertions rouges **plus un crash**, et le seul défaut qui compte —
une consigne perdue — devenait indiscernable du bruit. Chaque palier ci-dessous garde **404 vert**.

### P1 — Rendre les lecteurs conscients du dossier avant qu'il existe
- **`docs.test.mjs:488`** : ajouter le filtre `.md` *(le crash)*.
- `validate-commands.mjs` : lire **entrée + `new-project/**.md`**, et **ancrer chaque phase à SON
  fichier** (carte `phase → fichier`). Concaténer rendrait `PHASES` *plus* facile à satisfaire
  qu'aujourd'hui — l'inverse du but.
- Étendre au dossier : `commands.test.mjs:20` et `PROSE` `:24-29`, `crew.test.mjs:316`,
  `duplications.test.mjs:28`, `runbook-executable.test.mjs:43`.
- **Poser les gardes de montage manquantes** sur les 9 tests qui deviendraient verts à vide (liste
  ci-dessous).

Le glob est vide aujourd'hui → **404 doit rester vert**. C'est ce qui *prouve* que les lecteurs sont
équivalents avant et après.

### P2 — Câbler la livraison d'un dossier qui peut être vide
`setup.mjs` · `kit-owned.mjs` (**fichier par fichier, jamais le dossier** — `refresh.mjs` lit le
chemin, un dossier donnerait EISDIR ; c'est déjà documenté `kit-owned.mjs:76-77`) ·
`build-cursor-plugin.mjs` · `validate.mjs` · les comptes en dur `degraissage.test.mjs:63,67` ·
`smoke-e2e.mjs` et le contrôle 12 combinaisons **doivent exiger les étapes**. Toujours vert.

### P3 — Découper
Seule chose qui peut rougir : **la perte de contenu**. Signal isolé, c'est tout l'intérêt de l'ordre.

### P4 — Le contenu
Les 3 ajouts PRD · la réécriture de `matrix.mjs:280,287` et `setup-ai.mjs:97` (numérotation) ·
`parcours.test.mjs:150` ancré sur autre chose que « Phase 7 ».

### P5 — Les 9 autres commandes
`new-feature` (58), `init-vibecoding` (54), `help` (48), `doctor` (36) → dossier d'étapes.
`deploy` (36) → **attention** : `commands.test.mjs:51-69` exige `^## SaaS|Mobile|Desktop|Vitrine` en
multiligne, `gh run watch`, `security-reviewer`, `npm run make`, et `electron:distribution` + « Claude
Code » **sur la même ligne**. Un fichier par stack casse ce bloc : à traiter, pas à subir.
`build` (23) · `edit-design` (20) · `next` (16) · `sos` (12) → **restent monolithiques**.

### P6 — Gardes, puis P7 — contrôle + revue par agent frais.

---

## Les 9 gardes qui deviendraient verts à vide

| Fichier:ligne | Ce qui cesse d'être vérifié |
|---|---|
| `commands.test.mjs:296-305` | D9 PixelRAG — boucle sur les 10 `.md` ; les lignes visées partent en `05-`/`06-` |
| `commands.test.mjs:350-370` | D10 orphelins — `commit-commands`, `` `dev` ``, `3 essais`, `STITCH_API_KEY`, `/debug` plus interdits dans les étapes |
| `commands.test.mjs:396,413` | `PROSE()` ne liste que les 10 `.md` → gardes `state.yaml` aveugles aux étapes |
| `commands.test.mjs:344-348` | D10 miroir plugin — compare 10 fichiers ; les étapes embarquées ne sont comparées par rien |
| `runbook-executable.test.mjs:134` | `doesNotMatch(/vite\s*\+\s*react/i)` — satisfaite dès que le desktop quitte le fichier |
| `runbook-executable.test.mjs:173` | `doesNotMatch(/docs\/superpowers\/specs/)` — idem |
| `proof.test.mjs:47-48` | `doesNotMatch(/`\.claude\/agents\/`/)` — la ligne visée part en `06-` |
| `parcours.test.mjs:150` | `match(setup, /Phase 7/)` vert alors que la phase n'existe plus |
| `smoke-e2e.mjs:29-40` | ne vérifie que `.cursor/commands/new-project.md` — un routeur **sans ses étapes** passe le gate |

Chacune reçoit une **garde de montage** (`assert.ok(vues > 0)` ou équivalent) en P1.

## Les 19 tests, par catégorie

- **Crash (1)** : `docs.test.mjs:488`.
- **Rouges par déplacement (8, ~25 assertions)** : `runbook-executable` (9 tests) ·
  `commands.test.mjs:307-322` · `brainstorm-beginner:11-19` · `critics:35-42` ·
  `agents-templates:82-88` · `duplications:87-90` · `new-project-runbook:9`.
- **Rouges au câblage (2)** : `degraissage.test.mjs:63` (exactement 10 commandes) et `:67` (10 dans
  le plugin).
- **Indifférents (8)** : citent `/new-project` comme chaîne, pas comme fichier.

---

## Ce qu'on ne peut PAS prouver, et qu'on n'affirmera pas

**« Une IA lira les étapes »** — un renvoi de chemin n'est pas un chargement.

Prouvable, statiquement : chaque chemin cité existe · chaque étape citée exactement une fois ·
l'ordre des numéros = l'ordre de la liste · l'union entrée+étapes contient **tous** les marqueurs de
l'ancien fichier.

Prouvable, dynamiquement : rejouer `/new-project` sur les 3 assistants et **déposer la transcription**
dans `docs/superpowers/audits/`. ⚠️ `runbook-executable.test.mjs:12-15` prétend déjà renvoyer à un run
« joué le 2026-08-04 » dans ce dossier — **le fichier n'y est pas**. Ne pas refaire la faute :
si on cite un run, on dépose le fichier.

Non prouvable hors ligne : que l'assistant **charge** effectivement le fichier.

---

## Ce que la v1 affirmait de faux (gardé pour ne pas le refaire)

1. « 5 consommateurs » → il y en a **8** (`validate.mjs`, `refresh.mjs`, `smoke-e2e.mjs` manquaient).
2. « La Phase 3 fond dans 00-parcours » → **non** : c'est une consigne opératoire exécutée *après* la
   PRD, pas un texte d'accueil.
3. « Chaque ligne atterrit dans une étape » → **4 blocs** n'avaient aucune destination, dont
   **l'attribution légale**.
4. « Découper n'est pas réécrire » → **faux** : la numérotation des phases est promise hors du
   runbook et verrouillée par un test.
5. « Skills ≤ 500 lignes, ≤ 5 000 tokens » → **non sourcé**, aucun test du kit ne l'applique. Retiré.
