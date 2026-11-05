import { BRAND, formatPrice, type Shop, type VerticalId } from "@app/shared";
import type { Reservation } from "./store.ts";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

export function layout(title: string, body: string, extraHead = ""): string {
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

// Contenu du faux site de commerçant, par métier.
const DEMO_SITES: Record<VerticalId, { subtitle: string; nav: string[]; kicker: string; title: string; text: string; cta: string }> = {
  caviste: {
    subtitle: "vins de vignerons",
    nav: ["Nos vins", "Champagnes", "Spiritueux", "Dégustations", "Nous trouver"],
    kicker: "Caviste indépendant depuis 2009",
    title: "Des vins de vignerons, choisis bouteille par bouteille.",
    text: "Plus de 400 références en boutique, {address}. Retrait sur place, conseils à toute heure.",
    cta: "Voir la sélection de Noël",
  },
  epicerie: {
    subtitle: "épicerie fine",
    nav: ["Sucré", "Salé", "Thés et cafés", "Coffrets", "Nous trouver"],
    kicker: "Épicerie fine depuis 2014",
    title: "Des produits de petits producteurs, goûtés un par un.",
    text: "Plus de 600 références en boutique, {address}. Coffrets composés sur place, retrait au comptoir.",
    cta: "Voir les coffrets de Noël",
  },
  librairie: {
    subtitle: "librairie indépendante",
    nav: ["Romans", "Polars", "BD", "Jeunesse", "Beaux livres", "Nous trouver"],
    kicker: "Librairie indépendante depuis 1998",
    title: "Des livres lus et choisis par toute l'équipe.",
    text: "Plus de 15 000 livres en rayon, {address}. Commandes et retrait en boutique.",
    cta: "Voir nos coups de cœur de Noël",
  },
};

/** Faux site de commerçant pour la démo publique, avec la bulle du widget. */
export function demoSite(shop: Shop): string {
  const site = DEMO_SITES[shop.vertical] ?? DEMO_SITES.caviste;
  const tile = `<div class="tile"></div>`;
  return layout(
    `${shop.name} — ${site.subtitle}`,
    `<div class="demo-note">Site de démonstration : la boutique et ses produits sont fictifs. Ouvrez le conseiller en bas à droite.</div>
<header>
  <div class="logo">${esc(shop.name)}</div>
  <nav>${site.nav.map((n) => `<a href="#">${esc(n)}</a>`).join("")}</nav>
</header>
<main>
  <section class="hero">
    <div class="copy">
      <div class="kicker">${esc(site.kicker)}</div>
      <h1>${esc(site.title)}</h1>
      <p>${esc(site.text).replace("{address}", esc(shop.address))}</p>
      <div class="ctas"><a class="btn dark" href="#">${esc(site.cta)}</a><a class="btn" href="#">Horaires et accès</a></div>
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
.kicker{font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${esc(shop.accent_secondary)}}
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
    ? `<h1>C'est annulé.</h1><p>${esc(shop.merchant_first_name)} remet « ${esc(r.product_name)} » en rayon. À bientôt !</p>`
    : `<h1>Votre mise de côté ${esc(r.code)}</h1>
<p><strong>${esc(r.product_name)}</strong> — ${formatPrice(r.product_price)}<br>Statut : ${STATUS_TEXT[r.status]}</p>
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
