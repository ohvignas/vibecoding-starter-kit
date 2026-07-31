# Journal des revues de lots — remise en cohérence (2026-07-27)

Une section par lot : items, statuts, preuves, régressions.
Ce fichier est relu par le contrôle final Z1.

## Lot A — Dégraissage · verdict `PROUVÉ` (tour 1)

Commits : `48d080a` (lot) + `8e88bd9` (correctif de revue). Base : `077749c`.

**Items** : A1→A10 tous **CORRIGÉ**, avec preuve (suppressions effectives, zéro orphelin réel,
gate verte sur les 3 assistants, `karpathy.mdc` en `alwaysApply: false` vérifié sur un scaffold réel).

**Régression trouvée par la revue** : `templates/commands/help.md:19` affirmait que la Règle Preuve
portait la méthode de débogage (« reproduire → isoler → correctif minimal ») — **0 occurrence** dans
`proof-rule.md` ni dans l'`AGENTS.md` généré. Affirmation fausse expédiée dans chaque projet.
→ corrigée en `8e88bd9` : renvoi vers `superpowers:systematic-debugging` (le vrai porteur), et
la Règle Preuve n'est plus créditée que de ce qu'elle contient (3 tentatives → `BLOQUÉ`).
Chaque affirmation re-vérifiée dans le template **et** dans le livrable.

**Tests** : 249 → 247 (−4 supprimés avec `license`/`dream`, +9 de `degraissage.test.mjs`).
Les 9 nouveaux rejoués contre l'arbre pré-lot (`077749c`) : **0 pass / 9 fail** → rouges avant, verts après.

**Supprimé** : dream hook · Action `memory-consolidate` (consolidation gardée à la demande) ·
code d'accès · `ONBOARDING.md` · `/debug` · PixelRAG en prérequis · `karpathy` permanent.

## Lot B — Règles standing · verdict `PROUVÉ` (tour 1)

Commits : `e47d074` (lot) + `bcfff2a` (correctif de revue). Base : `11dc91d`.

**Résultat** : 7 contradictions résolues · 8 doublons fusionnés · volume **2 974 → 2 197 mots** (−26 %),
tenu **en compressant, pas en déplaçant le seuil** (test qui échoue au-delà de 2 200, prouvé en ajoutant
16 mots → échec, puis restauration).

**Trouvaille majeure de la revue** : `templates/cursor/rules/00-project.mdc` était la **seule autre règle
`alwaysApply: true`** — relue à chaque message par Cursor, comme `AGENTS.md` — et **contredisait** la
décision B5 en clair (« reviens au dernier état vert » impératif vs « option que l'utilisateur tranche »).
Elle n'était assignée à aucun lot. → transformée en renvois ; test qui interdit toute redéfinition dans
un fichier `alwaysApply: true` (rouge avant : 3 doublons nommés).

**Autres findings traités** : 2 affirmations d'exclusivité fausses (« nulle part ailleurs », « référence
unique ») → bornées et vérifiées · 6 consignes disparues sans qu'un item le demande → réintégrées
(dont « repars en conversation neuve » et « redimensionne ») · `completion-rule.test.mjs` **exigeait la
duplication** → réorientée (définition + renvoi), rouge avant.

### Dettes connues (non bloquantes, à reprendre si le budget se libère)
- `proof-rule.md:12` a perdu l'énumération « (un test, un check, une commande) » qui **définissait la
  frontière tâche vs jalon** — le cœur de la décision B1. **Priorité 1** dès que des mots se libèrent.
- « tranche avec l'utilisateur après la 2ᵉ passe » ne vit plus que dans `new-project.md:174` ; la borne
  « 2 passes maximum » de `subagents-rule` ne dit pas quoi faire à la limite (6 mots).
- **Marge de 3 mots** sous le plafond (2 197/2 200) : tout ajout à une règle casse la suite. Les lots C→H
  doivent le savoir avant de toucher `templates/agents/`.

### Résiduels réassignés
- `templates/commands/sos.md:7` renvoie à « règle des 3 **essais** » — titre qui n'existe plus → **Lot D**.
- `templates/cursor/rules/10-css-maquette.mdc:7` tolère la découpe par plages de lignes « sans vérifier
  les accolades » là où `css-maquette-rule.md:5` l'interdit absolument → **Lot F** (propriétaire de
  `templates/cursor/rules/`).
- Les 7 agents du crew redéfinissent les 3 tentatives : **inévitable** (ils ne voient pas `AGENTS.md`),
  valeurs identiques, aucune contradiction → cadré par **C6**.

---

## Lot C — crew opérationnel · `PROUVÉ` au 5ᵉ tour (`d8c08fe` → `6ceb301`)

**Les 7 items C1→C7 sont tenus**, vérifiés par un agent frais **dans les 3 projets scaffoldés** (pas
seulement dans `templates/`) : les 5 bridés ne reçoivent plus d'ordre d'écrire, l'inventaire de
complétude a enfin un chemin (`docs/agents/inventaire.md`), le `verificateur` n'invalide plus le TDD,
`state.yaml` est lu et reporté, PixelRAG est un signal indicatif, le bloc de règles est identique sur
les 7. Sur Cursor, C1 s'exprime autrement (`readonly: true` + « Interdit : Write, Edit ») — le fond tient
malgré la transformation. Gate mécanique vert : 272 tests, plugin sans diff, smoke E2E, paquet 4/4,
2189 mots sur les 3 assistants (plafond 2200).

### Ce que les 4 revues ont trouvé, et qu'aucun test ne voyait
1. **La graine annulait le correctif** (`JOURNAL.md:3`) : les 7 fichiers d'agents étaient corrigés, mais
   le fichier que tous lisent leur réordonnait d'écrire.
2. **Le kit exigeait un `PROUVÉ` qu'il interdisait de prononcer** : la clause uniformisée par C6 réservait
   le verdict au `verificateur`, alors que `build.md:10` exige aussi celui du `security-reviewer`.
   Tranché : **jalon** = `verificateur` seul · **feature** = `verificateur` + `security-reviewer`.
   L'invariant protégé est « jamais d'auto-`PROUVÉ` sur ce qu'on a écrit », pas « un seul agent conclut ».
3. **La source amont** (`remise-en-coherence.md:69`, table « Décisions déjà tranchées ») portait encore
   l'ancienne règle : les lots D→H l'auraient relue comme autorité.
4. **Une bannière de péremption affirmait deux faussetés** (numéros décalés de 2, contradiction attribuée
   au mauvais fichier) — écrite par l'orchestrateur, dans le texte même qui corrigeait cette erreur.

### La leçon transférable : la nature du test
Trois versions du garde-fou ont échoué en **énumérant les formulations interdites**. À chaque tour, la
revue produisait une phrase de plus qui passait (« donne le feu vert », attribution coupée sur deux
lignes, tournure impersonnelle « il est attendu de qui rend un rapport qu'il **grave** sa ligne »).
Un test ne peut pas décider « cette phrase française dit-elle quelque chose d'interdit ». Il peut
décider **« est-ce la ligne que j'ai approuvée ? »**. D'où :
- **R1** compare la graine à un **texte de référence exact** (sensibilité totale par construction) ;
- **R3** déclenche sur le **nom d'un agent** — sans casse, accents et tiret/espace couverts — dans
  **31 fichiers** (9 règles + 7 agents + 10 commandes + règles Cursor + 3 graines) et exige la présence
  dans un **inventaire approuvé** de 35 textes.

Bug de fond découvert au passage : **`\b` est ASCII**. `/\bécris\b/` ne matche jamais « écris » —
**8 alternatives** de deux motifs étaient du code mort, dont `\bà lui (?:de|seul)\b` en entier. Tout
motif pouvant croiser un accent passe désormais par une borne `\p{L}` avec le drapeau `u`.

### Limite assumée, écrite dans le test
Une ligne qui attribue l'autorité **sans nommer personne** (« une feature n'exige qu'un `PROUVÉ` : celui
du relecteur détaché ») échappe à R2 comme à R3 — mesuré, 272/0. De même, re-baser l'inventaire en même
temps que la ligne passe. Aucun ensemble fermé de déclencheurs ne caractérise une attribution en
français : **le test force la relecture, il ne la remplace pas.** C'est le plafond de ce qu'un test
garantit sur de la prose, pas un correctif oublié.

### Résiduels réassignés
- `templates/commands/build.md:10` fait écrire « `BLOQUÉ` » dans `state.yaml`, alors que l'énumération
  légale de la graine dit `blocked` → **Lot D**. Même ligne : l'orchestrateur y est second écrivain de
  `state.yaml`, sans que `AGENTS.md` lui donne la clé ni ses valeurs.
- `new-project.md:163` et `:172` citent l'« inventaire de complétude » **sans son chemin**, qui existe
  désormais → **Lot D (D9)**.
- **10 plans périmés** ont reçu une bannière « NE PAS REJOUER » : ils portaient l'en-tête « implement this
  plan task-by-task », des cases décochées, et des instructions contredisant l'état courant
  (`commit-commands` jamais installé, branche `dev`, 5 skills design au lieu de 4, PixelRAG bloquant).
  **19 autres** n'ont été testés que sur ces 5 classes de contradiction — relecture intégrale non faite.

---

## Lot D — commandes · `PROUVÉ` (`2e81c01` → `6c7b52e`)

**Les 10 items D1→D10 et les 3 résiduels sont tenus**, vérifiés par un agent frais sur les commandes
**livrées** de trois projets scaffoldés (cursor/saas, claude-code/desktop, codex/vitrine) : 13/13
contrôles verts chacun, avec un **témoin négatif** (l'état d'avant le lot, `972a130` : 12/13 en échec)
prouvant que le contrôle sait dire non. Gate mécanique : 299 tests, plugin sans diff, smoke E2E,
paquet 4/4, 2189 mots, 10 commandes livrées ×3.

### Trois défauts qui atteignaient le débutant sans filtre
1. **`/build` fabriquait un point de restauration qui ne partait jamais.** Tag **léger** + `git push
   --follow-tags`, qui ne pousse **que les tags annotés** — reproduit : 0 tag sur le remote. La page
   écrivait « un tag resté en local ne sauve rien si la machine lâche » et produisait exactement ça.
   Corrigé en tag **annoté** + `git push -u origin main --follow-tags` (une seule commande publie
   commit et tag), vérifié par exécution : le tag arrive et survit à un clone frais.
2. **Aucun remote dans un projet scaffoldé**, et `/build` ne le vérifiait pas → `fatal:` au 1ᵉʳ jalon.
   Contrôle `git remote` + deux sorties proposées (relier via `gh repo create`, ou rester local en
   sachant ce qu'on perd).
3. **`/deploy` prescrivait `electron-builder`** alors que le scaffold desktop du kit est **Electron
   Forge** (`create-electron-app`, `npm run make`). Commande introuvable chez l'utilisateur.

### Un message d'erreur cité sans être exécuté — et la faute est en amont
`/build` annonçait `fatal: No configured push destination` : message **exact**, mais d'une **autre
commande** (un `git push` nu). La citation venait du brief rédigé par l'orchestrateur, mesurée sur la
mauvaise commande, et reprise de confiance par l'implémenteur. D'où **D7bis**, qui **exécute** la
commande de push de la page dans un dépôt jetable sans remote et compare au message cité.

### Ce que 5 tours sur un seul garde ont appris
Quatre revues consécutives ont porté sur `D7bis`, jamais sur les décisions du lot :
- **Un faux positif est pire qu'un trou.** Une version accusait une page citant `fatal: No configured
  push destination.` *exactement comme git l'imprime*, point compris. Un garde qui rougit sur de la
  documentation juste **apprend à mal citer git pour le faire taire**.
- **Corriger une asymétrie en crée une autre.** En réparant « `startsWith` accepte un préfixe », la
  citation s'est mise à être délimitée par la ponctuation suivante : trois cas attrapés la veille
  perdus, et une troncature qui accusait à tort. Tout correctif de garde se teste **dans les deux
  directions**.
- **La règle juste est asymétrique** : entre backticks, l'auteur délimite lui-même → égalité exacte ;
  sans backticks, on ignore où la prose reprend → il suffit que le texte *commence* par un message
  réellement produit.
- **Un banc qui ne vérifie pas ses propres mutations ment.** Le banc de l'orchestrateur a déclaré
  « vert » deux cas jamais exécutés (backticks réinterprétés dans un `$(...)` shell) ; sans le
  contrôle « la mutation s'est-elle appliquée ? », un garde qui marchait allait être « corrigé ».
  Le banc échoue désormais bruyamment si le texte n'a pas changé.

Limites déclarées dans l'en-tête du garde, mesurées : un `fatal:` hors d'une ligne parlant de push
n'est pas jugé (on ne peut pas décider de quelle commande il vient) ; l'union des sorties quand une
page prescrit plusieurs formes de push ; les fichiers hors `templates/commands/`.

### Résiduels réassignés
- `templates/commands/doctor.md:19` et **`templates/hooks/framework/checks.mjs:16`** :
  `@doyensec/electronegativity` (abandonné 03/2023) n'est pas qu'une mention — c'est le **check
  `security` câblé**, qui tourne au `git push` et en CI pour la stack desktop. Le retirer suppose de
  décider **par quoi** le remplacer, sinon `prePush` pointe dans le vide → **Lot F (F5)**.
- `README.md:72` promet que `docs/` n'est « jamais touché » : faux sur les 3 assistants — `--refresh`
  régénère `docs/templates/` (2 fichiers), et 19 fichiers sur Codex (`docs/commands/`,
  `docs/agents/crew/`) → **Lot H**.
- `scripts/lib/report.mjs:11` (« Prochaine étape : lance /new-project ») contredit « l'entrée, c'est
  `/help` » → **Lot G (G6)**.
- `projectBaseDir` (`scripts/lib/args.mjs:83`) place le projet **à côté du clone du kit** quand
  `kitRoot` n'est pas dans `node_modules` — depuis un clone git, ça tombe dans `$HOME`. Comportement
  réel, à trancher au **Lot G** (parcours utilisateur).

### Erreurs de l'orchestrateur relevées par les agents, et corrigées
- Le brief D1 citait `validate-commands.mjs:37` ; la chaîne était en `:39`.
- Le brief D9 annonçait « 197 lignes = 48 % du corpus » ; mesure réelle **43 %** (197/458).
- La citation d'erreur git du brief F1 était mesurée sur la mauvaise commande (ci-dessus).
Le plan n'est pas une source de vérité supérieure au dépôt : un implémenteur qui vérifie son brief
et écrit le chiffre mesuré a raison contre lui.

---

## Lot E — code · `PROUVÉ` (`2a9d56c` → `e862445`)

**E1→E12 corrigés**, E7 partiel de son propre aveu — aveu que la revue a vérifié **exact** (deux
points non simulables sans machine Windows : qu'un `spawnSync('npx.cmd', …, {shell:true})` aboutisse,
et que git applique `eol=lf` au checkout). Gate : **333 tests**, plugin sans diff, smoke E2E, paquet
5/5, 12 combinaisons scaffoldées à 2189 mots avec leurs 10 commandes.

### Trois bugs à gravité réelle
1. **Le kit affichait ✅ sur une protection inexistante** (E3). Dans un dépôt git **déjà existant**,
   `core.hooksPath` n'était jamais posé : le scan de secrets ne tournait **jamais**, et le rapport
   affichait `✅ .githooks/pre-commit`. Corrigé, avec deux cas limites traités — dossier appartenant
   à un dépôt **parent** (on ne touche pas à sa config, on le dit), et `core.hooksPath` **déjà pris**
   par `.husky` (non écrasé, raison + commande exacte).
2. **`--refresh` pouvait vider `AGENTS.md`** (E2) : 15 017 → 1 393 octets, **exit 0**, les 9 règles
   perdues sans un mot, parce que `agents-file.mjs` avalait l'erreur (`catch { return '' }`). Il
   refuse maintenant d'écrire un rendu dégénéré et **nomme** le fichier manquant.
3. **Garde d'entrée sans `realpathSync`** (E1) : `update.mjs` et `build-cursor-plugin.mjs` lancés via
   symlink (`npm link`, `/tmp` sur macOS) sortaient en **0 sans rien faire**.

### Cinq duplications qui avaient DÉJÀ divergé
Constatées sur `270f1ec`, pas supposées : ordre des commandes dans `build-cursor-plugin` · `TARGET`
(matrix) vs `CMD_DIR` (kit-owned), deux cartes identiques sous deux noms · **la regex de nom de
projet** — `--project projet-café` accepté par le drapeau, **refusé par le wizard** : deux réponses
à la même question selon la porte d'entrée · les skills design recopiés dans `validate-commands` ·
la copie du crew (`readdirSync` au scaffold vs `CREW` au refresh).

### La leçon : un garde doit mordre AU SITE du bug
La revue a muté chaque correctif pour voir si un test rougissait. **Cinq fois la suite est restée
verte** — le bug pouvait revenir sans alerte. Quatre refermés :
- la regex était testée via `buildArgsFromAnswers`, jamais via **la boucle de question** de
  `runWizard`, qui est l'endroit exact où elle avait divergé ;
- l'unicité des skills design était satisfaite par un **commentaire** citant `DESIGN_SKILL_NAMES` ;
- la consigne « `maquette/` » n'était assertée nulle part, alors qu'E10 a supprimé sa section
  d'`AGENTS.md` **en s'appuyant dessus** ;
- rien ne prouvait que `runChecks` **appelle** `resolveCheckCommand` — un `spawnSync` direct laissait
  tout vert, et c'est le bug E7 lui-même.

Un test peut prouver qu'une fonction **dit** juste sans jamais prouver qu'on s'en **serve**.

### Un montage de test qui refuse de conclure
Le garde `runChecks` a attrapé une erreur de l'orchestrateur : `tsconfig.json` attendu, `package.json`
créé → aucun check lancé. L'assertion `assert.ok(appels.length > 0, 'le montage du test ne prouve
rien')` l'a arrêté au lieu de passer au vert à vide. Même famille que le faux vert du banc D7bis et
que le `update.mjs <dir>` positionnel : **un vert doit prouver qu'il a fait quelque chose**.

### Dette et résiduels
- **Garde manquant (assumé)** : muter `setup.mjs:144` en `if (true) done.push(cl.repo)` laisse la
  suite verte — seule `summarizeClone` (fonction pure) est testée. Fermer ce trou demande une
  intégration réseau.
- **`docs/RUN.md` n'est ni pur kit ni pur utilisateur** : politique `.new` retenue pour ne rien
  écraser. Si le parcours veut un rafraîchissement en place, c'est une décision produit → **Lot G**.
- **Projets antérieurs en `--backend local`** : `.vibecoding.json` sans `backend` → au 1er refresh,
  un `docs/RUN.md.new` sans la note « Backend en local » apparaît. Non destructif mais trompeur ;
  migration possible (détecter la note et rétro-remplir) → **Lot G**.
- `security: npx @doyensec/electronegativity` toujours câblé en pre-push desktop → **Lot F (F5)**.
- `ai-context` copié en entier pour toutes les stacks (`matrix.mjs:32`) → **Lot F (F9)**.

### Écart de brief relevé par l'implémenteur
E9 demandait de supprimer `DESIGN_SKILLS`, E8 d'en faire la source unique des skills design : les
deux items se contredisaient. Résolu en séparant la **chaîne morte** (supprimée) du **tableau
source** (`DESIGN_SKILL_NAMES`, dont `validate-commands` dérive vraiment).

---

## Lot F — stacks · `PROUVÉ` sous réserve de revue complète (`e4aed2b` → `11049a5`)

⚠️ **Revue par agent frais interrompue** : limite de dépense mensuelle du compte atteinte, deux fois
(la revue du Lot E l'avait été aussi, sur la limite de session). La vérification consignée ici a été
faite **par l'orchestrateur**, ciblée sur les faits externes et les consignes perdues — c'est plus
faible qu'une revue en contexte frais, et c'est dit. **Une revue complète du Lot F reste à faire.**

### Ce qui est vérifié
- **361 tests / 0 fail** · plugin sans diff · smoke E2E vert · paquet 5/5 · **12 combinaisons exit 0**
  · `AGENTS.md` à **2189 mots** (aucun fichier de `templates/agents/` touché) · worktree propre.
- **L'épingle correspond au réel** : `PINS.vitrine = { astro: '7', node: '22.12' }` contre
  `astro@7.1.6`, `engines.node >=22.12.0`.
- **Aucun paquet recommandé n'est déprécié** : `react-email`, `convex`, `better-auth`,
  `@keystatic/core`, `@convex-dev/auth`, `expo`, `electron` — tous contrôlés par `npm view`.
- **48 lignes de prose retirées**, toutes rattachées à un item (Astro 5→7, `checkout@v4`→v7,
  « officiels », `electronegativity`, `expo-convex-auth`). Aucune consigne perdue au contrôle :
  les skills Electron restent recommandés, la bêta de Convex Auth est dite dans les 5 fichiers
  qui le proposent.
- **Les 2 tests « retournés » sont plus forts, pas relâchés** : `CHECKS.security` doit désormais
  être `undefined` (interdit le retour), et `prePush` est contrôlé dans les deux sens.

### Le résiduel que le contrôle a trouvé
**L'étiquette « officiel » avait survécu en anglais**, dans la `description` du frontmatter de
`.claude/skills/stack-desktop/SKILL.md` — la ligne que l'assistant lit pour décider de charger le
skill, dans un fichier qui **part dans le paquet npm**. Le garde F6 n'exigeait que « officiel » et ne
pouvait pas voir « official ». Corrigé, garde étendu aux deux langues, rouge vérifié sur chacune.
Leçon : dans un kit francophone dont les frontmatters de skills sont en anglais, **tout garde
lexical doit couvrir les deux langues**.

### Ce que l'implémenteur a corrigé DANS LE BRIEF, preuves à l'appui
Le plan était faux sur cinq points ; il a écrit la réalité vérifiée, pas le brief :
1. La suppression de l'ancienne API de collections est en **Astro 6**, pas 7 — et
   `legacy.collectionsBackwardsCompat` existe, contrairement au « sans compatibilité » du plan.
2. « `<Image />` changé » : **introuvable** dans les notes de 7.0.0 → **rien écrit**, consigne laissée
   en l'état, point listé comme non prouvé.
3. `Astro.glob()` et `<ViewTransitions />` supprimés en **Astro 6** (PR #14421, #14400), pas 7.
4. `get-convex/expo-convex-auth` **n'est pas abandonné** (poussé le 2026-02-05) — la correction tient
   au fait que sa propre description dit `Example app`, donc ce n'est pas une bibliothèque.
5. `@doyensec/electronegativity` : le **paquet npm** est figé au 2023-03-09 (c'est lui que `npx`
   installe, et il tournait au `git push`), mais le **dépôt** a été poussé le 2025-08-23.

### Trouvé hors brief, et urgent
**`gitleaks-action@v2` cesse de fonctionner le 16/09/2026** (release note v3 : runtime Node 20 → 24,
« stops working regardless of any opt-out flag »). Le kit installe ce workflow chez tous les
débutants : leur scan de secrets se serait arrêté sans un mot, sept semaines plus tard. Migré en v3,
remplacement direct (« No changes to inputs, outputs, or behavior »). Vérifié par l'orchestrateur.

### Deux bugs « vert sans rien vérifier »
- **F4** : `matrix.mjs` déclarait `astro check`, le runner lançait `npx tsc --noEmit` **en dur** — or
  `tsc` ne lit pas les `.astro`. Reproduit sur un projet Astro réel avec une erreur de type :
  `tsc` **exit 0, zéro ligne**, `astro check` **exit 1**. Les checks résolvent désormais le script
  déclaré par la stack.
- **F5** : le check `security` appelait un paquet npm figé depuis 2023, au `git push` desktop.
  Remplacé par `npm audit` (livré avec npm, rien à installer). **Le scan Electron n'est pas
  remplacé** — il est renvoyé à la checklist des 20 points conduite par l'agent sécurité, et le kit
  le **dit** au lieu de promettre un scan qui ne tournait pas.

### F9 — mesuré, pas estimé
Une vitrine recevait **4,8 Mo** de doc Convex + Expo sans rapport. Après : `ai-context` à **8 Ko**,
projet complet **6,4 Mo → 744 Ko** (−96 %). Desktop idem. Mobile ne gagne presque rien : il a
réellement besoin des deux gros contextes. Le gain vient des stacks qui recevaient de la doc inutile.

### Dette et résiduels
- **`selectDomains()` ne joue qu'avec un `docs/PRD.md` préexistant**, pas au premier scaffold, et
  `docs/DOMAINS.md` n'est pas dans `kitOwnedGenerated` (le rafraîchir demanderait d'y passer
  `projectDir`). Contournement livré : les déclencheurs sont **rendus dans `docs/DOMAINS.md`** et
  `/new-project` Phase 6 ordonne de les appliquer. La table pilote donc quelque chose de réel, mais
  l'application est faite par l'IA, pas par le code → **Lot G**.
- `.claude/skills/stack-saas/SKILL.md:40` renvoie à `scripts/download-ai-context.sh`, **absent du
  projet généré** (script du dépôt du kit). Même famille que F10 → à trancher.
- `templates/cursor/environment/vitrine.json` ne fixe aucune version de Node : l'environnement cloud
  Cursor pourrait démarrer sous Node 20 et casser Astro 7. Aucune clé documentée trouvée pour le
  déclarer ; **non inventée** → à trancher.
- `guides/02-installer-les-outils.md:13` dit « installe la LTS » sans chiffre → **Lot H**.
- `docs/superpowers/plans/2026-07-09-stack-vitrine-seo-geo.md` porte encore tous les textes en
  Astro 5 : plan livré, donc archive, mais un agent qui le lirait comme source y trouverait la
  vieille vérité → candidat à une bannière PÉRIMÉ.

### Non prouvé, et déclaré comme tel
`<Image />` en Astro 7 · `electronegativity` sous Node 22 · la parité composant par composant entre
`react-email` et `@react-email/components` · le rendu Keystatic `.md`/`.mdoc` · la survie de
`legacy.collectionsBackwardsCompat` en Astro 7. **Aucune affirmation du kit n'en dépend.**

---

## Contrôle final — vérification orchestrateur (HEAD `374b3cf`)

⚠️ **Le contrôle final par agent frais n'a pas pu être fait** : limite de dépense mensuelle du compte
atteinte, trois fois de suite (revue du Lot F, puis contrôle final ×2). Ce qui suit a été mesuré par
l'orchestrateur. **Trois lots restent non revus par un agent frais : F, G, H.** C'est plus faible
qu'une revue en contexte frais, et c'est dit.

### Z2 — les 12 combinaisons · **0 anomalie**
4 stacks × 3 assistants : `exit=0`, `AGENTS.md` ≤ 2200 mots, **10 commandes** livrées,
`docs/glossaire.md` présent. `--refresh` sur un projet où l'utilisateur a travaillé : *« Zone “Tes
règles à toi”, src/, docs/ (PRD/design/mémoire) : NON touchés »*, `docs/PRD.md` intact.

### Z3 — gate mécanique · **vert**
394 tests / 0 fail · plugin Cursor sans diff · smoke E2E vert · `package-publish` 5/5 (dont le
paquet reconstitué depuis `files[]` seul, scaffoldé sans `--source`).

### Z1bis — orphelins · **aucun réel**
Balayage de 27 motifs sur les **12 projets générés**. 4 motifs remontaient ; tous vérifiés légitimes :
- `electronegativity` (12) → un **commentaire** de `checks.mjs` qui explique son remplacement ;
- `Astro.glob` / `ViewTransitions` (10) → des phrases qui les **interdisent** (« APIs supprimées par
  Astro 6, ne les écris jamais ») ;
- `/debug` (273) → `/functions/debugging.md` dans la doc Convex vendorée. **Zéro** occurrence de la
  commande supprimée ;
- `formation` (2097) → « information ».
`checkout@v4` / `setup-node@v4` : **absents** des projets.

### Z4 — cohérence croisée · **tenue**
- Qui prononce `PROUVÉ` : `security-reviewer` nommé dans `AGENTS.md` **et** dans `build.md` — la
  contradiction du Lot C ne s'est pas rouverte.
- L'entrée est `/help` dans les trois endroits qui la nomment : `COLLE-MOI-DANS-L-IA.md`, la sortie
  console (`report.mjs`), le `README`.
- Bannière **10 commandes** = 10 livrées = **10/10 citées par `/help`**.
- Mobile : **0** occurrence de shadcn dans son `AGENTS.md` (saas : 3, à raison).

### Ce qui reste avant une publication npm
**Rien qui atteigne l'utilisateur n'a été trouvé par ce contrôle.** Mais il est plus faible qu'une
revue, et trois lots n'ont jamais été relus par un agent frais. Par gravité :
1. **Revue en contexte frais des lots F, G, H** — ce sont eux qui ont réécrit le plus de prose, et
   c'est exactement là que les revues des lots B et C avaient trouvé des consignes perdues qu'aucun
   test ne voyait. **À faire avant de publier.**
2. **Dette de gardes** : le retour de `pickFromClone` ignoré dans `setup.mjs` (Lot E) laisse la
   mutation passer ; fermer ce trou demande une intégration réseau.
3. **`selectDomains()` ne joue qu'avec un `docs/PRD.md` préexistant** (Lot F) : la table pilote
   quelque chose de réel, mais l'application est faite par l'IA, pas par le code.
4. **Non prouvables ici** : le comportement Windows réel (`npx.cmd`, `eol=lf` au checkout), et cinq
   faits externes listés au Lot F — aucune affirmation du kit n'en dépend.
5. **Cosmétique** : `setup-ai.mjs` s'appelle ainsi alors qu'il rend `docs/A-FAIRE.md` ; un worktree
   périmé traîne dans `.claude/worktrees/` (gitignoré, hors paquet).

**La publication reste la décision de l'utilisateur.** Aucun `git push`, aucun `npm publish` n'a été
fait pendant tout le chantier.
