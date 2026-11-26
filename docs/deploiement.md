# Mettre RepForge en ligne

Un serveur Linux avec Docker, un nom de domaine, et c'est tout : l'app, l'API, la base et les sauvegardes tournent dans Docker Compose (`deploy/`). Les choix sont expliqués dans l'ADR 0013.

```
https://repforge.duckdns.org
        │
   Caddy / FrankenPHP     HTTPS automatique (Let's Encrypt)
     /        → l'app (PWA)
     /api/... → Symfony
        │
   PostgreSQL 18          rôles admin / user, sauvegarde chaque nuit
```

En production : un VPS OVH (2 vCore, 4 Go), Ubuntu LTS. 2 Go de mémoire suffisent ; en dessous, ajouter de la swap pour la construction de l'image.

## 1. Accès au serveur : clé SSH

Sur le PC, créer une paire de clés (la clé privée ne quitte jamais le PC, la clé publique va sur le serveur) :

```powershell
ssh-keygen -t ed25519 -C "repforge-vps"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Donner la clé publique à l'hébergeur **au moment de l'installation** (chez OVH : ajouter la clé, puis réinstaller le VPS en la sélectionnant). Sinon, se connecter une fois avec le mot de passe reçu et l'ajouter soi-même :

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ubuntu@IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Un surnom dans `~/.ssh/config` sur le PC évite de retenir l'adresse et le port :

```
Host repforge
    HostName IP
    Port PORT_SSH
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 60
```

> Après une réinstallation, le serveur a une nouvelle identité et SSH refuse la connexion (« REMOTE HOST IDENTIFICATION HAS CHANGED »). On oublie l'ancienne : `ssh-keygen -R IP`.

## 2. Sécuriser le serveur

Toujours garder une session ouverte et tester dans un **deuxième terminal** avant de fermer : une erreur ici peut fermer la porte du serveur. En dernier recours, la console KVM de l'hébergeur ne passe pas par SSH.

```bash
# Mises à jour (redémarrer si demandé : sudo reboot)
sudo apt update && sudo apt full-upgrade -y

# Connexion SSH par clé uniquement, pas de root direct.
# Le fichier commence par 00- pour être lu avant celui de l'hébergeur (le premier lu l'emporte).
echo -e "PasswordAuthentication no\nPermitRootLogin no" | sudo tee /etc/ssh/sshd_config.d/00-hardening.conf
sudo systemctl restart ssh
```

Le mot de passe `ubuntu` reste valable pour `sudo` et la console KVM : le garder dans un gestionnaire de mots de passe.

**Pare-feu** (ufw écrit les règles iptables à notre place) : SSH, HTTP pour le certificat, HTTPS (TCP et UDP pour HTTP/3). Si SSH écoute sur un port non standard, ouvrir **ce port**, sinon la prochaine connexion échoue (timeout) :

```bash
sudo ss -tlnp | grep ssh          # le port réel de SSH
sudo ufw allow PORT_SSH/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443
sudo ufw enable
sudo ufw status verbose           # attendu : deny (incoming) + les trois règles
```

**fail2ban** bannit temporairement les IP qui ratent leur connexion plusieurs fois. Lui indiquer le port SSH s'il n'est pas 22 :

```bash
sudo apt install -y fail2ban
echo -e "[sshd]\nport = PORT_SSH" | sudo tee /etc/fail2ban/jail.d/sshd-port.local
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

## 3. Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu    # Docker sans sudo (équivaut à des droits administrateur)

# Journaux des conteneurs plafonnés, sinon ils finissent par remplir le disque
echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

Se déconnecter puis se reconnecter (le groupe `docker` s'applique à la session suivante), et vérifier : `docker run --rm hello-world`.

> **Docker contourne ufw** : un port publié par un conteneur (`ports:` dans `compose.yaml`) est ouvert sur Internet, même si ufw ne l'autorise pas. Seule l'app publie 80 et 443 ; **ne jamais ajouter de `ports:` à la base de données**.

## 4. Un nom de domaine gratuit (DuckDNS)

1. Se connecter sur [duckdns.org](https://www.duckdns.org) (avec un compte GitHub par exemple).
2. Créer un sous-domaine, par exemple `repforge`, ce qui donne `repforge.duckdns.org`.
3. Mettre l'adresse IP du **serveur** dans le champ « current ip », puis « update ip ».

Vérifier depuis le PC : `nslookup repforge.duckdns.org` renvoie l'IP du serveur. L'adresse d'un VPS ne change pas : pas besoin du script de mise à jour de DuckDNS. Pour passer plus tard à un vrai domaine, changer `DOMAIN` dans `deploy/.env` et relancer `deploy.sh`.

## 5. Première installation

Le dépôt est public : le serveur le clone en HTTPS, sans clé. (S'il redevient privé : créer sur le serveur une clé dédiée, et l'ajouter en lecture seule dans GitHub, *Settings → Deploy keys* ; cloner alors avec `git@github.com:MBGomes76/rep-forge.git`.)

```bash
cd ~
git clone https://github.com/MBGomes76/rep-forge.git
cd rep-forge/deploy
cp .env.example .env
chmod 600 .env    # lisible par son propriétaire uniquement
nano .env         # DOMAIN et les quatre secrets
./deploy.sh
```

Chaque secret (`APP_SECRET` et les trois mots de passe) se génère avec `openssl rand -hex 24`. Ils ne servent qu'entre les conteneurs : on n'a jamais à les retaper.

Au premier lancement, qui prend plusieurs minutes :
- PostgreSQL crée la base et les deux rôles (`deploy/initdb/01-roles.sh`) ;
- les migrations créent les tables ;
- Caddy obtient le certificat HTTPS.

L'app répond alors sur `https://<DOMAIN>`. En cas d'échec : `docker compose logs app --tail 50`.

## 6. S'inviter, puis inviter ses amis

```bash
cd ~/rep-forge/deploy
docker compose exec app php bin/console app:invite toi@example.com
```

La commande affiche un lien à usage unique, valable 7 jours.

## 7. Publier une nouvelle version

Sur le PC, avant de pousser sur `master` : `npm run typecheck && npm test && npm run test:api`, puis `git push`.

Sur le serveur :

```bash
~/rep-forge/deploy/deploy.sh
```

Le script :
1. récupère le code (`git pull --ff-only` : refuse si le serveur a des modifications locales) ;
2. construit la nouvelle image, pendant que l'ancienne version tourne encore ;
3. applique les migrations avec la nouvelle image (rôle admin) ;
4. remplace l'application (quelques secondes d'indisponibilité, sans conséquence pour une app hors ligne).

Au moindre échec, il s'arrête et l'ancienne version reste en ligne. Les sessions sont conservées, personne n'est déconnecté. Sur les téléphones, le bandeau « Nouvelle version disponible » apparaît dans l'heure, ou à la prochaine ouverture.

> Entre les étapes 3 et 4, l'ancien code tourne quelques secondes sur le nouveau schéma : une migration doit rester compatible avec la version précédente. Ajouter une table ou une colonne, oui ; supprimer ou renommer une colonne, en deux déploiements (le code cesse de l'utiliser, puis on la supprime).

## 8. Sauvegardes

Le service `backup` fait une copie de la base chaque nuit dans `deploy/backups/` et garde 14 jours. Une sauvegarde qui reste sur le serveur ne protège pas d'une panne du serveur : en copier régulièrement une sur le PC.

```powershell
scp repforge:rep-forge/deploy/backups/repforge-AAAA-MM-JJ.dump .
```

Pour restaurer une sauvegarde (cela remplace les données actuelles) :

```bash
cd ~/rep-forge/deploy
docker compose stop app
docker compose exec -T db pg_restore -U postgres -d repforge --clean --if-exists < backups/repforge-AAAA-MM-JJ.dump
docker compose start app
```

## 9. Si l'accès SSH est perdu (PC en panne, clé perdue)

1. **Console KVM** de l'hébergeur, connexion avec `ubuntu` et son mot de passe. Pour ajouter la clé d'un nouveau PC, réactiver le mot de passe le temps de l'envoyer : supprimer `/etc/ssh/sshd_config.d/00-hardening.conf`, `sudo systemctl restart ssh`, envoyer la clé, puis remettre le fichier.
2. **Mode rescue** (mot de passe perdu aussi) : l'hébergeur démarre un système de dépannage avec des identifiants temporaires, depuis lequel on ajoute une clé sur le disque.
3. **Réinstaller** : redéployer, puis restaurer une sauvegarde copiée hors du serveur.

Pour s'y préparer : une deuxième clé sur un autre appareil (une ligne de plus dans `~/.ssh/authorized_keys`), ou une copie de la clé privée (protégée par sa phrase de passe) dans un gestionnaire de mots de passe.

## Commandes utiles

```bash
cd ~/rep-forge/deploy
docker compose ps                  # état des services
docker compose logs -f app         # journaux de l'app (Ctrl+C pour quitter)
docker compose exec db psql -U repforge_admin repforge    # console SQL
sudo fail2ban-client status sshd   # IP bannies
df -h                              # place sur le disque
```
