/*
 * ARGUS simulated identity and authorization
 *
 * SIMULATED. There is no login, session or server in this demo. The person you
 * "act as" is picked from a list of fictional users, and these checks run in
 * the browser, where anyone can bypass them. They show the authorization model
 * a production backend would enforce on every request; they are not a security
 * control here.
 *
 * Two separate ideas:
 *   person - who is taking the action (recorded as the actor)
 *   role   - the accountable business role they act in (recorded with it)
 * A person can only act in a role they hold, and can't approve something they
 * own, requested, or are the accountable owner of (separation of duties).
 */
import { POLICY_ROLES } from "./frameworks.js";

export const DEMO_USERS = [
  { id: "u-avery", name: "Avery Chen", title: "Head of AI Governance", roles: ["AI Governance Committee", "Chief AI Officer"], teams: [] },
  { id: "u-sam", name: "Sam Rivera", title: "Chief Risk Officer", roles: ["Chief Risk Officer"], teams: [] },
  { id: "u-jordan", name: "Jordan Patel", title: "CISO, leads SecOps", roles: ["Chief Information Security Officer"], teams: ["SecOps"] },
  { id: "u-priya", name: "Priya Nair", title: "Chief Privacy Officer", roles: ["Chief Privacy Officer / DPO"], teams: [] },
  { id: "u-dana", name: "Dana Brooks", title: "FP&A lead, owns FinanceBot Alpha", roles: [], teams: ["FP&A"] },
  { id: "u-john", name: "John Smith", title: "Owns JobFit", roles: [], teams: ["John Smith"] },
  { id: "u-morgan", name: "Morgan Lee", title: "Internal audit (read-only)", roles: ["Head of Internal Audit"], teams: [], readOnly: true },
];
export const DEFAULT_USER = DEMO_USERS[0];

const SCOPE_ROLES = ["AI Governance Committee", "Chief Compliance Officer", "Chief Risk Officer", "General Counsel", "Chief Privacy Officer / DPO"];
const CONTAINMENT_ROLES = ["AI Governance Committee", "Chief AI Officer", "Chief Information Security Officer", "Chief Risk Officer", "Chief Compliance Officer"];

const deny = reason => ({ ok: false, reason });
const allow = { ok: true, reason: "" };
const holds = (user, roles) => user.roles.some(r => roles.includes(r));
export const ownsAgent = (user, agent) => !!agent && user.teams.includes(agent.owner);
export const ownerOf = (agent, users = DEMO_USERS) => users.find(u => ownsAgent(u, agent)) || null;

/*
 * can(user, action, ctx) -> { ok, reason }
 *   ctx.agent    the agent acted on
 *   ctx.policy   the policy acted on
 *   ctx.role     the accountable role the user is acting in
 *   ctx.owner    accountable owner role of the thing being approved (policy or risk owner)
 *   ctx.requester user id who asked for the thing being approved
 */
export function can(user, action, ctx = {}) {
  if (!user) return deny("Nobody is signed in.");
  if (user.readOnly && !action.startsWith("audit.")) return deny(`${user.name} has read-only access.`);
  if (ctx.role && !user.roles.includes(ctx.role)) return deny(`${user.name} doesn't hold the ${ctx.role} role.`);
  const { agent } = ctx;
  switch (action) {
    case "agent.register":
      return allow;
    case "agent.owner":
      return ownsAgent(user, agent) ? allow : deny(`Only ${agent?.owner || "the agent's owner"} can do this.`);
    case "agent.approve":
      if (ownsAgent(user, agent)) return deny("The owner can't approve their own agent.");
      if (!user.roles.length) return deny("Approvals need a governance role.");
      if (ctx.requester && ctx.requester === user.id) return deny("You submitted this, so someone else has to decide it.");
      return allow;
    case "agent.exception":
    case "agent.suspend":
      if (!holds(user, CONTAINMENT_ROLES)) return deny(`Needs one of: ${CONTAINMENT_ROLES.join(", ")}.`);
      if (ownsAgent(user, agent)) return deny("The owner can't decide this for their own agent.");
      return allow;
    case "policy.manage":
      return user.roles.length ? allow : deny("Managing policies needs a governance role.");
    case "policy.approve":
      if (!user.roles.length) return deny("Approvals need a governance role.");
      if (ctx.owner && user.roles.includes(ctx.owner)) return deny(`${user.name} holds ${ctx.owner}, the policy owner role, so can't approve it.`);
      if (ctx.role && ctx.role === ctx.owner) return deny("The approving role must differ from the owner role.");
      if (ctx.requester && ctx.requester === user.id) return deny("You drafted this version, so someone else has to approve it.");
      return allow;
    case "risk.treat":
      return user.roles.length ? allow : deny("Treating risks needs a governance role.");
    case "risk.accept":
      if (!user.roles.length) return deny("Accepting risk needs a governance role.");
      if (ctx.owner && user.roles.includes(ctx.owner)) return deny(`${user.name} holds ${ctx.owner}, the risk owner role, so can't accept it.`);
      return allow;
    case "scope.change":
      return holds(user, SCOPE_ROLES) ? allow : deny(`Scope changes need one of: ${SCOPE_ROLES.join(", ")}.`);
    case "gates.configure":
      return user.roles.includes("AI Governance Committee") ? allow : deny("Only the AI Governance Committee can change operating gates.");
    case "audit.view":
      return allow;
    case "audit.all":
      return user.roles.length ? allow : deny("Owners see events for their own agents and program-wide events.");
    default:
      return deny(`Unknown action ${action}.`);
  }
}

// roles a user may pick as the accountable role for an action (never the owner role)
export const rolesFor = (user, exclude) => user.roles.filter(r => r !== exclude);

export { POLICY_ROLES };
