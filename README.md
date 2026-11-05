# Conseiller cadeau (nom provisoire)

Spec : [SPEC.md](SPEC.md). Maquettes : [design/](design/). Le nom du produit et la balise du widget sont dans [packages/shared/src/brand.ts](packages/shared/src/brand.ts).

## Organisation

| Dossier | Rôle |
| --- | --- |
| `packages/shared` | Types, budgets, filtrage serveur, classement de repli, validation des ids (règles 1 à 3), jours de retrait, réglages par métier ([verticals.ts](packages/shared/src/verticals.ts)) |
| `apps/api` | API Hono : config, recommandation, mises de côté, annulation, `.ics`, page QR, page d'accueil, faux sites de démo ; sert aussi `w.js` |
| `data/demos` | Les 3 boutiques de démo (caviste, épicerie fine, librairie), 30 produits fictifs chacune |
| `apps/api/migrations` | Schéma PostgreSQL (appliqué automatiquement au démarrage) |
| `apps/widget` | Web component (Shadow DOM, sans framework) compilé en un seul `w.js` |

## Lancer en local

```bash
npm install
npm run dev
```

Puis :

- http://localhost:8787 : page d'accueil avec les 3 démos (onglets Caviste, Épicerie fine, Librairie) ;
- http://localhost:8787/demo/cave-de-marthe : faux site de commerçant avec la bulle (idem `/demo/epicerie-de-lucien`, `/demo/les-mots-passants`) ;
- http://localhost:8787/cave-de-marthe : page QR.

## Métiers

Chaque boutique a un métier (`shops.vertical`) : `caviste`, `epicerie` ou `librairie`. Le métier règle les textes du widget (« dans notre cave »), les choix « pour qui » et « occasion », les raccourcis de la page QR, les puces sous les résultats, les icônes, et les synonymes du classement simple. Ajouter un métier = une entrée dans [verticals.ts](packages/shared/src/verticals.ts).

Les fiches produit sont neutres : `origin` (appellation, producteur, auteur), `category`, `details` (cépages, ingrédients, genre), `tags` (style, pour le classement), `unit` (« bouteille », « pot », « livre »).

## À compléter avant la mise en ligne

| Quoi | Où |
| --- | --- |
| Nom du produit et e-mail de contact | [brand.ts](packages/shared/src/brand.ts) |
| Tarif affiché | `PRICING` dans [landing.ts](apps/api/src/landing.ts) |
| Mentions légales (éditeur, SIRET, hébergeur) | `legalPage` dans [landing.ts](apps/api/src/landing.ts) |

Sans `.env`, les données sont en mémoire et la recommandation utilise le classement simple. Variables : voir [.env.example](.env.example).

```bash
npm test          # règles métier + API, sur store mémoire ET Postgres (PGlite, sans installation)
npm run lint
npm run typecheck
```

## Intégration chez un commerçant

Rien à télécharger : la même ligne pour tous, seul l'identifiant de boutique change. L'adresse et les attributs ne changent jamais (les sites des commerçants en dépendent) ; les mises à jour de `w.js` arrivent toutes seules, en 5 minutes au plus.

```html
<script src="https://<domaine>/w.js" data-shop="cave-de-marthe" async></script>
```

Page hébergée (QR code, lien) : `https://<domaine>/<slug>`. Elle marche pour tous les commerçants, y compris ceux qui n'ont pas de site modifiable.

| Plateforme | Où coller la ligne | Condition |
| --- | --- | --- |
| WordPress (hébergé chez soi) | Extension « WPCode », zone pied de page | Aucune |
| WordPress.com | Idem | Offre qui autorise les extensions, sinon lien vers la page |
| Wix | Paramètres → Avancé → Code personnalisé → fin du body, toutes les pages | Site premium avec domaine connecté. Pas l'élément « Intégrer HTML » (il enferme la bulle dans un cadre) |
| Shopify | Thèmes → Modifier le code → `theme.liquid`, avant `</body>` | Aucune |
| Squarespace | Paramètres → Avancé → Injection de code → pied de page | Offre avec injection de code |
| Webflow | Paramètres du site → Code personnalisé → pied de page | Offre de site payante |
| PrestaShop | Module d'insertion de code, ou modèle du thème | — |
| Site sur mesure | Une ligne avant `</body>` | Si le site a une CSP : autoriser le domaine dans `script-src` et `connect-src` |
| Pas de site, PagesJaunes, Facebook, Instagram | Lien vers la page hébergée, QR en boutique, fiche Google, bio Instagram | Aucune |

Menus relevés de mémoire : à vérifier sur un site d'essai pour chaque guide. À tester avant les pilotes :

- **Scripts réinjectés** (Wix, Google Tag Manager, bannières cookies) : le widget trouve sa boutique via `document.currentScript`, vide dans ce cas, et rien ne s'affiche. Prévoir une recherche du script par son adresse.
- **Bannières cookies** (Axeptio, Complianz) : le widget ne pose ni cookie ni traceur, à classer « essentiel ».
- **Extensions de cache WordPress** qui fusionnent les scripts : exclure `w.js`.
- **Autres bulles** (WhatsApp, Crisp) dans le même coin : prévoir une position à gauche.

Installation faite pour le commerçant : il nous invite comme collaborateur sur son site, on ne lui demande jamais son mot de passe.

## Déploiement

Procédure complète (VPS, Docker Compose, HTTPS, sauvegardes, coûts) : [deploy/README.md](deploy/README.md).

Une seule image Docker ([Dockerfile](Dockerfile)) : API + widget + pages. Au démarrage, les migrations sont appliquées.

Variables de l'appli (avec Compose, elles sont dérivées de `deploy/.env`) :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | URL du PostgreSQL managé (TLS par défaut) |
| `PUBLIC_URL` | `https://<domaine>` (liens d'annulation et `.ics`) |
| `ANTHROPIC_API_KEY` | Clé Claude (sans clé : classement simple) |
| `SEED_DEMO` | `1` pour la démo publique : les 3 boutiques de démo sont rechargées à chaque démarrage |
| `PORT` | Fourni par l'hébergeur (8787 par défaut) |

Charger la démo à la main dans une base : `DATABASE_URL=… npm run db:seed -w apps/api`.

### Quota d'IA par boutique

Chaque boutique a un plafond mensuel d'appels au modèle (`shops.ai_monthly_quota`, 5 000 par défaut, mois calendaire à l'heure de Paris). Au-delà, la recommandation bascule sans erreur sur le classement simple. `0` = jamais de modèle. Les demandes qui n'ont pas besoin du modèle (3 candidats ou moins) ne consomment rien. Consommation du mois : table `ai_usage`.

```sql
UPDATE shops SET ai_monthly_quota = 10000 WHERE slug = 'cave-de-marthe';
```

Limites actuelles : une seule instance (limite de débit et migrations non partagées entre instances), e-mail au commerçant simplement journalisé (tâche 12).
