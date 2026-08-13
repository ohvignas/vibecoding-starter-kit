// scripts/lib/apprentissage.test.mjs
// LE MODE APPRENTISSAGE ENSEIGNE, IL N'INTERROGE PAS — ET CE QU'IL ENSEIGNE RESTE.
//
// Deux défauts rapportés à l'usage, le 2026-08-05.
//
// 1. IL INTERROGEAIT. La règle exigeait « pose une question de compréhension et attends sa
//    réponse » à chaque jalon. En pratique : un interrogatoire, posé au pire moment — juste après
//    un jalon réussi, quand l'utilisateur veut voir la suite. Il vient construire, pas passer un
//    examen. Ce qui manque à un débutant n'est pas qu'on le teste, c'est qu'on lui DISE ce qu'il
//    ne pouvait pas deviner : pourquoi ce choix-là, ce que veut dire ce mot-là.
//
// 2. RIEN NE RESTAIT. L'explication vivait dans le fil de la conversation, donc elle mourait avec
//    lui. Au bout de vingt jalons, l'utilisateur avait tout entendu et ne pouvait rien relire.
//    D'où `docs/APPRENTISSAGE.md` : chronologique, numéroté, empilé — lu du début à la fin, il
//    raconte la construction dans l'ordre où elle s'est faite.
//
// Le carnet est SEMÉ UNE FOIS et jamais régénéré : son contenu appartient à l'utilisateur. Il
// n'est donc ni dans `kitOwnedFiles`, ni dans `kitOwnedGenerated` — et ce test le vérifie, parce
// que l'y ajouter par mégarde détruirait exactement ce qu'on promet de garder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProjectAgentsMd } from './templates.mjs';
import { kitOwnedFiles, kitOwnedGenerated } from './kit-owned.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const GABARIT = 'templates/apprentissage/APPRENTISSAGE.md';

test('apprentissage — la règle enseigne et nomme où la leçon atterrit', () => {
  const on = renderProjectAgentsMd({ stack: 'saas', assistant: 'cursor', learning: true });
  // On traque la DEMANDE, pas le mot. Une première version interdisait « interroge » tout court —
  // elle rougissait sur la règle elle-même, qui dit « tu n'interroges pas ». Un garde qui se mord
  // la queue est un garde qu'on finit par désactiver.
  assert.doesNotMatch(on, /question de compréhension|pose (une|des) questions?|quiz/i,
    'le mode apprentissage réclame à nouveau une question : il doit expliquer, pas tester');
  assert.match(on, /APPRENTISSAGE\.md/,
    'la leçon doit atterrir dans un fichier, sinon elle meurt avec la conversation');
  assert.match(on, /pourquoi/i, 'sans le « pourquoi », la leçon ne dit que ce que l\'écran montre déjà');
});

test('apprentissage — le gabarit livré porte les quatre parties d\'une leçon', () => {
  const t = read(GABARIT);
  // Les quatre, et le « pourquoi » est celle qui compte : le résultat, il le voit à l'écran.
  for (const [motif, pourquoi] of [
    [/Ce qu'on vient de faire/, 'ce qui existe maintenant'],
    [/Pourquoi comme ça/, 'LA décision — le cœur de la leçon'],
    [/Le mot du jour/, 'le terme qu\'il ne connaissait pas'],
    [/Fun fact/, 'ce qu\'on retient'],
  ]) assert.match(t, motif, `le gabarit a perdu « ${pourquoi} »`);
  assert.match(t, /chronologique|à la suite/i, 'rien ne dit que le carnet s\'empile dans l\'ordre');
  assert.match(t, /Aucune question|n'interroges pas/i, 'le gabarit doit répéter l\'interdit : c\'est lui que l\'IA relit');
});

test('apprentissage — le carnet n\'est JAMAIS régénéré : ce qu\'il contient est à l\'utilisateur', () => {
  let vu = 0;
  for (const stack of ['saas', 'mobile', 'desktop', 'vitrine']) {
    for (const assistant of ['cursor', 'claude-code', 'codex']) {
      const cibles = [...kitOwnedFiles(stack, assistant), ...kitOwnedGenerated(stack, assistant)].map((p) => p.to);
      vu += cibles.length;
      assert.ok(!cibles.includes('docs/APPRENTISSAGE.md'),
        `${stack}/${assistant} : le carnet est régénérable — un --refresh effacerait les leçons de l'utilisateur`);
    }
  }
  // Montage : sans cible lue, « il n'y est pas » serait vrai à vide.
  assert.ok(vu > 300, `montage : ${vu} cibles lues sur 12 combinaisons — les listes sont vides ou amputées`);
});

test('apprentissage — le gabarit existe là où le scaffold va le chercher', () => {
  // `setup.mjs` copie le DOSSIER `templates/apprentissage/` vers `docs/`. Un fichier renommé, et
  // le scaffold poserait un dossier vide sans que rien ne bronche.
  const fichiers = fs.readdirSync(path.join(ROOT, 'templates/apprentissage'));
  assert.deepEqual(fichiers, ['APPRENTISSAGE.md'],
    'le dossier semé doit contenir exactement le carnet — il est copié tel quel dans docs/');
});
