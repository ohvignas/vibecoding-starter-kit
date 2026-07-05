import { execFileSync } from 'node:child_process';

export function parseNodeVersion(v) {
  const [maj, min] = v.replace(/^v/, '').split('.').map(Number);
  return { major: maj || 0, minor: min || 0 };
}

export function meetsNode(v, min = { major: 20, minor: 12 }) {
  const { major, minor } = parseNodeVersion(v);
  return major > min.major || (major === min.major && minor >= min.minor);
}

export function ensureGit(run = () => execFileSync('git', ['--version'])) {
  try { run(); return true; } catch { return false; }
}
