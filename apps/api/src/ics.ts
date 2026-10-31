import type { Shop } from "@app/shared";
import type { Reservation } from "./store.ts";

function escapeText(s: string): string {
  return s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
}

/** Événement « journée entière » le jour du retrait (évite les soucis de fuseau horaire). */
export function reservationIcs(r: Reservation, shop: Shop, until: string): string {
  const day = r.pickup_date.replaceAll("-", "");
  const next = new Date(`${r.pickup_date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//conseiller-cadeau//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${r.id}@conseiller-cadeau`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replaceAll("-", "")}`,
    `SUMMARY:${escapeText(`Retrait ${r.code} — ${shop.name}`)}`,
    `LOCATION:${escapeText(shop.address)}`,
    `DESCRIPTION:${escapeText(`${r.product_name}, ${until}. N° de retrait ${r.code}. Paiement en boutique.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
