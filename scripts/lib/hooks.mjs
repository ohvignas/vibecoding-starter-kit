// Construit le câblage des hooks (Cursor / Claude Code / git) à partir des ids de checks.
// Toutes les commandes appellent le runner copié dans .githooks/checks.mjs.
const RUN = (ids) => `node .githooks/checks.mjs ${ids.join(' ')}`;

export function extendCursorHooks(existingJson, onEditIds) {
  const base = existingJson ? JSON.parse(existingJson) : { version: 1, hooks: {} };
  base.hooks = base.hooks || {};
  base.hooks.afterFileEdit = base.hooks.afterFileEdit || [];
  const cmd = RUN(onEditIds);
  if (!base.hooks.afterFileEdit.some((h) => h.command === cmd)) {
    base.hooks.afterFileEdit.push({ command: cmd, type: 'command' });
  }
  return JSON.stringify(base, null, 2) + '\n';
}

export function claudeSettings(existingJson, onEditIds) {
  const base = existingJson ? JSON.parse(existingJson) : {};
  base.hooks = base.hooks || {};
  base.hooks.PostToolUse = base.hooks.PostToolUse || [];
  const cmd = RUN(onEditIds);
  const already = base.hooks.PostToolUse.some((e) => (e.hooks || []).some((h) => h.command === cmd));
  if (!already) {
    base.hooks.PostToolUse.push({ matcher: 'Edit|Write', hooks: [{ type: 'command', command: cmd }] });
  }
  return JSON.stringify(base, null, 2) + '\n';
}

export function prePushScript(prePushIds) {
  const body = prePushIds.length ? RUN(prePushIds) : 'true';
  return `#!/usr/bin/env bash\n# Pre-push vibe-stack : checks plus lourds (non bloquants).\nset -e\n${body}\n`;
}

export function preCommitCheckLine(preCommitIds) {
  return RUN(preCommitIds);
}
