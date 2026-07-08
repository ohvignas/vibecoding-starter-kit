// scripts/lib/external.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { copyIfAbsent } from './fsops.mjs';

// Windows : `npx` est un script .cmd — depuis Node 20.12 (correctif CVE-2024-27980), execFileSync
// exige le nom exact `npx.cmd` ET `shell: true` pour le lancer (sinon ENOENT/EINVAL).
// `git` est un vrai .exe : inchangé sur toutes les plateformes.
export function buildRunCommand(cmd, platform = process.platform) {
  if (platform === 'win32' && cmd === 'npx') return { cmd: 'npx.cmd', options: { shell: true } };
  return { cmd, options: {} };
}

const defaultRun = (cmd, args) => {
  const rc = buildRunCommand(cmd);
  return execFileSync(rc.cmd, args, { stdio: 'inherit', ...rc.options });
};

export function cloneRepo(repo, dest, run = defaultRun) {
  run('git', ['clone', '--depth', '1', repo, dest]);
  return dest;
}

export function pickFromClone(cloneDir, picks, projectDir) {
  const out = [];
  for (const p of picks) {
    const src = path.join(cloneDir, p.src);
    if (!fs.existsSync(src)) { out.push({ to: p.to, status: 'missing-src' }); continue; }
    out.push(copyIfAbsent(src, path.join(projectDir, p.to)));
  }
  return out;
}

export function installCaveman(run = defaultRun) {
  run('bash', ['-lc', 'curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash']);
}

// Construit les arguments de `npx skills add <repo> [--skill …] -a <assistant> --yes`.
export function buildSkillAddArgs(spec, assistant) {
  const args = ['-y', 'skills', 'add', spec.repo];
  if (spec.all) args.push('--all');
  else if (spec.skills && spec.skills.length) args.push('--skill', ...spec.skills);
  args.push('-a', assistant, '--yes');
  return args;
}

// Installe une liste de skills (CLI skills.sh) pour l'assistant choisi. Échec gracieux.
export function installSkills(specs, assistant, run = defaultRun) {
  const done = [], failed = [];
  for (const spec of specs) {
    try { run('npx', buildSkillAddArgs(spec, assistant)); done.push(spec.label); }
    catch (e) { failed.push(`${spec.label} (${e.message})`); }
  }
  return { done, failed };
}
