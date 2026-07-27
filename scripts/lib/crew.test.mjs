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

// L'ordre d'écrire, dans toutes ses formulations historiques.
const ORDRE_D_ECRIRE = /Écris une ligne|ajoutes-y une ligne|écris-y|ajoute une ligne/i;

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
  // B1 : sur un jalon ou une feature, seul le verificateur prononce PROUVÉ. Les 7 le portent.
  assert.match(b, /verificateur/, 'qui prononce PROUVÉ est rappelé dans le bloc');
  for (const s of ['PROUVÉ', 'NON PROUVÉ', 'BLOQUÉ', 'MANQUE']) assert.match(b, new RegExp(s), `statut ${s}`);
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
