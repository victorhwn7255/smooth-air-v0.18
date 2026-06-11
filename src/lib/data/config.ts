/**
 * All tuning constants for the SmoothAir pipeline, ported verbatim from
 * references/smoothair-v1.html CONFIG. Never inline these in pipeline code.
 */
export const config = {
  /** corridor sampling distance, km */
  sampleKm: 150,
  /** fallback ground speed for manual routes, km/h */
  cruiseKmh: 850,

  // severity ramps ............................................
  /** vertical wind shear ramp low end, s^-1 */
  shearLo: 0.003,
  /** vertical wind shear ramp high end, s^-1 */
  shearHi: 0.013,
  /** 250 hPa wind ramp low end, kt */
  jetLo: 60,
  /** 250 hPa wind ramp high end, kt */
  jetHi: 120,
  /** multiplier applied to S_shear per unit of S_jet, dimensionless */
  jetBoost: 0.5,
  /** CAPE ramp low end, J/kg */
  capeLo: 500,
  /** CAPE ramp high end, J/kg */
  capeHi: 3000,
  /** minimum precipitation-probability factor, fraction 0–1 */
  capeFloorProb: 0.3,
  /** class thresholds are multiplied by this for widebody aircraft */
  widebodyFactor: 1.2,

  // class boundaries on S (narrowbody baseline) — note S includes jetBoost,
  // so boundaries sit higher than raw-EDR convention; tuned in node tests
  /** S at or above this → light */
  classLight: 0.1,
  /** S at or above this → moderate */
  classModerate: 0.22,
  /** S at or above this → severe */
  classSevere: 0.75,
  /** waypoints of smooth gap allowed inside a zone run */
  zoneGapMerge: 1,

  // probability logistics (hand-anchored — see project notes)
  /** P(light+) = sigmoid(a + b·S) */
  pLight: { a: -2.2, b: 4.5 },
  /** P(moderate+) = sigmoid(a + b·S) */
  pModerate: { a: -5.3, b: 6.1 },
} as const;
