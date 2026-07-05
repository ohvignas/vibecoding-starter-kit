const STACKS = ['saas', 'mobile', 'desktop'];
const ASSISTANTS = ['cursor', 'claude-code', 'codex'];

export function parseArgs(argv) {
  const args = { stack: null, assistant: null, project: null, mockup: null, source: '.', dryRun: false, force: false, caveman: false };
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
      default: throw new Error(`Argument inconnu : ${a}`);
    }
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!STACKS.includes(args.stack)) errors.push(`--stack doit valoir ${STACKS.join('|')}`);
  if (!ASSISTANTS.includes(args.assistant)) errors.push(`--assistant doit valoir ${ASSISTANTS.join('|')}`);
  if (!args.project || !/^[\w./~-]+$/.test(args.project)) errors.push('--project : nom invalide');
  return errors;
}

export const KNOWN = { STACKS, ASSISTANTS };
