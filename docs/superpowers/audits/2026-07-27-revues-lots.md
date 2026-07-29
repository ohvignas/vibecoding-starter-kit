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
