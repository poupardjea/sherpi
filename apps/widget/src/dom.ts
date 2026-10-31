type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | ((e: Event) => void);

/**
 * Petit utilitaire de création d'éléments. Les textes passent toujours par des
 * nœuds texte : aucune donnée (mot du commerçant, saisie client) n'est injectée en HTML.
 */
export function h(tag: string, attrs: Record<string, AttrValue> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "class") el.className = String(value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]) {
  for (const c of children) {
    if (c == null || c === false) continue;
    parent.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
}

/** Icônes statiques (balisage écrit dans ce dépôt, jamais issu de données). */
export function icon(markup: string): Node {
  const t = document.createElement("template");
  t.innerHTML = markup;
  return t.content.firstElementChild ?? document.createTextNode("");
}
