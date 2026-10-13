# 04 — Arborescence

> Étape 04/08 de `/new-project` — la liste des écrans. **Mode de travail et tags** : `00-mode-et-cadre.md`. Sommaire : `../new-project.md`.

## Arborescence — la carte des écrans (gate)

Sortie : la section **« Arborescence »** de `docs/PRD.md` (la 7 du template). **Pas** un fichier à part, **pas** `docs/ARCHITECTURE.md` : elle se dérive des parcours `UJ-*` et des `FR-*`, qui sont dans le PRD, et c'est le PRD que reçoivent l'étape design, l'étape roadmap et les trois agents critiques. Un écran rangé ailleurs ne serait relu par personne. `docs/ARCHITECTURE.md`, lui, ne porte que ce qu'un futur builder ne peut **pas** déduire du code — une liste d'écrans, si.

Écris-la en quatre passes, dans cet ordre :

1. **Les pages** — reprends chaque parcours `UJ-*` et pose **un écran par étape du récit**. Ajoute ensuite les écrans de service que les parcours ne racontent jamais mais que tout produit a : accueil/entrée, connexion & inscription, réglages/compte, recherche, page vide de premier lancement, erreur 404, page légale. Nomme-les **comme l'utilisateur les nommerait**, pas comme un développeur (« Mes commandes », pas `OrderListView`).
2. **La hiérarchie** — imbrique-les en arbre : ce qui est une page à part entière, ce qui n'est qu'un onglet, une modale ou un panneau d'une autre. Deux niveaux suffisent presque toujours ; à trois, demande-toi si tu n'as pas inventé une page.
3. **La navigation** — dis **comment on entre** dans chaque écran et **comment on en sort** : depuis quel écran, par quel élément (menu, bouton, lien, retour), et où l'on retombe après l'action. Un écran dans lequel aucun autre n'entre est soit inatteignable, soit inutile : tranche. Marque aussi ce qui exige d'être connecté.
4. **Les URL** — une adresse par page, en minuscules, paramètres nommés (`/projets`, `/projets/:id`, `/reglages/facturation`). Pour une app **mobile**, ce sont les routes de navigation plutôt que des URL, mais l'exigence est la même : un identifiant stable par écran. Ce sont ces adresses que le scaffold transformera en fichiers de routes.

Rends le tout sous forme d'**arbre en liste à puces**, une ligne par écran, avec sur chaque ligne : son **nom**, son **URL/route**, et les **`UJ-*` / `FR-*`** qu'il sert.

```
- Accueil — `/` — UJ-1
  - Connexion — `/connexion` — UJ-1, FR-2
- Mes projets — `/projets` — UJ-2 (connexion requise)
  - Détail d'un projet — `/projets/:id` — UJ-2, UJ-3, FR-4
    - Modale « Partager » — (overlay) — FR-7
- Réglages — `/reglages` — FR-9
```

**Contrôle avant de faire valider** : chaque `UJ-*` traverse au moins un écran, chaque `FR-*` a un écran où il se déclenche, et chaque écran cite au moins un `UJ-*` ou `FR-*`. Un écran sans rien à servir est à supprimer ; un `FR-*` sans écran est une fonctionnalité que personne ne pourra utiliser — retourne au PRD avant de continuer.

C'est cette carte que l'étape `05-design-maquette.md` dessine et que l'étape `06-roadmap.md` doit couvrir **en entier** : un écran absent d'ici ne sera ni dessiné ni construit. → **validation utilisateur**.
