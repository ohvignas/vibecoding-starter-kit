// Bloc « managé » dans AGENTS.md/CLAUDE.md : régénéré par `update --refresh`.
// Tout ce qui est HORS des marqueurs appartient à l'utilisateur et n'est jamais touché.
export const MARK_START = '<!-- vibecoding:start — bloc généré, régénéré par `node <kit>/scripts/update.mjs --refresh` ; n\'édite pas ici -->';
export const MARK_END = '<!-- vibecoding:end -->';

export function wrapManaged(body) {
  return `${MARK_START}\n${body}\n${MARK_END}`;
}

// Extrait le bloc managé (marqueurs inclus). null si absent/malformé.
export function extractManaged(content) {
  const s = content.indexOf(MARK_START);
  const e = content.indexOf(MARK_END);
  if (s === -1 || e === -1 || e < s) return null;
  return content.slice(s, e + MARK_END.length);
}

// Fusionne : remplace le bloc managé de `existing` par celui de `fresh`.
// - marqueurs présents dans existing → remplacement EN PLACE (zone utilisateur préservée).
// - absents → migration douce : bloc frais en tête, ancien contenu conservé dessous.
export function mergeManagedSection(existing, fresh) {
  const freshBlock = extractManaged(fresh);
  if (!freshBlock) throw new Error('Contenu frais sans marqueurs vibecoding.');
  const s = existing.indexOf(MARK_START);
  const e = existing.indexOf(MARK_END);
  if (s !== -1 && e !== -1 && e > s) {
    return existing.slice(0, s) + freshBlock + existing.slice(e + MARK_END.length);
  }
  return `${freshBlock}\n\n${existing}`;
}
