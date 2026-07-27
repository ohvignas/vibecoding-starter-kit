// Cursor (2.4+) lit .cursor/agents/ mais ne connaît que name/description/model/readonly/is_background.
// On transforme le frontmatter Claude Code → Cursor SANS rien perdre : outils, skills et serveurs MCP
// sont réinjectés en tête de corps. CRLF normalisé (checkout Windows), description quotée (« : » sûr).
const FM = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const WRITERS = /^(Write|Edit|NotebookEdit)$/;

function parseFrontmatter(src) {
  const m = src.match(FM);
  if (!m) return { fields: {}, body: src };
  const fields = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fields[key] = kv[2].trim(); continue; }
    const item = line.match(/^\s*-\s*(.+)$/);
    if (item && key) fields[key] = [...(Array.isArray(fields[key]) ? fields[key] : []), item[1].trim()];
  }
  return { fields, body: m[2] };
}

const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean));

export function toCursorAgent(src) {
  const { fields, body } = parseFrontmatter(String(src).replace(/\r\n/g, '\n'));
  const tools = asList(fields.tools);
  const denied = asList(fields.disallowedTools);
  const skills = asList(fields.skills);
  const mcp = asList(fields.mcpServers);
  // Lecture seule si l'agent n'a pas d'outil d'écriture, OU si l'écriture lui est explicitement refusée.
  const readonly = (tools.length > 0 && !tools.some((t) => WRITERS.test(t))) || denied.some((t) => WRITERS.test(t));

  const head = ['---', `name: ${fields.name}`, `description: ${JSON.stringify(String(fields.description || ''))}`, 'model: inherit'];
  if (readonly) head.push('readonly: true');
  head.push('---', '');

  const notes = [];
  if (skills.length) notes.push(`- **Skills à charger** : ${skills.join(', ')}.`);
  if (mcp.length) notes.push(`- **Outils (MCP)** : ${mcp.join(', ')} — si le serveur n'est pas branché sur cette stack, dis-le au lieu de deviner.`);
  if (tools.length) notes.push(`- **Périmètre** : ${tools.join(', ')}.`);
  if (denied.length) notes.push(`- **Interdit** : ${denied.join(', ')} — tu rapportes, tu ne modifies aucun fichier.`);
  const block = notes.length ? `## Outils et périmètre\n${notes.join('\n')}\n\n` : '';

  return `${head.join('\n')}${block}${body}`;
}
