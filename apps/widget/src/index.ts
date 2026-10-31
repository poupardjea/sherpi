import { BRAND } from "@app/shared";
import { GiftAdvisor } from "./element.ts";

// <script src="https://<domaine>/w.js" data-shop="cave-de-marthe" [data-mode="page"] async></script>
// On peut aussi poser soi-même <conseiller-cadeau shop="…" api="https://<domaine>"> dans la page.
const script = document.currentScript as HTMLScriptElement | null;

if (!customElements.get(BRAND.elementTag)) customElements.define(BRAND.elementTag, GiftAdvisor);

function mount() {
  const shop = script?.dataset.shop;
  if (!shop || !script) return;
  const el = document.createElement(BRAND.elementTag);
  el.setAttribute("shop", shop);
  el.setAttribute("api", new URL(script.src, location.href).origin);
  if (script.dataset.mode === "page") el.setAttribute("mode", "page");
  document.body.append(el);
}

if (document.body) mount();
else document.addEventListener("DOMContentLoaded", mount);
