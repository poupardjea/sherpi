import type { OpeningHours, PickupDay } from "./types.ts";

const TZ = "Europe/Paris";

/** Date et heure courantes à Paris, quel que soit le fuseau du serveur. */
export function parisNow(now = new Date()): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function toMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(d);
  const rest = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${rest}`;
}

// On laisse une heure au commerçant avant la fermeture pour le dernier retrait.
const PICKUP_MARGIN_MIN = 60;

function pickupUntil(opening: OpeningHours, date: string): number | null {
  const hours = opening[weekday(date)];
  return hours ? toMinutes(hours.close) - PICKUP_MARGIN_MIN : null;
}

/** Libellés d'un jour de retrait donné (null si la boutique est fermée ce jour-là). */
export function pickupDay(opening: OpeningHours, date: string): PickupDay | null {
  const until = pickupUntil(opening, date);
  return until == null ? null : { date, label: dayLabel(date), until: `avant ${formatHour(until)}` };
}

/** Prochains jours de retrait possibles (jours ouverts), aujourd'hui compris s'il est encore temps. */
export function pickupDays(opening: OpeningHours, count = 6, now = new Date()): PickupDay[] {
  const { date: today, minutes } = parisNow(now);
  const days: PickupDay[] = [];
  for (let i = 0; i < 14 && days.length < count; i++) {
    const day = pickupDay(opening, addDays(today, i));
    if (!day) continue;
    if (i === 0) {
      if (minutes >= (pickupUntil(opening, today) ?? 0)) continue;
      day.label = "Aujourd'hui";
    }
    days.push(day);
  }
  return days;
}

export function closesToday(opening: OpeningHours, now = new Date()): string | null {
  const { date, minutes } = parisNow(now);
  const hours = opening[weekday(date)];
  if (!hours || minutes < toMinutes(hours.open) || minutes >= toMinutes(hours.close)) return null;
  return formatHour(toMinutes(hours.close));
}
