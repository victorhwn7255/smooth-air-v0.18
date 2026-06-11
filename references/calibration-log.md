# SmoothAir calibration log

This file is the project's scientific conscience. Every tuning session must
record: date, harness version, metrics, constant changes with rationale, and
open questions. Rerun: `npx tsx tools/validation/backtest.ts --json`.

---

## 2026-06-11 — Phase 4 initial calibration

**Harness:** `tools/validation/backtest.ts` @ Phase 4 (great-circle corridors —
route error is a known confound until Phase 5 bakes real tracks).
**Cases:** 2 incidents (SQ321 2024-05-20 LHR→SIN, QR017 2024-05-26 DOH→DUB),
13 smooth controls (Sep/Oct 2024, long-haul SQ routes + EU/Asia short-haul).
**Data:** Open-Meteo Historical Forecast API, GFS pressure-level variables.

### Run 1 — v1 constants (baseline)

| metric | value |
|---|---|
| incident hit-rate light+ | 2/2 |
| incident hit-rate mod+ | 0/2 |
| smooth false-alarm (mod+) | **11/13 (85%)** |
| S percentiles p50/p90/p99 | 0.126 / 0.456 / **1.000** |

Finding: S saturates on ordinary jet-stream crossings — live vws routinely
exceeds shearHi=0.013, and jetBoost then pins S at 1.0. v1's class boundaries
were tuned against demo-scale data, not archived reality.

### Run 2 — shearHi 0.013 → 0.020 (one knob)

| metric | value |
|---|---|
| incident hit-rate light+ | 2/2 |
| smooth false-alarm (mod+) | 9/13 (69%) |
| S percentiles | 0.094 / 0.304 / 0.773 |

Rationale: rescale the shear ramp so routine shear lands mid-range. Better,
but ordinary control flights still peak 0.3–0.5 — above the old moderate
boundary (0.22, widebody 0.264).

### Run 3 — classModerate 0.22 → 0.50 (one knob)

| metric | value |
|---|---|
| incident hit-rate light+ | 2/2 |
| incident hit-rate mod+ | 0/2 |
| smooth false-alarm (mod+) | **2/13 (15%)** ✓ target ≤ ~20% |
| S percentiles | 0.094 / 0.304 / 0.773 (scoring unchanged) |

Rationale: with the rescaled S, ordinary jet crossings peak 0.3–0.5; moderate
must start above that band. Choice modeled on run-2 per-zone peaks before
committing (predicted 2/13, observed 2/13). Asymmetric bias preserved: light
zones still flag freely (cheap "expect bumps"), moderate+ is now rare on
ordinary days (expensive false alarms suppressed).

### SQ321 case analysis (required)

**HIT at light, not moderate.** The pipeline shows a convective zone over
**the Bay of Bengal** (S≈0.26, mechanism convection) plus a Malacca Strait
convective zone for the flight window — the right mechanism in an adjacent
expected region, at light intensity. The encounter region (Irrawaddy basin)
itself did not produce the peak. Plausible contributors: (a) great-circle
corridor vs the flight's actual track shifts which boxes are sampled;
(b) GFS-archived CAPE/precip at the encounter hour understates the
fast-developing convection that morning; (c) probability floor caps Sconv at
0.76×pf. Verdict: signal present, magnitude conservative — acceptable for a
comfort briefing; revisit after Phase 5 baked corridors.

### Turbli comparison — NEEDS-HUMAN

turbli.com returns HTTP 403 to automated clients; per project rules it must
be eyeballed, not scraped. **Instructions for the human:** open
https://turbli.com, query 3–5 of: SQ345 (ZRH→SIN), SQ346, SQ322 (SIN→LHR),
QR017 (DOH→DUB) for tomorrow's date; run the same flights in SmoothAir
(`npm run dev`); record below, per flight: (1) do Turbli's rough segments
fall in the same regions as SmoothAir zones? (2) is Turbli's severity within
one class of ours? Transcribe conclusions only — no copied text or screenshots.

| flight | date | zone-location agreement | severity agreement | notes |
|---|---|---|---|---|
| _(pending)_ | | | | |

### Open questions

1. Both remaining mod+ "false alarms" are saturated subtropical-jet maxima
   over the Hindu Kush / Central Asia (S 0.96–1.00) on ZRH⇄SIN controls.
   Were those days genuinely smooth, or is "no reported event" survivor bias?
   Needs Turbli/PIREP cross-check before tuning further.
2. Incident mod+ hit-rate is 0/2 — both incidents peak below the new
   moderate boundary in the expected regions. If Phase 5 baked corridors
   don't lift this, consider a convective-specific boundary instead of
   raising global sensitivity.
3. p99=0.773 still implies occasional severe grades on ordinary days
   (~2/13 controls graded "A rough one"). Asymmetric target accepts this;
   monitor user feedback (Phase 6).
