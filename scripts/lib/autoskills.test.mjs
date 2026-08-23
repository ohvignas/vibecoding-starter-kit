// scripts/lib/autoskills.test.mjs — TÂCHE 9. `autoskills` (midudev, CC BY-NC 4.0) est un outil
// TIERS que le kit propose et n'embarque jamais. Trois choses doivent tenir, et chacune a ici son
// garde avec la mutation qui le fait rougir écrite au-dessus :
//   1. la question est MASQUÉE sous Cursor et Codex — leur dossier n'est pas dans l'AGENT_FOLDER_MAP
//      d'autoskills, aucun lien n'y serait créé ;
//   2. les 4 skills design du kit SURVIVENT au run — `installer.ts` fait un `rmSync` récursif sur
//      `.claude/skills/<nom>` et `frontend-design` est dans les deux registres ;
//   3. le `--dry-run` passe D'ABORD, et un dry-run qui échoue n'installe rien.
//
// ⛔ AUCUN APPEL RÉSEAU, ET AUCUNE INSTALLATION D'AUTOSKILLS. Ce qu'on teste est que le kit le
// PROPOSE et l'ENCADRE correctement, pas l'outil lui-même. Le run est donc toujours un faux
// `run` — et ce faux run SIMULE le vrai destructeur (`rmSync` récursif puis écriture de sa propre
// version), sinon le garde 2 mesurerait un monde où la collision n'existe pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AUTOSKILLS, AGENTS_AUTOSKILLS, ETAPES_AUTOSKILLS, DOSSIER_ABRI,
  supporteAutoskills, renderProposeAutoskills, cheminsSkill,
  ecarterSkillsDesign, restaurerSkillsDesign, lancerAutoskills,
} from './autoskills.mjs';
import { runAdoptWizard } from './adoption.mjs';
import { DESIGN_SKILL_NAMES } from './matrix.mjs';
import { reglesAdoption, REGLES_ARTEFACTS } from './gitignore-adoption.mjs';

const NULL_OUT = { write() {} };
const capture = () => { const lignes = []; return { out: { write: (s) => lignes.push(s) }, texte: () => lignes.join('') }; };
const scripted = (reponses) => { let i = 0; return async () => reponses[i++]; };
// ⛔ Le préfixe ne contient PAS le mot « autoskills » : le chemin du projet part dans le rapport,
// et le garde « le parcours neuf ne le cite jamais » se mordrait la queue (mesuré : il rougissait
// sur son propre dossier temporaire).
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

// ── LE FAUX AUTOSKILLS ────────────────────────────────────────────────────────────────────────
// Il fait CE QUE FAIT LE VRAI, mesuré dans `installer.ts` : `rmSync(<dossier>/<nom>, {recursive:
// true, force: true})` puis pose SA version. Un faux run qui se contenterait de ne rien faire
// laisserait le garde 2 vert même sans une ligne de protection.
const MARQUE_TIERS = 'CONTENU-AUTOSKILLS-REGISTRE';
const fauxAutoskills = (projectDir, poses, journal = []) => (cmd, args, opts) => {
  journal.push({ cmd, args, cwd: opts?.cwd });
  if (args.includes('--dry-run')) return; // le dry-run annonce, il n'écrit rien : c'est sa raison d'être
  for (const nom of poses) {
    for (const cible of cheminsSkill(projectDir, nom)) {
      fs.rmSync(cible, { recursive: true, force: true });
      fs.mkdirSync(cible, { recursive: true });
      fs.writeFileSync(path.join(cible, 'SKILL.md'), MARQUE_TIERS);
    }
  }
};

// Un projet où le kit a DÉJÀ posé ses skills, comme `npx skills add` les pose : le contenu dans
// `.agents/skills/<nom>`, et un LIEN vers lui dans le dossier natif de l'assistant. Le lien est le
// cas ordinaire, et c'est celui qu'une protection naïve casse (elle copierait la cible et
// rendrait un vrai dossier). Un seul skill est lié — les autres sont des dossiers pleins, pour
// que le garde couvre les deux formes.
function projetAvecSkillsDuKit() {
  const dir = tmp('t9-skills-');
  fs.mkdirSync(path.join(dir, '.agents/skills'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/skills'), { recursive: true });
  for (const nom of DESIGN_SKILL_NAMES) {
    fs.mkdirSync(path.join(dir, '.agents/skills', nom), { recursive: true });
    fs.writeFileSync(path.join(dir, '.agents/skills', nom, 'SKILL.md'), `KIT:${nom}`);
    if (nom === 'frontend-design') fs.symlinkSync(path.join('..', '..', '.agents', 'skills', nom), path.join(dir, '.claude/skills', nom));
    else {
      fs.mkdirSync(path.join(dir, '.claude/skills', nom), { recursive: true });
      fs.writeFileSync(path.join(dir, '.claude/skills', nom, 'SKILL.md'), `KIT:${nom}`);
    }
  }
  // Un skill qui n'est PAS du design et que le projet a déjà : c'est lui qui rend le discriminant
  // du garde 2 réel. Sans lui, « protéger TOUT ce qui est sur disque » resterait indétectable.
  fs.mkdirSync(path.join(dir, '.claude/skills/astro-dev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude/skills/astro-dev/SKILL.md'), 'DEJA-LA');
  fs.mkdirSync(path.join(dir, '.agents/skills/astro-dev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents/skills/astro-dev/SKILL.md'), 'DEJA-LA');
  return dir;
}

// ── GARDE 1 — LA QUESTION EST MASQUÉE SOUS CURSOR ET CODEX ────────────────────────────────────

test('T9 — la question autoskills est masquée sous Cursor et Codex, posée sous Claude Code', async () => {
  // ⛔ CE QUE MESURE CE GARDE. `skills-map.ts:1390` — `AGENT_FOLDER_MAP` liste `.claude`, `.cline`,
  // `.junie`, `.codebuddy`, `.continue`, `.kiro`. Sous Cursor, `agentFolderFor()` rend `null` :
  // aucun lien n'est créé, les skills tombent dans `.agents/skills/` et Cursor ne les voit jamais.
  // MUTATION QUI LE FAIT ROUGIR : retirer `supporteAutoskills(assistant) &&` du wizard. Les deux
  // premiers cas jettent alors (`undefined.trim()` : le script n'a pas de réponse de plus).
  assert.equal(supporteAutoskills('claude-code'), true, 'claude est dans l\'AGENT_FOLDER_MAP');
  assert.equal(supporteAutoskills('cursor'), false, '⛔ .cursor n\'y est PAS — aucun lien créé');
  assert.equal(supporteAutoskills('codex'), false, '⛔ .codex non plus');

  for (const assistant of ['cursor', 'codex']) {
    const { out, texte } = capture();
    // `assistant` fourni ⇒ la question 1/2 est sautée ; il ne reste que le consentement. Une
    // question de plus consommerait un `undefined` et jetterait — c'est ce qui rend l'assertion honnête.
    const r = await runAdoptWizard(scripted(['o']), false, out, { projectDir: '/tmp/x', entrees: ['package.json'], assistant });
    assert.deepEqual(r, { assistant }, `${assistant} : la clé autoskills ne doit même pas exister`);
    assert.ok(!texte().toLowerCase().includes(AUTOSKILLS.commande), `${assistant} : l'écran ne doit pas parler d'un outil qui ne branchera rien`);
  }

  const { out, texte } = capture();
  const r = await runAdoptWizard(scripted(['o', 'n']), false, out, { projectDir: '/tmp/x', entrees: ['package.json'], assistant: 'claude-code' });
  assert.deepEqual(r, { assistant: 'claude-code', autoskills: false }, 'sous Claude Code, la question est posée et sa réponse remonte');
  assert.ok(texte().includes(AUTOSKILLS.commande), 'et l\'écran la précède');
});

test('T9 — la table des assistants supportés est celle d\'autoskills, pas une liste blanche recopiée', () => {
  // MUTATION QUI LE FAIT ROUGIR : ajouter `cursor` à AGENTS_AUTOSKILLS « pour que ça marche » —
  // la 2ᵉ assertion tombe, et le garde nomme le fichier tiers qu'il faudrait avoir remesuré.
  assert.deepEqual(AGENTS_AUTOSKILLS, ['claude', 'cline', 'junie', 'codebuddy', 'continue', 'kiro'],
    'AGENT_FOLDER_MAP (skills-map.ts:1390) — si cette liste change, c\'est qu\'autoskills a changé : remesure-le');
  assert.ok(!AGENTS_AUTOSKILLS.includes('cursor'));
  assert.ok(!AGENTS_AUTOSKILLS.includes('codex'));
});

test('T9 — `--no-skills` : le kit ne pose pas une question qu\'il n\'honorera pas', async () => {
  // La question débouche sur une installation de skills. Sous `--no-skills`, aucune installation
  // n'a lieu : poser la question quand même serait promettre un scan qui ne partira jamais.
  // MUTATION QUI LE FAIT ROUGIR : retirer `skills &&` du wizard → `undefined.trim()` jette.
  const r = await runAdoptWizard(scripted(['o']), false, NULL_OUT, {
    projectDir: '/tmp/x', entrees: ['package.json'], assistant: 'claude-code', skills: false,
  });
  assert.deepEqual(r, { assistant: 'claude-code' });
});

test('T9 — l\'écran NOMME l\'outil, son auteur et sa licence, et dit que ces skills ne sont pas relus', () => {
  // ⛔ Le kit est MIT, autoskills est CC BY-NC 4.0 : c'est la raison pour laquelle il n'est jamais
  // embarqué, et une raison que l'utilisateur a le droit de lire avant de dire oui.
  // MUTATION QUI LE FAIT ROUGIR : raccourcir l'écran à « je scanne ta stack ? [o/N] ».
  const t = renderProposeAutoskills(false);
  assert.match(t, /autoskills/, 'l\'outil');
  assert.match(t, /midudev/, 'son auteur');
  assert.match(t, /CC BY-NC 4\.0/, 'sa licence — le kit est MIT et ne l\'embarque pas');
  assert.match(t, /pas été relus/i, 'ces skills ne viennent pas du kit');
  assert.match(t, /--dry-run/, 'et le dry-run est annoncé AVANT, pas découvert après');
  assert.match(t, /skills-lock\.json/, 'le lock devient à provenance mixte : on le dit');
  for (const nom of DESIGN_SKILL_NAMES) assert.ok(t.includes(nom), `le skill protégé « ${nom} » doit être nommé`);
});

// ── GARDE 2 — LES 4 SKILLS DESIGN DU KIT SURVIVENT AU RUN ─────────────────────────────────────

test('T9 — les 4 skills design du kit survivent à un run autoskills', () => {
  // ⛔ LA COLLISION, PROUVÉE. `frontend-design` est dans le registre autoskills ET dans
  // `DESIGN_SKILL_NAMES`. « Proposer APRÈS l'installation » ne l'empêche pas : ça le GARANTIT —
  // le skill du kit est sur disque en premier, donc c'est lui que le `rmSync` emporte.
  // MUTATION QUI LE FAIT ROUGIR : retirer l'appel à `ecarterSkillsDesign`/`restaurerSkillsDesign`
  // dans `lancerAutoskills` → les 4 fichiers portent `CONTENU-AUTOSKILLS-REGISTRE`.
  const dir = projetAvecSkillsDuKit();
  const journal = [];
  const r = lancerAutoskills({
    projectDir: dir, assistant: 'claude-code',
    run: fauxAutoskills(dir, [...DESIGN_SKILL_NAMES, 'astro-dev'], journal),
  });
  assert.equal(r.lance, true, `le run doit aboutir : ${r.echec}`);
  assert.deepEqual(r.perdus, [], 'aucun skill du kit ne doit rester coincé à l\'abri');

  for (const nom of DESIGN_SKILL_NAMES) {
    for (const chemin of cheminsSkill(dir, nom)) {
      const skill = fs.readFileSync(path.join(chemin, 'SKILL.md'), 'utf8');
      assert.equal(skill, `KIT:${nom}`, `⛔ ${chemin} : le skill du kit a été remplacé par celui d'autoskills`);
    }
  }
  // Le LIEN reste un lien : une protection qui copierait la cible rendrait un vrai dossier, et le
  // magasin `.agents/skills/` cesserait d'être la source unique du contenu.
  assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/frontend-design')).isSymbolicLink(), 'le skill lié doit revenir LIÉ');

  // ── LE DISCRIMINANT : on protège les 4, et EUX SEULS. `astro-dev` était déjà sur disque et
  // autoskills vient de le remplacer : sa version doit RESTER. Sans cette assertion, une
  // « protection » qui écarterait tout ce qu'elle trouve — donc qui saboterait le scan que
  // l'utilisateur vient d'accepter — passerait pour correcte.
  // MUTATION QUI LA FAIT ROUGIR : `ecarterSkillsDesign(projectDir, [...DESIGN_SKILL_NAMES, 'astro-dev'])`.
  assert.equal(fs.readFileSync(path.join(dir, '.claude/skills/astro-dev/SKILL.md'), 'utf8'), MARQUE_TIERS,
    'le travail d\'autoskills hors collision doit survivre — sinon le scan ne sert à rien');
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)), 'l\'abri ne doit pas rester dans le dépôt de l\'utilisateur');
  assert.deepEqual([...r.proteges].sort(), [...DESIGN_SKILL_NAMES].sort());
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un skill du kit ABSENT du disque n\'invente pas d\'abri, et le reste est protégé quand même', () => {
  // Cas réel : `npx skills add` a échoué sur un des trois dépôts (réseau), il manque un skill.
  // MUTATION QUI LE FAIT ROUGIR : `ecarterSkillsDesign` qui ne teste pas l'existence → `renameSync`
  // jette sur le chemin absent et le run entier tombe, protection comprise.
  const dir = projetAvecSkillsDuKit();
  fs.rmSync(path.join(dir, '.claude/skills/ui-ux-pro-max'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, '.agents/skills/ui-ux-pro-max'), { recursive: true, force: true });
  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, DESIGN_SKILL_NAMES) });
  assert.equal(r.lance, true, `le run doit aboutir : ${r.echec}`);
  assert.ok(!r.proteges.includes('ui-ux-pro-max'), 'on ne protège pas ce qu\'on n\'a pas');
  assert.equal(fs.readFileSync(path.join(dir, '.claude/skills/brand-guidelines/SKILL.md'), 'utf8'), 'KIT:brand-guidelines',
    'le skill absent ne doit pas emporter la protection des autres');
  // Celui qui manquait est installé par autoskills, et il RESTE — le kit n'avait rien à défendre là.
  assert.equal(fs.readFileSync(path.join(dir, '.claude/skills/ui-ux-pro-max/SKILL.md'), 'utf8'), MARQUE_TIERS);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un skill du kit dont le LIEN est CASSÉ est protégé quand même', () => {
  // ⛔ CAS RÉEL, pas théorique. `.agents/` est ignoré par le `.gitignore` de la tâche 8 : un
  // collègue qui clone le dépôt hérite donc d'un `.claude/skills/<nom>` qui pointe dans le vide.
  // `existsSync` rend `false` sur un lien cassé — le kit croirait n'avoir rien à protéger, et
  // laisserait autoskills remplacer SON lien par un dossier à lui.
  // MUTATION QUI LE FAIT ROUGIR : `const existe = (p) => fs.existsSync(p)` dans autoskills.mjs.
  const dir = tmp('t9-lien-casse-');
  fs.mkdirSync(path.join(dir, '.claude/skills'), { recursive: true });
  fs.symlinkSync(path.join('..', '..', '.agents', 'skills', 'frontend-design'), path.join(dir, '.claude/skills/frontend-design'));
  assert.equal(fs.existsSync(path.join(dir, '.claude/skills/frontend-design')), false, 'montage : le lien doit bien etre casse');

  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, ['frontend-design']) });
  assert.equal(r.lance, true, `le run doit aboutir : ${r.echec}`);
  assert.deepEqual(r.proteges, ['frontend-design'], 'un lien casse reste un fichier du kit : il compte comme protege');
  assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/frontend-design')).isSymbolicLink(), 'le lien du kit a ete remplace par le dossier d autoskills');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — écarter puis restaurer rend le disque à l\'octet, y compris pour un lien', () => {
  // Les deux moitiés de la protection, mesurées seules : entre les deux, les chemins du kit
  // n'existent PLUS (c'est ce qui met les 4 skills hors de portée du `rmSync` d'autoskills).
  // MUTATION QUI LE FAIT ROUGIR : `ecarterSkillsDesign` qui COPIE au lieu de déplacer — les
  // chemins existent encore pendant le run, et la 2ᵉ assertion tombe.
  const dir = projetAvecSkillsDuKit();
  const abri = ecarterSkillsDesign(dir);
  assert.equal(abri.ecartes.length, DESIGN_SKILL_NAMES.length * 2, 'les DEUX chemins de chaque skill : le lien natif ET le magasin `.agents/`');
  for (const nom of DESIGN_SKILL_NAMES) {
    for (const chemin of cheminsSkill(dir, nom)) {
      assert.ok(!fs.existsSync(chemin), `${chemin} doit être HORS de portée pendant le run`);
    }
  }
  const { remis, perdus } = restaurerSkillsDesign(abri);
  assert.deepEqual(perdus, []);
  assert.equal(remis.length, DESIGN_SKILL_NAMES.length * 2);
  for (const nom of DESIGN_SKILL_NAMES) {
    assert.equal(fs.readFileSync(path.join(dir, '.agents/skills', nom, 'SKILL.md'), 'utf8'), `KIT:${nom}`);
  }
  assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/frontend-design')).isSymbolicLink());
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)));
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── GARDE 3 — LE DRY-RUN D'ABORD, TOUJOURS ────────────────────────────────────────────────────

test('T9 — `--dry-run` passe D\'ABORD, et le vrai run ensuite, dans le dossier du projet', () => {
  // MUTATION QUI LE FAIT ROUGIR : inverser les deux entrées d'`ETAPES_AUTOSKILLS`, ou retirer
  // `--dry-run` de la première.
  const dir = projetAvecSkillsDuKit();
  const journal = [];
  lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, ['frontend-design'], journal) });
  assert.equal(journal.length, 2, `deux passes attendues, vu : ${JSON.stringify(journal)}`);
  assert.ok(journal[0].args.includes('--dry-run'), '⛔ la PREMIÈRE passe annonce sans écrire');
  assert.ok(!journal[1].args.includes('--dry-run'), 'et la seconde installe');
  for (const appel of journal) {
    assert.equal(appel.cmd, 'npx', 'on compose une commande npx : rien du code tiers n\'est embarqué');
    assert.ok(appel.args.includes(AUTOSKILLS.commande));
    assert.equal(appel.cwd, dir, 'sans cwd, autoskills installerait dans le dossier d\'où `npx create-…` a été lancé');
  }
  assert.equal(ETAPES_AUTOSKILLS.length, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un dry-run qui échoue n\'installe RIEN, et rend ses skills au kit', () => {
  // MUTATION QUI LE FAIT ROUGIR : `try { run(dry) } catch {}` puis run réel — la 2ᵉ assertion voit
  // deux appels. Sans la restauration hors du chemin heureux, la 4ᵉ voit le contenu tiers.
  const dir = projetAvecSkillsDuKit();
  const journal = [];
  const r = lancerAutoskills({
    projectDir: dir, assistant: 'claude-code',
    run: (cmd, args) => { journal.push(args); throw new Error('Command failed: npx autoskills --dry-run'); },
  });
  assert.equal(r.lance, false);
  assert.equal(journal.length, 1, 'la vraie passe ne doit JAMAIS suivre un dry-run en échec');
  assert.deepEqual(r.etapes, [], 'aucune étape menée à terme');
  assert.match(r.echec, /dry-run/);
  for (const nom of DESIGN_SKILL_NAMES) {
    assert.equal(fs.readFileSync(path.join(dir, '.agents/skills', nom, 'SKILL.md'), 'utf8'), `KIT:${nom}`, 'un échec ne doit pas laisser les skills du kit à l\'abri');
  }
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — sous un assistant non supporté, RIEN n\'est lancé et rien n\'est déplacé', () => {
  // MUTATION QUI LE FAIT ROUGIR : retirer la garde `supporteAutoskills` de `lancerAutoskills`.
  // C'est la ceinture de la question masquée : même appelé par erreur, le run ne part pas.
  const dir = projetAvecSkillsDuKit();
  for (const assistant of ['cursor', 'codex']) {
    const r = lancerAutoskills({ projectDir: dir, assistant, run: () => { throw new Error('run appelé sous ' + assistant); } });
    assert.equal(r.lance, false);
    assert.match(r.echec, /AGENT_FOLDER_MAP/, 'et la raison nomme le fait mesuré, pas « non supporté »');
  }
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)));
  assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/frontend-design')).isSymbolicLink(), 'rien n\'a bougé');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── LA SECONDE COLLISION : `skills-lock.json`, LE MÊME FICHIER QUE CELUI DU KIT ───────────────

test('T9 — `.agents/` et `skills-lock.json` sont ignorés par le `.gitignore` d\'un projet adopté', () => {
  // `updateSkillsLock` (installer.ts) écrit `skills-lock.json` — le MÊME fichier que le kit produit
  // via `npx skills add`. Le lock devient à provenance mixte. La tâche 8 les a mis dans le
  // `.gitignore` complété ; ce garde le VÉRIFIE au lieu de le supposer, parce que la tâche 9 est
  // celle qui les fait apparaître à coup sûr.
  // MUTATION QUI LE FAIT ROUGIR : retirer une entrée de `REGLES_ARTEFACTS`.
  assert.deepEqual(REGLES_ARTEFACTS, ['.agents/', 'skills-lock.json']);
  for (const a of ['cursor', 'claude-code', 'codex']) {
    for (const regle of REGLES_ARTEFACTS) assert.ok(reglesAdoption(a).includes(regle), `${a} : ${regle} doit être proposé`);
  }
  // Et sur un VRAI dépôt, complété par un vrai run : c'est `git check-ignore` qui tranche, pas nous.
  const dir = tmp('t9-gitignore-');
  execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main'], { stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  execFileSync(process.execPath, [path.resolve('scripts/setup.mjs'), '--stack', 'aucune', '--assistant', 'claude-code', '--project', dir, '--no-skills', '--yes'], { stdio: 'pipe' });
  for (const chemin of ['.agents/skills/x/SKILL.md', 'skills-lock.json']) {
    const ok = (() => { try { execFileSync('git', ['-C', dir, 'check-ignore', '-q', chemin], { stdio: 'pipe' }); return true; } catch { return false; } })();
    assert.ok(ok, `${chemin} doit être ignoré : autoskills l'écrit à chaque run`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── LE PARCOURS NEUF NE BOUGE PAS ─────────────────────────────────────────────────────────────

test('T9 — un projet NEUF ne voit jamais autoskills : ni à l\'écran, ni dans un fichier', () => {
  // ⛔ La tâche 9 n'ajoute rien au parcours des 4 stacks offertes : la question ne vit que dans
  // `runAdoptWizard`, que le parcours neuf n'atteint pas. Ce garde le mesure au lieu de l'affirmer.
  // MUTATION QUI LE FAIT ROUGIR : citer l'outil dans un template ou dans le rapport commun.
  const dir = path.join(tmp('t9-neuf-'), 'mon-app');
  const out = String(execFileSync(process.execPath, [
    path.resolve('scripts/setup.mjs'), '--stack', 'saas', '--assistant', 'claude-code',
    '--project', dir, '--no-skills', '--yes', '--backend', 'local',
  ], { stdio: 'pipe' }));
  assert.ok(!out.toLowerCase().includes(AUTOSKILLS.commande), `le rapport du parcours neuf parle d'autoskills :\n${out}`);
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)), 'aucun abri ne doit être posé hors d\'un run autoskills');
  const fichiers = execFileSync('git', ['-C', dir, 'ls-files'], { stdio: 'pipe', encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(fichiers.length > 0, 'montage : le scaffold neuf doit avoir produit un dépôt suivi');
  for (const f of fichiers) {
    const abs = path.join(dir, f);
    const txt = fs.readFileSync(abs, 'utf8');
    assert.ok(!txt.includes(AUTOSKILLS.commande), `${f} cite un outil tiers que le parcours neuf ne propose pas`);
  }
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
});
