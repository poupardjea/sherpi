import { BRAND, type Shop } from "@app/shared";
import type { Reservation } from "./store.ts";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

function layout(title: string, body: string, extraHead = ""): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${FONTS}
${extraHead}
</head>
<body>
${body}
</body>
</html>`;
}

function widgetScript(shop: Shop, mode: "bubble" | "page"): string {
  return `<script src="/w.js" data-shop="${esc(shop.slug)}"${mode === "page" ? ' data-mode="page"' : ""} async></script>`;
}

/** Page plein écran ouverte par le QR code : https://<domaine>/<shop-slug> */
export function hostedPage(shop: Shop): string {
  return layout(
    `${shop.name} — une idée cadeau`,
    widgetScript(shop, "page"),
    `<meta name="theme-color" content="${esc(shop.accent_primary)}">
<style>html,body{margin:0;min-height:100%;background:#fff}</style>`,
  );
}

/** Faux site de caviste pour la démo publique, avec la bulle du widget. */
export function demoSite(shop: Shop): string {
  const tile = `<div class="tile"></div>`;
  return layout(
    `${shop.name} — vins de vignerons`,
    `<div class="demo-note">Site de démonstration : la cave et ses vins sont fictifs. Ouvrez le conseiller en bas à droite.</div>
<header>
  <div class="logo">${esc(shop.name)}</div>
  <nav><a href="#">Nos vins</a><a href="#">Champagnes</a><a href="#">Spiritueux</a><a href="#">Dégustations</a><a href="#">Nous trouver</a></nav>
</header>
<main>
  <section class="hero">
    <div class="copy">
      <div class="kicker">Caviste indépendant depuis 2009</div>
      <h1>Des vins de vignerons, choisis bouteille par bouteille.</h1>
      <p>Plus de 400 références en boutique, ${esc(shop.address)}. Retrait sur place, conseils à toute heure.</p>
      <div class="ctas"><a class="btn dark" href="#">Voir la sélection de Noël</a><a class="btn" href="#">Horaires et accès</a></div>
    </div>
    <div class="photo">[PHOTO DE LA BOUTIQUE]</div>
  </section>
  <section class="tiles">${tile.repeat(4)}</section>
</main>
${widgetScript(shop, "bubble")}`,
    `<style>
body{margin:0;background:#fff;color:#1C1B19;font-family:Inter,system-ui,sans-serif}
a{color:#1C1B19}
.demo-note{background:#1C1B19;color:#fff;font-size:13px;text-align:center;padding:8px 16px}
header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 64px;border-bottom:1px solid #E7E3DC;flex-wrap:wrap}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:26px;letter-spacing:-.5px}
nav{display:flex;gap:32px;font-size:15px;flex-wrap:wrap}nav a{text-decoration:none}
.hero{display:flex;gap:48px;padding:56px 64px 40px}
.copy{flex:1;display:flex;flex-direction:column;gap:20px;max-width:560px}
.kicker{font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#8E2C3A}
h1{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:56px;line-height:1.02;letter-spacing:-1.5px}
.copy p{margin:0;font-size:18px;line-height:1.55;color:#5C5852}
.ctas{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;height:48px;padding:0 22px;border-radius:999px;border:1px solid #CFC9BF;text-decoration:none;font-weight:600;font-size:15px}
.btn.dark{background:#1C1B19;color:#fff;border-color:#1C1B19}
.photo{flex:1;min-height:360px;border-radius:20px;background:#EFEBE4;display:flex;align-items:center;justify-content:center;color:#6B665F;font-size:14px}
.tiles{padding:0 64px 64px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.tile{height:220px;border-radius:16px;background:#F5F3EF}
@media (max-width:820px){
  header,.hero{padding-left:16px;padding-right:16px}.hero{flex-direction:column}
  h1{font-size:38px}.tiles{padding:0 16px 96px;grid-template-columns:repeat(2,minmax(0,1fr))}
  nav{gap:16px}
}
</style>`,
  );
}

const STATUS_TEXT: Record<Reservation["status"], string> = {
  confirmed: "confirmée",
  ready: "prête en boutique",
  picked_up: "retirée",
  cancelled: "annulée",
};

/** Page du lien « Modifier ou annuler » (fonctionne sans JavaScript). */
export function cancelPage(shop: Shop, r: Reservation, actionUrl: string, justCancelled = false): string {
  const canCancel = r.status === "confirmed" || r.status === "ready";
  const body = justCancelled
    ? `<h1>C'est annulé.</h1><p>${esc(shop.merchant_first_name)} remet la bouteille en rayon. À bientôt !</p>`
    : `<h1>Votre mise de côté ${esc(r.code)}</h1>
<p><strong>${esc(r.product_name)}</strong> — ${r.product_price} €<br>Statut : ${STATUS_TEXT[r.status]}</p>
${
  canCancel
    ? `<form method="post" action="${esc(actionUrl)}"><button type="submit">Annuler la mise de côté</button></form>
<p class="small">Pour changer de jour, annulez puis refaites une demande, ou appelez la boutique.</p>`
    : ""
}`;
  return layout(
    `${shop.name} — mise de côté ${r.code}`,
    `<main>${body}<p class="small">${esc(shop.name)} · ${esc(shop.address)}</p></main>`,
    `<style>
body{margin:0;background:#F5F3EF;color:#1C1B19;font-family:Inter,system-ui,sans-serif}
main{max-width:420px;margin:0 auto;padding:48px 20px;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-size:30px;letter-spacing:-.6px}
p{margin:0;font-size:15px;line-height:1.5}.small{font-size:13px;color:#5C5852}
button{height:50px;padding:0 24px;border:0;border-radius:999px;background:${esc(shop.accent_secondary)};color:#fff;font:600 15px Inter,sans-serif;cursor:pointer;min-width:100%}
</style>`,
  );
}

export function notFoundPage(): string {
  return layout(BRAND.productName, `<main style="font-family:Inter,sans-serif;padding:48px 20px">Page introuvable.</main>`);
}
