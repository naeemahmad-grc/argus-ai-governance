/*
 * ARGUS demo timeline and timestamp helpers
 *
 * The seeded history was written as if "today" were DEMO_ANCHOR. At load time
 * every seeded date is shifted so the anchor lands DEMO_ANCHOR_AGE days before
 * the viewer's today, which keeps the demo history recent while preserving the
 * gaps between events. Everything in the seed data is synthetic; the UI says so.
 *
 * Events carry `at` (epoch ms) as the single source of truth for ordering and
 * age. Dates without a time (approvals, due dates) use local YYYY-MM-DD strings.
 */

export const DEMO_ANCHOR = new Date(2026, 4, 21); // 21 May 2026, local midnight
export const DEMO_ANCHOR_AGE = 3; // the anchor shows as 3 days ago
const DAY = 864e5;

const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const SHIFT_DAYS = Math.round((midnight(new Date()) - DEMO_ANCHOR) / DAY) - DEMO_ANCHOR_AGE;

const shifted = d => { const x = new Date(d); x.setDate(x.getDate() + SHIFT_DAYS); return x; };

// local calendar date as YYYY-MM-DD (toISOString would give the UTC date)
export const localISO = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const addDaysISO = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return localISO(d); };
export const parseISODate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

// "5/21/2026, 10:52:25 AM" (seed format) -> epoch ms on the shifted timeline
export function seedAt(us) {
  const m = us.match(/^(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+)(?::(\d+))?\s*(AM|PM)$/i);
  if (!m) throw new Error(`Bad seed timestamp: ${us}`);
  let [, mo, d, y, h, mi, s, ap] = m;
  h = Number(h) % 12 + (ap.toUpperCase() === "PM" ? 12 : 0);
  return shifted(new Date(Number(y), mo - 1, Number(d), h, Number(mi), Number(s || 0))).getTime();
}
// "2026-03-04" (seed date) -> shifted "YYYY-MM-DD"
export const seedDate = iso => localISO(shifted(parseISODate(iso)));

const tzName = d => new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d).find(p => p.type === "timeZoneName")?.value || "";

// "Nov 1, 2026, 10:52 AM EST"
export const fmtWhen = at => {
  const d = new Date(at);
  return `${d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} ${tzName(d)}`;
};
// "Nov 1, 2026, 10:52:25 AM EST" for the audit ledger
export const fmtWhenLong = at => {
  const d = new Date(at);
  return `${d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })} ${tzName(d)}`;
};
export const fmtDate = iso => iso ? parseISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

// "just now", "5 min ago", "3 h ago", "2 days ago", "4 mo ago"
export function age(at, now = Date.now()) {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d < 60) return `${d} day${d === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 30)} mo ago`;
}
// whole days from today to an ISO date (negative = overdue)
export const daysUntil = iso => Math.round((parseISODate(iso) - midnight(new Date())) / DAY);
export const daysSince = at => Math.floor((Date.now() - at) / DAY);
