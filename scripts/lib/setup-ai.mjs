// Rend docs/SETUP-AI.md : la checklist que l'IA joue au 1er install (plugins/skills/MCP/superpowers).
// Les skills design sont déjà installés par le wizard.
import { buildSkillAddArgs } from './external.mjs';
import { DESIGN_SKILL_SPECS, STITCH } from './matrix.mjs';
import { cursorDeeplink } from './deeplink.mjs';

// skillsInstalled=false (wizard lancé avec --no-skills) : on liste les commandes au lieu d'un faux ✅.
export function renderSetupAi({ stack, assistant, manifest, superpowersCmd, shadcnNote, skillsInstalled = true }) {
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
    if (skillsInstalled) {
      L.push(`- ✅ déjà installés par le wizard : ${manifest.skills.map((s) => s.label).join(', ')}`);
      L.push('- (si un install a échoué — réseau — relance à la main :)');
    } else {
      L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    }
    for (const s of manifest.skills) L.push(`  - ${skillsInstalled ? '' : '[ ] '}\`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  } else L.push('- [ ] (aucun)');
  L.push('');
  L.push('## 3. MCP à autoriser');
  const connect = assistant === 'cursor'
    ? 'ouvre **Settings → MCP** dans Cursor et active-le'
    : 'lance `/mcp` pour connecter';
  for (const [name, cfg] of Object.entries(manifest.mcp)) {
    L.push(`- [ ] ${name} : ${connect}${cfg.needsAuth ? ' (login requis)' : ''}`);
    if (assistant === 'cursor' && !cfg.apiKey) L.push(`  - ou clique pour l'ajouter : ${cursorDeeplink(name, cfg)}`);
  }
  L.push('');
  L.push('## 4. Boucle superpowers');
  L.push(`- [ ] ${superpowersCmd}`);
  L.push('- [ ] Vérifie que c\'est actif : tape `/brainstorm` — si la commande est reconnue, superpowers est installé. Sinon, réinstalle le plugin (voir « plugin » au glossaire).');
  L.push('');
  L.push('## 5. Design');
  if (skillsInstalled) {
    L.push('- ✅ déjà installés par le wizard : frontend-design, brand-guidelines, web-design-guidelines, ui-ux-pro-max');
  } else {
    L.push('- ⚠️ PAS installés (wizard lancé avec --no-skills) — lance ces commandes :');
    for (const s of DESIGN_SKILL_SPECS) L.push(`  - [ ] \`npx ${buildSkillAddArgs(s, assistant).join(' ')}\``);
  }
  L.push(`- [ ] ${shadcnNote.replace('<assistant>', assistant)}`);
  L.push('');
  L.push('### Maquette IA — Stitch (si tu n\'as pas de design à fournir)');
  L.push(skillsInstalled
    ? '- ✅ skills Stitch déjà installés par le wizard (generate-design · extract-html · loop · design-md).'
    : '- ⚠️ skills Stitch PAS installés : couverts par les commandes de la section 2 ci-dessus (spec « stitch »).');
  L.push(`- [ ] Crée ta **clé API Stitch** : ${STITCH.keyUrl} → ${STITCH.keySteps} → copie-la (garde-la **secrète**, ne la commite jamais).`);
  L.push(`- [ ] Connecte le **MCP Stitch au niveau utilisateur** (hors dépôt → la clé n'est jamais commitée) : ${STITCH.mcp[assistant]}`);
  L.push('');
  L.push('## 6. Scripts package.json (à ajouter si absents après le scaffold)');
  for (const [k, v] of Object.entries(manifest.scripts)) L.push(`- [ ] "${k}": "${v}"`);
  L.push('');
  return L.join('\n');
}
