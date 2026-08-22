# 01 — Spec de feature

> Étape 01/04 de `/new-feature` — cadrer avant de coder. **Le cadre** (la boucle d'itération d'`AGENTS.md`, les gates humains) est dans le sommaire : `../new-feature.md`.

> **Attribution** : le format story + critères d'acceptation ci-dessous est adapté de BMAD-METHOD (MIT © 2025 BMad Code, LLC). Adapté/traduit ; « BMAD » est une marque de BMad Code, LLC.

### 1. Brainstorm → **Spec de feature** (`superpowers:brainstorming`) — gate
D'abord, dis en une phrase **ce qu'on va faire** (« on cadre ta feature, puis je la construis et je la teste en vrai »). Puis pose **peu de questions** (2-4), **une à la fois**, en **langage simple**, avec un **exemple concret** à chaque fois et le **pourquoi** ; reformule la réponse. Zéro jargon dans les questions — le vocabulaire (UJ, FR, AC…) reste dans le document. Scopé à la feature, référence `docs/PRD.md`. Produis ensuite une **spec de feature** avec ce template, puis fais valider :

> **Pas de `docs/PRD.md` ?** C'est le cas d'un projet **existant** adopté par le kit (`npx create-vibecoding-kit@latest --adopt`) : il n'en a pas, et `/new-feature` n'en crée pas — seul `/new-project` le fait, et il ne doit pas être lancé ici. **Ne scaffolde rien, n'invente aucun UJ-X ni FR-Y.** Lis **`docs/ETAT-DES-LIEUX.md`** (ce que fait le projet, ses technos, comment on le lance et on le teste) et cadre la feature sur **CE** code. L'état des lieux est encore vide ? Fais-le remplir d'abord — c'est une question à poser, pas une supposition à faire. Les champs qui renvoient au PRD deviennent alors « — » : un critère d'acceptation inventé se teste vert et ne prouve rien.

- **Intention** — quelle capacité, quel(s) parcours (UJ-X) et exigence(s) (FR-Y) du PRD ça réalise.
- **Story(s)** — format `En tant que [persona], je veux [action] [sous conditions], pour [bénéfice].` (numérote Story-1, Story-2… si plusieurs).
- **Critères d'acceptation (testables)** — `AC-1`, `AC-2`… chacun vérifiable : *« Étant donné [contexte], quand [action], alors [résultat observable]. »* Ce sont eux que le **test live** (`03-verification.md`) vérifiera.
- **Périmètre** — *dans* / *hors* (ce que cette feature ne fait **pas** ; renvoie aux Non-objectifs du PRD si besoin).
- **Impact** — fichiers/composants touchés, modèle de données, exigences non-fonctionnelles pertinentes (perf, sécu, accessibilité).
- **Plan de test live** — comment tu vérifieras en vrai (parcours navigateur / écran desktop / smoke mobile) que **chaque AC** passe.

→ **gate (validation utilisateur)**.
