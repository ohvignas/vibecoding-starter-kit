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

// Ajoute une entrée de hook si sa commande n'est pas déjà câblée (idempotent : un re-run du
// scaffold ne duplique jamais le hook).
function addHook(base, event, matcher, command) {
  base.hooks[event] = base.hooks[event] || [];
  const already = base.hooks[event].some((e) => (e.hooks || []).some((h) => h.command === command));
  if (!already) base.hooks[event].push({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command }] });
}

export function claudeSettings(existingJson, onEditIds) {
  const base = existingJson ? JSON.parse(existingJson) : {};
  base.hooks = base.hooks || {};
  addHook(base, 'PostToolUse', 'Edit|Write', RUN(onEditIds));
  // Mémoire du projet + prochain jalon injectés au démarrage de session.
  addHook(base, 'SessionStart', null, 'node .claude/hooks/inject-memory.mjs');
  // Garde-fou avant toute commande shell (rm -rf /, curl | sh, lecture de .env…).
  addHook(base, 'PreToolUse', 'Bash', 'node .claude/hooks/guard-shell.mjs');
  return JSON.stringify(base, null, 2) + '\n';
}

export function prePushScript(prePushIds) {
  const body = prePushIds.length ? RUN(prePushIds) : 'true';
  return `#!/usr/bin/env bash\n# Pre-push vibe-stack : checks plus lourds (non bloquants).\nset -e\n${body}\n`;
}

export function preCommitCheckLine(preCommitIds) {
  return RUN(preCommitIds);
}
