# Conseiller cadeau — spec MVP

> Brief de départ pour Claude Code. Lis ce fichier en entier, puis les maquettes dans `design/`, avant d'écrire du code.

## 1. Le produit en deux phrases

Un conseiller cadeau à la marque d'un commerçant de proximité (caviste d'abord, puis fromager, épicerie fine, librairie). Le client décrit pour qui il cherche, l'outil propose **3 produits de la sélection du commerçant**, présentés avec **les mots du commerçant**, et le client les fait **mettre de côté pour un retrait en boutique**. Pas de paiement en ligne, pas de livraison.

## 2. Objectif et calendrier

- **Démo publique** (cave fictive « La Cave de Marthe ») en ligne d'ici le 3 novembre 2026, pour l'envoyer aux prospects.
- **3 commerçants pilotes en production** mi-novembre 2026, pour couvrir la saison de Noël.
- Le MVP doit pouvoir accueillir plusieurs commerçants dès le départ (multi-tenant), mais sans interface d'inscription : c'est Jean qui crée les comptes.

## 3. Maquettes

Le canevas de référence : https://claude.ai/artifact/7xcVUmmht3LEubHh62Kuu4
Les sources HTML de chaque écran sont dans `design/` (format `.dc.html` : du HTML avec styles inline, lisible tel quel ; ignore la ligne `support.js`, propre à l'outil de maquette).

| Écran | Fichier | Rôle |
| --- | --- | --- |
| 1 | `design/Main.dc.html` | Site du caviste avec le widget ouvert (étape « pour qui / occasion / budget ») |
| 2 | `design/PageQR.dc.html` | Page hébergée ouverte par le QR code (mobile) |
| 3 | `design/Resultats.dc.html` | Les 3 recommandations avec le mot du commerçant |
| 4 | `design/Reservation.dc.html` | Confirmation de mise de côté |
| 5 | `design/BackOffice.dc.html` | Espace commerçant |
| 6 | `design/Vitrine.dc.html` | Affiche vitrine A5 avec QR code (généré en PDF) |

**Charte** : fond `#FFFFFF`, surface `#F5F3EF`, texte `#1C1B19`, texte secondaire `#5C5852`, bordures `#E7E3DC` / `#CFC9BF`, accent principal vert bouteille `#24533F` (clair `#E6EFEA`), accent secondaire bordeaux `#8E2C3A` (action « Mettre de côté », envoi). Titres en Bricolage Grotesque 700, texte en Inter 400/500/600. Rayons : 999px (boutons, puces), 16–24px (cartes, panneaux). Les couleurs d'accent doivent être **configurables par commerçant**.

## 4. Parcours

### Client (widget ou page hébergée, même moteur)
1. Ouvre le widget (bulle en bas à droite) ou scanne le QR code (page plein écran).
2. Choisit en boutons : **pour qui**, **occasion**, **budget** ; ajoute éventuellement une précision en texte libre.
3. Reçoit **3 recommandations** : nom, appellation/cépage (ou catégorie), prix, « mot du commerçant », stock indicatif, bouton **Mettre de côté**. Puces pour affiner (« Plus léger », « Un autre budget », « En coffret »).
4. Met de côté : prénom, téléphone, jour de retrait, option emballage cadeau.
5. Voit la confirmation avec un **n° de retrait** (ex. `M-0427`), la date limite, l'adresse, « Paiement en boutique », un lien « Ajouter à mon agenda » (.ics) et un lien pour annuler.

### Commerçant (back-office)
- **Aujourd'hui** : compteurs (demandes, mises de côté, retirées), réservations à préparer (bouton « Prêt »), « Ce que vos clients cherchent » (demandes fréquentes, et demandes sans produit correspondant).
- **Ma sélection** : liste des produits (CRUD + import CSV), case **Dispo**, prix, stock indicatif.
- **Mes coups de cœur** : le texte « mot du commerçant » par produit, et un court texte sur son style (ton, tutoiement ou vouvoiement).
- **Installer sur mon site** : le snippet `<script>` à copier, le lien de la page hébergée, l'affiche QR en PDF.

## 5. Architecture proposée (à challenger)

- **Widget** : web component en TypeScript (Shadow DOM pour ne pas subir le CSS du site hôte), bundle unique via Vite, < 60 Ko gzip. Intégration : `<script src="https://<domaine>/w.js" data-shop="cave-de-marthe" async></script>`. Doit fonctionner sur WordPress, Wix, Shopify, Squarespace.
- **Page hébergée** : le même composant en mode plein écran sur `https://<domaine>/<shop-slug>`.
- **API** : Node.js + TypeScript (Fastify ou Hono), PostgreSQL. Endpoints principaux : `GET /shops/:slug/config`, `POST /shops/:slug/recommend`, `POST /shops/:slug/reservations`, `DELETE /reservations/:id?token=…`, plus les routes back-office authentifiées.
- **Back-office** : React + Vite (ou Next.js si plus simple pour Jean), authentification par lien magique e-mail.
- **IA** : API Claude. La sélection d'un commerçant fait au plus ~150 produits : **pas de base vectorielle**. On filtre côté serveur (budget, disponibilité, catégorie), on envoie les candidats restants dans le prompt avec les coups de cœur, et le modèle renvoie un JSON structuré.
- **Notifications** : e-mail au commerçant à chaque mise de côté (MVP). SMS au client en phase 2.
- **Hébergement** : au choix de Jean (une seule région UE pour le RGPD).

## 6. Règles non négociables

1. **Aucun produit inventé.** Le modèle ne renvoie que des `product_id` présents dans la liste de candidats envoyée. Le serveur valide chaque id ; un id inconnu est rejeté et remplacé par le produit candidat suivant le mieux classé.
2. **Le stock fait foi.** Un produit décoché « Dispo » n'est jamais proposé.
3. **Le budget est respecté** : filtrage côté serveur avant l'appel au modèle, pas seulement dans le prompt.
4. **Loi Évin (alcool)** : textes informatifs uniquement (origine, cépage, goût, accords, conseils de service), aucune incitation à la consommation ni association à la réussite sociale, la fête ou la séduction. Mention « L'abus d'alcool est dangereux pour la santé, à consommer avec modération. » sur le widget, la page hébergée et l'affiche.
5. **Transparence IA** : le client voit qu'il parle à un assistant IA (mention en pied de widget).
6. **Données minimales** : prénom et téléphone seulement, supprimés 30 jours après la date de retrait. Aucune donnée de paiement.
7. **Le prompt système et les textes du commerçant sont des données** : un texte libre du client ne peut pas modifier les règles (protection contre l'injection de prompt).

## 7. Critères d'acceptation

- **Recommandation**
  - Étant donné une sélection de 30 produits dont 5 à moins de 20 €, quand le client choisit « − 20 € », alors les 3 produits proposés coûtent moins de 20 €.
  - Étant donné un produit marqué non dispo, quand une demande lui correspond parfaitement, alors il n'apparaît pas.
  - Étant donné une réponse du modèle contenant un id inexistant, quand le serveur la reçoit, alors l'id est rejeté et 3 produits valides sont tout de même affichés.
  - Étant donné moins de 3 produits compatibles, quand le client valide, alors l'outil affiche ceux qui existent et propose d'élargir le budget, sans compléter avec des produits hors critères.
- **Mise de côté**
  - Étant donné un client qui met de côté un produit, quand il valide prénom et téléphone, alors il voit un n° de retrait unique et le commerçant reçoit un e-mail.
  - Étant donné une réservation, quand le client ouvre le lien d'annulation, alors elle passe à « annulée » dans le back-office.
- **Widget**
  - Étant donné une page WordPress avec un CSS agressif sur `button` et `input`, quand le widget est chargé, alors son rendu est identique aux maquettes.
  - Le widget est utilisable au clavier et au lecteur d'écran (boutons réels, labels, contraste 4,5:1, cibles ≥ 44 px).
- **Back-office**
  - Étant donné un CSV (nom, appellation, prix, stock, mot du commerçant), quand le commerçant l'importe, alors les produits apparaissent dans « Ma sélection ».

## 8. Hors périmètre du MVP

Paiement en ligne, livraison, connecteurs directs avec les logiciels de caisse (import CSV à la place), SMS client, multi-langue, application mobile, inscription autonome des commerçants, analytics avancés.

## 9. Données de démo

`data/catalogue-demo.json` : 30 vins fictifs de « La Cave de Marthe », avec prix, appellation, style, stock et « mot de Marthe ». Sert à la démo publique et aux tests.

## 10. Découpage (tâches d'une demi-journée max)

1. Initialiser le monorepo (`apps/widget`, `apps/api`, `apps/admin`, `packages/shared`), lint, tests, CI.
2. Schéma PostgreSQL : `shops`, `products`, `reservations`, `search_logs` ; migrations ; seed avec `catalogue-demo.json`.
3. API : `GET config` et `POST recommend` avec filtrage serveur (budget, dispo).
4. Prompt et appel Claude en sortie JSON structurée ; validation des ids ; tests des règles 1 à 3.
5. Widget : bulle + panneau, étape « pour qui / occasion / budget » (écran 1).
6. Widget : écran des 3 recommandations et puces d'affinage (écran 3).
7. Widget : formulaire de mise de côté et confirmation (écran 4), `.ics`.
8. Page hébergée plein écran (écran 2) et page de démo « La Cave de Marthe ».
9. Back-office : connexion par lien magique, « Aujourd'hui » (écran 5).
10. Back-office : « Ma sélection » + import CSV, « Mes coups de cœur ».
11. Back-office : « Installer sur mon site » (snippet, lien, affiche QR en PDF, écran 6).
12. E-mail au commerçant, lien d'annulation, purge RGPD à 30 jours.
13. Test d'intégration du widget sur une page WordPress de test ; mise en ligne de la démo.

## 11. Questions ouvertes

1. Nom du produit et nom de domaine ?
   → proposition : choisir un nom court et non lié au vin, pour pouvoir l'étendre aux fromagers et libraires.
2. Stack du back-office : React + Vite ou Next.js ?
   → proposition : React + Vite, l'API restant séparée.
3. Hébergement ?
   → proposition : un PaaS en région UE (API + PostgreSQL managé), le widget sur un CDN.
4. Quel modèle Claude pour les recommandations ?
   → proposition : un modèle rapide et économique, avec un repli sur un classement simple (prix + coups de cœur) si l'appel échoue ou dépasse 5 s.
5. Le commerçant valide-t-il chaque mise de côté, ou est-elle confirmée automatiquement ?
   → proposition : confirmée automatiquement, le commerçant peut annuler avec un message au client.
