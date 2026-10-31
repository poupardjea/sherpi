# Mise en production

Un seul serveur (VPS) fait tout tourner avec Docker Compose : l'appli, PostgreSQL et Caddy, qui gère le HTTPS.

```
Navigateur (site du commerçant, page QR)
        │ HTTPS
        ▼
     Caddy ── certificat Let's Encrypt automatique
        │
        ▼
      app ── w.js, API, pages ──▶ Claude (choix des produits)
        │
        ▼
   PostgreSQL ── jamais exposé sur Internet
```

| Fichier | Rôle |
| --- | --- |
| [compose.yml](compose.yml) | Les 3 services, leurs volumes et leurs contrôles de santé |
| [Caddyfile](Caddyfile) | Domaine → appli, compression, en-têtes de sécurité |
| [.env.example](.env.example) | Variables à remplir sur le serveur (`deploy/.env`) |
| [backup.sh](backup.sh) | Sauvegarde nocturne de la base, 14 jours gardés |

## Coûts

Prix relevés le 31 octobre 2026, hors taxes. Ils montent régulièrement à cause du prix de la mémoire : vérifiez-les avant de commander.

| Poste | Choix | Coût |
| --- | --- | --- |
| Serveur | OVH VPS-1 : 2 vCPU, 4 Go, 40 Go, en France, sauvegarde quotidienne incluse | 3,81 €/mois en payant 12 mois d'avance, plus cher sans engagement |
| | Ou Hetzner CX23 : même taille, en Allemagne ou en Finlande, sans engagement | 5,99 €/mois, plus environ 1,20 € de sauvegardes |
| Copie des sauvegardes hors du serveur | Stockage objet (OVH, Scaleway…) | 1 à 3 €/mois |
| Domaine | .fr | ~10 €/an |
| IA | Claude Haiku, plafonné par boutique (`ai_monthly_quota`) | quelques €/mois |
| E-mails | Brevo, offre gratuite (300 par jour) | 0 € |
| Surveillance | UptimeRobot sur `/health` | 0 € |

**Total : 10 à 20 €/mois.** La machine est largement suffisante : l'appli, PostgreSQL et Caddy utilisent ensemble moins de 0,5 Go de mémoire.

## Avant de commencer

- **Le nom de domaine doit être définitif avant toute installation chez un commerçant.** L'adresse de `w.js` est collée sur leurs sites et ne doit plus jamais changer. Un domaine provisoire convient pour la démo seule.
- Il faut un serveur **Ubuntu 24.04 LTS** (ou Debian 12), créé avec une **clé SSH** et sans mot de passe.
- Le code doit être sur un dépôt Git accessible depuis le serveur.

## Installation (une seule fois)

Les commandes suivantes se lancent sur le serveur, connecté en SSH.

**1. Utilisateur, pare-feu et mises à jour de sécurité**

```bash
sudo adduser deploy && sudo usermod -aG sudo deploy
sudo rsync -a ~/.ssh /home/deploy/ && sudo chown -R deploy: /home/deploy/.ssh
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw unattended-upgrades git
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw allow 443/udp && sudo ufw enable
sudo dpkg-reconfigure -plow unattended-upgrades
```

Ensuite, dans `/etc/ssh/sshd_config`, mettre `PasswordAuthentication no` et `PermitRootLogin no`, puis `sudo systemctl restart ssh`. **Tester d'abord une connexion `ssh deploy@<ip>` dans un autre terminal**, pour ne pas se retrouver bloqué dehors.

> Docker ouvre lui-même les ports qu'il publie, sans passer par ufw. Ici, seul Caddy publie des ports (80 et 443) ; PostgreSQL n'en publie aucun.

**2. Docker**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
```

Se déconnecter puis se reconnecter en `deploy` pour que le groupe soit pris en compte. Vérifier ensuite avec `docker compose version`.

**3. Nom de domaine**

Chez le registraire, créer un enregistrement **A** (et **AAAA** s'il y a une IPv6) qui pointe vers l'IP du serveur. Il faut attendre que le domaine réponde (`ping <domaine>`) avant l'étape 5, sinon Caddy n'obtient pas le certificat.

**4. Code et variables**

```bash
git clone <url-du-dépôt> ~/conseiller-cadeau
cd ~/conseiller-cadeau/deploy
cp .env.example .env
openssl rand -hex 24   # à coller dans POSTGRES_PASSWORD
nano .env              # DOMAIN, POSTGRES_PASSWORD, ANTHROPIC_API_KEY, SEED_DEMO
chmod 600 .env
```

**5. Démarrage**

```bash
docker compose up -d --build
docker compose ps             # les 3 services doivent être « healthy » ou « running »
docker compose logs -f app    # migrations appliquées, « API prête »
curl https://<domaine>/health # {"ok":true}
```

Au premier démarrage, les migrations créent les tables. Avec `SEED_DEMO=1`, la cave de démo est chargée.

**6. Sauvegardes**

```bash
bash ~/conseiller-cadeau/deploy/backup.sh   # premier essai à la main
crontab -e
```

Ajouter cette ligne pour une sauvegarde chaque nuit à 3 h 30 :

```
30 3 * * * bash /home/deploy/conseiller-cadeau/deploy/backup.sh >> /home/deploy/backups/backup.log 2>&1
```

Une sauvegarde qui reste sur le serveur disparaît avec lui. Pour une copie hors du serveur, installer `rclone`, configurer un stockage objet nommé `sauvegardes` (`rclone config`), puis décommenter la ligne `rclone copy` de [backup.sh](backup.sh).

**7. Surveillance**

Créer une sonde UptimeRobot (gratuite) sur `https://<domaine>/health`, avec une alerte par e-mail.

## Mettre à jour

```bash
cd ~/conseiller-cadeau && git pull
cd deploy && docker compose up -d --build
```

Les migrations s'appliquent toutes seules au démarrage. Le service est coupé quelques secondes. Le widget est servi avec 5 minutes de cache, donc tous les sites des commerçants ont la nouvelle version au plus tard 5 minutes après.

**Revenir en arrière :** `git checkout <commit-précédent>`, puis `docker compose up -d --build`. Attention : une migration déjà appliquée n'est pas annulée. Toute migration doit donc rester compatible avec la version précédente du code.

## Restaurer une sauvegarde

```bash
cd ~/conseiller-cadeau/deploy
docker compose stop app
gunzip -c ~/backups/app-AAAA-MM-JJ.sql.gz | docker compose exec -T db psql -U app -d app
docker compose start app
```

**À faire une fois dès la mise en ligne**, pour vérifier que les sauvegardes sont réellement exploitables.

## Commandes utiles

```bash
docker compose logs -f --tail=100 app            # journaux (e-mails commerçant compris, en attendant la tâche 12)
docker compose exec db psql -U app -d app        # console SQL
docker compose exec db psql -U app -d app -c \
  "SELECT s.slug, u.month, u.calls FROM ai_usage u JOIN shops s ON s.id = u.shop_id ORDER BY u.month DESC"
docker compose restart app
docker system prune -f                           # libère l'espace des anciennes images
```

## Limites connues

- **Une seule instance de l'appli :** la limite de débit est gardée en mémoire. Cette taille suffit pour quelques centaines de boutiques.
- **E-mail au commerçant pas encore branché** (tâche 12) : il est seulement écrit dans les journaux.
- **`SEED_DEMO=1` remet la cave de démo dans son état initial à chaque démarrage.** À ne pas utiliser pour une vraie boutique qui porterait le même identifiant.
- **Le texte de la demande du client part chez Anthropic, aux États-Unis.** Le prénom et le téléphone n'y vont jamais. À mentionner dans la politique de confidentialité.
- **Le Dockerfile et `compose.yml` n'ont pas encore été testés sur une vraie machine.** Le premier démarrage sur le serveur sert de test.
