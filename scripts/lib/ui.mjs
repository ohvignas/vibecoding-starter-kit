// Style terminal zéro-dépendance. Couleurs ANSI, désactivées hors TTY ou si NO_COLOR.
const CODES = { cyan: 36, green: 32, red: 31, yellow: 33, dim: 2, bold: 1 };

export function supportsColor(stream, env) {
  return Boolean(stream && stream.isTTY) && !(env && env.NO_COLOR);
}

export function paint(on) {
  const wrap = (code) => (s) => (on ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  const out = {};
  for (const [name, code] of Object.entries(CODES)) out[name] = wrap(code);
  return out;
}

export function heading(title, on) {
  return paint(on).cyan(`┌─ ${title} ─┐`);
}

export function menu(question, options, on) {
  const c = paint(on);
  const lines = [c.bold(question)];
  options.forEach((o, i) => {
    const num = c.cyan(`${i + 1})`);
    lines.push(`  ${num} ${o.label}${o.hint ? '  ' + c.dim(o.hint) : ''}`);
  });
  return lines.join('\n');
}

export function ok(text, on) { return `${paint(on).green('✓')} ${text}`; }
export function hint(text, on) { return paint(on).dim(text); }
