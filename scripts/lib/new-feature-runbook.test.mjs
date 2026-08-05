// scripts/lib/new-feature-runbook.test.mjs
// `/new-feature` n'est plus UN fichier : c'est une entrée courte + un dossier d'étapes
// (`templates/commands/new-feature/`). Mêmes trois propriétés que pour `/new-project` :
//   1. rien n'est tombé au découpage (l'inventaire ci-dessous, seule trace du fichier d'avant) ;
//   2. l'entrée est une CHECKLIST : chaque étape du disque y est citée, une fois, dans l'ordre ;
//   3. le validateur reste vert, exigence par exigence, dans l'étape qui porte l'exigence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateNewFeatureCommand } from './validate-commands.mjs';
import { erreursArguments, erreursChecklist, erreursNonPerte } from './runbook-decoupe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── L'INVENTAIRE D'AVANT LE DÉCOUPAGE ─────────────────────────────────────────────────────────
// Les 40 lignes de contenu (hors lignes vides) que `templates/commands/new-feature.md` portait
// quand il pesait 58 lignes d'un bloc. Extraites AVANT le commit qui l'a découpé : la référence
// n'existe plus nulle part ailleurs, ni sur le disque ni dans un autre test.
// On exige la LIGNE ENTIÈRE, à la trime près — une liste de marqueurs ne prouve rien (cf. le
// commentaire de tête de `runbook-decoupe.mjs`). Une ligne réécrite par un lot ultérieur fait
// rougir ce test : c'est voulu, elle oblige à rouvrir cet inventaire et à dire ce qui a changé.
//
// TROIS LIGNES ONT ÉTÉ RÉÉCRITES PAR LE DÉCOUPAGE LUI-MÊME, et elles seules. Le fichier d'un bloc
// numérotait sa boucle de 1 à 10 et se renvoyait à lui-même par ce numéro (« retour étape 3 »,
// « (étape 5) »). Une fois les dix temps regroupés en cinq fichiers, ce numéro ne désigne plus
// rien d'ouvrable — pire, « retour à l'étape 3 » lu depuis `03-verification.md` se lit comme un
// renvoi vers le fichier courant. Les trois renvois nomment donc leur FICHIER, exactement comme
// le lot P4 l'a imposé partout ailleurs (« une étape se nomme par son fichier »). Aucune consigne
// n'a été retirée ni ajoutée : les lignes ci-dessous sont celles d'après ce seul changement.
//
// UNE QUATRIÈME A ÉTÉ RÉÉCRITE DEPUIS, et pas par le découpage : « Suis la **boucle d'itération**
// de l'`AGENTS.md` » portait une note de provenance — « (issue de `templates/agents/loop-section.md`) ».
// `templates/` est un dossier SOURCE du kit ; il n'existe pas dans le projet de l'utilisateur. Le
// débutant qui suit le renvoi cherche un dossier qu'il n'a pas. La parenthèse est retirée : la
// consigne porte sur l'`AGENTS.md`, qui, lui, est bien là. Aucune consigne perdue — c'était une
// note pour le mainteneur du kit, jamais une instruction. Désormais gardé par D10
// (`commands.test.mjs`), qui refuse tout dossier source du kit cité dans un runbook livré.
// CINQ LIGNES ONT ÉTÉ RÉÉCRITES LE 2026-08-05, par le chantier « features en parallèle », et
// elles seules. Motif unique : la cible ne peut plus être nommée d'avance. Le runbook PRÉSUMAIT
// que le dépôt n'avait que `main` — vrai pour un projet du kit, faux dès que l'utilisateur a une
// branche de travail. Il branchait alors depuis sa base et ouvrait la PR vers `main` : pire que de
// ne rien dériver. La base se relève au préflight (`git rev-parse --abbrev-ref HEAD`) et tout y
// revient. Les quatre :
//   · le préflight passe de « 2. » à « 3. » et part de la base synchronisée (un point inséré
//     avant lui : la synchro, sans laquelle deux features partent de deux bases différentes) ;
//   · le push devient `HEAD` et la PR `--base <la base relevée au préflight>` ;
//   · le titre de l'étape 10 et le « Fini quand » nomment la base au lieu de `main` ;
//   · la phrase sous l'étape 10 : le scaffold ne crée toujours que `main`, mais ce n'est plus la
//     raison de ne pas inventer de branche — un dépôt qui en a une l'a déjà, et c'est celle-là
//     qu'on suit. (La revue du plan n'en avait compté que quatre ; c'est la 5ᵉ, trouvée par ce
//     test à l'exécution. C'est exactement son rôle.)
// Aucune consigne retirée ni ajoutée : les lignes ci-dessous sont celles d'après ce seul changement.
const LIGNES_AVANT_DECOUPAGE = [
  "# /new-feature — Boucle de livraison d'une feature (runbook IA)",
  "Argument : `$ARGUMENTS` = description de la feature à construire.",
  "> Si `$ARGUMENTS` est vide (certains assistants comme Cursor ne substituent pas les arguments), **demande la description à l'utilisateur** avant de commencer.",
  "Suis la **boucle d'itération** de l'`AGENTS.md`, sans sauter d'étape. **Gates humains** au brainstorm et au plan ; autonome ensuite jusqu'au merge.",
  "> **Attribution** : le format story + critères d'acceptation ci-dessous est adapté de BMAD-METHOD (MIT © 2025 BMad Code, LLC). Adapté/traduit ; « BMAD » est une marque de BMad Code, LLC.",
  "## Préflight",
  "1. Vérifie GitHub : `gh auth status`. Vérifie le remote : `git remote`. Si aucun remote → propose `gh repo create` et relie le projet.",
  "3. Crée un **worktree** isolé pour la feature (`superpowers:using-git-worktrees`) sur une branche `feat/…`, **partant de cette base synchronisée**.",
  "## Boucle",
  "### 1. Brainstorm → **Spec de feature** (`superpowers:brainstorming`) — gate",
  "D'abord, dis en une phrase **ce qu'on va faire** (« on cadre ta feature, puis je la construis et je la teste en vrai »). Puis pose **peu de questions** (2-4), **une à la fois**, en **langage simple**, avec un **exemple concret** à chaque fois et le **pourquoi** ; reformule la réponse. Zéro jargon dans les questions — le vocabulaire (UJ, FR, AC…) reste dans le document. Scopé à la feature, référence `docs/PRD.md`. Produis ensuite une **spec de feature** avec ce template, puis fais valider :",
  "- **Intention** — quelle capacité, quel(s) parcours (UJ-X) et exigence(s) (FR-Y) du PRD ça réalise.",
  "- **Story(s)** — format `En tant que [persona], je veux [action] [sous conditions], pour [bénéfice].` (numérote Story-1, Story-2… si plusieurs).",
  "- **Critères d'acceptation (testables)** — `AC-1`, `AC-2`… chacun vérifiable : *« Étant donné [contexte], quand [action], alors [résultat observable]. »* Ce sont eux que le **test live** (`03-verification.md`) vérifiera.",
  "- **Périmètre** — *dans* / *hors* (ce que cette feature ne fait **pas** ; renvoie aux Non-objectifs du PRD si besoin).",
  "- **Impact** — fichiers/composants touchés, modèle de données, exigences non-fonctionnelles pertinentes (perf, sécu, accessibilité).",
  "- **Plan de test live** — comment tu vérifieras en vrai (parcours navigateur / écran desktop / smoke mobile) que **chaque AC** passe.",
  "→ **gate (validation utilisateur)**.",
  "### 2. Plan (`superpowers:writing-plans`) — gate",
  "Plan TDD, tâches bite-sized, **dérivées des critères d'acceptation** (chaque AC → au moins un test). → **gate (validation)**.",
  "### 3. Exécution (`superpowers:subagent-driven-development` + TDD)",
  "Tâche par tâche, test rouge → vert (cadre de délégation : **« Règle sous-agents »** dans `AGENTS.md`). Un `[À CLARIFIER]` bloquant → repasse par la gate.",
  "### 4. Review code (`superpowers:requesting-code-review`)",
  "Bugs, conventions, sécurité du diff. Lance le sous-agent `code-reviewer` sur le diff : il existe sur les 3 assistants, la commande `/code-review` seulement sur Claude Code.",
  "### 5. Test live — vérifie CHAQUE critère d'acceptation en vrai",
  "Lance l'app et **valide chaque `AC-n`** de la spec : navigateur pour le web, fenêtre pour desktop, smoke pour mobile. Screenshot(s) à l'appui (voir **« Règle de vérification »** dans `AGENTS.md`). Un AC non satisfait → retour à l'exécution, `02-plan-et-execution.md` (`superpowers:systematic-debugging`).",
  "### 6. Sécu",
  "Revue sécurité des changements de la branche. Lance le sous-agent `security-reviewer` : il existe sur les 3 assistants, la commande `/security-review` seulement sur Claude Code.",
  "### 6bis. Verdict (obligatoire avant commit)",
  "Lance **`verificateur`** en contexte frais : il ne voit que le diff + les `AC`. **PROUVÉ** requis pour continuer. **NON PROUVÉ** → retour à l'exécution, `02-plan-et-execution.md`. **BLOQUÉ** → dis ce qui bloque, ne commit pas.",
  "### 7. Commit",
  "`git add -A` puis `git commit` en **Conventional Commits** (`feat:`, `fix:`, `docs:`… + un corps qui dit le *pourquoi*). Aucun plugin de commit n'est installé par le kit : c'est `git`, directement.",
  "### 8. PR",
  "`git push -u origin HEAD` puis `gh pr create --fill --base <la base relevée au préflight>`. Description = quoi + pourquoi + comment tester (les AC). La cible n'est **jamais** écrite d'avance : tu as branché depuis cette base, la PR y revient — sinon tu ouvres la PR ailleurs que là d'où tu es parti.",
  "### 9. CI — surveille jusqu'au bout",
  "`gh pr checks <n>` puis `gh run watch <id> --exit-status`. Rouge → diagnostiquer (`superpowers:systematic-debugging`), pas de merge.",
  "### 10. Merge sur **la base d'où tu es parti** (`superpowers:finishing-a-development-branch`, squash)",
  "Celle relevée au préflight, pas une autre. **N'invente aucune branche d'intégration** : le scaffold n'en crée pas, et un dépôt qui en a une l'a déjà.",
  "## Fini quand",
  "Mergé sur **la base relevée au préflight** (CI verte + review OK, un PR à la fois) **ET** **chaque critère d'acceptation testé en live** par l'agent. Tests unitaires + CI verte = nécessaires mais **pas** suffisants. Si un blocage externe empêche d'aller au bout → **dire exactement ce qui manque**.",
];

test('non-perte — aucune consigne du runbook d\'un bloc n\'est tombée au découpage', () => {
  assert.equal(LIGNES_AVANT_DECOUPAGE.length, 40, 'l\'inventaire d\'avant le découpage a changé de taille : dis quelle ligne, et pourquoi');
  const perdues = erreursNonPerte(ROOT, 'new-feature', LIGNES_AVANT_DECOUPAGE, 6);
  assert.deepEqual(perdues, [], [
    `${perdues.length} consigne(s) du runbook d'avant le découpage ne sont dans AUCUN fichier de /new-feature :`,
    ...perdues,
    '',
    'Découper déplace du texte, ça n\'en retire pas. Remets la ligne dans l\'étape qui la porte —',
    'ou, si elle a été volontairement réécrite, mets à jour LIGNES_AVANT_DECOUPAGE dans le même',
    'commit, en disant laquelle et pourquoi.',
  ].join('\n'));
});

test('l\'entrée de /new-feature est une CHECKLIST : chaque étape citée, une fois, dans l\'ordre', () => {
  assert.deepEqual(erreursChecklist(ROOT, 'new-feature', 40), []);
});

test('$ARGUMENTS reste dans l\'entrée de /new-feature : une étape ne le substitue pas', () => {
  assert.deepEqual(erreursArguments(ROOT, 'new-feature'), []);
});

test('le runbook /new-feature est cohérent (toutes les étapes + loop-section)', () => {
  assert.deepEqual(validateNewFeatureCommand(ROOT), []);
});
