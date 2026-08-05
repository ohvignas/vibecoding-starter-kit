# Lancer l'app — Mobile (Expo)

`npx expo start`, puis :
- appuie sur **`i`** → simulateur iOS (Xcode requis), ou
- appuie sur **`a`** → émulateur Android (Android Studio requis), ou
- scanne le **QR code** avec l'app **Expo Go** sur ton téléphone.

**Ce que tu dois voir :** l'app s'ouvre sur le simulateur / ton téléphone et réagit à tes actions.

## Un seul serveur à la fois

Avant de lancer, **regarde s'il tourne déjà** — c'est le cas dès que tu mènes deux chantiers en même temps, ou que tu as laissé un terminal ouvert.

Expo écoute sur **http://localhost:8081**.

S'il répond, **n'en lance pas un second** : sers-toi de celui qui tourne. Deux serveurs sur le même projet, c'est au mieux une erreur « port déjà utilisé », au pire une app testée qui n'est pas celle que tu modifies. Le second chantier **partage** le serveur du premier.
