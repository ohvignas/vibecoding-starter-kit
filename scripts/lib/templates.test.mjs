// scripts/lib/templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCursorMdc, renderProjectAgentsMd } from './templates.mjs';
import { MARK_START, MARK_END } from './managed-section.mjs';
import { COMMANDS } from './commands-list.mjs';

test('toCursorMdc encadre le corps avec un frontmatter', () => {
  const out = toCursorMdc({ description: 'Règles X', body: 'CONTENU' });
  assert.match(out, /^---\n/);
  assert.match(out, /description: "Règles X"/);
  assert.match(out, /alwaysApply: true/);
  assert.match(out, /CONTENU/);
});

test('toCursorMdc échappe les descriptions dangereuses', () => {
  const out = toCursorMdc({ description: 'a\nb: c', body: 'X' });
  assert.match(out, /description: "a b: c"/);      // newline -> space, quoted
  const fm = out.split('---')[1];                   // frontmatter block
  assert.equal(fm.match(/description:/g).length, 1); // description on a single line
});

test('renderProjectAgentsMd compose la boucle + @import mémoire, sans BMAD', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', commandsDir: '.cursor/commands', loopSection: 'BOUCLE-SP', designRule: 'REGLE-DESIGN', subagentsRule: 'REGLE-SUBAGENTS', verifyRule: 'REGLE-VERIF', realityRule: 'REGLE-REALITE', proofRule: 'REGLE-PREUVE', secretsRule: 'REGLE-SECRETS', cssMaquetteRule: 'REGLE-CSS', memoryRules: 'REGLES-MEMOIRE' });
  assert.match(out, /@docs\/memory\/index\.md/);
  assert.match(out, /BOUCLE-SP/);
  assert.match(out, /REGLE-DESIGN/);
  assert.match(out, /REGLE-SUBAGENTS/);
  assert.match(out, /REGLE-VERIF/);
  assert.match(out, /REGLE-REALITE/);
  assert.match(out, /REGLE-PREUVE/);
  assert.match(out, /REGLE-SECRETS/);
  assert.match(out, /REGLE-CSS/);
  assert.match(out, /REGLES-MEMOIRE/);
  assert.match(out, /saas/);
  assert.match(out, /new-project/);
  assert.doesNotMatch(out, /BMAD/i);
});

// E10 — l'AGENTS.md n'annonçait que 4 commandes sur 10. Les six manquantes sont justement celles
// qu'on cherche quand ça va mal (`/sos`, `/doctor`, `/next`) ou quand on veut publier (`/deploy`) :
// l'IA relit ce fichier à chaque message, elle ne peut proposer que ce qui y est écrit.
test('E10 — les 10 commandes sont annoncées, avec le dossier où les trouver', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'claude-code', commandsDir: '.claude/commands' });
  for (const c of COMMANDS) assert.match(out, new RegExp(`\`/${c}\``), `/${c} : jamais annoncée`);
  assert.match(out, /\.claude\/commands\//, 'et le chemin des runbooks');
});

// LE MODE APPRENTISSAGE ENSEIGNE, IL N'INTERROGE PAS. Il exigeait « une question de compréhension
// à chaque jalon, attends sa réponse ». À l'usage, ça produisait un interrogatoire : l'utilisateur
// venait construire, pas passer un examen, et la question arrivait au pire moment — juste après un
// jalon réussi. Ce test figeait la chaîne `question de compréhension` ; il fige maintenant
// l'inverse, parce que la réintroduire est le retour en arrière qu'on veut voir rougir.
test('mode apprentissage : la section enseigne, ne questionne pas, et absente si learning:false', () => {
  const on = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', learning: true });
  assert.match(on, /Mode apprentissage/);
  assert.doesNotMatch(on, /question de compréhension/i, 'le mode apprentissage n\'interroge plus : il explique');
  assert.match(on, /APPRENTISSAGE\.md/, 'la leçon doit atterrir quelque part, sinon elle est perdue au tour suivant');
  const off = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', learning: false });
  assert.doesNotMatch(off, /Mode apprentissage/);
});

test('renderProjectAgentsMd : corps managé entre marqueurs + zone utilisateur dessous', () => {
  const out = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', loopSection: 'BOUCLE' });
  assert.ok(out.includes(MARK_START) && out.includes(MARK_END), 'marqueurs présents');
  assert.ok(out.indexOf('BOUCLE') > out.indexOf(MARK_START) && out.indexOf('BOUCLE') < out.indexOf(MARK_END), 'boucle DANS le bloc managé');
  assert.ok(out.indexOf('Tes règles à toi') > out.indexOf(MARK_END), 'zone utilisateur APRÈS le bloc');
});
