# /init-vibecoding — Tout installer (ou mettre à jour) pour toi (runbook IA)

Tu installes l'environnement vibecoding **à la place de l'utilisateur** : tu exécutes les commandes du terminal, tu poses les questions en **langage simple**, tu expliques. L'utilisateur répond juste dans le chat. En français, chaleureux, zéro jargon non expliqué.

## Les 5 étapes — ouvre-les UNE PAR UNE, dans cet ordre
> Elles vivent dans le dossier `init-vibecoding/` posé **à côté de ce fichier** : `.cursor/commands/init-vibecoding/` (Cursor) · `.claude/commands/init-vibecoding/` (Claude Code) · `docs/commands/init-vibecoding/` (Codex). Pour chacune : **ouvre le fichier, fais ce qu'il dit, passe à la suivante**. N'en saute aucune et ne la résume pas de mémoire.
> *(Chez Codex, ce fichier-ci contient déjà les 5 étapes à la suite : tu peux simplement continuer à lire, dans le même ordre.)*

- [ ] **00** `init-vibecoding/00-detecter-l-etat.md` → **le point d'étape** (inventaire « déjà là / à construire » montré, feu vert demandé), puis tu sais si le projet est neuf, **existant** ou **déjà initialisé**
- [ ] **01** `init-vibecoding/01-les-2-questions.md` → le **type d'app** et le **nom du projet**, en deux questions simples
- [ ] **02** `init-vibecoding/02-scaffold.md` → le projet **créé** par le CLI, résultat montré (AGENTS.md, docs/, .mcp.json…)
- [ ] **03** `init-vibecoding/03-onboarding.md` → `docs/A-FAIRE.md` déroulé **avec lui**, case par case, une action à la fois
- [ ] **04** `init-vibecoding/04-verifier-et-lancer.md` → l'environnement vérifié, et la **prochaine commande** donnée à l'utilisateur

## Règles
- **Le point d'étape d'abord** : avant la moindre commande, tu montres l'inventaire (« déjà là » / « à construire ») et tu **attends le feu vert**. Jamais de passage en force.
- Ne submerge pas : **une question / une action à la fois**, attends la réponse.
- **Ne saute aucune étape** — si quelque chose manque, tu le dis et tu le construis (projet neuf comme projet existant).
- Chaque commande terminal : dis **ce que tu vas faire** avant, montre le résultat après.
- Jamais de secret en clair ; ne commit rien sans le dire.
