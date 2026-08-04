# 06 — Roadmap

> Étape 06/08 de `/new-project` — de la maquette à la feuille de route. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Analyse de la maquette + domaines → Roadmap `docs/ROADMAP.md`

1. **Sélection des domaines + doc d'install SUR MESURE** : ouvre `docs/DOMAINS.md` (le catalogue de la stack). Chaque capacité y liste ses **`_Déclencheurs :_`** — les mots qui, présents dans le PRD, l'allument. **Applique-les au texte de `docs/PRD.md`, un par un**, et note les capacités allumées : c'est ta sélection de départ, elle ne se devine pas. (Si `docs/DOMAINS.md` porte déjà des 🎯, c'est le kit qui les a appliqués — vérifie-les, ne les recopie pas les yeux fermés.) Ajoute ensuite ce que les mots ne peuvent pas voir, retire ce que le PRD ne demande pas, et **dis à l'utilisateur ce que tu as ajouté ou retiré, et pourquoi**. Règle : préfère le **built-in / officiel** ; n'ajoute un externe que si le PRD le justifie.

   **Stack vitrine** : les domaines `seo`, `geo` et `images` sont **toujours sélectionnés** (raison d'être de la stack), quel que soit le PRD — les déclencheurs ne servent que pour `forms`, `analytics`, `i18n`…

   Puis **complète le fichier unique `docs/A-FAIRE.md`** (déjà créé par le wizard avec les gestes de base) en y ajoutant, à la fin, une section **`## Pour ton projet`** : **une entrée par domaine détecté**, en français simple, pour que l'utilisateur n'ait **rien à deviner**. Pour chacune : une ligne « à quoi ça sert », le **paquet** à installer (option officielle par défaut, tirée de `DOMAINS.md`), la **commande MCP** s'il y en a une (ex. paiement → `claude mcp add --transport http stripe https://mcp.stripe.com`), et le **secret** à mettre dans `.env.example` (ou l'env Convex). Chaque item en case `- [ ]`, commande copiable, **rien d'inventé** (tout vient de `DOMAINS.md`). Les secrets des capacités sont déjà proposés (commentés) dans `.env.example` sous « Secrets des capacités métier » : **décommente ceux des domaines retenus**, n'en invente aucun autre.

   **Un seul fichier d'install** : `docs/A-FAIRE.md` = gestes de base (posés par le wizard) **+** la section « Pour ton projet » que tu viens d'ajouter. Ne crée **aucun** autre doc d'install.
2. **Audit complet de complétude — AVANT d'écrire la roadmap.** But : ne **rien** oublier, pour que la roadmap couvre **tout** le produit designé (**toutes les features**, pas un sous-ensemble — on ne coupe pas).
   - **Analyse EXHAUSTIVE de la maquette** (`maquette/`) : **lis** chaque fichier ET **regarde** chaque écran (screenshot ; **PixelRAG** rend le coup d'œil plus fiable s'il est installé, il ne remplace pas la lecture). Liste **chaque écran** ET **chaque élément** (bouton, champ, liste, filtre, onglet, modale, menu) et les **états** (vide/chargement/erreur/succès) — l'IA rate ce qu'elle ne regarde pas.
   - **Pour chaque page**, détermine **tout ce dont elle a besoin pour FONCTIONNER** : vraies **données** (quel modèle, d'où), **features** déclenchées, **connexions backend** (auth, API, domaines), **permissions**, **états**.
   - **Croise** avec le PRD (chaque feature, chaque `UJ-*`) et les domaines. Appuie-toi sur les **docs/skills** de la stack — **rien d'inventé**.
   - Remplis l'**inventaire de complétude** dans **`docs/agents/inventaire.md`** (le tableau y est déjà : une ligne par élément — écran × élément × donnée réelle × feature du PRD × états × jalon). C'est la **base** de la roadmap, et le contrat de couverture que les critiques reliront.
3. **Roadmap exhaustive** : remplis `docs/ROADMAP.md` (squelette déjà présent) en **pensant à tout** — **Fondations d'abord**, puis balaie les dimensions : Modèle de données, Auth, **réaliser chaque écran/flux de la maquette**, **chaque feature du PRD**, **domaines sélectionnés**, États (chargement/vide/erreur), Tests, passe sécu, Déploiement, Docs.

   Chaque jalon précise **les données** : quelles **vraies** données l'écran montre/écrit, d'où elles viennent (modèle de données, API, auth), et leur **câblage réel** — **zéro mock, zéro fausse donnée**. Si le modèle de données manque, il passe **avant** l'écran qui l'utilise.
4. Chaque jalon = une **tranche verticale** avec **`✅ Ce que tu vois :`** = **un bouton/une action qui MARCHE avec de la vraie donnée** (l'écran de la maquette devenu réel, pas une coquille) — + un chemin de plan `docs/superpowers/plans/NN-<slug>.md`.
5. **Panel critique — avant de figer la roadmap.** Dispatche les **3 agents critiques du kit en parallèle** (contexte frais, `claude-sonnet-5`) — chacun a **sa lentille**, donc ils trouvent des trous **différents** :
   - **`critique-produit`** (Vera) — features/écrans/parcours oubliés ;
   - **`critique-donnees`** (Marc) — données réelles, modèle, câblage, zéro mock, permissions ;
   - **`critique-ux`** (Lina) — états vide/chargement/erreur, impasses, responsive, accessibilité.
   Donne à chacun les quatre mêmes chemins : `maquette/`, `docs/PRD.md`, l'inventaire `docs/agents/inventaire.md` et `docs/ROADMAP.md`. Chaque `MANQUE` doit citer sa **preuve** (l'écran/élément de la maquette ou la ligne du PRD) — **sans preuve, jette-le**. Puis **dédoublonne** les rapports (les lentilles se recoupent) et intègre dans la roadmap.

   **Deux passes MAXIMUM** (la 2ᵉ ne relit que ce qui vient d'être ajouté). Ne boucle pas au-delà : au-delà de 2 tours, une revue multi-agents produit surtout des **faux positifs** et des sur-corrections — on gagne du bruit, pas de la qualité. S'il reste un doute après la 2ᵉ passe, **tranche avec l'utilisateur**, pas avec un 3ᵉ tour.

   > Ces agents vivent dans le dossier d'agents de ton assistant : `.cursor/agents/ (Cursor) · .claude/agents/ (Claude Code) · docs/agents/crew/ (Codex)` — tu peux les **appeler n'importe quand** (« lance `critique-ux` sur cet écran »), pas seulement ici.
6. Propose ensuite de **générer tous les plans** (un par jalon, `superpowers:writing-plans`) pour que toute la roadmap soit posée, puis d'enchaîner sur **`/build`**.
