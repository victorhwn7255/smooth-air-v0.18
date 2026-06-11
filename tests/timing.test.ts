import { describe, expect, it } from "vitest";
import type { FlightEntry } from "@/lib/types";
import { nextDeparture, utcFromLocal } from "@/lib/pipeline/timing";

const TZ = "Europe/Zurich";

describe("utcFromLocal", () => {
  it("Zurich 11:40 in June (CEST) → 09:40Z", () => {
    expect(utcFromLocal("2026-06-15", "11:40", TZ)).toBe(
      Date.UTC(2026, 5, 15, 9, 40),
    );
  });

  it("Zurich 11:40 in January (CET) → 10:40Z", () => {
    expect(utcFromLocal("2026-01-15", "11:40", TZ)).toBe(
      Date.UTC(2026, 0, 15, 10, 40),
    );
  });
});

describe("nextDeparture", () => {
  const daily: FlightEntry = {
    from: "ZRH",
    to: "SIN",
    depLocal: "11:40",
    durationMin: 760,
    aircraft: "777-300ER",
    widebody: true,
    operatingDays: [1, 2, 3, 4, 5, 6, 7],
    verified: true,
  };

  it("before today's departure (08:00 local) → today", () => {
    // 2026-06-15 is a Monday
    const now = utcFromLocal("2026-06-15", "08:00", TZ);
    expect(nextDeparture(daily, TZ, now)).toBe("2026-06-15");
  });

  it("after today's departure (13:00 local) → tomorrow", () => {
    const now = utcFromLocal("2026-06-15", "13:00", TZ);
    expect(nextDeparture(daily, TZ, now)).toBe("2026-06-16");
  });

  it("operatingDays [2,4,6] queried Saturday afternoon → following Tuesday", () => {
    const tueThuSat: FlightEntry = { ...daily, operatingDays: [2, 4, 6] };
    // 2026-06-20 is a Saturday; 15:00 is past the 11:40 departure
    const now = utcFromLocal("2026-06-20", "15:00", TZ);
    expect(nextDeparture(tueThuSat, TZ, now)).toBe("2026-06-23");
  });

  it("flight without operatingDays defaults to daily", () => {
    const noDays: FlightEntry = { ...daily };
    delete noDays.operatingDays;
    const now = utcFromLocal("2026-06-15", "13:00", TZ);
    expect(nextDeparture(noDays, TZ, now)).toBe("2026-06-16");
  });
});
