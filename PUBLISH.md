# Publier `create-vibecoding` sur npm

Une seule fois : `npm login` (compte npm).

À chaque version :
1. Bumpe la version : `npm version patch` (ou `minor`).
2. Vérifie le contenu du paquet : `npm pack --dry-run` (doit lister `scripts/`, `templates/`, `stacks/`, `ai-context/`, `guides/` — PAS `docs/` ni `formateur/`).
3. Publie : `npm publish` (le paquet est public ; nom `create-vibecoding`).
4. Teste : dans un dossier vide, `npm create vibecoding@latest`.

Le nom `create-vibecoding` fait fonctionner `npm create vibecoding@latest` (npm mappe `create X` → `create-X`).
