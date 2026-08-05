# Lancer l'app — SaaS (Convex + TanStack Start)

Deux terminaux :
1. `npx convex dev` — backend Convex + génération des types (laisse tourner).
2. `npm run dev` — le front.

Ouvre **http://localhost:3000**.

**Ce que tu dois voir :** la page se charge sur localhost et les données Convex s'affichent (et se mettent à jour en direct).

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

Le backend Convex écoute sur **http://localhost:3210**, le front sur **http://localhost:3000**.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
