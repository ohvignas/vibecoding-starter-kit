# Découper les runbooks en étapes — plan d'exécution (v3)

**But** : `/new-project` ne doit plus être **un mur de 170 lignes**. Un point d'entrée court, puis
**une étape = un fichier**.

**Décisions de l'utilisateur, non rediscutables** : étapes **portables** aux 3 assistants **et**
skill Claude Code · **les 10** commandes · **3 ajouts PRD** (arborescence, problème, objectifs
commerciaux).

> **Historique** — v1 : **non exécutable** (5 erreurs, 9 oublis, pire ordre possible).
> v2 : réécriture, validée en contexte frais → **exécutable avec 10 corrections**, toutes mesurées.
> v3 = v2 + ces 10 corrections. Les erreurs des deux premières sont listées à la fin.

---

## Contraintes mesurées

| Fait | Valeur |
|---|---|
| Tests | **404 / 0 fail** |
| Tailles | new-project **170** · new-feature 58 · init-vibecoding 54 · help 48 · doctor 36 · deploy 36 · build 23 · edit-design 20 · next 16 · sos 12 |
| Rouges après découpage | **21** sans P1 · **22** si P1 est appliqué tel que v2 le disait (mesuré) |
| Paquet npm | 232 fichiers → ~241 ; plafond `package-publish.test.mjs:78` = 300. `package.json` inclut `templates` **en bloc** : rien à câbler. |
| Skills livrés | Claude Code seulement (`matrix.mjs:55`) |

**Les 9 consommateurs** : `commands-list.mjs` · `kit-owned.mjs` · `setup.mjs` ·
`build-cursor-plugin.mjs:32` · `validate-commands.mjs` · `validate.mjs:9-11` *(seulement — `:18-23`
boucle sur `resolveAssets().copies`, qui ne contient **aucune** entrée `templates/commands`)* ·
`refresh.mjs:38-50` · `smoke-e2e.mjs:30-40` · **`templates/commands/doctor.md:6`** *(le « critère
officiel de fin d'installation » : sans lui, un projet amputé des 9 étapes obtient ✅)*.

---

## 🔴 Bloqueur : le `mkdir` seul casse la suite

`docs.test.mjs:488` fait `readdirSync` **sans filtre `.md`** puis `readFileSync`. **Mesuré** : créer
le dossier vide suffit → `EISDIR: illegal operation on a directory, read`. À corriger en premier.

## 🔴 La numérotation des phases fuit en **12 endroits**, dont 3 copiés chez l'utilisateur

| Où | Atteint l'utilisateur ? |
|---|---|
| `matrix.mjs:280` · `:287` · `setup-ai.mjs:97` | ✅ rendus dans `docs/A-FAIRE.md` |
| **`templates/prd/PRD.md:3`** · **`templates/specs/architecture.md:3`** | ✅ copiés en `docs/templates/` (`setup.mjs:163-167`) |
| `templates/env/{saas,desktop,vitrine}.env.example` | ✅ copiés en `.env.example` |
| `templates/commands/edit-design.md:8,10` · `templates/agents/design-rule.md:9` | ✅ livrés |
| `parcours.test.mjs:150` | 🔒 **verrouille** la promesse : `assert.match(setup, /Phase 7/)` reste vert pendant qu'elle devient fausse |

**Découper est réécrire.** Ces 12 textes et leur garde font partie du chantier.

## 🔴 Livraison — tranchée par le dépôt, pas par nous

`parcours.test.mjs:206` : `assert.ok(!txt.includes(\`${COMMANDS_DIR[autre]}/\`))` — un utilisateur
Cursor ne doit **jamais** être renvoyé vers `docs/commands/`. La v2 proposait `docs/commands/` pour
les trois : **c'est interdit par l'invariant**.

→ Les étapes vont dans le **dossier natif de chaque assistant** :
`.cursor/commands/new-project/` · `.claude/commands/new-project/` · `docs/commands/new-project/`.
Conséquence assumée : `degraissage.test.mjs:62` (« exactement 10 dans `.cursor/commands/` ») **rougit
et doit être mis à jour** — c'est cohérent, contrairement à la v2 qui affirmait les deux.

## 🟠 Codex — la concaténation n'est plus « en réserve »

Chez Codex les runbooks sont des fichiers qu'un humain ouvre. Le découpage remplace **1 fichier par
9**, à la main, sans rien qui vérifie qu'il n'en a pas sauté un — et `NOTE_CODEX_COMMANDES`
(`commands-list.mjs:28`), le tout premier texte qu'il lit, lui promet « chacun est **un** fichier ».
De plus `05-design-maquette.md` reprend **61 des 170 lignes** : le mur est déplacé, pas supprimé.

→ **P2 génère pour Codex un `docs/commands/new-project.md` concaténé** (entrée + les 9 étapes en
séquence). Un seul fichier à ouvrir, comme aujourd'hui. `NOTE_CODEX_COMMANDES` reste vraie.

## 🟠 T0 — le skill, et pourquoi son issue (a) est la plus chère

Commande et skill homonymes sur Claude Code : comportement inconnu, **à mesurer**. Mais « le skill
gagne, on supprime la commande » casse l'invariant d'**une** liste de 10 commandes identique aux 3
assistants (`commands-list.mjs`) : rougissent `duplications.test.mjs:33-34`, `degraissage.test.mjs:62,67`,
`kit-owned.test.mjs:12`, `commands.test.mjs:32` ; et `colle-moi.mjs:23`, `setup-ai.mjs:11`,
`parcours.test.mjs:84` promettraient `/new-project` à un Claude Code qui ne l'a plus.
**T0 ne bloque que le volet skill.**

---

## Structure cible

```
templates/commands/
  new-project.md              ← entrée ~30 lignes : $ARGUMENTS + parcours + checklist ordonnée
  new-project/
    00-mode-et-cadre.md       ← attribution légale · Mode de travail · tags transverses
    01-cadrage.md             ← brainstorm + PROBLÈME + ENTREPRISE + OBJECTIFS COMMERCIAUX
    02-prd.md
    03-stack-et-architecture.md
    04-arborescence.md        ← NOUVEAU
    05-design-maquette.md     ← 61 lignes : le plus gros
    06-roadmap.md
    07-scaffold.md
    08-fini-quand.md
```

⚠️ **`$ARGUMENTS` (`:6-7`) reste dans l'ENTRÉE.** C'est le contrat de substitution : l'assistant ne
substitue que le fichier chargé **comme commande**. Dans une étape citée par son chemin, il devient
du texte littéral et son repli (« si vide, demande la description ») perd son déclencheur.

Vérifié ligne à ligne : **aucune ligne de contenu ne tombe entre deux fichiers** (0 ligne non vide /
non `---` hors de la cartographie).

---

## Ordre — lecteurs → livraison → découpage

### P1 — Étendre les lecteurs, **sans toucher aux identités**

**À étendre** (balayages) : `docs.test.mjs:488` *(le filtre `.md` — le crash)* ·
`crew.test.mjs:316` · **`crew.test.mjs:436`** · `runbook-executable.test.mjs:43` ·
`PROSE` (`commands.test.mjs:24-29`) · `validate-commands.mjs`.

**À NE PAS étendre** — ce sont des **identités**, pas des balayages ; les étendre casse :
`commands.test.mjs:32` (`assert.equal(COMMANDES.length, 10)`) · `duplications.test.mjs:29`
(`deepEqual([...COMMANDS].sort(), surDisque)`). **Mesuré** : les étendre fait rougir D0, D6, D8 et E8
en P3 — 4 rouges sans rapport avec une perte de contenu, ce qui détruit l'unique justification de
l'ordre.

`validate-commands.mjs` : ancrer **chaque phase à SON fichier** (carte `phase → fichier`), et faire
de même pour **`OUTPUTS`, `RENVOIS` et `DEPTH`** — pas seulement `PHASES`. Concaténer rendrait les
gardes *plus* faciles à satisfaire qu'aujourd'hui.

Gardes de montage sur les 8 tests qui deviendraient verts à vide (tableau ci-dessous).
**Cible : 404 vert, dossier vide** — c'est ce qui prouve l'équivalence des lecteurs.

### P2 — Livraison
`setup.mjs` · `kit-owned.mjs` (**fichier par fichier, jamais le dossier** : `refresh.mjs` lit le
chemin → EISDIR ; déjà documenté `kit-owned.mjs:76-77`) · **`build-cursor-plugin.mjs:32`** (copie
fichier par fichier depuis `COMMANDS`, n'emportera pas le dossier sans modification) ·
`degraissage.test.mjs:62,67` (comptes en dur) · **la concaténation Codex**.
`--refresh` **n'efface jamais** (`refresh.mjs:38-50`) : figer la numérotation des étapes maintenant,
une renumérotation ultérieure laisserait des orphelins à vie.

### P3 — Découper
**Avant de commencer** : extraire la liste des marqueurs de l'ancien fichier dans le test de P6 — la
référence disparaît au commit. Puis découper. Seul signal attendu : **la perte de contenu**.
Régénérer `cursor-plugin/` (12 fichiers suivis par git) et le committer.
La garde `smoke-e2e` arrive **ici**, pas en P1/P2 : avant P3 le dossier est vide, `assert.ok(vues > 0)`
y serait rouge.

### P4 — Contenu
Les 3 ajouts PRD · les **12** fuites de numérotation · `commands-list.mjs:28`
(`NOTE_CODEX_COMMANDES`) · `parcours.test.mjs:150` ancré sur autre chose que « Phase 7 ».

### P5 — Les autres commandes
`new-feature` · `init-vibecoding` · `help` · `doctor` → dossier d'étapes.
`deploy` → ⚠️ `commands.test.mjs:51-69` exige `^## SaaS|Mobile|Desktop|Vitrine` multiligne,
`gh run watch`, `security-reviewer`, `npm run make`, et `electron:distribution` + « Claude Code »
**sur la même ligne**. À traiter, pas à subir.
`build` · `edit-design` · `next` · `sos` → **restent monolithiques**.

### P6 — Gardes · P7 — contrôle + revue par agent frais.

---

## Les 8 gardes qui deviendraient verts à vide

| Fichier:ligne | Ce qui cesse d'être vérifié |
|---|---|
| `commands.test.mjs:296-305` | D9 PixelRAG — lignes visées parties en `05-`/`06-` |
| `commands.test.mjs:350-370` | D10 orphelins — `commit-commands`, `` `dev` ``, `3 essais`, `STITCH_API_KEY`, `/debug` |
| `commands.test.mjs:396,413` | `PROSE()` → gardes `state.yaml` aveugles aux étapes |
| `runbook-executable.test.mjs:134` | `doesNotMatch(/vite\s*\+\s*react/i)` — négative |
| `runbook-executable.test.mjs:173` | `doesNotMatch(/docs\/superpowers\/specs/)` — négative |
| `proof.test.mjs:47-48` | `doesNotMatch(/`\.claude\/agents\/`/)` — ligne partie en `06-` |
| `parcours.test.mjs:150` | `match(setup, /Phase 7/)` vert alors que la phase n'existe plus |
| `smoke-e2e.mjs:30-40` | ne vérifie que `.cursor/commands/new-project.md` |

*(`commands.test.mjs:344-348` — miroir du plugin — était classé ici en v2 : **c'est un rouge par
déplacement**, pas un vert à vide. Mesuré.)*

## Les tests, par catégorie — **21 rouges**, pas 19

- **Crash (1)** : `docs.test.mjs:488`.
- **Rouges par déplacement** : `runbook-executable` (9) · `commands.test.mjs:307-322`, **`:324`**
  (templates PRD/archi + plafond 175 `:332`), **`:344-348`** (miroir plugin) ·
  **`crew.test.mjs` R3 `LIGNES_APPROUVEES:457-505`** *(liste blanche de lignes **verbatim** de
  `new-project.md` — le couplage le plus fragile du dépôt, absent des v1 et v2)* ·
  `brainstorm-beginner:11-19` · `critics:35-42` · `agents-templates:82-88` · `duplications:87-90` ·
  `new-project-runbook:9`.
- **Rouges au câblage (2)** : `degraissage.test.mjs:62` *(pas `:63`)* et `:67`.
- **Indifférents (8)**.

---

## Ce qu'on ne prouvera pas, et qu'on n'affirmera pas

- **« Une IA lira les étapes »** — un renvoi de chemin n'est pas un chargement.
- **« Rejouer `/new-project` de bout en bout sur les 3 assistants »** — impossible : la Phase 7 passe
  par `npm create convex@latest`, qui **demande un compte** (`runbook-executable.test.mjs:77-78` le
  dit déjà). Promesse retirée.
- ⚠️ `runbook-executable.test.mjs:14-15` cite un run « joué le 2026-08-04 » déposé dans
  `docs/superpowers/audits/` — **le fichier n'y est pas** (3 fichiers, 07-08 et 07-27). Si on cite un
  run, on dépose le fichier.

Prouvable statiquement, et à faire : chaque chemin cité existe · chaque étape citée exactement une
fois · l'ordre des numéros = l'ordre de la liste · l'union entrée+étapes contient **tous** les
marqueurs de l'ancien fichier.

---

## Erreurs des v1 et v2, gardées pour ne pas les refaire

**v1** — 5 consommateurs au lieu de 8 · « la Phase 3 fond dans 00-parcours » (c'est une consigne
opératoire post-PRD) · 4 blocs sans destination dont **l'attribution légale** · « découper n'est pas
réécrire » · une limite de taille de skill non sourcée.

**v2** — « `report.mjs:16` promet `/new-project` » : **faux**, son commentaire dit littéralement
l'inverse et la ligne pousse `refCommande(assistant, 'help')` · `validate.mjs:18-23` listé à tort ·
`commands.test.mjs:344-348` mal classé · 4 fuites de numérotation au lieu de 12 · `degraissage:63`
au lieu de `:62` · 19 tests au lieu de 21 · livraison en `docs/commands/` pour les 3, **interdite**
par `parcours.test.mjs:206` · et surtout : **ses instructions P1 auraient elles-mêmes fait rougir P3
pour 4 raisons étrangères à la perte de contenu**.
