# 03 — Stack et architecture

> Étape 03/08 de `/new-project` — les décisions techniques durables. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Stack (déjà fixée)
La stack a été **choisie par le wizard** : lis-la dans `AGENTS.md` (et les règles de `.cursor/rules/` ou `.claude/skills/`) — **ne redemande pas**. Le contexte officiel de la stack est dans `ai-context/`. Confirme-la à l'utilisateur en une phrase, puis continue.

---

## ⚡ Best practices officielles — À JOUER AVANT d'écrire un seul `AD-*`

La tech spec ne s'invente pas : elle **reprend les règles officielles de la stack**. Avant d'ouvrir `docs/templates/architecture.md`, charge les **skills de best practices** que le wizard a installés (leur liste exacte est dans la section « Skills portables (stack) » de `docs/A-FAIRE.md`) et croise-les avec le contexte officiel de `ai-context/` :

- **Convex** (saas · mobile · vitrine) : `convex-design` (schéma, index, patterns) · `convex-auth` puis `convex-authz` (auth et autorisations / propriété des données) · `convex-crons` (tâches planifiées) · `convex-test` · `convex-optimize` et `convex-insights` (performance) · `convex-expert` (règles de fond).
- **Better Auth** (saas · vitrine) : `better-auth-best-practices` · `better-auth-security-best-practices` · `create-auth` · `email-and-password-best-practices` · `organization-best-practices` · `two-factor-authentication-best-practices`.

**Chaque règle retenue devient un `AD-n`** (ou une « convention de cohérence ») **avec sa source** — et dis à l'utilisateur, en une phrase, ce que ces skills t'ont imposé. **Rien de deviné** : une décision que ni les skills ni `ai-context/` ne couvrent va dans **« Différé »**, jamais présentée comme un fait. Ces exigences nourrissent ensuite les jalons de la roadmap (étape `06-roadmap.md`) : c'est là qu'elles deviennent du code.

---

## Tech spec / architecture → `docs/ARCHITECTURE.md` (gate)

**Ouvre `docs/templates/architecture.md`** et suis-le : on ne fixe QUE les décisions durables qu'un futur builder ne peut **pas** déduire du code (paradigme, `AD-*` + diagramme de dépendances, conventions de cohérence, stack, graine structurelle, map capacité → architecture, différé). Le template porte aussi sa checklist.

Écris le résultat dans `docs/ARCHITECTURE.md`. → **validation utilisateur**.
