# Inventaire de complétude

Le **contrat de couverture** du projet : tout ce que la maquette et le PRD promettent, ligne par ligne. Produit par `/new-project` **avant** la roadmap (c'en est la base), relu par les trois critiques (`critique-produit`, `critique-donnees`, `critique-ux`). Ce qui n'est pas ici ne sera pas construit.

Une ligne par **élément** (pas par écran) : un bouton, un champ, un filtre, un onglet, une modale. La colonne « Jalon » porte le numéro du jalon qui le rend **fonctionnel** ; tant qu'elle vaut `—`, c'est un `MANQUE`.

| Écran | Élément | Donnée / source réelle | Feature du PRD | États prévus (vide · chargement · erreur) | Jalon |
|---|---|---|---|---|---|
| _(exemple)_ Connexion | bouton « Se connecter » | table `users` | UJ-01 | erreur : identifiants invalides | 02-authentification |

Complété au fil du build : un élément qui apparaît en cours de route s'ajoute ici **avant** d'être codé.
