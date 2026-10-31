import type { MiddlewareHandler } from "hono";

/**
 * Limite simple par adresse IP (fenêtre fixe, en mémoire, une seule instance).
 * Protège surtout l'appel au modèle : la démo est publique.
 */
export function rateLimit({ max, windowMs }: { max: number; windowMs: number }): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const now = Date.now();
    // Derrière le proxy de l'hébergeur, l'IP du client est la première de X-Forwarded-For.
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    if (++entry.count > max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: "Trop de demandes, réessayez dans quelques minutes." }, 429);
    }
    await next();
  };
}
