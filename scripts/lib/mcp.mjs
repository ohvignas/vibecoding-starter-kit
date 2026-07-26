// Les apps GUI (Cursor, Claude Desktop) n'héritent PAS du PATH du shell (~/.zshrc) : un
// `command` nu (ex. "maestro") donne `spawn ENOENT`. On étend un chemin `~/…` en absolu au
// moment d'écrire la config, avec le home réel de la machine.
export function expandMcpCommands(servers, home) {
  const out = {};
  for (const [name, cfg] of Object.entries(servers)) {
    out[name] = (cfg && typeof cfg.command === 'string' && cfg.command.startsWith('~/'))
      ? { ...cfg, command: `${home}/${cfg.command.slice(2)}` }
      : cfg;
  }
  return out;
}

// Merge non destructif de config MCP (.mcp.json / .cursor/mcp.json).
// Ne réécrit jamais un serveur déjà présent. Retire les métas internes (`needsAuth`, `prereq`).
export function mergeMcpConfig(existingJson, mcpServers) {
  const base = existingJson ? JSON.parse(existingJson) : {};
  const servers = { ...(base.mcpServers || {}) };
  for (const [name, cfg] of Object.entries(mcpServers)) {
    if (!(name in servers)) {
      const { needsAuth, prereq, ...rest } = cfg;
      servers[name] = rest;
    }
  }
  base.mcpServers = servers;
  return JSON.stringify(base, null, 2) + '\n';
}
