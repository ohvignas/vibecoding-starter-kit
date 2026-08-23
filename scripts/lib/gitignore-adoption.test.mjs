// scripts/lib/gitignore-adoption.test.mjs — LA FUITE DE SECRETS D'UN PROJET ADOPTÉ.
//
// ⛔ CE QUE CE FICHIER GARDE, ET POURQUOI C'EST LE PLUS SÉRIEUX DU CHANTIER. Sur les 4 stacks
// offertes, le kit pose un `.gitignore` complet. Sur un projet ADOPTÉ, `copyIfAbsent` sautait le
// fichier existant — et le cas NORMAL d'un projet existant, c'est d'avoir déjà son `.gitignore`.
// Mesuré avant ces gardes, sur un projet dont le `.gitignore` disait `node_modules/` :
//     git check-ignore .env  →  exit 1
// Dans un kit qui installe un scan de secrets et écrit dans chaque guide que les clés vont dans
// `.env`. Le seul fichier qui devait être protégé était le seul que personne ne protégeait.
//
// LES TESTS DE BOUT EN BOUT PASSENT PAR `git check-ignore`, PAS PAR UNE LECTURE DU FICHIER.
// Lire le `.gitignore` et y chercher « .env » prouverait qu'une chaîne a été écrite ; c'est GIT
// qui décide, avec ses règles de précédence, et c'est donc git qu'on interroge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  reglesAdoption, REGLE_CURSOR, motifMatch, etatEffectif, ligneDecisive, analyserGitignore,
  completerGitignore, renderAccordGitignore, planGitignore, appliquerGitignore, partagerGitignore, ENTETE_BLOC,
} from './gitignore-adoption.mjs';

const hint = (s) => s;
const projet = (prefixe) => fs.mkdtempSync(path.join(os.tmpdir(), prefixe));
const ecrire = (dir, rel, contenu) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), contenu); };

// Un vrai dépôt, et un vrai `git check-ignore` : `true` = git ignore ce chemin, `false` = il le suivra.
const gitInit = (dir) => execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main'], { stdio: 'pipe' });
const gitIgnore = (dir, chemin) => {
  try { execFileSync('git', ['-C', dir, 'check-ignore', chemin], { stdio: 'pipe' }); return true; }
  catch { return false; }
};
const scaffolderAdopte = (dir, assistant = 'claude-code') => execFileSync(process.execPath, [
  path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', assistant,
  '--project', dir, '--no-skills', '--yes',
], { stdio: 'pipe' });

// ── LE MATCHEUR : le seul défaut réel du module trouvé à la reprise ────────────────────────────

test('gitignore — `**` ne fait plus tomber le matcheur (MARQUE n\'était déclaré nulle part)', () => {
  // ⛔ Mesuré sur le module tel qu'il a été trouvé : `motifMatch('**/foo', …)` sortait en
  // `ReferenceError: MARQUE is not defined`. Un `.gitignore` du monde réel qui contient `**/dist`
  // — il y en a partout — faisait donc PLANTER l'analyse, et avec elle tout le parcours adopté.
  assert.equal(motifMatch('**/foo', 'a/b/foo'), true, '`**` doit franchir les /');
  // ⛔ « erreur.log » et non l'autre nom évident : A9 (`degraissage.test.mjs`) traque le chemin de
  // l'ancien dossier de mise au point supprimé au Lot A, sur tout fichier SUIVI par git. Une donnée
  // de test anodine y ressemblait — et A9 ne l'a vue qu'au `git add` : il lit `git ls-files`,
  // pas le disque. Un fichier neuf lui est INVISIBLE tant qu'il n'est pas suivi.
  assert.equal(motifMatch('*.log', 'erreur.log'), true);
  assert.equal(motifMatch('*.log', 'a/erreur.log'), true, 'un motif sans / matche le nom de base à toute profondeur');
  assert.equal(motifMatch('/build', 'build'), true, '`/` en tête = ancré à la racine');
  assert.equal(motifMatch('node_modules/', 'node_modules'), true, '`/` en fin = dossier');
  // Le jeton du `**` est un NUL, pas un espace : un motif qui contient un espace reste littéral.
  assert.equal(motifMatch('mon dossier', 'mon dossier'), true);
  assert.equal(motifMatch('mon dossier', 'mon-XXX-dossier'), false, 'l\'espace ne doit pas devenir un joker');
});

test('gitignore — la DERNIÈRE règle qui matche décide (c\'est toute la raison de l\'append)', () => {
  assert.equal(etatEffectif('.env\n', '.env'), true);
  assert.equal(etatEffectif('.env\n!.env\n', '.env'), false, 'la négation qui vient après gagne');
  assert.equal(etatEffectif('!.env\n.env\n', '.env'), true, '…et l\'inverse aussi : c\'est la position qui tranche');
  assert.equal(etatEffectif('node_modules/\n', '.env'), null, 'aucune règle n\'en parle');
  assert.equal(etatEffectif('# .env\n', '.env'), null, 'un commentaire n\'est pas une règle');
  assert.equal(etatEffectif('secrets/\n', 'secrets/cle.txt'), true, 'un dossier ignoré ignore ce qu\'il contient');
  assert.equal(ligneDecisive('node_modules/\n!.env\n', '.env'), '!.env', 'la ligne à NOMMER dans l\'écran d\'accord');
});

// ── L'ANALYSE : ce qu'il y a à écrire, et ce qu'on renverserait en l'écrivant ──────────────────

test('gitignore — un projet qui protège DÉJÀ tout ne reçoit rien (rejouer n\'ajoute aucun doublon)', () => {
  const deja = ['node_modules/', '.env', '.env.*', '!.env.example', '.agents/', 'skills-lock.json'].join('\n') + '\n';
  const { aAjouter, battues } = analyserGitignore(deja, reglesAdoption('claude-code'));
  assert.deepEqual(aAjouter, [], 'rien à écrire chez qui est déjà propre');
  assert.deepEqual(battues, []);
  assert.equal(completerGitignore(deja, aAjouter), deja, 'et le fichier ressort à l\'octet près');
  // Le cas le plus courant du monde réel : `.env*` couvre `.env` ET `.env.local` d'un coup.
  const large = analyserGitignore('.env*\n.agents/\nskills-lock.json\n', reglesAdoption('claude-code'));
  assert.ok(!large.aAjouter.includes('.env'), '`.env*` protège déjà `.env` : ne pas le réécrire');
  assert.ok(!large.aAjouter.includes('.env.*'), '`.env*` protège déjà `.env.local`');
});

test('gitignore — une règle du kit qui renverse une ligne EXISTANTE est rangée dans `battues`', () => {
  const { aAjouter, battues } = analyserGitignore('node_modules/\n!.env\n', reglesAdoption('claude-code'));
  assert.ok(aAjouter.includes('.env'), '`.env` reste à écrire : l\'utilisateur ne le protège pas');
  assert.deepEqual(battues.map((b) => b.ligne), ['!.env'], 'et l\'écran d\'accord doit pouvoir la citer telle quelle');
  assert.equal(battues[0].chemin, '.env');
  // Ce qui ne renverse RIEN ne doit jamais entrer dans `battues` : sinon tout projet deviendrait
  // un cas à trancher, et l'avertissement ne voudrait plus rien dire.
  assert.deepEqual(analyserGitignore('node_modules/\n', reglesAdoption('claude-code')).battues, []);
});

test('gitignore — la règle Cursor n\'est proposée QUE sous Cursor', () => {
  // `docs/memory/.edit-queue.log` est écrit par le hook Cursor, et par lui seul. L'ignorer sous
  // Claude Code ou Codex serait une ligne qui ne parle d'aucun fichier existant.
  assert.ok(reglesAdoption('cursor').includes(REGLE_CURSOR));
  for (const a of ['claude-code', 'codex']) assert.ok(!reglesAdoption(a).includes(REGLE_CURSOR), `${a} n'écrit jamais ce fichier`);
});

// ── L'ÉCRITURE : en fin de fichier, sans toucher un octet de ce qui précède ────────────────────

test('gitignore — le bloc est AJOUTÉ en fin de fichier, jamais fondu dans le texte existant', () => {
  const avant = 'node_modules/\ndist/\n';
  const apres = completerGitignore(avant, ['.env', '!.env.example']);
  assert.ok(apres.startsWith(avant), 'le contenu d\'origine ressort en tête, à l\'octet près');
  assert.ok(apres.indexOf(ENTETE_BLOC) > apres.indexOf('dist/'), 'le bloc vient APRÈS — c\'est ce qui le fait gagner');
  assert.ok(apres.indexOf('.env\n') < apres.indexOf('!.env.example'), '`!.env.example` doit suivre les règles qu\'il excepte');
  // ⛔ Sans saut de ligne final, la première règle ajoutée se collerait à la dernière ligne de
  // l'utilisateur (`dist/.env`) : deux règles détruites d'un coup, la sienne et la nôtre.
  const colle = completerGitignore('dist/', ['.env']);
  assert.ok(colle.includes('dist/\n'), `une ligne sans \\n final doit en recevoir un : ${JSON.stringify(colle)}`);
  assert.ok(!colle.includes('dist/.env'), 'les deux règles ne doivent JAMAIS se coller');
  // Fichier absent : le bloc ne commence pas par une ligne vide.
  assert.ok(completerGitignore('', ['.env']).startsWith(ENTETE_BLOC));
});

test('gitignore — l\'écran d\'accord NOMME les règles ajoutées, et la ligne que le bloc renverse', () => {
  // ⛔ C'est LA raison d'être de l'écran. L'ajout en fin de fichier gagne toujours — y compris
  // contre un `!.env` que quelqu'un a tapé exprès. Renverser une intention se dit AVANT, dans
  // l'écran, pas jamais.
  const plan = { existe: true, ...analyserGitignore('node_modules/\n!.env\n', reglesAdoption('claude-code')) };
  const t = renderAccordGitignore(plan, hint, false);
  assert.match(t, /\.env/, 'les règles ajoutées doivent être écrites');
  assert.match(t, /« !\.env »/, 'la ligne battue doit être citée TELLE QUELLE');
  assert.match(t, /gagnera|renverse/i, 'et l\'effet doit être dit, pas sous-entendu');
  // Rien de battu → aucun avertissement : un écran qui crie toujours n'avertit plus de rien.
  const calme = renderAccordGitignore({ existe: true, ...analyserGitignore('node_modules/\n', reglesAdoption('claude-code')) }, hint, false);
  assert.doesNotMatch(calme, /renverse/i);
  // Fichier absent : l'écran dit qu'il en CRÉE un, pas qu'il complète celui qui n'existe pas.
  const neuf = renderAccordGitignore({ existe: false, ...analyserGitignore('', reglesAdoption('claude-code')) }, hint, false);
  assert.match(neuf, /n'a pas de `\.gitignore`/);
});

// ── LES TROIS ÉTATS D'ACCORD, SUR DISQUE ──────────────────────────────────────────────────────

test('gitignore — accord donné : tout est écrit, y compris ce qui renverse une règle', () => {
  const dir = projet('gi-oui-');
  ecrire(dir, '.gitignore', 'node_modules/\n!.env\n');
  const plan = planGitignore(dir, 'claude-code');
  const { ecrites, refusees } = appliquerGitignore(plan, { accord: true });
  assert.ok(ecrites.includes('.env'), 'il a lu l\'écran et a dit oui : la règle battue est écrite');
  assert.deepEqual(refusees, []);
  gitInit(dir);
  assert.equal(gitIgnore(dir, '.env'), true, 'git doit maintenant ignorer .env');
});

test('gitignore — refus explicite : RIEN n\'est écrit, pas même ce qui ne renversait rien', () => {
  const dir = projet('gi-non-');
  ecrire(dir, '.gitignore', 'node_modules/\n');
  const plan = planGitignore(dir, 'claude-code');
  const { ecrites, refusees } = appliquerGitignore(plan, { accord: false });
  assert.deepEqual(ecrites, [], 'un refus est un refus');
  assert.deepEqual(refusees, plan.aAjouter, 'et ce qui n\'a pas été écrit doit remonter, pour être dit');
  assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'node_modules/\n', 'le fichier ressort à l\'octet près');
});

test('gitignore — personne à qui demander : on protège, on ne renverse pas', () => {
  // Le 3ᵉ état (`accord: undefined`), celui des runs hors terminal. « Rien » laisserait `.env`
  // suivi dans le cas ordinaire ; « tout » renverserait un `!.env` volontaire sans que personne
  // ne puisse répondre. On écrit donc ce qui ne renverse rien, et le reste part en « Sauté ».
  const dir = projet('gi-muet-');
  ecrire(dir, '.gitignore', 'node_modules/\n!.env\n');
  const { ecrites, refusees } = appliquerGitignore(planGitignore(dir, 'claude-code'), {});
  assert.deepEqual(refusees, ['.env'], 'la seule règle battue, et elle est nommée');
  assert.ok(ecrites.includes('.env.*') && ecrites.includes('.agents/'), 'ce qui ne renverse rien protège quand même');
  gitInit(dir);
  assert.equal(gitIgnore(dir, '.env'), false, '`!.env` est une intention : on ne la renverse pas dans son dos');
  assert.equal(gitIgnore(dir, '.env.local'), true, '…mais le reste de la famille est protégé');
});

// ── BOUT EN BOUT : LE CLI, UN VRAI DÉPÔT, UN VRAI `git check-ignore` ───────────────────────────

test('adoption — .env est ignoré, même avec un .gitignore préexistant (et rejouer n\'ajoute rien)', () => {
  // Le test de l'étape 8.1 du brief, et la régression mesurée : `.gitignore = node_modules/` seul
  // → avant ce chantier, `git check-ignore .env` sortait en 1 APRÈS installation.
  const dir = projet('adopt-gi-');
  ecrire(dir, 'package.json', '{"name":"deja-la"}');
  ecrire(dir, '.gitignore', 'node_modules/\n');
  gitInit(dir);
  assert.equal(gitIgnore(dir, '.env'), false, 'postulat : avant le kit, .env part au commit');

  scaffolderAdopte(dir);
  assert.equal(gitIgnore(dir, '.env'), true, '.env DOIT être ignoré après installation');
  assert.equal(gitIgnore(dir, '.env.local'), true);
  assert.equal(gitIgnore(dir, '.env.example'), false, 'le modèle SANS secret, lui, se commite');
  // `node_modules/` avec le slash : un motif « dossier seulement » ne matche un chemin que si git
  // sait que c'en est un (mesuré : `check-ignore node_modules` sort en 1 tant que le dossier n'existe pas).
  assert.equal(gitIgnore(dir, 'node_modules/'), true, 'et la règle de l\'utilisateur tient toujours');
  const apresUn = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
  assert.ok(apresUn.startsWith('node_modules/\n'), 'son fichier n\'est jamais réécrit, seulement complété');

  // Rejouer : `analyserGitignore` ne propose que ce qui n'est pas déjà obtenu → aucun doublon.
  scaffolderAdopte(dir);
  assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), apresUn, 'un 2ᵉ run ne doit rien ajouter');
  assert.equal(apresUn.split(ENTETE_BLOC).length - 1, 1, 'un seul bloc du kit, jamais deux');
});

test('adoption — sans .gitignore du tout, on en crée un', () => {
  // Le 2ᵉ test de l'étape 8.1. Depuis la tâche 2, la copie stack-keyée est coupée sur `aucune` :
  // un projet sans `.gitignore` n'en recevait AUCUN, donc zéro protection de `.env`.
  const dir = projet('adopt-nogi-');
  ecrire(dir, 'package.json', '{"name":"deja-la"}');
  gitInit(dir);
  assert.ok(!fs.existsSync(path.join(dir, '.gitignore')), 'postulat : aucun .gitignore');

  scaffolderAdopte(dir);
  assert.ok(fs.existsSync(path.join(dir, '.gitignore')), 'un .gitignore DOIT être créé');
  assert.equal(gitIgnore(dir, '.env'), true);
  assert.equal(gitIgnore(dir, '.env.example'), false);
});

test('adoption — un `!.env` volontaire n\'est pas renversé sans accord, et le rapport le NOMME', () => {
  // L'append gagne toujours (dernière règle qui matche). C'est précisément pour ça qu'il ne peut
  // pas être silencieux : hors terminal, personne ne peut dire oui, donc on ne renverse pas.
  const dir = projet('adopt-neg-');
  ecrire(dir, 'package.json', '{"name":"deja-la"}');
  ecrire(dir, '.gitignore', 'node_modules/\n!.env\n');
  gitInit(dir);

  const sortie = String(scaffolderAdopte(dir));
  assert.equal(gitIgnore(dir, '.env'), false, 'son intention tient : le kit ne la renverse pas dans son dos');
  assert.equal(gitIgnore(dir, '.env.local'), true, 'mais ce qui ne renverse rien protège quand même');
  assert.match(sortie, /!\.env/, 'la ligne battue doit être NOMMÉE dans la sortie — pas tue');
  assert.match(sortie, /Sauté|accord/i, 'et rangée là où le rapport dit ce qu\'il n\'a pas fait');
});

test('parcours NEUF — le `.gitignore` de la stack est toujours copié tel quel, sans bloc ajouté', () => {
  // Le garde qui tient l'autre moitié : tout ce qui précède ne doit rien changer au parcours neuf.
  const dir = path.join(projet('neuf-gi-'), 'mon-app');
  execFileSync(process.execPath, [
    path.resolve('scripts/setup.mjs'), '--stack', 'saas', '--assistant', 'claude-code',
    '--project', dir, '--no-skills', '--yes', '--backend', 'local',
  ], { stdio: 'pipe' });
  const gi = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
  assert.equal(gi, fs.readFileSync(path.resolve('templates/gitignore/saas.gitignore'), 'utf8'), 'le modèle de la stack, à l\'octet près');
  assert.ok(!gi.includes(ENTETE_BLOC), 'aucun bloc d\'adoption sur un projet neuf');
  assert.equal(gitIgnore(dir, '.env'), true, '…et il protège déjà .env, c\'est pour ça qu\'il n\'y a rien à ajouter');
});

// ── LA REVUE : trois défauts trouvés APRÈS le premier commit ───────────────────────────────────

test('gitignore — l\'écran n\'annonce JAMAIS une règle qu\'il ne va pas écrire', () => {
  // ⛔ Mesuré hors terminal sur un projet `!.env` : l'écran disait « J'ajoute à la FIN : .env, … »
  // et « « .env » … gagnera » — et `.env` n'était PAS écrit. Le démenti arrivait 50 lignes plus
  // bas, dans « Sauté ». L'écran et l'écriture étaient deux calculs qui ne se parlaient pas.
  const plan = { existe: true, ...analyserGitignore('node_modules/\n!.env\n', reglesAdoption('claude-code')) };

  const muet = renderAccordGitignore(plan, hint, false, { decide: false });
  const annonce = muet.split('\n').find((l) => l.includes('J\'ajoute'));
  // `partagerGitignore` est la fonction PURE que l'écran et l'écriture lisent tous les deux :
  // c'est elle qu'on interroge ici, pas une copie du raisonnement.
  const { ecrites, refusees } = partagerGitignore(plan, undefined);
  assert.ok(!annonce.includes('.env,'), `l'écran annonce « .env » alors qu'il ne l'écrira pas : ${annonce}`);
  for (const r of ecrites) assert.ok(annonce.includes(r), `« ${r} » sera écrit mais n'est pas annoncé`);
  for (const r of refusees) assert.match(muet, new RegExp(`Je n'écris PAS.*${r.replace('.', '\\.')}`), `« ${r} » n'est pas écrit, l'écran doit le DIRE`);
  assert.match(muet, /!\.env/, 'et nommer la ligne qui l\'en empêche');

  // Avec quelqu'un en face, l'écran annonce TOUT : la question qui suit décide, l'avertissement
  // dit ce que le « oui » coûtera. C'est le discriminant — sans lui, on pourrait taire les battues
  // dans les DEUX modes et ce test resterait vert.
  const decide = renderAccordGitignore(plan, hint, false, { decide: true });
  assert.match(decide.split('\n').find((l) => l.includes('J\'ajoute')), /\.env,/, 'en mode question, tout est annoncé');
  assert.match(decide, /gagnera/, 'et l\'avertissement dit ce que le oui coûtera');
});

test('gitignore — bout en bout : ce que la sortie ANNONCE est exactement ce que le fichier reçoit', () => {
  // Le garde qui ferme la classe entière : on relit la liste imprimée par le CLI et on la compare
  // aux lignes réellement ajoutées au fichier. Aucun texte ne peut plus promettre à côté.
  const dir = projet('adopt-annonce-');
  ecrire(dir, 'package.json', '{"name":"x"}');
  ecrire(dir, '.gitignore', 'node_modules/\n!.env\n');
  gitInit(dir);
  const sortie = String(scaffolderAdopte(dir));
  const annonce = sortie.split('\n').find((l) => l.includes('J\'ajoute'));
  assert.ok(annonce, `aucune ligne « J'ajoute » dans la sortie :\n${sortie.slice(0, 800)}`);
  const annoncees = annonce.split(':').slice(1).join(':').split(',').map((x) => x.trim());
  const bloc = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').split(ENTETE_BLOC)[1];
  const ecrites = bloc.split('\n').map((l) => l.trim()).filter(Boolean);
  assert.deepEqual(ecrites, annoncees, 'la liste annoncée et le bloc écrit doivent être le MÊME ensemble, dans le même ordre');
  assert.ok(!ecrites.includes('.env'), '`.env` n\'est pas écrit ici — donc il ne doit pas être annoncé');
});

test('gitignore — `.env.*` n\'est pas jugé couvert sur un seul représentant', () => {
  // ⛔ Mesuré : `.gitignore = ".env\n.env.local\n"` → `.env.*` était compté COUVERT (le seul
  // représentant testé, `.env.local`, l'était), donc jamais écrit — et `.env.production` comme
  // `.env.staging` restaient SUIVIS. Le module promettait « une règle de trop, jamais une
  // d'oubliée » : c'était faux, et faux du côté qui laisse fuir.
  const dir = projet('gi-famille-');
  ecrire(dir, '.gitignore', '.env\n.env.local\n');
  const { ecrites } = appliquerGitignore(planGitignore(dir, 'claude-code'), {});
  assert.ok(ecrites.includes('.env.*'), '`.env.*` doit être écrit : la famille n\'est pas couverte');
  gitInit(dir);
  for (const f of ['.env', '.env.local', '.env.production', '.env.staging']) {
    assert.equal(gitIgnore(dir, f), true, `${f} doit être ignoré`);
  }
  assert.equal(gitIgnore(dir, '.env.example'), false, 'et le modèle reste commitable');

  // ── LE DISCRIMINANT : un `.env*` large couvre bien TOUTE la famille, et on n'ajoute rien.
  const large = analyserGitignore('.env*\n.agents/\nskills-lock.json\n', reglesAdoption('claude-code'));
  assert.ok(!large.aAjouter.includes('.env.*'), '`.env*` couvre la famille entière : ne rien réécrire');
  assert.ok(!large.aAjouter.includes('.env'), '…ni `.env`');
});
