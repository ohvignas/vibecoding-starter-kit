// Rend docs/SETUP-AI.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/design).
export function renderSetupAi({ stack, assistant, manifest, designSkills }) {
  const L = [];
  L.push(`# Setup IA — stack ${stack} · assistant ${assistant}`);
  L.push('');
  L.push('Joue chaque case dans ton assistant IA. Coche au fur et à mesure.');
  L.push('');
  L.push('## 1. Plugins');
  if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})`);
  else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  L.push('');
  L.push('## 2. Skills portables');
  if (manifest.skills.length) for (const s of manifest.skills) L.push(`- [ ] ${s.cmd}`);
  else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : lance \`/mcp\` pour connecter${cfg.needsAuth ? ' (login requis)' : ' (déjà dans .mcp.json)'}`);
  }
  L.push('');
  L.push('## 4. Design (5 skills)');
  L.push(`- [ ] installe / active : ${designSkills}`);
  L.push('');
  L.push('## 5. Scripts package.json (à ajouter si absents après le scaffold)');
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}
