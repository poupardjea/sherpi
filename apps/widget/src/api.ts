import type {
  PublicReservation,
  PublicShopConfig,
  RecommendInput,
  RecommendResponse,
  ReservationInput,
} from "@app/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export function createApi(base: string, shop: string) {
  const url = (path: string) => `${base}/shops/${encodeURIComponent(shop)}${path}`;

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url(path), {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body.error ?? "Une erreur est survenue.", body.field);
    return body as T;
  }

  return {
    config: () => call<PublicShopConfig>("/config"),
    recommend: (input: RecommendInput) =>
      call<RecommendResponse>("/recommend", { method: "POST", body: JSON.stringify(input) }),
    reserve: (input: ReservationInput) =>
      call<PublicReservation>("/reservations", { method: "POST", body: JSON.stringify(input) }),
  };
}

export type Api = ReturnType<typeof createApi>;
