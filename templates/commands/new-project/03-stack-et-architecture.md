# 03 — Stack et architecture

> Étape 03/08 de `/new-project` — les décisions techniques durables. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Stack (déjà fixée)
La stack a été **choisie par le wizard** : lis-la dans `AGENTS.md` (et les règles de `.cursor/rules/` ou `.claude/skills/`) — **ne redemande pas**. Le contexte officiel de la stack est dans `ai-context/`. Confirme-la à l'utilisateur en une phrase, puis continue.

---

## Tech spec / architecture → `docs/ARCHITECTURE.md` (gate)

**Ouvre `docs/templates/architecture.md`** et suis-le : on ne fixe QUE les décisions durables qu'un futur builder ne peut **pas** déduire du code (paradigme, `AD-*` + diagramme de dépendances, conventions de cohérence, stack, graine structurelle, map capacité → architecture, différé). Le template porte aussi sa checklist.

Écris le résultat dans `docs/ARCHITECTURE.md`. → **validation utilisateur**.
