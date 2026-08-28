// scripts/lib/docs.test.mjs — Lot H : la DOCUMENTATION (bannière, README, guides, glossaire,
// formateur). Ces fichiers sont les seuls que personne n'exécute : une affirmation périmée y
// survit indéfiniment, et c'est le premier texte que lit quelqu'un qui ne connaît pas le kit.
// Les sept lots précédents ont changé la réalité qu'ils décrivent (10 commandes, 4 stacks, le
// crew, Astro 7, `npm audit`…).
//
// PRINCIPE DE CES TESTS : ne JAMAIS figer un chiffre. Chacun le **recompte sur le dépôt**
// (`COMMANDS`, `STACKS`, `CREW`, `DESIGN_SKILL_NAMES`, `templates/journal/`, `resolveStackManifest`)
// et compare à ce que la doc annonce. « 10 commandes » doit échouer si une 11ᵉ apparaît, pas si
// quelqu'un écrit « dix ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMMANDS, fichiersDuRunbook } from './commands-list.mjs';
import { STACKS, PINS, AI_CONTEXT, DESIGN_SKILL_NAMES, AGENT_SKILL_SPECS, SUPERPOWERS, MCP_CONNECT, resolveAssets, resolveStackManifest } from './matrix.mjs';
import { CREW, kitOwnedFiles } from './kit-owned.mjs';
import { runWizard } from './wizard.mjs';
import { parseArgs } from './args.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETUP = path.join(ROOT, 'scripts', 'setup.mjs');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const STACK_KEYS = Object.keys(STACKS);
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

// Un projet réellement scaffoldé : la seule façon de savoir ce qu'un utilisateur reçoit
// vraiment (les tests de rendu, eux, ne prouvent que ce que la fonction retourne).
// Mémoïsé PAR ASSISTANT : les dossiers d'agents et de runbooks changent de nom selon
// l'assistant (`.claude/agents/` · `.cursor/agents/` · `docs/agents/crew/`), donc « ce chemin
// existe-t-il dans un projet ? » n'a de réponse qu'en les regardant tous les trois.
const PROJETS = new Map();
const scaffold = (assistant = 'claude-code') => {
  if (PROJETS.has(assistant)) return PROJETS.get(assistant);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-docs-'));
  const proj = path.join(dir, 'app');
  execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', assistant, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  PROJETS.set(assistant, proj);
  return proj;
};

// ─────────────────────────────────────────────────────────────────────────────
// H1 — la bannière (`.github/assets/hero.svg`). C'est du SVG : un chiffre s'y corrige à la
// main, donc sans garde il repart en vrille au premier ajout de commande ou de stack. Et une
// édition manuelle peut le rendre illisible sans que rien ne s'en aperçoive — d'où le contrôle
// de bonne formation ET de géométrie (une puce ajoutée hors du cadre est invisible).
// ─────────────────────────────────────────────────────────────────────────────

// Contrôle de bonne formation SANS dépendance : équilibre des balises, en ignorant commentaires,
// CDATA, prologues et balises auto-fermantes.
function svgTagBalance(src) {
  const sansCommentaires = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const pile = [];
  for (const m of sansCommentaires.matchAll(/<\s*(\/?)\s*([A-Za-z][\w:-]*)([^>]*?)(\/?)\s*>/g)) {
    const [, fermante, nom, attrs, auto] = m;
    if (attrs.startsWith('?') || nom.startsWith('?')) continue;
    if (auto === '/') continue;
    if (fermante === '/') {
      if (pile.pop() !== nom) return `</${nom}> ne ferme pas la balise ouverte`;
    } else pile.push(nom);
  }
  return pile.length ? `balises jamais fermées : ${pile.join(', ')}` : null;
}

test('H1 — la bannière annonce le nombre RÉEL de commandes (recompté sur COMMANDS)', () => {
  const svg = read('.github/assets/hero.svg');
  const m = /(\d+)\s+commandes/.exec(svg);
  assert.ok(m, 'la bannière doit annoncer un nombre de commandes');
  assert.equal(Number(m[1]), COMMANDS.length, `bannière : « ${m[0]} » alors que le kit en livre ${COMMANDS.length} (scripts/lib/commands-list.mjs)`);
});

test('H1bis — la bannière montre une puce par stack, dans le cadre et sans chevauchement', () => {
  const svg = read('.github/assets/hero.svg');
  // Une puce = un rect arrondi `rx="22"` suivi de son libellé. On les lit dans l'ordre du fichier.
  const puces = [...svg.matchAll(/<rect x="(\d+)" y="226" width="(\d+)" height="44" rx="22"[^>]*\/>\s*<text x="\d+" y="\d+">([^<]+)<\/text>/g)]
    .map(([, x, w, label]) => ({ x: Number(x), w: Number(w), label: label.trim() }));
  assert.equal(puces.length, STACK_KEYS.length, `${puces.length} puces pour ${STACK_KEYS.length} stacks (${STACK_KEYS.join(', ')})`);

  // Chaque stack du dépôt doit être nommée par une puce.
  for (const k of STACK_KEYS) {
    assert.ok(puces.some((p) => p.label.toLowerCase().includes(k)), `aucune puce ne nomme la stack « ${k} »`);
  }

  // Géométrie : dans le viewBox, et jamais l'une sur l'autre (une puce hors cadre est invisible,
  // et le lecteur ne saurait pas que la stack existe).
  const largeur = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)[1]);
  let finPrecedente = 0;
  for (const p of puces) {
    assert.ok(p.x + p.w <= largeur, `puce « ${p.label} » : dépasse le cadre (${p.x + p.w} > ${largeur})`);
    assert.ok(p.x >= finPrecedente, `puce « ${p.label} » : chevauche la précédente (x=${p.x} < ${finPrecedente})`);
    finPrecedente = p.x + p.w;
  }
  assert.equal(svgTagBalance(svg), null, `SVG mal formé : ${svgTagBalance(svg)}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// H2 — « 2 à 3 gestes ». Le nombre de gestes N'EST PAS constant : il dépend du couple
// stack × assistant (0 à 2 plugins, 2 à 4 MCP). Annoncer un chiffre unique, c'est promettre à
// l'utilisateur mobile/Claude Code (2 plugins + 3 MCP + le CLI Maestro) la charge d'un
// utilisateur vitrine/Codex (0 plugin).
// ─────────────────────────────────────────────────────────────────────────────

const amplitudes = () => {
  const plugins = [], mcp = [];
  for (const s of STACK_KEYS) for (const a of ASSISTANTS) {
    const mf = resolveStackManifest(s, a);
    plugins.push(mf.plugins.length);
    mcp.push(Object.keys(mf.mcp).length);
  }
  return {
    plugins: [Math.min(...plugins), Math.max(...plugins)],
    mcp: [Math.min(...mcp), Math.max(...mcp)],
  };
};

test('H2 — le README annonce les amplitudes RÉELLES (plugins et MCP recomptés sur les 12 combos)', () => {
  const readme = read('README.md');
  const { plugins, mcp } = amplitudes();
  assert.ok(readme.includes(`${plugins[0]} à ${plugins[1]} plugin`), `README : dire « ${plugins[0]} à ${plugins[1]} plugins » (recompté sur les 12 combos)`);
  assert.ok(readme.includes(`${mcp[0]} à ${mcp[1]} serveurs MCP`), `README : dire « ${mcp[0]} à ${mcp[1]} serveurs MCP » (recompté sur les 12 combos)`);
  // …et plus de chiffre unique de gestes : il ne peut être vrai pour les 12 combos à la fois.
  assert.doesNotMatch(readme, /Il reste 2 à 3 gestes/, 'promesse fausse : le nombre de gestes dépend du couple stack × assistant');
});

test('H2bis — la table « Geste 2 » liste EXACTEMENT les stacks qui ont un plugin', () => {
  const readme = read('README.md');
  // La section « Geste 2 » seule : le README porte une AUTRE table par stack (les MCP), qui
  // nomme les mêmes stacks. Sans ce découpage, le test lirait la mauvaise.
  const debut = readme.indexOf('### Geste 2');
  assert.ok(debut > 0, 'la section « Geste 2 » existe');
  const section = readme.slice(debut, readme.indexOf('\n### ', debut + 10));
  // La table associe une stack aux assistants pour qui un plugin existe. On la recompte.
  const attendu = Object.fromEntries(STACK_KEYS.map((s) => [s, ASSISTANTS.filter((a) => resolveStackManifest(s, a).plugins.length > 0)]));
  const LABELS = { cursor: 'Cursor', 'claude-code': 'Claude Code', codex: 'Codex' };
  const NOMS = { saas: 'SaaS', mobile: 'Mobile', desktop: 'Desktop', vitrine: 'Vitrine' };
  for (const [s, assistants] of Object.entries(attendu)) {
    const ligne = section.split('\n').find((l) => l.startsWith(`| **${NOMS[s]}**`));
    if (!assistants.length) {
      assert.ok(!ligne, `${s} : aucun plugin réel, mais la table « Geste 2 » lui en donne un (${ligne})`);
      continue;
    }
    assert.ok(ligne, `${s} : ${assistants.length} assistant(s) ont un plugin, la table « Geste 2 » ne le dit pas`);
    for (const a of assistants) assert.ok(ligne.includes(LABELS[a]), `${s} : ${LABELS[a]} a un plugin, la table ne le nomme pas — « ${ligne} »`);
    for (const a of ASSISTANTS.filter((x) => !assistants.includes(x))) {
      assert.ok(!ligne.includes(LABELS[a]), `${s} : ${LABELS[a]} n'a AUCUN plugin, la table le promet — « ${ligne} »`);
    }
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// H2ter — la table « Geste 3 » (les MCP à autoriser). Jumelle de H2bis, et elle manquait : la
// ligne Vitrine a annoncé « Astro Docs · shadcn · Playwright » pendant tout le temps où le
// manifeste en déclarait CINQ (Convex et Better Auth étaient arrivés). L'utilisateur qui suit le
// README n'autorise pas les deux serveurs dont son projet a besoin, et rien ne le lui dit.
// ⚠️ Le README porte DEUX tables par stack (Geste 2 = plugins, Geste 3 = MCP) : sans le découpage,
// le test lirait la mauvaise — la faute que H2bis avait déjà dû éviter.
// ⚠️ Et c'est un test À DEUX SENS : un MCP manquant est un geste qu'on ne fait pas, un MCP en trop
// est un serveur qu'on autorise pour rien. Sans le second, la table pourrait tous les citer.
// ─────────────────────────────────────────────────────────────────────────────
const NOMS_STACKS = { saas: 'SaaS', mobile: 'Mobile', desktop: 'Desktop', vitrine: 'Vitrine' };
// « Chrome DevTools *(test E2E)* » et la clé `chrome-devtools` doivent se reconnaître : on efface
// la casse, les espaces et la ponctuation des deux côtés, et on compare des chaînes nues.
const nu = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

test('H2ter — la table « Geste 3 » liste EXACTEMENT les MCP que le manifeste déclare, stack par stack', () => {
  const readme = read('README.md');
  const debut = readme.indexOf('### Geste 3');
  assert.ok(debut > 0, 'la section « Geste 3 » existe');
  const fin = readme.indexOf('\n### ', debut + 10);
  const section = readme.slice(debut, fin > 0 ? fin : undefined);
  // Tous les MCP que le kit connaît, toutes stacks confondues : c'est contre CETTE liste qu'on
  // juge les absences (« la table promet un serveur que cette stack n'a pas »).
  const tous = new Set(STACK_KEYS.flatMap((s) => Object.keys(STACKS[s].mcp)));
  assert.ok(tous.size >= 5, `montage : ${tous.size} MCP lus dans le manifeste`);
  const fautes = [];
  for (const s of STACK_KEYS) {
    const ligne = section.split('\n').find((l) => l.startsWith(`| **${NOMS_STACKS[s]}**`));
    assert.ok(ligne, `${s} : aucune ligne dans la table « Geste 3 »`);
    const attendus = new Set(Object.keys(STACKS[s].mcp));
    for (const m of tous) {
      const cite = nu(ligne).includes(nu(m));
      if (attendus.has(m) && !cite) fautes.push(`${s} : le manifeste déclare « ${m} », la table « Geste 3 » ne le nomme pas`);
      if (!attendus.has(m) && cite) fautes.push(`${s} : la table « Geste 3 » fait autoriser « ${m} », que cette stack ne déclare pas`);
    }
  }
  assert.deepEqual(fautes, [], [
    'La table « Geste 3 » du README ne dit plus ce que le manifeste déclare :',
    ...fautes.map((f) => `  ${f}`),
    '',
    'Cette table EST la liste que l\'utilisateur coche dans `/mcp`. Un serveur oublié ici, c\'est',
    'un projet câblé à moitié — et le kit ne le lui dira jamais.',
  ].join('\n'));
});

// ─────────────────────────────────────────────────────────────────────────────
// H2quater — `ai-context/`. Deux surfaces disent quelle stack reçoit quel dossier de doc : le
// tableau de `ai-context/README.md` (que le projet reçoit) et les en-têtes de
// `scripts/download-ai-context.sh` (qui remplit le dépôt). Ni l'un ni l'autre n'était confronté à
// `AI_CONTEXT` : quand la vitrine est passée d'`["astro"]` à quatre dossiers, les deux ont
// continué d'annoncer « convex → saas · mobile » sans un mot.
// ⚠️ RIEN N'EST RECOPIÉ ICI : les dossiers sortent de `AI_CONTEXT`, les stacks aussi. Un dossier
// ajouté demain met les deux surfaces sous contrôle sans qu'on touche à ce test.
// ─────────────────────────────────────────────────────────────────────────────
const stacksDuDossier = (d) => STACK_KEYS.filter((s) => (AI_CONTEXT[s] ?? []).includes(d)).sort();
const DOSSIERS_AI = () => [...new Set(STACK_KEYS.flatMap((s) => AI_CONTEXT[s] ?? []))].sort();

test('H2quater — `ai-context/README.md` dit, dossier par dossier, les stacks que `AI_CONTEXT` déclare', () => {
  const t = read('ai-context/README.md');
  const dossiers = DOSSIERS_AI();
  assert.ok(dossiers.length >= 5, `montage : ${dossiers.length} dossiers lus dans AI_CONTEXT`);
  const fautes = [];
  for (const d of dossiers) {
    const ligne = t.split('\n').find((l) => l.startsWith(`| \`${d}/\` |`));
    if (!ligne) { fautes.push(`${d}/ : absent du tableau « Ce qu'il y a dedans »`); continue; }
    const annoncees = (ligne.split('|')[2] ?? '').split('·').map((x) => x.trim()).filter(Boolean).sort();
    assert.deepEqual(annoncees, stacksDuDossier(d), `ai-context/README.md, ligne \`${d}/\` : stacks annoncées ≠ stacks de AI_CONTEXT`);
  }
  assert.deepEqual(fautes, [], fautes.join('\n'));
});

test('H2quater — `download-ai-context.sh` couvre chaque dossier de `AI_CONTEXT`, avec les bonnes stacks', () => {
  const sh = read('scripts/download-ai-context.sh');
  const lignes = sh.split('\n');
  const departs = lignes.flatMap((l, i) => (/^echo "▸ /.test(l) ? [i] : []));
  assert.ok(departs.length >= 5, `montage : ${departs.length} blocs « ▸ » lus dans le script`);
  const couverts = new Map();
  for (const [k, i] of departs.entries()) {
    const bloc = lignes.slice(i, departs[k + 1] ?? lignes.length).join('\n');
    // Le dossier n'est pas déduit du TITRE (« React Native / Expo » ≠ `react-native-expo`) mais
    // des chemins que le bloc écrit ou cite : c'est ce que le bloc FAIT, pas comment il s'appelle.
    const dossiers = new Set([...bloc.matchAll(/(?:\$DEST|ai-context)\/([a-z0-9-]+)\//g)].map((m) => m[1]));
    assert.equal(dossiers.size, 1, `le bloc « ${lignes[i].slice(7, 40)} » doit désigner UN dossier de ai-context/, vu : ${[...dossiers].join(', ') || '(aucun)'}`);
    const d = [...dossiers][0];
    const annonce = /\(stacks?\s*:\s*([^)]+)\)/.exec(lignes[i]);
    assert.ok(annonce, `le bloc « ${d} » n'annonce aucune stack — écris « (stacks : … ) » dans son en-tête`);
    assert.deepEqual(annonce[1].split('·').map((x) => x.trim()).filter(Boolean).sort(), stacksDuDossier(d),
      `download-ai-context.sh, bloc « ${d} » : stacks annoncées ≠ stacks de AI_CONTEXT`);
    couverts.set(d, true);
  }
  assert.deepEqual([...couverts.keys()].sort(), DOSSIERS_AI(),
    'un dossier de AI_CONTEXT n\'a aucun bloc dans download-ai-context.sh : `--refresh` livrerait un dossier vide');
});
// ─────────────────────────────────────────────────────────────────────────────
// H3 — prérequis. Le Lot A a supprimé le code d'accès ; le wizard ne pose plus les mêmes
// questions ; et la stack vitrine exige un Node plus récent que le kit lui-même (Astro 7).
// ─────────────────────────────────────────────────────────────────────────────

// Joue le VRAI wizard avec un `ask` factice : la liste des questions est recomptée, pas recopiée.
async function questionsDuWizard() {
  const posees = [];
  const out = { write: (s) => posees.push(s) };
  const reponses = ['1', '1', 'mon-app', '1', ''];
  let i = 0;
  await runWizard(async (q) => { posees.push(q); return reponses[i++] ?? ''; }, false, out);
  return posees.join('\n');
}

test('H3 — les prérequis du README décrivent le wizard RÉEL (questions jouées, code d\'accès supprimé)', async () => {
  const readme = read('README.md');
  // 1. Le code d'accès a été supprimé au Lot A. On le constate sur le DOSSIER plutôt que sur un
  //    chemin littéral : ce fichier resterait sinon une « référence orpheline » pour A9
  //    (degraissage.test.mjs), et se déclarer garde exempterait tout le fichier de son contrôle.
  const modules = fs.readdirSync(path.join(ROOT, 'scripts/lib'));
  assert.deepEqual(modules.filter((f) => f.startsWith('licen')), [], 'montage : le code d\'accès a bien été supprimé');
  assert.doesNotMatch(readme, /code d'accès/i, 'README : le code d\'accès n\'existe plus (Lot A)');
  // 2. Les questions annoncées sont celles que le wizard pose vraiment. On lit le PARAGRAPHE des
  //    prérequis, pas tout le README : « mode apprentissage » y apparaît trois fois ailleurs, et
  //    un garde qui cherche partout reste vert quand la phrase des prérequis perd la question.
  const posees = await questionsDuWizard();
  assert.match(posees, /Mode apprentissage/, 'montage : le wizard pose bien la question du mode apprentissage');
  assert.doesNotMatch(posees, /caveman/i, 'montage : le wizard ne propose plus caveman');
  const prereq = readme.split('\n').find((l) => /Prérequis\s*:/.test(l) && /wizard/.test(l));
  assert.ok(prereq, 'README : la phrase des prérequis existe');
  assert.match(prereq, /mode apprentissage/i, `README : le wizard pose une question de plus que ce que les prérequis annoncent — « ${prereq} »`);
});

test('H3bis — le README dit le Node exigé par la stack vitrine (Astro 7), pas seulement celui du kit', () => {
  const readme = read('README.md');
  assert.ok(readme.includes(`${PINS.vitrine.node}`), `README : la stack vitrine exige Node ≥ ${PINS.vitrine.node} (matrix.mjs PINS), jamais dit`);
});

// ─────────────────────────────────────────────────────────────────────────────
// H4 — ce qui n'est documenté NULLE PART côté npm : les runbooks manquants, `--refresh` par npx,
// le journal du crew, la Règle Preuve et la Règle Réalité.
// ─────────────────────────────────────────────────────────────────────────────

test('H4 — le README documente les 10 runbooks (recomptés sur COMMANDS), pas 8', () => {
  const readme = read('README.md');
  // La section « Les commandes » est la référence : c'est là qu'on va chercher ce qu'une
  // commande fait. Un runbook livré mais absent d'ici est un runbook que personne ne trouve.
  const debut = readme.indexOf('## 🎛️ Les commandes');
  assert.ok(debut > 0, 'la section « Les commandes » existe');
  const section = readme.slice(debut, readme.indexOf('\n## ', debut + 10));
  const manquantes = COMMANDS.filter((c) => !new RegExp(`\`/${c}\``).test(section));
  assert.deepEqual(manquantes, [], `runbooks livrés mais absents de la section « Les commandes » : ${manquantes.join(', ')}`);
});

test('H4bis — `npx <paquet> --refresh` est documenté ET JOUÉ (bin symlinké, cwd = le projet)', () => {
  const readme = read('README.md');
  const pkg = JSON.parse(read('package.json'));
  // `--refresh` est traité par le bin du paquet (scripts/setup.mjs) : un utilisateur npm n'a
  // aucun `<kit>/scripts/update.mjs` sous la main, il n'a que `npx <paquet>`.
  assert.equal(pkg.bin[pkg.name], 'scripts/setup.mjs', 'montage : le bin du paquet est bien setup.mjs');
  assert.ok(readme.includes(`npx ${pkg.name} --refresh`), `README : \`npx ${pkg.name} --refresh\` n'est documenté nulle part`);

  // Documenter une commande sans la jouer, c'est la promesse que le kit interdit. On reproduit
  // la forme exacte de npx : le bin est un SYMLINK (`node_modules/.bin/<nom>`), et le cwd est le
  // projet — les deux conditions qui ont déjà fait sortir setup.mjs en 0 sans rien faire.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-refresh-'));
  try {
    const proj = path.join(dir, 'app');
    execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'vitrine', '--assistant', 'cursor', '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
    const bin = path.join(dir, 'node_modules', '.bin');
    fs.mkdirSync(bin, { recursive: true });
    const lien = path.join(bin, pkg.name);
    fs.symlinkSync(SETUP, lien);
    // Une commande qui n'existe pas est régénérée : la preuve que le refresh a AGI, pas seulement
    // rendu 0 (le mode d'échec exact que `cli-entry.mjs` documente).
    const cible = path.join(proj, '.cursor/commands/doctor.md');
    assert.ok(fs.existsSync(cible), 'montage : le scaffold pose bien les runbooks');
    fs.rmSync(cible);
    // …et le README promet en même temps que le travail de l'utilisateur survit. On le lui fait
    // écrire, pour de vrai, avant de rafraîchir : une promesse de non-destruction ne se vérifie
    // qu'avec quelque chose à détruire.
    const AMOI = '# Mon PRD à moi\nNe pas écraser.\n';
    fs.writeFileSync(path.join(proj, 'docs/PRD.md'), AMOI);
    fs.appendFileSync(path.join(proj, 'docs/A-FAIRE.md'), '\n- [x] coché par moi\n');
    const out = execFileSync(process.execPath, [lien, '--refresh'], { cwd: proj, stdio: 'pipe', env: GIT_ENV }).toString();
    assert.ok(fs.existsSync(cible), `\`npx ${pkg.name} --refresh\` n'a rien régénéré depuis le projet — sortie : ${out}`);
    assert.equal(fs.readFileSync(path.join(proj, 'docs/PRD.md'), 'utf8'), AMOI, 'le refresh a écrasé docs/PRD.md — le README promet le contraire');
    assert.match(fs.readFileSync(path.join(proj, 'docs/A-FAIRE.md'), 'utf8'), /coché par moi/, 'le refresh a écrasé docs/A-FAIRE.md — le README promet le contraire');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// H4quater — le parcours « projet existant ». Le CLI l'accepte depuis le lot adoption ; le README
// est le SEUL endroit où quelqu'un peut apprendre qu'il existe (`--adopt` ne s'écrit pas au
// hasard). Un parcours livré et jamais documenté, c'est du code mort du point de vue de
// l'utilisateur — et le README envoyait tout le monde sur `npm create` dans un dossier VIDE.
// ─────────────────────────────────────────────────────────────────────────────
test('H4quater — le README documente `--adopt`, dit ce qu\'il ne touche pas, et n\'y envoie pas sur `/new-project`', () => {
  const readme = read('README.md');
  const pkg = JSON.parse(read('package.json'));
  // Le drapeau est LU dans le CLI : documenter une commande que `parseArgs` refuse serait la
  // promesse morte que ce lot passe son temps à fermer.
  assert.equal(parseArgs(['--adopt']).adopt, true, 'montage : `--adopt` est bien le drapeau du parcours « projet existant »');
  assert.ok(readme.includes(`npx ${pkg.name}@latest --adopt`), `README : \`npx ${pkg.name}@latest --adopt\` n'est écrit nulle part — le parcours existe et personne ne peut le trouver`);

  // DEUX endroits, parce qu'on cherche à deux endroits : le tableau (« est-ce que ce kit sait
  // faire ça ? ») et le démarrage (« comment je le lance ? »). Une seule des deux ne suffit pas.
  const iTable = readme.indexOf('## ✨ Fonctionnalités');
  const iDemarrage = readme.indexOf('## ⚡ Démarrage rapide');
  const iApres = readme.indexOf('## ✅ Après l\'install');
  assert.ok(iTable > 0 && iDemarrage > iTable && iApres > iDemarrage, 'montage : les trois sections du README sont dans cet ordre');
  const table = readme.slice(iTable, iDemarrage);
  assert.ok(table.split('\n').some((l) => l.startsWith('|') && l.includes('--adopt')), 'README : le tableau des fonctionnalités ne porte aucune ligne `--adopt`');

  // ── LE BLOC DU DÉMARRAGE RAPIDE, isolé : sans ça, un renvoi correct ailleurs dans le README
  // ferait passer les contrôles ci-dessous pendant que CE bloc raconte autre chose.
  const demarrage = readme.slice(iDemarrage, iApres).split('\n');
  const d = demarrage.findIndex((l) => l.includes('--adopt'));
  assert.ok(d >= 0, 'README : « Démarrage rapide » ne dit pas quoi faire quand le projet existe déjà');
  const f = demarrage.findIndex((l, k) => k > d && /^\*\*\d\./.test(l));
  const bloc = demarrage.slice(Math.max(0, d - 2), f === -1 ? demarrage.length : f).join('\n');

  // Ce que le lot entier a construit, et qui décide qu'on ose lancer ça sur un projet de deux ans.
  for (const [motif, quoi] of [
    [/AGENTS\.md/, 'les règles arrivent DANS `AGENTS.md`'],
    [/CLAUDE\.md/, '…et dans `CLAUDE.md`'],
    [/écras/i, 'la promesse de non-écrasement — c\'est la question n°1 de quelqu\'un qui a du code'],
  ]) assert.match(bloc, motif, `README, bloc \`--adopt\` : ${quoi} — jamais dit`);

  // LA SUITE. Sur un projet adopté, `/new-project` fonderait un PRD par-dessus le code existant :
  // `/next`, `/build` et le verdict de `/doctor` l'interdisent tous les trois (adoption.test.mjs).
  // Le README ne peut pas être le seul document qui l'y renvoie encore.
  assert.match(bloc, /ETAT-DES-LIEUX\.md/, 'README, bloc `--adopt` : la suite, sur un projet adopté, c\'est `docs/ETAT-DES-LIEUX.md` — jamais dit');
  for (const l of bloc.split('\n').filter((x) => x.includes('/new-project'))) {
    assert.match(l, /\bpas\b|jamais/i, `README, bloc \`--adopt\` : « ${l.trim().slice(0, 90)}… » cite \`/new-project\` sans l'exclure`);
  }
  // LE DISCRIMINANT : le parcours NEUF n'a pas bougé.
  assert.match(readme.slice(iDemarrage, iApres), /npm create vibecoding-kit@latest/, 'README : le parcours d\'un projet NEUF a disparu du démarrage rapide');
});

test('H4ter — le README documente le journal du crew et les deux règles canoniques', () => {
  const readme = read('README.md');
  // Les trois graines réellement posées dans le projet (recomptées sur templates/journal/).
  const graines = fs.readdirSync(path.join(ROOT, 'templates/journal')).sort();
  assert.ok(graines.length > 0, 'montage : templates/journal/ n\'est pas vide');
  for (const g of graines) assert.ok(readme.includes(g), `README : \`docs/agents/${g}\` est posé dans chaque projet et n'est documenté nulle part`);
  // Les deux règles canoniques, nommées par leur TITRE réel (pas par un libellé recopié).
  for (const f of ['proof-rule.md', 'reality-rule.md']) {
    const titre = /^##\s+(Règle [^(\n]+?)\s*(\(|$)/m.exec(read(`templates/agents/${f}`));
    assert.ok(titre, `montage : ${f} porte un titre « ## Règle … »`);
    assert.ok(readme.includes(titre[1]), `README : « ${titre[1]} » (templates/agents/${f}) n'est jamais nommée`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// H5 — les guides. Ils partent dans le paquet npm : une instruction périmée y atteint tous les
// installateurs.
// ─────────────────────────────────────────────────────────────────────────────

test('H5 — guide 01 : les 4 stacks (recomptées sur STACKS), pas 3', () => {
  const g = read('guides/01-comment-parler-a-l-IA.md');
  const NOMS = { saas: /SaaS/, mobile: /mobile/i, desktop: /desktop/i, vitrine: /vitrine/i };
  for (const k of STACK_KEYS) assert.match(g, NOMS[k], `guide 01 : la stack « ${k} » existe et n'est jamais citée`);
});

test('H5bis — guide 02 : enseigne l\'entrée PUBLIÉE, pas un `git clone` du dépôt', () => {
  const g = read('guides/02-installer-les-outils.md');
  const pkg = JSON.parse(read('package.json'));
  const commande = `npm create ${pkg.name.replace(/^create-/, '')}`;
  assert.ok(g.includes(commande), `guide 02 : la voie normale est \`${commande}\` (paquet ${pkg.name}), jamais dite`);
  assert.doesNotMatch(g, /git clone <URL-de-ce-depot>/, 'guide 02 : le placeholder de clone n\'est pas une instruction jouable');
});

test('H5ter — guide 03 : ne promet aucune question que le wizard ne pose plus', async () => {
  const g = read('guides/03-securite-et-couts.md');
  const posees = await questionsDuWizard();
  assert.doesNotMatch(posees, /caveman/i, 'montage : le wizard ne propose plus caveman');
  assert.doesNotMatch(g, /L'installeur du kit peut poser caveman/, 'guide 03 : le wizard ne pose plus cette question (wizard.mjs)');
  // …mais il doit rester installable : le flag existe toujours.
  assert.match(read('scripts/lib/args.mjs'), /'--caveman'/, 'montage : le flag --caveman existe encore');
  assert.match(g, /--caveman/, 'guide 03 : dire par quoi la question a été remplacée (le flag)');
});

// ─────────────────────────────────────────────────────────────────────────────
// H6 — le glossaire. C'est le fichier vers lequel le README envoie quand un mot bloque : un
// renvoi mort ou un chiffre faux y coûte le plus cher.
// ─────────────────────────────────────────────────────────────────────────────

// Slug GitHub d'un titre Markdown : minuscules, ponctuation et emoji retirés, espaces → tirets.
// L'espace LAISSÉ par un emoji retiré n'est PAS mangé : c'est lui qui donne le `-` initial de
// `#-pourquoi-ce-projet`. Un `.trim()` ici rendrait le test aveugle à la moitié du sommaire.
const slug = (titre) => titre.toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .replace(/\s/g, '-');

test('H6 — docs livrées : aucun renvoi mort (liens relatifs, ancres, textes de lien)', () => {
  // README et guides/ partent tous les deux dans le paquet npm : un renvoi mort y atteint
  // chaque installateur. On les vérifie ensemble — le premier lien du README pointe justement
  // sur le glossaire.
  const cibles = ['README.md', ...fs.readdirSync(path.join(ROOT, 'guides')).map((f) => `guides/${f}`)];
  const fautes = [];
  for (const rel of cibles) {
    const src = read(rel);
    const base = path.dirname(path.join(ROOT, rel));
    const ancres = new Set([
      ...[...src.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1]),
      ...[...src.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => slug(m[1])),
    ]);
    for (const [, txt, cible] of src.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      if (/^https?:|^mailto:/.test(cible)) continue;
      if (cible.startsWith('#')) {
        if (!ancres.has(cible.slice(1))) fautes.push(`${rel} : ancre morte ${cible} (lien « ${txt} »)`);
        continue;
      }
      const [chemin] = cible.split('#');
      if (!fs.existsSync(path.resolve(base, chemin))) fautes.push(`${rel} : lien mort vers ${chemin} (« ${txt} »)`);
      // Un lien dont le TEXTE nomme un autre fichier que sa cible est un renvoi mort déguisé —
      // c'est le cas de `docs/SETUP-AI.md` pointé sur `../templates/`.
      const nomme = /(docs\/[\w-]+\.md)/.exec(txt);
      if (nomme && !cible.includes(nomme[1])) fautes.push(`${rel} : le lien « ${txt} » annonce ${nomme[1]} mais pointe sur ${cible}`);
    }
  }
  assert.deepEqual(fautes, [], `renvois morts dans les docs livrées :\n${fautes.join('\n')}`);
});

test('H6bis — glossaire : le nombre de skills design est recompté sur DESIGN_SKILL_NAMES', () => {
  const g = read('guides/glossaire.md');
  const m = /(\d+)\s+skills? de design/.exec(g) ?? /(\d+)\s+skills? design/.exec(g);
  assert.ok(m, 'le glossaire annonce un nombre de skills design');
  assert.equal(Number(m[1]), DESIGN_SKILL_NAMES.length, `glossaire : « ${m[0]} » alors que matrix.mjs en déclare ${DESIGN_SKILL_NAMES.length}`);
});

test('H6ter — glossaire : le vocabulaire du kit y est DÉFINI (recompté sur le dépôt)', () => {
  const g = read('guides/glossaire.md');
  // « Défini » = le mot est le TITRE d'une entrée, pas une occurrence perdue dans une phrase.
  // Sans cette distinction, retirer l'entrée « Astro » laissait le test vert : le mot survivait
  // dans « Astro 7 exige Node ≥ 22.12 », qui n'explique rien à qui ne sait pas ce qu'est Astro.
  const titres = [...g.matchAll(/^- (?:<a id="[^"]*"><\/a>)?\*\*(.+?)\*\*/gm)].map((m) => m[1]);
  assert.ok(titres.length > 50, `montage : ${titres.length} entrées lues dans le glossaire`);
  const defini = (terme) => titres.some((t) => t.includes(terme));
  // 1. Les 10 runbooks livrés.
  const sansEntree = COMMANDS.filter((c) => !defini(`\`/${c}\``));
  assert.deepEqual(sansEntree, [], `runbooks livrés sans entrée au glossaire : ${sansEntree.join(', ')}`);
  // 2. Les 7 agents du crew : ils apparaissent dans le projet de l'utilisateur, il doit pouvoir
  //    chercher leur nom. Ils sont définis ensemble, dans le corps de l'entrée « Crew » — donc
  //    c'est là qu'on les exige, et nulle part ailleurs.
  const entreeCrew = g.split('\n').find((l) => /^- .*\*\*Crew/.test(l));
  assert.ok(entreeCrew, 'glossaire : aucune entrée ne définit le « crew »');
  const agentsAbsents = CREW.filter((a) => !entreeCrew.includes(a));
  assert.deepEqual(agentsAbsents, [], `agents du crew absents de l'entrée « Crew » : ${agentsAbsents.join(', ')}`);
  // 3. Les fichiers du journal, posés dans chaque projet.
  const journalAbsent = fs.readdirSync(path.join(ROOT, 'templates/journal')).filter((f) => !defini(f));
  assert.deepEqual(journalAbsent, [], `fichiers de docs/agents/ sans entrée au glossaire : ${journalAbsent.join(', ')}`);
  // 4. Les technos-clés que le wizard annonce pour chaque stack : un débutant choisit sa stack
  //    sur ces mots-là. On les lit dans le wizard, pas dans une liste recopiée.
  const wiz = read('scripts/lib/wizard.mjs');
  const technos = [...wiz.matchAll(/hint: '([^']+)'/g)].flatMap((m) => m[1].split(/[+·(),—]/))
    .map((t) => t.trim())
    // `SEO/GEO` est une paire d'acronymes, pas un nom : le glossaire les définit séparément.
    // (`shadcn/ui`, lui, est un seul nom — d'où la borne sur les majuscules des deux côtés.)
    .flatMap((t) => (/^[A-Z]{2,}\/[A-Z]{2,}$/.test(t) ? t.split('/') : [t]))
    .filter((t) => /^[A-Z]/.test(t) && t.length > 2 && !/^(compte|zéro|données|CMS)/i.test(t));
  const inconnues = [...new Set(technos)].filter((t) => !defini(t));
  assert.ok(inconnues.length === 0 && technos.length >= 8, `technos annoncées par le wizard et sans entrée au glossaire : ${inconnues.join(', ')} (sur ${technos.length} lues)`);
  // 5. Les deux règles canoniques, par leur titre réel.
  for (const f of ['proof-rule.md', 'reality-rule.md']) {
    const titre = /^##\s+(Règle [^(\n]+?)\s*(\(|$)/m.exec(read(`templates/agents/${f}`))[1];
    assert.ok(defini(titre), `glossaire : « ${titre} » gouverne tout le projet et n'y a pas d'entrée`);
  }
});

test('H6quater — glossaire : le check pre-push desktop annoncé est celui qui est câblé', () => {
  const g = read('guides/glossaire.md');
  const checks = read('templates/hooks/framework/checks.mjs');
  for (const id of STACKS.desktop.checks.prePush) {
    const cmd = new RegExp(`${id}:\\s*\\{[^}]*cmd:\\s*\\[([^\\]]+)\\]`).exec(checks);
    assert.ok(cmd, `montage : le check « ${id} » existe dans checks.mjs`);
    const outil = cmd[1].split(',').map((s) => s.trim().replace(/'/g, '')).slice(0, 2).join(' ');
    assert.ok(g.includes(outil), `glossaire : le pre-push desktop lance « ${outil} » et le glossaire ne le définit pas`);
  }
  // …et il ne doit plus annoncer l'outil retiré au Lot F comme s'il tournait encore. On regarde
  // les COMMANDES, pas le fichier : checks.mjs garde en commentaire la raison du retrait, et
  // c'est très bien — c'est le `cmd:` qui dit ce qui s'exécute.
  const commandes = [...checks.matchAll(/cmd:\s*\[([^\]]+)\]/g)].map((m) => m[1]).join(' ');
  assert.ok(commandes.length > 0, 'montage : checks.mjs déclare bien des commandes');
  assert.doesNotMatch(commandes, /electronegativity/i, 'montage : electronegativity a bien été retiré des commandes de checks.mjs');
  const ligneE = g.split('\n').find((l) => /electronegativity/i.test(l));
  if (ligneE) assert.doesNotMatch(ligneE, /pre-push/, `glossaire : electronegativity n'est plus câblé nulle part — « ${ligneE.trim()} »`);
});

// ─────────────────────────────────────────────────────────────────────────────
// H7 — le parcours de lecture. `guides/` part dans le paquet npm mais n'atterrissait dans
// AUCUN projet : l'utilisateur qui bloque sur un mot n'a nulle part où aller.
// DÉCISION : embarquer le glossaire (`docs/glossaire.md`) et le rendre atteignable depuis
// `/help`, l'entrée du kit. Le renvoi depuis `docs/A-FAIRE.md` est impossible : le Lot G
// interdit d'y écrire « glossaire » (parcours.test.mjs G5) précisément parce que le fichier
// n'existait pas dans le projet — l'interdit tombe en le créant, pas en le contournant.
// ─────────────────────────────────────────────────────────────────────────────

test('H7 — le glossaire est embarqué dans le projet généré et atteignable depuis /help', () => {
  const proj = scaffold();
  const embarque = path.join(proj, 'docs/glossaire.md');
  assert.ok(fs.existsSync(embarque), 'le projet généré doit contenir docs/glossaire.md');
  // C'est bien LE glossaire du kit, pas un fichier vide portant son nom.
  assert.equal(fs.readFileSync(embarque, 'utf8'), read('guides/glossaire.md'), 'docs/glossaire.md doit être la copie du glossaire du kit');
  // Zéro orphelin : quelque chose doit y mener, et `/help` est l'entrée (Lot G).
  const help = fs.readFileSync(path.join(proj, '.claude/commands/help.md'), 'utf8');
  assert.match(help, /docs\/glossaire\.md/, '/help doit mener au glossaire, sinon le fichier est un orphelin');
});

test('H7ter — tout fichier que le kit lit au runtime part bien dans le paquet npm', () => {
  // Le glossaire est le PREMIER fichier du projet qui vienne de `guides/` : jusqu'ici ce dossier
  // était dans `files[]` sans que rien ne le lise, donc l'en retirer n'aurait rien cassé de
  // visible — et le scaffold npm aurait perdu le glossaire en silence. Le garde ne vise pas ce
  // cas-là en particulier : il recompte `kitOwnedFiles`, donc il couvre aussi le prochain.
  const pkg = JSON.parse(read('package.json'));
  const couvert = (rel) => pkg.files.some((f) => rel === f || rel.startsWith(`${f.replace(/\/$/, '')}/`));
  const lus = new Set();
  for (const s of STACK_KEYS) for (const a of ASSISTANTS) for (const { from } of kitOwnedFiles(s, a)) lus.add(from);
  assert.ok(lus.has('guides/glossaire.md'), 'montage : le glossaire est bien un fichier lu au runtime');
  const manquants = [...lus].filter((f) => !couvert(f)).sort();
  assert.deepEqual(manquants, [], `fichiers lus par le kit mais absents de package.json files[] :\n${manquants.join('\n')}`);
});

test('H7bis — un fichier LIVRÉ dans le projet ne parle ni de formation ni d\'accompagnement (FR et EN)', () => {
  const proj = scaffold();
  // Le motif couvre les deux langues : le Lot F a laissé passer « official » parce que son
  // motif n'exigeait que « officiel ».
  const INTERDITS = /\b(formations?|accompagnements?|trainings?|coachings?|mentoring)\b/i;
  const fichiers = [];
  const parcours = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // `ai-context/` est de la doc AMONT recopiée verbatim (les `llms.txt` officiels de Convex,
      // Expo…). Le kit ne l'écrit pas, il la transporte : « Machine learning training » y est une
      // phrase de Convex, pas une promesse du kit. La réécrire serait falsifier une source.
      if (e.name === '.git' || e.name === 'node_modules' || e.name === 'ai-context') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) parcours(p);
      else if (/\.(md|mdc|json|yaml|yml|txt)$/.test(e.name)) fichiers.push(p);
    }
  };
  parcours(proj);
  assert.ok(fichiers.length > 20, `montage : ${fichiers.length} fichiers parcourus, le projet n'a pas été lu`);
  const fautes = [];
  for (const f of fichiers) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (INTERDITS.test(l)) fautes.push(`${path.relative(proj, f)}:${i + 1} — « ${l.trim().slice(0, 100)} »`);
    });
  }
  assert.deepEqual(fautes, [], `mots interdits dans des fichiers livrés :\n${fautes.join('\n')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// H8 — `formateur/`. Jamais copié dans un projet (donc hors de la règle ci-dessus), mais il
// décrit le kit : ses instructions doivent être jouables telles quelles.
// ─────────────────────────────────────────────────────────────────────────────

// Les docs INTERNES : jamais copiées dans un projet, jamais publiées sur npm — donc jamais
// exercées par rien. `playbook/` est lu par une IA qu'on pointe sur le dépôt, `formateur/` par
// un humain qui anime. Une instruction périmée y survit indéfiniment (le playbook envoyait
// encore vers `docs/SETUP-AI.md`, renommé il y a des lots).
const DOCS_INTERNES = () => ['formateur', 'playbook'].flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((f) => `${d}/${f}`));

// Tous les runbooks du kit : les fichiers d'entrée de `templates/commands/`, ET les ÉTAPES des
// runbooks découpés. Deux raisons, pas une :
//  1. le filtre `.md` n'est pas cosmétique — sans lui le sous-dossier LUI-MÊME part dans
//     `readFileSync`, qui lève `EISDIR: illegal operation on a directory, read`. Le seul `mkdir`
//     suffisait à casser ce test, avant même qu'aucune étape n'existe. `etapesDuRunbook` le porte ;
//  2. une étape cautionne les mêmes chemins que le runbook d'entrée. Ne lire que l'entrée ferait
//     passer pour mort un chemin qu'une étape promet.
// La liste ne nommait que `new-project/` — le seul dossier d'étapes qui existât alors. Un
// deuxième runbook découpé (`/new-feature`, `/init-vibecoding`) aurait vu ses chemins promis
// sortir de la caution EN SILENCE : un `docs/…` cité par une doc interne et promis par une étape
// serait devenu « mort » sans que rien n'ait disparu. On énumère donc la source unique, pour les
// 10 runbooks — l'entrée, puis ses étapes s'il en a.
const RUNBOOKS = () => COMMANDS.flatMap((c) => fichiersDuRunbook(ROOT, c));

// Les slash-commandes NATIVES d'un assistant (`/mcp`, `/add-plugin`…) ne sont pas des runbooks
// du kit : on les recompte là où le kit les déclare, au lieu de les lister à la main.
const NATIVES = () => new Set(
  [...Object.values(SUPERPOWERS), ...Object.values(MCP_CONNECT).flatMap((c) => [c.court, c.long])]
    .flatMap((s) => [...s.matchAll(/\/([a-z][a-z-]{2,})/g)].map((m) => m[1])),
);

test('H8 — docs internes : chaque runbook cité existe, chaque chemin cité existe', () => {
  const fichiers = DOCS_INTERNES();
  assert.ok(fichiers.length > 4, `montage : ${fichiers.length} docs internes lues`);
  const natives = NATIVES();
  assert.ok(natives.has('mcp') && natives.has('add-plugin'), 'montage : les commandes natives sont bien recomptées sur matrix.mjs');
  // Un chemin peut naître PLUS TARD, de la main d'un runbook (`docs/design.md` à l'étape design de
  // `/new-project`). La caution n'est pas une liste écrite ici : c'est que le kit le promette
  // lui-même, dans `templates/commands/`. Rien ne cautionne `docs/SETUP-AI.md`, et c'est le but.
  const promisParUnRunbook = RUNBOOKS().map((f) => read(f)).join('\n');
  assert.ok(RUNBOOKS().length >= 10, `montage : ${RUNBOOKS().length} runbooks lus, la caution des chemins est vide`);
  const inconnus = [], morts = [];
  for (const f of fichiers) {
    read(f).split('\n').forEach((l, i) => {
      for (const m of l.matchAll(/(?:^|[^\w./-])\/([a-z][a-z-]{2,})\b/g)) {
        if (!COMMANDS.includes(m[1]) && !natives.has(m[1])) inconnus.push(`${f}:${i + 1} — /${m[1]}`);
      }
      for (const m of l.matchAll(/`((?:guides|stacks|templates|scripts|docs|playbook)\/[\w./-]+)`/g)) {
        // `docs/…` peut désigner le dépôt (`docs/COUTS.md`) OU le projet généré (`docs/memory/`),
        // et dans le projet il dépend de l'assistant (`docs/agents/crew/` n'existe que chez Codex).
        // Un chemin qui n'existe dans AUCUN de ces mondes est mort dans toutes les lectures.
        const existe = fs.existsSync(path.join(ROOT, m[1]))
          || ASSISTANTS.some((a) => fs.existsSync(path.join(scaffold(a), m[1])))
          || promisParUnRunbook.includes(m[1]);
        if (!existe) morts.push(`${f}:${i + 1} — ${m[1]}`);
      }
    });
  }
  assert.deepEqual(inconnus, [], `docs internes : commandes qui n'existent pas (COMMANDS) :\n${inconnus.join('\n')}`);
  assert.deepEqual(morts, [], `docs internes : chemins qui n'existent pas :\n${morts.join('\n')}`);
});

test('H8quater — docs internes : les skills design et les dépôts clonés sont ceux du kit', () => {
  const outil = read('playbook/install-tooling.md');
  // 1. Les skills design : membres ET compte, recomptés sur matrix.mjs. `shadcnblocks` traînait
  //    dans cette liste — c'est un registry du CLI shadcn, pas un skill.
  const m = /skills design \((\d+)\)\*?\*? ?: ?([^\n—]+)/.exec(outil);
  assert.ok(m, 'install-tooling annonce la liste des skills design');
  assert.equal(Number(m[1]), DESIGN_SKILL_NAMES.length, `install-tooling : « ${m[1]} skills design » alors que matrix.mjs en déclare ${DESIGN_SKILL_NAMES.length}`);
  const cites = m[2].split(',').map((s) => s.trim().replace(/[`*]/g, '')).filter(Boolean);
  assert.deepEqual([...cites].sort(), [...DESIGN_SKILL_NAMES].sort(), 'install-tooling : la liste des skills design diverge de DESIGN_SKILL_NAMES');

  // 2. Les outils nommés en tête de puce : chacun doit exister dans la surface d'installation
  //    RÉELLE du kit (clones, specs de skills, superpowers, caveman). `awesome-cursorrules` y
  //    figurait encore alors que matrix.mjs l'a supprimé — un élève cherchait un dossier absent.
  const clones = new Set();
  for (const s of STACK_KEYS) for (const a of ASSISTANTS) for (const c of resolveAssets(s, a).clones) clones.add(c.repo);
  assert.ok(clones.size > 0, 'montage : le kit clone bien au moins un dépôt');
  const surface = [
    'superpowers', 'caveman',
    ...DESIGN_SKILL_NAMES,
    ...AGENT_SKILL_SPECS.flatMap((s) => s.skills),
    ...[...clones].map((r) => r.split('/').pop()),
  ].map((s) => s.toLowerCase());
  const fantomes = [];
  for (const [, brut] of outil.matchAll(/^- \*\*([^*]+)\*\*/gm)) {
    const titre = brut.trim();
    // Un NOM D'OUTIL npm/github s'écrit en minuscules d'un seul tenant. Le test se fait sur la
    // casse d'origine : « Glossaire », « Mémoire », « Strix », « skills design (4) » sont des
    // rubriques, pas des paquets — les lowercaser d'abord rendrait le filtre inopérant.
    if (!/^[a-z][a-z0-9-]*$/.test(titre)) continue;
    if (!surface.some((s) => s.includes(titre) || titre.includes(s))) fantomes.push(titre);
  }
  assert.deepEqual(fantomes, [], `install-tooling : outils annoncés que le kit n'installe plus : ${fantomes.join(', ')}`);
});

test('H8bis — formateur : enseigne l\'entrée publiée, et le crew qu\'un élève va rencontrer', () => {
  const plan = read('formateur/plan-de-cours.md');
  const pkg = JSON.parse(read('package.json'));
  assert.ok(plan.includes(`npm create ${pkg.name.replace(/^create-/, '')}`), `plan de cours : la voie normale est le paquet ${pkg.name}, jamais dite`);
  // Le crew et son journal sont dans TOUS les projets depuis le Lot C : un plan de cours qui
  // ne les nomme pas envoie l'animateur découvrir `docs/agents/` en salle.
  assert.match(plan, /docs\/agents\//, 'plan de cours : le crew écrit dans docs/agents/, jamais dit');
});

test('H8ter — formateur : décrit ce que le kit copie VRAIMENT dans un projet', () => {
  const proj = scaffold();
  const readme = read('formateur/README.md');
  // Le README affirmait « le kit ne génère que le contenu de templates/ ». C'est vérifiable :
  // le glossaire vient de guides/, pas de templates/.
  assert.ok(fs.existsSync(path.join(proj, 'docs/glossaire.md')), 'montage : le glossaire est bien copié depuis guides/');
  assert.doesNotMatch(readme, /ne génère que le contenu de `templates\/`/, 'formateur/README : faux — guides/glossaire.md est copié aussi');
});

process.on('exit', () => { for (const p of PROJETS.values()) fs.rmSync(path.dirname(p), { recursive: true, force: true }); });
