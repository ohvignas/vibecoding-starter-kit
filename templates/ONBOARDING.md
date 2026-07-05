# Onboarding — étapes manuelles (2 min)

L'installeur a tout posé. Reste quelques réglages **manuels** (pas automatisables) :

## Cursor
- **Docs** : dans Cursor, `@Docs → Add new doc` et ajoute les docs de ta stack (Convex, TanStack Start, Better Auth / Expo / Electron) pour que Cursor les indexe.
- **Bugbot** (relecteur IA de PR, optionnel) : active-le sur ton repo depuis le dashboard Cursor. Il complète l'étape sécu de `/new-feature`.
- **Mémoire native** : laisse « Generate Memories » **désactivé** — ce kit gère déjà la mémoire dans `docs/memory/` (portable, versionnée). Les hooks Cursor (`.cursor/hooks.json`) l'injectent automatiquement.
- **Background Agents** (payant, optionnel) : plus tard, tu pourras faire tourner `/new-feature` en agent cloud.

## GitHub
- Ajoute le secret **`ANTHROPIC_API_KEY`** (Settings → Secrets → Actions) pour le dream hook.
- La CI (`.github/workflows/ci.yml`) et le scan de secrets (`secrets.yml`) tournent à chaque push/PR.

## Git — activer le hook pre-commit
`git config core.hooksPath .githooks` (bloque les secrets évidents + linte avant chaque commit).

## Secrets
- Copie `.env.example` → `.env` et remplis-le. **Ne commit jamais `.env`.**

## Démarrer
- `/new-project "<ton idée>"` (fondation : PRD + tech spec + design), puis `/new-feature "<une feature>"`.
