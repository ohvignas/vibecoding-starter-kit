# Electron — pas de llms.txt

Electron ne publie **pas** de fichier `llms.txt` ni de serveur MCP officiel (les URLs renvoient une erreur 404 — ne les cherche pas).

**À la place**, pour « parler à Claude » d'Electron, utilise les **skills locaux** de Claude Code :
`electron:create-app`, `electron:add-ipc`, `electron:add-feature`, `electron:security`,
`electron:distribution`, `electron:doctor`, etc.

La liste complète et l'ordre dans lequel les déclencher sont dans les **règles de ta stack**, livrées
avec le projet : `.claude/skills/stack-desktop/` (Claude Code), `.cursor/rules/` (Cursor), ou
`AGENTS-stack.md` à la racine (Codex).

Doc officielle à donner à l'IA au besoin : https://www.electronjs.org/docs/latest

Checklist sécurité officielle (à donner à l'IA pour toute app Electron) :
https://www.electronjs.org/docs/latest/tutorial/security
