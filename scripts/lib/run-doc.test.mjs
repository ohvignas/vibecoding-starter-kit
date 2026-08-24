// scripts/lib/run-doc.test.mjs
// LE `docs/RUN.md` D'UN PROJET ADOPTÉ NE DIT QUE CE QU'IL A VU.
//
// ⛔ Le défaut d'origine (spec, décision 4) : sur un projet existant, `docs/RUN.md` était rendu
// depuis `templates/run/<stack>.md` et annonçait « Lancer l'app — SaaS (Convex + TanStack Start) ·
// `npx convex dev` » dans un projet qui n'avait ni Convex ni TanStack. Le SEUL fichier qu'un
// débutant ouvre pour lancer son app lui mentait, avec l'autorité du kit derrière.
//
// `adoption.test.mjs` juge le fichier ÉCRIT par un `--adopt` réel (3 cas). Ce fichier-ci juge le
// RENDU, cas par cas — les quatre façons de n'avoir rien à relever, que le CLI ne peut pas toutes
// mettre en scène sans quatre scaffolds. La propriété est la même dans les quatre : **rien
// d'inventé**, et ce qui manque est DIT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRunDocObserve, LOCKFILES } from './run-doc.mjs';

// La preuve d'absence d'invention, écrite une fois : aucune commande de gestionnaire de paquets ne
// doit apparaître dans un rendu qui n'a rien relevé. La regex vise la forme exacte que le rendu
// produit (`<runner> run <script>`), et couvre les quatre runners.
const AUCUNE_COMMANDE = /\b(npm|pnpm|yarn|bun) run \w/;

test('run-doc observé — pas de package.json : on le DIT, on n\'invente aucune commande', () => {
  const t = renderRunDocObserve({ pkg: null, fichiers: ['index.html', 'style.css'] });
  assert.match(t, /package\.json/, 'il doit dire CE QU\'IL A CHERCHÉ, sinon on ne sait pas s\'il a mal cherché');
  assert.match(t, /pas trouvé/i);
  assert.doesNotMatch(t, AUCUNE_COMMANDE, 'aucune commande ne doit sortir de nulle part');
});

test('run-doc observé — package.json illisible : on le DIT, on ne devine pas le contenu', () => {
  const t = renderRunDocObserve({ pkg: '{ ceci n\'est pas du JSON', fichiers: ['package.json'] });
  assert.match(t, /JSON valide/i, 'un JSON cassé est un CAS nommé, pas une panne silencieuse');
  assert.doesNotMatch(t, AUCUNE_COMMANDE);
});

test('run-doc observé — package.json sans `scripts` : rien à relever, et c\'est écrit', () => {
  const t = renderRunDocObserve({ pkg: '{"name":"x","dependencies":{"react":"^19"}}', fichiers: ['package.json'] });
  assert.match(t, /aucune entrée `scripts`/i);
  assert.doesNotMatch(t, AUCUNE_COMMANDE);
  // Et surtout : la dépendance VUE ne devient pas une commande devinée. `react` dans les
  // dépendances ne prouve ni `npm run dev`, ni un serveur, ni un port.
  assert.ok(!t.includes('react'), 'une dépendance n\'est pas une commande : ne la transforme pas en consigne');
});

test('run-doc observé — les scripts sont relevés TELS QUELS, avec ce qu\'ils lancent', () => {
  const t = renderRunDocObserve({
    pkg: '{"scripts":{"dev":"vite --host","ci:test":"vitest run --coverage"}}',
    fichiers: ['package.json'],
  });
  // Le nom seul ne dit pas ce que fait `dev` : c'est la commande RÉELLE qui informe.
  assert.ok(t.includes('`npm run dev`'), 'le nom du script');
  assert.ok(t.includes('vite --host'), 'ET la commande réelle, options comprises');
  assert.ok(t.includes('`npm run ci:test`'), 'un nom à deux points est un nom comme un autre');
  assert.ok(t.includes('vitest run --coverage'));
  // Aucun script inventé : exactement ceux du package.json, ni plus.
  for (const jamais of ['npm run build', 'npm run start', 'npm run lint']) {
    assert.ok(!t.includes(jamais), `« ${jamais} » n'est pas dans le package.json : il ne doit pas être rendu`);
  }
  // Sans lockfile, `npm` est une HYPOTHÈSE — et une hypothèse se déclare, sinon elle se lit
  // comme un relevé.
  assert.match(t, /aucun lockfile/i, 'npm sans lockfile est une supposition : elle doit être annoncée comme telle');
});

test('run-doc observé — un `|` dans un script ne casse pas le tableau', () => {
  // Une commande avec un pipe (`tsc | tee log`) coupe une cellule Markdown en deux et décale toute
  // la ligne : la colonne « ce que ça lance » se met à mentir sur la commande d'à côté.
  const t = renderRunDocObserve({ pkg: '{"scripts":{"check":"tsc --noEmit | tee tsc.log"}}', fichiers: [] });
  const ligne = t.split('\n').find((l) => l.includes('npm run check'));
  assert.ok(ligne, 'montage : la ligne du script doit exister');
  // On compte les barres NON ÉCHAPPÉES : ce sont elles qui découpent les cellules. Un `\|` reste
  // un caractère `|` dans la chaîne — compter les barres brutes donnait 4 et faisait rougir un
  // échappement pourtant correct.
  assert.equal(ligne.replace(/\\\|/g, '').split('|').length - 1, 3,
    'un tableau à 2 colonnes a 3 séparateurs : le pipe du script doit être échappé');
  assert.ok(ligne.includes('tee tsc.log'), 'et la commande doit rester lisible en entier, pas tronquée');
});

test('run-doc observé — chaque lockfile connu donne SON gestionnaire, et il est nommé', () => {
  // Le lockfile est sur le disque : c'est une OBSERVATION, pas une préférence. Écrire `npm run dev`
  // dans un projet pnpm, c'est la première commande que l'utilisateur copie — et elle refait son
  // lockfile. La boucle couvre les 4 d'un coup : un runner ajouté sans rendu suivrait ici.
  for (const [fichier, runner] of LOCKFILES) {
    const t = renderRunDocObserve({ pkg: '{"scripts":{"dev":"vite"}}', fichiers: ['package.json', fichier] });
    assert.ok(t.includes(`\`${runner} run dev\``), `${fichier} doit donner « ${runner} run dev »`);
    assert.ok(t.includes(fichier), `${fichier} doit être NOMMÉ : c'est la preuve du choix, pas un réglage caché`);
  }
});

test('run-doc observé — la rubrique « ce que je n\'ai pas pu déterminer » est TOUJOURS là', () => {
  // Elle n'est pas une politesse : un `scripts` de douze entrées ne dit pas laquelle lance l'app,
  // ni ce qu'il faut avant. Sans la question écrite, c'est l'IA qui comble — en devinant.
  for (const pkg of [null, '{"scripts":{"dev":"vite"}}', '{"name":"x"}']) {
    assert.match(renderRunDocObserve({ pkg, fichiers: [] }), /pas pu déterminer/i);
  }
});
