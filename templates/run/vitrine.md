# Lancer le site — Vitrine (Astro + shadcn + Keystatic)

Un seul terminal :
1. `npm run dev`

Ouvre **http://localhost:4321** — et l'admin CMS sur **http://localhost:4321/keystatic**.

**Ce que tu dois voir :** la page d'accueil se charge sur localhost, et `/keystatic` affiche l'admin du contenu.

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

Le site écoute sur **http://localhost:4321**.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
