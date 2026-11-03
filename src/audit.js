/*
 * ARGUS audit ledger helpers
 *
 * Event shape:
 *   eid          stable event ID (EVT-0001 ...)
 *   at / ts      when it happened (epoch ms) and its display form
 *   type, sev    what happened and how serious
 *   agent        affected agent name, or "—" for program-wide events
 *   actor        { name, role }: the person (or system) acting, and the accountable role they acted in
 *   outcome      "success" | "denied" | "detected"
 *   entity       { kind, id, version } the record acted on
 *   before/after the fields that changed
 *   correlation  ties related events together (a submission and its decision, say)
 *   synthetic    true for seeded demo history
 *   prev / hash  checksum chain over the ledger, so edits or deletions show up on verification
 *
 * In this demo the ledger lives in browser memory and the checksum is a fast
 * non-cryptographic hash (FNV-1a). It shows the design; production needs
 * server-side append-only storage with cryptographic hashing.
 */

const fnv = str => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
};
const core = e => JSON.stringify([e.eid, e.at, e.type, e.sev, e.agent, e.desc, e.actor, e.outcome, e.entity || null, e.before || null, e.after || null, e.correlation || null]);
export const chainHash = (e, prev) => fnv(prev + core(e));

// ledger is newest-first; seal one new event on top
export const seal = (e, ledger) => {
  const prev = ledger[0]?.hash || "00000000";
  return Object.freeze({ ...e, prev, hash: chainHash(e, prev) });
};

// seal a whole oldest-first list (seed data)
export const sealAll = oldestFirst => {
  const out = [];
  for (const e of oldestFirst) out.unshift(seal(e, out));
  return out;
};

export function verifyChain(ledger) {
  for (let i = ledger.length - 1; i >= 0; i--) {
    const e = ledger[i];
    const prev = ledger[i + 1]?.hash || "00000000";
    if (e.prev !== prev || e.hash !== chainHash(e, prev)) return { ok: false, at: e.eid, checked: ledger.length - i };
  }
  return { ok: true, checked: ledger.length };
}

// Remove secrets and personal data from free text before it reaches the log
const PATTERNS = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]"],
  [/\b(sk|pk|rk)[-_][A-Za-z0-9_-]{12,}\b/g, "[secret redacted]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[secret redacted]"],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g, "[secret redacted]"],
  [/\b(password|passwd|secret|token|api[_ -]?key)\s*[:=]\s*\S+/gi, "$1: [redacted]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[number redacted]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[number redacted]"],
];
export const redact = text => PATTERNS.reduce((t, [re, sub]) => t.replace(re, sub), String(text ?? ""));

// Spreadsheet-safe CSV cell: neutralize formulas (=, +, -, @, tab, CR) and quote
export const csvCell = v => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
export const toCSV = rows => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");

export const SYSTEM = { name: "ARGUS policy engine", role: "System" };
