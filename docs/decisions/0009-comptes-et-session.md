# 0009 — Comptes sur invitation, session par cookie

**Contexte.** L'application est réservée à un petit cercle (CLAUDE.md : comptes sur invitation uniquement). Le front et l'API seront servis depuis la même origine.

**Décision.**

- **Invitation par la console.**
  - `bin/console app:invite ami@example.com` affiche un lien à usage unique, valable 7 jours.
  - La base ne garde que l'empreinte SHA-256 du jeton (256 bits aléatoires) : une fuite de la base ne donne accès à aucune invitation en attente.
  - L'invité choisit son mot de passe (10 caractères minimum, sans règle de composition) et il est connecté dans la foulée.
- **Session côté serveur.**
  - Le cookie est `HttpOnly`, donc invisible pour le JavaScript, ce qui limite l'impact d'une faille XSS.
  - Il est `SameSite=Lax` et dure 90 jours. Hors ligne, l'appareil n'en a pas besoin ; il le présente au retour du réseau.
- **CSRF.**
  - Le cookie n'est pas envoyé dans les requêtes venues d'un autre site.
  - En plus, l'API refuse tout envoi qui n'est pas en JSON (415). Un autre site ne peut pas forger de requête JSON sans autorisation CORS, et l'API n'en accorde aucune.
- **Connexion.**
  - Le message d'échec est le même que l'adresse soit inconnue ou le mot de passe faux : on ne révèle pas qui a un compte.
  - Après 5 échecs en 15 minutes, la connexion est bloquée (429).

**Alternative écartée.** *Jeton JWT stocké par le front.* C'est plus « API pure », mais il faudrait gérer le renouvellement et le stockage dans le navigateur, qui est accessible au JavaScript. Pour une seule application sur la même origine, la session est plus simple et plus sûre.

**Conséquences.**

- La session est stockée dans des fichiers (`var/sessions`). En production avec plusieurs serveurs, il faudra la déplacer en base.
- À l'étape 4, le front ajoutera les écrans de connexion et d'invitation, et passera par un proxy Vite pour rester sur la même origine en développement.
