// scripts/lib/crew.test.mjs
// Lot C — les 7 sous-agents (templates/agents/subagents/) et le journal (templates/journal/).
// Ils sont recopiés dans le dossier d'agents de chaque assistant et ne voient NI AGENTS.md NI
// CLAUDE.md : tout ce qu'ils doivent respecter est écrit dans leur propre fichier. Un fichier qui
// ordonne ce que les droits de l'agent interdisent est une contradiction que rien ne rattrape.
// Un test par décision du lot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, fichiersDuRunbook } from './commands-list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const agent = (a) => read(`templates/agents/subagents/${a}.md`);
const rule = (f) => read(`templates/agents/${f}`);
// Les règles injectées dans AGENTS.md ET les 7 fichiers d'agents, en un seul ensemble : les deux
// sont recopiés chez l'assistant, et une attribution de verdict fautive vaut la même chose dans
// l'un ou dans l'autre. Chemins relatifs à `templates/agents/`, donc lisibles par `rule()`.
const md = (d) => fs.readdirSync(path.join(ROOT, d)).filter((n) => n.endsWith('.md')).sort();
const FICHIERS_REGLES = () => [
  ...md('templates/agents'),
  ...md('templates/agents/subagents').map((n) => `subagents/${n}`),
];

// Les runbooks du kit : les fichiers d'entrée de `templates/commands/` ET les ÉTAPES de CHAQUE
// runbook découpé. Une attribution de verdict fautive atteint exactement le même lecteur depuis
// une étape que depuis l'entrée, puisque les deux sont recopiées chez l'utilisateur.
// La liste ne nommait que `new-project/` — le seul dossier d'étapes qui existât alors. Le jour où
// un deuxième runbook s'est découpé (`/new-feature`), ses trois lignes inventoriées ici (les deux
// relectures + le verdict `6bis`) sont sorties du balayage : R3 les aurait déclarées PÉRIMÉES,
// c'est-à-dire supprimées, alors qu'elles n'avaient que changé de fichier. On énumère donc la
// source unique (`commands-list.mjs`), qui rend l'entrée puis ses étapes, pour les 10 runbooks —
// aucun nom d'étape recopié, et le prochain découpage entre sous contrôle sans toucher à ceci.
const RUNBOOKS = () => COMMANDS.flatMap((c) => fichiersDuRunbook(ROOT, c));

const CREW = ['verificateur', 'test-runner', 'security-reviewer', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];
// Voulu : les deux rédacteurs d'artefact écrivent, les cinq autres sont bridés (cf. proof.test.mjs).
const ECRIVAINS = ['verificateur', 'security-reviewer'];
const BRIDES = ['test-runner', 'code-reviewer', 'critique-produit', 'critique-donnees', 'critique-ux'];
const CRITIQUES = ['critique-produit', 'critique-donnees', 'critique-ux'];

// `\b` est ASCII : entre une espace et « é » il n'y a AUCUNE frontière de mot, donc
// `/\bécris\b/` ne matche jamais « écris » (alors que `/\becris\b/` matche « ecris »). Les
// quatre alternatives en « é » de VERBE_ECRIRE (`écris`, `écrit`, `écrivent`, `écrivez`) et
// leurs formes en `-y` étaient donc du code mort. Tout motif de ce fichier qui peut rencontrer
// une lettre accentuée passe par cette borne-ci, qui s'appuie sur `\p{L}` et impose `u`.
const B = (s) => `(?<!\\p{L})(?:${s})(?!\\p{L})`;

// L'ordre d'écrire le journal. Filet SECONDAIRE, et assumé comme tel : énumérer les verbes est
// une course perdue (« consigne », « appose », « paraphe », « en ajoutant »…). Dans la graine,
// le filet PRINCIPAL est désormais le texte de référence de R1, qui ne regarde ni verbe ni
// tournure ; ce motif-ci ne sert plus qu'à expliquer pourquoi la graine dit ce qu'elle dit.
// Les formes fléchies sortent de la borne `(?!\p{L})` (« écrit » ne couvre pas « écrite ») :
// on les écrit, au lieu de compter sur une borne pour les attraper.
const VERBE_ECRIRE = [
  'écris', 'écrit(?:e|s|es)?', 'écrire', 'écrivent', 'écrivez',
  'ajoute(?:s|nt|z|r)?', 'ajouté(?:e|s|es)?',
  'consigne(?:s|nt|z|r)?', 'consigné(?:e|s|es)?',
  'note(?:s|nt|z|r)?', 'noté(?:e|s|es)?',
  'inscris', 'inscrit(?:e|s|es)?', 'inscrire', 'inscrivent', 'inscrivez',
  'renseigne(?:s|nt|z|r)?', 'renseigné(?:e|s|es)?',
  'complète(?:s|nt)?', 'complét(?:er|ez)', 'complété(?:e|s|es)?',
  'journalise(?:s|nt|z|r)?', 'journalisé(?:e|s|es)?',
  'reporte(?:s|nt|z|r)?', 'reporté(?:e|s|es)?',
].join('|');
const OBJET_LIGNE = '(?:une|ta|sa|ma|ton|son|leur|leurs|ses|mes|tes|cette|ces|la|les|des) lignes?|(?:ton|son|leur|leurs|ses) passages?|ici';
const ORDRE_D_ECRIRE = new RegExp(
  `${B(`(?:${VERBE_ECRIRE})-y`)}|${B(VERBE_ECRIRE)}[^.\\n]{0,15}?${B(OBJET_LIGNE)}`, 'iu');

// Le sujet universel. Les quantificateurs du français sont peu nombreux, mais ce motif ne
// reconnaît qu'un sujet EXPLICITE : une tournure impersonnelle (« il est attendu de qui rend un
// rapport qu'il grave sa ligne ici ») s'adresse mécaniquement aux cinq bridés sans en porter
// aucun, et lui échappe. Ce n'est donc pas un filet complet, et R1 ne s'y fie plus pour la
// sensibilité : il compare la graine à son texte de référence. Ce motif garde deux rôles —
// documenter pourquoi les phrases de la liste blanche sont admises, et rattraper une mise à
// jour étourdie de ce texte de référence.
const ACTEUR = '(?:sous-)?agents?|membres?|relect(?:eur|rice)s?|critiques?|crew|équipes?';
const DETERMINANT_UNIVERSEL = 'chaque|tout|toute|tous|toutes|aucun|aucune|aucuns|aucunes|nul|nulle|nuls|nulles|n\'importe quel|n\'importe quelle|n\'importe quels|n\'importe quelles';
const PRONOM_UNIVERSEL = 'chacun|chacune|quiconque|personne|on|tous|toutes';
const SUJET_UNIVERSEL = new RegExp(
  `${B(DETERMINANT_UNIVERSEL)}[^.\\n]{0,25}?${B(ACTEUR)}|${B('les')}\\s+${B('(?:sous-)?agents')}|${B(PRONOM_UNIVERSEL)}`, 'iu');

test('C1 — aucun agent bridé en écriture ne reçoit l\'ordre d\'écrire le journal', () => {
  for (const a of BRIDES) {
    const t = agent(a);
    assert.match(t, /^disallowedTools:.*\bWrite\b/m, `${a} : le postulat (Write retiré) doit rester vrai`);
    assert.doesNotMatch(t, ORDRE_D_ECRIRE, `${a} : bridé en écriture ET sommé d'écrire le journal`);
    // Il lit toujours le journal (Read n'est pas retiré) et RÉPOND sa ligne.
    assert.match(t, /Lis `docs\/agents\/JOURNAL\.md`/, `${a} : lit la mémoire partagée`);
    assert.match(t, /ligne de journal/i, `${a} : rend sa ligne dans son rapport`);
    assert.match(t, /orchestrateur/i, `${a} : c'est l'orchestrateur qui l'écrit`);
  }
  // Les deux qui ont Write gardent l'ordre : eux peuvent l'exécuter.
  for (const a of ECRIVAINS) {
    const t = agent(a);
    assert.match(t, /^tools:.*\bWrite\b/m, `${a} : écrit son artefact`);
    assert.match(t, /écris une ligne dans `docs\/agents\/JOURNAL\.md`/i, `${a} : écrit sa ligne lui-même`);
  }
});

test('C1 — le contrat de dispatch dit qui écrit la ligne de journal', () => {
  const t = rule('subagents-rule.md');
  assert.match(t, /docs\/agents\/JOURNAL\.md/, 'subagents-rule : le journal entre dans le contrat');
  assert.match(t, /c'est toi qui l'écris/i, 'l\'orchestrateur écrit la ligne des bridés');
  assert.match(t, /test-runner/, 'les bridés sont nommés');
  assert.match(t, /verificateur/, 'les deux rédacteurs aussi');
});

test('C2 — l\'inventaire de complétude a un chemin canonique, et les 3 critiques le reçoivent', () => {
  const seed = 'templates/journal/inventaire.md';
  assert.ok(fs.existsSync(path.join(ROOT, seed)), `graine absente : ${seed}`);
  const g = read(seed);
  assert.match(g, /écran/i, 'la graine dit ce qu\'on y met');
  assert.match(g, /jalon/i);
  for (const c of CRITIQUES) {
    assert.match(agent(c), /docs\/agents\/inventaire\.md/, `${c} : reçoit un chemin, pas une idée`);
  }
});

test('C3 — le verificateur n\'invalide plus le TDD (ajouter un test est normal)', () => {
  const t = agent('verificateur');
  assert.doesNotMatch(t, /Le diff n'a pas touché les tests/, 'le check aveugle est retiré');
  assert.match(t, /--diff-filter=MD/, 'seuls modifier/supprimer sont traqués');
  assert.match(t, /ajouter\*?\*? est normal/i, 'ajouter un test ne doit pas faire échouer le verdict');
  assert.match(t, /\.skip/, 'désactiver un test reste interdit');
  assert.match(t, /\.only/);
});

test('C4 — le verificateur lit state.yaml et y reporte son verdict', () => {
  const t = agent('verificateur');
  assert.match(t, /Lis `docs\/agents\/state\.yaml`/, 'lu en début de mission');
  for (const k of ['status', 'repair_attempts', 'blocked_reason']) {
    assert.match(t, new RegExp(`\`${k}\``), `${k} : reporté en fin de mission`);
  }
  // Les mêmes clés que la graine : un champ inventé ne serait jamais écrit.
  const s = read('templates/journal/state.yaml');
  for (const k of ['status', 'repair_attempts', 'blocked_reason']) assert.match(s, new RegExp(`^${k}:`, 'm'));
  // …et les mêmes valeurs : un `status` hors énumération casserait `/next` et `/sos`, qui le relisent.
  const enumeres = (s.match(/^status:.*#\s*(.+)$/m) || [])[1].split('|').map((v) => v.trim());
  for (const v of ['done', 'in-progress', 'blocked']) {
    assert.ok(enumeres.includes(v), `${v} : statut absent de l'énumération de state.yaml`);
    assert.match(t, new RegExp(`\`${v}\``), `${v} : le verificateur doit savoir quand l'écrire`);
  }
});

test('C5 — chez les critiques, la comparaison d\'images est un signal indicatif, jamais une référence', () => {
  for (const c of ['critique-produit', 'critique-ux']) {
    const t = agent(c);
    if (/PixelRAG/.test(t)) {
      assert.match(t, /indicatif|non bloquant|jamais un gate/i, `${c} : PixelRAG cité doit être qualifié`);
    }
    assert.doesNotMatch(t, /passe design\/PixelRAG/, `${c} : plus de gate déguisé`);
    assert.doesNotMatch(t, /parcours PixelRAG si dispo/, `${c} : plus de référence forte`);
  }
});

// Le bloc « Règles que tu portes » remplace AGENTS.md pour eux : s'il diverge d'un agent à l'autre,
// deux agents du même crew appliquent deux règles différentes sans que rien ne le signale.
const bloc = (t) => {
  const i = t.indexOf('## Règles que tu portes');
  assert.notEqual(i, -1, 'bloc de règles absent');
  return t.slice(i).split('\n').filter((l) => l.startsWith('- ')).join('\n');
};

test('C6 — les 7 portent le MÊME bloc de règles, aux valeurs de la Règle Preuve', () => {
  const blocs = CREW.map((a) => bloc(agent(a)));
  for (const [i, b] of blocs.entries()) assert.equal(b, blocs[0], `${CREW[i]} : bloc divergent`);
  const b = blocs[0];
  const proof = rule('proof-rule.md');
  // Mêmes valeurs, même sortie que la règle canonique — pas une seconde définition.
  assert.match(b, /3 tentatives/);
  assert.match(b, /même check ou le même bug/, 'même portée que proof-rule');
  assert.match(proof, /même check ou le même bug/, 'proof-rule reste la définition');
  assert.match(b, /BLOQUÉ/);
  assert.doesNotMatch(b, /[Rr]epars? au dernier état vert|[Rr]eviens au dernier état vert/, 'jamais de retour arrière automatique');
  // B1 : chacun conclut sur SA mission, jamais d'auto-PROUVÉ sur ce qu'on a écrit, et le
  // `PROUVÉ` d'un jalon reste au verificateur. Les 7 portent la même phrase (cf. R2).
  assert.match(b, /verificateur/, 'qui prononce PROUVÉ est rappelé dans le bloc');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'MANQUE']) assert.match(b, new RegExp(s), `statut ${s}`);
});

// La graine du journal, MOT POUR MOT. C'est un fichier court, stable, possédé par le kit : on
// peut donc le tenir en entier, au lieu d'essayer de deviner par motifs si une phrase française
// donne un ordre. Toute modification, quelle qu'en soit la formulation — un verbe non prévu, une
// tournure impersonnelle sans sujet (« il est attendu de qui rend un rapport qu'il grave sa ligne
// ici »), une phrase coupée en deux — change ce texte et fait échouer R1. C'est la seule
// assertion de ce fichier dont la sensibilité soit totale par construction.
const GRAINE_JOURNAL = [
  '# Journal des agents (append-only)',
  '',
  "Chaque agent **lit ce fichier avant** de commencer — c'est la mémoire partagée du crew. On n'efface jamais, on ajoute.",
  '',
  "La ligne de fin de mission : `verificateur` et `security-reviewer` écrivent la leur ; les autres sous-agents, bridés en écriture, la **rendent** dans leur rapport et c'est l'**orchestrateur** qui l'ajoute ici.",
  '',
  'Format : `AAAA-MM-JJ · <agent> · <mission> · <statut> · <preuve> · <décision>`',
  '',
  '- `2026-01-01 · exemple · mise en place du journal · PROUVÉ · (aucune commande) · format retenu : une ligne par mission`',
  '',
].join('\n');

// R1 — la contradiction levée par C1 dans les fichiers d'agents ne doit pas revenir par la
// GRAINE que ces mêmes agents ont l'ordre de lire. Le lien est réel, pas cosmétique :
// `environment.mjs` pose `templates/journal/JOURNAL.md` en `docs/agents/JOURNAL.md`, et cinq
// agents ont `Write` retiré ET l'ordre de lire exactement ce fichier — ce qu'il ordonne, ils
// le reçoivent.
test('R1 — la graine du journal n\'ordonne pas d\'écrire aux agents bridés qui la lisent', () => {
  const env = read('scripts/lib/environment.mjs');
  assert.match(env, /docs\/agents\/JOURNAL\.md'\s*,\s*'templates\/journal\/JOURNAL\.md/, 'la graine posée est bien celle-ci');
  const lecteurs = CREW.filter((a) => /^disallowedTools:.*\bWrite\b/m.test(agent(a)) && /Lis `docs\/agents\/JOURNAL\.md`/.test(agent(a)));
  assert.deepEqual(lecteurs, BRIDES, 'les cinq bridés reçoivent l\'ordre de lire exactement ce fichier');

  const seed = read('templates/journal/JOURNAL.md');
  assert.equal(seed, GRAINE_JOURNAL, [
    'La graine `templates/journal/JOURNAL.md` ne correspond plus à son texte de référence.',
    `Elle est recopiée en \`docs/agents/JOURNAL.md\`, et les cinq sous-agents bridés en écriture (${BRIDES.join(', ')})`,
    'ont l\'ordre de la LIRE : tout ce qu\'elle demande, ils le reçoivent sans pouvoir l\'exécuter.',
    `Avant de valider : vérifie qu'elle n'ordonne à PERSONNE d'écrire ici — seuls l'orchestrateur, ${ECRIVAINS.join(' et ')}`,
    'en ont le droit — puis recopie le nouveau texte dans la constante GRAINE_JOURNAL de ce test.',
  ].join('\n'));

  // Les assertions qui suivent NE portent plus la sensibilité (l'égalité ci-dessus la porte
  // entière) : elles disent POURQUOI le texte de référence est celui-là, et rattrapent une mise
  // à jour étourdie de cette constante — recopier la graine fautive dans GRAINE_JOURNAL sans la
  // relire ne suffit pas à faire passer le test.
  const phrases = seed.split(/(?<=[.;])\s+|\n/).map((p) => p.trim()).filter(Boolean);

  // LISTE BLANCHE. Une phrase à sujet universel s'adresse mécaniquement aux cinq bridés :
  // elle n'est admise que si elle est LITTÉRALEMENT l'une de celles-ci — aujourd'hui la
  // lecture, et la nature append-only du fichier. Aucune autre ne passe, quel que soit son
  // verbe : « termine sa mission en ajoutant sa ligne », « appose sa trace », « paraphe sa
  // mention » tombent sans qu'aucun de ces mots n'ait été prévu. Élargir cette liste est un
  // acte délibéré, relu — pas un effet de bord d'une reformulation.
  const PHRASES_UNIVERSELLES_AUTORISEES = [
    'Chaque agent **lit ce fichier avant** de commencer — c\'est la mémoire partagée du crew.',
    'On n\'efface jamais, on ajoute.',
  ];
  // La liste blanche se vérifie elle-même : périmée, elle ne protège plus ; et on n'y glisse
  // pas un ordre d'écriture pour le faire passer.
  for (const p of PHRASES_UNIVERSELLES_AUTORISEES) {
    assert.ok(phrases.includes(p), `liste blanche périmée : « ${p} » ne figure plus dans la graine`);
    assert.ok(SUJET_UNIVERSEL.test(p), `liste blanche : « ${p} » n'a pas de sujet universel, elle n'a rien à y faire`);
    assert.doesNotMatch(p, ORDRE_D_ECRIRE, `liste blanche : « ${p} » porte un ordre d'écriture — elle n'est pas là pour ça`);
  }

  // Tout ordre d'écrire doit par ailleurs être ATTRIBUÉ à quelqu'un qui a le droit d'écrire.
  const PROPRIETAIRES = ['orchestrateur', ...ECRIVAINS];
  const fautes = [];
  for (const p of phrases) {
    if (SUJET_UNIVERSEL.test(p) && !PHRASES_UNIVERSELLES_AUTORISEES.includes(p)) {
      fautes.push(`sujet universel hors liste blanche (${BRIDES.join(', ')} ne peuvent pas l'exécuter) : « ${p} »`);
    }
    if (ORDRE_D_ECRIRE.test(p) && !PROPRIETAIRES.some((w) => new RegExp(w, 'i').test(p))) {
      fautes.push(`ordre d'écriture sans propriétaire habilité : « ${p} »`);
    }
  }
  assert.deepEqual(fautes, [], `graine : consignes que les bridés ne peuvent pas exécuter :\n${fautes.join('\n')}`);

  // Et elle dit qui écrit vraiment, DANS LE BON SENS : la seule présence des trois mots
  // laisserait passer l'inverse (« les bridés écrivent, les deux autres rendent leur ligne »).
  const clauses = seed.split(/\s*;\s*|\n/).map((c) => c.trim()).filter(Boolean);
  const cEcrivains = clauses.find((c) => ECRIVAINS.every((a) => c.includes(a)));
  assert.ok(cEcrivains, `graine : ${ECRIVAINS.join(' et ')} doivent être nommés ensemble`);
  assert.match(cEcrivains, /écri(?:s|t|vent|re)\b/i, 'graine : … et c\'est pour dire qu\'ils ÉCRIVENT la leur');
  assert.deepEqual(BRIDES.filter((a) => cEcrivains.includes(a)), [], 'graine : aucun bridé dans la clause « ils écrivent »');
  const cBrides = clauses.find((c) => /brid|autres sous-agents/i.test(c));
  assert.ok(cBrides, 'graine : le sort des cinq bridés doit être écrit');
  assert.match(cBrides, /rend(?:ent|s|re)?\b|rapport/i, 'graine : les bridés RENDENT leur ligne, ils ne l\'écrivent pas');
  assert.match(cBrides, /orchestrateur\*{0,2}\s+qui\s+l['’]/i, 'graine : c\'est l\'ORCHESTRATEUR qui l\'ajoute (sujet du verbe, pas un mot posé là)');
});

// Une clause qui RÉSERVE le PROUVÉ. Filet SECONDAIRE lui aussi (les tournures d'exclusivité
// ne s'énumèrent pas plus que les verbes) : le filet principal est structurel, plus bas.
// Toutes les bornes sont en Unicode. Avec `\b`, quatre des treize alternatives d'origine
// étaient mortes : la branche « à » de `reste`/`revient`/`appartient` (`(?:au|à)\b` ne matche
// jamais « à », qui n'est pas un caractère de mot ASCII) et `\bà lui (?:de|seul)\b` en entier.
const RESERVE = new RegExp([
  B('seul|seule|seuls|seules'),
  B('que par'),
  '(?<!\\p{L})réserv',
  `${B('reste|restent|revient|reviennent|appartient|appartiennent')}\\s+\\*{0,2}${B('au|aux|à')}`,
  `${B('c\'est')}\\s+\\*{0,2}(?:${B('lui|elle|au|aux|à')}|à\\s+\\*{0,2}${B('lui|elle')})`,
  B('uniquement'),
  '(?<!\\p{L})exclusi',
  `${B('nul|nulle|nuls|nulles|aucun|aucune|aucuns|aucunes')}\\s+${B('autre|autres')}`,
  `${B('personne|pas|rien')}\\s+d['’]${B('autre|autres')}`,
  B('rien que'),
  `${B('à')}\\s+${B('lui')}\\s+${B('de|seul')}`,
].join('|'), 'iu');

// La répartition du `PROUVÉ` est écrite UNE fois, dans `proof-rule` (« Règle Preuve ») ; tout le
// reste l'applique. On la LIT ici au lieu de la re-coder : un test qui la recopie ne détecte plus
// la divergence, il en crée une troisième.
const SECTION_CANON = '### Qui prononce PROUVÉ';
// Le vocabulaire du verdict. `PROUVÉ` est le mot du canon ; « verdict » en est le synonyme
// courant dans les règles — l'ignorer laissait passer « verdict par `verificateur` », qui donne
// à lui seul un gate incomplet (une feature en exige deux).
// `PROUVÉ` s'accorde (« les PROUVÉS restent au … », « une feature PROUVÉE ») : la borne de fin
// `(?!\p{L})` refusait ces sur-mots, là où l'ancien `/PROUVÉ/` sans borne les prenait. Les
// accords sont donc explicites ; la borne ne sert plus qu'à ne pas matcher en milieu de mot.
const VERDICT = new RegExp(B('PROUVÉ(?:es|e|s)?|verdicts?'), 'iu');
// Une ligne se lit en clauses : `;`, `:`, et le point suivi d'une espace — jamais celui d'un
// numéro (« **6. Verdict final** »).
const clauses = (line) => line.split(/\s*[;:]\s*|(?<![0-9])\.\s+/).map((c) => c.trim()).filter(Boolean);
const canonique = () => {
  const t = rule('proof-rule.md');
  const i = t.indexOf(SECTION_CANON);
  assert.notEqual(i, -1, `proof-rule : section « ${SECTION_CANON} » introuvable`);
  const section = t.slice(i).split(/\n### /)[0];
  const map = new Map();
  for (const objet of ['jalon', 'feature']) {
    const m = new RegExp(`\\*\\*Une?\\s+${objet}\\*\\*(.*?)(?=\\*\\*Une?\\s|$)`, 'is').exec(section);
    assert.ok(m, `proof-rule : la clause « ${objet} » manque à la section canonique`);
    map.set(objet, CREW.filter((a) => m[1].includes(a)).sort());
    assert.ok(map.get(objet).length, `proof-rule : « ${objet} » ne nomme aucun agent`);
  }
  return map;
};

// R2 — cohérence gate ↔ agent ↔ RÈGLE INJECTÉE. `templates/commands/*.md` EXIGE le `PROUVÉ` de
// certains agents (`build.md` : `verificateur` ET `security-reviewer`). Ni le fichier de ces
// agents, ni les règles standing, ne peuvent réserver ce `PROUVÉ` à quelqu'un d'autre.
// La 1re version n'inspectait que `subagents/` — et la clause survivante était dans
// `templates/agents/verify-rule.md`, c'est-à-dire dans l'AGENTS.md relu à chaque message.
test('R2 — ni un agent ni une règle injectée ne réserve un PROUVÉ que le gate exige d\'un autre', () => {
  const exigences = new Map();
  for (const f of RUNBOOKS()) {
    read(f).split('\n').forEach((line, i) => {
      if (!/PROUVÉ/.test(line)) return;
      for (const a of CREW) if (line.includes(a) && !exigences.has(a)) exigences.set(a, `${f}:${i + 1}`);
    });
  }
  for (const a of ['verificateur', 'security-reviewer']) {
    assert.ok(exigences.has(a), `${a} : une commande doit exiger son PROUVÉ (sinon ce test ne prouve rien)`);
  }
  // La règle canonique doit couvrir ce que le gate exige, sinon elle re-crée l'écart d'en haut.
  const CANON = canonique();
  const nommesParLaRegle = new Set([...CANON.values()].flat());
  for (const [a, ou] of exigences) {
    assert.ok(nommesParLaRegle.has(a), `${a} : son PROUVÉ est exigé en ${ou}, la Règle Preuve ne le nomme pas`);
  }

  const fautes = [];
  // 1. Les 7 agents : chacun est recopié seul, il ne voit ni AGENTS.md ni les autres.
  for (const [a, ou] of exigences) {
    const t = agent(a);
    // L'objet de sa mission, tel qu'il est écrit chez lui : frontmatter + 1er paragraphe.
    const entete = `${(t.match(/^description:.*$/m) || [''])[0]}\n${t.split(/^---$/m)[2].trim().split('\n\n')[0]}`;
    const objets = ['jalon', 'feature'].filter((o) => new RegExp(o, 'i').test(entete));
    assert.ok(objets.length, `${a} : objet de mission (jalon/feature) introuvable dans son en-tête`);
    for (const p of t.split(/(?<=[.;])\s+|\n/)) {
      if (!/PROUVÉ/.test(p) || !RESERVE.test(p)) continue;
      const autres = CREW.filter((x) => x !== a && p.includes(x));
      const porte = objets.filter((o) => new RegExp(o, 'i').test(p));
      if (autres.length && porte.length) fautes.push(`${a} (PROUVÉ exigé en ${ou}) réserve son « ${porte.join('/')} » à ${autres.join(', ')} : « ${p.trim().slice(0, 130)} »`);
    }
  }

  // 2. Les règles injectées dans AGENTS.md (relues à CHAQUE message) ET les 7 fichiers d'agents.
  // Le filtre littéral « la ligne contient jalon ou feature » était l'échappatoire : retirer les
  // deux mots suffisait à passer. On le remplace par QUATRE conditions de structure :
  //   (i)   la ligne dit de QUOI elle parle. Une attribution non qualifiée vaut pour tout,
  //         donc aussi pour une feature : le lecteur en tire un gate incomplet.
  //   (ii)  elle nomme TOUS les agents que la Règle Preuve désigne pour ces objets.
  //   (iii) elle nomme au moins un juge de la Règle Preuve.
  //   (iv)  elle les nomme DANS une clause qui parle du verdict : un agent relégué à
  //         « rend un avis » dans la clause voisine n'est pas présenté comme juge.
  // Ces quatre conditions portent sur la structure de la ligne — de quoi elle parle, qui elle
  // nomme, où — et non sur ses mots. Leur limite est connue et n'est pas réparable ici : elles
  // constatent des présences, elles ne lisent pas un sens. Une ligne qui NOMME un juge puis le
  // disqualifie dans la clause voisine (« le `security-reviewer` donne un avis, pas un verdict »)
  // les satisfait toutes les quatre. C'est R3 — l'inventaire, qui exige que le texte exact de la
  // ligne ait été relu — qui couvre ce cas ; ici on attrape la faute DANS une ligne inventoriée.
  // Suit l'ancien contrôle d'exclusivité. Il n'est PAS atteint sur tout ce qu'il attrapait jadis :
  // il teste `/PROUVÉ/` sans borne, mais il est placé derrière le filtre `VERDICT`, qui en a une.
  // Le cas rendu était réel — « les PROUVÉS restent au … », que le pluriel faisait sortir de la
  // borne ; il est couvert deux fois depuis : par l'accord explicite ajouté à `VERDICT`, et par
  // R3, que le seul nom d'agent déclenche.
  const proofLines = rule('proof-rule.md').split('\n');
  const debutCanon = proofLines.findIndex((l) => l.startsWith(SECTION_CANON));
  const apres = proofLines.findIndex((l, k) => k > debutCanon && l.startsWith('### '));
  const finCanon = apres === -1 ? proofLines.length : apres;
  const JUGES = [...new Set([...CANON.values()].flat())].sort();
  const OBJETS = [...CANON.keys()];
  for (const f of FICHIERS_REGLES()) {
    rule(f).split('\n').forEach((line, i) => {
      // La définition canonique n'a pas à se comparer à elle-même.
      if (f === 'proof-rule.md' && i >= debutCanon && i < finCanon) return;
      if (!VERDICT.test(line) || !CREW.some((a) => line.includes(a))) return;
      const ou = `templates/agents/${f}:${i + 1}`;
      const extrait = line.trim().slice(0, 130);

      // Ancien contrôle : une ligne qui RÉSERVE le `PROUVÉ` d'un objet doit nommer EXACTEMENT
      // les agents que la Règle Preuve désigne pour cet objet.
      if (/PROUVÉ/.test(line) && RESERVE.test(line)) {
        const tous = CREW.filter((a) => line.includes(a)).sort();
        if (tous.length) {
          for (const [objet, attendus] of CANON) {
            if (!new RegExp(objet, 'i').test(line)) continue;
            if (tous.join('+') !== attendus.join('+')) {
              fautes.push(`${ou} — « ${objet} » réservé à ${tous.join(', ')}, la Règle Preuve dit ${attendus.join(', ')} : « ${extrait} »`);
            }
          }
        }
      }

      const nommes = JUGES.filter((a) => line.includes(a));
      if (!nommes.length) {
        fautes.push(`${ou} — (iii) attribue le verdict sans nommer aucun juge de la Règle Preuve (${JUGES.join(', ')}) : « ${extrait} »`);
        return;
      }
      const objets = OBJETS.filter((o) => new RegExp(o, 'i').test(line));
      if (!objets.length) {
        fautes.push(`${ou} — (i) attribue le verdict sans dire de QUOI (${OBJETS.join(' / ')}) : la consigne vaut alors partout, donc aussi sur une feature, où le gate en exige deux : « ${extrait} »`);
        return;
      }
      const attendus = [...new Set(objets.flatMap((o) => CANON.get(o)))].sort();
      const manquants = attendus.filter((a) => !nommes.includes(a));
      if (manquants.length) {
        fautes.push(`${ou} — (ii) « ${objets.join('/')} » : la Règle Preuve exige ${attendus.join(' + ')}, la ligne ne nomme pas ${manquants.join(', ')} : « ${extrait} »`);
      }
      const detaches = attendus.filter((a) => nommes.includes(a)
        && !clauses(line).some((c) => VERDICT.test(c) && c.includes(a)));
      if (detaches.length) {
        fautes.push(`${ou} — (iv) ${detaches.join(', ')} : nommé hors de toute clause qui parle du verdict, donc pas présenté comme juge : « ${extrait} »`);
      }
    });
  }
  assert.deepEqual(fautes, [], `clauses qui contredisent le gate des commandes ou la Règle Preuve :\n${fautes.join('\n')}`);
});

// Le déclencheur de R3 : le nom d'un agent, quelle que soit sa GRAPHIE. L'ensemble des agents
// est fermé (les 7 fichiers de `subagents/`), celui de leurs orthographes ne l'est pas : une
// revue a fait passer une clause fautive en écrivant `vérificateur` accentué, une autre en
// écrivant `Verificateur`. On compare donc sans casse, et on couvre les variantes qu'un
// rédacteur français produit naturellement — l'accent, et le tiret rendu par une espace.
const GRAPHIES = [...new Set(CREW.flatMap((a) => [a, a.replace(/-/g, ' '), ...(a === 'verificateur' ? ['vérificateur'] : [])]))];
const nommeUnAgent = (t) => { const bas = t.toLowerCase(); return GRAPHIES.some((n) => bas.includes(n)); };

// Les fichiers surveillés par R3. Pas seulement les règles injectées : une attribution fautive
// atteint le même lecteur depuis une commande, une règle Cursor toujours active ou une graine
// que les sous-agents reçoivent par son chemin — une revue a fait passer la clause depuis
// `templates/commands/new-feature.md`, puis depuis `templates/journal/inventaire.md`, que les
// trois critiques BRIDÉS reçoivent justement (C2).
const FICHIERS_SURVEILLES = () => [
  ...FICHIERS_REGLES().map((f) => `templates/agents/${f}`),
  ...RUNBOOKS(),
  ...fs.readdirSync(path.join(ROOT, 'templates/cursor/rules')).filter((n) => n.endsWith('.mdc')).sort().map((n) => `templates/cursor/rules/${n}`),
  'templates/journal/JOURNAL.md', 'templates/journal/state.yaml', 'templates/journal/inventaire.md',
];

// R3 — INVENTAIRE APPROUVÉ. R2 juge le CONTENU d'une ligne, donc il ne voit que ce que ses
// motifs savent lire : quatre tours de revue ont montré qu'une reformulation finit toujours par
// passer (« donne le feu vert » au lieu de « prononce », l'attribution coupée sur deux lignes,
// le juge nommé puis disqualifié). Ce test-ci ne lit pas le sens : il déclenche sur le seul nom
// d'un agent et exige que la ligne figure telle quelle dans l'inventaire. Écrire du neuf sur un
// agent oblige donc à relire cette liste, quelle que soit la tournure.
//
// CE QU'IL NE GARANTIT PAS — deux trous mesurés, à connaître avant de s'y fier :
//  1. Une ligne qui attribue l'autorité SANS nommer personne (« une feature n'exige qu'un
//     `PROUVÉ` : celui du relecteur détaché ») ne déclenche ni R3 ni R2 — R2 exige lui aussi un
//     nom d'agent. Aucun ensemble fermé de déclencheurs ne caractérise « cette phrase française
//     attribue un verdict » : c'est le plafond de ce qu'un test peut garantir sur de la prose,
//     pas un correctif oublié. La relecture humaine reste le seul filet sur ce cas.
//  2. Modifier une ligne ET recopier la nouvelle version dans l'inventaire dans le même geste
//     passe — comme re-baser un texte de référence. C'est le mode de défaillance assumé : le
//     test force la relecture, il ne la remplace pas.
const LIGNES_APPROUVEES = [
  // Les règles injectées dans AGENTS.md/CLAUDE.md.
  "- **Review code** `superpowers:requesting-code-review` puis le sous-agent **`code-reviewer`** · **Sécu** **`security-reviewer`** : ces sous-agents existent sur les 3 assistants, `/code-review` et `/security-review` seulement sur Claude Code.",
  "- **Test live** « Règle de vérification » + `docs/RUN.md` : E2E délégué à `test-runner`, verdict par `verificateur` (+ `security-reviewer` si feature).",
  "**« Fini »** = mergé sur **`main`** (CI verte, review OK, un PR à la fois) **ET** parcours refait en vrai avec le `PROUVÉ` du `verificateur` (+ `security-reviewer` si feature, « Règle Preuve »). Tests + CI verte : nécessaires, **pas** suffisants. Seul motif d'arrêt admis : un blocage externe au test live — et il se dit.",
  "**Une tâche** : **toi**, si tu colles la commande **et** sa sortie. **Un jalon** : le **`verificateur`** seul, en contexte frais. **Une feature** : `verificateur` (fonctionnel) **+** `security-reviewer` (sécurité) — jamais d'auto-`PROUVÉ` sur ce qu'on a écrit.",
  "**3. FONCTIONNEMENT (end-to-end)** — le parcours doit être **refait en vrai**, **délégué au sous-agent `test-runner` en contexte frais**. Donne-lui la feature, le **flux**, les **critères** (`UJ-*` du PRD, les `AC` de `/new-feature`), l'écran de départ, l'outil : **Playwright MCP** en web, **Maestro MCP** en mobile. Il porte ses exigences de preuve et ses cas limites, et rend un **rapport court** (AC ✅/❌ + capture + 1er point cassé).",
  "**6. Verdict final** — lance le sous-agent **`verificateur`** (contexte frais) ; une **feature** exige aussi le `PROUVÉ` du **`security-reviewer`** (« Règle Preuve »). Le `verificateur` **seul** reporte le verdict dans `docs/agents/state.yaml` et `docs/agents/JOURNAL.md`.",
  // Le bloc que les 7 agents portent à l'identique (C6 vérifie qu'il l'est), et leurs rôles.
  "0. **Modèle** — **`claude-sonnet-5`**, **sauf `security-reviewer` : `claude-opus-5`**. Seule **règle** qui en fixe un (Claude Code : champ `model` · Cursor : sélecteur · Codex : le brief).",
  "1. **Sa tâche**, une seule, précise. 2. **Ses skills** — un sous-agent design charge les skills design (« Règle design »), chacun les siens, **à chaque fois**. 3. **Les fichiers à lire**, chemins exacts. 4. **Ses règles** : il ne voit ni `AGENTS.md` ni `CLAUDE.md`. 5. **L'artefact à rendre** : un fichier précis ou un **résumé court**, jamais 10 000 tokens. 6. **Le journal** : les bridés en écriture (3 critiques, `test-runner`, `code-reviewer`) **rendent** leur ligne, **c'est toi qui l'écris** dans `docs/agents/JOURNAL.md` ; `verificateur` et `security-reviewer` écrivent la leur.",
  "- Tu conclus par un **statut**, jamais un avis : `PROUVÉ` / `NON PROUVÉ` / `BLOQUÉ` — sur **ta** mission seulement, et jamais d'auto-`PROUVÉ` sur du code que tu as écrit ; prononcer un **jalon** `PROUVÉ` reste au `verificateur`, en contexte frais. Les critiques rendent des `MANQUE : … — PREUVE : …`, ou « complet ».",
  "Tu es le **vérificateur**. Tu ne vois **que** le diff et les critères d'acceptation — pas le raisonnement qui les a produits. C'est ce détachement qui te rend utile : tu ne peux pas hériter du biais « c'est bon ».",
  // Les commandes : elles pilotent le gate, une attribution fautive y vaut autant qu'ailleurs.
  // `/build` étape 5 : l'E2E est DÉLÉGUÉ (verify-rule §3) — `test-runner` rend un rapport, il ne
  // prononce aucun verdict ; et « ton propre test ne prouve rien » = l'interdit d'auto-`PROUVÉ`.
  "5. **Rejoue le parcours en vrai, mais pas dans ce fil** : délègue l'end-to-end au sous-agent **`test-runner`** (contexte frais, MCP Playwright en web · Maestro en mobile · chrome-devtools en desktop) avec le flux, les critères du jalon et l'écran de départ. Toi, tu as écrit le code : ton propre test ne prouve rien.",
  // `/build` étape 6 : le gate d'un jalon porteur de features = `verificateur` + `security-reviewer`,
  // exactement la décision de proof-rule ; et l'orchestrateur n'écrit PAS `state.yaml` (verify-rule).
  "6. **Gate avant de cocher** : lance le sous-agent **`verificateur`** (contexte frais, diff du jalon + critères), puis **`security-reviewer`** sur les features touchées. Tant que l'un des deux ne répond pas **PROUVÉ**, le jalon n'est **pas** coché : corrige, ou arrête-toi et dis ce qui bloque. Tu ne touches pas à l'état du projet : le `verificateur` est le **seul écrivain de `docs/agents/state.yaml`** (il y consigne `status`, `repair_attempts`, `blocked_reason`).",
  // `/deploy` : la sécurité de ce qui part en prod est le périmètre du `security-reviewer` — c'est
  // le volet « sécurité » du couple exigé par proof-rule pour une feature, pas un verdict de jalon.
  "2. **Sécurité** : lance le sous-agent **`security-reviewer`** sur ce qui part en production. Son **`PROUVÉ`** est requis ; `NON PROUVÉ` ou `BLOQUÉ` → on ne déploie pas, on corrige.",
  // Le numéro d'item est celui de `/doctor` : il a glissé de 15/16 à 16/17 quand l'item
  // « Étapes des runbooks découpés » s'est inséré après l'item 6. Le TEXTE, lui, est inchangé.
  "16. **Agents du crew (7)** présents dans le dossier de ton assistant : `.cursor/agents/` (Cursor) · `.claude/agents/` (Claude Code) · `docs/agents/crew/` (Codex). Attendus : `verificateur`, `test-runner`, `code-reviewer`, `security-reviewer`, `critique-produit`, `critique-donnees`, `critique-ux`. Manquants → `npx create-vibecoding-kit --refresh`.",
  "17. **MCP de test branché** : `playwright` (saas, vitrine) · `maestro` (mobile) · `chrome-devtools` (desktop). Sans lui, le sous-agent `test-runner` ne peut rien prouver et répondra `BLOQUÉ`.",
  "- **critique-produit** (Vera) — « qu'est-ce qu'on a oublié ? » features, écrans, parcours.",
  "- **critique-donnees** (Marc) — « d'où vient cette donnée ? » modèle, câblage réel, zéro mock.",
  "- **critique-ux** (Lina) — « et quand ça se passe mal ? » états vide/erreur, responsive, accessibilité.",
  "- **verificateur** — le juge : il ne voit que le diff et les critères, et tranche **PROUVÉ / NON PROUVÉ / BLOQUÉ**. À lancer avant de dire qu'une étape est finie.",
  "- **test-runner** — teste une feature en vrai dans le navigateur/simulateur et rend un verdict.",
  "- **code-reviewer** · **security-reviewer** — relisent le code et la sécurité d'un changement.",
  // Ces deux-là relisent, elles ne tranchent pas : le `PROUVÉ` de /new-feature reste au verdict
  // `6bis` (ligne suivante), dans l'étape `03-verification.md`. Elles disent en plus la vérité que
  // loop-section dit déjà — la commande `//code-review` n'existe que sur Claude Code, le
  // sous-agent existe partout.
  "Bugs, conventions, sécurité du diff. Lance le sous-agent `code-reviewer` sur le diff : il existe sur les 3 assistants, la commande `/code-review` seulement sur Claude Code.",
  "Revue sécurité des changements de la branche. Lance le sous-agent `security-reviewer` : il existe sur les 3 assistants, la commande `/security-review` seulement sur Claude Code.",
  // Le RENVOI de cette ligne a changé au découpage de `/new-feature`, et lui seul : « retour à
  // l'étape 3 » ne désignait plus rien d'ouvrable une fois les dix temps de la boucle regroupés en
  // cinq fichiers — pire, lu depuis `03-verification.md`, il se lisait comme un renvoi vers le
  // fichier courant. L'attribution du verdict, elle, est mot pour mot la même.
  "Lance **`verificateur`** en contexte frais : il ne voit que le diff + les `AC`. **PROUVÉ** requis pour continuer. **NON PROUVÉ** → retour à l'exécution, `02-plan-et-execution.md`. **BLOQUÉ** → dis ce qui bloque, ne commit pas.",
  "- **`critique-produit`** (Vera) — features/écrans/parcours oubliés ;",
  "- **`critique-donnees`** (Marc) — données réelles, modèle, câblage, zéro mock, permissions ;",
  "- **`critique-ux`** (Lina) — états vide/chargement/erreur, impasses, responsive, accessibilité.",
  "> Ces agents vivent dans le dossier d'agents de ton assistant : `.cursor/agents/ (Cursor) · .claude/agents/ (Claude Code) · docs/agents/crew/ (Codex)` — tu peux les **appeler n'importe quand** (« lance `critique-ux` sur cet écran »), pas seulement ici.",
  // Les graines que les sous-agents reçoivent par leur chemin.
  "La ligne de fin de mission : `verificateur` et `security-reviewer` écrivent la leur ; les autres sous-agents, bridés en écriture, la **rendent** dans leur rapport et c'est l'**orchestrateur** qui l'ajoute ici.",
  "Le **contrat de couverture** du projet : tout ce que la maquette et le PRD promettent, ligne par ligne. Produit par `/new-project` **avant** la roadmap (c'en est la base), relu par les trois critiques (`critique-produit`, `critique-donnees`, `critique-ux`). Ce qui n'est pas ici ne sera pas construit.",
  // `state.yaml` : un fichier lu par tous, écrit par un seul. Même attribution que verify-rule.md.
  "# Seul écrivain : le sous-agent `verificateur`, en fin de mission. L'orchestrateur et les autres",
  // L'identité des 7 : ajouter un agent est un acte délibéré, pas un effet de bord.
  ...CREW.map((a) => `name: ${a}`),
];

test('R3 — toute ligne qui nomme un agent du crew est dans l\'inventaire approuvé', () => {
  const approuvees = new Set(LIGNES_APPROUVEES);
  const vues = new Set();
  const inconnues = [];
  for (const f of FICHIERS_SURVEILLES()) {
    read(f).split('\n').forEach((line, i) => {
      const t = line.trim();
      if (!t || !nommeUnAgent(t)) return;
      if (approuvees.has(t)) { vues.add(t); return; }
      inconnues.push(`${f}:${i + 1} — « ${t.slice(0, 120)}${t.length > 120 ? '…' : ''} »`);
    });
  }
  assert.deepEqual(inconnues, [], [
    'Lignes nommant un agent du crew, absentes de LIGNES_APPROUVEES :',
    ...inconnues,
    '',
    'Ce n\'est pas un test de style : ces lignes disent QUI fait quoi, et une seule d\'entre elles',
    'qui diverge suffit à faire mentir le kit (c\'est arrivé quatre fois sur ce lot). Avant de',
    'recopier ta ligne dans l\'inventaire, relis « ### Qui prononce PROUVÉ » de proof-rule.md et',
    'vérifie que ta ligne dit la même chose — puis que le gate de templates/commands/ la confirme.',
  ].join('\n'));

  // L'inventaire se vérifie lui-même : une entrée périmée ne protège plus rien, et sa présence
  // laisserait croire que la ligne existe encore.
  const perimees = LIGNES_APPROUVEES.filter((l) => !vues.has(l));
  assert.deepEqual(perimees, [], `entrées périmées de LIGNES_APPROUVEES (plus aucune ligne ne leur correspond) :\n${perimees.join('\n')}`);
});

test('C7 — tout `docs/agents/…` cité par le crew est un fichier que le kit crée vraiment', () => {
  const env = read('scripts/lib/environment.mjs');
  for (const f of ['JOURNAL.md', 'state.yaml', 'inventaire.md']) {
    assert.match(env, new RegExp(`docs/agents/${f.replace('.', '\\.')}`), `${f} : graine jamais posée`);
  }
  const cites = new Set();
  for (const a of CREW) for (const m of agent(a).matchAll(/docs\/agents\/([\w-]+\.[\w]+)/g)) cites.add(m[1]);
  assert.ok(cites.size > 0, 'le crew cite au moins un fichier partagé');
  for (const f of cites) {
    assert.match(env, new RegExp(`docs/agents/${f.replace('.', '\\.')}`), `${f} : cité par le crew mais jamais créé`);
  }
});
