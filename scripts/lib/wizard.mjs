import { validateArgs } from './args.mjs';
import { heading, menu, ok, hint } from './ui.mjs';

const STACKS = [
  { key: 'saas', label: 'SaaS web', hint: 'Convex + TanStack Start + Better Auth' },
  { key: 'mobile', label: 'Mobile', hint: 'React Native (Expo) + Convex' },
  { key: 'desktop', label: 'Desktop', hint: 'Electron' },
];
const ASSISTANTS = [
  { key: 'cursor', label: 'Cursor' },
  { key: 'claude-code', label: 'Claude Code' },
  { key: 'codex', label: 'Codex' },
];
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

// base = drapeaux déjà passés en CLI (--source, --force, --no-skills…) : conservés.
// Les réponses du wizard priment pour stack/assistant/projet/backend/caveman.
export function buildArgsFromAnswers(a, base = {}) {
  const args = {
    stack: a.stack, assistant: a.assistant, project: a.project,
    mockup: base.mockup ?? null, source: base.source ?? null, dryRun: Boolean(base.dryRun), force: Boolean(base.force),
    caveman: Boolean(a.caveman), backend: a.backend || 'cloud',
    noSkills: Boolean(base.noSkills), yes: Boolean(base.yes),
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
    '  1. Passe tout en drapeaux : node scripts/setup.mjs --stack saas|mobile|desktop --assistant cursor|claude-code|codex --project ../mon-app',
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
async function pickOne(ask, on, out, question, options) {
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
    if (/^[\w./~-]+$/.test(project)) { out.write(ok(project, on) + '\n\n'); break; }
    out.write(hint('  Nom invalide (lettres, chiffres, . / _ - ~).', on) + '\n');
  }

  let backend = 'cloud';
  if (stack === 'saas') backend = await pickOne(ask, on, out, 'Backend Convex ?', BACKENDS);

  const raw = (await ask('  Réduire les coûts IA (caveman) ? [o/N] : ')).trim().toLowerCase();
  const caveman = ['o', 'oui', 'y', 'yes'].includes(raw);
  out.write(ok(caveman ? 'caveman activé' : 'caveman désactivé', on) + '\n\n');

  return { stack, assistant, project, backend, caveman };
}
