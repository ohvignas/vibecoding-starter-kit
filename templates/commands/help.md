# /help — Les commandes dispo, expliquées simplement (runbook IA)

L'utilisateur veut savoir **quelles commandes existent et à quoi elles servent**. Ne modifie RIEN. Affiche la liste ci-dessous en français simple, groupée. **Adapte à sa situation** : regarde si `docs/ROADMAP.md` existe — s'il n'existe pas, pousse `/new-project` ; s'il existe, pousse `/build`.

## Pour démarrer / avancer
- **/init-vibecoding** — **Le tout-en-un pour démarrer** : l'IA installe l'environnement pour toi (ou met à jour ton projet) et te guide pas à pas. C'est la 1re commande à taper.
- **/new-project** — Lance un **nouveau produit de zéro** : l'IA t'aide à cadrer l'idée (PRD), l'architecture, la maquette, puis la feuille de route. C'est ton point de départ.
- **/build** — Construit ton app **jalon par jalon** en suivant la roadmap, avec un résultat **visible à chaque étape**.
- **/new-feature** — Ajoute **une** fonctionnalité à un projet qui existe déjà, proprement (plan → tests → review → PR).
- **/next** — « Je suis perdu, je fais quoi ? » → l'IA te dit **où tu en es** et **la prochaine action**.

## Le design
- **/edit-design** — Change le look (couleurs, typo, style) ou crée le **design system** si tu n'en as pas encore.

## Quand ça coince
- **/sos** — Quelque chose est cassé et tu paniques → l'IA **revient au dernier état qui marchait**.
- **/debug** — Un bug précis à traquer **méthodiquement**, sans tout casser.
- **/doctor** — Vérifie que ton environnement est bien branché (plugins, MCP, skills) et te dit **ce qui manque**.

## Mettre en ligne
- **/deploy** — Met ton app **en ligne** (checklist + étapes selon ta stack).

## Aide-mémoire (dis-le à l'utilisateur)
- Tu démarres → **/new-project**
- Tu as déjà une roadmap → **/build**
- Tu es perdu → **/next**
- Ça casse → **/sos**
- Tu veux vérifier ton install → **/doctor**
