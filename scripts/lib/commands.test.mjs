// scripts/lib/commands.test.mjs
// Lot D — les 10 runbooks de `templates/commands/`. Ils sont recopiés TELS QUELS chez l'assistant
// (`.cursor/commands/` · `.claude/commands/` · `docs/commands/`) et dans le plugin Cursor : une
// consigne fausse y atteint l'utilisateur sans filtre, et aucune suite ne la rattrape puisque c'est
// de la prose. Un test par décision du lot, et des gardes exhaustifs PAR CONSTRUCTION (la liste des
// commandes se lit sur le disque) plutôt que par énumération recopiée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { STACKS } from './matrix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cmd = (c) => read(`templates/commands/${c}.md`);
const md = (d) => fs.readdirSync(path.join(ROOT, d)).filter((n) => n.endsWith('.md')).sort();
const COMMANDES = md('templates/commands').map((n) => n.replace(/\.md$/, ''));
// Tous les fichiers de prose que le kit recopie chez l'utilisateur : commandes, règles injectées,
// agents, graines du crew. C'est le périmètre des gardes « orphelins » et « state.yaml ».
const PROSE = () => [
  ...COMMANDES.map((c) => `templates/commands/${c}.md`),
  ...md('templates/agents').map((n) => `templates/agents/${n}`),
  ...md('templates/agents/subagents').map((n) => `templates/agents/subagents/${n}`),
  'templates/journal/JOURNAL.md', 'templates/journal/state.yaml', 'templates/journal/inventaire.md',
];

test('D0 — les 10 commandes du kit sont bien celles que le plugin Cursor embarque', () => {
  assert.equal(COMMANDES.length, 10, `10 commandes attendues, vues : ${COMMANDES.join(', ')}`);
});

test('D1 — /new-feature commite et ouvre la PR avec git/gh, jamais via un plugin non installé', () => {
  const t = cmd('new-feature');
  assert.doesNotMatch(t, /commit-commands/, 'plugin jamais installé par le kit');
  assert.match(t, /git commit/, 'le commit se fait avec git');
  assert.match(t, /gh pr create/, 'la PR s\'ouvre avec gh');
  // Le validateur suivait la faute : il EXIGEAIT la chaîne fantôme.
  assert.doesNotMatch(read('scripts/lib/validate-commands.mjs'), /commit-push-pr/, 'le validateur exige encore le plugin fantôme');
});

test('D2 — /new-feature merge sur `main` : le scaffold ne crée aucune branche `dev`', () => {
  const t = cmd('new-feature');
  assert.doesNotMatch(t, /`dev`/, 'branche inventée');
  assert.match(t, /Merge sur \*\*`main`\*\*/, 'la cible du merge est nommée');
  assert.match(t, /mergé sur \*\*`main`\*\*/i, '« fini » = mergé sur main');
});

test('D3 — /deploy couvre les 4 stacks, pose un gate avant la prod et ne dépend pas d\'un skill Claude Code', () => {
  const t = cmd('deploy');
  for (const s of ['SaaS', 'Mobile', 'Desktop', 'Vitrine']) {
    assert.match(t, new RegExp(`^## ${s}`, 'm'), `section « ${s} » absente`);
  }
  assert.match(t, /Astro/, 'vitrine : le framework');
  assert.match(t, /Keystatic/, 'vitrine : le CMS');
  // Gate : CI verte PROUVÉE (commande + sortie) + sécurité.
  assert.match(t, /gh run watch/, 'CI verte prouvée par une commande');
  assert.match(t, /security-reviewer/, 'gate sécurité avant la prod');
  // Electron : le scaffold du kit est Electron **Forge** (`create-electron-app`, cf.
  // stacks/desktop/AGENTS.md:24) → la commande de build est `npm run make`, pas electron-builder.
  assert.match(t, /npm run make/, 'la commande de build du scaffold desktop du kit');
  // `electron:distribution` n'existe que sur Claude Code → il ne peut pas être la seule voie.
  const ligne = t.split('\n').find((l) => l.includes('electron:distribution'));
  assert.ok(ligne && /Claude Code/.test(ligne), 'la limite du skill electron:distribution n\'est pas dite');
  // Secrets desktop : une app installée chez l'utilisateur ne peut pas embarquer de secret.
  assert.match(t, /jamais de secret|aucun secret/i, 'secrets desktop non traités');
});

test('D4 — /next lit l\'état du projet, ne dit pas « continue » sur un jalon bloqué, et renvoie à /help', () => {
  const t = cmd('next');
  assert.match(t, /docs\/agents\/state\.yaml/, 'l\'état courant n\'est pas lu');
  assert.match(t, /status: blocked/, 'la valeur légale de l\'énumération n\'est pas nommée');
  assert.match(t, /\/help/, 'le catalogue des commandes est le rôle de /help');
  // Contrainte du fichier : 3 lignes de réponse → il ne devient pas un catalogue.
  assert.match(t, /3 lignes maximum/, 'la contrainte de format a disparu');
  const citees = COMMANDES.filter((c) => t.includes(`/${c}`));
  assert.ok(citees.length <= 5, `/next cite ${citees.length} commandes (${citees.join(', ')}) : c'est le rôle de /help`);
});

test('D5 + résiduel 1 — /sos repart sur une branche, lit l\'état, et renvoie à la Règle Preuve', () => {
  const t = cmd('sos');
  assert.match(t, /git switch -c reprise-/, 'un checkout de tag laisse une HEAD détachée → travail perdu');
  assert.doesNotMatch(t, /git checkout <tag>/, 'HEAD détachée');
  assert.match(t, /docs\/agents\/state\.yaml/, 'l\'état courant n\'est pas lu');
  // Résiduel 1 : « règle des 3 essais » n'a jamais existé ; la règle canonique compte des TENTATIVES.
  assert.doesNotMatch(t, /3 essais/, 'ce titre de règle n\'existe pas');
  assert.match(t, /Règle Preuve/, 'la règle canonique n\'est pas nommée');
  assert.match(t, /3 tentatives/, 'le vocabulaire canonique');
});

test('D6 — /doctor vérifie les 10 commandes, la mémoire du crew, le MCP shadcn de desktop et les outils de preuve', () => {
  const t = cmd('doctor');
  for (const c of COMMANDES) assert.match(t, new RegExp(`/${c}\\b`), `/doctor ne vérifie pas la commande /${c}`);
  assert.match(t, /docs\/agents\/JOURNAL\.md/, 'mémoire du crew non vérifiée');
  assert.match(t, /docs\/agents\/state\.yaml/, 'état courant non vérifié');
  assert.match(t, /docs\/agents\/inventaire\.md/, 'inventaire de complétude non vérifié');
  // Le MCP shadcn de desktop : oublié par l'item 9 alors que matrix.mjs le déclare.
  // La 1re version cherchait `shadcn` dans LA LIGNE — or cette ligne porte les 4 stacks, et le
  // `shadcn` de saas la satisfaisait : en remettant « desktop : chrome-devtools » (sans shadcn),
  // elle passait encore. On juge donc le SEGMENT de chaque stack, et la liste attendue est LUE
  // dans matrix.mjs (source de vérité de ce que le kit écrit dans .mcp.json) au lieu d'être
  // recopiée ici : ajouter un serveur à une stack sans l'annoncer à /doctor fait échouer ce test.
  const ligneMcp = t.split('\n').find((l) => /serveurs MCP de la stack/.test(l));
  assert.ok(ligneMcp, 'item 9 : la liste des MCP par stack a disparu');
  const segments = new Map();
  for (const seg of ligneMcp.split(/\s*;\s*/)) {
    const m = seg.match(/(saas|mobile|desktop|vitrine)\s*:/);
    if (m) segments.set(m[1], seg);
  }
  const manquants = [];
  for (const [stack, def] of Object.entries(STACKS)) {
    const seg = segments.get(stack);
    if (!seg) { manquants.push(`${stack} : aucun segment « ${stack} : … » dans l'item 9`); continue; }
    for (const serveur of Object.keys(def.mcp)) {
      if (!seg.includes(serveur)) manquants.push(`${stack} : le MCP « ${serveur} » manque au segment (matrix.mjs le déclare)`);
    }
  }
  assert.deepEqual(manquants, [], `MCP déclarés par matrix.mjs et absents de /doctor :\n${manquants.join('\n')}`);
  // Outils de preuve : /doctor les présentait comme obligatoires sans jamais les tester.
  for (const o of ['semgrep', 'gitleaks', 'osv-scanner']) assert.match(t, new RegExp(o), `outil de preuve non vérifié : ${o}`);
  // Variable inexistante : le MCP Stitch prend la clé en header, il n'y a pas de STITCH_API_KEY.
  assert.doesNotMatch(t, /STITCH_API_KEY/, 'variable d\'environnement inexistante');
});

test('D7 — /build : arguments transmis, E2E délégué, tag annoté ET publié, --all désactivé en apprentissage', () => {
  const t = cmd('build');
  assert.match(t, /\$ARGUMENTS/, 'sans cette ligne, `--all` est perdu sur Cursor');
  assert.match(t, /test-runner/, 'le test E2E est délégué, pas joué dans le fil principal');

  // Le point de restauration doit ARRIVER sur le remote. La 1re version de ce test acceptait
  // `git push --follow-tags|git push --tags` — c'est elle qui a laissé passer la faute, parce que
  // les deux formes ne poussent pas les mêmes tags : `--follow-tags` ne publie QUE les tags
  // ANNOTÉS. Reproduit sur un dépôt jetable + un remote `--bare` : `git tag jalon-01` (léger) puis
  // `git push --follow-tags` → 0 tag sur le remote ; `git tag -a` → « * [new tag] ».
  // On ne cherche donc plus une chaîne : on lit les commandes de la page et on exige que le type
  // de tag posé et la forme du push soient COMPATIBLES.
  const cmds = [...t.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  // La POSE d'un tag = `git tag` avec un argument. `git tag` nu (la phrase qui explique pourquoi
  // un tag léger ne part pas) et `git tag -l` (lister, ce que fait /sos) n'en posent aucun.
  const tags = cmds.filter((c) => /^git tag\s+\S/.test(c) && !/\s(?:-l|--list)\b/.test(c));
  assert.equal(tags.length, 1, `une seule pose de tag attendue dans /build, vue(s) : ${tags.join(' | ') || 'aucune'}`);
  const annote = /\s(?:-a|--annotate)\b/.test(tags[0]) && /\s(?:-m|--message)\b/.test(tags[0]);
  const pushes = cmds.filter((c) => /^git push\b/.test(c));
  const parSuivi = pushes.filter((c) => /--follow-tags\b/.test(c));
  const parTous = pushes.filter((c) => /--tags\b/.test(c) && !/--follow-tags\b/.test(c));
  assert.ok(parSuivi.length || parTous.length,
    `un tag local ne protège personne : aucun push ne publie le tag (push vus : ${pushes.join(' | ') || 'aucun'})`);
  if (parSuivi.length) {
    assert.ok(annote, `« ${tags[0]} » pose un tag LÉGER et « ${parSuivi[0]} » ne pousse que les tags annotés : le tag resterait en local. Tag annoté (\`-a … -m …\`) ou push en \`--tags\`.`);
  }

  // Un projet qui sort du scaffold n'a AUCUN remote : `git push` y répond `fatal: No configured
  // push destination` (reproduit) — et c'est au 1er jalon que le débutant tape la commande.
  // /new-feature traite le cas en préflight (`gh auth status` + `git remote`) ; /build doit le
  // traiter aussi, et dire quoi faire, pas seulement constater.
  const ligneRemote = t.split('\n').find((l) => /git remote\b/.test(l));
  assert.ok(ligneRemote, 'aucun contrôle du remote : au 1er jalon, `git push` échoue sur un `fatal:` que personne n\'explique');
  assert.match(ligneRemote, /gh repo create/, 'le cas « pas de remote » doit dire quoi faire');

  const ligneAll = t.split('\n').find((l) => l.includes('--all') && /désactiv/i.test(l));
  assert.ok(ligneAll, '`--all` doit être annoncé désactivé tant que le mode apprentissage est actif');
});

test('D8 — /help se liste, liste les 10 commandes, et ne donne qu\'une réponse à « je commence par quoi ? »', () => {
  const t = cmd('help');
  for (const c of COMMANDES) assert.match(t, new RegExp(`\\*\\*/${c}\\*\\*`), `/help ne se liste pas : /${c} absent`);
  const aide = t.split('## Aide-mémoire')[1];
  assert.ok(aide, 'section « Aide-mémoire » absente');
  for (const c of COMMANDES) assert.ok(aide.includes(`/${c}`), `aide-mémoire incomplet : /${c} absent`);
  // Une seule réponse : `/help` est l'entrée (aligné avec COLLE-MOI et la sortie console, lot G).
  // La 1re version testait le LIBELLÉ d'hier (`1re commande à taper`) : « c'est la première
  // commande à taper » repassait au vert. On épingle donc la phrase canonique mot pour mot (elle
  // est courte et possédée par le kit), et on refuse qu'une AUTRE ligne désigne une entrée
  // concurrente, quelle qu'en soit la tournure.
  // Limite connue : la désignation se reconnaît à une construction (« 1re/première commande »,
  // « commande à taper », « commence par `/x` »…). Une périphrase qui n'en emploie aucune
  // (« si tu ne dois en retenir qu'une, c'est `/init-vibecoding` ») passerait — c'est le plafond
  // d'un test sur de la prose, pas un correctif oublié ; l'égalité ci-dessus force la relecture
  // dès qu'on touche à la phrase canonique.
  const REPONSE_UNIQUE = '**Une seule réponse à « je commence par quoi ? » : `/help`**';
  assert.ok(t.includes(REPONSE_UNIQUE), `/help doit porter la phrase canonique, mot pour mot : ${REPONSE_UNIQUE}`);
  const DESIGNE_UNE_ENTREE = /(?:1re|1ère|1ere|premi(?:er|ère))s?\s+(?:commande|chose)|commande\s+à\s+taper|(?:commenc|démarr|début)\w*\s+par\s+[`/]|à\s+taper\s+(?:en\s+premier|d['’]abord)|par\s+où\s+(?:commencer|démarrer)/i;
  // On RETIRE la phrase canonique de sa ligne au lieu d'exempter la ligne entière : sinon une
  // entrée concurrente écrite juste après elle, sur la même ligne, échappait au contrôle — cas
  // que la version d'avant attrapait et que l'exemption en bloc avait perdu.
  const concurrentes = t.split('\n')
    .map((l, i) => [i + 1, l.replace(REPONSE_UNIQUE, '').trim()])
    .filter(([, l]) => l && DESIGNE_UNE_ENTREE.test(l))
    .map(([n, l]) => `help.md:${n} — ${l.slice(0, 100)}`);
  assert.deepEqual(concurrentes, [], `deux réponses concurrentes à « par quoi je commence ? » :\n${concurrentes.join('\n')}`);
});

// D7bis — les messages d'erreur cités dans les runbooks sont EXÉCUTÉS, jamais crus sur parole.
// Ce test naît d'une faute réelle : `/build` annonçait `fatal: No configured push destination`
// pour la commande qu'il prescrit, alors que git répond `fatal: 'origin' does not appear to be
// a git repository` — le premier message vient d'un `git push` NU. Citation exacte, mais d'une
// autre commande. Un débutant qui lit un message qu'on ne lui a pas annoncé se croit hors-piste.
//
// PORTÉE, telle qu'elle est (une revue a montré que la 1re version promettait plus qu'elle ne
// tenait, et repassait au vert si la citation perdait ses backticks) : TOUS les runbooks, TOUTES
// les citations `fatal: …` — avec ou sans backticks — et l'égalité EXACTE de la ligne, pas un
// préfixe (sinon `fatal: '` suffirait). L'environnement git est isolé (`GIT_CONFIG_GLOBAL`,
// `GIT_CONFIG_SYSTEM`) : une config personnelle (`commit.gpgsign`, `core.hooksPath`) ne peut ni
// verdir ni rougir le test.
// LIMITE ASSUMÉE : on ne rejoue que les commandes `git push …` que la page cite elle-même, dans
// le cas « pas de remote » (celui du projet qui sort du scaffold). Une page qui citerait un
// `fatal:` produit par une autre commande, ou dans un autre état du dépôt, n'est pas vérifiable
// ici — elle est signalée comme telle plutôt que passée sous silence.
test('D7bis — tout message d\'erreur cité par un runbook est bien celui que git produit', () => {
  const CITATION = /`?(fatal: [^`\n]+?)`?(?=\s*(?:[—.,)]|$))/g;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-push-'));
  // Environnement neutre : ni config globale, ni config système, ni hooks de la machine.
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args) => spawnSync('git', args, { cwd: tmpDir, encoding: 'utf8', env });
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'test']);
  fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'x');
  git(['add', '-A']);
  const c = git(['commit', '-qm', 'init']);
  assert.equal(c.status, 0, `le dépôt de contrôle n'a pas pu être préparé : ${c.stderr}`);

  const fautes = [];
  for (const c of COMMANDES) {
    const t = cmd(c);
    const citees = [...t.matchAll(CITATION)].map((m) => m[1].trim());
    if (!citees.length) continue;
    const pushs = [...t.matchAll(/`(git push[^`\n]*)`/g)].map((m) => m[1]);
    if (!pushs.length) {
      fautes.push(`${c}.md cite ${citees.length} erreur(s) git mais aucune commande \`git push …\` : invérifiable`);
      continue;
    }
    // Ce que ces commandes produisent VRAIMENT, sans remote — le cas décrit par les pages.
    const produites = new Set();
    for (const p of pushs) {
      const r = git(p.split(/\s+/).slice(1));
      `${r.stderr}${r.stdout}`.split('\n').forEach((l) => { if (l.trim().startsWith('fatal:')) produites.add(l.trim()); });
    }
    for (const cite of citees) {
      if (!produites.has(cite)) {
        fautes.push(`${c}.md annonce « ${cite} »\n    or ${pushs.map((p) => `\`${p}\``).join(' / ')} sans remote répond${produites.size ? ' :\n      ' + [...produites].join('\n      ') : ' sans aucune ligne fatal:'}`);
      }
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.deepEqual(fautes, [], `messages d'erreur annoncés mais jamais produits :\n${fautes.join('\n')}\n\n`
    + 'Cite le message de LA commande que la page prescrit, ou change la commande.');
});

// La comparaison d'images ALERTE, elle ne tranche pas. La 1re version ne portait qu'une liste
// noire de trois tournures (« avant de conclure », « avant de la rendre », « jusqu'à ce que ») :
// « PixelRAG doit confirmer » passait. Une liste noire de formulations est une course perdue
// (c'est la leçon du Lot C) — on lui ajoute donc une exigence POSITIVE, qui ne dépend d'aucune
// formulation de la faute : toute ligne qui cite PixelRAG doit porter, en clair, ce qu'il n'est
// pas. Limite assumée : les deux filets restent des motifs. Une ligne qualifiée PUIS démentie
// plus loin dans le paragraphe (« … elle ne tranche pas. Coche quand l'écart est nul. ») les
// satisfait — seule la relecture couvre ce cas.
const PIXELRAG_BLOQUANT = /avant de conclure|avant de la rendre|jusqu'à ce que|doit (?:confirmer|valider|approuver|passer)|tant qu[e']|bloqu|gate|exige/i;
const PIXELRAG_QUALIFIE = /alerte,? (?:elle|il) ne tranche pas|ne remplace pas|signal indicatif|non bloquant|jamais un gate/i;
test('D9 — PixelRAG alerte, il ne décide pas (dans les commandes comme dans les règles)', () => {
  for (const c of COMMANDES) {
    cmd(c).split('\n').forEach((l, i) => {
      if (!/PixelRAG/i.test(l)) return;
      const ou = `templates/commands/${c}.md:${i + 1}`;
      assert.doesNotMatch(l, PIXELRAG_BLOQUANT, `${ou} : PixelRAG rendu bloquant`);
      assert.match(l, PIXELRAG_QUALIFIE, `${ou} : PixelRAG cité sans dire qu'il alerte et ne tranche pas — non qualifié, il se lit comme un juge`);
    });
  }
});

test('D9 — l\'inventaire de complétude est cité par son chemin, aux deux endroits qui s\'en servent', () => {
  const t = cmd('new-project');
  const lignes = t.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /inventaire/i.test(l));
  assert.ok(lignes.length >= 2, 'l\'inventaire est produit puis relu : deux mentions au moins');
  const sansChemin = lignes.filter(([, l]) => !l.includes('docs/agents/inventaire.md'));
  assert.deepEqual(sansChemin.map(([n]) => `new-project.md:${n}`), [], 'inventaire cité sans son chemin');
});

test('D9 — le registry @shadcnblocks n\'est pas utilisé en Phase 5 alors qu\'il n\'existe qu\'en Phase 7', () => {
  const t = cmd('new-project');
  const p5 = t.slice(t.indexOf('## Phase 5'), t.indexOf('## Phase 6'));
  const p7 = t.slice(t.indexOf('## Phase 7'));
  assert.ok(p5.length > 0 && p7.length > 0, 'phases introuvables');
  assert.doesNotMatch(p5, /npx shadcn add @shadcnblocks/, 'appel au registry avant son ajout à components.json (Phase 7)');
  assert.match(p7, /@shadcnblocks/, 'le registry doit rester documenté là où il est ajouté');
});

test('D9 — les templates PRD et architecture vivent dans templates/ et arrivent dans le projet', () => {
  for (const f of ['templates/prd/PRD.md', 'templates/specs/architecture.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), `template absent : ${f}`);
  }
  const t = cmd('new-project');
  assert.match(t, /docs\/templates\/PRD\.md/, 'le runbook ne dit pas où lire le template PRD');
  assert.match(t, /docs\/templates\/architecture\.md/, 'le runbook ne dit pas où lire le template architecture');
  const lignes = t.split('\n').length;
  assert.ok(lignes <= 175, `new-project.md fait encore ${lignes} lignes (les templates devaient sortir du runbook)`);
  // Le contenu déplacé n'a pas disparu : il est intégralement dans les templates.
  const prd = read('templates/prd/PRD.md');
  for (const s of ['Métriques de succès', 'Non-objectifs', 'Index des hypothèses', 'Jobs To Be Done', 'UJ-1', 'FR-1']) {
    assert.match(prd, new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `template PRD : « ${s} » perdu`);
  }
  const archi = read('templates/specs/architecture.md');
  for (const s of ['Invariants', 'Graine structurelle', 'AD-1', 'Mermaid']) {
    assert.match(archi, new RegExp(s), `template architecture : « ${s} » perdu`);
  }
});

test('D10 — le plugin Cursor est le reflet exact des 10 commandes du kit', () => {
  for (const c of COMMANDES) {
    assert.equal(read(`cursor-plugin/commands/${c}.md`), cmd(c), `cursor-plugin/commands/${c}.md a dérivé — relance node scripts/build-cursor-plugin.mjs`);
  }
});

test('D10 — aucune commande ne renvoie à quelque chose qui n\'existe pas', () => {
  const INTERDITS = [
    [/commit-commands/, 'plugin jamais installé par le kit'],
    [/3 essais/, 'la règle canonique s\'appelle « Règle Preuve » et compte des tentatives'],
    [/`dev`/, 'le scaffold ne crée que `main`'],
    [/STITCH_API_KEY/, 'variable d\'environnement inexistante'],
    // @garde-orphelins — les deux motifs qui suivent sont aussi traqués par A9
    // (`degraissage.test.mjs`) dans tout le dépôt : ce marqueur dit qu'ici ce sont des
    // détecteurs, pas des références. Sans lui, A9 échoue au moment du commit — et pas avant,
    // puisqu'il lit `git ls-files` et ne voit pas un fichier encore non suivi.
    [/\/debug\b/, 'commande supprimée au Lot A'],
    [/docs\/ONBOARDING\.md/, 'fichier supprimé au Lot A'],
  ];
  const restes = [];
  for (const c of COMMANDES) {
    cmd(c).split('\n').forEach((l, i) => {
      for (const [m, why] of INTERDITS) if (m.test(l)) restes.push(`templates/commands/${c}.md:${i + 1} — ${why} : ${l.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(restes, [], `références orphelines :\n${restes.join('\n')}`);
});

// Résiduel 2 — `docs/agents/state.yaml` porte une énumération de statuts déclarée en tête du
// fichier, et il a UN écrivain. Deux fautes distinctes sont passées par la même ligne de /build :
// un statut hors énumération (`BLOQUÉ`, qui est un VERDICT, pas une valeur du fichier), et un
// second écrivain alors que `verify-rule.md:15` donne le report au `verificateur` seul.
test('résiduel 2 — state.yaml : un seul écrivain, et jamais un statut hors énumération', () => {
  const entete = read('templates/journal/state.yaml').match(/^status:[^#]*#\s*(.+)$/m);
  assert.ok(entete, 'l\'énumération des statuts doit être déclarée en tête de state.yaml');
  const ENUM = entete[1].split('|').map((s) => s.trim());
  assert.deepEqual(ENUM, ['draft', 'in-progress', 'in-review', 'done', 'blocked']);

  // (a) Personne ne demande d'y écrire une valeur qui n'est pas dans l'énumération.
  // DEUX filets, parce que la 1re version n'en avait qu'un — la tournure « en `X` dans …
  // state.yaml » — et qu'une seule tournure ne garde rien : « passe le `status` à `BLOQUÉ` dans
  // state.yaml » lui échappait, alors que c'est exactement la faute d'origine. Le second ne
  // dépend d'aucune tournure : sur une ligne qui parle de ce fichier ET nomme son champ `status`,
  // un mot de VERDICT entre accents graves est une valeur illégale, quelle que soit la phrase.
  // (Il ne se déclenche pas sur `verify-rule.md:15`, qui cite `PROUVÉ` et le fichier sans jamais
  // parler du champ : cette ligne-là dit qui reporte, elle ne dicte aucune valeur.)
  // LIMITE, à connaître : une ligne qui n'emploie NI la tournure du 1er filet NI le nom du champ
  // (« note `BLOQUÉ` dans `docs/agents/state.yaml` ») échappe aux deux. Aucun ensemble fermé de
  // motifs ne caractérise « cette phrase dicte une valeur » — la relecture reste le filet sur ce
  // cas, comme pour R3 de `crew.test.mjs`.
  const VERDICTS = ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ'];
  const horsEnum = [];
  for (const f of PROSE()) {
    read(f).split('\n').forEach((l, i) => {
      if (!l.includes('state.yaml')) return;
      for (const m of l.matchAll(/en `([^`]+)` dans [^\n]*state\.yaml/g)) {
        if (!ENUM.includes(m[1])) horsEnum.push(`${f}:${i + 1} — « ${m[1]} » hors énumération`);
      }
      if (!/\bstatus\b/.test(l)) return;
      for (const m of l.matchAll(/`([^`]+)`/g)) {
        if (VERDICTS.includes(m[1].trim())) horsEnum.push(`${f}:${i + 1} — « ${m[1]} » est un VERDICT, pas une valeur du champ status`);
      }
    });
  }
  assert.deepEqual(horsEnum, [], `statut hors énumération :\n${horsEnum.join('\n')}`);

  // (b) Un seul écrivain. `verify-rule` le NOMME (elle n'écrit pas), `verificateur` l'EST.
  const ORDRE = /(reporte|écris|inscris|passe-le en|mets à jour|note)\b[^.]*state\.yaml/i;
  const ecrivains = new Set();
  for (const f of PROSE()) for (const l of read(f).split('\n')) if (ORDRE.test(l)) ecrivains.add(f);
  assert.deepEqual([...ecrivains].sort(), [
    'templates/agents/subagents/verificateur.md',
    'templates/agents/verify-rule.md',
  ], 'second écrivain de state.yaml');

  // (c) `/build` doit NOMMER le propriétaire au lieu d'écrire lui-même.
  assert.match(cmd('build'), /seul écrivain de `docs\/agents\/state\.yaml`/, '/build ne dit pas qui possède le fichier');
  // (d) …et le fichier lui-même le dit, là où vit l'énumération.
  assert.match(read('templates/journal/state.yaml'), /[Ss]eul écrivain\s*:\s*le sous-agent `verificateur`/, 'state.yaml ne déclare pas son propriétaire');
});
