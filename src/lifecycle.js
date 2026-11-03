/*
 * ARGUS agent lifecycle
 *
 *   Pending review --(owner submits, approver activates)--> Active
 *   Active --(auto-suspend or governance)--> Suspended
 *   Suspended --(owner remediates and submits, approver reinstates)--> Active (on probation)
 *
 * Requirements are worked out live from the agent's state, so items tick
 * themselves off as the work gets done. Activation can be approved with
 * conditions (open items get a due date of at most 90 days). Reinstatement
 * after a suspension is a hard gate: every item must be met first.
 */
import { isResolved } from "./riskLibrary.js";

export const CONDITION_MAX_DAYS = 90;
export const PROBATION_DAYS = 30;
const TREATED = ["Accept", "Transfer", "Avoid"];

export const agentViolations = (agent, audit) =>
  audit.filter(e => e.agent === agent.name && e.type === "Policy Violation" && e.id);

export function requirements(agent, kind, { audit, treatments }) {
  const items = [];
  const inScope = agent.mapping.policies.filter(p => !p.excluded);
  const gaps = inScope.filter(p => p.state !== "active");
  const high = agent.risks.filter(r => r.residual.score >= 10);
  const untreated = high.filter(r => !TREATED.includes(treatments[r.id]?.treatment));
  const violations = agentViolations(agent, audit);

  if (kind === "reinstatement") {
    const rc = violations.map(e => ({ ...e, resolution: agent.resolutions?.[e.id] || null }));
    items.push({
      id: "rootcause", label: "Root cause recorded for each violation",
      detail: "Explain what allowed each violation and what was changed to stop it.",
      met: rc.every(e => e.resolution), subs: rc,
    });
    const pols = [...new Set(violations.map(e => e.policy))].map(id => ({ id, retest: agent.retests?.[id] || null }));
    items.push({
      id: "retest", label: "Broken controls re-tested",
      detail: "Each policy the agent violated must be shown to block it now. Until then the control gets no credit in the risk score.",
      met: pols.every(p => p.retest), subs: pols,
    });
  }

  items.push({
    id: "controls", label: `Required controls in place (${inScope.length - gaps.length} of ${inScope.length})`,
    detail: "Every policy that applies to this agent must be adopted, approved and switched on.",
    met: gaps.length === 0, subs: gaps,
  });
  items.push({
    id: "risks", label: "No untreated high or critical risk",
    detail: "Reduce each high or critical residual risk with controls, or formally accept, transfer or avoid it in the risk register.",
    met: untreated.length === 0, subs: untreated,
  });

  if (kind === "reinstatement") {
    if (agent.suspension?.autonomy === "Full autonomy") {
      items.push({
        id: "autonomy", label: "Autonomy reduced from full autonomy",
        detail: "Full autonomy let the violations happen without a human in the loop. The agent returns as semi-autonomous or supervised.",
        met: agent.autonomy !== "Full autonomy",
      });
    }
    items.push({
      id: "score", label: "Risk score below critical",
      detail: `Current score ${agent.score}. It must be under 80 before reinstatement. Resolving violations and closing control gaps both lower it.`,
      met: agent.score < 80,
    });
  } else {
    const open = violations.filter(e => !isResolved(agent, e));
    items.push({ id: "violations", label: "No open policy violations", detail: "Violations must be root-caused and the control re-tested.", met: open.length === 0, subs: open });
    items.push({
      id: "attest-arch", label: "Owner confirmed the architecture",
      detail: "The owner checks the Architecture tab is accurate: components, data flows and human checkpoints.",
      met: !!agent.attest?.arch, attest: agent.attest?.arch || null,
    });
    items.push({
      id: "attest-traits", label: "Owner confirmed the characteristics",
      detail: "Framework and policy mapping depends on these, so the owner confirms they are complete.",
      met: !!agent.attest?.traits, attest: agent.attest?.traits || null,
    });
  }

  const met = items.filter(i => i.met).length;
  return { kind, items, met, total: items.length, done: met === items.length, open: items.filter(i => !i.met) };
}

// What, if anything, is the agent waiting on
export function lifecycle(agent, ctx) {
  const kind = agent.status === "pending" ? "activation" : agent.status === "suspended" ? "reinstatement" : null;
  if (!kind) return { kind: null };
  return requirements(agent, kind, ctx);
}

// Short label for the registry table
export function nextStep(agent, ctx) {
  if (agent.status === "active") {
    if (agent.conditions) {
      const r = requirements(agent, "activation", ctx);
      const open = agent.conditions.items.filter(id => !r.items.find(i => i.id === id)?.met).length;
      return open ? `Conditional: ${open} open, due ${agent.conditions.due}` : "Conditions met";
    }
    return agent.probation ? `Probation until ${agent.probation.until}` : null;
  }
  if (agent.review) return "Awaiting approval";
  const r = lifecycle(agent, ctx);
  const n = r.total - r.met;
  return n ? `${n} item${n === 1 ? "" : "s"} to ${r.kind === "activation" ? "activate" : "reinstate"}` : "Ready to submit";
}
