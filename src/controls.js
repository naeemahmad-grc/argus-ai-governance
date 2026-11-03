/*
 * ARGUS control effectiveness
 *
 * A policy existing, or a file being uploaded, is not evidence that a control
 * works. Each control tracks five separate attributes:
 *
 *   Documented   - a policy document is on file (bound to a version)
 *   Approved     - an independent approver signed off this version
 *   Implemented  - the control is switched on
 *   Tested       - a dated test result with an owner, evidence and expiry
 *   Effective    - derived: implemented, approved, and the latest applicable
 *                  test passed on the current version and hasn't expired
 *
 * Only "Effective" controls reduce residual risk or count as Met. A violation
 * by an agent also removes credit for that agent until the control is re-tested.
 * Tests are bound to a policy version: publishing a new version makes earlier
 * results stale, which invalidates the assessments that relied on them.
 */
import { localISO, addDaysISO } from "./timeline.js";

export const TEST_VALID_DAYS = 365;

export const EFFECT = {
  effective: { label: "Verified effective", short: "Effective", tone: "good" },
  untested: { label: "No test evidence", short: "Untested", tone: "warn" },
  stale: { label: "Test evidence stale", short: "Stale", tone: "warn" },
  failed: { label: "Failed its last test", short: "Failed test", tone: "bad" },
  off: { label: "Not implemented", short: "Not implemented", tone: "bad" },
  unapproved: { label: "Not approved", short: "Draft", tone: "warn" },
  missing: { label: "Not adopted", short: "Not adopted", tone: "bad" },
};

// program-level questions only count tests run across all agents; agent-level questions also count tests scoped to that agent
const appliesTo = (t, agentId) => t.scope === "all" || (agentId !== undefined && Array.isArray(t.scope) && t.scope.includes(agentId));

// Most recent test that covers this agent (or any test, for program-level questions)
export function latestTest(policy, agentId) {
  const ts = (policy?.tests || []).filter(t => appliesTo(t, agentId));
  return ts.reduce((m, t) => (!m || t.testedOn > m.testedOn || (t.testedOn === m.testedOn && (t.at || 0) > (m.at || 0)) ? t : m), null);
}

export function effectiveness(policy, agentId) {
  if (!policy) return { state: "missing", reason: "No policy adopted" };
  if (policy.status === "draft") return { state: "unapproved", reason: `Version ${policy.version || 1} is waiting for approval` };
  if (!policy.enabled) return { state: "off", reason: "Switched off" };
  const t = latestTest(policy, agentId);
  if (!t) return { state: "untested", reason: "Approved and switched on, but no test result on file" };
  if (t.result === "fail") return { state: "failed", test: t, reason: `Failed on ${t.testedOn}: ${t.evidence}` };
  if ((t.version || 1) !== (policy.version || 1)) return { state: "stale", test: t, reason: `Last tested on version ${t.version || 1}; the policy is now version ${policy.version}` };
  if (t.expiresOn < localISO()) return { state: "stale", test: t, reason: `Test evidence expired on ${t.expiresOn}` };
  return { state: "effective", test: t, reason: `Passed on ${t.testedOn}; valid until ${t.expiresOn}` };
}

export function attributes(policy) {
  const e = effectiveness(policy);
  const t = latestTest(policy);
  return [
    { key: "documented", label: "Documented", ok: !!policy.doc, detail: policy.doc ? `${policy.doc.name}${policy.doc.version ? ` (v${policy.doc.version})` : ""}` : "No document on file" },
    { key: "approved", label: "Approved", ok: policy.status === "approved", detail: policy.status === "approved" ? `v${policy.version || 1} by ${policy.approvedBy || "—"}${policy.approvedOn ? `, ${policy.approvedOn}` : ""}` : "Draft" },
    { key: "implemented", label: "Implemented", ok: !!policy.enabled && policy.status !== "draft", detail: policy.enabled ? "Switched on" : "Switched off" },
    { key: "tested", label: "Tested", ok: !!t && t.result === "pass", detail: t ? `${t.result === "pass" ? "Passed" : "Failed"} ${t.testedOn}` : "No test on file" },
    { key: "effective", label: "Effective", ok: e.state === "effective", detail: EFFECT[e.state].label },
  ];
}

export const newTest = ({ policy, result, evidence, owner, by, testedOn = localISO(), scope = "all", validDays = TEST_VALID_DAYS }) => ({
  id: `T-${policy.id}-${Date.now().toString(36)}`,
  testedOn, result, evidence, owner, by, scope,
  version: policy.version || 1,
  expiresOn: addDaysISO(validDays, new Date(testedOn + "T12:00:00")),
  at: Date.now(),
});
