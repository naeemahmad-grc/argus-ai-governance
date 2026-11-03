/*
 * ARGUS lifecycle command validation
 *
 * Every lifecycle change goes through checkCommand before it is applied:
 * who may do it (identity.js), whether the agent is in a state that allows it,
 * and whether the record changed since the person looked at it (optimistic
 * concurrency on agent.rev). In this demo it runs in the browser; it is written
 * as a pure function so the same checks can run server-side.
 */
import { can } from "./identity.js";
import { requirements } from "./lifecycle.js";
import { operatingState, EXCEPTION_MAX_DAYS } from "./gates.js";
import { CONDITION_MAX_DAYS } from "./lifecycle.js";
import { addDaysISO, localISO } from "./timeline.js";

const no = reason => ({ ok: false, reason });
const yes = { ok: true, reason: "" };

export function checkCommand(agent, cmd, user, ctx) {
  if (!agent) return no("That agent no longer exists.");
  if (cmd.rev !== undefined && cmd.rev !== (agent.rev || 0))
    return no(`${agent.name} changed after you opened it. Review the latest version and try again.`);
  const kind = agent.status === "pending" ? "activation" : agent.status === "suspended" ? "reinstatement" : null;
  const auth = (action, extra = {}) => can(user, action, { agent, ...extra });

  switch (cmd.type) {
    case "attest": case "rootCause": case "retest": case "autonomy": {
      return auth("agent.owner");
    }
    case "submit": {
      if (!kind) return no(`${agent.name} is ${agent.status}, so there is nothing to submit.`);
      if (agent.review) return no("Already submitted and waiting for a decision.");
      const a = auth("agent.owner"); if (!a.ok) return a;
      if (kind === "reinstatement" && !requirements(agent, kind, ctx).done) return no("Reinstatement needs every requirement met before it can be submitted.");
      return yes;
    }
    case "withdraw": {
      if (!agent.review) return no("There is no submission to withdraw.");
      return auth("agent.owner");
    }
    case "decide": {
      if (!agent.review || !kind) return no("There is no submission waiting for a decision.");
      const a = auth("agent.approve", { role: cmd.by, requester: agent.review.byUser }); if (!a.ok) return a;
      const req = requirements(agent, kind, ctx);
      if (cmd.decision === "reject") return cmd.reason?.trim() ? yes : no("Returning a submission needs a reason.");
      if (cmd.decision === "approve") return req.done ? yes : no(`${req.total - req.met} requirement${req.total - req.met === 1 ? " is" : "s are"} still open.`);
      if (cmd.decision === "conditional") {
        if (kind !== "activation") return no("Reinstatement after a suspension can't be conditional.");
        if (!cmd.due || cmd.due <= localISO() || cmd.due > addDaysISO(CONDITION_MAX_DAYS)) return no(`Conditions need a due date within ${CONDITION_MAX_DAYS} days.`);
        return yes;
      }
      return no("Unknown decision.");
    }
    case "grantException": {
      if (operatingState(agent, ctx).state !== "conflict") return no(`${agent.name} has no gate conflict to except.`);
      const a = auth("agent.exception", { role: cmd.by }); if (!a.ok) return a;
      if (!cmd.reason?.trim()) return no("An exception needs a reason.");
      if (!cmd.until || cmd.until <= localISO() || cmd.until > addDaysISO(EXCEPTION_MAX_DAYS)) return no(`Exceptions must end within ${EXCEPTION_MAX_DAYS} days.`);
      return yes;
    }
    case "revokeException": {
      if (!agent.exception) return no("There is no exception to revoke.");
      return auth("agent.exception");
    }
    case "suspend": {
      if (agent.status !== "active") return no(`${agent.name} is ${agent.status}, not active.`);
      const a = auth("agent.suspend", { role: cmd.by }); if (!a.ok) return a;
      return cmd.reason?.trim() ? yes : no("A suspension needs a reason.");
    }
    default:
      return no(`Unknown command ${cmd.type}.`);
  }
}
