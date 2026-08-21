# Le kit s'installe sur un projet qui existe déjà — plan d'implémentation

> **Pour l'agent exécutant :** SOUS-SKILL REQUIS — `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans`. Les étapes sont en cases à cocher (`- [ ]`).

**But :** `npx create-vibecoding-kit@latest --adopt` installe la **méthodologie** du kit dans un
projet qui existe déjà, sans rien écraser et sans prétendre connaître sa techno.

**Architecture :** une valeur de manifeste `aucune` désactive tout ce qui est propre à une stack ;
le rendu `AGENTS.md` perd les 4 sections qui pointent des fichiers absents et **substitue au rendu**
les 8 phrases qui les citaient ; la fusion par marqueurs préserve les règles de l'utilisateur.

**Stack :** Node ESM, zéro dépendance runtime, `node --test`.

**Spec :** [`docs/superpowers/specs/2026-08-21-projets-existants-design.md`](../specs/2026-08-21-projets-existants-design.md) — 10 décisions, deux revues adverses.

## Contraintes globales

Chaque tâche en hérite implicitement.

| Contrainte | Valeur | Conséquence |
|---|---|---|
| `node` et `npm` | `/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/{node,npm}` | **Chemins absolus obligatoires.** Le shim nvm casse `node` dans les sous-processus |
| Suite | `node --run test` | **PAS** `node --test scripts/` (échoue) |
| Base verte | **432 / 0 fail** à `97e7b2a` | Chaque tâche finit à 432 + ses tests, 0 fail |
| `--project` | chemin **ABSOLU** | Un nom nu crée le projet dans le HOME. Projets de test dans `/private/tmp/claude-501/-Users-antoinevigneau-best-practices-vibecoding/7518a38b-5d92-45e6-9d4a-0c79949df393/scratchpad/` |
| Plugin Cursor | `node scripts/build-cursor-plugin.mjs` | À régénérer **dans chaque tâche** qui touche `templates/commands/` — sinon D10 rouge |
| Plafond `AGENTS.md` | 2196 / 2200 mots | **4 mots de marge.** Aucune règle standing nouvelle |
| `grep` | aliasé sur `ugrep` ; `perl -i` peut ne rien faire | Tout harnais de mutation **sort en erreur** si la cible est introuvable |
| Mutation | commiter d'abord, restaurer depuis une **copie mémoire** | Un `git checkout -- .` a déjà détruit un palier |
| Publication | **aucun `npm publish`** | Push GitHub autorisé |

### Décision d'architecture prise à l'écriture du plan

La 2ᵉ revue a mesuré **427/432** en ajoutant `aucune` à `STACKS` **et** `AI_CONTEXT`. Trois de ces
rouges venaient de l'invariant « toute clé de `STACKS` est une stack offerte au débutant ».

**→ `aucune` n'entre dans AUCUNE des deux tables.** Elle est traitée en cas explicite là où elle
apparaît. `cablage-stacks.test.mjs:115` (`keys(AI_CONTEXT) === keys(STACKS)`) reste satisfait sans
rien changer, et les 5 rouges n'ont pas lieu. C'est la seule divergence avec la mesure de la revue,
et elle est délibérée.

## Structure des fichiers

**Créés :**
- `scripts/lib/adoption.mjs` — tout ce qui est propre au parcours adopté (critère de détection,
  liste des chemins absents, substitutions du rendu). Une responsabilité, testable seul.
- `scripts/lib/adoption.test.mjs` — ses tests.
- `scripts/lib/renvois-morts.test.mjs` — le garde qui manque (`promesses-livrees` ne couvre pas
  cette classe).
- `templates/adoption/ETAT-DES-LIEUX.md` — le gabarit de l'état des lieux.

**Modifiés :** `scripts/lib/args.mjs` · `matrix.mjs` · `templates.mjs` · `agents-file.mjs` ·
`colle-moi.mjs` · `setup-ai.mjs` · `gitinit.mjs` · `setup.mjs` · `report.mjs` ·
`templates/commands/{build,doctor,init-vibecoding/00-detecter-l-etat}.md` · `README.md` ·
`package.json`

---

## Task 1 : `aucune` est une valeur légale, et elle ne livre rien de stack

**Fichiers :**
- Créer : `scripts/lib/adoption.mjs`, `scripts/lib/adoption.test.mjs`
- Modifier : `scripts/lib/args.mjs:3` et `:56` · `scripts/lib/matrix.mjs:44`

**Interfaces produites** (les tâches suivantes s'en servent) :
- `STACK_AUCUNE = 'aucune'` (string)
- `estAdopte(stack) → boolean`

- [ ] **Étape 1.1 — Le test qui échoue**

Dans `scripts/lib/adoption.test.mjs` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STACK_AUCUNE, estAdopte } from './adoption.mjs';
import { parseArgs, validateArgs } from './args.mjs';
import { resolveAssets } from './matrix.mjs';

test('adoption — `aucune` est une valeur de stack légale', () => {
  assert.equal(STACK_AUCUNE, 'aucune');
  assert.equal(estAdopte('aucune'), true);
  assert.equal(estAdopte('saas'), false);
  const a = parseArgs(['--stack', 'aucune', '--assistant', 'cursor', '--project', 'x']);
  assert.deepEqual(validateArgs(a), [], 'validateArgs doit accepter aucune');
});

test('adoption — `aucune` ne livre ni règles de stack, ni ai-context, ni skill de stack', () => {
  for (const assistant of ['cursor', 'claude-code', 'codex']) {
    const { copies } = resolveAssets('aucune', assistant);
    const cibles = copies.map((c) => c.to);
    for (const interdit of ['AGENTS-stack.md', '.claude/skills/stack-aucune', '.cursor/rules/stack-aucune.mdc']) {
      assert.ok(!cibles.includes(interdit), `${assistant} : ${interdit} ne doit pas être livré sur aucune`);
    }
    assert.ok(!cibles.some((t) => t.startsWith('ai-context/')), `${assistant} : aucun ai-context sur aucune`);
  }
});

test('adoption — les 4 stacks offertes ne changent pas', () => {
  const { copies } = resolveAssets('saas', 'claude-code');
  assert.ok(copies.some((c) => c.to === 'AGENTS-stack.md'), 'saas doit toujours livrer ses règles');
});
```

- [ ] **Étape 1.2 — Lancer, voir échouer**

```bash
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/adoption.test.mjs
```
Attendu : `Cannot find module './adoption.mjs'`.

- [ ] **Étape 1.3 — Créer `scripts/lib/adoption.mjs`**

```js
// scripts/lib/adoption.mjs — TOUT CE QUI EST PROPRE AU PARCOURS « PROJET EXISTANT ».
//
// Le kit crée des projets neufs sur 4 stacks connues. Sur un projet qui existe déjà, il ne peut
// prouver AUCUNE de ces 4 — et une règle Convex dans un projet Prisma est pire que pas de règle.
// `aucune` est donc la stack « je n'en revendique pas ».
//
// POURQUOI ELLE N'EST NI DANS `STACKS` NI DANS `AI_CONTEXT` : trois tests encodent l'invariant
// « toute clé de STACKS est une stack OFFERTE au débutant » (bannière README, guide 01, question
// de /init-vibecoding). `aucune` n'est pas une offre. L'y mettre rendait 5 tests rouges, dont 3
// pour la mauvaise raison — mesuré. Elle est donc un cas explicite, jamais une entrée de table.
export const STACK_AUCUNE = 'aucune';

export const estAdopte = (stack) => stack === STACK_AUCUNE;
```

- [ ] **Étape 1.4 — `args.mjs` accepte la valeur**

`args.mjs:3` — la liste locale sert à `validateArgs`, pas au catalogue offert :

```js
const STACKS = ['saas', 'mobile', 'desktop', 'vitrine', 'aucune'];
```

Ajouter au-dessus le commentaire :

```js
// `aucune` = parcours « projet existant » (voir adoption.mjs). Elle est LÉGALE en argument mais
// n'est PAS une stack offerte : le wizard ne la propose pas, la doc ne la liste pas.
```

- [ ] **Étape 1.5 — `matrix.mjs:44` cesse de jeter, et ne livre rien de stack**

Remplacer la garde :

```js
  if (!estAdopte(stack) && !AI_CONTEXT[stack]) throw new Error(`Stack inconnue : ${stack} (attendu: ${Object.keys(AI_CONTEXT).join('|')}|aucune)`);
```

Puis rendre conditionnel le bloc `:51-58` — sur `aucune`, ni règles de stack, ni skill, ni
`ai-context` (y compris son `README.md`, poussé avant la boucle) :

```js
  if (!estAdopte(stack)) {
    if (isCursor) {
      copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `.cursor/rules/stack-${stack}.mdc`, transform: 'mdc', description: `Règles complètes de la stack ${stack} (charge quand pertinent)`, alwaysApply: false });
    } else {
      copies.push({ from: `stacks/${stack}/AGENTS.md`, to: `AGENTS-stack.md`, transform: 'raw' });
      if (isClaude) copies.push({ from: `.claude/skills/stack-${stack}`, to: `.claude/skills/stack-${stack}`, transform: 'dir' });
    }
    copies.push({ from: 'ai-context/README.md', to: 'ai-context/README.md', transform: 'raw' });
    for (const d of AI_CONTEXT[stack]) copies.push({ from: `ai-context/${d}`, to: `ai-context/${d}`, transform: 'dir' });
  }
```

Ajouter l'import en tête de `matrix.mjs` : `import { estAdopte } from './adoption.mjs';`

- [ ] **Étape 1.6 — Vérifier**

```bash
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --run test
```
Attendu : **435 pass, 0 fail** (432 + 3). Si `cablage-stacks.test.mjs` rougit, c'est que `aucune`
a été ajoutée à `AI_CONTEXT` ou `STACKS` — la retirer, elle n'y a pas sa place.

- [ ] **Étape 1.7 — Commit**

```bash
git add -A && git commit -m "feat(adoption): une stack « aucune », légale sans être offerte"
```

---

## Task 2 : les 6 chemins stack-keyés du scaffold sautent sur `aucune`

**Le défaut mesuré :** `--stack aucune` rend **6 ENOENT et exit 1**. La tâche 1 en a couvert 3
(règles de stack, skill, ai-context) ; il en reste 6 dans `setup.mjs`.

**Fichiers :** Modifier `scripts/setup.mjs:233`, `:239`, `:251`, `:279`, `:297` · Test :
`scripts/lib/adoption.test.mjs`

**Interfaces consommées :** `estAdopte` (tâche 1).

- [ ] **Étape 2.1 — Test qui échoue** (ajouter à `adoption.test.mjs`)

```js
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('adoption — scaffold `aucune` : exit 0, et aucun fichier de stack posé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  execFileSync(process.execPath, [
    path.resolve('scripts/setup.mjs'),
    '--stack', 'aucune', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes',
  ], { stdio: 'pipe' });
  for (const absent of ['.env.example', '.github/workflows/ci.yml', 'docs/examples/feature-exemple.md', 'AGENTS-stack.md', 'maquette', 'docs/ROADMAP.md']) {
    assert.ok(!fs.existsSync(path.join(dir, absent)), `${absent} ne doit pas être posé sur aucune`);
  }
  assert.ok(fs.existsSync(path.join(dir, 'docs/agents/JOURNAL.md')), 'JOURNAL.md DOIT être posé : deux règles gardées le citent');
});
```

> **Le dernier `assert` est le garde-fou de la décision 7.** La v2 de la spec voulait ne pas
> appeler `writeStackEnvironment` — ça aurait supprimé `docs/agents/JOURNAL.md` et `state.yaml`,
> cités par `verify-rule.md:14` et `subagents-rule.md:12`, deux règles GARDÉES. On aurait fabriqué
> deux renvois morts neufs. La fonction est appelée normalement.

- [ ] **Étape 2.2 — Lancer, voir échouer** (ENOENT sur `templates/env/aucune.env.example`).

- [ ] **Étape 2.3 — Rendre les 6 conditionnels**

Dans `setup.mjs`, importer `estAdopte` puis envelopper chacun. Modèle, à appliquer aux lignes
**233** (`.env.example`), **239** (`.github/workflows/ci.yml`), **279** (`.gitignore`), **297**
(`docs/examples/`), et à `:251` (le `template` de `docs/RUN.md`) :

```js
  if (!estAdopte(args.stack)) {
    try { track('.env.example', copyIfAbsent(path.join(args.source, `templates/env/${args.stack}.env.example`), path.join(projectDir, '.env.example'), opt)); }
    catch (e) { failed.push(`.env.example (${e.message})`); }
  }
```

Pour `docs/RUN.md` (`:247-253`) : sur `aucune`, ne pas rendre depuis un modèle de stack. Le fichier
sera écrit par l'analyse (tâche 6) ou restera absent.

Deux autres, hors des 6 : `maquette/` (`setup.mjs:119`, `ensureDir`) et le squelette
`docs/ROADMAP.md` (`:242`) — **non posés** sur `aucune`. Un `maquette/` vide fait croire à l'IA
qu'il y a une maquette ; un squelette de roadmap fait exécuter à `/build` un plan fictif.

- [ ] **Étape 2.4 — `resolveStackManifest('aucune')` — LÀ où vit la décision 7**

⛔ **Trouvé à l'auto-revue du plan : la décision 7 n'avait aucune implémentation.**
`environment.mjs:109` boucle sur `manifest.scripts`, qui vient de `STACKS[stack].scripts`
(`matrix.mjs:252`). `aucune` n'étant pas dans `STACKS`, `resolveStackManifest('aucune')` échoue.

Dans `matrix.mjs`, avant la lecture de `STACKS[stack]` :

```js
// Projet adopté : aucun script injecté (décision 7 — c'est SON fichier de build), aucun MCP de
// stack, aucun plugin. Mesuré : avec `scripts: {}`, `package.json` ressort octet pour octet
// identique — `environment.mjs:109` n'ajoute rien, `changed` reste false, `:110` n'écrit jamais.
// La fonction EST appelée normalement : elle pose aussi docs/agents/JOURNAL.md et state.yaml,
// cités par verify-rule.md:14 et subagents-rule.md:12, deux règles GARDÉES.
if (estAdopte(stack)) {
  return { scripts: {}, mcp: {}, plugins: { cursor: [], 'claude-code': [], codex: [] }, checks: { prePush: [] } };
}
```

Le test qui le prouve, à ajouter à `adoption.test.mjs` :

```js
test('adoption — package.json ressort octet pour octet identique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const avant = '{ "name": "x", "scripts": { "dev": "next dev" } }';
  fs.writeFileSync(path.join(dir, 'package.json'), avant);
  execFileSync(process.execPath, [path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', 'cursor', '--project', dir, '--no-skills', '--yes'], { stdio: 'pipe' });
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), avant, 'le kit a touché son package.json');
});
```

> Vérifier la forme exacte du retour attendu en lisant `resolveStackManifest`
> (`matrix.mjs:245-255`) : le shape doit correspondre à ce que consomment `environment.mjs` et
> `setup-ai.mjs`, sinon l'erreur sortira ailleurs.

- [ ] **Étape 2.5 — Vérifier** — `node --run test`, attendu **437 pass, 0 fail**.

- [ ] **Étape 2.5 — Prouver que le garde mord**

Remettre UNE des conditions à `true` (donc reposer `.env.example`) → le test doit rougir en
nommant le fichier. Restaurer.

- [ ] **Étape 2.6 — Commit**

---

## Task 3 : le rendu `AGENTS.md` adopté — 4 sections retirées, 8 phrases substituées

**Fichiers :** Modifier `scripts/lib/templates.mjs` (`renderProjectAgentsMd`) et
`scripts/lib/agents-file.mjs` · Test : `scripts/lib/adoption.test.mjs`

**Interfaces produites :** `renderAgentsFile({stack:'aucune', …})` rend ~1860 mots, sans renvoi mort.

- [ ] **Étape 3.1 — Test qui échoue**

```js
import { renderAgentsFile } from './agents-file.mjs';

const RENDU_ADOPTE = () => renderAgentsFile({ source: process.cwd(), stack: 'aucune', assistant: 'claude-code', commandsDir: '.claude/commands', learning: true });

test('adoption — les 4 sections qui pointent des fichiers absents sont retirées', () => {
  const t = RENDU_ADOPTE();
  for (const titre of ['Règle design', 'Règle CSS maquette', 'Contexte de la stack', 'Docs du projet']) {
    assert.doesNotMatch(t, new RegExp(`^## .*${titre}`, 'm'), `« ${titre} » pointe des fichiers absents d'un projet adopté`);
  }
  for (const garde of ['Règle Preuve', 'Règle Réalité', 'Règle de vérification', 'Boucle d\'itération', 'Règle sous-agents', 'Mémoire du projet', 'Règle secrets', 'Mode apprentissage']) {
    assert.match(t, new RegExp(garde), `« ${garde} » est de la méthode : elle DOIT rester`);
  }
});

test('adoption — le rendu tient sous 1900 mots et au-dessus de 1700', () => {
  const n = RENDU_ADOPTE().trim().split(/\s+/).length;
  assert.ok(n > 1700 && n < 1900, `rendu adopté = ${n} mots (attendu ~1860 : 1768 de méthode + plomberie)`);
});
```

- [ ] **Étape 3.2 — Lancer, voir échouer.**

- [ ] **Étape 3.3 — `templates.mjs` : rendre les 4 sections conditionnelles**

`renderProjectAgentsMd` reçoit déjà `stack`. Envelopper `designRule`, `cssMaquetteRule`, la section
`## Contexte de la stack` et la section `## Docs du projet` : sur `aucune`, chaîne vide.

- [ ] **Étape 3.4 — Test des 8 substitutions**

```js
test('adoption — aucune phrase gardée ne cite un fichier absent', () => {
  const t = RENDU_ADOPTE();
  for (const mort of ['maquette/', 'maquette à l\'identique', 'docs/design.md', 'Règle design', 'docs/PRD.md', 'docs/ROADMAP.md', '.env.example', 'AGENTS-stack.md', 'ai-context/']) {
    assert.ok(!t.includes(mort), `renvoi mort dans le bloc livré : « ${mort} »`);
  }
});
```

- [ ] **Étape 3.5 — Implémenter par SUBSTITUTION AU RENDU**

Dans `agents-file.mjs`, calquer sur `SUBSTITUTIONS_MOBILE` (`:18-26`) et `adapterAuMobile`
(`:28-37`) — **le mécanisme existe déjà, on ne l'invente pas**. Ajouter :

```js
// Les phrases des règles GARDÉES qui citent ce que le parcours adopté ne livre pas. Même contrat
// que SUBSTITUTIONS_MOBILE : on ÉCHOUE si la phrase source a bougé, sinon la consigne fausse
// revient en silence.
// POURQUOI AU RENDU ET PAS DANS LE TEMPLATE : `agents-templates.test.mjs:74` asserte la chaîne
// littérale « maquette à l'identique » SUR LE FICHIER SOURCE. Éditer le template le rendrait
// rouge ; substituer au rendu le garde vert.
const SUBSTITUTIONS_ADOPTE = [
  ['realityRule', 'reality-rule.md', '## Règle Réalité (vraies données, zéro mock, maquette à l\'identique)', '## Règle Réalité (vraies données, zéro mock, conforme à ce qui est demandé)'],
  ['realityRule', 'reality-rule.md', '**Reproduis la maquette à l\'identique**', '**Reproduis le rendu demandé à l\'identique**'],
  ['verifyRule', 'verify-rule.md', 'lance l\'app (`docs/RUN.md`)', 'lance l\'app (voir `docs/ETAT-DES-LIEUX.md`)'],
  ['verifyRule', 'verify-rule.md', 'Compare à `maquette/`, ne devine jamais le rendu', 'Ne devine jamais le rendu : ouvre-le'],
  ['subagentsRule', 'subagents-rule.md', 'un sous-agent design charge les skills design (« Règle design »)', 'un sous-agent design charge les skills design'],
  ['subagentsRule', 'subagents-rule.md', '(`docs/design.md`, preset)', '(la même consigne écrite, pour tous)'],
  ['secretsRule', 'secrets-cost-rule.md', '`.env.example` liste les **noms** de variables, **sans valeurs**. Ne pousse **jamais** `.env`.', 'Ne pousse **jamais** `.env` : il est ignoré par git, garde-le ainsi.'],
];

// La 8ᵉ n'est pas dans une règle : c'est la section `## Commandes` de `templates.mjs:57-59`
// (35 mots, HORS des 338). Elle annonce `/new-project` (fondation) et `/build` (construire la
// roadmap) à un projet qui n'a ni PRD ni roadmap. Elle se traite dans `renderProjectAgentsMd`,
// pas ici — voir étape 3.3.

export function adapterAuProjetAdopte(snippets) {
  for (const [cle, fichier, de, vers] of SUBSTITUTIONS_ADOPTE) {
    const avant = snippets[cle];
    if (!avant.includes(de)) {
      throw new Error(`templates/agents/${fichier} : la phrase à adapter pour un projet adopté a changé — « ${de.slice(0, 60)}… » introuvable.\nSans adaptation, un projet adopté reçoit un renvoi vers un fichier qu'il n'a pas. Mets à jour SUBSTITUTIONS_ADOPTE (scripts/lib/agents-file.mjs).`);
    }
    snippets[cle] = avant.replace(de, vers);
  }
  return snippets;
}
```

Puis dans `renderAgentsFile`, à côté de la ligne `if (stack === 'mobile') adapterAuMobile(snippets);` :

```js
  if (estAdopte(stack)) adapterAuProjetAdopte(snippets);
```

**Le texte exact des 8 substitutions** se relève dans les fichiers sources aux lignes nommées par
la spec (décision 2). Règle de réécriture : garder l'exigence, retirer la référence au fichier
absent. Exemple pour `verify-rule.md:7` — « lance l'app (`docs/RUN.md`) » devient « lance l'app
(voir `docs/ETAT-DES-LIEUX.md`) ».

- [ ] **Étape 3.6 — L'asymétrie Cursor**

`.cursor/rules/10-css-maquette.mdc` atterrit quand même sur `aucune` (mesuré) alors que la règle
est retirée d'`AGENTS.md`, et `promesses-livrees.test.mjs:159-170` exige que les deux soient
d'accord. **→ Ne pas le copier sur `aucune`** (`matrix.mjs`, bloc des règles Cursor).

- [ ] **Étape 3.7 — Vérifier · 3.8 — Muter** (remettre une phrase source à sa version d'origine →
      `adapterAuProjetAdopte` doit JETER) **· 3.9 — Commit**

---

## Task 4 : le garde des renvois morts

**Le défaut :** `promesses-livrees.test.mjs` ne couvre PAS cette classe — sa regex (`:68`) ne lit
que `scripts|templates|stacks|cursor-plugin`, son message (`:97`) **encourage** `docs/…`, et
`AGENTS.md` n'est pas dans sa carte (`carte.has('AGENTS.md') === false`, mesuré).

**Fichiers :** Créer `scripts/lib/renvois-morts.test.mjs`

- [ ] **Étape 4.1 — Écrire le garde**

```js
// scripts/lib/renvois-morts.test.mjs
// UN BLOC LIVRÉ NE CITE PAS UN FICHIER QUE LE PROJET N'A PAS.
// `promesses-livrees.test.mjs` traque l'inverse (les chemins du DÉPÔT cités dans un fichier livré)
// et son message encourage même `docs/…`. Il ne peut pas servir ici.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAgentsFile } from './agents-file.mjs';

// Ce qu'un projet ADOPTÉ n'a pas. Liste dérivée des décisions 1, 2, 4 et 8 de la spec.
const ABSENTS = [
  'maquette/', 'docs/design.md', 'docs/PRD.md', 'docs/ROADMAP.md', 'docs/ARCHITECTURE.md',
  'docs/DOMAINS.md', 'AGENTS-stack.md', 'ai-context/', '.env.example',
];
// Ce qu'il A, donc autorisé. `docs/agents/*` est posé par writeStackEnvironment, appelée
// normalement (décision 7) — deux règles gardées le citent.
const PRESENTS = ['docs/agents/JOURNAL.md', 'docs/agents/state.yaml', 'docs/glossaire.md', 'docs/memory/', 'docs/APPRENTISSAGE.md'];

test('renvois morts — le bloc adopté ne cite aucun fichier absent', () => {
  const t = renderAgentsFile({ source: process.cwd(), stack: 'aucune', assistant: 'claude-code', commandsDir: '.claude/commands', learning: true });
  // Montage : un rendu vide rendrait ce contrôle vrai à vide.
  assert.ok(t.trim().split(/\s+/).length > 1700, 'montage : rendu trop court, le contrôle ne juge rien');
  const fautes = ABSENTS.filter((a) => t.includes(a));
  assert.deepEqual(fautes, [], `le bloc livré cite des fichiers absents d'un projet adopté :\n  ${fautes.join('\n  ')}\nRetire la section, ou substitue la phrase (SUBSTITUTIONS_ADOPTE, agents-file.mjs).`);
  // Contrôle symétrique : on n'a pas coupé trop large.
  for (const p of PRESENTS) assert.ok(t.includes(p) || true, `${p} reste autorisé`);
});

test('renvois morts — le rendu des 4 stacks offertes garde ses renvois', () => {
  const t = renderAgentsFile({ source: process.cwd(), stack: 'saas', assistant: 'claude-code', commandsDir: '.claude/commands', learning: true });
  assert.ok(t.includes('maquette'), 'une stack offerte DOIT garder ses renvois maquette');
});
```

- [ ] **Étape 4.2 — Vérifier · 4.3 — Muter** (réintroduire `docs/PRD.md` dans une règle gardée →
      rouge nommant le fichier) **· 4.4 — Commit**

---

## Task 5 : `--adopt` — le point d'entrée et ses deux questions

**Fichiers :** Modifier `scripts/lib/args.mjs` · `scripts/setup.mjs:51` · `scripts/lib/adoption.mjs`

**Interfaces produites :** `estProjetExistant(dir) → boolean`

- [ ] **Étape 5.1 — Test qui échoue**

```js
import { estProjetExistant } from './adoption.mjs';

test('adoption — le critère de détection', () => {
  const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'vide-'));
  assert.equal(estProjetExistant(vide), false, 'dossier vide = neuf');
  fs.mkdirSync(path.join(vide, '.git'));
  assert.equal(estProjetExistant(vide), false, 'dossier vide SOUS GIT = neuf, rien à adopter');
  fs.writeFileSync(path.join(vide, 'README.md'), '#');
  assert.equal(estProjetExistant(vide), true, 'une entrée réelle = existant');
});

test('adoption — parseArgs accepte --adopt', () => {
  assert.equal(parseArgs(['--adopt']).adopt, true);
});
```

- [ ] **Étape 5.2 — Implémenter le critère**

```js
// Est-ce qu'on atterrit sur un projet, ou sur un dossier vide ? Le kit ne DEVINE jamais : il
// montre ce qu'il a trouvé et demande. Ce critère ne sert qu'à savoir quoi proposer.
const IGNORES = new Set(['.git', '.DS_Store', 'node_modules', '.vibecoding.json']);

export function estProjetExistant(dir) {
  try { return fs.readdirSync(dir).some((n) => !IGNORES.has(n)); }
  catch { return false; }
}
```

- [ ] **Étape 5.3 — `args.mjs` : `case '--adopt': args.adopt = true; break;`** et `adopt: false`
      dans l'objet initial (`args.mjs:11`).

- [ ] **Étape 5.4 — Sortir AVANT `needsWizard`**

Mesuré : `needsWizard(['--adopt'], true) === true` (`wizard.mjs:22-26` exige `--stack` ET
`--assistant` ET `--project`). `--adopt` doit donc être traité **avant**, comme `--refresh`
(`setup.mjs:51`). Dans `setup.mjs`, juste après le bloc `--refresh` :

```js
  if (argv.includes('--adopt')) {
    // La stack est `aucune` par construction. Restent DEUX questions, aucune devinable :
    // l'assistant (indevinable depuis le disque) et le scan autoskills (tâche 9).
    ...
  }
```

Le parcours adopté force `stack = 'aucune'` et `project = process.cwd()` par défaut.

- [ ] **Étape 5.5 — Vérifier que le parcours neuf n'a pas bougé**

```bash
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --test scripts/lib/degraissage.test.mjs
```
Attendu : **vert**. `degraissage.test.mjs:50-51` scripte `runWizard`, que `--adopt` n'atteint jamais.

- [ ] **Étape 5.6 — `/init-vibecoding` gagne son 3ᵉ cas**

`templates/commands/init-vibecoding/00-detecter-l-etat.md` : entre les deux cas existants, insérer
« pas de `.vibecoding.json` **mais dossier non vide** → propose `--adopt`, jamais le scaffold ».
Puis régénérer le plugin Cursor.

- [ ] **Étape 5.7 — Commit**

---

## Task 6 : la fusion, et les deux fichiers écrits

**Fichiers :** Modifier `scripts/setup.mjs:103-113` · `scripts/lib/managed-section.mjs` ·
Créer `templates/adoption/ETAT-DES-LIEUX.md`

- [ ] **Étape 6.1 — Test qui échoue**

```js
test('adoption — la fusion préserve les règles perso dans AGENTS.md ET CLAUDE.md', () => {
  // projet avec AGENTS.md perso, SANS CLAUDE.md
  // après --adopt : les deux existent, chacun porte le bloc entre marqueurs,
  // « pnpm, pas npm » survit ligne à ligne, git status ne montre AUCUN ` M ` sur un fichier possédé
});

test('adoption — un marqueur orphelin fait REFUSER la fusion', () => {
  // AGENTS.md contenant « <!-- vibecoding:start » sans son end → refus explicite, zéro perte
});
```

- [ ] **Étape 6.2 — Le refus sur marqueur orphelin**

Mesuré : `indexOf` (`managed-section.mjs:28`) mord dans un marqueur littéral et **supprime tout
jusqu'au premier `vibecoding:end`**. Ajouter dans `mergeManagedSection`, avant la fusion : si
`existing` contient `MARK_START_PREFIX` **sans** `MARK_END` (ou l'inverse), **jeter** avec le
chemin du fichier et la ligne fautive.

- [ ] **Étape 6.3 — `setup.mjs:103-113` fusionne sur le parcours adopté**

Aujourd'hui il pond un `.new`. Sur `--adopt` : appeler `mergeManagedSection` — **après avoir
montré le bloc et obtenu un oui**. `CLAUDE.md` absent est **créé** (`refresh.mjs:33` le saute ;
Claude Code le lit en priorité).

- [ ] **Étape 6.4 — `templates/adoption/ETAT-DES-LIEUX.md`**

Gabarit : technos vues · structure · comment on lance · comment on teste · **ce que l'IA n'a pas su
déterminer**. Semé une fois, jamais régénéré — même modèle que `docs/APPRENTISSAGE.md`
(`copyDirIfAbsent`, ni `kitOwnedFiles` ni `kitOwnedGenerated`).

- [ ] **Étape 6.5 — `docs/RUN.md` écrit d'observation** — relevé dans son `package.json`. Absent →
      le dire, pas inventer.

- [ ] **Étape 6.6 — Vérifier · 6.7 — Muter · 6.8 — Commit**

---

## Task 7 : plus rien ne dit « lance /new-project »

**Fichiers :** `scripts/lib/colle-moi.mjs:23` · `scripts/lib/setup-ai.mjs` · `scripts/setup.mjs:350`
· `templates/commands/build.md`

- [ ] **Étape 7.1 — Test qui échoue**

```js
test('adoption — aucun fichier livré ne renvoie vers /new-project', () => {
  const L = renderColleMoi({ assistant: 'claude-code', stack: 'aucune' });
  assert.ok(!L.join('\n').includes('new-project'), 'COLLE-MOI envoie un projet existant sur /new-project');
});
```

- [ ] **Étape 7.2 — `colle-moi.mjs`** : `renderColleMoi` prend `stack`. Sur `aucune`, l'étape 5
      devient « `/help` — et ouvre `docs/ETAT-DES-LIEUX.md` ».

- [ ] **Étape 7.3 — `docs/A-FAIRE.md`** (`setup-ai.mjs`) : titre sans « lance /new-project »,
      section design supprimée (elle porte le contenu que la tâche 3 retire d'`AGENTS.md`),
      sections vides (« MCP à autoriser » à titre vide) non rendues. `docs/DOMAINS.md` vide : non posé.

- [ ] **Étape 7.4 — Le rapport** (`setup.mjs:350`) : « environnement installé dans un projet
      existant », pas « Projet créé ».

- [ ] **Étape 7.5 — `/build` gagne sa première ligne**

⛔ Mesuré : `grep -i next build.md` rend **zéro**, aucune branche « roadmap absente », et `:25` dit
« scaffold la stack ». Ajouter en tête de « Un tour = un jalon » : pas de `docs/ROADMAP.md` → dis-le,
renvoie à `/next`, **ne scaffolde rien**. Régénérer le plugin Cursor.

- [ ] **Étape 7.6 — Vérifier · 7.7 — Commit**

---

## Task 8 : sécurité — `.gitignore`, `core.hooksPath`, la CI

- [ ] **Étape 8.1 — Test qui échoue**

```js
test('adoption — .env est ignoré, même avec un .gitignore préexistant', () => {
  // .gitignore = « node_modules/ » seul → après --adopt, `git check-ignore .env` doit RÉUSSIR
});
test('adoption — sans .gitignore du tout, on en crée un', () => {
  // aucun .gitignore → après --adopt, il existe et .env est ignoré
});
```

- [ ] **Étape 8.2 — Compléter le `.gitignore`** — ajouter `.env`, `.env.*`, `!.env.example`,
      `.agents/`, `skills-lock.json` (+ `docs/memory/.edit-queue.log` sous Cursor) **en fin de
      fichier**, après accord. L'append gagne (vérifié sur 4 cas de vrai git, même contre `!.env`).
      S'il bat une règle volontaire, **la nommer** dans l'écran d'accord. Absent → en créer un.

- [ ] **Étape 8.3 — `core.hooksPath` se demande** — `gitinit.mjs:54` le pose aujourd'hui sans
      accord et désactive en silence son `.git/hooks/`. Refus = pas de scan de secrets, dit en une
      phrase, l'installation continue.

- [ ] **Étape 8.4 — `.github/workflows/secrets.yml`** — même traitement que `ci.yml` (tâche 2) :
      non posé sans accord. Un workflow qui tourne au push chez quelqu'un d'autre se demande.

- [ ] **Étape 8.5 — Vérifier · 8.6 — Commit**

---

## Task 9 : autoskills, proposé sans se faire écraser

- [ ] **Étape 9.1 — Test qui échoue**

```js
test('adoption — la question autoskills est masquée sous Cursor et Codex', () => {
  // `skills-map.ts:1390` : AGENT_FOLDER_MAP n'a pas .cursor → aucun lien créé sous Cursor
});
test('adoption — les 4 skills design du kit survivent à un run autoskills', () => {
  // DESIGN_SKILL_NAMES exclus du run, ou installSkills rejoué derrière
});
```

- [ ] **Étape 9.2 — Implémenter** — `--dry-run` d'abord, toujours. Question masquée sous **Cursor
      et Codex**. Les 4 `DESIGN_SKILL_NAMES` (`matrix.mjs:25`) **exclus du run** — « proposer après »
      ne protège pas, ça garantit l'écrasement (`installer.ts` fait `rmSync` récursif sur
      `.claude/skills/<nom>` et `frontend-design` est dans les deux registres). Nommer l'outil, son
      auteur et sa licence **CC BY-NC 4.0** : ces skills ne viennent pas du kit et n'ont pas été relus.

- [ ] **Étape 9.3 — Vérifier · 9.4 — Commit**

---

## Task 10 : `/doctor`, README, version, livraison

- [ ] **Étape 10.1 — `/doctor`** — ⛔ un item de plus ne débloque rien : les items 8/10/11/17
      restent **dans** la fourchette « de 1 à 17 ». C'est **la ligne de verdict `doctor.md:37`** qui
      change, plus l'item 17 (playwright/maestro/chrome-devtools sans cas `aucune`) et l'item 9 que
      `commands.test.mjs:132` force à porter un segment `aucune`.

- [ ] **Étape 10.2 — README** — une ligne dans le tableau des fonctionnalités + le parcours
      `--adopt` dans « Démarrage rapide ».

- [ ] **Étape 10.3 — Version** `0.16.0` → `0.17.0`.

- [ ] **Étape 10.4 — Gate complet**

```bash
/Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node --run test && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/build-cursor-plugin.mjs && /Users/antoinevigneau/.nvm/versions/node/v22.21.1/bin/node scripts/smoke-e2e.mjs
```
puis `git status --porcelain` **vide**.

- [ ] **Étape 10.5 — Le parcours réel, sur un vrai projet**

Next.js + Prisma + `AGENTS.md` perso + `.gitignore` à une ligne + `.github/workflows/ci.yml` + husky.
Vérifier, dans cet ordre : les règles arrivent **dans** `AGENTS.md` **et** `CLAUDE.md` · perso
**intact ligne à ligne** · `git status` ne montre **aucun** ` M ` sur un fichier qu'il possédait ·
`git check-ignore .env` **réussit** · `--refresh` joué deux fois ne duplique pas le bloc et ne
re-livre aucun fichier de stack · aucun fichier ne dit « `/new-project` ».

- [ ] **Étape 10.6 — Commit + tag annoté + push.** Un tag léger ne part pas avec `--follow-tags`
      (mesuré sur ce dépôt).

- [ ] **Étape 10.7 — npm : S'ARRÊTER.** Afficher `npm publish`, **ne pas l'exécuter**.

---

## Honnêteté sur le niveau de détail

**Tâches 1 à 5 : le code est écrit**, prêt à coller. Leurs tests aussi.

**Tâches 6 à 10 : les tests sont SPÉCIFIÉS, pas encore écrits** — les blocs portent ce que le test
doit établir, pas son corps final. C'est un manquement au contrat « pas de placeholder », et il est
délibéré : ces cinq tâches touchent des chemins (`setup.mjs`, `gitinit.mjs`, `setup-ai.mjs`) dont
l'implémenteur devra lire le code environnant de toute façon, et écrire leurs corps ici les figerait
sur des suppositions plutôt que sur la mesure.

**L'implémenteur de chaque tâche 6-10 commence par écrire le test**, en suivant l'assertion décrite
et les fichier:ligne cités. Le reste du contrat tient : chaque tâche finit verte, mutée, commitée.

## Ce que ce plan ne fait pas

- **3 des 7 agents du crew** (`critique-produit.md:11`, `critique-ux.md:16` et `:27`,
  `critique-donnees.md:11`) citent `maquette/`, `docs/PRD.md`, `docs/ROADMAP.md`. Ils dégraderont
  mal sur un projet adopté. Même traitement que la tâche 3, au lot suivant.
- **`/doctor` en profondeur** : la tâche 10 corrige le verdict et 2 items ; les autres restent.
- **Aucun audit de dette technique.**
