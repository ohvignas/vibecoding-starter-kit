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

## Git — hook pre-commit
Déjà actif : l'installeur a fait `git init` et `git config core.hooksPath .githooks` pour toi. À chaque commit, il bloque les secrets évidents et lance le linter.

## Secrets
- Copie `.env.example` → `.env` et remplis-le. **Ne commit jamais `.env`.**

## Coûts IA
- Surveille ta consommation : `npx ccusage`. Réflexes pour payer moins : `/build` jalon par jalon (pas `--all`), conversations courtes, `/next` quand tu es perdu.

## Maquette IA (Stitch) — si tu n'as pas de design à fournir
- Les **skills Stitch sont déjà installés** ; `/new-project` s'en sert pour créer/itérer ta maquette.
- Crée ta **clé API** : stitch.withgoogle.com → Settings → Create API Key (garde-la **secrète**).
- Connecte le **MCP Stitch au niveau utilisateur** (hors dépôt → clé jamais commitée) — commande exacte dans `docs/SETUP-AI.md`.

## Démarrer
- `/new-project "<ton idée>"` : PRD + tech spec + **maquette** (Stitch, ou la tienne) + design + **roadmap dérivée de la maquette**.
- Puis `/build` (construit la roadmap jalon par jalon, comparé à la maquette) — ou `/new-feature "<une feature>"` pour une feature isolée.
