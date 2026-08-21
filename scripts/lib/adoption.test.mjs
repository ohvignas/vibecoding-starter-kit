import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STACK_AUCUNE, estAdopte } from './adoption.mjs';
import { renderAgentsFile, adapterAuProjetAdopte } from './agents-file.mjs';
import { parseArgs, validateArgs } from './args.mjs';
import { resolveAssets } from './matrix.mjs';
import { kitOwnedFiles } from './kit-owned.mjs';

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

test('adoption — package.json ressort octet pour octet identique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const avant = '{ "name": "x", "scripts": { "dev": "next dev" } }';
  fs.writeFileSync(path.join(dir, 'package.json'), avant);
  execFileSync(process.execPath, [path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', 'cursor', '--project', dir, '--no-skills', '--yes'], { stdio: 'pipe' });
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), avant, 'le kit a touché son package.json');
});

// --- Le rendu AGENTS.md d'un projet adopté ---------------------------------------------------
// Sur un projet existant, le kit ne pose ni `maquette/`, ni `docs/design.md`, ni `AGENTS-stack.md`,
// ni `ai-context/`. Les règles qui les citaient devenaient des renvois morts : une consigne relue
// à CHAQUE message, qui envoie l'IA vers un fichier qui n'existe pas.
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

test('adoption — le pointeur Karpathy suit le fichier réellement livré, assistant par assistant', () => {
  // Le clone Karpathy est livré sur `aucune` (il n'est pas stack-keyé) : supprimer « Contexte de la
  // stack », sa seule mention, laisserait 3 ko de principes à la racine dont l'IA ignore l'existence.
  // Mais la CIBLE du clone dépend de l'assistant (matrix.mjs) — annoncer le mauvais chemin, c'est
  // recréer un renvoi mort en croyant en réparer un.
  for (const assistant of ['claude-code', 'codex', 'cursor']) {
    const t = renderAgentsFile({ source: process.cwd(), stack: 'aucune', assistant, commandsDir: '.claude/commands', learning: true });
    const cibles = resolveAssets('aucune', assistant).clones.flatMap((c) => c.picks.map((p) => p.to));
    assert.equal(t.includes('AGENTS-karpathy.md'), cibles.includes('AGENTS-karpathy.md'),
      `${assistant} : AGENTS.md doit citer \`AGENTS-karpathy.md\` exactement quand le clone le pose là`);
  }
});

test('adoption — le rendu tient sous 1900 mots et au-dessus de 1700', () => {
  const n = RENDU_ADOPTE().trim().split(/\s+/).length;
  assert.ok(n > 1700 && n < 1900, `rendu adopté = ${n} mots (attendu ~1860 : 1768 de méthode + plomberie)`);
});

test('adoption — aucune phrase gardée ne cite un fichier absent', () => {
  const t = RENDU_ADOPTE();
  // `docs/RUN.md` s'ajoute à la liste du plan : mesuré, il est cité DEUX fois (loop-section.md:7 et
  // verify-rule.md:7) et la tâche 2 a cessé de le rendre sur un projet adopté. Même défaut, même
  // traitement — sans cette entrée, le renvoi mort le mieux caché des neuf passait entre les mailles.
  for (const mort of ['maquette/', 'maquette à l\'identique', 'docs/design.md', 'Règle design', 'docs/PRD.md', 'docs/ROADMAP.md', '.env.example', 'AGENTS-stack.md', 'ai-context/', 'docs/RUN.md']) {
    assert.ok(!t.includes(mort), `renvoi mort dans le bloc livré : « ${mort} »`);
  }
});

test('adoption — le rendu des 4 stacks offertes ne bouge pas d\'un mot', () => {
  // Les substitutions du parcours adopté ne doivent RIEN coûter aux stacks offertes : elles n'ont
  // que 4 mots de marge sous le plafond de 2 200 (standing-rules.test.mjs B12). Un chiffre en dur
  // ici rend visible, dans le diff, toute substitution qui aurait fui hors de `aucune`.
  const mots = (stack) => renderAgentsFile({ source: process.cwd(), stack, assistant: 'claude-code', commandsDir: '.claude/commands', learning: true }).trim().split(/\s+/).length;
  assert.deepEqual(['saas', 'mobile', 'desktop', 'vitrine'].map(mots), [2196, 2184, 2196, 2196]);
});

test('adoption — la règle Cursor « CSS maquette » suit sa source : retirée elle aussi', () => {
  // Asymétrie mesurée : `.cursor/rules/10-css-maquette.mdc` atterrissait sur `aucune` alors que la
  // section correspondante était retirée d'AGENTS.md. Cursor recevait seul une consigne sur une
  // `maquette/` que le kit ne pose pas — et `promesses-livrees.test.mjs` exige qu'une règle Cursor
  // dise la même chose que sa source. Le scaffold ET le `--refresh` doivent s'abstenir.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'curs-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  execFileSync(process.execPath, [path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', 'cursor', '--project', dir, '--no-skills', '--yes'], { stdio: 'pipe' });
  assert.ok(!fs.existsSync(path.join(dir, '.cursor/rules/10-css-maquette.mdc')), 'la règle CSS maquette ne doit pas être posée sur un projet adopté');
  assert.ok(fs.existsSync(path.join(dir, '.cursor/rules/00-project.mdc')), '00-project.mdc reste : il renvoie à AGENTS.md, pas à une maquette');
  const cible = (stack) => kitOwnedFiles(stack, 'cursor').map((x) => x.to);
  assert.ok(!cible('aucune').includes('.cursor/rules/10-css-maquette.mdc'), '--refresh la recréerait');
  assert.ok(cible('saas').includes('.cursor/rules/10-css-maquette.mdc'), 'les 4 stacks offertes la gardent');
});

test('adoption — une phrase source qui bouge fait ÉCHOUER la substitution, pas passer en silence', () => {
  // Le contrat de SUBSTITUTIONS_ADOPTE (le même que SUBSTITUTIONS_MOBILE) : si le template est
  // réécrit, la substitution devient sans effet et le renvoi mort revient sans un mot. On jette.
  assert.throws(() => adapterAuProjetAdopte({
    loopSection: 'x', realityRule: 'x', verifyRule: 'x', subagentsRule: 'x', secretsRule: 'x',
  }), /la phrase à adapter pour un projet adopté a changé/);
});
