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
