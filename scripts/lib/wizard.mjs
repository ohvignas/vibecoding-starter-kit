import { validateArgs, isValidProjectName, ASSISTANT_KEYS } from './args.mjs';
import { heading, menu, ok, hint } from './ui.mjs';

const STACKS = [
  { key: 'saas', label: 'SaaS web', hint: 'Convex + TanStack Start + Better Auth' },
  { key: 'mobile', label: 'Mobile', hint: 'React Native (Expo) + Convex' },
  { key: 'desktop', label: 'Desktop', hint: 'Electron' },
  { key: 'vitrine', label: 'Site vitrine / blog', hint: 'Astro (site) + Convex + Better Auth (dashboard) — SEO/GEO' },
];
// Les CLÉS viennent d'args.mjs (source unique : c'est contre elle que `validateArgs` juge) ; ce
// fichier n'ajoute que le LIBELLÉ affiché. EXPORTÉE : le parcours adopté pose la même question.
const LIBELLES = { cursor: 'Cursor', 'claude-code': 'Claude Code', codex: 'Codex' };
export const ASSISTANTS = ASSISTANT_KEYS.map((key) => ({ key, label: LIBELLES[key] ?? key }));
const BACKENDS = [
  { key: 'cloud', label: 'Cloud Convex', hint: 'compte gratuit, en ligne' },
  { key: 'local', label: 'Local', hint: 'zéro Docker, zéro compte, données dans .convex/' },
];

// Wizard seulement si terminal interactif ET config incomplète. --yes force le mode non-interactif
// (une cohorte lance UNE commande avec tous les drapeaux, jamais de question posée).
export function needsWizard(argv, isTTY) {
  if (isTTY !== true) return false;
  if (argv.includes('--yes')) return false;
  return !['--stack', '--assistant', '--project'].every((f) => argv.includes(f));
}

// L'ORDRE DES MODES DU CLI, en fonction PURE — et c'est la seule façon de l'asserter. Hors TTY,
// `needsWizard` sort à sa première ligne sans regarder les drapeaux : un test qui lance le CLI par
// un pipe ne mesure donc JAMAIS cet ordre-là (mutation jouée : « --adopt ne sort plus avant
// needsWizard » laissait la suite entièrement verte).
// Ce que l'ordre évite, mesuré : `needsWizard(['--adopt'], true) === true` (il exige --stack ET
// --assistant ET --project). Sans lui, un projet de deux ans se voyait demander « Que veux-tu
// construire ? » puis un nom de dossier à créer À CÔTÉ du kit.
export function choisirMode(argv, isTTY) {
  if (argv.includes('--refresh')) return 'refresh'; // met à jour un projet déjà généré
  if (argv.includes('--adopt')) return 'adopt';     // installe la méthode dans un projet existant
  return needsWizard(argv, isTTY) ? 'wizard' : 'drapeaux';
}

// base = drapeaux déjà passés en CLI (--source, --force, --no-skills, --caveman…) : conservés.
// Les réponses du wizard priment pour stack/assistant/projet/backend.
// caveman : OFF par défaut, activable UNIQUEMENT par le flag --caveman (donc via base) — le wizard ne le propose plus.
export function buildArgsFromAnswers(a, base = {}) {
  const args = {
    stack: a.stack, assistant: a.assistant, project: a.project,
    source: base.source ?? null, dryRun: Boolean(base.dryRun), force: Boolean(base.force),
    caveman: Boolean(base.caveman), backend: a.backend || 'cloud',
    noSkills: Boolean(base.noSkills),
    learning: a.learning !== false,
  };
  const errs = validateArgs(args);
  if (errs.length) throw new Error(errs.join(' ; '));
  return args;
}

// Ctrl+C pendant une question readline : sans handler dédié, le wizard gèle. 130 = 128 + SIGINT(2).
export function wireSigint(rl, exit = process.exit, err = console.error) {
  rl.on('SIGINT', () => {
    err('\nInstallation annulée (Ctrl+C). Rien n\'a été cassé — relance quand tu veux.');
    exit(130);
  });
  return rl;
}

export function renderNonTtyHelp() {
  return [
    'Terminal non interactif : le wizard ne peut pas poser ses questions ici.',
    'Deux options :',
    '  1. Passe tout en drapeaux : node scripts/setup.mjs --stack saas|mobile|desktop|vitrine --assistant cursor|claude-code|codex --project ../mon-app',
    '  2. Relance depuis un vrai terminal. Sous Windows, lance depuis PowerShell, pas Git Bash (MinTTY n\'est pas vu comme un terminal interactif).',
  ].join('\n');
}

export function renderBackendNote(stack, backend) {
  if (stack !== 'saas' || backend !== 'local') return '';
  return [
    '> **Backend en local (zéro Docker, zéro compte)**',
    '> Avant `npm run dev` : `npx convex deployment select local` puis `npx convex dev`',
    '> (le backend tourne en sous-processus, état dans `.convex/`).',
    '> Repasser au cloud : `npx convex deployment select dev`.',
    '',
  ].join('\n');
}

// Question à choix numérotés : redemande jusqu'à un choix valide, renvoie la clé.
// EXPORTÉE pour la même raison qu'ASSISTANTS : un second rendu de menu divergerait du premier.
export async function pickOne(ask, on, out, question, options) {
  for (;;) {
    out.write(menu(question, options, on) + '\n');
    const idx = Number.parseInt((await ask('  › ')).trim(), 10);
    if (idx >= 1 && idx <= options.length) {
      const chosen = options[idx - 1];
      out.write(ok(chosen.label, on) + '\n\n');
      return chosen.key;
    }
    out.write(hint(`  Réponds par un nombre entre 1 et ${options.length}.`, on) + '\n');
  }
}

export async function runWizard(ask, on, out = process.stdout) {
  out.write('\n' + heading('Vibecoding Starter Kit · configuration', on) + '\n\n');
  const stack = await pickOne(ask, on, out, 'Que veux-tu construire ?', STACKS);
  const assistant = await pickOne(ask, on, out, 'Quel assistant IA utilises-tu ?', ASSISTANTS);

  let project = '';
  for (;;) {
    project = (await ask('  Nom du projet (dossier — créé à côté du kit) : ')).trim();
    // Même règle que les drapeaux (isValidProjectName) : le wizard imposait sa propre regex, qui
    // refusait les espaces et les accents que `--project` accepte — donc « projet-café ».
    if (isValidProjectName(project)) { out.write(ok(project, on) + '\n\n'); break; }
    out.write(hint('  Nom invalide : évite ; & | ` $ ( ) { } < > * ? ! et les retours à la ligne.', on) + '\n');
  }

  let backend = 'cloud';
  if (stack === 'saas') backend = await pickOne(ask, on, out, 'Backend Convex ?', BACKENDS);

  const rawL = (await ask('  Mode apprentissage — l\'IA t\'explique ce qu\'elle fait et vérifie que tu suis ? [O/n] : ')).trim().toLowerCase();
  const learning = !['n', 'non', 'no'].includes(rawL);
  out.write(ok(learning ? 'mode apprentissage activé' : 'mode apprentissage désactivé', on) + '\n\n');

  return { stack, assistant, project, backend, learning };
}
