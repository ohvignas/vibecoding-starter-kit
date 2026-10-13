# vibecoding (plugin)

La méthode vibecoding packagée pour **Cursor**, **Claude Code** et **Codex** : les 10 commandes
(`/new-project`, `/build`, `/sos`, `/deploy`…), les 7 agents du crew, les skills de stack et les
règles de base.

> ⚠️ Le plugin fournit la **méthode**. Il **ne scaffolde pas** un projet (pas de git, CI, MCP,
> `maquette/`). Pour un projet complet : `npm create vibecoding-kit@latest`.

## Installer

**Claude Code** — depuis le dossier du dépôt :
```bash
claude plugin marketplace add ./            # ou : claude plugin marketplace add ohvignas/vibecoding-starter-kit
claude plugin install vibecoding@vibecoding
```

**Codex** — marketplace de dépôt (`.agents/plugins/marketplace.json`) :
```bash
codex plugin marketplace add ./            # ou : codex plugin marketplace add ohvignas/vibecoding-starter-kit
codex plugin marketplace list
# puis /plugins dans le CLI
```

**Cursor** — test local, ou dépôt importé en Team Marketplace :
```bash
cp -r plugin ~/.cursor/plugins/local/vibecoding   # recharge la fenêtre (Developer: Reload Window)
```

## Contenu

- `commands/` — les 10 runbooks et leurs étapes.
- `agents/` — `verificateur`, `code-reviewer`, `security-reviewer`, `test-runner`, `critique-produit`, `critique-donnees`, `critique-ux`.
- `skills/` — les règles de stack (saas, mobile, desktop, vitrine).
- `rules/` — les règles Cursor génériques.
