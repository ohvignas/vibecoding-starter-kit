# Lancer l'app — Desktop (Electron)

`npm start`

**Ce que tu dois voir :** la fenêtre Electron s'ouvre avec ton interface.

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

La fenêtre Electron est déjà ouverte, ou pas : regarde ton écran et tes terminaux.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
