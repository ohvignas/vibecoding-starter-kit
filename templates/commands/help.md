# /help — Les commandes dispo, expliquées simplement (runbook IA)

L'utilisateur veut savoir **quelles commandes existent et à quoi elles servent**. Ne modifie RIEN. Affiche la liste ci-dessous en français simple, groupée.

**Une seule réponse à « je commence par quoi ? » : `/help`** — il y est déjà, et cette page le mène partout ailleurs. Ensuite, **adapte à ce que tu vois**, et **regarde le disque avant de répondre** — dans CET ordre :
1. pas de `.vibecoding.json` → `/init-vibecoding` ;
2. **`docs/ETAT-DES-LIEUX.md` présent → projet EXISTANT adopté par le kit (`--adopt`)** : il a déjà son code. Ne propose **jamais** `/new-project` (il fonderait un projet par-dessus le sien) et ne scaffolde rien. Renvoie à **`docs/ETAT-DES-LIEUX.md`** — c'est lui qui apprend le projet à l'IA — puis à **`/next`** pour la prochaine action. Ce projet n'aura **jamais** de `docs/ROADMAP.md` : son absence ne veut donc rien dire ici, d'où cette règle **avant** la suivante ;
3. pas de `docs/ROADMAP.md` → `/new-project` ;
4. roadmap présente → `/build`.

## Pour démarrer / avancer
- **/help** — cette page : les 10 commandes et par où continuer. C'est **la seule à retenir**.
- **/init-vibecoding** — **Le tout-en-un pour démarrer** : l'IA installe l'environnement pour toi (ou met à jour ton projet) et te guide pas à pas. Rien n'est encore installé → c'est par là.
- **/new-project** — Lance un **nouveau produit de zéro** : l'IA t'aide à cadrer l'idée (PRD), l'architecture, la maquette, puis la feuille de route. C'est ton point de départ.
- **/build** — Construit ton app **jalon par jalon** en suivant la roadmap, avec un résultat **visible à chaque étape**.
- **/new-feature** — Ajoute **une** fonctionnalité à un projet qui existe déjà, proprement (plan → tests → review → PR).
- **/next** — « Je suis perdu, je fais quoi ? » → l'IA te dit **où tu en es** et **la prochaine action**.

## Le design
- **/edit-design** — Change le look (couleurs, typo, style) ou crée le **design system** si tu n'en as pas encore.

## Quand ça coince
- **/sos** — Quelque chose est cassé et tu paniques → l'IA **revient au dernier état qui marchait**.
- **/doctor** — Vérifie que ton environnement est bien branché (plugins, MCP, skills) et te dit **ce qui manque**.

> Un bug précis à traquer ? Pas besoin de commande : dis-le simplement à l'IA. La boucle du projet lui impose déjà `superpowers:systematic-debugging` **avant tout correctif** — c'est ce skill qui porte la méthode — et la **Règle Preuve** limite à **3 tentatives** avant de dire `BLOQUÉ`.

## Mettre en ligne
- **/deploy** — Met ton app **en ligne** (checklist + étapes selon ta stack).

> Un mot qui bloque (MCP, jalon, maquette, `PROUVÉ`…) ? **`docs/glossaire.md`** explique tout le vocabulaire en français simple — le wizard le pose dans chaque projet qu'il génère. Ouvre-le et lis-lui l'entrée. Fichier absent (projet non scaffoldé par le kit) ? Explique le terme toi-même, simplement, sans jargon — et ne renvoie pas vers un fichier qui n'existe pas.

## L'équipe d'agents (appelable quand tu veux)
Des assistants spécialisés, dans le dossier d'agents de ton assistant : `.cursor/agents/ (Cursor) · .claude/agents/ (Claude Code) · docs/agents/crew/ (Codex)`. Dis simplement « lance **<nom>** sur … » :
- **critique-produit** (Vera) — « qu'est-ce qu'on a oublié ? » features, écrans, parcours.
- **critique-donnees** (Marc) — « d'où vient cette donnée ? » modèle, câblage réel, zéro mock.
- **critique-ux** (Lina) — « et quand ça se passe mal ? » états vide/erreur, responsive, accessibilité.
- **verificateur** — le juge : il ne voit que le diff et les critères, et tranche **PROUVÉ / NON PROUVÉ / BLOQUÉ**. À lancer avant de dire qu'une étape est finie.
- **test-runner** — teste une feature en vrai dans le navigateur/simulateur et rend un verdict.
- **code-reviewer** · **security-reviewer** — relisent le code et la sécurité d'un changement.

## Aide-mémoire (dis-le à l'utilisateur — les 10, dans l'ordre où on s'en sert)
- Tu ne sais plus quoi taper → **/help** (tu y es)
- Rien n'est encore installé → **/init-vibecoding**
- Tu démarres un produit → **/new-project**
- Tu as déjà une roadmap → **/build**
- Une fonctionnalité à ajouter → **/new-feature**
- Changer le look → **/edit-design**
- Tu es perdu → **/next**
- Ça casse → **/sos**
- Vérifier ton install → **/doctor**
- Mettre en ligne → **/deploy**
