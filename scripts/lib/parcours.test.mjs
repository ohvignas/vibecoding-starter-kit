// scripts/lib/parcours.test.mjs — Lot G : le PREMIER CONTACT.
// `COLLE-MOI-DANS-L-IA.md`, `docs/A-FAIRE.md` et la sortie console sont lus AVANT que
// l'utilisateur sache quoi que ce soit du kit. Une instruction inapplicable y coûte plus cher
// qu'ailleurs : il n'a aucun moyen de savoir que c'est le kit qui a tort, il croira que c'est lui.
// D'où des tests qui jouent les 12 combinaisons (4 stacks × 3 assistants) sur le rendu réel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderColleMoi } from './colle-moi.mjs';
import { renderSetupAi } from './setup-ai.mjs';
import { renderAgentsFile, adapterAuMobile } from './agents-file.mjs';
import { formatReport } from './report.mjs';
import { COMMANDS, COMMANDS_DIR, refCommande, cheminEtape, etapesDuRunbook, fichiersDuRunbook } from './commands-list.mjs';
import { resolveStackManifest, MCP_CONNECT, SUPERPOWERS, VERIF_TOOLS_NOTE } from './matrix.mjs';
import { validateArgs } from './args.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETUP = path.join(ROOT, 'scripts', 'setup.mjs');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@vibecoding.local',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@vibecoding.local',
};
const STACKS = ['saas', 'mobile', 'desktop', 'vitrine'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];
// Le NOM commercial de chaque assistant, tel qu'il apparaîtrait dans une note écrite pour lui.
const LABELS = { cursor: /\bCursor\b/, 'claude-code': /\bClaude Code\b/, codex: /\bCodex\b/ };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
// `stack` est OBLIGATOIRE pour `renderColleMoi` depuis que le prompt diffère sur un projet
// ADOPTÉ (`aucune`) : une valeur par défaut dans la FONCTION aurait fait retomber un appelant
// distrait sur `/new-project`. Ce fichier couvre le parcours NEUF, d'où le défaut `saas` ICI —
// le rendu adopté a son propre garde (`adoption.test.mjs`).
const colleMoi = (assistant, skillsInstalled = true, stack = 'saas') => renderColleMoi({ assistant, stack, skillsInstalled }).join('\n');
const aFaire = (stack, assistant, skillsInstalled = true) => renderSetupAi({
  stack, assistant, manifest: resolveStackManifest(stack, assistant),
  superpowersCmd: SUPERPOWERS[assistant], skillsInstalled,
});
const agentsMd = (stack, assistant = 'cursor') => renderAgentsFile({ source: ROOT, stack, assistant, commandsDir: COMMANDS_DIR[assistant] });
// Les étapes de tous les runbooks découpés — dérivées de la source unique, jamais recopiées ici.
// Un renvoi du premier contact vers une étape se vérifie contre CETTE liste : « Phase 7 » ne se
// vérifiait contre rien, et c'est précisément pour ça qu'il a survécu au découpage.
const ETAPES = () => new Set(COMMANDS.flatMap((c) => etapesDuRunbook(ROOT, c)));
const ETAPE_CITEE = /`(\d\d-[\w-]+\.md)`/g;

// Un projet scaffoldé pour de vrai, partagé par les tests qui vérifient une PROMESSE
// (« ce fichier existe », « ce registry est posé ») : la seule façon de ne pas se payer de mots.
let PROJET;
const scaffold = () => {
  if (PROJET) return PROJET;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-parcours-'));
  const proj = path.join(dir, 'app');
  execFileSync(process.execPath, [SETUP, proj, '--source', ROOT, '--stack', 'saas', '--assistant', 'cursor', '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
  PROJET = proj;
  return proj;
};

test('G1 — COLLE-MOI : le geste MCP est celui de l\'assistant, et le même que docs/A-FAIRE.md', () => {
  for (const a of ASSISTANTS) {
    const prompt = colleMoi(a);
    assert.ok(prompt.includes(MCP_CONNECT[a].court), `${a} : le prompt doit porter SON geste MCP (« ${MCP_CONNECT[a].court} »)`);
    // …et docs/A-FAIRE.md doit dire la même chose : c'est le fichier vers lequel le prompt renvoie.
    assert.ok(aFaire('saas', a).includes(MCP_CONNECT[a].long), `${a} : A-FAIRE doit porter le même geste`);
  }
  // `/mcp` n'existe que chez Claude Code. Cursor passe par Settings → MCP, Codex recopie .mcp.json.
  for (const a of ['cursor', 'codex']) {
    assert.doesNotMatch(colleMoi(a), /\/mcp\b/, `${a} : /mcp n'existe pas — instruction inapplicable`);
    assert.doesNotMatch(aFaire('saas', a), /lance `\/mcp`/, `${a} : A-FAIRE ne doit pas imposer /mcp`);
  }
  assert.match(colleMoi('claude-code'), /`\/mcp`/, 'claude-code : /mcp reste la bonne instruction');
});

test('G2 — Codex : le premier contact ne lui demande jamais de « lancer » un runbook', () => {
  const prompt = colleMoi('codex');
  const setup = aFaire('saas', 'codex');
  for (const cmd of COMMANDS) {
    const slash = new RegExp(`(^|[^\\w./-])/${cmd}\\b`);
    assert.doesNotMatch(prompt, slash, `COLLE-MOI Codex : « /${cmd} » n'est pas exécutable chez Codex`);
    assert.doesNotMatch(setup, slash, `A-FAIRE Codex : « /${cmd} » n'est pas exécutable chez Codex`);
  }
  // …et il doit dire QUOI faire à la place : ouvrir le fichier du runbook.
  for (const [nom, txt] of [['COLLE-MOI', prompt], ['A-FAIRE', setup]]) {
    assert.match(txt, /docs\/commands\/\w[\w-]*\.md/, `${nom} Codex : le fichier du runbook doit être nommé`);
    assert.match(txt, /ouvre/i, `${nom} Codex : dire d'ouvrir le fichier`);
  }
  // Les deux autres assistants gardent bien leurs slash-commands.
  for (const a of ['cursor', 'claude-code']) {
    assert.match(colleMoi(a), /\/help\b/, `${a} : /help est une vraie commande`);
    assert.match(colleMoi(a), /\/new-project\b/, `${a} : /new-project est une vraie commande`);
  }
});

test('G3 — /init-vibecoding dicte les valeurs EXACTES de --assistant (jouées, exit 0)', () => {
  // `/init-vibecoding` est découpé : la commande de scaffold et ses valeurs littérales vivent dans
  // l'étape `02-…`. Ne lire que l'entrée ferait échouer la RECHERCHE du motif, et le jour où elle
  // reviendrait dans l'entrée sous une autre forme, on validerait deux dictées concurrentes. On lit
  // donc le runbook entier, énuméré depuis `commands-list.mjs` — et on exige qu'il n'en dicte
  // qu'UNE (deux réponses différentes à « quelles valeurs ? » se contrediraient chez le débutant).
  const fichiers = fichiersDuRunbook(ROOT, 'init-vibecoding');
  assert.ok(fichiers.length >= 6, `montage : ${fichiers.length} fichier(s) — le runbook découpé n'est pas lu en entier`);
  const rb = fichiers.map((f) => read(f)).join('\n');
  assert.equal([...rb.matchAll(/<assistant>\s*=\s*[^\n]+/g)].length, 1, '/init-vibecoding doit dicter les valeurs de <assistant> une seule fois');
  const m = /<assistant>\s*=\s*([^\n]+)/.exec(rb);
  assert.ok(m, 'init-vibecoding doit énoncer les valeurs de <assistant> (« <assistant> = … »)');
  const valeurs = m[1].split('|').map((v) => v.trim().replace(/[`*]/g, '')).filter(Boolean);
  assert.deepEqual(valeurs, ASSISTANTS, 'les valeurs dictées doivent être celles du CLI');
  // Le test JOUE ce qui est dicté : chaque valeur doit passer la validation du CLI.
  for (const v of valeurs) {
    assert.deepEqual(validateArgs({ stack: 'saas', assistant: v, project: 'x' }), [], `--assistant ${v} refusé par le CLI`);
  }
  // Et la commande complète du runbook doit vraiment scaffolder : exit 0, projet créé.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-init-'));
  try {
    const proj = path.join(dir, 'app');
    execFileSync(process.execPath, [SETUP, '--stack', 'saas', '--assistant', valeurs[1], '--project', proj, '--source', ROOT, '--no-skills', '--yes'], { cwd: ROOT, stdio: 'pipe', env: GIT_ENV });
    assert.ok(fs.existsSync(path.join(proj, 'AGENTS.md')), 'le scaffold dicté doit produire un projet');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('G4 — mobile : aucune imposition shadcn dans les règles relues à chaque message ni dans A-FAIRE', () => {
  const md = agentsMd('mobile');
  assert.doesNotMatch(md, /npx shadcn add/, 'AGENTS.md mobile : shadcn ne tourne pas en React Native');
  assert.doesNotMatch(md, /SHADCNBLOCKS_API_KEY/, 'AGENTS.md mobile : aucune clé de blocs web');
  assert.doesNotMatch(md, /shadcn\/ui \+ Tailwind d'abord/, 'AGENTS.md mobile : la consigne « shadcn d\'abord » ne s\'applique pas');
  assert.doesNotMatch(md, /tweakcn/, 'AGENTS.md mobile : un thème shadcn/CSS ne s\'intègre pas en RN');
  assert.match(md, /NativeWind/, 'AGENTS.md mobile : dire ce qu\'on utilise À LA PLACE');

  const setup = aFaire('mobile', 'cursor');
  assert.doesNotMatch(setup, /npx shadcn add/, 'A-FAIRE mobile : aucun bloc web à installer');
  assert.doesNotMatch(setup, /SHADCNBLOCKS_API_KEY/, 'A-FAIRE mobile : aucune clé de blocs web');
  assert.match(setup, /NativeWind/, 'A-FAIRE mobile : dire ce qu\'on utilise à la place');

  // Les stacks web, elles, gardent les blocs : la correction ne doit pas tout raser.
  for (const s of ['saas', 'desktop', 'vitrine']) {
    assert.match(agentsMd(s), /npx shadcn add/, `${s} : les blocs restent`);
    assert.match(aFaire(s, 'cursor'), /npx shadcn add @shadcnblocks/, `${s} : A-FAIRE garde les blocs`);
  }
});

test('G4bis — l\'adaptation mobile refuse de devenir sans effet', () => {
  // Une substitution qui ne trouve plus sa phrase laisserait revenir « shadcn d'abord » en
  // silence, dans le fichier relu à chaque message. Elle doit échouer bruyamment, en nommant
  // le fichier à corriger.
  assert.throws(
    () => adapterAuMobile({ designRule: 'texte sans rapport', cssMaquetteRule: 'texte sans rapport' }),
    /templates\/agents\/design-rule\.md/,
    'phrase source disparue → erreur nommant le fichier',
  );
  // …et elle change vraiment quelque chose quand elle s'applique (sinon le vert ne prouve rien).
  const brut = { designRule: read('templates/agents/design-rule.md'), cssMaquetteRule: read('templates/agents/css-maquette-rule.md') };
  const adapte = adapterAuMobile({ ...brut });
  assert.notEqual(adapte.designRule, brut.designRule, 'la règle design doit être modifiée');
  assert.notEqual(adapte.cssMaquetteRule, brut.cssMaquetteRule, 'la règle CSS doit être modifiée');
});

test('G5 — les promesses de docs/A-FAIRE.md sont tenues dans le projet généré', () => {
  const proj = scaffold();
  const setup = fs.readFileSync(path.join(proj, 'docs/A-FAIRE.md'), 'utf8');

  // 1. `components.json` : le scaffold n'en crée AUCUN — la promesse « ajouté au scaffold » était fausse.
  assert.equal(fs.existsSync(path.join(proj, 'components.json')), false, 'montage : le scaffold ne crée pas de components.json');
  assert.doesNotMatch(setup, /est ajouté à `components\.json` au scaffold/, 'promesse fausse : rien ne pose ce registry au scaffold');
  // GARDE DE MONTAGE, RÉ-ANCRÉE. La ligne ci-dessus VERROUILLE une promesse faite à l'utilisateur
  // sans jamais vérifier qu'elle est tenue. Elle disait « Phase 7 » — et exigeait un titre
  // « ## Phase 7 » dans le runbook. Deux défauts : (1) un numéro de phase ne désigne AUCUN
  // fichier, donc l'utilisateur à qui on le sert n'a rien à ouvrir ; (2) le découpage a défait la
  // correspondance phase↔étape (la Phase 3 et la Phase 4 partageaient l'étape `03-…`), si bien
  // qu'un titre pouvait rester vrai pendant que le renvoi devenait faux.
  // On ancre donc sur ce qui EXISTE : le fichier d'étape. A-FAIRE doit nommer l'étape qui pose le
  // registry ; cette étape doit être une vraie étape de `/new-project` ; et son texte doit
  // vraiment porter la promesse (`components.json`) — sinon le renvoi vise le mauvais fichier.
  const ligneRegistry = setup.split('\n').find((l) => l.includes('components.json'));
  assert.ok(ligneRegistry, 'A-FAIRE doit dire OÙ le registry se déclare');
  ETAPE_CITEE.lastIndex = 0;
  const citee = ETAPE_CITEE.exec(ligneRegistry);
  ETAPE_CITEE.lastIndex = 0;
  assert.ok(citee, `dire QUAND le registry est posé, en nommant l'étape de /new-project — vu : « ${ligneRegistry.trim()} »`);
  const etapesNP = etapesDuRunbook(ROOT, 'new-project');
  assert.ok(etapesNP.includes(citee[1]), `A-FAIRE renvoie à « ${citee[1]} », qui n'est pas une étape de /new-project (${etapesNP.join(' · ')})`);
  assert.match(read(cheminEtape('new-project', citee[1])), /components\.json/,
    `l'étape « ${citee[1]} » citée par A-FAIRE ne parle pas de components.json : le renvoi vise le mauvais fichier`);

  // 2. Le glossaire n'est jamais copié dans le projet : y renvoyer est un renvoi mort.
  assert.equal(fs.existsSync(path.join(proj, 'guides/glossaire.md')), false, 'montage : aucun glossaire dans le projet');
  assert.doesNotMatch(setup, /glossaire/i, 'renvoi mort : le glossaire n\'existe pas dans le projet généré');

  // 3. Aucun `package.json` à ce stade : la section 6 doit le dire, pas le supposer.
  assert.equal(fs.existsSync(path.join(proj, 'package.json')), false, 'montage : le scaffold ne crée pas de package.json');
  assert.match(setup, /## 6\..*\n?/, 'la section scripts existe');
  assert.match(setup, /Aucun `package\.json`/, 'section 6 : dire qu\'il n\'y en a pas encore');

  // 4. Stitch : les skills installés ne rendent pas Stitch utilisable (clé + MCP restent à faire).
  const stitch = aFaire('saas', 'claude-code', true);
  assert.doesNotMatch(stitch, /- ✅ skills Stitch déjà installés par le wizard \(generate-design · extract-html · loop · design-md\)\.$/m, 'promesse trop large : Stitch n\'est pas prêt pour autant');
  assert.match(stitch, /clé API Stitch/, 'la clé reste à créer');
  assert.match(stitch, /MCP Stitch au niveau utilisateur/, 'le MCP reste à brancher');
});

test('G6 — la sortie console et COLLE-MOI désignent la MÊME entrée : /help', () => {
  for (const a of ASSISTANTS) {
    const out = formatReport({ project: 'app', stack: 'saas', assistant: a, done: [], kept: [], inAssistant: [], skipped: [], failed: [] });
    assert.ok(out.includes(refCommande(a, 'help')), `${a} : la console doit renvoyer vers l'aide-mémoire`);
    assert.doesNotMatch(out, /lance \/new-project/, `${a} : plus de « lance /new-project » (l'entrée, c'est /help)`);
    assert.ok(colleMoi(a).includes(refCommande(a, 'help')), `${a} : COLLE-MOI aussi`);
  }
});

test('G7 — les outils de vérification sont annoncés OPTIONNELS, avec ce qu\'on perd sans eux', () => {
  assert.match(VERIF_TOOLS_NOTE, /optionnel/i, 'rien ne les installe : le dire');
  assert.match(VERIF_TOOLS_NOTE, /NON PROUVÉ/, 'dire ce qu\'on perd : l\'agent sécurité ne peut rien prouver');
  const setup = aFaire('saas', 'cursor');
  const titre = setup.split('\n').find((l) => l.startsWith('### Outils de preuve'));
  assert.ok(titre, 'la section existe');
  assert.match(titre, /optionnel/i, 'le titre de section le dit aussi');
  // /doctor ne doit pas exiger un item OPTIONNEL pour rendre son verdict « prêt ».
  // Le contrôle épinglait la forme littérale `si TOUT est ✓ (1 à 17)` — la faute exacte corrigée
  // par `d049e7c`, et rien d'autre. Depuis, le verdict s'écrit « de 1 à N » en gras : le
  // `doesNotMatch` ne pouvait plus rien rencontrer, et une renumérotation le périmait de toute
  // façon (mesuré : avec un 18ᵉ item ajouté et un verdict passé à « de 1 à 18 » — qui exige donc
  // bien l'item optionnel — ce test restait vert). On ne fige donc plus une chaîne : on lit le
  // NUMÉRO de l'item « Outils de preuve » et la borne de la plage bloquante, et on exige que le
  // premier soit HORS de la seconde. (`commands.test.mjs` D6ter tient l'autre bout : tout item
  // hors plage doit être déclaré optionnel par le verdict.)
  const doctor = read('templates/commands/doctor.md');
  const outils = doctor.split('\n').find((l) => /^\d+\. \*\*Outils de preuve \(optionnels/.test(l));
  assert.ok(outils, 'doctor : l\'item « Outils de preuve » doit rester annoncé optionnel');
  const plage = Number(doctor.match(/de 1 à \*{0,2}(\d+)/)?.[1]);
  assert.ok(plage, 'doctor : le verdict ne dit plus jusqu\'où va la plage bloquante');
  const n = Number(outils.match(/^(\d+)\./)[1]);
  assert.ok(n > plage, `doctor : le verdict exige l'item ${n}, qui est optionnel (plage bloquante « de 1 à ${plage} »)`);
});

test('G8 — les 12 combinaisons : rien d\'inapplicable dans le premier contact', () => {
  let vues = 0;
  const etapes = ETAPES();
  assert.ok(etapes.size >= 9, `montage : ${etapes.size} étape(s) connue(s) — sans étape, « le renvoi existe » est vrai à vide`);
  for (const stack of STACKS) {
    for (const assistant of ASSISTANTS) {
      vues++;
      const textes = { 'COLLE-MOI': colleMoi(assistant, true, stack), 'A-FAIRE': aFaire(stack, assistant), 'AGENTS.md': agentsMd(stack, assistant) };
      for (const [nom, txt] of Object.entries(textes)) {
        const ou = `${stack}/${assistant} · ${nom}`;
        if (assistant !== 'claude-code') assert.doesNotMatch(txt, /lance `?\/mcp`?/, `${ou} : /mcp inapplicable`);
        if (assistant !== 'claude-code') assert.doesNotMatch(txt, /claude mcp add/, `${ou} : CLI Claude Code inapplicable`);
        if (stack === 'mobile') assert.doesNotMatch(txt, /npx shadcn add/, `${ou} : shadcn ne tourne pas en React Native`);
        // Un renvoi vers une ÉTAPE de runbook doit être ouvrable. « Phase 5 » / « Phase 7 » ne
        // désignaient aucun fichier du projet généré — l'utilisateur à qui on les servait n'avait
        // rien à ouvrir, et rien ne rougissait quand la promesse devenait fausse. On exige le nom
        // du fichier, et que ce fichier soit une étape réelle.
        assert.doesNotMatch(txt, /\bphases?\s+\d/i, `${ou} : « Phase N » ne désigne aucun fichier du projet généré`);
        for (const [, e] of txt.matchAll(ETAPE_CITEE)) {
          assert.ok(etapes.has(e), `${ou} : renvoi mort vers l'étape « ${e} »`);
        }
        // Le dossier de commandes cité doit être celui de l'assistant, jamais celui d'un autre.
        // Idem pour le NOM de l'assistant : une note écrite pour Cursor lue par un utilisateur
        // Codex, c'est une consigne qu'il ne peut ni suivre ni réfuter.
        for (const autre of ASSISTANTS.filter((x) => x !== assistant)) {
          if (nom === 'AGENTS.md') continue; // AGENTS.md liste les 3 dossiers à dessein (projet portable)
          assert.ok(!txt.includes(`${COMMANDS_DIR[autre]}/`), `${ou} : renvoie vers le dossier de ${autre}`);
          assert.doesNotMatch(txt, LABELS[autre], `${ou} : parle de ${autre} à un utilisateur ${assistant}`);
        }
      }
      // Codex : aucun des 10 runbooks ne lui est présenté comme une commande.
      if (assistant === 'codex') {
        for (const cmd of COMMANDS) {
          for (const nom of ['COLLE-MOI', 'A-FAIRE']) {
            assert.doesNotMatch(textes[nom], new RegExp(`(^|[^\\w./-])/${cmd}\\b`), `${stack}/codex · ${nom} : /${cmd} inapplicable`);
          }
        }
      }
    }
  }
  assert.equal(vues, 12, 'les 12 combinaisons doivent être exercées');
});

test('G8bis — le COLLE-MOI écrit par le scaffold est bien celui qu\'on teste', () => {
  const proj = scaffold();
  const fichier = fs.readFileSync(path.join(proj, 'COLLE-MOI-DANS-L-IA.md'), 'utf8');
  // Sans cette égalité, les tests ci-dessus pourraient être verts sur un rendu que setup.mjs
  // n'utilise pas (le Lot E a eu un test vert parce que le fichier attendu n'existait pas).
  assert.ok(fichier.includes(colleMoi('cursor', false)), 'le fichier écrit doit contenir le rendu de renderColleMoi');
  assert.match(fichier, /^# À coller dans ton assistant IA$/m, 'en-tête du fichier');
});

process.on('exit', () => { if (PROJET) fs.rmSync(path.dirname(PROJET), { recursive: true, force: true }); });
