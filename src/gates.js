/*
 * ARGUS operating gates
 *
 * An agent's aggregate score averages its worst risks, so a single critical
 * scenario can sit inside a "High" or "Medium" agent. Gates check the worst
 * individual exposure directly.
 *
 *   Activation gate          - pending agents: no untreated residual risk at or above `activationRisk`
 *                              (enforced through the activation and reinstatement checklists)
 *   Continued-operation gate - active agents: no untreated residual risk at or above `operateRisk`,
 *                              aggregate score below `operateScore`, and (optionally) no open
 *                              critical policy violation
 *
 * An active agent that fails a gate is never switched off silently. It is
 * flagged as a gate conflict for a person to decide: fix the blocker, approve a
 * time-limited exception, or suspend the agent.
 *
 * In this demo the gates are evaluated in the browser. Nothing here is enforced
 * on a server or at agent runtime.
 */
import { isResolved } from "./riskLibrary.js";

export const DEFAULT_GATES = { activationRisk: 10, operateRisk: 16, operateScore: 80, operateViolations: true };
export const GATE_RISK_OPTIONS = [
  { value: 10, label: "High or critical (10+)" },
  { value: 16, label: "Critical only (16+)" },
];
export const GATE_SCORE_OPTIONS = [55, 80];
export const EXCEPTION_MAX_DAYS = 90;
export const TREATED = ["Accept", "Transfer", "Avoid"];

export const isTreated = (scenarioId, treatments) => TREATED.includes(treatments[scenarioId]?.treatment);
export const untreatedRisks = (agent, treatments) => agent.risks.filter(r => !isTreated(r.id, treatments));

// highest residual risk, and the highest one nobody has accepted, transferred or avoided
export function worstScenario(agent, treatments) {
  const byScore = [...agent.risks].sort((a, b) => b.residual.score - a.residual.score);
  return {
    worst: byScore[0] || null,
    worstUntreated: byScore.find(r => !isTreated(r.id, treatments)) || null,
  };
}

export const openCriticalViolations = (agent, audit) =>
  audit.filter(e => e.agent === agent.name && e.type === "Policy Violation" && e.id && e.sev === "critical" && !isResolved(agent, e));

// Continued-operation gate for an active agent
export function gateCheck(agent, { audit, treatments, gates = DEFAULT_GATES }) {
  const blockers = [];
  const risky = untreatedRisks(agent, treatments).filter(r => r.residual.score >= gates.operateRisk)
    .sort((a, b) => b.residual.score - a.residual.score);
  if (risky.length) blockers.push({
    id: "risk", subs: risky,
    label: `Untreated ${gates.operateRisk >= 16 ? "critical" : "high or critical"} risk (${risky.length})`,
    detail: `Residual ${risky.map(r => `${r.id} ${r.residual.score}`).join(", ")}. Reduce it with controls, or accept, transfer or avoid it in the risk register.`,
  });
  if (agent.score >= gates.operateScore) blockers.push({
    id: "score", label: `Agent score ${agent.score} is at or above ${gates.operateScore}`,
    detail: "Resolve violations and close control gaps to bring it down.",
  });
  const viol = gates.operateViolations ? openCriticalViolations(agent, audit) : [];
  if (viol.length) blockers.push({
    id: "violation", subs: viol,
    label: `Open critical violation${viol.length > 1 ? "s" : ""} (${viol.length})`,
    detail: "Record the root cause and re-test the broken control.",
  });
  return blockers;
}

const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const exceptionValid = agent => !!(agent.exception && agent.exception.until >= todayLocal());

/*
 * Operating state, kept separate from the stored status:
 *   pending | active | conflict (active but failing a gate) | exception (gate waived until a date) | suspended
 */
export function operatingState(agent, ctx) {
  if (agent.status !== "active") return { state: agent.status, blockers: [] };
  const blockers = gateCheck(agent, ctx);
  if (!blockers.length) return { state: "active", blockers };
  const waived = exceptionValid(agent) && blockers.every(b => agent.exception.gates.includes(b.id));
  return { state: waived ? "exception" : "conflict", blockers, expired: !!agent.exception && !exceptionValid(agent) };
}

export const STATE_LABEL = { pending: "pending", active: "active", conflict: "active · gate conflict", exception: "active · exception", suspended: "suspended" };
