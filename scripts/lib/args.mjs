import path from 'node:path';

const STACKS = ['saas', 'mobile', 'desktop'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  // source: null = « non fourni » → setup.mjs y mettra la racine du kit (dérivée de import.meta.url).
  const args = { stack: null, assistant: null, project: null, mockup: null, source: null, dryRun: false, force: false, caveman: false, yes: false, learning: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--stack': args.stack = argv[++i]; break;
      case '--assistant': args.assistant = argv[++i]; break;
      case '--project': args.project = argv[++i]; break;
      case '--mockup': args.mockup = argv[++i]; break;
      case '--source': args.source = argv[++i]; break;
      case '--dry-run': args.dryRun = true; break;
      case '--force': args.force = true; break;
      case '--caveman': args.caveman = true; break;
      case '--backend': args.backend = argv[++i]; break;
      case '--no-skills': args.noSkills = true; break;
      case '--no-learning': args.learning = false; break;
      case '--yes': args.yes = true; break;
      default:
        // Nom de projet positionnel (npm create vibecoding-kit mon-app). --project reste prioritaire.
        if (!a.startsWith('-') && args.project === null) { args.project = a; break; }
        throw new Error(`Argument inconnu : ${a}`);
    }
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!STACKS.includes(args.stack)) errors.push(`--stack doit valoir ${STACKS.join('|')}`);
  if (!ASSISTANTS.includes(args.assistant)) errors.push(`--assistant doit valoir ${ASSISTANTS.join('|')}`);
  // `:` et `\` autorisés pour les chemins absolus Windows (ex. C:\Users\eleve\app). Espace toujours refusé.
  if (!args.project || !/^[\w.:/~\\-]+$/.test(args.project)) errors.push('--project : nom invalide');
  if (args.backend !== undefined && !['cloud', 'local'].includes(args.backend)) errors.push('--backend doit valoir cloud|local');
  return errors;
}

export const KNOWN = { STACKS, ASSISTANTS };

// Étend ~ vers le dossier personnel : le shell ne le fait pas quand la valeur vient du wizard
// ou d'un drapeau quoté ("~/mon-app"). Sans ça, un dossier littéral « ~ » est créé dans le projet.
export function expandHome(p, home) {
  if (typeof p !== 'string' || !p.startsWith('~')) return p;
  if (p === '~') return home;
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
  return p; // formes ~autre-utilisateur : non gérées, renvoyées telles quelles
}

// Un nom nu (sans séparateur) atterrit EN DEHORS du clone du kit : ../<nom> par rapport à la
// racine du kit. Un chemin explicite (relatif avec séparateur, ou absolu) est respecté tel quel.
// Dossier de base où créer le projet, calculé par l'appelant (voir projectBaseDir).
export function resolveProjectDir(project, baseDir) {
  if (path.isAbsolute(project)) return path.resolve(project);
  if (project.includes('/') || project.includes('\\')) return path.resolve(project);
  return path.resolve(baseDir, project);
}

// Où créer le projet par défaut :
// - clone du kit → à CÔTÉ du clone (kitRoot/..), pour ne pas polluer le dépôt du kit ;
// - installé via npm/npx (kitRoot dans node_modules) → dans le cwd de l'utilisateur.
export function projectBaseDir(kitRoot, cwd) {
  return kitRoot.includes('node_modules') ? cwd : path.join(kitRoot, '..');
}
