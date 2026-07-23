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
