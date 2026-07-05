// scripts/lib/external.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { copyIfAbsent } from './fsops.mjs';

const defaultRun = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

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

export function selectByTags(rulesDir, tags) {
  if (!fs.existsSync(rulesDir)) return [];
  return fs.readdirSync(rulesDir).filter(f => tags.some(t => f.toLowerCase().includes(t)));
}

export function installCaveman(run = defaultRun) {
  run('bash', ['-lc', 'curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash']);
}
