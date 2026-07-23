## Règle de vérification (après CHAQUE implémentation)

Tu n'as **pas fini** tant que tu ne l'as pas **vu marcher** — le **design** ET le **fonctionnement**. Après **chaque** morceau implémenté (pas seulement à la fin) :

**1. Test auto** — lance les tests qui couvrent le changement, rouge → vert (`superpowers:test-driven-development` + `superpowers:verification-before-completion` : « fini » = prouvé par une commande).

**2. Teste le RENDU dans le navigateur** — lance l'app (`docs/RUN.md`), ouvre l'écran concerné (web · fenêtre desktop · simulateur mobile). **Cursor et Claude Code ont un navigateur intégré** ; sinon, pilote-en un via le **Playwright MCP** — un vrai navigateur, jamais deviner le rendu. **Screenshot desktop ET mobile** (redimensionne) : ta preuve, ça attrape ce que les tests ratent (style, layout, texte coupé). Compare à l'écran de `maquette/`.

**3. Teste le FONCTIONNEMENT de la feature (end-to-end)** — pas juste regarder : **le parcours doit être refait en vrai**. **Délègue-le à un sous-agent `test-runner` en contexte frais** — le pilotage pas-à-pas du navigateur/simulateur est **token-lourd**, l'isoler hors du contexte principal coûte **beaucoup moins cher**. Donne-lui : la feature, le **flux**, les **critères** (`UJ-*` du PRD / chaque `AC` de `/new-feature` : auth, CRUD, paiement…), l'écran de départ, et l'outil :
   - **Web** : **Playwright MCP** (`@playwright/mcp`) — pilote le navigateur + tests E2E rejouables en CI.
   - **Mobile** : **Maestro MCP** (`maestro mcp`) — pilote le simulateur iOS / émulateur Android + flows Maestro.
   Il rend un **rapport court** (chaque AC ✅/❌ + capture + 1er point cassé), pas 10k tokens de contexte.
   - **Trous que le `test-runner` vérifie** : états **vide / chargement / erreur** · **erreurs API** (4xx/5xx) · bouton **désactivé** pendant l'envoi · **message d'erreur réel** affiché · valeurs **limites** (champ vide, texte très long, caractères spéciaux, espaces).

**4. Cassé ?** → `superpowers:systematic-debugging`. On **ne passe pas** à la suite sur un écran cassé **ou** une feature qui ne marche pas.

Ne dis **jamais** « c'est fait » sans **test vert + screenshot + le parcours de la feature refait en vrai**.
