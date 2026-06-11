/**
 * OpenSky auth for local tools: OAuth2 client-credentials when
 * OPENSKY_CLIENT_ID/SECRET exist (registered account — deeper history,
 * more credits), anonymous otherwise. Owner-approved key exception
 * (2026-06-11); see tasks/change-logs.md.
 */
import "./env";

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

let cached: { token: string; expires: number } | null = null;

export async function openskyHeaders(): Promise<Record<string, string>> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return {};
  if (cached && Date.now() < cached.expires) {
    return { Authorization: `Bearer ${cached.token}` };
  }
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}`,
  });
  if (!r.ok) {
    console.log(`  OpenSky auth failed (HTTP ${r.status}) — continuing anonymously`);
    return {};
  }
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = {
    token: j.access_token,
    expires: Date.now() + (j.expires_in - 60) * 1000,
  };
  return { Authorization: `Bearer ${cached.token}` };
}

/** True when registered credentials are configured. */
export const openskyAuthenticated = () =>
  !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET);
