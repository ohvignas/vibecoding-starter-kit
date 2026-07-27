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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const agent = (a) => read(`templates/agents/subagents/${a}.md`);
const rule = (f) => read(`templates/agents/${f}`);

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
// une course perdue (« consigne », « appose », « paraphe », « en ajoutant »…). Le filet
// principal est la liste blanche des phrases à sujet universel (R1), qui ne regarde aucun verbe.
const VERBE_ECRIRE = 'écris|écrit|écrivent|écrivez|ajoute|ajoutes|ajouter|ajoutent|consigne|consignes|consigner|consignent|note|notes|noter|notent|inscris|inscrit|inscrire|inscrivent|renseigne|renseignes|complète|complètes|journalise|journalises|reporte|reportes';
const OBJET_LIGNE = '(?:une|ta|sa|ma|leur|cette|la) ligne|(?:ton|son|leur) passage|ici';
const ORDRE_D_ECRIRE = new RegExp(
  `${B(`(?:${VERBE_ECRIRE})-y`)}|${B(VERBE_ECRIRE)}[^.\\n]{0,15}?${B(OBJET_LIGNE)}`, 'iu');

// Le SUJET universel, lui, est un ensemble FERMÉ : le français n'a qu'une poignée de
// quantificateurs universels, et aucun néologisme n'en crée. C'est le sujet — jamais le verbe —
// qui fait qu'une consigne atteint les cinq bridés, incapables de l'exécuter. D'où R1 : on
// n'énumère plus les fautes, on énumère les phrases à sujet universel AUTORISÉES.
const ACTEUR = '(?:sous-)?agents?|membres?|relecteurs?|critiques?|crew|équipe';
const DETERMINANT_UNIVERSEL = 'chaque|tout|toute|tous|toutes|aucun|aucune|nul|nulle|n\'importe quel|n\'importe quelle';
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
  `${B('reste|revient|appartient')}\\s+\\*{0,2}${B('au|aux|à')}`,
  `${B('c\'est')}\\s+\\*{0,2}(?:${B('lui|elle|au|aux|à')}|à\\s+\\*{0,2}${B('lui|elle')})`,
  B('uniquement'),
  '(?<!\\p{L})exclusi',
  `${B('nul|nulle|aucun|aucune')}\\s+${B('autre|autres')}`,
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
const VERDICT = new RegExp(B('PROUVÉ|verdict|verdicts'), 'iu');
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
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/commands')).filter((n) => n.endsWith('.md'))) {
    read(`templates/commands/${f}`).split('\n').forEach((line, i) => {
      if (!/PROUVÉ/.test(line)) return;
      for (const a of CREW) if (line.includes(a) && !exigences.has(a)) exigences.set(a, `templates/commands/${f}:${i + 1}`);
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

  // 2. Les règles injectées dans AGENTS.md, relues à CHAQUE message. Le filtre littéral
  // « la ligne contient jalon ou feature » était l'échappatoire : retirer les deux mots
  // suffisait à passer. On le remplace par QUATRE conditions de structure — aucune ne dépend
  // d'une tournure, donc aucune reformulation ne les contourne :
  //   (i)   la ligne dit de QUOI elle parle. Une attribution non qualifiée vaut pour tout,
  //         donc aussi pour une feature : le lecteur en tire un gate incomplet.
  //   (ii)  elle nomme TOUS les agents que la Règle Preuve désigne pour ces objets.
  //   (iii) elle nomme au moins un juge de la Règle Preuve.
  //   (iv)  elle les nomme DANS une clause qui parle du verdict : un agent relégué à
  //         « rend un avis » dans la clause voisine n'est pas présenté comme juge.
  // Suit l'ancien contrôle d'exclusivité, conservé intact (rien de ce qu'il attrapait n'est
  // rendu) — devenu un filet d'appoint derrière les quatre.
  const proofLines = rule('proof-rule.md').split('\n');
  const debutCanon = proofLines.findIndex((l) => l.startsWith(SECTION_CANON));
  const apres = proofLines.findIndex((l, k) => k > debutCanon && l.startsWith('### '));
  const finCanon = apres === -1 ? proofLines.length : apres;
  const JUGES = [...new Set([...CANON.values()].flat())].sort();
  const OBJETS = [...CANON.keys()];
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/agents')).filter((n) => n.endsWith('.md')).sort()) {
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
