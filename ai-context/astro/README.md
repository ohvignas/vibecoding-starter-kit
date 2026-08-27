# Astro — contexte IA

Astro a **retiré** son `llms.txt` officiel (mai 2026). La source à jour est le **MCP Docs Astro** (déjà configuré dans le projet) :

`npx -y mcp-remote https://mcp.docs.astro.build/mcp`

L'IA doit interroger ce MCP pour toute API Astro incertaine — ne jamais deviner. Références fixes :
- shadcn × Astro : https://ui.shadcn.com/docs/installation/astro
- Déployer Astro en Docker : https://docs.astro.build/en/recipes/docker/

Le contenu du site ne vient plus d'un CMS git : il vit dans **Convex** et se lit **au build**, jamais depuis le navigateur (règle non négociable de la stack — les règles livrées la portent). Better Auth et TanStack Start, eux, n'existent que dans `dashboard/` — leur contexte est dans `ai-context/better-auth/` et `ai-context/tanstack-start/`.
