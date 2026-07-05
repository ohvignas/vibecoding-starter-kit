import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function copyIfAbsent(src, dest, { force = false } = {}) {
  if (fs.existsSync(dest) && !force) return { dest, status: 'skipped-exists' };
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return { dest, status: 'copied' };
}

export function copyDirIfAbsent(srcDir, destDir, opts = {}) {
  const out = [];
  for (const e of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, e.name), d = path.join(destDir, e.name);
    if (e.isDirectory()) out.push(...copyDirIfAbsent(s, d, opts));
    else out.push(copyIfAbsent(s, d, opts));
  }
  return out;
}
