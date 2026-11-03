/*
 * "Needs my decision": one prioritized queue of things waiting on a governance
 * decision, ranked by urgency and impact rather than by how many framework gaps
 * a fix would close.
 *
 * Rank = severity weight + impact (agents affected) + overdue days + age.
 */
import { isResolved } from "./riskLibrary.js";
import { operatingState, isTreated } from "./gates.js";
import { requirements } from "./lifecycle.js";
import { addDaysISO, daysUntil, parseISODate } from "./timeline.js";

export const POLICY_REVIEW_DAYS = 365;
export const DECISION_KINDS = [
  { id: "gate", label: "Gate conflicts" },
  { id: "risk", label: "Critical risks" },
  { id: "approval", label: "Approvals" },
  { id: "control", label: "Failed controls" },
  { id: "overdue", label: "Overdue" },
];
const SEV_WEIGHT = { critical: 400, high: 300, medium: 200, low: 100 };
const DAY = 864e5;

export const policyReviewDue = p => (p.reviewedOn || p.approvedOn) && p.status === "approved"
  ? addDaysISO(POLICY_REVIEW_DAYS, parseISODate(p.reviewedOn || p.approvedOn))
  : null;

export function decisionQueue({ scored, register, policies, audit, treatments, gates, assessment, gapOverrides = {} }) {
  const ctx = { audit, treatments, gates };
  const items = [];
  const now = Date.now();
  const byName = Object.fromEntries(scored.map(a => [a.name, a]));
  const push = it => items.push({
    agents: it.agent ? [it.agent] : [], since: null, due: null, ...it,
    rank: SEV_WEIGHT[it.sev]
      + 10 * Math.min(10, (it.agents || [it.agent]).filter(Boolean).length)
      + (it.due && daysUntil(it.due) < 0 ? Math.min(60, -daysUntil(it.due)) : 0)
      + (it.since ? Math.min(30, (now - it.since) / DAY) / 2 : 0),
  });

  // 1. Active agents failing a continued-operation gate, or whose exception ran out
  for (const a of scored) {
    const op = operatingState(a, ctx);
    if (op.state === "conflict") {
      const viol = op.blockers.find(b => b.id === "violation");
      push({
        id: `gate-${a.id}`, kind: "gate", sev: "critical", agent: a.name, owner: a.owner,
        title: op.expired ? `${a.name}: exception expired, gate conflict is back` : `${a.name} is active but fails its operating gate`,
        reason: op.blockers.map(b => b.id === "risk" ? b.subs.map(r => `Untreated ${r.id} ${r.title} (residual ${r.residual.score})`).join("; ")
          : b.id === "violation" ? b.subs.map(e => `Open critical violation: ${e.desc}`).join("; ") : b.label).join(". ") + ".",
        since: viol ? Math.min(...viol.subs.map(e => e.at)) : null,
        due: op.expired ? a.exception.until : null,
        action: { label: "Decide: fix, exception or suspend", type: "agent", id: a.id },
      });
    }
    if (op.state === "exception" && daysUntil(a.exception.until) <= 14) push({
      id: `exc-${a.id}`, kind: "overdue", sev: "medium", agent: a.name, owner: a.owner,
      title: `${a.name}: gate exception ends soon`, reason: `Exception approved by ${a.exception.by} ends ${a.exception.until}. Fix the blocker or renew the exception.`,
      due: a.exception.until, since: a.exception.at, action: { label: "Review agent", type: "agent", id: a.id },
    });
  }

  // 2. Critical scenarios nobody has treated, whatever the agent's aggregate score
  for (const s of register) {
    const hit = s.agents.filter(x => x.residual.score >= 16);
    if (!hit.length || isTreated(s.id, treatments)) continue;
    push({
      id: `risk-${s.id}`, kind: "risk", sev: "critical", agents: hit.map(x => x.name), owner: treatments[s.id]?.owner || s.owner,
      title: `${s.id} ${s.title}`,
      reason: `Residual ${hit.map(x => `${x.residual.score} at ${x.name} (agent score ${byName[x.name]?.score ?? "?"})`).join("; ")}. No accepted, transferred or avoided treatment.`,
      due: treatments[s.id]?.reviewOn || null,
      action: { label: "Treat in risk register", type: "risk", id: s.id },
    });
  }

  // 3. Submissions waiting for an independent approver
  for (const a of scored.filter(x => x.review)) {
    const r = requirements(a, a.review.kind, ctx);
    push({
      id: `approval-${a.id}`, kind: "approval", sev: a.review.kind === "reinstatement" ? "high" : "medium", agent: a.name,
      owner: `Independent approver (not ${a.owner})`,
      title: `${a.name} submitted for ${a.review.kind}`,
      reason: `${r.met} of ${r.total} requirements met${r.done ? "" : a.review.kind === "activation" ? ", so only a conditional activation is possible" : ""}.`,
      since: a.review.at || null, action: { label: "Review submission", type: "agent", id: a.id },
    });
  }

  // 4. Failed controls: open violations, and in-scope controls that are switched off or unapproved
  const gated = new Set(items.filter(i => i.kind === "gate").map(i => i.agent));
  const openByAgent = {};
  for (const e of audit.filter(x => x.type === "Policy Violation" && x.id)) {
    const a = byName[e.agent];
    if (!a || isResolved(a, e) || gated.has(a.name)) continue;
    (openByAgent[a.name] ||= []).push(e);
  }
  for (const [name, evs] of Object.entries(openByAgent)) {
    const a = byName[name];
    const names = [...new Set(evs.map(e => policies.find(p => p.id === e.policy)?.name || "a control"))];
    const contained = a.status === "suspended";
    push({
      id: `viol-${a.id}`, kind: "control", sev: contained ? "high" : evs.some(e => e.sev === "critical") ? "critical" : "medium",
      agent: a.name, owner: a.owner,
      title: `${a.name}: ${evs.length} open violation${evs.length > 1 ? "s" : ""}`,
      reason: `Broke ${names.join(", ")}.${contained ? " Contained: the agent is suspended." : ""} Each needs a root cause and a passing re-test before the control counts again.`,
      since: Math.min(...evs.map(e => e.at)), action: { label: "Open remediation", type: "agent", id: a.id },
    });
  }
  for (const p of policies) {
    const users = scored.filter(a => a.mapping.policies.some(m => m.id === p.id && !m.excluded));
    if (!users.length) continue;
    if (!p.enabled && p.status !== "draft") push({
      id: `off-${p.id}`, kind: "control", sev: users.some(a => a.status === "active") ? "high" : "medium", agents: users.map(a => a.name), owner: p.owner,
      title: `${p.name} is switched off`, reason: `Required for ${users.length} agent${users.length > 1 ? "s" : ""}, so it gives no protection or credit while off.`,
      action: { label: "Enable policy", type: "enable", id: p.id },
    });
    if (p.status === "draft") push({
      id: `draft-${p.id}`, kind: "approval", sev: "medium", agents: users.map(a => a.name), owner: p.owner,
      title: `${p.name} is waiting for approval`, reason: `Drafted but not approved, so it doesn't count as a control for ${users.length} agent${users.length > 1 ? "s" : ""}.`,
      action: { label: "Approve policy", type: "approve", id: p.id },
    });
  }

  // 5. Overdue reviews and deadlines
  for (const p of policies) {
    const due = policyReviewDue(p);
    if (due && daysUntil(due) < 0) push({
      id: `review-${p.id}`, kind: "overdue", sev: daysUntil(due) < -30 ? "high" : "medium", owner: p.owner,
      title: `Annual review of ${p.name} is overdue`, reason: `Last approved or reviewed ${p.reviewedOn || p.approvedOn}. Policies are reviewed every ${POLICY_REVIEW_DAYS} days.`,
      due, since: parseISODate(due).getTime(), action: { label: "Record review", type: "review", id: p.id },
    });
  }
  for (const s of register) {
    const t = treatments[s.id];
    if (t?.reviewOn && daysUntil(t.reviewOn) < 0) push({
      id: `treat-${s.id}`, kind: "overdue", sev: "medium", agents: s.agents.map(x => x.name), owner: t.owner || s.owner,
      title: `Treatment review for ${s.id} is overdue`, reason: `${t.treatment} decision was due for review ${t.reviewOn}.`,
      due: t.reviewOn, action: { label: "Treat in risk register", type: "risk", id: s.id },
    });
  }
  for (const r of assessment.rows) {
    const ov = gapOverrides[r.key];
    if (ov?.due && daysUntil(ov.due) < 0 && (r.status === "Not met" || r.status === "Partially met")) push({
      id: `gap-${r.key}`, kind: "overdue", sev: "medium", owner: ov.owner || "Unassigned",
      title: `${r.framework.short} ${r.id} remediation is overdue`, reason: `${r.title}: still ${r.status.toLowerCase()}.`,
      due: ov.due, action: { label: "Open gap assessment", type: "gaps", id: r.key },
    });
  }
  for (const a of scored.filter(x => x.status === "active" && x.conditions)) {
    const r = requirements(a, "activation", ctx);
    const open = a.conditions.items.filter(id => !r.items.find(i => i.id === id)?.met);
    if (open.length && daysUntil(a.conditions.due) < 0) push({
      id: `cond-${a.id}`, kind: "overdue", sev: "high", agent: a.name, owner: a.owner,
      title: `${a.name}: conditional activation items are overdue`, reason: `${open.length} condition${open.length > 1 ? "s" : ""} still open.`,
      due: a.conditions.due, action: { label: "Review agent", type: "agent", id: a.id },
    });
  }

  return items.sort((x, y) => y.rank - x.rank);
}

