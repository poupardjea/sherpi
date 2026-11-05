import { BRAND, ofName, verticalOf, type Shop } from "@app/shared";
import { esc, layout } from "./pages.ts";

// Tarif de lancement affiché sur la page d'accueil : à ajuster ici.
const PRICING = {
  season: { price: "59 € HT", label: "Pack Noël", detail: "de l'installation au 31 janvier" },
  monthly: { price: "29 € HT", label: "par mois ensuite", detail: "sans engagement" },
};

const FAQ: [string, string][] = [
  [
    "Je n'ai pas de site internet, ça marche quand même ?",
    "Oui. Chaque boutique a sa propre page, ouverte par un QR code posé au comptoir ou en vitrine, et partageable sur votre fiche Google ou Instagram.",
  ],
  [
    "Sur quel site peut-on l'installer ?",
    "Sur tous ceux qui acceptent une ligne de code : WordPress, Wix, Shopify, Squarespace, Webflow, PrestaShop ou un site sur mesure. On peut l'installer avec vous.",
  ],
  [
    "L'IA peut-elle proposer un produit que je n'ai pas ?",
    "Non. Elle choisit uniquement parmi vos produits disponibles et en stock, et elle n'écrit rien : le client lit vos mots, ceux que vous avez écrits sur chaque produit.",
  ],
  [
    "Et si un produit n'est plus en stock ?",
    "Vous le décochez, ou le stock tombe à zéro : il n'est plus jamais proposé.",
  ],
  [
    "Le client paie en ligne ?",
    "Non. Il met de côté, vous êtes prévenu, et il règle au comptoir. Aucune commission sur vos ventes.",
  ],
  [
    "Et les données de mes clients ?",
    "Seuls le prénom et le téléphone sont demandés, pour préparer le retrait. Ils sont effacés 30 jours après. Aucun cookie, aucun traceur.",
  ],
];

const STEPS: [string, string][] = [
  ["Vous choisissez", "Vos produits, vos coups de cœur et quelques mots sur chacun, comme vous les diriez au comptoir."],
  ["Vos clients demandent", "Sur votre site ou en scannant le QR code : pour qui, l'occasion, le budget. Trois idées de votre sélection, en stock."],
  ["Vous préparez", "Le client met de côté, vous êtes prévenu, il passe chercher son cadeau et le règle en boutique."],
];

const POINTS: [string, string][] = [
  ["Jamais hors stock", "Seuls les produits disponibles sont proposés."],
  ["Vos mots", "L'IA choisit, elle n'écrit rien : le client lit vos conseils."],
  ["Le client vient en boutique", "Pas de paiement en ligne, pas de commission."],
  ["Prêt en un après-midi", "Une ligne sur votre site, ou un QR code au comptoir."],
];

function demoTab(shop: Shop, i: number): string {
  const v = verticalOf(shop.vertical);
  return `<button class="tab" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(v.label)}</button>`;
}

function demoPanel(shop: Shop, i: number): string {
  const v = verticalOf(shop.vertical);
  return `<div class="panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i === 0 ? "" : " hidden"}>
  <div class="phone"><div class="screen"><${BRAND.elementTag} shop="${esc(shop.slug)}" mode="page"></${BRAND.elementTag}></div></div>
  <div class="demo-copy">
    <div class="kicker">${esc(v.label)} · boutique fictive</div>
    <h3>${esc(shop.name)}</h3>
    <p>C'est la page que voit votre client en scannant le QR code. Décrivez quelqu'un, recevez trois idées avec les mots ${esc(ofName(shop.merchant_first_name))}, et allez jusqu'à la mise de côté.</p>
    <p class="try">Essayez par exemple : <q>${esc(v.copy.example)}</q></p>
    <div class="links">
      <a class="btn dark" href="/demo/${esc(shop.slug)}" target="_blank" rel="noopener">Voir sur un site de commerçant</a>
      <a class="btn" href="/${esc(shop.slug)}" target="_blank" rel="noopener">Ouvrir en plein écran</a>
    </div>
  </div>
</div>`;
}

/** Page d'accueil : présentation du produit et une démo par métier. */
export function landingPage(demos: Shop[]): string {
  const name = esc(BRAND.productName);
  const mail = `mailto:${BRAND.contactEmail}`;
  return layout(
    `${BRAND.productName} — le conseiller cadeau des commerces de proximité`,
    `<header class="top">
  <div class="wrap bar">
    <a class="logo" href="/">${name}</a>
    <nav><a href="#demo">Démo</a><a href="#fonctionnement">Comment ça marche</a><a href="#tarif">Tarif</a><a href="#questions">Questions</a></nav>
    <a class="btn small accent" href="${mail}">Nous écrire</a>
  </div>
</header>
<main>
  <section class="hero wrap">
    <div class="kicker">Pour les cavistes, épiceries fines, librairies…</div>
    <h1>Vos clients trouvent le bon cadeau chez vous, avec vos conseils.</h1>
    <p class="lead">Un conseiller cadeau à votre nom, sur votre site et au comptoir par QR code. Le client décrit la personne, reçoit trois idées de votre sélection, avec vos mots, et les fait mettre de côté. Il paie en boutique.</p>
    <div class="ctas"><a class="btn accent" href="#demo">Essayer la démo</a><a class="btn" href="${mail}">Nous écrire</a></div>
  </section>

  <section id="demo" class="demo">
    <div class="wrap">
      <h2>Essayez-le comme un de vos clients</h2>
      <p class="sub">Trois boutiques fictives, trois métiers. Choisissez le vôtre.</p>
      <div class="tabs" role="tablist" aria-label="Démo par métier">${demos.map(demoTab).join("")}</div>
      ${demos.map(demoPanel).join("\n")}
    </div>
  </section>

  <section id="fonctionnement" class="wrap">
    <h2>Comment ça marche</h2>
    <ol class="steps">${STEPS.map(([t, d], i) => `<li><span class="num">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("")}</ol>
    <ul class="points">${POINTS.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join("")}</ul>
  </section>

  <section id="tarif" class="pricing">
    <div class="wrap">
      <h2>Un tarif simple</h2>
      <div class="offer">
        <div><div class="price">${PRICING.season.price}</div><div class="what">${PRICING.season.label}</div><div class="detail">${PRICING.season.detail}</div></div>
        <div class="plus">puis</div>
        <div><div class="price">${PRICING.monthly.price}</div><div class="what">${PRICING.monthly.label}</div><div class="detail">${PRICING.monthly.detail}</div></div>
      </div>
      <p class="sub">Installation et mise en place faites avec vous. Pas de commission sur vos ventes.</p>
      <a class="btn accent" href="${mail}">Être parmi les premiers commerçants</a>
    </div>
  </section>

  <section id="questions" class="wrap faq">
    <h2>Questions fréquentes</h2>
    ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n    ")}
  </section>
</main>
<footer class="wrap foot">
  <span>${name}</span>
  <a href="/mentions-legales">Mentions légales et confidentialité</a>
  <a href="${mail}">${esc(BRAND.contactEmail)}</a>
</footer>
<script src="/w.js" async></script>
<script>
// Onglets accessibles : clic, flèches gauche/droite.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function select(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(t));
  t.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    select(next);
    next.focus();
  });
});
</script>`,
    `<meta name="description" content="Un conseiller cadeau à votre nom, sur votre site et au comptoir : trois idées de votre sélection, avec vos mots, mises de côté pour un retrait en boutique.">
<meta name="theme-color" content="#24533F">
<style>${LANDING_CSS}</style>`,
  );
}

const LANDING_CSS = `
:root{--accent:#24533F;--accent2:#8E2C3A;--surface:#F5F3EF;--text:#1C1B19;--muted:#5C5852;--line:#E7E3DC;--line-strong:#CFC9BF;--title:'Bricolage Grotesque',system-ui,sans-serif}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--text);font:16px/1.55 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
h1,h2,h3{font-family:var(--title);font-weight:700;margin:0;letter-spacing:-.02em}
h2{font-size:36px;line-height:1.1}
h3{font-size:20px}
p{margin:0}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.wrap{max-width:1120px;margin:0 auto;padding-left:24px;padding-right:24px}
section{padding-top:80px;padding-bottom:80px;scroll-margin-top:68px}
.kicker{font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent2)}
.sub{color:var(--muted);margin-top:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:999px;border:1px solid var(--line-strong);background:#fff;color:var(--text);font-weight:600;font-size:15px;text-decoration:none;text-align:center}
.btn:hover{border-color:var(--text)}
.btn.accent{background:var(--accent2);border-color:var(--accent2);color:#fff}
.btn.accent:hover{background:color-mix(in srgb,var(--accent2) 85%,#000)}
.btn.dark{background:var(--text);border-color:var(--text);color:#fff}
.btn.small{min-height:40px;padding:0 16px;font-size:14px}

.top{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:32px;height:68px}
.logo{font-family:var(--title);font-weight:700;font-size:22px;color:var(--text);text-decoration:none;letter-spacing:-.02em}
.top nav{display:flex;gap:24px;margin-left:auto;font-size:15px}
.top nav a{color:var(--text);text-decoration:none}
.top nav a:hover{color:var(--accent)}

.hero{padding-top:96px;padding-bottom:72px;display:flex;flex-direction:column;gap:22px}
.hero h1{font-size:64px;line-height:1.02;letter-spacing:-.035em;max-width:900px}
.lead{font-size:20px;line-height:1.55;color:var(--muted);max-width:720px}
.ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}

.demo{background:var(--surface)}
.tabs{display:flex;gap:8px;margin:28px 0 32px;flex-wrap:wrap}
.tab{height:44px;padding:0 20px;border-radius:999px;border:1px solid var(--line-strong);background:#fff;color:var(--text);font:600 15px Inter,system-ui,sans-serif;cursor:pointer}
.tab[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.panel{display:grid;grid-template-columns:400px 1fr;gap:56px;align-items:center}
.panel[hidden]{display:none}
.phone{border-radius:44px;background:var(--text);padding:12px;box-shadow:0 30px 60px rgba(28,27,25,.18)}
/* Pas de barre de défilement visible : elle déborderait des coins arrondis (on défile comme sur un téléphone). */
.screen{height:680px;border-radius:34px;overflow:hidden auto;background:#fff;--cc-min-height:680px;overscroll-behavior:contain;scrollbar-width:none}
.screen::-webkit-scrollbar{display:none}
.demo-copy{display:flex;flex-direction:column;gap:16px;max-width:460px}
.demo-copy h3{font-size:32px;line-height:1.1}
.demo-copy p{color:var(--muted)}
.try{font-size:15px}
.try q{color:var(--text);font-weight:500}
.links{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}

.steps{list-style:none;padding:0;margin:36px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.steps li{display:flex;flex-direction:column;gap:10px;padding:28px;border-radius:24px;background:var(--surface)}
.steps p{color:var(--muted)}
.num{width:36px;height:36px;border-radius:999px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.points{list-style:none;padding:0;margin:24px 0 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}
.points li{display:flex;flex-direction:column;gap:4px;padding-top:16px;border-top:2px solid var(--accent)}
.points span{color:var(--muted);font-size:15px}

.pricing{background:var(--accent);color:#fff;text-align:center}
.pricing .wrap{display:flex;flex-direction:column;align-items:center;gap:20px}
.pricing .sub{color:color-mix(in srgb,#fff 80%,var(--accent))}
.offer{display:flex;align-items:center;gap:32px;flex-wrap:wrap;justify-content:center;margin-top:12px}
.offer>div:not(.plus){min-width:220px;padding:28px 32px;border-radius:24px;background:#fff;color:var(--text)}
.price{font-family:var(--title);font-weight:700;font-size:44px;letter-spacing:-.03em}
.what{font-weight:600}
.detail{color:var(--muted);font-size:14px}
.plus{font-size:18px;opacity:.85}

.faq h2{margin-bottom:24px}
.faq details{border-bottom:1px solid var(--line);padding:4px 0}
.faq summary{cursor:pointer;font-weight:600;font-size:17px;padding:16px 0;list-style-position:outside}
.faq details p{color:var(--muted);padding:0 0 18px;max-width:760px}

.foot{display:flex;gap:24px;flex-wrap:wrap;padding-top:32px;padding-bottom:40px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.foot span{margin-right:auto;font-weight:600;color:var(--text)}

@media (max-width:900px){
  .panel{grid-template-columns:1fr;gap:32px}
  .phone{max-width:400px;width:100%;margin:0 auto}
  .steps,.points{grid-template-columns:1fr 1fr}
}
@media (max-width:640px){
  .wrap{padding-left:16px;padding-right:16px}
  section{padding-top:56px;padding-bottom:56px}
  .top nav{display:none}
  .bar{justify-content:space-between}
  .hero{padding-top:48px}
  .hero h1{font-size:40px}
  .lead{font-size:17px}
  h2{font-size:28px}
  .phone{border-radius:0;padding:0;background:none;box-shadow:none}
  .screen{height:620px;--cc-min-height:620px;border-radius:20px;border:1px solid var(--line)}
  .steps,.points{grid-template-columns:1fr}
  .offer>div:not(.plus){min-width:0;width:100%}
}
`;

/** Mentions légales et confidentialité (à compléter avant la mise en ligne). */
export function legalPage(): string {
  const name = esc(BRAND.productName);
  return layout(
    `Mentions légales — ${BRAND.productName}`,
    `<main>
<p><a href="/">← ${name}</a></p>
<h1>Mentions légales</h1>
<h2>Éditeur</h2>
<p>[NOM ET PRÉNOM OU RAISON SOCIALE], [STATUT, ex. entrepreneur individuel], [ADRESSE], SIRET [NUMÉRO].<br>
Directeur de la publication : [NOM]. Contact : <a href="mailto:${BRAND.contactEmail}">${esc(BRAND.contactEmail)}</a></p>
<h2>Hébergement</h2>
<p>[NOM DE L'HÉBERGEUR], [ADRESSE DE L'HÉBERGEUR].</p>
<h2>Démonstrations</h2>
<p>Les boutiques présentées en démonstration (La Cave de Marthe, L'Épicerie de Lucien, Librairie Les Mots Passants), leurs produits, auteurs et producteurs sont fictifs.</p>

<h1>Confidentialité</h1>
<h2>Ce qui est collecté</h2>
<p>Pour une mise de côté : le prénom et le numéro de téléphone du client, transmis au commerçant pour préparer le retrait. Ils sont effacés automatiquement 30 jours après la date de retrait. Les recherches (pour qui, occasion, budget, précisions) sont conservées sans donnée d'identification pour améliorer les suggestions.</p>
<h2>Intelligence artificielle</h2>
<p>Pour choisir les idées, la demande du client (sans prénom ni téléphone) et la liste des produits du commerçant sont transmises à Anthropic, fournisseur du modèle Claude, aux États-Unis.</p>
<h2>Cookies</h2>
<p>Aucun cookie ni traceur publicitaire.</p>
<h2>Vos droits</h2>
<p>Accès, rectification, effacement : écrivez à <a href="mailto:${BRAND.contactEmail}">${esc(BRAND.contactEmail)}</a>. Vous pouvez aussi saisir la CNIL.</p>
</main>`,
    `<style>
body{margin:0;background:#fff;color:#1C1B19;font:16px/1.6 Inter,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:48px 20px 80px}
h1{font-family:'Bricolage Grotesque',sans-serif;font-size:36px;letter-spacing:-.02em;margin:40px 0 8px}
h2{font-size:18px;margin:28px 0 6px}
p{margin:0 0 8px;color:#3d3a36}
a{color:#24533F}
</style>`,
  );
}
