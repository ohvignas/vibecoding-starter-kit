# Template PRD — la structure à remplir dans `docs/PRD.md`

> Ce fichier est un **modèle**, pas ton PRD. `/new-project` Phase 2 le suit section par section et
> écrit le résultat dans **`docs/PRD.md`**. Ne le modifie pas : copie ce qui te sert.
>
> **Attribution** : structure **adaptée de BMAD-METHOD** (MIT © 2025 BMad Code, LLC). Adaptée et
> traduite ; « BMAD » est une marque de BMad Code, LLC (non affiliée).

Colonne 100 %, chaque section = un titre + le contenu réel. **Ordre à respecter** :

1. **Vision** — quoi, pour qui, pourquoi ça compte. Assez clair pour tenir tout seul.
2. **Utilisateur cible**
   - *Jobs To Be Done* — le besoin émotionnel/social/fonctionnel/contextuel (même « c'est pour moi » est valide).
   - *Non-utilisateurs (v1)* — qui ce n'est **pas** (quand la frontière n'est pas évidente).
   - *Parcours utilisateurs clés* — récits avec persona nommé, numérotés **UJ-1 … UJ-N** (contexte, état d'entrée, chemin 3-5 étapes, climax, résolution).
3. **Glossaire** — les termes du produit, définis **exactement**. Interdit d'introduire un synonyme ailleurs.
4. **Fonctionnalités** — une sous-section par feature (4.1, 4.2…) :
   - *Description* comportementale (réalise UJ-X), avec tags `[HYPOTHÈSE]` inline.
   - *Exigences fonctionnelles* en blocs `#### FR-1 : {nom}` → prose « [Acteur] peut [capacité] sous [conditions]. Réalise UJ-X. » + **Conséquences (testables)** en puces + *Hors-scope* optionnel.
   - *NFR spécifiques* + *Notes* `[NOTE POUR PM]` optionnels.
5. **Non-objectifs (explicites)** — ce que le produit **n'est pas** / ne fera **pas** en v1. Coupe le « tant qu'on y est, ajoutons… » à tous les niveaux.
6. **Périmètre MVP** — *Dans le scope* (puces nettes) / *Hors scope MVP* (chaque item + raison ; marque ce qui est reporté en v2/v3).
7. **Métriques de succès** — *Primaires* / *Secondaires* / *Contre-métriques (à NE PAS optimiser)*. Format `**SM-1** : métrique — définition, cible. Valide FR-X.`
8. **Questions ouvertes** — numérotées. Deviennent des tickets/recherches, pas des trous silencieux.
9. **Index des hypothèses** — chaque `[HYPOTHÈSE]` du document, remonté ici pour **confirmation explicite** une par une.

## Clusters à ajouter selon le type de produit (n'inclus que le pertinent)

- *grand public* → Esthétique & ton, Architecture de l'information, Monétisation, Plateforme ;
- *entreprise* → Parties prenantes & approbations, Risques & mitigations, ROI, SLA/RTO/RPO, Intégrations, Rollout, Gouvernance des données ;
- *régulé* → Conformité (RGPD, HIPAA, PCI-DSS, WCAG 2.1 AA…) ;
- *produit dev* → Contrats d'API, Versioning/dépréciation, Budgets de perf.

## Checklist qualité (avant de faire valider)

prêt-à-décider · substance (pas de remplissage) · cohérence stratégique · « fini » clair · honnêteté du scope · utilisable par les phases suivantes · forme adaptée à l'enjeu.
