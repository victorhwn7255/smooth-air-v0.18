import pkg from "../../../../package.json";

export function GET() {
  return Response.json({
    name: "smoothair",
    version: pkg.version,
    uptimeSec: Math.round(process.uptime()),
  });
}
