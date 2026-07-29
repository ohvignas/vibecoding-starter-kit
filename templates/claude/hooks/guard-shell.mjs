#!/usr/bin/env node
// Claude Code PreToolUse (matcher Bash) : bloque les commandes destructrices / d'exfiltration.
// PROTOCOLE CLAUDE CODE (≠ Cursor) : la commande arrive dans `tool_input.command` sur stdin,
// et on BLOQUE par un code de sortie 2 + le message sur stderr (Cursor, lui, attend un JSON
// `{"permission":"deny"}` sur stdout). Les deux hooks restent donc deux fichiers indépendants.
// Fail-open : en cas d'erreur de lecture, on n'empêche rien (un bug du hook ne bloque pas ton terminal).
//
// ⚠️ La liste `DANGER` et `isDangerous` ci-dessous sont IDENTIQUES, à l'octet près, à celles de
// `templates/cursor/hooks/guard-shell.mjs` — seul l'enrobage d'entrée/sortie diffère, et chaque
// assistant ne reçoit que son propre dossier (aucun module partagé n'est copiable). Un test
// (`scripts/lib/duplications.test.mjs`) compare les deux blocs et échoue s'ils divergent :
// modifie les deux, ou ne modifie ni l'un ni l'autre.
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
  try { cmd = JSON.parse(fs.readFileSync(0, 'utf8'))?.tool_input?.command || ''; } catch { /* stdin vide/illisible → fail-open */ }
  if (isDangerous(cmd)) {
    process.stderr.write(`⛔ Commande bloquée par le kit (sécurité) : ${cmd}\nExplique le risque à l'utilisateur et propose une alternative plus sûre.\n`);
    process.exit(2); // 2 = bloquer l'appel d'outil et renvoyer stderr à l'agent
  }
  process.exit(0);
}
