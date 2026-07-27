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

// L'ordre d'écrire le journal. Une liste blanche des 4 tournures du jour ne protège de rien :
// « Chaque sous-agent consigne son passage ici en finissant » réintroduit la contradiction sans
// en employer une seule. On reconnaît donc un VERBE d'inscription suivi de son OBJET.
const VERBE_ECRIRE = 'écris|écrit|écrivent|écrivez|ajoute|ajoutes|ajouter|ajoutent|consigne|consignes|consigner|consignent|note|notes|noter|notent|inscris|inscrit|inscrire|inscrivent|renseigne|renseignes|complète|complètes|journalise|journalises|reporte|reportes';
const OBJET_LIGNE = '(?:une|ta|sa|ma|leur|cette|la) ligne|(?:ton|son|leur) passage|ici';
const ORDRE_D_ECRIRE = new RegExp(
  `\\b(?:${VERBE_ECRIRE})-y\\b|\\b(?:${VERBE_ECRIRE})\\b[^.\\n]{0,15}?\\b(?:${OBJET_LIGNE})\\b`, 'i');
// Un sujet qui englobe tout le crew — donc les cinq bridés, qui ne peuvent pas exécuter l'ordre.
const SUJET_UNIVERSEL = /\b(?:chaque|tout|toute|tous|toutes|chacun|n'importe quel)\b[^.\n]{0,25}?\b(?:sous-)?agents?\b|\bles (?:sous-)?agents\b/i;

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
  // Tout ordre d'écrire doit être ATTRIBUÉ à quelqu'un qui a le droit d'écrire. Un sujet
  // universel (« chaque agent », « chaque sous-agent »…) atteint mécaniquement les cinq bridés.
  const PROPRIETAIRES = ['orchestrateur', ...ECRIVAINS];
  const fautes = seed.split(/(?<=[.;])\s+|\n/).map((p) => p.trim()).filter(Boolean)
    .filter((p) => ORDRE_D_ECRIRE.test(p)
      && (SUJET_UNIVERSEL.test(p) || !PROPRIETAIRES.some((w) => new RegExp(w, 'i').test(p))));
  assert.deepEqual(fautes, [], `graine : ordre d'écriture sans propriétaire habilité — ${BRIDES.join(', ')} ne peuvent pas l'exécuter`);

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

// Une clause qui RÉSERVE le PROUVÉ. Une liste blanche de 4 tournures ne tenait pas : la clause
// survivante de `verify-rule.md` disait « c'est **lui** qui prononce », qui n'y figurait pas.
// On prend donc aussi l'attribution par pronom, l'exclusivité et l'appartenance.
const RESERVE = /\bseul(e|s)?\b|\bque par\b|\bréserv|\breste \*{0,2}(?:au|à)\b|\bc'est \*{0,2}(?:lui|elle|à lui|à elle)\b|\buniquement\b|\bexclusi|\bnul autre\b|\bpersonne d'autre\b|\brien que\b|\brevient \*{0,2}(?:au|à)\b|\bappartient \*{0,2}(?:au|à)\b|\bà lui (?:de|seul)\b/i;

// La répartition du `PROUVÉ` est écrite UNE fois, dans `proof-rule` (« Règle Preuve ») ; tout le
// reste l'applique. On la LIT ici au lieu de la re-coder : un test qui la recopie ne détecte plus
// la divergence, il en crée une troisième.
const SECTION_CANON = '### Qui prononce PROUVÉ';
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

  // 2. Les règles injectées dans AGENTS.md. Une ligne qui réserve le `PROUVÉ` d'un objet doit
  // nommer EXACTEMENT les agents que la Règle Preuve désigne pour cet objet — sinon deux
  // passages du même AGENTS.md se contredisent, à quelques dizaines de lignes d'écart.
  const proofLines = rule('proof-rule.md').split('\n');
  const debutCanon = proofLines.findIndex((l) => l.startsWith(SECTION_CANON));
  const apres = proofLines.findIndex((l, k) => k > debutCanon && l.startsWith('### '));
  const finCanon = apres === -1 ? proofLines.length : apres;
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/agents')).filter((n) => n.endsWith('.md')).sort()) {
    rule(f).split('\n').forEach((line, i) => {
      // La définition canonique n'a pas à se comparer à elle-même.
      if (f === 'proof-rule.md' && i >= debutCanon && i < finCanon) return;
      if (!/PROUVÉ/.test(line) || !RESERVE.test(line)) return;
      const nommes = CREW.filter((a) => line.includes(a)).sort();
      if (!nommes.length) return;
      for (const [objet, attendus] of CANON) {
        if (!new RegExp(objet, 'i').test(line)) continue;
        if (nommes.join('+') !== attendus.join('+')) {
          fautes.push(`templates/agents/${f}:${i + 1} — « ${objet} » réservé à ${nommes.join(', ')}, la Règle Preuve dit ${attendus.join(', ')} : « ${line.trim().slice(0, 130)} »`);
        }
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
