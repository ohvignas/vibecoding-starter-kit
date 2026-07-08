#!/usr/bin/env node
// Cursor beforeShellExecution : bloque les commandes destructrices / d'exfiltration.
// Fail-open : en cas d'erreur, on n'empêche rien (un bug du hook ne bloque pas ton terminal).
import fs from 'node:fs';

const DANGER = [
  /\brm\b[^\n]*\s(-[a-z]*f[a-z]*|--force)\b[^\n]*?\s["']?(\/|~|\$\{?HOME\}?|\*)/i, // rm -rf / --force (toute casse, guillemets, ${HOME}) sur / ~ $HOME *
  /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(\S*\/)?(ba|z)?sh\b/,  // curl … | sh (incl. /bin/sh)
  /\bgit\s+push\b[^\n]*(\s-f\b|--force(?!-with-lease))/,     // push --force / -f (autorise --force-with-lease)
  /\b(cat|less|more|head|tail|printenv|base64|xxd|grep|awk|sed)\b[^\n]*(^|\s|\/)\.env(?!\.example|\.sample|\.template)\b/, // lire/exfiltrer .env — y compris via grep/awk/sed (mais pas .env.example)
  /\bchmod\s+-?R?\s*0?777\b/,                                // chmod 777 / 0777
  /\b(mkfs|dd)\b[^\n]*\/dev\//,                              // formater / écraser un disque
];

export function isDangerous(cmd) {
  const s = String(cmd || '');
  return DANGER.some((re) => re.test(s));
}

if (process.argv[1] && process.argv[1].endsWith('guard-shell.mjs')) {
  let cmd = '';
  try { cmd = JSON.parse(fs.readFileSync(0, 'utf8')).command || ''; } catch {}
  if (isDangerous(cmd)) {
    process.stdout.write(JSON.stringify({
      permission: 'deny',
      user_message: `⛔ Commande bloquée par le kit (sécurité) : ${cmd}`,
      agent_message: 'This command is blocked by the project safety hook. Explain the risk to the user and propose a safer alternative.',
    }));
  } else {
    // Non dangereux → on laisse Cursor suivre son réglage normal. (Remplace 'allow' par 'ask' pour tout faire confirmer.)
    process.stdout.write(JSON.stringify({ permission: 'allow' }));
  }
}
