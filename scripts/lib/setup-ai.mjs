// Rend docs/SETUP-AI.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/superpowers).
// Les skills design sont déjà installés par le wizard.
import { buildSkillAddArgs } from './external.mjs';

export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote }) {
  const L = [];
  L.push(`# Setup IA — stack ${stack} · assistant ${assistant}`);
  L.push('');
  L.push('Joue chaque case dans ton assistant IA. Coche au fur et à mesure.');
  L.push('');
  L.push('## 1. Plugins');
  if (manifest.plugins.length) for (const p of manifest.plugins) L.push(`- [ ] ${p.cmd}   (${p.name})`);
  else L.push('- [ ] (aucun plugin dédié pour cet assistant)');
  L.push('');
  L.push('## 2. Skills portables (stack)');
  if (manifest.skills.length) {
    L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
    L.push('- (si un install a échoué — réseau — relance à la main :)');
    for (const s of manifest.skills) L.push(`  - \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : lance \`/mcp\` pour connecter${cfg.needsAuth ? ' (login requis)' : ' (déjà dans .mcp.json)'}`);
  }
  L.push('');
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  L.push('');
  L.push('## 5. Design');
  L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, web-design-guidelines, ui-ux-pro-max');
  L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant)}`);
  L.push('');
  L.push('## 6. Scripts package.json (à ajouter si absents après le scaffold)');
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}
