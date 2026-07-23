## Règle de vérification (après CHAQUE implémentation)

Tu n'as **pas fini** tant que tu ne l'as pas **vu marcher** — le **design** ET le **fonctionnement**. Après **chaque** morceau implémenté (pas seulement à la fin) :

**1. Test auto** — lance les tests qui couvrent le changement, rouge → vert (`superpowers:test-driven-development` + `superpowers:verification-before-completion` : « fini » = prouvé par une commande).

**2. Teste le RENDU dans le navigateur** — lance l'app (`docs/RUN.md`), ouvre l'écran concerné (web · fenêtre desktop · simulateur mobile). **Chaque assistant a un navigateur intégré** (Cursor, Claude Code, Codex) — utilise-le, ne devine pas. **Screenshot desktop ET mobile** (redimensionne) : ta preuve, ça attrape ce que les tests ratent (style, layout, texte coupé). Compare à l'écran de `maquette/`.

**3. Teste le FONCTIONNEMENT de la feature (end-to-end)** — ne te contente pas de regarder : **fais le parcours en vrai**. Clique les boutons, remplis les formulaires, soumets, et **vérifie le résultat** (l'état a changé, la donnée est sauvée, la redirection a lieu, le bon message s'affiche). Couvre le **flux essentiel** — le `UJ-*` du PRD / chaque `AC` de `/new-feature` : auth (login/logout/reset), le CRUD principal, le paiement…
   - **Outil** : le navigateur intégré, ou le **Playwright MCP** (`npx @playwright/mcp@latest`, stacks web) pour piloter le navigateur et écrire des **tests E2E rejouables en CI**.
   - **Trous que l'IA rate souvent** (vérifie-les explicitement) : états **vide / chargement / erreur** · **erreurs API** (4xx/5xx) · bouton **désactivé** pendant l'envoi · **message d'erreur réel** affiché · valeurs **limites** (champ vide, texte très long, caractères spéciaux, espaces).

**4. Cassé ?** → `superpowers:systematic-debugging`. On **ne passe pas** à la suite sur un écran cassé **ou** une feature qui ne marche pas.

Ne dis **jamais** « c'est fait » sans **test vert + screenshot + le parcours de la feature refait en vrai**.
