import regions from "@/lib/data/regions.json";

const R = 6371; // earth radius, km
const D2R = Math.PI / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in km (haversine). */
export function gcKm(a: LatLon, b: LatLon): number {
  const f1 = a.lat * D2R,
    f2 = b.lat * D2R,
    df = (b.lat - a.lat) * D2R,
    dl = (b.lon - a.lon) * D2R;
  const s =
    Math.sin(df / 2) ** 2 +
    Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Spherical interpolation along the great circle from a to b at fraction f. */
export function slerp(a: LatLon, b: LatLon, f: number): LatLon {
  const f1 = a.lat * D2R,
    l1 = a.lon * D2R,
    f2 = b.lat * D2R,
    l2 = b.lon * D2R;
  const d = gcKm(a, b) / R;
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d),
    B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
  const y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
  const z = A * Math.sin(f1) + B * Math.sin(f2);
  return {
    lat: Math.atan2(z, Math.hypot(x, y)) / D2R,
    lon: Math.atan2(y, x) / D2R,
  };
}

type RegionBox = [string, number, number, number, number];

/** Region name for a coordinate — ordered bounding boxes, first match wins. */
export function regionFor(lat: number, lon: number): string {
  const L = ((lon % 360) + 360) % 360;
  for (const [name, a, b, c, d] of regions as RegionBox[]) {
    const lo = ((c % 360) + 360) % 360,
      hi = ((d % 360) + 360) % 360;
    const inLon = lo <= hi ? L >= lo && L <= hi : L >= lo || L <= hi;
    if (lat >= a && lat <= b && inLon) return name;
  }
  return "open water";
}
