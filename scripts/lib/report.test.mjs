// scripts/lib/report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from './report.mjs';

test('le rapport liste installé, à-faire-dans-l-IA, sauté, échecs', () => {
  const out = formatReport({
    project: 'mon-app', stack: 'saas', assistant: 'cursor',
    done: ['.cursor/rules/stack-saas.mdc'],
    inAssistant: [{ name: 'superpowers', command: '/add-plugin superpowers' }],
    skipped: [{ name: 'awesome-cursorrules', reason: 'Cursor only' }],
    failed: ['BMAD (timeout)'],
  });
  assert.match(out, /✅ .*stack-saas\.mdc/);
  assert.match(out, /superpowers : \/add-plugin superpowers/);
  assert.match(out, /awesome-cursorrules/);
  assert.match(out, /❌ BMAD/);
  // Prochaine étape : le prompt imprimé juste après, puis `/help` — l'entrée du kit.
  // (Elle disait « lance /new-project », alors que rien n'est encore installé à cette seconde.)
  assert.match(out, /\/help/);
  assert.doesNotMatch(out, /lance \/new-project/);
});

test('le rapport affiche les fichiers conservés (jamais écrasés)', () => {
  const out = formatReport({
    project: '/abs/mon-app', stack: 'saas', assistant: 'cursor',
    done: [], kept: ['docs/ROADMAP.md', '⚠️ AGENTS.md existant conservé (nouvelle version : AGENTS.md.new)'],
    inAssistant: [], skipped: [], failed: [],
  });
  assert.match(out, /Conservé/);
  assert.match(out, /AGENTS\.md\.new/);
  assert.match(out, /docs\/ROADMAP\.md/);
});

// ── UNE LIGNE DU RAPPORT NE DONNE JAMAIS UNE RAISON QUI N'EST PAS LA SIENNE ───────────────────
//
// ⛔ MESURÉ sur un `--adopt --force` réel. Le rapport a UN seul bac « conservé », dont le titre
// annonce la raison : « Conservé (déjà présent — le kit n'écrase jamais tes fichiers) ».
//   · sans `--force` : 25 lignes dessous, et le titre dit vrai pour les 25 ;
//   · avec `--force` : **exactement deux** lignes dessous — `docs/ETAT-DES-LIEUX.md` et
//     `docs/RUN.md` — sous le MÊME titre, INCHANGÉ.
//
// Or « déjà présent » est précisément PAS la raison pour laquelle ces deux-là ont survécu : les 23
// autres fichiers de ce run étaient « déjà présents » eux aussi, et ont été écrasés. Les deux
// seules lignes qui ont écarté le drapeau de l'utilisateur s'affichaient exactement comme si le
// drapeau n'avait jamais été tapé.
//
// Ni vrai, ni silencieux : FAUX — la pire des trois formes dans un outil dont la règle affichée
// est « dis ce que tu as fait ». D'où un bac séparé, avec sa propre raison.
test('rapport — ce qui survit à --force a son propre bac, jamais celui du « déjà présent »', () => {
  const out = formatReport({
    project: '/abs/mon-app', stack: 'aucune', assistant: 'claude-code',
    done: ['AGENTS.md'], kept: ['docs/glossaire.md'],
    promesse: ['docs/ETAT-DES-LIEUX.md — tes réponses'],
    inAssistant: [], skipped: [], failed: [],
  });
  // 1. Le drapeau est NOMMÉ : sans ça, l'utilisateur ne fait pas le lien avec ce qu'il a tapé.
  assert.match(out, /--force/, 'le rapport doit nommer le drapeau qui a été écarté');
  // 2. Et la RAISON de l'écart est donnée — c'est tout l'objet du bac.
  assert.match(out, /promis|promesse/i, 'la raison (le kit a promis de ne pas régénérer) doit être dite');
  // 3. L'entrée n'est PAS sous le titre qui donnerait la mauvaise raison.
  const sectionDejaPresent = out.split('Conservé (déjà présent')[1]?.split('\n\n')[0] ?? '';
  assert.ok(!sectionDejaPresent.includes('ETAT-DES-LIEUX'),
    '« déjà présent » n\'est pas la raison de cette survie : les autres fichiers déjà présents ont été écrasés');
  // 4. …et le bac ordinaire garde bien ses propres entrées : on n'a pas déplacé tout le monde.
  assert.ok(sectionDejaPresent.includes('docs/glossaire.md'), 'le bac « déjà présent » garde ses entrées légitimes');
});

test('rapport — sans entrée « promesse », aucun bac ne s\'affiche et rien ne parle de --force', () => {
  // Le discriminant : ce bac est propre au run `--force`. S'il s'affichait toujours, le test
  // ci-dessus serait vert pour la mauvaise raison — et le rapport d'un run normal parlerait d'un
  // drapeau que l'utilisateur n'a pas tapé.
  const out = formatReport({
    project: '/abs/mon-app', stack: 'aucune', assistant: 'claude-code',
    done: [], kept: ['docs/ETAT-DES-LIEUX.md (à remplir par l\'IA, en premier)'],
    inAssistant: [], skipped: [], failed: [],
  });
  assert.doesNotMatch(out, /--force/, 'un run sans --force ne doit pas parler de --force');
  assert.match(out, /Conservé \(déjà présent/, 'et « déjà présent » redevient la BONNE raison, là où elle est vraie');
});
