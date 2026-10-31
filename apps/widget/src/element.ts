import {
  BUDGETS,
  type PublicReservation,
  type PublicShopConfig,
  type Recommendation,
  type RecommendInput,
  type RecommendResponse,
} from "@app/shared";
import { ApiError, createApi, type Api } from "./api.ts";
import { append, h, icon } from "./dom.ts";
import { ICONS } from "./icons.ts";
import { CSS } from "./styles.ts";

const RECIPIENTS = ["Mon beau-père", "Ma mère", "Un ami", "Un collègue", "Pour moi"];
const OCCASIONS = ["Noël", "Anniversaire", "Dîner chez des amis", "Merci"];
const EVIN = "L'abus d'alcool est dangereux pour la santé, à consommer avec modération.";

type View = "form" | "loading" | "results" | "reserve" | "confirm" | "error";

interface ReserveForm {
  first_name: string;
  phone: string;
  pickup_date: string;
  gift_wrap: boolean;
}

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;500;600&display=swap";

// Les polices déclarées dans un Shadow DOM ne sont pas chargées : on les ajoute au document.
function loadFonts() {
  if (document.querySelector(`link[href="${FONTS_URL}"]`)) return;
  document.head.append(h("link", { rel: "stylesheet", href: FONTS_URL }));
}

function shortRecipient(r: string): string {
  const s = r.replace(/^(mon|ma|mes|un|une)\s+/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalizeList(items: string[]): string {
  const s = items.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class GiftAdvisor extends HTMLElement {
  private shadow = this.attachShadow({ mode: "open" });
  private api!: Api;
  private config: PublicShopConfig | null = null;

  private open = false;
  private view: View = "form";
  private query: RecommendInput = {};
  private results: RecommendResponse | null = null;
  private selected: Recommendation | null = null;
  private reservation: PublicReservation | null = null;
  private form: ReserveForm = { first_name: "", phone: "", pickup_date: "", gift_wrap: false };
  private error: { message: string; field?: string } | null = null;
  private busy = false;
  /** Élément à focaliser après le prochain rendu. */
  private focusKey: string | null = null;

  private get isPage() {
    return this.getAttribute("mode") === "page";
  }

  connectedCallback() {
    const shop = this.getAttribute("shop");
    const base = this.getAttribute("api") ?? location.origin;
    if (!shop) return console.error("[conseiller] attribut « shop » manquant");
    this.api = createApi(base.replace(/\/$/, ""), shop);
    loadFonts();
    this.shadow.innerHTML = "";
    this.shadow.append(h("style", {}, CSS));
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open && !this.isPage) this.toggle(false);
    });
    this.api
      .config()
      .then((config) => {
        this.config = config;
        this.style.setProperty("--accent", config.accent_primary);
        this.style.setProperty("--accent2", config.accent_secondary);
        this.render();
      })
      .catch((err) => console.error("[conseiller] configuration indisponible", err));
  }

  // ————— Actions —————

  private toggle(open: boolean) {
    this.open = open;
    this.focusKey = open ? "panel-title" : "launcher";
    this.render();
  }

  private setView(view: View, focusKey: string | null = "view-title") {
    this.view = view;
    this.focusKey = focusKey;
    this.render();
  }

  private async search(patch: Partial<RecommendInput> = {}) {
    this.query = { ...this.query, ...patch };
    this.setView("loading", null);
    try {
      this.results = await this.api.recommend(this.query);
      this.setView("results");
    } catch {
      this.error = { message: "Je n'arrive pas à joindre la cave pour l'instant. Réessayez dans un instant." };
      this.setView("error");
    }
  }

  private startReservation(p: Recommendation) {
    this.selected = p;
    this.error = null;
    this.form.pickup_date ||= this.config?.pickup_days[0]?.date ?? "";
    this.setView("reserve");
  }

  private async submitReservation(e: Event) {
    e.preventDefault();
    if (!this.selected || this.busy) return;
    const missing = !this.form.first_name.trim() ? "first_name" : !this.form.phone.trim() ? "phone" : null;
    if (missing) {
      this.error = { message: missing === "first_name" ? "Indiquez votre prénom." : "Indiquez votre téléphone.", field: missing };
      this.focusKey = missing;
      return this.render();
    }
    this.busy = true;
    this.error = null;
    this.render();
    try {
      this.reservation = await this.api.reserve({ product_id: this.selected.id, ...this.form });
      this.busy = false;
      this.setView("confirm");
    } catch (err) {
      this.busy = false;
      const field = err instanceof ApiError ? err.field : undefined;
      this.error = {
        message:
          field === "phone"
            ? "Ce numéro de téléphone ne semble pas valide."
            : err instanceof ApiError
              ? err.message
              : "La mise de côté n'a pas abouti. Réessayez.",
        field,
      };
      this.focusKey = field ?? "submit";
      this.render();
    }
  }

  private restart() {
    this.query = {};
    this.results = null;
    this.selected = null;
    this.reservation = null;
    this.error = null;
    this.setView("form", this.isPage ? "view-title" : "panel-title");
  }

  private back() {
    if (this.view === "confirm") return this.restart();
    const previous: Partial<Record<View, View>> = { results: "form", reserve: "results", error: "form" };
    this.setView(previous[this.view] ?? "form");
  }

  // ————— Rendu —————

  private render() {
    if (!this.config) return;
    const root = h("div", { class: "root" });
    if (this.isPage) root.append(this.renderPage());
    else append(root, this.open ? this.renderPanel() : [this.renderLauncher()]);
    this.shadow.querySelector(".root")?.remove();
    this.shadow.append(root);
    if (this.focusKey) {
      (root.querySelector(`[data-focus="${this.focusKey}"]`) as HTMLElement | null)?.focus();
      this.focusKey = null;
    }
  }

  private renderLauncher() {
    return h(
      "button",
      { class: "launcher", "data-focus": "launcher", "aria-haspopup": "dialog", onclick: () => this.toggle(true) },
      icon(ICONS.gift),
      "Une idée cadeau ?",
    );
  }

  private renderPanel(): Node[] {
    const c = this.config!;
    const onForm = this.view === "form";
    const head = h(
      "div",
      { class: "head" },
      onForm
        ? h("div", { class: "avatar", "aria-hidden": "true" }, c.merchant_first_name.charAt(0))
        : h("button", { class: "icon-btn", "aria-label": "Retour", onclick: () => this.back() }, icon(ICONS.back)),
      h(
        "div",
        { class: "head-text" },
        h("h2", { class: "head-title", id: "panel-title", tabindex: "-1", "data-focus": "panel-title" }, `Le conseiller de ${c.merchant_first_name}`),
        h("div", { class: "head-sub" }, onForm ? "Idées cadeaux dans notre cave" : this.summary()),
      ),
      h("button", { class: "icon-btn", "aria-label": "Fermer le conseiller", onclick: () => this.toggle(false) }, icon(ICONS.close)),
    );
    const body = h(
      "div",
      { class: `body${onForm ? "" : " tight"}${this.view === "confirm" ? " is-surface" : ""}`, "aria-live": "polite" },
    );
    append(body, this.renderView());
    const foot = h("div", { class: "foot" });
    if (onForm) foot.append(this.renderAsk());
    foot.append(this.renderLegal());
    return [
      h("div", { class: "backdrop", onclick: () => this.toggle(false) }),
      h("div", { class: "panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "panel-title" }, head, body, foot),
    ];
  }

  private renderPage(): Node {
    const c = this.config!;
    if (this.view === "form") {
      return h(
        "div",
        { class: "page" },
        h(
          "div",
          { class: "hero" },
          h(
            "div",
            { class: "hero-top" },
            h("div", { class: "hero-shop" }, c.name),
            c.closes_today && h("div", { class: "hero-hours" }, `Ouvert jusqu'à ${c.closes_today}`),
          ),
          h("h1", { tabindex: "-1", "data-focus": "view-title" }, "Une idée cadeau ? Je vous guide."),
          h(
            "p",
            {},
            "Décrivez la personne. Je vous propose trois idées de la cave, et vous venez les chercher au comptoir.",
          ),
        ),
        h("div", { class: "page-body" }, ...this.renderPageForm()),
        this.renderLegal(),
      );
    }
    return h(
      "div",
      { class: `page${this.view === "confirm" ? " is-surface" : ""}` },
      this.view === "confirm"
        ? null
        : h(
            "div",
            { class: "head light" },
            h("button", { class: "icon-btn", "aria-label": "Retour", onclick: () => this.back() }, icon(ICONS.back)),
            h(
              "div",
              { class: "head-text" },
              h("div", { class: "head-title" }, `Le conseiller de ${c.merchant_first_name}`),
              h("div", { class: "head-sub" }, this.summary()),
            ),
          ),
      h("div", { class: "body tight", "aria-live": "polite" }, ...this.renderView()),
      this.renderLegal(),
    );
  }

  private renderLegal() {
    const c = this.config!;
    return h(
      "div",
      { class: "legal" },
      c.sells_alcohol && h("div", {}, EVIN),
      h("div", {}, `Assistant IA · conseils rédigés par ${c.merchant_first_name} · propulsé par ${c.product_name}`),
    );
  }

  private summary(): string {
    const q = this.query;
    const budget = BUDGETS.find((b) => b.id === q.budget)?.short ?? (q.max_price ? `${q.max_price} € max` : null);
    const parts = [q.recipient && shortRecipient(q.recipient), q.occasion, q.category === "coffret" && "En coffret", budget];
    return parts.filter(Boolean).join(" · ") || "Vos idées cadeaux";
  }

  private renderView(): Node[] {
    switch (this.view) {
      case "form":
        return this.renderBubbleForm();
      case "loading":
        return [this.userBubble(), h("div", { class: "bubble dots", role: "status" }, "Je regarde dans la cave")].filter(
          Boolean,
        ) as Node[];
      case "results":
        return this.renderResults();
      case "reserve":
        return [this.renderReserve()];
      case "confirm":
        return this.renderConfirm();
      case "error":
        return [
          h("div", { class: "bubble", role: "alert" }, this.error?.message ?? ""),
          h("button", { class: "btn ghost", "data-focus": "view-title", onclick: () => this.search() }, "Réessayer"),
        ];
    }
  }

  private userBubble(): Node | null {
    return this.query.text ? h("div", { class: "bubble me" }, this.query.text) : null;
  }

  // Écran 1 : pour qui / occasion / budget (widget).
  private renderBubbleForm(): Node[] {
    const choice = (label: string, options: string[], key: "recipient" | "occasion") =>
      h(
        "div",
        { class: "group", role: "group", "aria-label": label },
        h("div", { class: "label", "aria-hidden": "true" }, label),
        h(
          "div",
          { class: "chips" },
          ...options.map((o) =>
            h(
              "button",
              {
                class: "chip",
                "aria-pressed": String(this.query[key] === o),
                "data-focus": `${key}-${o}`,
                onclick: () => {
                  this.query[key] = this.query[key] === o ? undefined : o;
                  this.focusKey = `${key}-${o}`;
                  this.render();
                },
              },
              o,
            ),
          ),
        ),
      );
    return [
      h(
        "div",
        { class: "bubble" },
        `Bonjour ! Dites-moi pour qui, et je vous propose trois idées que j'aime, en stock aujourd'hui.`,
      ),
      choice("C'est pour qui ?", RECIPIENTS, "recipient"),
      choice("L'occasion", OCCASIONS, "occasion"),
      h(
        "div",
        { class: "group", role: "group", "aria-label": "Budget" },
        h("div", { class: "label", "aria-hidden": "true" }, "Budget"),
        h(
          "div",
          { class: "budgets" },
          ...BUDGETS.map((b) =>
            h(
              "button",
              {
                class: "budget",
                "aria-pressed": String(this.query.budget === b.id),
                "data-focus": `budget-${b.id}`,
                onclick: () => {
                  this.query.budget = this.query.budget === b.id ? undefined : b.id;
                  this.query.max_price = undefined;
                  this.focusKey = `budget-${b.id}`;
                  this.render();
                },
              },
              b.label,
            ),
          ),
        ),
      ),
    ];
  }

  private renderAsk(): Node {
    const input = h("input", {
      id: "precision",
      type: "text",
      maxlength: "500",
      placeholder: "Ses goûts, une précision…",
      autocomplete: "off",
      value: this.query.text ?? "",
      oninput: (e) => (this.query.text = (e.target as HTMLInputElement).value),
    }) as HTMLInputElement;
    return h(
      "form",
      { class: "ask", onsubmit: (e) => (e.preventDefault(), this.search({ text: input.value.trim() || undefined })) },
      h("label", { class: "sr", for: "precision" }, "Précisez ses goûts (facultatif)"),
      input,
      h("button", { class: "send", type: "submit", "aria-label": "Voir mes suggestions" }, icon(ICONS.send)),
    );
  }

  // Écran 2 : page hébergée (QR code), champ libre et idées de départ.
  private renderPageForm(): Node[] {
    const c = this.config!;
    const textarea = h("textarea", {
      id: "demande",
      maxlength: "500",
      placeholder: "Pour mon beau-père, il aime les rouges puissants, 30 € max",
      oninput: (e) => (this.query.text = (e.target as HTMLTextAreaElement).value),
    }) as HTMLTextAreaElement;
    textarea.value = this.query.text ?? "";
    const idea = (svg: string, label: string, patch: RecommendInput) =>
      h("button", { class: "idea", onclick: () => ((this.query = {}), this.search(patch)) }, icon(svg), label);
    return [
      h(
        "form",
        {
          class: "group",
          onsubmit: (e) => {
            e.preventDefault();
            this.query = { text: textarea.value.trim() || undefined };
            this.search();
          },
        },
        h("label", { class: "label", for: "demande" }, "Pour qui, et qu'est-ce qu'il ou elle aime ?"),
        textarea,
        h("button", { class: "btn primary", type: "submit" }, "Voir mes 3 suggestions"),
      ),
      h(
        "div",
        { class: "group" },
        h("div", { class: "label" }, "Ou partez d'une idée"),
        idea(ICONS.gift, "Un coffret à offrir, moins de 40 €", { category: "coffret", max_price: 40 }),
        idea(ICONS.glass, "Une bulle pour dire merci", { category: "effervescent", occasion: "Merci" }),
        idea(ICONS.star, `Les coups de cœur de ${c.merchant_first_name} ce mois-ci`, { favorites_only: true }),
      ),
      h("div", { class: "note" }, icon(ICONS.pin), `Retrait en boutique, ${c.address}. Rien à payer en ligne.`),
    ];
  }

  // Écran 3 : les recommandations.
  private renderResults(): Node[] {
    const r = this.results!;
    const n = r.products.length;
    const intro =
      n === 0
        ? "Je n'ai rien trouvé qui corresponde dans la sélection du moment."
        : n === 1
          ? "Voici mon idée, en rayon aujourd'hui :"
          : `Voici mes ${n === 2 ? "deux" : "trois"} idées, toutes en rayon aujourd'hui :`;
    const toggleChip = (label: string, pressed: boolean, patch: Partial<RecommendInput>) =>
      h("button", { class: "chip", "aria-pressed": String(pressed), onclick: () => this.search(patch) }, label);
    const widenLabel = r.widen?.budget
      ? `Élargir à ${BUDGETS.find((b) => b.id === r.widen?.budget)?.short}`
      : r.widen?.max_price
        ? `Élargir à ${r.widen.max_price} €`
        : null;
    return [
      this.userBubble(),
      h("p", { class: "bubble", tabindex: "-1", "data-focus": "view-title" }, intro),
      ...r.products.map((p) => this.renderCard(p)),
      h(
        "div",
        { class: "chips" },
        widenLabel && h("button", { class: "chip", onclick: () => this.search(r.widen ?? {}) }, widenLabel),
        toggleChip("Plus léger", Boolean(this.query.lighter), { lighter: !this.query.lighter }),
        h(
          "button",
          {
            class: "chip",
            onclick: () => {
              this.query.max_price = undefined;
              this.setView("form", this.isPage ? "view-title" : `budget-${this.query.budget ?? BUDGETS[0]!.id}`);
            },
          },
          "Un autre budget",
        ),
        toggleChip("En coffret", this.query.category === "coffret", {
          category: this.query.category === "coffret" ? undefined : "coffret",
        }),
      ),
    ].filter(Boolean) as Node[];
  }

  private renderThumb(p: { color?: string }, small = false) {
    return h("div", { class: "thumb" }, icon(p.color === "coffret" ? ICONS.gift : small ? ICONS.bottle.replace('width="26" height="60"', 'width="22" height="52"') : ICONS.bottle));
  }

  private renderCard(p: Recommendation): Node {
    const meta = [p.appellation, p.grapes.length ? capitalizeList(p.grapes) : null].filter(Boolean).join(" · ");
    return h(
      "article",
      { class: "card" },
      this.renderThumb(p),
      h(
        "div",
        { class: "card-main" },
        h("div", { class: "row" }, h("h3", { class: "name" }, p.name), h("div", { class: "price" }, `${p.price} €`)),
        h("div", { class: "meta" }, meta),
        p.merchant_note && h("div", { class: "quote" }, `« ${p.merchant_note} »`),
        h(
          "div",
          { class: "card-foot" },
          h("div", { class: "stock" }, `${p.stock} en stock`),
          h(
            "button",
            { class: "reserve", "aria-label": `Mettre de côté : ${p.name}`, onclick: () => this.startReservation(p) },
            "Mettre de côté",
          ),
        ),
      ),
    );
  }

  // Étape 4 : formulaire de mise de côté.
  private renderReserve(): Node {
    const c = this.config!;
    const p = this.selected!;
    const err = this.error;
    const bind = (key: "first_name" | "phone") => (e: Event) => (this.form[key] = (e.target as HTMLInputElement).value);
    const field = (key: "first_name" | "phone", label: string, attrs: Record<string, string>) =>
      h(
        "div",
        { class: "field" },
        h("label", { class: "label", for: `f-${key}` }, label),
        h("input", {
          id: `f-${key}`,
          name: key,
          value: this.form[key],
          required: true,
          "aria-invalid": err?.field === key ? "true" : null,
          "aria-describedby": err?.field === key ? "f-error" : null,
          "data-focus": key,
          oninput: bind(key),
          ...attrs,
        }),
      );
    return h(
      "form",
      { class: "form", novalidate: true, onsubmit: (e) => this.submitReservation(e) },
      h("h2", { class: "title", tabindex: "-1", "data-focus": "view-title" }, "Mettre de côté"),
      h(
        "div",
        { class: "card" },
        this.renderThumb(p),
        h(
          "div",
          { class: "card-main" },
          h("div", { class: "row" }, h("div", { class: "name" }, p.name), h("div", { class: "price" }, `${p.price} €`)),
          h("div", { class: "meta" }, p.appellation),
        ),
      ),
      field("first_name", "Votre prénom", { type: "text", autocomplete: "given-name", maxlength: "40" }),
      field("phone", "Votre téléphone", { type: "tel", autocomplete: "tel", inputmode: "tel", maxlength: "25" }),
      h(
        "fieldset",
        { class: "group" },
        h("legend", { class: "label" }, "Jour de retrait"),
        h(
          "div",
          { class: "days" },
          ...c.pickup_days.map((d) =>
            h(
              "label",
              { class: "day" },
              h("input", {
                type: "radio",
                name: "pickup",
                value: d.date,
                checked: this.form.pickup_date === d.date,
                onchange: () => (this.form.pickup_date = d.date),
              }),
              h("span", { class: "day-label" }, d.label),
              h("span", { class: "day-until" }, d.until),
            ),
          ),
        ),
      ),
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          checked: this.form.gift_wrap,
          onchange: (e) => (this.form.gift_wrap = (e.target as HTMLInputElement).checked),
        }),
        "Emballage cadeau (offert)",
      ),
      err && h("div", { class: "error", id: "f-error", role: "alert" }, err.message),
      h(
        "button",
        { class: "btn primary", type: "submit", disabled: this.busy, "data-focus": "submit" },
        this.busy ? "Un instant…" : "Confirmer la mise de côté",
      ),
      h(
        "p",
        { class: "small" },
        "Paiement en boutique, rien à régler en ligne. Votre prénom et votre téléphone servent uniquement à préparer le retrait ; ils sont effacés 30 jours après.",
      ),
    );
  }

  // Écran 4 : confirmation.
  private renderConfirm(): Node[] {
    const r = this.reservation!;
    const p = this.selected;
    const unit = p?.color === "coffret" ? "1 coffret" : "1 bouteille";
    const fact = (label: string, value: string) => h("div", {}, h("dt", {}, label), h("dd", {}, value));
    return [
      h(
        "div",
        { class: "done" },
        h("div", { class: "done-icon" }, icon(ICONS.check)),
        h("h2", { tabindex: "-1", "data-focus": "view-title" }, `C'est noté, ${r.first_name} !`),
        h("p", {}, `${r.shop.merchant_first_name} vous le met de côté. Rien à payer d'ici là : vous réglez en boutique.`),
      ),
      h(
        "div",
        { class: "ticket" },
        h(
          "div",
          { class: "row", style: "align-items:center" },
          this.renderThumb(p ?? {}, true),
          h(
            "div",
            { class: "card-main" },
            h("div", { class: "name" }, r.product.name),
            h("div", { class: "meta" }, r.gift_wrap ? `${unit} · emballage cadeau offert` : unit),
          ),
          h("div", { class: "price" }, `${r.product.price} €`),
        ),
        h("div", { class: "sep" }),
        h(
          "dl",
          { class: "facts" },
          fact("Retrait", `${r.pickup.label}, ${r.pickup.until}`),
          fact("N° de retrait", r.code),
          fact("Paiement", "En boutique"),
          fact("Adresse", r.shop.address),
        ),
      ),
      h(
        "div",
        { class: "actions" },
        h("a", { class: "btn dark", href: r.ics_url, download: `retrait-${r.code}.ics` }, icon(ICONS.calendar), "Ajouter à mon agenda"),
        h("button", { class: "btn ghost", onclick: () => this.restart() }, "Trouver un autre cadeau"),
      ),
      h(
        "p",
        { class: "center" },
        "Un empêchement ? ",
        h("a", { href: r.cancel_url, target: "_blank", rel: "noopener" }, "Modifier ou annuler"),
      ),
    ];
  }
}
