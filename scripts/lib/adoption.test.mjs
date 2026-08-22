import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STACK_AUCUNE, estAdopte, estProjetExistant, entreesDuProjet, runAdoptWizard, peutDemanderAdoption, erreursAdoption } from './adoption.mjs';
import { renderAgentsFile, adapterAuProjetAdopte } from './agents-file.mjs';
import { parseArgs, validateArgs } from './args.mjs';
import { choisirMode, needsWizard } from './wizard.mjs';
import { resolveAssets } from './matrix.mjs';
import { kitOwnedFiles, kitOwnedGenerated } from './kit-owned.mjs';
import { MARK_START_PREFIX, MARK_END } from './managed-section.mjs';

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
  // ANCRÉ SUR L'EN-TÊTE, comme la moitié négative au-dessus. Sans `^## `, 4 de ces 8 noms sont
  // aussi cités en RENVOI CROISÉ depuis d'autres règles (« Règle Preuve » ×5, « Règle Réalité » ×2,
  // « Règle de vérification » ×3, « Règle sous-agents » ×3) : la section pouvait disparaître
  // entièrement du rendu sans que cette assertion bronche — mesuré, les 4 vidées une à une la
  // laissaient verte. Seul le comptage de mots rougissait, avec un message qui ne nomme rien.
  for (const garde of ['Règle Preuve', 'Règle Réalité', 'Règle de vérification', 'Boucle d\'itération', 'Règle sous-agents', 'Mémoire du projet', 'Règle secrets', 'Mode apprentissage']) {
    assert.match(t, new RegExp(`^## .*${garde}`, 'm'), `« ${garde} » est de la méthode : elle DOIT rester`);
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

// --- Le point d'entrée `--adopt` --------------------------------------------------------------
// Rendre `aucune` légale (tâches 1-4) ne sert à rien tant que l'utilisateur n'a pas de commande
// pour la déclencher. `--adopt`, lancé DEPUIS son projet, est cette commande.
const NULL_OUT = { write() {} };
const capture = () => { const lignes = []; return { out: { write: (s) => lignes.push(s) }, texte: () => lignes.join('') }; };
const scripted = (reponses) => { let i = 0; return async () => reponses[i++]; };
// Le CLI joué pour de vrai. On garde le CODE DE SORTIE : c'est lui que lisent l'utilisateur, sa CI
// et le runbook — un refus qui sortirait en 0 se ferait enchaîner comme une réussite.
const lancerSetup = (argv) => {
  const cmd = [path.resolve('scripts/setup.mjs'), ...argv];
  try { return { code: 0, out: String(execFileSync(process.execPath, cmd, { stdio: 'pipe' })), err: '' }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? ''), err: String(e.stderr ?? '') }; }
};

test('adoption — le critère de détection', () => {
  const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'vide-'));
  assert.equal(estProjetExistant(vide), false, 'dossier vide = neuf');
  fs.mkdirSync(path.join(vide, '.git'));
  assert.equal(estProjetExistant(vide), false, 'dossier vide SOUS GIT = neuf, rien à adopter');
  fs.writeFileSync(path.join(vide, 'README.md'), '#');
  assert.equal(estProjetExistant(vide), true, 'une entrée réelle = existant');
});

test('adoption — le critère ignore les 4 entrées qui ne prouvent aucun projet, et jamais une 5ᵉ', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignore-'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, '.DS_Store'), '');
  fs.writeFileSync(path.join(dir, '.vibecoding.json'), '{}');
  assert.equal(estProjetExistant(dir), false, 'les 4 entrées ignorées ne prouvent aucun projet');
  assert.deepEqual(entreesDuProjet(dir), [], 'et rien à MONTRER : il n\'y a rien');
  // Un `.gitignore` (ou n'importe quel 5ᵉ fichier caché) EST du projet : ne pas l'ignorer aussi.
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  assert.equal(estProjetExistant(dir), true);
  assert.deepEqual(entreesDuProjet(dir), ['.gitignore']);
  // Dossier inexistant : pas de crash, et « rien à adopter ».
  assert.equal(estProjetExistant(path.join(dir, 'nulle-part')), false);
});

test('adoption — parseArgs accepte --adopt', () => {
  assert.equal(parseArgs(['--adopt']).adopt, true);
  assert.equal(parseArgs([]).adopt, false);
});

test('adoption — le parcours adopté MONTRE ce qu\'il a trouvé, puis demande l\'assistant', async () => {
  const { out, texte } = capture();
  const r = await runAdoptWizard(scripted(['o', '2']), false, out, { projectDir: '/tmp/mon-app', entrees: ['README.md', 'src'] });
  assert.deepEqual(r, { assistant: 'claude-code' });
  const t = texte();
  assert.match(t, /\/tmp\/mon-app/, 'le dossier visé doit être écrit noir sur blanc');
  assert.match(t, /README\.md/, 'MONTRER ce qu\'on a trouvé — jamais de devinette silencieuse');
  assert.match(t, /src/);
  // La stack n'est PAS demandée : elle vaut `aucune` par construction (décision 1).
  for (const mot of ['Que veux-tu construire', 'SaaS web', 'Electron', 'Site vitrine']) {
    assert.ok(!t.includes(mot), `« ${mot} » : la stack ne se demande pas sur un projet existant`);
  }
});

test('adoption — répondre non n\'installe rien : le kit demande avant de toucher au projet', async () => {
  const r = await runAdoptWizard(scripted(['n']), false, NULL_OUT, { projectDir: '/tmp/mon-app', entrees: ['README.md'] });
  assert.equal(r, null, 'un refus doit remonter, pas être écrasé par un défaut');
});

test('adoption — un dossier sans rien à adopter : le kit le DIT, et ne l\'adopte pas tout seul', async () => {
  // Le cas limite du critère : « README.md posé par GitHub » est classé EXISTANT alors que
  // l'utilisateur voulait du neuf, et un dossier vide sous git est classé NEUF. Dans les deux sens,
  // c'est la question qui tranche — jamais le critère seul.
  const { out, texte } = capture();
  const r = await runAdoptWizard(scripted(['']), false, out, { projectDir: '/tmp/vide', entrees: [] });
  assert.equal(r, null, 'sans rien à adopter, le défaut est NON');
  assert.match(texte(), /rien à adopter/i);
  assert.match(texte(), /create-vibecoding-kit/, 'et la commande du parcours NEUF doit être nommée');
});

test('adoption — `--adopt` sort avant needsWizard : il scaffolde sans --stack', () => {
  // `needsWizard(['--adopt'], true) === true` (wizard.mjs:22-26 exige --stack ET --assistant ET
  // --project) : sans early-return, ce run finirait sur « --stack doit valoir … » et exit 1.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adoptcli-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"deja-la"}');
  const r = lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']);
  assert.equal(r.code, 0, `--adopt doit sortir en 0 sans --stack : ${r.err}`);
  const mf = JSON.parse(fs.readFileSync(path.join(dir, '.vibecoding.json'), 'utf8'));
  assert.equal(mf.stack, 'aucune', '--adopt doit forcer la stack `aucune`');
  assert.equal(mf.assistant, 'claude-code');
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')), 'la méthode doit être installée');
  assert.ok(!fs.existsSync(path.join(dir, '.env.example')), 'rien de stack-keyé sur un projet adopté');
  assert.match(r.out, /package\.json/, 'la sortie doit MONTRER ce que le kit a trouvé');
});

test('adoption — `--adopt` sans --assistant hors terminal : refus nommé, rien d\'installé', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adoptnotty-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  const r = lancerSetup(['--adopt', '--project', dir, '--no-skills']);
  assert.equal(r.code, 1);
  assert.match(r.err, /--assistant/, 'le message doit nommer le drapeau qui manque');
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')), 'un refus n\'écrit rien');
});

test('adoption — `--adopt` sur un dossier sans rien à adopter, hors terminal : refus, pas de devinette', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adoptvide-'));
  const r = lancerSetup(['--adopt', '--assistant', 'cursor', '--project', dir, '--no-skills']);
  assert.equal(r.code, 1);
  assert.match(r.err, /rien à adopter/i);
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
});

test('adoption — le parcours demande dès qu\'il PEUT ; un --assistant ne vaut pas consentement', () => {
  assert.equal(peutDemanderAdoption(true, ['--adopt']), true);
  // ⛔ Le défaut mesuré par la revue : `--assistant` répond à UNE des deux questions, il n'autorise
  // pas à écrire dans le projet sans demander. Confondre les deux, c'était écrire sans porte.
  assert.equal(peutDemanderAdoption(true, ['--adopt', '--assistant', 'cursor']), true, 'un drapeau ne remplace pas le consentement');
  assert.equal(peutDemanderAdoption(false, ['--adopt']), false, 'hors terminal, on ne PEUT pas demander');
  assert.equal(peutDemanderAdoption(true, ['--adopt', '--yes']), false, '--yes = jamais de question');
});

test('adoption — `--adopt --stack saas` est refusé : une contradiction ne se corrige pas en silence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adoptstack-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  const r = lancerSetup(['--adopt', '--stack', 'saas', '--assistant', 'cursor', '--project', dir, '--no-skills']);
  assert.equal(r.code, 1);
  assert.match(r.err, /--stack/);
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')), 'un refus n\'écrit rien');
});

// --- Les quatre trous trouvés par la revue -----------------------------------------------------

test('adoption — L\'ORDRE des modes : `--adopt` passe AVANT le wizard du parcours neuf', () => {
  // ⛔ Le trou : tous les tests CLI passent par `stdio:'pipe'`, donc `isTTY` est faux, donc
  // `needsWizard` sort à wizard.mjs:24 sans regarder les drapeaux. L'ordre n'est observable qu'en
  // TTY — et la mutation « le bloc ne sort plus avant needsWizard » laissait 459/459 verts.
  // Cette mesure-là était en commentaire dans le code ; elle est ce qui rend l'ordre nécessaire.
  assert.equal(needsWizard(['--adopt'], true), true, 'si ceci devient false, l\'ordre cesse d\'être nécessaire — dis-le');
  assert.equal(choisirMode(['--adopt'], true), 'adopt', 'en TTY, --adopt ne doit JAMAIS tomber dans le wizard du parcours neuf');
  assert.equal(choisirMode(['--adopt'], false), 'adopt');
  assert.equal(choisirMode(['--refresh', '--adopt'], true), 'refresh', '--refresh reste le premier servi');
  // Le parcours neuf, inchangé : les deux seules autres issues.
  assert.equal(choisirMode([], true), 'wizard');
  assert.equal(choisirMode([], false), 'drapeaux');
  assert.equal(choisirMode(['--stack', 'saas', '--assistant', 'cursor', '--project', 'x'], true), 'drapeaux');
});

test('adoption — une réponse non comprise fait REDEMANDER : « nan » n\'ouvre pas la porte', async () => {
  // ⛔ Mesuré par la revue : avec `NON = ['n','non','no']`, « nan », « nope », « non merci »,
  // « bof » valaient OUI — 6 refus plausibles sur 7 franchissaient la porte, sur la question dont
  // l'enjeu est d'écrire dans le projet réel. Le patron correct est celui de `pickOne` : reboucler.
  const { out, texte } = capture();
  const r = await runAdoptWizard(scripted(['nan', 'bof', 'n']), false, out, { projectDir: '/tmp/mon-app', entrees: ['src'] });
  assert.equal(r, null, '« nan » puis « bof » puis « n » : la seule réponse comprise est le refus');
  assert.ok(texte().includes('Réponds par'), 'et chaque réponse non comprise doit le DIRE, pas être avalée');
});

test('adoption — Entrée vaut le défaut ANNONCÉ dans le libellé, dans les deux sens', async () => {
  // La chaîne vide est un consentement explicite au défaut écrit ([O/n] ou [o/N]) — c'est le seul
  // raccourci gardé, et il ne dit jamais oui là où le libellé annonce non.
  const surProjet = await runAdoptWizard(scripted(['', '2']), false, NULL_OUT, { projectDir: '/tmp/a', entrees: ['src'] });
  assert.deepEqual(surProjet, { assistant: 'claude-code' }, '[O/n] + Entrée = oui');
  const surVide = await runAdoptWizard(scripted(['']), false, NULL_OUT, { projectDir: '/tmp/b', entrees: [] });
  assert.equal(surVide, null, '[o/N] + Entrée = non');
});

test('adoption — `--assistant` saute la QUESTION, jamais la porte de consentement', async () => {
  // ⛔ Mesuré sur pty : `--adopt --assistant cursor` montrait le dossier puis écrivait tout, sans
  // une seule question, dans un terminal où demander était possible. Le MONTRE tenait, pas le DEMANDE.
  const refus = await runAdoptWizard(scripted(['n']), false, NULL_OUT, { projectDir: '/tmp/x', entrees: ['package.json'], assistant: 'cursor' });
  assert.equal(refus, null, 'un --assistant répond à une question, il ne consent pas à écrire');
  // Et l'inverse : la question de l'assistant, elle, est bien sautée — une réponse de plus dans le
  // script ferait échouer bruyamment (`undefined.trim()`), c'est ce qui rend l'assertion honnête.
  const accord = await runAdoptWizard(scripted(['o']), false, NULL_OUT, { projectDir: '/tmp/x', entrees: ['package.json'], assistant: 'cursor' });
  assert.deepEqual(accord, { assistant: 'cursor' });
});

test('adoption — les drapeaux du parcours adopté sont jugés par la MÊME règle que le parcours neuf', () => {
  // ⛔ Mesuré : `--adopt --backend nawak` sortait en exit 0 et persistait « nawak » dans
  // .vibecoding.json, que `--refresh` relit. La même valeur sort en 1 sur le parcours neuf.
  assert.deepEqual(erreursAdoption(parseArgs(['--adopt', '--assistant', 'cursor'])), []);
  assert.ok(erreursAdoption(parseArgs(['--adopt', '--assistant', 'nawak'])).some((e) => /assistant/.test(e)));
  assert.ok(erreursAdoption(parseArgs(['--adopt', '--assistant', 'cursor', '--backend', 'nawak'])).some((e) => /backend/.test(e)));
  // Deux exemptions, et seulement deux : l'assistant absent (c'est la question 1/2) et le nom de
  // projet (le chemin est OBSERVÉ, pas tapé — `isValidProjectName` refuse « ( ) ! $ »).
  assert.deepEqual(erreursAdoption(parseArgs(['--adopt'])), [], 'un assistant absent n\'est pas une faute : c\'est la question 1/2');
  assert.deepEqual(erreursAdoption({ ...parseArgs(['--adopt']), project: '/Users/x/Mon projet (v2)' }), [],
    'un dossier que l\'utilisateur ne peut pas renommer ne doit pas être refusé');
});

test('adoption — `--adopt --backend nawak` : exit 1, et rien de persisté', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adoptbk-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"x"}');
  const r = lancerSetup(['--adopt', '--assistant', 'cursor', '--backend', 'nawak', '--project', dir, '--no-skills']);
  assert.equal(r.code, 1);
  assert.match(r.err, /backend/);
  assert.ok(!fs.existsSync(path.join(dir, '.vibecoding.json')), 'une valeur refusée ne doit pas atterrir dans le manifeste');
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
});

// --- Tâche 6 : LA FUSION, ET LES DEUX FICHIERS ÉCRITS ------------------------------------------
//
// Tout ce qui précède rend `aucune` légale et `--adopt` atteignable. Il restait le trou qui vidait
// le chantier de son sens : `setup.mjs` REFUSE d'écrire par-dessus un `AGENTS.md` existant et pond
// un `AGENTS.md.new` que personne n'ouvre. Sur un projet existant — le seul cas où `--adopt` sert —
// la méthode n'arrivait donc JAMAIS dans le fichier que l'IA relit à chaque message.

// Un projet qui ressemble à ce qu'on adopte pour de vrai : du code, des règles perso, un dépôt git
// avec un commit — sans quoi `git status` n'a rien à dire et l'assertion de non-modification est
// vraie à vide.
function projetExistant(nom, { agents, claude, pkg } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${nom}-`));
  fs.writeFileSync(path.join(dir, 'package.json'), pkg ?? '{"name":"deja-la","scripts":{"dev":"vite","test":"vitest run"}}');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src/index.js'), 'console.log(1)\n');
  if (agents) fs.writeFileSync(path.join(dir, 'AGENTS.md'), agents);
  if (claude) fs.writeFileSync(path.join(dir, 'CLAUDE.md'), claude);
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' });
  git('init', '-b', 'main');
  git('config', 'user.email', 'test@exemple.fr');
  git('config', 'user.name', 'Test');
  git('add', '-A');
  git('commit', '--no-verify', '-m', 'avant le kit');
  return { dir, git };
}

// Les règles perso, ligne à ligne. « pnpm, pas npm » est l'exemple qui compte : c'est une consigne
// que le kit CONTREDIT (il écrit `npm run` partout) — si la fusion la perd, l'IA repart sur npm
// dans un projet pnpm, et personne ne saura pourquoi.
const REGLES_PERSO = [
  '# Mes règles à moi',
  '',
  '- **pnpm, pas npm.** Toujours. Le lockfile est à nous.',
  '- Les composants vont dans `src/ui/`, jamais ailleurs.',
  '- On ne pousse jamais sur `main` directement.',
];

test('adoption — la fusion préserve les règles perso dans AGENTS.md ET CLAUDE.md', () => {
  // Projet avec un AGENTS.md perso, SANS CLAUDE.md : les deux trous en un seul run.
  const { dir, git } = projetExistant('fusion', { agents: REGLES_PERSO.join('\n') + '\n' });
  const r = lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']);
  assert.equal(r.code, 0, `--adopt doit réussir : ${r.err}`);

  for (const nom of ['AGENTS.md', 'CLAUDE.md']) {
    const p = path.join(dir, nom);
    assert.ok(fs.existsSync(p), `${nom} doit exister — Claude Code lit CLAUDE.md en priorité, et refresh.mjs ne le crée jamais`);
    const t = fs.readFileSync(p, 'utf8');
    // 1. Le bloc du kit est LÀ, et il est DÉLIMITÉ : sans marqueurs, `--refresh` ne saura plus
    //    quoi remplacer et repartira en « migration douce », c'est-à-dire en doublon.
    assert.ok(t.includes(MARK_START_PREFIX), `${nom} : pas de marqueur d'ouverture — la méthode n'est pas installée`);
    assert.ok(t.includes(MARK_END), `${nom} : pas de marqueur de fermeture`);
    // 2. Et c'est bien LA MÉTHODE qui est dedans, pas une coquille : une règle nommée, pas un
    //    comptage d'octets qu'un fichier vide entre marqueurs satisferait.
    assert.match(t, /^## .*Règle Preuve/m, `${nom} : le bloc ne porte pas les règles standing`);
  }

  // 3. Les règles perso survivent LIGNE À LIGNE dans AGENTS.md — pas « le fichier n'est pas vide » :
  //    la perte mesurée sur ce chemin est PARTIELLE (managed-section.test.mjs), donc un contrôle
  //    global la rate.
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  for (const ligne of REGLES_PERSO.filter(Boolean)) {
    assert.ok(agents.includes(ligne), `AGENTS.md a perdu une ligne perso : « ${ligne} »`);
  }

  // 4. Aucun `.new` : c'était TOUT le défaut. Un `.new` posé à côté, c'est la méthode non installée.
  for (const nom of ['AGENTS.md.new', 'CLAUDE.md.new', 'AGENTS.md.bak', 'CLAUDE.md.bak']) {
    assert.ok(!fs.existsSync(path.join(dir, nom)), `${nom} ne doit pas exister : sur --adopt on FUSIONNE, on ne dépose pas à côté`);
  }

  // 5. `git status` : rien de ce qui appartient à l'utilisateur n'est modifié. AGENTS.md l'est —
  //    c'est le fichier consenti, et il porte désormais le bloc. Tout le reste doit être intact.
  const modifies = String(git('status', '--porcelain'))
    .split('\n').filter((l) => /^.M|^M/.test(l)).map((l) => l.slice(3));
  assert.deepEqual(modifies.sort(), ['AGENTS.md'],
    `le kit a modifié des fichiers qui ne sont pas à lui : ${modifies.join(', ')}`);
});

test('adoption — CLAUDE.md préexistant est fusionné lui aussi, pas doublé', () => {
  // Le cas symétrique : les deux fichiers sont là, chacun avec SES règles. Une fusion qui ne
  // traiterait que le premier laisserait Claude Code sur un CLAUDE.md sans méthode — et c'est
  // exactement le fichier qu'il lit en premier.
  const { dir } = projetExistant('fusion2', {
    agents: '# A\nRÈGLE-AGENTS\n',
    claude: '# C\nRÈGLE-CLAUDE\n',
  });
  assert.equal(lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']).code, 0);
  const a = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  const c = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(a, /RÈGLE-AGENTS/); assert.match(c, /RÈGLE-CLAUDE/);
  assert.match(a, /^## .*Règle Preuve/m); assert.match(c, /^## .*Règle Preuve/m);
  // Un seul bloc par fichier : deux marqueurs d'ouverture = deux jeux de règles relus à chaque
  // message, dont un périmé au premier `--refresh`.
  assert.equal(a.split(MARK_START_PREFIX).length - 1, 1, 'AGENTS.md doit porter UN seul bloc');
  assert.equal(c.split(MARK_START_PREFIX).length - 1, 1, 'CLAUDE.md doit porter UN seul bloc');
});

test('adoption — rejouer `--adopt` ne duplique rien (le second passage est une mise à jour)', () => {
  const { dir } = projetExistant('rejoue', { agents: REGLES_PERSO.join('\n') + '\n' });
  const argv = ['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills'];
  assert.equal(lancerSetup(argv).code, 0);
  const apres1 = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(lancerSetup(argv).code, 0);
  const apres2 = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(apres2, apres1, 'un second --adopt doit être un no-op sur AGENTS.md, pas un empilement');
});

test('adoption — un marqueur orphelin fait REFUSER la fusion : exit 1, fichier intact à l\'octet', () => {
  // Le cas de la spec : « il a recopié des MORCEAUX d'un `AGENTS.md.new` ». Un morceau, c'est un
  // marqueur d'ouverture sans sa fermeture. La fusion n'a alors aucune zone à remplacer.
  const perso = [
    '# Mes règles à moi',
    '- **pnpm, pas npm.**',
    'Collé du .new : <!-- vibecoding:start — bloc généré -->',
    'CE PARAGRAPHE EST À MOI ET IL DOIT SURVIVRE',
    'Et cette ligne aussi.',
  ].join('\n') + '\n';
  const { dir } = projetExistant('orphelin', { agents: perso });
  const r = lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']);

  // 1. Le fichier n'a pas bougé d'UN OCTET. C'est la seule assertion qui compte vraiment ici.
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), perso, 'un refus ne doit RIEN écrire');
  // 2. Le refus est DIT, et il nomme le fichier — l'utilisateur en a deux, « erreur de fusion »
  //    tout seul l'enverrait chercher dans les deux.
  //    ⛔ ANCRÉ SUR `AGENTS.md:<ligne>`, pas sur « AGENTS.md » tout seul : le nom apparaît déjà
  //    dans le préfixe que `setup.mjs` colle devant (`${name} — NON installé : …`), donc une
  //    assertion sur le nom nu reste verte même si le message de fusion, lui, retombe sur son
  //    libellé par défaut (« le fichier »). Mutation mesurée : retirer le `name` passé à
  //    `mergeManagedSection` laissait 40/40 verts. C'est la LIGNE qui prouve que le refus sait de
  //    quel fichier il parle.
  const sortie = r.out + r.err;
  assert.match(sortie, /AGENTS\.md:\d+ —/, 'le refus doit nommer le fichier ET la ligne fautive');
  assert.match(sortie, /D[ÉE]PAREILL/i, 'et dire POURQUOI il refuse');
  // 3. Et il sort en 1 : un refus qui sortirait en 0 se ferait enchaîner comme une réussite.
  assert.equal(r.code, 1, 'un fichier non installé ne peut pas sortir en 0');
  // 4. Le reste de l'installation n'est PAS annulé pour autant : le refus porte sur un fichier,
  //    pas sur le run. CLAUDE.md, lui, n'avait pas de marqueur fautif — il doit être là.
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')), 'un fichier refusé ne doit pas emporter l\'autre');
});

test('adoption — le morceau collé À CÔTÉ d\'un vrai bloc : c\'est là que du texte se perdait', () => {
  // ⛔ LE CAS QUI PERD, et il ne ressemble pas au précédent : le fichier a un `start` ET un `end`,
  // dans le bon ordre. Il en a juste DEUX starts. Un garde écrit « start sans end → jeter » (la
  // formulation du brief) reste vert dessus — mesuré, c'est ce qui a fait compter les marqueurs.
  //
  // La séquence est celle d'un vrai utilisateur, jouée pour de vrai : il adopte (le kit pose son
  // bloc), puis il colle un morceau de marqueur dans SA zone au-dessus, puis il rejoue `--adopt`.
  const { dir } = projetExistant('orphelin2', { agents: '# Mes règles\n- pnpm, pas npm.\n' });
  const argv = ['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills'];
  assert.equal(lancerSetup(argv).code, 0, 'le premier passage doit réussir : c\'est lui qui pose le vrai bloc');

  const apres1 = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  // Le morceau collé AU-DESSUS du vrai bloc, dans sa zone à lui.
  const abime = `Collé du .new : <!-- vibecoding:start — bloc généré -->\nCE PARAGRAPHE EST À MOI ET IL DOIT SURVIVRE\n\n${apres1}`;
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), abime);

  const r = lancerSetup(argv);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), abime,
    'sans refus, `slice` efface du marqueur collé jusqu\'au premier `end` — CE PARAGRAPHE compris');
  assert.equal(r.code, 1);
  assert.match(r.out + r.err, /AGENTS\.md/);
});

// --- Les deux fichiers écrits d'observation ----------------------------------------------------

test('adoption — `docs/ETAT-DES-LIEUX.md` est posé : le renvoi d\'AGENTS.md n\'est plus mort', () => {
  // ⛔ LE DÉFAUT CENTRAL DU CHANTIER. La tâche 3 fait citer `docs/ETAT-DES-LIEUX.md` par le rendu
  // adopté (SUBSTITUTIONS_ADOPTE, entrée verifyRule : « lance l'app (voir `docs/ETAT-DES-LIEUX.md`) »)
  // alors que le fichier n'existait NULLE PART. Mesuré avant cette tâche : `--adopt` ne le posait
  // pas. C'est le renvoi mort que tout ce chantier existe pour supprimer, recréé par le chantier.
  const { dir } = projetExistant('etat');
  assert.equal(lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']).code, 0);
  const etat = path.join(dir, 'docs/ETAT-DES-LIEUX.md');
  assert.ok(fs.existsSync(etat), 'docs/ETAT-DES-LIEUX.md : cité par AGENTS.md, il DOIT être posé');
  const t = fs.readFileSync(etat, 'utf8');
  // Le gabarit porte les 5 rubriques de la spec (décision 4) — dont la dernière, qui est la
  // raison d'être du fichier : ce que l'IA n'a pas su déterminer doit avoir un endroit où être dit,
  // sinon elle comble le trou en inventant.
  for (const rubrique of [/technos/i, /structure/i, /lance/i, /teste/i, /pas su d[ée]terminer/i]) {
    assert.match(t, rubrique, `le gabarit doit porter la rubrique ${rubrique}`);
  }
  // Semé UNE FOIS, jamais régénéré — même modèle que docs/APPRENTISSAGE.md : ce que l'IA y écrit
  // appartient à l'utilisateur. Un `--refresh` qui l'écraserait détruirait l'état des lieux, donc
  // il n'est NI dans `kitOwnedFiles` NI dans `kitOwnedGenerated` (les deux tables que refresh relit).
  const regenerables = [...kitOwnedFiles('aucune', 'claude-code'), ...kitOwnedGenerated('aucune', 'claude-code', {})].map((x) => x.to);
  assert.ok(!regenerables.includes('docs/ETAT-DES-LIEUX.md'),
    '--refresh ne doit JAMAIS réécrire l\'état des lieux : il est rempli par l\'IA, il est à l\'utilisateur');
  assert.ok(!regenerables.includes('docs/RUN.md'),
    'docs/RUN.md adopté est une OBSERVATION, pas un rendu du kit : --refresh le régénérerait depuis un modèle de stack inexistant');
  // Et il n'est pas écrasé au second passage.
  fs.writeFileSync(etat, t + '\nMA NOTE À MOI\n');
  assert.equal(lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']).code, 0);
  assert.match(fs.readFileSync(etat, 'utf8'), /MA NOTE À MOI/, 'un second passage ne doit pas écraser l\'état des lieux');
});

test('adoption — `docs/RUN.md` est relevé dans le package.json, pas copié d\'un modèle de stack', () => {
  // ⛔ Mesuré par la spec (décision 4) : sur le projet réel, `templates/run/<stack>.md` produisait
  // « Lancer l'app — SaaS (Convex + TanStack Start) · `npx convex dev` » dans un projet qui n'a ni
  // Convex ni TanStack. Le seul fichier qu'un débutant ouvre pour lancer son app lui mentait.
  const { dir } = projetExistant('run', { pkg: '{"name":"x","scripts":{"dev":"vite","test":"vitest run","build":"tsc -b"}}' });
  assert.equal(lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']).code, 0);
  const t = fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8');
  // Les scripts RÉELS, avec ce qu'ils lancent : le nom seul ne dit pas ce que fait `dev`.
  for (const attendu of ['npm run dev', 'vite', 'npm run test', 'vitest run', 'npm run build', 'tsc -b']) {
    assert.ok(t.includes(attendu), `docs/RUN.md doit relever « ${attendu} » du package.json`);
  }
  // Et RIEN d'une stack qu'on n'a pas prouvée.
  for (const invente of ['convex', 'Convex', 'TanStack', 'Expo', 'Astro', 'Electron']) {
    assert.ok(!t.includes(invente), `docs/RUN.md invente « ${invente} » : aucune stack n'est revendiquée sur un projet adopté`);
  }
});

test('adoption — sans package.json, `docs/RUN.md` le DIT au lieu d\'inventer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runvide-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>site</h1>');
  assert.equal(lancerSetup(['--adopt', '--assistant', 'cursor', '--project', dir, '--no-skills']).code, 0);
  const t = fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8');
  assert.match(t, /package\.json/, 'le fichier doit dire CE QU\'IL A CHERCHÉ');
  assert.match(t, /pas trouv|aucune commande|n'ai rien relev/i, 'et dire qu\'il n\'a rien trouvé');
  // Zéro commande inventée : pas un seul `npm run <x>` sorti de nulle part.
  assert.ok(!/`npm run \w/.test(t), 'aucune commande ne doit être inventée quand rien n\'a été relevé');
});

test('adoption — le gestionnaire de paquets suit le lockfile OBSERVÉ, pas npm par défaut', () => {
  // « pnpm, pas npm » n'est pas qu'une règle perso : le lockfile est sur le disque, donc c'est une
  // OBSERVATION. Écrire `npm run dev` dans un projet pnpm, c'est la première commande que
  // l'utilisateur copie — et elle casse son lockfile.
  const { dir } = projetExistant('pnpm', { pkg: '{"name":"x","scripts":{"dev":"vite"}}' });
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  assert.equal(lancerSetup(['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills']).code, 0);
  const t = fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8');
  assert.ok(t.includes('pnpm run dev'), 'le lockfile pnpm est observable : la commande doit être pnpm');
  // ⛔ `'pnpm run dev'.includes('npm run dev')` est VRAI (« p-npm run dev ») : la première version
  // de cette assertion rougissait sur un rendu correct. Il faut une frontière, sinon le contrôle
  // ne peut PAS distinguer les deux commandes qu'il est censé opposer.
  assert.doesNotMatch(t, /(?<!p)npm run dev/, 'et surtout PAS npm — c\'est la commande qui casse le lockfile');
});

// --- Le parcours NEUF ne doit pas bouger d'un octet ---------------------------------------------

test('adoption — sur une stack OFFERTE, un AGENTS.md existant part toujours en .new (rien n\'a bougé)', () => {
  // La fusion est réservée au parcours adopté. Sur les 4 stacks offertes, le contrat d'origine
  // tient : on n'écrase pas, on dépose à côté. Ce test est le filet du « ne bouge pas d'un octet » —
  // sans lui, élargir la fusion à tout le monde passerait inaperçu.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuf-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'MES RÈGLES\n');
  assert.equal(lancerSetup(['--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes']).code, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'MES RÈGLES\n', 'stack offerte : l\'AGENTS.md existant n\'est pas touché');
  assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md.new')), 'stack offerte : la nouvelle version part en .new');
  // Et son docs/RUN.md vient toujours du modèle de stack, pas d'une observation.
  assert.match(fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8'), /convex/i, 'saas : docs/RUN.md doit rester le modèle de la stack');
  assert.ok(!fs.existsSync(path.join(dir, 'docs/ETAT-DES-LIEUX.md')), 'une stack offerte n\'a pas d\'état des lieux à faire');
});

test('adoption — la porte de consentement DIT quels fichiers vont être réécrits', async () => {
  // « Montre, puis demande. » Depuis la fusion (tâche 6), répondre oui ne pose plus seulement des
  // fichiers neufs : ça réécrit deux fichiers qui existent déjà. Consentir à « installer la
  // méthode » sans savoir lesquels, ce n'est pas consentir à ce qui se passe.
  const { out, texte } = capture();
  // ⛔ L'ORDRE ne se lit PAS dans le texte capturé : la question passe par `ask`, jamais par `out`.
  // Une première version comparait deux `indexOf` dans `texte()` — la question n'y étant pas,
  // elle rougissait sur un ordre pourtant correct. On mesure donc l'ordre RÉEL : ce qui avait été
  // écrit à l'instant où la question a été posée.
  let vuALaQuestion = null;
  const ask = async (q) => { if (/Installer/.test(q) && vuALaQuestion === null) vuALaQuestion = texte(); return 'n'; };
  await runAdoptWizard(ask, false, out, { projectDir: '/tmp/mon-app', entrees: ['AGENTS.md', 'src'] });

  assert.ok(vuALaQuestion !== null, 'montage : la question de consentement n\'a pas été posée');
  assert.match(vuALaQuestion, /AGENTS\.md/, 'le fichier fusionné doit être NOMMÉ avant la question');
  assert.match(vuALaQuestion, /CLAUDE\.md/, 'et l\'autre aussi : Claude Code le lit en priorité');
  assert.match(vuALaQuestion, /marqueur/i, 'et la FRONTIÈRE (les marqueurs) : c\'est elle qui rend la promesse vérifiable');
});

// --- CORRECTION 1 : `--force` ne peut pas démentir une promesse écrite dans le fichier ---------

test('adoption — `--force` ne détruit PAS les deux fichiers qui promettent le contraire', () => {
  // ⛔ MESURÉ : l'utilisateur répond aux questions de `docs/RUN.md` et `docs/ETAT-DES-LIEUX.md`,
  // relance `--adopt --force`, et ses réponses sont ÉCRASÉES — sans `.bak`, et avec un rapport qui
  // affiche « ✅ » comme pour une création. Au même instant, `docs/A-FAIRE.md` est protégé
  // (« ✅ docs/A-FAIRE.md.new (ton A-FAIRE.md est conservé) ») et `AGENTS.md` l'est aussi (fusion).
  //
  // L'INVERSION EST LE DÉFAUT : sous `--force`, les fichiers du kit sont ménagés et le travail
  // écrit À LA MAIN par l'utilisateur est détruit. Ces deux fichiers-ci portent en toutes lettres
  // « le kit ne régénère jamais ce fichier » — la promesse est neuve (tâche 6), et elle était fausse.
  const { dir } = projetExistant('force', { pkg: '{"name":"x","scripts":{"dev":"vite"}}' });
  const argv = ['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills'];
  assert.equal(lancerSetup(argv).code, 0);

  const REPONSES = {
    'docs/RUN.md': '\nMA RÉPONSE : on lance avec `pnpm dev`, port 5173.\n',
    'docs/ETAT-DES-LIEUX.md': '\nMA RÉPONSE : ce projet est un back Fastify, pas un front.\n',
  };
  for (const [rel, reponse] of Object.entries(REPONSES)) {
    const p = path.join(dir, rel);
    // La PROMESSE et le COMPORTEMENT sont vérifiés ensemble : si quelqu'un retire un jour la
    // phrase du gabarit, ce test le dit ici plutôt que de laisser les deux diverger en silence.
    // Les deux fichiers formulent la promesse un peu différemment (« le kit ne régénère jamais ce
    // fichier » · « c'est ton fichier : le kit ne le régénère jamais ») : la regex vise ce qu'ils
    // promettent, pas une tournure. Retirer la phrase de l'un des deux fait rougir ici.
    assert.match(fs.readFileSync(p, 'utf8'), /ne (le )?régénère jamais/,
      `${rel} : la promesse doit être écrite dans le fichier — c'est elle qui lui donne sa valeur`);
    fs.appendFileSync(p, reponse);
  }

  assert.equal(lancerSetup([...argv, '--force']).code, 0, `--force doit rester un run valide`);

  for (const [rel, reponse] of Object.entries(REPONSES)) {
    assert.ok(fs.readFileSync(path.join(dir, rel), 'utf8').includes(reponse.trim()),
      `${rel} : --force a détruit une réponse écrite à la main, dans un fichier qui promet l'inverse`);
  }
});

test('adoption — sur une stack OFFERTE, `--force` garde son sens sur docs/RUN.md', () => {
  // Contrôle symétrique : rendre `docs/RUN.md` insensible à `--force` PARTOUT changerait le
  // parcours neuf. Sur les 4 stacks offertes, ce fichier est un rendu du kit (modèle de stack) et
  // ne promet rien : `--force` doit continuer à le régénérer.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forceneuf-'));
  const argv = ['--stack', 'saas', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes'];
  assert.equal(lancerSetup(argv).code, 0);
  fs.appendFileSync(path.join(dir, 'docs/RUN.md'), '\nGRIBOUILLIS\n');
  assert.equal(lancerSetup([...argv, '--force']).code, 0);
  assert.ok(!fs.readFileSync(path.join(dir, 'docs/RUN.md'), 'utf8').includes('GRIBOUILLIS'),
    'stack offerte : --force doit toujours régénérer docs/RUN.md depuis le modèle de stack');
});

// Extrait les lignes d'une section du rapport (jusqu'à la ligne vide suivante).
const sectionDuRapport = (sortie, titre) => {
  const apres = sortie.split(titre)[1];
  return apres === undefined ? null : apres.split('\n\n')[0];
};

test('adoption — sous `--force`, le rapport DIT que le drapeau a été écarté, et pourquoi', () => {
  // ⛔ MESURÉ, et c'est pire qu'un silence. Le rapport a un seul bac « conservé », dont le titre
  // annonce la raison. Sur le MÊME projet :
  //   · sans `--force` : 25 lignes sous « Conservé (déjà présent — le kit n'écrase jamais tes
  //     fichiers) », et le titre dit vrai pour les 25 ;
  //   · avec `--force` : exactement DEUX lignes, sous le même titre INCHANGÉ.
  // Or « déjà présent » n'est pas la raison de leur survie : les 23 autres étaient déjà présents
  // aussi, et ont été écrasés. Les deux seules lignes qui ont écarté le drapeau de l'utilisateur
  // s'affichaient comme si le drapeau n'avait jamais été tapé. Ni vrai, ni silencieux : FAUX.
  const { dir } = projetExistant('rapportforce', { pkg: '{"name":"x","scripts":{"dev":"vite"}}' });
  const argv = ['--adopt', '--assistant', 'claude-code', '--project', dir, '--no-skills'];
  assert.equal(lancerSetup(argv).code, 0);

  const normal = lancerSetup(argv);
  const force = lancerSetup([...argv, '--force']);
  assert.equal(force.code, 0, `--force doit rester un run valide : ${force.err}`);

  // ── LE RUN --force ──────────────────────────────────────────────────────────────────────────
  for (const f of ['docs/ETAT-DES-LIEUX.md', 'docs/RUN.md']) {
    assert.ok(force.out.includes(f), `${f} doit apparaître au rapport du run --force`);
    const dejaPresent = sectionDuRapport(force.out, 'Conservé (déjà présent') ?? '';
    assert.ok(!dejaPresent.includes(f),
      `${f} est annoncé « déjà présent » alors que les autres fichiers déjà présents de ce run ont été ÉCRASÉS — la raison affichée est fausse`);
  }
  assert.match(force.out, /--force/, 'le rapport doit NOMMER le drapeau qu\'il a écarté');
  assert.match(force.out, /promis|promesse/i, 'et DIRE pourquoi : le kit a promis de ne jamais régénérer ces fichiers');
  // L'échappatoire, sinon « ignoré » se lit comme « cassé » par qui voulait vraiment repartir à neuf.
  assert.match(force.out, /supprime/i, 'et dire comment repartir du gabarit, puisque --force ne le fera pas');

  // ── LE DISCRIMINANT : un run NORMAL ne doit rien dire de tout ça ─────────────────────────────
  // Sans cette moitié, une mention affichée EN PERMANENCE rendrait la moitié du haut verte pour la
  // mauvaise raison — et ferait parler d'un drapeau que l'utilisateur n'a jamais tapé.
  assert.equal(normal.code, 0);
  assert.doesNotMatch(normal.out, /--force/, 'un run sans --force ne doit pas parler de --force');
  const dejaPresentNormal = sectionDuRapport(normal.out, 'Conservé (déjà présent') ?? '';
  for (const f of ['docs/ETAT-DES-LIEUX.md', 'docs/RUN.md']) {
    assert.ok(dejaPresentNormal.includes(f),
      `${f} : sans --force, « déjà présent » EST la bonne raison — elle doit rester là où elle est vraie`);
  }
});
