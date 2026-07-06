---
name: stack-saas
description: Use when building a SaaS / web app with the vibecoding stack Convex + TanStack Start + Better Auth. Triggers on "build a SaaS", "créer un SaaS", "web app with Convex", "TanStack Start", "Better Auth", or any full-stack web app for beginners in this course. Loads the correct workflow, official rules, and known pitfalls.
---

# Stack SaaS — Convex + TanStack Start + Better Auth

Aide un·e débutant·e à construire un SaaS avec cette stack. Réponds en français, simplement, **une étape à la fois**, et fais valider chaque plan avant de coder.

## Ordre de construction
1. **Setup** — projet qui démarre (front + backend Convex connectés). Rien d'autre.
2. **Schéma** de données Convex (`convex/schema.ts`) → faire valider.
3. **Auth** (Better Auth via `@convex-dev/better-auth`).
4. **Première fonctionnalité** (query + mutation Convex).
5. **UI**, puis **déploiement**.

## Ressource de référence n°1
Le guide officiel qui monte les 3 ensemble :
**https://labs.convex.dev/better-auth/framework-guides/tanstack-start**

Setup recommandé :
```bash
npm create convex@latest -- -t tanstack-start
npm install @convex-dev/better-auth better-auth
npx convex dev      # terminal 1
npm run dev         # terminal 2
```

## Règles à respecter
- **Convex** : logique serveur = `query`/`mutation`/`action`. Jamais d'API REST maison. Front réactif via `useQuery`. Règles : https://convex.link/convex_rules.txt
- **TanStack Start** : routing fichiers type-safe (`src/routes`), server functions (`createServerFn`). Utilise son `llms.txt` : https://tanstack.com/start/latest/llms.txt
- **Better Auth** : ⚠️ installe la **version de `better-auth` imposée par la doc Convex** (ex. `~1.6.x`), **pas** `@latest`. Génère le schéma via `npx auth generate` (setup composant Convex).

## Pièges connus
- ❌ Ne copie pas le `AGENTS.md` du dépôt GitHub TanStack (il vise les contributeurs du framework, pas l'app).
- ❌ `docs.convex.dev/pricing` n'existe pas → c'est `www.convex.dev/pricing`.
- Utilise toujours la dernière version des APIs ; en cas de doute, réfère-toi aux fichiers de `ai-context/` ou au MCP Convex (`npx -y convex@latest mcp start`).

## Contexte IA disponible dans ce dépôt
- `ai-context/convex/`, `ai-context/tanstack-start/`, `ai-context/better-auth/` (lancer `scripts/download-ai-context.sh`).
- `stacks/saas/AGENTS.md` (règles à copier dans le projet), `stacks/saas/prompts-de-demarrage.md`.
