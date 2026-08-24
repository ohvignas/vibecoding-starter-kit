// scripts/lib/autoskills.test.mjs — TÂCHE 9. `autoskills` (midudev, CC BY-NC 4.0) est un outil
// TIERS que le kit propose et n'embarque jamais. Trois choses doivent tenir, et chacune a ici son
// garde avec la mutation qui le fait rougir écrite au-dessus :
//   1. la question est MASQUÉE sous Cursor et Codex — leur dossier n'est pas dans l'AGENT_FOLDER_MAP
//      d'autoskills, aucun lien n'y serait créé ;
//   2. les 4 skills design du kit SURVIVENT au run — `installer.ts` fait un `rmSync` récursif sur
//      `.claude/skills/<nom>` et `frontend-design` est dans les deux registres ;
//   3. le `--dry-run` passe D'ABORD, et un dry-run qui échoue n'installe rien.
//   4. LA FENÊTRE D'INTERRUPTION. Pendant les deux passes `npx` — « 1-2 minutes de téléchargement »
//      selon ce module —, l'abri est le SEUL endroit où vivent ces 4 skills, et `wireSigint` est
//      déjà mort (`rl.close()` en `finally`, setup.mjs). Un Ctrl-C là est le cas ORDINAIRE : ce que
//      le run SUIVANT fait de l'abri qu'il trouve décide si les skills existent encore.
//   5. ET CE QUE LE RAPPORT EN DIT. Un ✅ « tes 4 skills design ont été remis en place » imprimé
//      au-dessus du ❌ « NON remis en place » est pire qu'un silence : il rassure exactement là où
//      il devait alerter.
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
  AUTOSKILLS, AGENTS_AUTOSKILLS, ETAPES_AUTOSKILLS, DOSSIER_ABRI, FICHIER_PLAN, FICHIER_IGNORE,
  supporteAutoskills, renderProposeAutoskills, cheminsSkill, contenuAbri,
  ecarterSkillsDesign, restaurerSkillsDesign, lancerAutoskills, rapportAutoskills,
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

// ── GARDE 4 — LA FENÊTRE D'INTERRUPTION : UN ABRI TROUVÉ NE DISPARAÎT JAMAIS ──────────────────
//
// ⛔ CE QUE CES GARDES FERMENT, ET CE QUI L'AVAIT OUVERT. La version d'avant ouvrait `ecarter…`
// par un `fs.rmSync(abri)` commenté « reste d'un run interrompu : jamais réutilisé ». Or après une
// interruption, l'abri est le SEUL exemplaire des 4 skills : ce `rmSync` était la perte définitive.
// Et quand la restauration avait échoué, le rapport disait « ils sont dans l'abri, déplace-les à la
// main » — puis le run suivant supprimait ce que le kit venait de désigner.
//
// L'état de départ n'est pas fabriqué à la main : c'est `ecarterSkillsDesign` LUI-MÊME qui le
// produit, et s'arrêter là est exactement ce que fait un Ctrl-C pendant les deux passes `npx`.
const runInterrompu = (dir) => ecarterSkillsDesign(dir);
const laBas = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

test('T9 — un run interrompu laisse ses skills à l\'abri : le suivant les REPREND, il ne les efface pas', () => {
  // MUTATION QUI LE FAIT ROUGIR : remettre `fs.rmSync(abri, { recursive: true, force: true })` en
  // tête d'`ecarterSkillsDesign` → les 4 skills n'existent plus nulle part, et la boucle de contenu
  // lit `CONTENU-AUTOSKILLS-REGISTRE` (ce qu'autoskills a posé à leur place) au lieu de `KIT:<nom>`.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir);
  // Montage : après l'interruption, plus RIEN à sa place. C'est ce qui rend l'abri irremplaçable.
  for (const nom of DESIGN_SKILL_NAMES) for (const c of cheminsSkill(dir, nom)) assert.ok(!laBas(c), `montage : ${c} doit être vide après l'interruption`);
  assert.equal(contenuAbri(path.join(dir, DOSSIER_ABRI)).length, DESIGN_SKILL_NAMES.length * 2, 'montage : les 8 chemins sont à l\'abri');

  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, DESIGN_SKILL_NAMES) });
  assert.equal(r.lance, true, `le run doit aboutir : ${r.echec}`);
  assert.deepEqual([...r.repris].sort(), [...DESIGN_SKILL_NAMES].sort(), 'et le rapport doit NOMMER ce qu\'il a récupéré : l\'utilisateur les a vus disparaître');
  for (const nom of DESIGN_SKILL_NAMES) {
    for (const c of cheminsSkill(dir, nom)) {
      assert.equal(fs.readFileSync(path.join(c, 'SKILL.md'), 'utf8'), `KIT:${nom}`, `⛔ ${c} : le skill du kit a été perdu à la reprise`);
    }
  }
  assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/frontend-design')).isSymbolicLink(), 'le skill lié revient LIÉ, même par la reprise');
  assert.ok(!fs.existsSync(path.join(dir, DOSSIER_ABRI)), 'et l\'abri repris disparaît : il ne reste pas dans le dépôt de l\'utilisateur');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un abri qu\'on ne sait pas LIRE fait REFUSER le run, se nomme, et reste intact', () => {
  // Interruption pile avant la première écriture du plan, ou plan corrompu : on ne sait pas d'où
  // vient ce qui est là. ⛔ Ce qu'on ne comprend pas, on n'y touche pas — et on le DIT, parce que
  // c'est le seul endroit où les skills existent encore.
  // MUTATION QUI LE FAIT ROUGIR : le `rmSync` aveugle en tête d'`ecarterSkillsDesign` (l'abri est
  // vide → `contenuAbri` ne rend plus rien), ou retirer le `if (abri.refus) return` de
  // `lancerAutoskills` (le journal voit deux passes npx, et un second abri s'empile sur le premier).
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir);
  const abri = path.join(dir, DOSSIER_ABRI);
  fs.rmSync(path.join(abri, FICHIER_PLAN));
  const avant = contenuAbri(abri);
  assert.equal(avant.length, DESIGN_SKILL_NAMES.length * 2, 'montage');

  const journal = [];
  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, DESIGN_SKILL_NAMES, journal) });
  assert.equal(r.lance, false, 'on ne lance RIEN par-dessus un abri qu\'on ne comprend pas');
  assert.deepEqual(journal, [], 'pas une seule passe npx : elle écarterait une seconde fois des skills déjà absents');
  assert.ok(r.echec.includes(DOSSIER_ABRI), 'le refus NOMME le dossier — sinon l\'utilisateur ne sait pas où chercher');
  for (const e of avant) assert.ok(r.echec.includes(e), `le refus doit nommer ce qui reste : ${e}`);
  assert.deepEqual(contenuAbri(abri), avant, '⛔ l\'abri est INTACT : c\'est le seul exemplaire de ces skills');
  const uneEntree = avant.find((p) => p.endsWith('brand-guidelines'));
  assert.equal(fs.readFileSync(path.join(uneEntree, 'SKILL.md'), 'utf8'), 'KIT:brand-guidelines', 'et son contenu n\'a pas bougé d\'un octet');
  for (const nom of DESIGN_SKILL_NAMES) for (const c of cheminsSkill(dir, nom)) assert.ok(!laBas(c), `${c} : rien n'a été réécrit à leur place non plus`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — une reprise PARTIELLE ne fait pas détruire, au run d\'après, ce qu\'elle vient de remettre', () => {
  // ⛔ LE TROU DE LA REPRISE ELLE-MÊME, MESURÉ SUR DEUX RUNS CONSÉCUTIFS. `ecarterSkillsDesign`
  // réécrit son plan APRÈS chaque déplacement : une interruption entre le `rename` et l'écriture
  // laisse un abri dont le plan ne cite pas tout. La reprise remet alors ce qu'elle sait, REFUSE à
  // cause du reste — et laisse sur le disque un plan périmé qui nomme des entrées DÉJÀ rentrées.
  // Au run suivant, l'ordre « rmSync(origine) puis renameSync(abri) » supprimait le skill revenu
  // AVANT de découvrir qu'il n'avait plus rien à mettre à sa place : la perte définitive revenait
  // par la porte du correctif.
  // MUTATION QUI LE FAIT ROUGIR : retirer le `if (!existe(e.abri))` de `restaurerSkillsDesign`.
  const dir = projetAvecSkillsDuKit();
  const interrompu = runInterrompu(dir);
  const abri = path.join(dir, DOSSIER_ABRI);
  // L'interruption pile entre un déplacement et l'écriture du plan : 8 entrées à l'abri, 4 au plan.
  const partiel = interrompu.ecartes.slice(0, 4);
  fs.writeFileSync(path.join(abri, FICHIER_PLAN), `${JSON.stringify({ ecartes: partiel }, null, 2)}\n`);
  const jamais = () => { throw new Error('aucune passe npx ne doit partir ici'); };

  // Run A — il remet les 4 qu'il sait lire, et refuse à cause des 4 que son plan ne mentionne pas.
  const a = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: jamais });
  assert.equal(a.lance, false);
  assert.ok(a.echec.includes(DOSSIER_ABRI), `le refus doit être celui de l'abri, pas celui du run : ${a.echec}`);
  assert.deepEqual([...a.repris].sort(), [...new Set(partiel.map((e) => e.nom))].sort(), 'ce qu\'il a su remettre est nommé');
  for (const e of partiel) assert.ok(laBas(e.origine), `montage : ${e.origine} doit être revenu au run A`);

  // Run B — sans une seule manipulation à la main. Le plan est périmé : ses 4 entrées sont chez
  // elles, leurs chemins d'abri n'existent plus.
  const b = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: jamais });
  assert.equal(b.lance, false, 'le reste hors plan fait toujours refuser — c\'est le comportement voulu');
  for (const e of partiel) {
    assert.ok(laBas(e.origine), `⛔ ${e.origine} : le run suivant a DÉTRUIT ce que la reprise avait remis`);
    assert.equal(fs.readFileSync(path.join(e.origine, 'SKILL.md'), 'utf8'), `KIT:${e.nom}`, 'et son contenu est celui du kit, pas un dossier vide');
  }
  assert.deepEqual(b.repris, [], 'rien n\'a été « récupéré » au run B : tout ce que son plan cite était déjà chez soi');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ⛔ TROIS CLAUSES, TROIS GARDES — ET POURQUOI PAS UN SEUL. Le plan est un fichier du DISQUE qui
// pilote un `rmSync` récursif puis un `renameSync`. Un garde unique qui retire les trois clauses
// ensemble MASQUE le trou : mesuré, retirer `sous(abriReel, e.abri)` seul, ou la clause du jeu clos,
// laissait la suite VERTE. Chaque clause a donc ici sa victime à elle, et sa mutation à elle.
const forgerPlan = (abri, ecartes) => fs.writeFileSync(path.join(abri, FICHIER_PLAN), `${JSON.stringify({ ecartes }, null, 2)}\n`);
const refuse = (dir) => lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: () => { throw new Error('aucune passe npx ne doit partir ici') } });

test('T9 — clause 1 : un plan dont l\'`abri` est ailleurs ne fait pas DÉPLACER un dossier du disque dans le projet', () => {
  // MUTATION QUI LE FAIT ROUGIR : retirer `sous(abriReel, e.abri)` de `reprendreAbri`. `e.abri`
  // existe, `origine` est un chemin à nous : `rmSync` ne trouve rien, puis `renameSync` DÉPLACE le
  // dossier visé dans `.claude/skills/`. L'utilisateur perd ses photos de leur place, sans un mot.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir);
  const dehors = tmp('t9-tresor-');
  const tresor = path.join(dehors, 'photos');
  fs.mkdirSync(tresor, { recursive: true });
  fs.writeFileSync(path.join(tresor, 'vacances.txt'), 'DIX ANS DE PHOTOS');
  forgerPlan(path.join(dir, DOSSIER_ABRI), [{ nom: 'frontend-design', origine: cheminsSkill(dir, 'frontend-design')[0], abri: tresor }]);

  const r = refuse(dir);
  assert.equal(r.lance, false);
  assert.equal(fs.readFileSync(path.join(tresor, 'vacances.txt'), 'utf8'), 'DIX ANS DE PHOTOS', '⛔ un dossier du disque, cité comme « abri » par un plan, a été déplacé');
  assert.ok(!laBas(cheminsSkill(dir, 'frontend-design')[0]), 'et rien n\'a atterri dans le projet');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(dehors, { recursive: true, force: true });
});

test('T9 — clause 2 : un dossier du projet qui est un LIEN vers l\'extérieur ne fait pas effacer dehors', () => {
  // ⛔ LE VECTEUR QUE LE CONTRÔLE LEXICAL LAISSAIT PASSER. `<projet>/.claude/skills/frontend-design`
  // est un chemin À NOUS (clause 3 le laisse donc passer) et lexicalement DANS le projet — mais si
  // `.claude` est un LIEN vers une config partagée entre projets, il est réellement DEHORS. Le plan
  // est réinterprété au run SUIVANT, à travers un lien qui a pu changer entre-temps : ici
  // l'utilisateur met sa config en commun entre les deux runs, et le `rmSync` part chez lui.
  // MUTATION QUI LE FAIT ROUGIR : retirer `sous(projetReel, e.origine)` → `MA CONFIG PARTAGEE`
  // disparaît, remplacée par la copie de l'abri.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir); // le plan écrit ici nomme `<projet>/.claude/skills/<nom>`
  const dehors = tmp('t9-config-partagee-');
  fs.mkdirSync(path.join(dehors, 'skills', 'frontend-design'), { recursive: true });
  fs.writeFileSync(path.join(dehors, 'skills', 'frontend-design', 'SKILL.md'), 'MA CONFIG PARTAGEE');
  // Entre les deux runs : « je mets ma config Claude en commun ». `.claude` devient un lien.
  fs.rmSync(path.join(dir, '.claude'), { recursive: true, force: true });
  fs.symlinkSync(dehors, path.join(dir, '.claude'));
  assert.equal(fs.realpathSync(path.join(dir, '.claude')), fs.realpathSync(dehors), 'montage : `.claude` sort du projet');

  const r = refuse(dir);
  assert.equal(r.lance, false, 'un plan dont les chemins sortent réellement du projet ne se reprend pas');
  assert.equal(fs.readFileSync(path.join(dehors, 'skills', 'frontend-design', 'SKILL.md'), 'utf8'), 'MA CONFIG PARTAGEE',
    '⛔ le `rmSync` de la reprise est sorti du projet en traversant un dossier-lien');
  assert.equal(contenuAbri(path.join(dir, DOSSIER_ABRI)).length, DESIGN_SKILL_NAMES.length * 2, 'et l\'abri n\'a pas bougé');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(dehors, { recursive: true, force: true });
});

test('T9 — clause 3 : un plan qui nomme `src/` ne fait pas effacer le code de l\'utilisateur', () => {
  // « Dans le projet » ne suffit PAS : `<projet>/src` est dans le projet et n'a jamais été à nous.
  // L'ensemble des `origine` que ce module peut produire est CLOS — deux chemins par skill de
  // `DESIGN_SKILL_NAMES` — et c'est le seul jeu auquel un plan a le droit de faire obéir un `rmSync`.
  // MUTATION QUI LE FAIT ROUGIR : retirer `nosChemins.has(cheminReel(e.origine))` → `src/` part.
  const dir = projetAvecSkillsDuKit();
  const interrompu = runInterrompu(dir);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'LE CODE DE L\'UTILISATEUR');
  forgerPlan(path.join(dir, DOSSIER_ABRI), [{ ...interrompu.ecartes[0], origine: path.join(dir, 'src') }]);

  const r = refuse(dir);
  assert.equal(r.lance, false);
  assert.equal(fs.readFileSync(path.join(dir, 'src', 'index.ts'), 'utf8'), 'LE CODE DE L\'UTILISATEUR', '⛔ un plan a fait effacer un dossier du projet qui n\'était pas à nous');
  assert.equal(contenuAbri(path.join(dir, DOSSIER_ABRI)).length, DESIGN_SKILL_NAMES.length * 2, 'et l\'abri n\'a pas bougé');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — le même projet atteint par un chemin ALIAS se reprend quand même', () => {
  // Le sens inverse, et il compte autant : refuser à tort, c'est laisser les 4 skills à l'abri.
  // `/tmp/x` et `/private/tmp/x` sont le même dossier ; le plan porte l'un, le run reçoit l'autre.
  // MUTATION QUI LE FAIT ROUGIR : comparer les chemins BRUTS (retirer `cheminReel`/`realpathSync`
  // des deux côtés du `sous`) → le plan est jugé « hors projet » et la reprise refuse.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir);
  const alias = path.join(tmp('t9-alias-'), 'projet');
  fs.symlinkSync(dir, alias);
  const r = lancerAutoskills({ projectDir: alias, assistant: 'claude-code', run: fauxAutoskills(alias, DESIGN_SKILL_NAMES) });
  assert.equal(r.lance, true, `l'alias doit se reprendre comme le chemin réel : ${r.echec}`);
  assert.deepEqual([...r.repris].sort(), [...DESIGN_SKILL_NAMES].sort());
  for (const nom of DESIGN_SKILL_NAMES) assert.equal(fs.readFileSync(path.join(dir, '.agents/skills', nom, 'SKILL.md'), 'utf8'), `KIT:${nom}`);
  fs.rmSync(path.dirname(alias), { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

// ── GARDE 5 — LE RAPPORT NE DIT PAS L'INVERSE DE CE QUI EST SUR LE DISQUE ─────────────────────

// Une restauration qui ÉCHOUE. La cause importe peu (droits, disque plein, un chemin devenu autre
// chose) : ce qui est mesuré est ce que le rapport dit ALORS. Ici le dossier natif est remplacé par
// un FICHIER — `rmSync` sort en `ENOTDIR` (mesuré) et les 4 entrées `.claude/` restent coincées.
const fauxAutoskillsQuiCasseLaRemise = (dir, journal = []) => {
  const vrai = fauxAutoskills(dir, DESIGN_SKILL_NAMES, journal);
  return (cmd, args, opts) => {
    vrai(cmd, args, opts);
    if (args.includes('--dry-run')) return;
    fs.rmSync(path.join(dir, '.claude/skills'), { recursive: true, force: true });
    fs.writeFileSync(path.join(dir, '.claude/skills'), 'PLUS UN DOSSIER');
  };
};

test('T9 — le ✅ ne compte QUE ce qui est REVENU, et le ❌ dit quelle entrée d\'abri va où', () => {
  // ⛔ LA LIGNE QUI MENTAIT AU PIRE MOMENT. Le ✅ comptait `proteges` — les skills SORTIS — donc il
  // imprimait « tes 4 skills design du kit ont été remis en place » juste au-dessus de « ❌ skills
  // design NON remis en place : … », sur un `.claude/skills` vide.
  // MUTATIONS QUI LE FONT ROUGIR, une par assertion : `a.remis` → `a.proteges` dans
  // `rapportAutoskills` ; retirer le filtre de `repris` par `perdus` dans `lancerAutoskills` ;
  // `perdus.push(e.origine)` (au lieu de l'entrée entière) dans `restaurerSkillsDesign` ;
  // `a.perdus.map((e) => e.nom)` dans la ligne ❌.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir); // ce run-ci COMMENCE par une reprise : `repris` passe par le même filtre
  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskillsQuiCasseLaRemise(dir) });

  assert.equal(r.lance, true, 'les deux passes npx ont abouti : c\'est la REMISE qui a échoué');
  assert.deepEqual([...r.proteges].sort(), [...DESIGN_SKILL_NAMES].sort(), 'les 4 sont bien SORTIS');
  assert.equal(r.perdus.length, DESIGN_SKILL_NAMES.length, 'et leurs 4 chemins `.claude/` sont restés coincés à l\'abri');
  assert.deepEqual(r.remis, [], '⛔ AUCUN n\'est « remis » : chacun a encore un chemin à l\'abri');
  assert.deepEqual(r.repris, [], 'et « récupéré au démarrage » ne survit pas à « reperdu à l\'arrivée »');

  const rap = rapportAutoskills(r, dir);
  const vu = rap.done.join('\n');
  assert.match(vu, new RegExp(`${AUTOSKILLS.commande} \\(${AUTOSKILLS.auteur}`), 'la ligne ✅ nomme toujours l\'outil tiers et son auteur…');
  assert.doesNotMatch(vu, /ont été remis en place/, '⛔ …mais elle NE PROMET PAS une remise, au-dessus du ❌ qui dit l\'inverse');
  assert.doesNotMatch(vu, /récupérés d'un run interrompu/, '…ni « récupéré » pour un skill reperdu depuis');

  assert.equal(rap.failed.length, 1, 'et l\'échec, lui, est bien là — jamais un silence');
  for (const e of r.perdus) {
    // ACTIONNABLE : `<abri>/<i>/<nom> → <chemin d'origine>`. « ils sont dans l'abri » ne suffit pas :
    // `frontend-design` a DEUX entrées, et rien dans leur nom ne dit laquelle va où.
    assert.ok(rap.failed[0].includes(`${path.relative(dir, e.abri)} → ${path.relative(dir, e.origine)}`),
      `le ❌ doit dire où déplacer ${e.abri} :\n${rap.failed[0]}`);
    assert.ok(laBas(e.abri), '⛔ et le chemin cité doit VRAIMENT exister — sinon « déplace-le à la main » est une impasse');
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — sur un run qui va bien, le ✅ compte les 4 revenus et il n\'y a pas d\'❌', () => {
  // Le témoin de l'assertion ci-dessus : sans lui, un `rapportAutoskills` qui ne dirait JAMAIS
  // « remis en place » passerait pour correct.
  // MUTATION QUI LE FAIT ROUGIR : supprimer la moitié « ; tes N skills design… » de la ligne ✅.
  const dir = projetAvecSkillsDuKit();
  const r = lancerAutoskills({ projectDir: dir, assistant: 'claude-code', run: fauxAutoskills(dir, DESIGN_SKILL_NAMES) });
  const rap = rapportAutoskills(r, dir);
  assert.deepEqual(rap.failed, [], 'rien n\'est coincé');
  assert.match(rap.done.join('\n'), new RegExp(`tes ${DESIGN_SKILL_NAMES.length} skills design du kit ont été remis en place`));
  assert.deepEqual(rap.skipped, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un run non lancé part en « Sauté » et ne promet aucune remise', () => {
  // MUTATION QUI LE FAIT ROUGIR : ranger l'échec dans `done` — l'écran dirait « ✅ skills tiers »
  // pour un scan qui n'a jamais eu lieu.
  const rap = rapportAutoskills({ lance: false, etapes: [], proteges: [], remis: [], perdus: [], repris: [], echec: 'codex n\'est pas dans l\'AGENT_FOLDER_MAP d\'autoskills' }, '/tmp/x');
  assert.deepEqual(rap.done, []);
  assert.deepEqual(rap.failed, []);
  assert.equal(rap.skipped.length, 1);
  assert.match(rap.skipped[0].reason, /AGENT_FOLDER_MAP/, 'la raison est celle qu\'on a mesurée, et elle reste dans le rapport');
});

test('T9 — l\'abri ne sort JAMAIS dans le `git status` de l\'utilisateur', () => {
  // ⛔ IL ÉTAIT TRANSITOIRE, IL PERSISTE MAINTENANT — par conception, à chaque refus. Donc un
  // dossier du kit dans le dépôt de quelqu'un d'autre, prêt à partir dans son prochain
  // `git add -A`. Il porte son propre `.gitignore` à `*` : ça ne dépend pas de l'accord
  // `.gitignore` (que l'utilisateur a le droit de refuser) et ça n'ajoute pas une 6ᵉ ligne à
  // l'écran qui lui énumère ce qu'on écrit chez lui.
  // MUTATION QUI LE FAIT ROUGIR : retirer le `writeFileSync(path.join(abri, FICHIER_IGNORE), '*\n')`
  // d'`ecarterSkillsDesign` → `?? .vibecoding-autoskills-abri/` réapparaît.
  const dir = projetAvecSkillsDuKit();
  execFileSync('git', ['-C', dir, 'init', '-q', '-b', 'main'], { stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  runInterrompu(dir);
  assert.ok(fs.existsSync(path.join(dir, DOSSIER_ABRI)), 'montage : l\'abri est bien là');
  const vu = String(execFileSync('git', ['-C', dir, 'status', '--porcelain'], { stdio: 'pipe' }));
  assert.ok(!vu.includes(DOSSIER_ABRI), `⛔ le dossier de travail du kit part dans le dépôt de l'utilisateur :\n${vu}`);
  assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'node_modules/\n', 'et SON `.gitignore` n\'a pas été touché pour ça');
  assert.deepEqual(REGLES_ARTEFACTS, ['.agents/', 'skills-lock.json'], 'la table de la tâche 8 n\'a pas eu à bouger');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('T9 — un abri coincé sort en ❌ (donc en code non nul), pas en « Sauté » à 0', () => {
  // ⛔ LE REFUS PROTÈGE, MAIS IL LAISSE 4 SKILLS DU KIT HORS DE LEUR PLACE. Rangé en « Sauté », il
  // sortait en `exitCode` 0 : l'écran disait « tout va bien » sur un projet cassé. Et le titre du
  // bac ❌ — « relance le script » — est le seul conseil qui ne marche PAS ici : relancer refusera
  // encore, c'est le sens du refus. La ligne le dit donc elle-même.
  // MUTATIONS QUI LE FONT ROUGIR : ranger `abriEnAttente` dans `skipped` au lieu de `failed` ;
  // ne pas propager `restant`/`abriEnAttente` depuis `reprendreAbri`.
  const dir = projetAvecSkillsDuKit();
  runInterrompu(dir);
  fs.rmSync(path.join(dir, DOSSIER_ABRI, FICHIER_PLAN)); // plan absent → refus
  const r = refuse(dir);
  assert.equal(r.lance, false);
  assert.equal(r.abriEnAttente.length, DESIGN_SKILL_NAMES.length * 2, 'le refus RAPPORTE ce qui reste coincé, il ne le garde pas pour lui');

  const rap = rapportAutoskills(r, dir);
  assert.equal(rap.failed.length, 1, '⛔ 4 skills du kit hors de leur place : ❌ et exitCode 1, pas un « Sauté » à 0');
  for (const p of r.abriEnAttente) assert.ok(rap.failed[0].includes(path.relative(dir, p)), `le ❌ doit nommer ${p} :\n${rap.failed[0]}`);
  assert.ok(rap.failed[0].includes('.claude/skills/<nom>') && rap.failed[0].includes('.agents/skills/<nom>'), 'et les DEUX destinations, parce qu\'il y a une entrée pour chacune');
  assert.match(rap.failed[0], /NE relance PAS/, 'le conseil du bac ❌ ne marche pas ici — la ligne le corrige elle-même');
  assert.equal(rap.skipped.length, 1, 'le scan tiers, lui, est bien « sauté » : il n\'a pas eu lieu');
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
