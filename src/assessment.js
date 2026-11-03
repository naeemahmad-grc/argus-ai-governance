/*
 * ARGUS assessment engine
 *
 * One assessment feeds every screen (Dashboard, Frameworks, Risk & Gaps and the
 * printed report), so the numbers can't drift apart. It reports two different
 * measures over the same set of applicable requirements:
 *
 *   Mapped control coverage  - does an enabled, approved control exist for the requirement?
 *   Requirement fulfillment  - is there evidence it is met? (Met 1, Partially met 0.5, Not met 0)
 *
 * Requirements marked Not applicable (no agent in scope, or excluded with a
 * logged reason) are left out of both denominators and reported as exclusions.
 */
import { gapAssessment } from "./riskLibrary.js";

export const COVERAGE_METHOD =
  "Share of applicable requirements with at least one enabled, approved policy or always-on platform capability mapped to them. It shows that a control exists, not that it works.";
export const FULFILLMENT_METHOD =
  "Evidence-weighted. Met counts as 1 (an approved, switched-on control verified effective by a current passing test, or an always-on platform capability), Partially met as 0.5 (in place but untested or with stale test evidence, or still in draft) and Not met as 0 (no control, switched off, or failed its last test), divided by the applicable requirements. A policy document on its own doesn't make a requirement Met.";
export const EXCLUSION_METHOD =
  "Not applicable requirements are left out of both measures: frameworks with no agent in scope, and requirements excluded with a logged reason.";
export const SCOPE_DISCLAIMER =
  "Each framework is represented by a curated subset of requirements relevant to AI agents, not its full text. These figures track internal control readiness. They do not establish legal compliance or certification.";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);

function tally(rows) {
  const count = st => rows.filter(r => r.status === st).length;
  const met = count("Met"), partial = count("Partially met"), notMet = count("Not met"), na = count("Not applicable");
  const applicable = rows.length - na;
  const mapped = rows.filter(r => r.status !== "Not applicable" && r.covered).length;
  return {
    total: rows.length, applicable, na, met, partial, notMet, mapped,
    unmapped: applicable - mapped,
    coveragePct: pct(mapped, applicable),
    fulfillmentPct: applicable ? Math.round(((met + partial * 0.5) / applicable) * 100) : null,
  };
}

export function buildAssessment(reqMap, policies, scoredAgents, overrides = {}) {
  const frameworks = gapAssessment(reqMap, policies, scoredAgents, overrides).map(f => ({ ...f, ...tally(f.rows) }));
  const rows = frameworks.flatMap(f => f.rows);
  return {
    frameworks,
    rows,
    ...tally(rows),
    // requirements that still need a control mapped (excluded ones don't count as gaps)
    gapKeys: new Set(rows.filter(r => r.status !== "Not applicable" && !r.covered).map(r => r.key)),
    exclusions: rows.filter(r => r.status === "Not applicable"),
    asOf: Date.now(),
  };
}
