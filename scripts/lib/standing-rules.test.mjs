// scripts/lib/standing-rules.test.mjs
// Lot B — les 9 règles standing de templates/agents/. Elles sont injectées dans
// l'AGENTS.md/CLAUDE.md du projet et RELUES À CHAQUE MESSAGE : une contradiction,
// un doublon ou une référence inapplicable y coûte cher. Un test par décision tranchée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderAgentsFile } from './agents-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rule = (f) => fs.readFileSync(path.join(ROOT, 'templates/agents', f), 'utf8');
const RULES = ['loop-section.md', 'design-rule.md', 'subagents-rule.md', 'verify-rule.md', 'reality-rule.md', 'proof-rule.md', 'secrets-cost-rule.md', 'css-maquette-rule.md', 'memory-rules.md'];
const allRules = () => RULES.map((f) => [f, rule(f)]);

// Le rendu RÉEL (renderAgentsFile lit les fichiers ; renderProjectAgentsMd, lui,
// vaut '' par défaut pour chaque snippet et ne prouverait rien).
const rendered = (opts = {}) => renderAgentsFile({ source: ROOT, stack: 'saas', assistant: 'claude-code', commandsDir: '.claude/commands', ...opts });
const words = (s) => s.split(/\s+/).filter(Boolean).length;

test('B1 — qui prononce PROUVÉ : une tâche = l\'agent, un jalon = le verificateur, une feature = + security-reviewer', () => {
  const proof = rule('proof-rule.md');
  assert.match(proof, /Qui prononce PROUVÉ/, 'proof-rule : la règle doit être écrite là');
  assert.match(proof, /jalon|feature/i);
  assert.match(proof, /verificateur/);
  assert.match(proof, /seul/i, 'proof-rule : le verificateur est SEUL sur un jalon');
  // verify-rule applique la même décision, sans la redéfinir : sur une feature, le
  // security-reviewer y est nommé aussi — c'est ce qu'exige le gate de /build.
  const verify = rule('verify-rule.md');
  assert.match(verify, /verificateur/);
  assert.match(verify, /security-reviewer/, 'verify-rule : sur une feature, le security-reviewer aussi');
  assert.match(verify, /Règle Preuve/, 'verify-rule : renvoie à la règle canonique');
});

test('B2 — PixelRAG est un signal indicatif, jamais un gate', () => {
  const reality = rule('reality-rule.md');
  assert.match(reality, /maquette/i, 'la fidélité à la maquette reste exigée');
  assert.doesNotMatch(reality, /[Ii]tère jusqu'à ce que/, 'aucune boucle « jusqu\'à ce que PixelRAG confirme »');
  assert.match(reality, /indicatif|jamais bloquant|non bloquant/i);
  // La comparaison d'images est décrite UNE fois, du côté du gate (verify-rule) : c'est
  // là que PixelRAG est nommé, et là qu'il est déclaré non bloquant.
  assert.doesNotMatch(reality, /PixelRAG/, 'reality-rule renvoie au gate au lieu de renommer l\'outil');
  const verify = rule('verify-rule.md');
  assert.match(verify, /PixelRAG/);
  assert.match(verify, /\*\*Non bloquant\*\*[^\n]*PixelRAG/, 'PixelRAG est du côté non bloquant du gate');
});

test('B3 — subagents-rule ne donne plus le fan-out d\'écrivains en exemple', () => {
  const t = rule('subagents-rule.md');
  assert.match(t, /jamais en parallèle/, 'l\'interdit reste');
  assert.doesNotMatch(t, /maquette\/parts\//, 'plus d\'artefact « un écran par sous-agent »');
  assert.doesNotMatch(t, /1 écran de maquette/, 'plus d\'exemple de fan-out qui ÉCRIT');
});

test('B4 — le modèle est fixé une seule fois, avec l\'exception security-reviewer', () => {
  const sub = rule('subagents-rule.md');
  assert.match(sub, /claude-sonnet-5/);
  assert.match(sub, /claude-opus-5/);
  assert.match(sub, /security-reviewer/);
  // Une seule règle porte le choix du modèle : les autres renvoient.
  for (const [f, t] of allRules()) {
    if (f === 'subagents-rule.md') continue;
    assert.doesNotMatch(t, /claude-(sonnet|opus)-\d/, `${f} : le modèle ne se redéfinit pas ici`);
  }
  assert.match(rule('secrets-cost-rule.md'), /Règle sous-agents/, 'secrets-cost renvoie au lieu de redéfinir');
});

test('B5 — 3 tentatives puis BLOQUÉ ; le retour au vert est proposé, jamais automatique', () => {
  const proof = rule('proof-rule.md');
  assert.match(proof, /3 tentatives/);
  assert.match(proof, /BLOQUÉ/);
  assert.match(proof, /propose|option/i, 'le retour au dernier état vert est une option soumise à l\'utilisateur');
  assert.doesNotMatch(proof, /Reviens au dernier état vert/, 'jamais un ordre automatique');
  // Ailleurs : un renvoi d'une ligne, pas une seconde définition.
  for (const f of ['loop-section.md', 'secrets-cost-rule.md']) {
    const t = rule(f);
    if (/3 (essais|tentatives)/.test(t)) assert.match(t, /Règle Preuve/, `${f} : renvoie à la règle canonique`);
    assert.doesNotMatch(t, /Reviens au dernier état vert/, `${f} : ne réordonne pas le retour arrière`);
  }
});

test('B6 — l\'exception « mocks dans les fichiers de test » est écrite une seule fois', () => {
  const holders = allRules().filter(([, t]) => /fichiers de test/.test(t)).map(([f]) => f);
  assert.deepEqual(holders, ['reality-rule.md'], 'une seule règle porte l\'exception');
  assert.match(rule('reality-rule.md'), /exception/i);
  assert.match(rule('proof-rule.md'), /Règle Réalité/, 'proof-rule renvoie au lieu de répéter');
});

test('B7 — plus de plugin fantôme : git commit / gh pr create', () => {
  for (const [f, t] of allRules()) {
    assert.doesNotMatch(t, /commit-commands/, `${f} : plugin jamais installé`);
  }
  const loop = rule('loop-section.md');
  assert.match(loop, /git commit/);
  assert.match(loop, /gh pr create/);
});

test('B8 — la branche de merge est main (le scaffold ne crée que main)', () => {
  const loop = rule('loop-section.md');
  assert.match(loop, /merge \(`?main`?\)/i);
  assert.match(loop, /mergé sur \*?\*?`main`/);
  for (const [f, t] of allRules()) {
    assert.doesNotMatch(t, /\bmerge\b[^\n]*\bdev\b/i, `${f} : plus de merge sur dev`);
    assert.doesNotMatch(t, /sur `dev`/, `${f} : plus de branche dev`);
  }
});

test('B9 — aucune référence inapplicable hors Claude Code', () => {
  const loop = rule('loop-section.md');
  // /code-review et /security-review n'existent que sur Claude Code : si on les cite,
  // on le dit, et on donne l'équivalent qui marche partout (les sous-agents du kit).
  for (const cmd of ['/code-review', '/security-review']) {
    if (loop.includes(cmd)) assert.match(loop, /Claude Code/, `${cmd} : sa limite doit être dite`);
  }
  assert.match(loop, /code-reviewer/);
  assert.match(loop, /security-reviewer/);
  // Le navigateur intégré : Codex n'en a pas, la règle doit le dire.
  const verify = rule('verify-rule.md');
  assert.match(verify, /Cursor et Claude Code/);
  assert.match(verify, /Codex/, 'verify-rule : le cas Codex est traité');
});

test('B10 — dédoublonnage : une occurrence canonique par consigne', () => {
  const count = (re) => allRules().filter(([, t]) => re.test(t)).map(([f]) => f).sort();
  // Chaque consigne transverse n'a plus qu'un porteur (les autres renvoient par leur nom).
  assert.deepEqual(count(/anti-flemme/i), ['loop-section.md']);
  assert.deepEqual(count(/toMatchAriaSnapshot/), ['verify-rule.md']);
  assert.deepEqual(count(/systematic-debugging/), ['verify-rule.md']);
  assert.deepEqual(count(/PixelRAG/), ['verify-rule.md']);
  assert.deepEqual(count(/Playwright|Maestro/), ['verify-rule.md']);
  // Le journal : `proof-rule` dit ce qu'on y colle, `verify-rule` quand — et, depuis le Lot C,
  // `subagents-rule` dit QUI l'écrit quand le sous-agent délégué est bridé en écriture. Trois
  // consignes distinctes sur le même fichier, pas trois définitions du même point.
  assert.deepEqual(count(/JOURNAL\.md/), ['proof-rule.md', 'subagents-rule.md', 'verify-rule.md']);
  assert.deepEqual(count(/3 (essais|tentatives)/), ['proof-rule.md', 'secrets-cost-rule.md']);
  assert.deepEqual(count(/[Ss]creenshot|capture navigateur/i), ['verify-rule.md']);
});

test('B11 — ordre de lecture : Preuve avant Vérification, design après les transverses', () => {
  const md = rendered();
  const at = (h) => { const i = md.indexOf(h); assert.notEqual(i, -1, `section absente : ${h}`); return i; };
  assert.ok(at('## Règle Preuve') < at('## Règle de vérification'), 'la Preuve pose le vocabulaire que la Vérification utilise');
  assert.ok(at('## Règle Réalité') < at('## Règle de vérification'), 'la Réalité (mocks) est posée avant');
  assert.ok(at('## Règle design') > at('## Règle sous-agents'), 'design après les règles transverses');
  assert.ok(at('## Règle design') > at('## Règle secrets & coûts'));
  assert.ok(at('## Règle design') < at('## Règle CSS maquette → app (hygiène)'));
});

test('B12 — l\'AGENTS.md rendu tient sous 2 200 mots (relu à chaque message)', () => {
  // Les 4 stacks, pas seulement saas : le rendu mobile substitue ses règles UI (Lot G4), et une
  // substitution plus bavarde que la phrase d'origine crèverait le plafond sans rien faire rougir.
  for (const stack of ['saas', 'mobile', 'desktop', 'vitrine']) {
    for (const assistant of ['cursor', 'claude-code', 'codex']) {
      for (const learning of [true, false]) {
        const n = words(rendered({ stack, assistant, learning }));
        assert.ok(n <= 2200, `${stack}/${assistant} (learning=${learning}) : ${n} mots > 2200`);
      }
    }
  }
  // Le seuil mord : au-dessus de 2 200, le test doit échouer.
  assert.equal(words(`${rendered()} ${'mot '.repeat(2200)}`) > 2200, true);
});

// Lot A couvre déjà tout le dépôt pour ce qu'il a supprimé (voir degraissage.test.mjs).
// Ici : ce que le Lot B a retiré des règles standing, et qui ne doit pas revenir.
test('B13 — aucune règle standing ne référence quelque chose d\'inexistant', () => {
  const ORPHELINS = [/commit-commands/, /\bdev\b(?!elopment)/, /Modèle adapté/];
  const restes = [];
  for (const [f, t] of allRules()) {
    t.split('\n').forEach((line, i) => {
      for (const m of ORPHELINS) if (m.test(line)) restes.push(`templates/agents/${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(restes, [], `références orphelines :\n${restes.join('\n')}`);
});

// Une « règle standing » n'est pas seulement `templates/agents/` : tout fichier `alwaysApply: true`
// est relu à CHAQUE message par Cursor, au même titre qu'AGENTS.md. La revue du Lot B a trouvé
// `00-project.mdc` en train de redéfinir — et contredire — la règle des 3 tentatives.
test('B13 — aucune règle alwaysApply ne redéfinit ce qu\'AGENTS.md porte déjà', () => {
  const permanents = fs.readdirSync(path.join(ROOT, 'templates/cursor/rules'))
    .filter((f) => f.endsWith('.mdc'))
    .map((f) => [`templates/cursor/rules/${f}`, fs.readFileSync(path.join(ROOT, 'templates/cursor/rules', f), 'utf8')])
    .filter(([, t]) => /^alwaysApply:\s*true/m.test(t));
  assert.ok(permanents.length > 0, 'au moins une règle Cursor permanente attendue');

  // Une seconde définition, c'est une contradiction en puissance : on veut un RENVOI.
  // Nommer le sujet est légitime (« zéro placeholder → « Boucle d'itération » ») ; ce qui ne l'est
  // pas, c'est de le REDÉFINIR — donc : la ligne parle du sujet SANS pointer vers la règle qui le porte.
  const SUJETS = [
    [/3 (essais|corrections|tentatives)/i, 'les 3 tentatives', /Règle Preuve/],
    [/zéro placeholder/i, "l'anti-flemme", /Boucle d'itération/],
    [/action destructive/i, 'les actions destructives', /Règle secrets/],
  ];
  const fautes = [];
  for (const [f, t] of permanents) {
    for (const line of t.split('\n')) {
      for (const [sujet, quoi, renvoi] of SUJETS) {
        if (sujet.test(line) && !renvoi.test(line)) fautes.push(`${f} : redéfinit ${quoi} au lieu d'y renvoyer → « ${line.trim().slice(0, 80)} »`);
      }
    }
  }
  assert.deepEqual(fautes, [], `règles permanentes qui redéfinissent :\n${fautes.join('\n')}`);
});
