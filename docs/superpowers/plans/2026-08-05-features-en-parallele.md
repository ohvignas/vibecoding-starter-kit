# Plusieurs features en parallèle, sans casser git ni le serveur — plan v2

> **Pour l'agent exécutant :** SOUS-SKILL REQUIS — `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans`. Les étapes sont en cases à cocher (`- [ ]`).

**But :** qu'un utilisateur qui mène deux chantiers dans deux chats ne casse ni l'historique git,
ni le serveur de dev de l'autre.

**Origine :** défaut vécu, rapporté le 2026-08-05. L'utilisateur ouvre un chat par feature, obtient
des conflits git à répétition et des collisions de serveur (`npx convex dev` sur `:3210` lancé deux
fois). Son dépôt a **deux branches : `main` et `dev`, `dev` étant celle sur laquelle il travaille en
local**. Il a dû écrire à la main un « prompt type » que le kit devrait porter.

---

## v3 — les 8 corrections de la seconde revue, à appliquer telles quelles

Seconde relecture par agent frais, 2026-08-05 : **UTILISABLE APRÈS CORRECTIONS**. Le mécanisme
`git rev-parse --abbrev-ref HEAD` est validé (mesuré : `exit 0` sur un projet neuf sans remote, là
où `symbolic-ref` rendait 128). Ce qui manquait est de la **comptabilité de gardes** : la v2
appliquée verbatim donnait **417 pass / 5 fail** alors qu'elle n'en déclarait que 2.

| | Correction |
|---|---|
| **C1** | `/build` : écrire `git push -u origin HEAD --follow-tags`, **littéral**. Un placeholder `<ta-branche>` fait répondre `error: src refspec … does not match any` → **D7bis rouge**, et la page promet trois lignes plus bas `fatal: 'origin' does not appear…`. `HEAD` rend le message promis au mot près et pousse bien la branche courante. Pas de `$(…)` : D7bis exécute sans shell. |
| **C2** | `scripts/lib/validate-commands.mjs` — **fichier oublié**. `:206` exige la chaîne littérale `'--base main'`. → `['--base', …]`, plus un `interdit(/--base (main\|master)\b/, 'cible de PR en dur…')`. |
| **C3** | `scripts/lib/validate-new-feature.test.mjs` — **fichier oublié**. `:12` (`STEPS`), `:86`, `:90` (`omitStep`, égalité stricte), `:91` (l'assertion bascule sur l'interdit de C2). |
| **C4** | L'inventaire verbatim perd **quatre** lignes, pas une : celle du préflight **et** les trois de `04-livraison.md`. Réécrire les 4 en place, longueur **40** tenue. |
| **C5** | D2 amendé garde **deux** assertions. Sinon il ne prouve plus rien que D10 (`:527`) et `validate-commands.mjs:241` ne prouvent déjà : un test vide sous un titre. |
| **C6** | **L'« item `--refresh` » de `/doctor` n'existe pas** — `--refresh` n'y est qu'un remède (items 6, 7, 15, 16). Le vrai coût est de **2 éditions** : un item `19.` **et** la chaîne `**19 est optionnel**` dans le verdict, sinon D6ter rouge. `templates/commands/doctor.md` entre dans la liste des fichiers. Ne pas étendre la plage bloquante : un `.new` non lu n'est pas une installation cassée. |
| **C7** | `/build` : nommer la commande d'intégration (`git pull --rebase`, pas « intègre »), et annoncer le message que git donne quand la course est perdue (`Updates were rejected because the tip of your current branch is behind`). Même exigence que D7bis impose déjà au reste de la page. |
| **C8** | *(non bloquant, à consigner)* `/build` ne nomme aucun moyen de créer un dossier de travail séparé — **0 occurrence** de `worktree` après la v2, alors que l'encart en demande un. Et la tâche 3.3 ne ferme que le trou `promesses-livrees` : les interdits de D10 restent non vérifiés sur `templates/run/`. |

**La fenêtre TOCTOU est réelle et assumée** : `git fetch` puis `git push` n'empêche pas un push
concurrent entre les deux. Ce n'est pas du théâtre pour autant — mesuré : sans fetch l'agent voit
`## main...origin/main` et **se croit à jour** ; avec fetch il voit `[behind 1]`. C7 couvre le cas où
la course est perdue quand même.

---

## Historique — v1, et pourquoi elle est morte

La v1 durcissait `/new-feature` et inventait un champ de manifeste `baseBranch` dérivé par
`git symbolic-ref`. Relue par un agent frais le 2026-08-05, verdict **À REPENSER**. Ses cinq erreurs,
gardées ici pour ne pas les refaire :

1. **Elle visait le mauvais runbook.** `/new-feature` a **déjà** worktree + `feat/` + PR + squash.
   C'est `/build` qui casse git — voir la tâche 1.
2. **`symbolic-ref` échoue** dans un dépôt né du scaffold : `exit 128` tant qu'aucun `git fetch`
   n'a eu lieu, et la v1 le lisait **avant** son propre `fetch`. Mesuré 3 fois.
3. **Il rend la branche par défaut, pas la branche d'intégration.** Le dépôt de l'utilisateur a
   `main` par défaut et travaille sur `dev` : la voie aurait rendu `main`, donc rien.
4. **`baseBranch` était un champ mort** : `setup.mjs:297` écrit un objet fixe, `refresh.mjs:17` ne
   lit que `stack`/`assistant`. Rien ne l'écrit, rien ne le lit, rien ne le propose.
5. **Incohérence par construction** : base dérivée mais `gh pr create --base main` en dur
   (`04-livraison.md:9`, verrouillé par D2). L'utilisateur aurait branché depuis `dev` et ouvert sa
   PR vers `main` — strictement pire qu'aujourd'hui.

**Ce que la v2 retient de la v1 :** le diagnostic (bases désynchronisées, deux serveurs, schéma non
annoncé) était juste. Le mécanisme était faux.

---

## Contraintes globales — mesurées, non négociables

| Contrainte | Valeur mesurée | Conséquence |
|---|---|---|
| Plafond `AGENTS.md` | **2193 / 2200** (`saas/*/learning=true`) | **7 mots de marge.** Aucune règle standing nouvelle. |
| `` `dev` `` interdit dans les runbooks | `commands.test.mjs:76` (D2), `:527` (D10), `validate-commands.mjs:241` | Aucune branche nommée en dur. On lit **la branche courante**. |
| D2 fige aussi la cible | `commands.test.mjs:77-78` : `Merge sur \*\*\`main\`\*\*` et `mergé sur \*\*\`main\`\*\*` | La tâche 2 **doit** amender D2. C'est une décision, pas un contournement — argumentée à la tâche 2. |
| Suite verte | **422 / 0 fail** à `5bc164f` | Chaque tâche finit à 422 + ses tests, 0 fail. |
| `cursor-plugin/` est le miroir exact des runbooks | D10 `commands.test.mjs:514` | **Régénérer `build-cursor-plugin.mjs` dans CHAQUE tâche**, avant de lancer la suite. Mesuré : sans ça, rouge dès la tâche 1. |
| Inventaire verbatim de `/new-feature` | `new-feature-runbook.test.mjs:47`, longueur figée à **40** (`:83`) | Toute ligne du préflight réécrite doit être **mise à jour en place** dans le même commit, avec la raison. Ne jamais en retirer une. |
| `docs/RUN.md` est `policy: 'new'` | `kit-owned.mjs:141` | Un `--refresh` produit `docs/RUN.md.new` et **ne touche pas** l'original. Mesuré. La tâche 3 l'assume explicitement. |
| `templates/run/*.md` n'est sous **aucun** garde | absent de `resolveAssets().copies` et de `kitOwnedFiles` → invisible à `promesses-livrees.test.mjs` et à D10 | La tâche 3 ajoute la couverture, sinon on écrit de la prose non gardée. |
| `renderRunDoc` | signature réelle `{ template, stack, assistant, backend }` (`run-doc.mjs:10`) ; sans `template` → `undefined` | Les tests lisent **les 4 fichiers au disque**, pas un rendu partiel. |
| `run-doc.mjs` n'a **pas** de tronc commun | 16 lignes, préfixe 2 notes au `template` reçu | 4 copies de la règle. Assumé, avec un test qui les compare entre elles. |
| `grep` = `ugrep`, `perl -i` peut ne rien faire | 3 faux verts sur ce dépôt | Tout harnais de mutation **sort en erreur** si la cible est introuvable. |
| Commiter avant de muter | un `git checkout -- .` a détruit un palier | Restauration depuis une **copie mémoire**. |
| Publication | consigne debout | **Aucun `npm publish`.** Push GitHub autorisé (accordé le 2026-08-04). |

### La décision de conception, tranchée

L'utilisateur a `main` + `dev`, et travaille sur `dev`. Un débutant n'a que `main`.
**La base n'est ni un champ, ni la branche par défaut du remote : c'est la branche sur laquelle
l'utilisateur se trouve.**

C'est vrai dans les deux cas, sans question au scaffold, sans champ de manifeste, sans commande qui
échoue, et **sans jamais nommer `dev`**. `git rev-parse --abbrev-ref HEAD` — une commande, qui marche
dans un dépôt tout juste `git init`é.

Corollaire obligatoire, et c'est ce qui a tué la v1 : **la cible de la PR est la même branche**. Les
deux se dérivent ensemble ou pas du tout.

---

## Structure des fichiers

**Modifiés :**
- `templates/commands/build.md` — étape 7 (le push) et l'encart parallèle
- `templates/commands/new-feature/00-preflight.md` — synchro avant worktree
- `templates/commands/new-feature/04-livraison.md` — cible de la PR
- `templates/commands/new-feature.md` — encart parallèle
- `scripts/lib/commands.test.mjs` — D2 amendé (tâche 2)
- `scripts/lib/new-feature-runbook.test.mjs` — inventaire verbatim mis à jour
- `templates/run/{saas,mobile,desktop,vitrine}.md` — règle du serveur unique
- `scripts/lib/promesses-livrees.test.mjs` — couvrir `templates/run/`
- `README.md`, `package.json`

**Créés :** `scripts/lib/parallele.test.mjs`

**Interdits :** `templates/agents/*.md` (7 mots), `scripts/lib/gitinit.mjs` (le scaffold garde `main`).

---

## Task 1 — `/build` ne pousse plus à l'aveugle *(le plus fort rendement du lot)*

**Le défaut, mesuré.** `templates/commands/build.md:15` :

```
git push -u origin main --follow-tags
```

Push **direct sur `main`**, sans fetch préalable, avec la branche **écrite en dur**. `build.md`
(23 lignes) ne contient ni « worktree », ni « branche », ni « feat/ ». Or le README (`:214`) et
l'écran de fin du wizard poussent `/new-project` **puis `/build`** comme le parcours principal.
Deux chats en `/build` sur le même dépôt poussent tous les deux sur `main` : **c'est exactement le
symptôme rapporté**, et les règles de `/new-feature` n'y changent rien.

**Ce qu'on ne fait PAS.** On n'impose pas branche + PR à `/build`. Un débutant seul sur sa roadmap
n'a pas besoin de cette cérémonie, et l'imposer casserait le parcours principal du kit. On corrige
les deux fautes réelles : le push aveugle, et la branche en dur.

**Fichiers :** modifier `templates/commands/build.md` · test `scripts/lib/parallele.test.mjs`

- [ ] **1.1 — Test qui échoue**

```js
test('/build — le push est précédé d\'une synchro, et ne vise pas une branche en dur', () => {
  const t = read('templates/commands/build.md');
  const push = t.split('\n').find((l) => /git push/.test(l));
  assert.ok(push, 'montage : /build ne pousse plus du tout');
  assert.doesNotMatch(push, /push -u origin main\b/, 'la branche est écrite en dur : un projet qui travaille sur une autre branche verrait son jalon poussé ailleurs');
  const iFetch = t.search(/git fetch/);
  const iPush = t.search(/git push/);
  assert.ok(iFetch !== -1 && iFetch < iPush, 'rien ne synchronise avant le push : deux chats poussent en concurrence sur la même branche');
});
```

- [ ] **1.2 — Lancer, voir échouer** — `node --run test`, attendu : FAIL sur « branche en dur ».

- [ ] **1.3 — Réécrire l'étape 7 de `build.md`**

Remplacer `git push -u origin main --follow-tags` par (texte de référence) :

```markdown
   **Pousse sur la branche où tu es, jamais sur une branche nommée d'avance** : `git rev-parse --abbrev-ref HEAD` te la donne. Sur un projet neuf c'est `main` ; sur un projet qui a plusieurs branches, c'est celle que l'utilisateur a choisie — le kit n'en décide pas à sa place.
   **Synchronise avant de pousser** : `git fetch origin`, puis vérifie que ta branche n'a pas divergé (`git status` le dit). Elle a bougé ? Intègre **avant** de pousser. Sans ça, deux chantiers menés en même temps se poussent dessus — c'est la panne git n°1 quand on travaille sur deux features de front.
   Puis : `git push -u origin <ta-branche> --follow-tags`.
```

- [ ] **1.4 — Régénérer le plugin PUIS vérifier**

```bash
node scripts/build-cursor-plugin.mjs && node --run test
```
D10 (`commands.test.mjs:514`) compare `cursor-plugin/commands/**` aux runbooks : sans régénération,
rouge. Mesuré par la revue.

- [ ] **1.5 — Prouver que le garde mord** — remettre `git push -u origin main` → ROUGE.

- [ ] **1.6 — Commit.**

---

## Task 2 — La base et la cible de la PR se dérivent **ensemble**

**Le défaut.** `00-preflight.md` vérifie `gh auth status` et le remote, puis crée le worktree —
**sans synchroniser**. Deux features lancées à deux heures partent de deux bases : la seconde
conflicte. Et `04-livraison.md:9` ouvre la PR sur `--base main` en dur.

**L'amendement de D2 — décision, pas contournement.** `commands.test.mjs:77-78` fige
`Merge sur **`main`**`. Le but de D2 (lisible dans son titre) est *« le scaffold ne crée aucune
branche `dev` »* — et **ça reste vrai** : `gitinit.mjs` n'est pas touché. Ce qui change, c'est
qu'un runbook ne doit plus **présumer** de la topologie d'un dépôt qu'il n'a pas créé. D2 garde donc
son interdit (`doesNotMatch(/`dev`/)`) et échange ses deux `match` contre : la cible du merge est
**celle d'où l'on est parti**, et elle est **dérivée**, pas nommée.

- [ ] **2.1 — Test qui échoue**

```js
test('préflight — la base est synchronisée AVANT le worktree', () => {
  const t = read('templates/commands/new-feature/00-preflight.md');
  const iSync = t.search(/git fetch/);
  const iWorktree = t.search(/worktree/);
  assert.ok(iSync !== -1, 'le préflight ne synchronise pas : deux features partent de deux bases');
  assert.ok(iSync < iWorktree, 'la synchro doit précéder le worktree, sinon elle ne sert à rien');
});

test('la base et la cible de la PR sont la MÊME branche, dérivée', () => {
  const pre = read('templates/commands/new-feature/00-preflight.md');
  const liv = read('templates/commands/new-feature/04-livraison.md');
  assert.match(pre, /rev-parse --abbrev-ref HEAD/, 'la base doit se lire dans le dépôt');
  assert.doesNotMatch(liv, /--base main\b/, 'cible en dur : on brancherait depuis une base et on ouvrirait la PR ailleurs');
  assert.match(liv, /--base/, 'montage : la PR ne cible plus rien');
});
```
> Le regex `dev` de la v1 (`(?<!\p{L})dev(?!\p{L})`) est **abandonné** : il rougirait sur
> `npm run dev`, présent dans `templates/run/saas.md` et `vitrine.md`. La convention du dépôt est
> `` `dev` `` entre backticks, et elle est déjà tenue par D2/D10.

- [ ] **2.2 — Lancer, voir échouer.**

- [ ] **2.3 — Écrire le préflight** (3 points au lieu de 2) :

```markdown
## Préflight
1. Vérifie GitHub : `gh auth status`. Vérifie le remote : `git remote`. Si aucun remote → propose `gh repo create` et relie le projet.
2. **La base, c'est la branche où tu es** — `git rev-parse --abbrev-ref HEAD`. Sur un projet neuf, `main` ; sur un projet qui en a plusieurs, celle que l'utilisateur a choisie. **Synchronise-la** : `git fetch origin`, et intègre si elle a divergé. Sans ça, deux features lancées à deux moments partent de deux bases différentes, et la seconde conflicte au merge. **Retiens ce nom : la PR reviendra dessus.**
3. Crée un **worktree** isolé (`superpowers:using-git-worktrees`) sur une branche `feat/…`, **partant de cette base synchronisée**.
```

- [ ] **2.4 — Mettre à jour l'inventaire verbatim, EN LE DISANT**

`new-feature-runbook.test.mjs:47` porte la ligne 2 d'origine. Elle est réécrite → remplacer l'entrée
**en place** (la longueur reste **40**, `:83`), et ajouter au-dessus du tableau le commentaire qui dit
**laquelle** et **pourquoi** — le contrat que ce fichier impose et que P4 avait violé en silence.

- [ ] **2.5 — Réécrire la cible de la PR** dans `04-livraison.md` : `--base main` → `--base <la base relevée au préflight>`, et l'étape 10 « Merge sur la base d'où tu es parti ».

- [ ] **2.6 — Amender D2** (`commands.test.mjs:74-79`), en gardant `doesNotMatch(/`dev`/)` et en
      remplaçant les deux `match` par la propriété « cible dérivée ». Écrire l'argument en commentaire
      au-dessus : le prochain lecteur doit comprendre pourquoi la contrainte a bougé.

- [ ] **2.7 — Plugin + suite + mutation + commit.**

---

## Task 3 — Un seul serveur de dev

**Le défaut.** `3210`, « port occupé », « déjà en cours » : **0 occurrence** dans tout le dépôt.

**Où ça vit :** `docs/RUN.md` — sa raison d'être est « comment lancer l'app ». Pas `AGENTS.md`
(7 mots de marge).

**Ce qu'on assume, écrit noir sur blanc :** `docs/RUN.md` est `policy: 'new'`. Un projet **existant**
recevra `docs/RUN.md.new`, pas la règle dans son fichier. **Y compris le projet de l'utilisateur qui
demande cette feature.** On ne change pas la policy (elle protège ses notes) : on ajoute une ligne à
l'item `--refresh` de `/doctor` qui signale un `.new` non lu.

- [ ] **3.1 — Test qui échoue** — lire les **4 fichiers au disque** (pas `renderRunDoc`, dont la
      signature exige `template` et rend `undefined` sans lui — mesuré par la revue) :

```js
const STACKS = ['saas', 'mobile', 'desktop', 'vitrine'];
test('un seul serveur — les 4 RUN.md portent la règle, et la même', () => {
  const sections = STACKS.map((s) => {
    const t = read(`templates/run/${s}.md`);
    const m = t.match(/## Un seul serveur[\s\S]*/);
    assert.ok(m, `${s} : rien ne dit quoi faire si un serveur tourne déjà`);
    return m[0];
  });
  // 4 copies sans tronc commun (run-doc.mjs n'en a pas) : au moins qu'elles ne divergent pas.
  const cle = (x) => x.replace(/`[^`]+`/g, '<cmd>');
  assert.equal(new Set(sections.map(cle)).size, 1, 'les 4 copies ont divergé hors de la commande');
});
```

- [ ] **3.2 — Écrire la règle** dans les 4, identique hors commande :

```markdown
## Un seul serveur à la fois

Avant de lancer le serveur, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux
chantiers en même temps, ou que tu as laissé un terminal ouvert.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même
projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle
que tu modifies.
```

- [ ] **3.3 — Couvrir `templates/run/` par les gardes** — l'ajouter à la carte de
      `promesses-livrees.test.mjs` (aujourd'hui il est invisible : absent de `resolveAssets().copies`
      **et** de `kitOwnedFiles`). Sinon on vient d'écrire de la prose livrée que rien ne surveille.

- [ ] **3.4 — Prouver sur un projet RÉEL** — scaffolder les 4 stacks (chemin **absolu**) et relever
      la section dans le `docs/RUN.md` livré. Le rendu en mémoire ne suffit pas : c'est la faute
      exacte du Lot G (12 rendus, 1 seul scaffold).

- [ ] **3.5 — Plugin + suite + mutation (retirer la règle d'UNE stack → rouge nommant la stack) + commit.**

---

## Task 4 — « Deux de front », dans les DEUX boucles

**Le défaut.** `subagents-rule.md:18` interdit deux écrivains en parallèle **sur la même feature**.
Rien ne cadre deux **sessions**. Et une règle posée dans `/new-feature` seul ne serait **jamais lue**
par le second chat, qui fait `/build`.

- [ ] **4.1 — Test qui échoue** — la propriété est « les deux entrées la portent », pas une
      formulation :

```js
test('deux chantiers de front — /build ET /new-feature portent la consigne', () => {
  for (const f of ['templates/commands/build.md', 'templates/commands/new-feature.md']) {
    const t = read(f);
    assert.match(t, /un seul serveur/i, `${f} : rien sur le serveur partagé`);
    assert.match(t, /sch[ée]ma/i, `${f} : rien sur le changement de schéma`);
    assert.match(t, /RUN\.md/, `${f} : ne renvoie pas au fichier qui porte la règle`);
  }
});
```
> L'assertion `/worktree/i` de la v1 est **retirée** : la revue a mesuré qu'elle est déjà vraie sur
> l'entrée pristine (`new-feature.md:11`) — un tiers du test était vide.

- [ ] **4.2 — Écrire l'encart** dans les deux entrées :

```markdown
> **Deux chantiers en même temps ?** Un **dossier de travail par chantier** — jamais deux agents
> dans le même. **Un seul serveur de dev** partagé (voir `docs/RUN.md`). Et si tu touches au
> **schéma** de la base, **dis-le avant de le faire** : l'autre chantier travaille dessus.
```

- [ ] **4.3 — Vérifier le plafond de l'entrée** — `erreursChecklist(ROOT,'new-feature',40)`.
      Mesuré par la revue : l'entrée fait **15 lignes**, 25 de marge. Non bloquant, mais on revérifie.

- [ ] **4.4 — Plugin + suite + mutation + commit.**

---

## Task 5 — Livrer

- [ ] **5.1 — README**, une ligne :

```markdown
| 🔀 | **Deux chantiers de front** | un **dossier de travail par chantier**, la branche **synchronisée avant** de pousser ou de brancher (la cause n°1 des conflits git), **un seul serveur de dev** partagé, et tout changement de schéma **annoncé avant**. Le kit pousse sur **la branche où tu es** — il ne présume pas de la façon dont tu organises ton dépôt |
```

- [ ] **5.2 — Version** `0.14.0` → `0.15.0`.

- [ ] **5.3 — Gate complet**

```bash
node --run test && node scripts/build-cursor-plugin.mjs && node scripts/smoke-e2e.mjs
```
puis `git status --porcelain` **vide**.

- [ ] **5.4 — Parcours réel** — 4 stacks scaffoldées (chemins absolus), `docs/RUN.md` vérifié dans le
      projet livré, `--refresh` joué : `src/` et `docs/PRD.md` intacts, `docs/RUN.md.new` apparu
      **et signalé** par l'item `/doctor` de la tâche 3.

- [ ] **5.5 — Commit + tag annoté + push** (annoté : un tag léger ne part pas avec `--follow-tags`,
      mesuré sur ce dépôt).

- [ ] **5.6 — npm : S'ARRÊTER.** Afficher `npm publish`, **ne pas l'exécuter**.

---

## Ce que ce plan ne résout toujours pas — à dire à l'utilisateur

1. **Son projet existant ne recevra pas la règle du serveur** dans `docs/RUN.md` (policy `new`). Il
   aura un `.new` signalé par `/doctor`. C'est un choix : la policy protège ses notes.
2. **`/build` garde le push direct**, sans PR. On le rend sûr (fetch + branche courante), on ne le
   transforme pas en flux de PR — ce serait un autre chantier, et un autre public.
3. **Les tests restent des tests de présence de texte.** Ils prouvent que la consigne est écrite et
   livrée, pas qu'une IA l'applique. Le seul niveau au-dessus serait de lancer deux vrais agents en
   parallèle et de mesurer le résultat — hors périmètre.
