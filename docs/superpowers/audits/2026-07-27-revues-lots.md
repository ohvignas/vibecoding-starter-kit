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
