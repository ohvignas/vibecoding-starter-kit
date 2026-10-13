# Publier `create-vibecoding-kit` sur npm

Une seule fois : `npm login` (compte npm).

À chaque version :
1. Bumpe la version : `npm version patch` (ou `minor`).
2. Vérifie le contenu du paquet : `npm pack --dry-run` (doit lister `scripts/`, `templates/`, `stacks/`, `ai-context/`, `guides/` — PAS `docs/` ni `formateur/`).
3. Publie : `npm publish` (le paquet est public ; nom `create-vibecoding-kit`).
4. Teste : dans un dossier vide, `npm create vibecoding-kit@latest`.

Le nom `create-vibecoding-kit` fait fonctionner `npm create vibecoding-kit@latest` (npm mappe `create X` → `create-X`).

---

# Publier le plugin Cursor `vibecoding`

Le dossier `cursor-plugin/` est **généré** depuis les templates : `node scripts/build-cursor-plugin.mjs` (relance-le après toute modif des commandes/règles pour le garder à jour).

Deux voies de distribution :
1. **Team Marketplace** (le plus simple, pour une cohorte) : Cursor → Dashboard → Plugins → **Add Marketplace** → importe le dépôt GitHub. Les élèves font ensuite `/add-plugin vibecoding`.
2. **Marketplace officielle** : soumets `cursor-plugin/` sur `cursor.com/marketplace/publish`.
3. **Test local** : copie `cursor-plugin/` dans `~/.cursor/plugins/local/vibecoding`.

Le plugin donne les commandes vibecoding (dont **/init-vibecoding** pour tout installer) + la règle de base. Il **ne scaffolde pas** (pas de git/CI/MCP) — pour un nouveau projet complet, `npm create vibecoding-kit`.

---

# Publier le plugin `vibecoding` (3 formats, 3 marketplaces)

Le dossier **`plugin/`** est le **bundle unique** : il porte les **trois manifestes** (Claude, Cursor, Codex) et le même contenu (10 commandes + étapes, 7 agents, skills de stack, règles). Il est **généré** :

```bash
node scripts/build-plugin.mjs
```

Ce script écrit aussi les **trois marketplaces** (à la racine, là où chaque hôte les cherche) :

| Fichier | Hôte |
|---|---|
| `.claude-plugin/marketplace.json` | Claude Code (et lu par Codex, en compatibilité) |
| `.agents/plugins/marketplace.json` | Codex (marketplace de dépôt) |
| `.cursor-plugin/marketplace.json` | Cursor (dépôt multi-plugins) |

**Relance le builder après toute modif** des commandes/agents/skills/règles, sinon le plugin publié reste celui d'avant. Le test `scripts/lib/plugin.test.mjs` vérifie que le contenu du dossier **est** celui des templates (aucune dérive possible en silence).

Installation depuis le dépôt, par hôte :

```bash
# Claude Code
claude plugin marketplace add ohvignas/vibecoding-starter-kit
claude plugin install vibecoding@vibecoding

# Codex
codex plugin marketplace add ohvignas/vibecoding-starter-kit

# Cursor (test local)
cp -r plugin ~/.cursor/plugins/local/vibecoding
```

Pour la marketplace Cursor officielle : soumets le dépôt sur `cursor.com/marketplace/publish` (le `.cursor-plugin/marketplace.json` à la racine fait de ce dépôt un dépôt multi-plugins valide).
