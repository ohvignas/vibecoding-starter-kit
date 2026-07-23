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
