import { describe, expect, it } from "vitest";
import { closesToday, pickupDays } from "./pickup.ts";
import type { OpeningHours } from "./types.ts";

// Mar.–sam. 10 h–20 h, dim. 10 h–13 h, fermé le lundi.
const opening: OpeningHours = {
  0: { open: "10:00", close: "13:00" },
  2: { open: "10:00", close: "20:00" },
  3: { open: "10:00", close: "20:00" },
  4: { open: "10:00", close: "20:00" },
  5: { open: "10:00", close: "20:00" },
  6: { open: "10:00", close: "20:00" },
};

describe("jours de retrait", () => {
  it("saute le lundi et propose aujourd'hui s'il est encore temps", () => {
    // Samedi 19 décembre 2026, 15 h à Paris.
    const days = pickupDays(opening, 4, new Date("2026-12-19T14:00:00Z"));
    expect(days.map((d) => d.date)).toEqual(["2026-12-19", "2026-12-20", "2026-12-22", "2026-12-23"]);
    expect(days[0]?.label).toBe("Aujourd'hui");
    expect(days[1]).toMatchObject({ label: "Dim. 20 déc.", until: "avant 12 h" });
    expect(days[2]?.until).toBe("avant 19 h");
  });

  it("ne propose plus aujourd'hui après l'heure limite", () => {
    const days = pickupDays(opening, 1, new Date("2026-12-19T18:30:00Z")); // 19 h 30 à Paris
    expect(days[0]?.date).toBe("2026-12-20");
  });

  it("heure de fermeture du jour", () => {
    expect(closesToday(opening, new Date("2026-12-19T14:00:00Z"))).toBe("20 h");
    expect(closesToday(opening, new Date("2026-12-21T14:00:00Z"))).toBeNull(); // lundi
  });
});
