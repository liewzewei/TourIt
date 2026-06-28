// Pure helpers for validating the explore feed's URL search params before they
// reach the recommend_listings RPC (and its SQL casts). Extracted from the
// explore page so they can be unit-tested in isolation.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// searchParams values can be string | string[] | undefined; take the first.
export function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Page number: ignore arrays, non-numbers, and anything < 1; floor the rest.
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// Comma-separated tag ids; keep only well-formed UUIDs (hand-typed URLs).
export function parseTagIds(raw: string | undefined): string[] {
  return raw ? raw.split(",").filter((t) => UUID_RE.test(t)) : [];
}

// "HH:MM"/"HH:MM:SS" time, else null (filter disabled).
export function parseTime(raw: string | undefined): string | null {
  return raw && TIME_RE.test(raw) ? raw : null;
}
