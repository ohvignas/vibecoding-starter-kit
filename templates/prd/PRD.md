# Template PRD — la structure à remplir dans `docs/PRD.md`

> Ce fichier est un **modèle**, pas ton PRD. `/new-project` le suit section par section à l'étape
> `02-prd.md` et écrit le résultat dans **`docs/PRD.md`**. Ne le modifie pas : copie ce qui te sert.
> Une seule section fait exception : l'**arborescence** (7) se remplit plus tard, à l'étape
> `04-arborescence.md`, une fois l'architecture posée.
>
> **Attribution** : structure **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC). Adaptée et
> traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).

Colonne 100 %, chaque section = un titre + le contenu réel. **Ordre à respecter** :

1. **Problème** — ce qui ne va pas **aujourd'hui**, décrit **sans jamais nommer ta solution**.
   - *La situation actuelle* — comment les gens font en ce moment, et où ça coince (contourner, abandonner, refaire à la main).
   - *Qui en souffre, et combien ça coûte* — temps perdu, argent, erreurs, renoncement. Un ordre de grandeur suffit, mais donne-en un.
   - *Pourquoi maintenant* — ce qui a changé et rend le problème traitable (nouvel outil, nouvelle règle, nouveau public).
   - *Preuve* — ce qui te fait dire que le problème est réel (une personne interrogée, ta propre expérience, un chiffre). Rien ? Écris `[HYPOTHÈSE: …]` et remonte-le à l'index (12).
   > Test : si cette section décrit déjà ton app, elle est fausse. Réécris-la comme si la solution n'existait pas.
2. **Vision** — quoi, pour qui, pourquoi ça compte. Assez clair pour tenir tout seul, et **répond au problème (1)**.
3. **Utilisateur cible**
   - *Jobs To Be Done* — le besoin émotionnel/social/fonctionnel/contextuel (même « c'est pour moi » est valide).
   - *Non-utilisateurs (v1)* — qui ce n'est **pas** (quand la frontière n'est pas évidente).
   - *Parcours utilisateurs clés* — récits avec persona nommé, numérotés **UJ-1 … UJ-N** (contexte, état d'entrée, chemin 3-5 étapes, climax, résolution).
4. **Entreprise & objectifs commerciaux** — à qui ça rapporte quoi, et comment on saura que ça a marché **commercialement**. À remplir même pour un projet perso ou gratuit : la réponse est alors « personne ne paie, le gain est X » — et ça se dit.
   - *Qui porte le produit* — toi seul, une société, une association, un client. Le nom qui apparaîtra dessus.
   - *Le modèle* — gratuit · payant (prix et unité : par mois, par siège, à l'usage) · freemium · commande d'un client · interne. Si personne ne paie, dis **qui finance** et **jusqu'à quand**.
   - *Objectifs commerciaux* numérotés **OC-1 … OC-N**, chacun **chiffré et daté** : `**OC-1** : {objectif} — cible {chiffre} d'ici {date}. Mesuré par {SM-x}.` (ex. « 30 comptes payants d'ici 6 mois », « 500 € / mois de revenu récurrent », « 20 dossiers traités par semaine en interne »).
   - *Ce qu'on ne cherche PAS à gagner* — l'équivalent commercial des non-objectifs (8). Coupe la fonctionnalité « qui pourrait aussi rapporter ».
   - *Coûts à couvrir* — hébergement, API payantes, temps. Un ordre de grandeur par mois : c'est ce qui rend un objectif de revenu vérifiable.
5. **Glossaire** — les termes du produit, définis **exactement**. Interdit d'introduire un synonyme ailleurs.
6. **Fonctionnalités** — une sous-section par feature (6.1, 6.2…) :
   - *Description* comportementale (réalise UJ-X), avec tags `[HYPOTHÈSE]` inline.
   - *Exigences fonctionnelles* en blocs `#### FR-1 : {nom}` → prose « [Acteur] peut [capacité] sous [conditions]. Réalise UJ-X. » + **Conséquences (testables)** en puces + *Hors-scope* optionnel.
   - *NFR spécifiques* + *Notes* `[NOTE POUR PM]` optionnels.
7. **Arborescence** — la carte des **écrans**, remplie à l'étape `04-arborescence.md` (pas ici) : hiérarchie des pages, navigation, URL, et pour chaque écran les `UJ-*` / `FR-*` qu'il sert. C'est le pont entre les parcours (3) et le design : un écran absent d'ici ne sera ni dessiné ni construit.
8. **Non-objectifs (explicites)** — ce que le produit **n'est pas** / ne fera **pas** en v1. Coupe le « tant qu'on y est, ajoutons… » à tous les niveaux.
9. **Périmètre MVP** — *Dans le scope* (puces nettes) / *Hors scope MVP* (chaque item + raison ; marque ce qui est reporté en v2/v3).
10. **Métriques de succès** — *Primaires* / *Secondaires* / *Contre-métriques (à NE PAS optimiser)*. Format `**SM-1** : métrique — définition, cible. Valide FR-X.` Au moins une doit mesurer un **OC-*** de la section 4 : sans elle, l'objectif commercial n'est qu'un vœu.
11. **Questions ouvertes** — numérotées. Deviennent des tickets/recherches, pas des trous silencieux.
12. **Index des hypothèses** — chaque `[HYPOTHÈSE]` du document, remonté ici pour **confirmation explicite** une par une.

## Clusters à ajouter selon le type de produit (n'inclus que le pertinent)

- *grand public* → Esthétique & ton, Architecture de l'information, Monétisation, Plateforme ;
- *entreprise* → Parties prenantes & approbations, Risques & mitigations, ROI, SLA/RTO/RPO, Intégrations, Rollout, Gouvernance des données ;
- *régulé* → Conformité (RGPD, HIPAA, PCI-DSS, WCAG 2.1 AA…) ;
- *produit dev* → Contrats d'API, Versioning/dépréciation, Budgets de perf.

## Checklist qualité (avant de faire valider)

prêt-à-décider · substance (pas de remplissage) · cohérence stratégique · « fini » clair · honnêteté du scope · utilisable par les étapes suivantes · forme adaptée à l'enjeu.
