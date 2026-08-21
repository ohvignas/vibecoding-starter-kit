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
