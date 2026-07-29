import path from 'node:path';

const STACKS = ['saas', 'mobile', 'desktop', 'vitrine'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  // source: null = « non fourni » → setup.mjs y mettra la racine du kit (dérivée de import.meta.url).
  // `--mockup` (jamais lu par personne) et `args.yes` (le mode non interactif se décide sur `argv`,
  // dans needsWizard) ont été retirés : deux champs que le wizard recopiait consciencieusement
  // d'un objet à l'autre, et que rien n'a jamais consommé.
  const args = { stack: null, assistant: null, project: null, source: null, dryRun: false, force: false, caveman: false, learning: true, refresh: false };
  // Une option à valeur ne doit JAMAIS avaler le drapeau suivant : `--project --no-skills` donnait
  // un projet nommé « --no-skills » ET perdait silencieusement --no-skills.
  const valueOf = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('-')) throw new Error(`${flag} attend une valeur`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--stack': args.stack = valueOf(a, i); i++; break;
      case '--assistant': args.assistant = valueOf(a, i); i++; break;
      case '--project': args.project = valueOf(a, i); i++; break;
      case '--source': args.source = valueOf(a, i); i++; break;
      case '--dry-run': args.dryRun = true; break;
      case '--refresh': args.refresh = true; break;
      case '--force': args.force = true; break;
      case '--caveman': args.caveman = true; break;
      case '--backend': args.backend = valueOf(a, i); i++; break;
      case '--no-skills': args.noSkills = true; break;
      case '--no-learning': args.learning = false; break;
      // Accepté, mais sans champ : c'est `needsWizard(argv, isTTY)` qui le lit, dans argv.
      case '--yes': break;
      default:
        // Nom de projet positionnel (npm create vibecoding-kit mon-app). --project reste prioritaire.
        if (!a.startsWith('-') && args.project === null) { args.project = a; break; }
        throw new Error(`Argument inconnu : ${a}`);
    }
  }
  return args;
}

// SOURCE UNIQUE de « ce nom de projet est-il acceptable ? ». Le wizard portait sa propre règle
// (`/^[\w./~-]+$/`) qui refusait justement ce que celle-ci accepte : le même nom passait en
// drapeau et échouait à la question.
// Espaces et accents ACCEPTÉS (« C:\Users\Jean Dupont\app », « projet-café ») : les refuser bloquait
// le cas Windows le plus banal et un public francophone. On interdit seulement ce qui est dangereux
// pour un shell ou un chemin (métacaractères, retours à la ligne, caractères de contrôle).
export function isValidProjectName(project) {
  return Boolean(project) && typeof project === 'string' && Boolean(project.trim()) && !/[;&|`$(){}<>*?!\n\r\t\0]/.test(project);
}

export function validateArgs(args) {
  const errors = [];
  if (!STACKS.includes(args.stack)) errors.push(`--stack doit valoir ${STACKS.join('|')}`);
  if (!ASSISTANTS.includes(args.assistant)) errors.push(`--assistant doit valoir ${ASSISTANTS.join('|')}`);
  if (!isValidProjectName(args.project)) errors.push('--project : nom invalide');
  if (args.backend !== undefined && !['cloud', 'local'].includes(args.backend)) errors.push('--backend doit valoir cloud|local');
  return errors;
}

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
export function resolveProjectDir(project, baseDir, cwd = process.cwd()) {
  if (path.isAbsolute(project)) return path.resolve(project);
  // « . » et « ./ » = le dossier COURANT. Sans ce cas, `path.resolve(baseDir, '.')` renvoyait
  // le dossier parent du kit — donc le HOME quand le kit tourne depuis npx : le scaffold
  // (et son `git init` + `git add -A`) atterrissait dans le dossier personnel de l'utilisateur.
  const normalized = project.replace(/[\\/]+$/, '');
  if (normalized === '.' || normalized === '') return path.resolve(cwd);
  if (project.includes('/') || project.includes('\\')) return path.resolve(cwd, project);
  return path.resolve(baseDir, project);
}

// Où créer le projet par défaut :
// - clone du kit → à CÔTÉ du clone (kitRoot/..), pour ne pas polluer le dépôt du kit ;
// - installé via npm/npx (kitRoot dans node_modules) → dans le cwd de l'utilisateur.
export function projectBaseDir(kitRoot, cwd) {
  return kitRoot.includes('node_modules') ? cwd : path.join(kitRoot, '..');
}
