/*
 * ARGUS risk library, scoring and gap assessment
 *
 * Risk scenarios follow a Credo AI-style taxonomy and use Vanta-style
 * likelihood x impact scoring (5 x 5) with three scores:
 *   inherent - before any controls
 *   residual - with the controls currently in place
 *   target   - if every mapped control were in place
 *
 * Every number shown in the app comes from the formulas in this file, so the
 * methodology can be explained line by line.
 */
import { FRAMEWORKS, computeCoverage } from "./frameworks.js";
import { mapAgent } from "./agentMapping.js";

export const RISK_CATEGORIES = [
  "Security", "Privacy", "Fairness & Bias", "Transparency", "Human-AI Interaction",
  "Information Integrity", "AI Agency", "Third Party", "Operational", "Legal & Compliance",
];

const CATEGORY_OWNER = {
  "Security": "Chief Information Security Officer",
  "Privacy": "Chief Privacy Officer / DPO",
  "Fairness & Bias": "Chief Human Resources Officer",
  "Transparency": "Chief Privacy Officer / DPO",
  "Human-AI Interaction": "Chief AI Officer",
  "Information Integrity": "Chief AI Officer",
  "AI Agency": "Chief AI Officer",
  "Third Party": "Chief Risk Officer",
  "Operational": "Chief Technology Officer",
  "Legal & Compliance": "Chief Compliance Officer",
};

export const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
export const IMPACT = ["Negligible", "Minor", "Moderate", "Major", "Severe"];

// Score bands for a 1-25 risk score
export const riskLevel = s => s >= 16 ? "CRITICAL" : s >= 10 ? "HIGH" : s >= 5 ? "MEDIUM" : "LOW";
export const RISK_BANDS = "Low 1–4, Medium 5–9, High 10–15, Critical 16–25";

const all = () => true;
const has = (...ids) => a => ids.every(id => a.traits?.[id]);
const any = (...ids) => a => ids.some(id => a.traits?.[id]);

/*
 * Each control lowers likelihood (l) or impact (i) by the given number of
 * points when the policy is active (enabled and approved) and in scope for the
 * agent. Scores never drop below 1.
 */
const S = (id, category, title, desc, when, l, i, controls, refs) => ({ id, category, title, desc, when, l, i, controls, refs, owner: CATEGORY_OWNER[category] });

export const RISK_SCENARIOS = [
  S("R01", "Security", "Prompt injection hijacks the agent",
    "Instructions hidden in user input, web pages, documents or tool output cause the agent to ignore its rules or act for an attacker.",
    all, 4, 4, [{ id: "p9", l: 2 }, { id: "rc-red-team", l: 1 }, { id: "p10", i: 1 }],
    ["OWASP LLM01", "OWASP ASI01", "ATLAS AML.T0051", "NIST MEASURE 2.7"]),
  S("R02", "Privacy", "Personal data exposed in agent output",
    "The agent reveals personal data to the wrong person or sends it to an unapproved system.",
    has("personalData"), 3, 5, [{ id: "p1", l: 1 }, { id: "p11", l: 1 }],
    ["OWASP LLM02", "ATLAS AML.T0057", "GDPR Art. 32", "ISO 27001 A.5.34"]),
  S("R03", "Security", "System prompt or secrets leaked",
    "The agent discloses its instructions, credentials or keys, helping attackers bypass its controls.",
    all, 3, 3, [{ id: "p11", l: 2 }],
    ["OWASP LLM07", "ATLAS AML.T0056"]),
  S("R04", "AI Agency", "Tool misuse or excessive agency",
    "The agent uses its tools in unintended ways or takes actions beyond its purpose.",
    has("tools"), 4, 4, [{ id: "p10", l: 2 }, { id: "p6", i: 1 }, { id: "p12", i: 1 }, { id: "p5", i: 1 }],
    ["OWASP LLM06", "OWASP ASI02", "ATLAS AML.T0053"]),
  S("R05", "Security", "Privilege escalation through the agent's identity",
    "An attacker or the agent itself gains permissions beyond what was granted.",
    has("tools"), 3, 5, [{ id: "p6", l: 2 }, { id: "p10", i: 1 }],
    ["OWASP ASI03", "CSA AICM IAM", "ISO 27001 A.5.15"]),
  S("R06", "Operational", "Runaway usage and cost",
    "Loops, retries or abuse drive excessive API calls, spend or service degradation.",
    has("tools"), 3, 3, [{ id: "p8", l: 2 }],
    ["OWASP LLM10", "ATLAS AML.T0034.002"]),
  S("R07", "AI Agency", "Compromised or rogue agent keeps operating",
    "An agent that is misbehaving keeps running because nothing detects and stops it.",
    all, 2, 5, [{ id: "p12", i: 2 }, { id: "p5", l: 1 }],
    ["OWASP ASI10", "NIST MANAGE 2.4", "EU AI Act Art. 14"]),
  S("R08", "Third Party", "Third-party model or tool compromised",
    "A model provider, plugin or MCP tool is compromised or changes behavior without notice.",
    all, 2, 4, [{ id: "p13", l: 1 }, { id: "rc-change-control", i: 1 }],
    ["OWASP LLM03", "OWASP ASI04", "ATLAS AML.T0010"]),
  S("R09", "Information Integrity", "Fabricated or inaccurate output relied on",
    "The agent produces confident but false content that people or systems act on.",
    any("sharedOutput", "customerFacing"), 4, 3, [{ id: "rc-grounding", l: 2 }],
    ["OWASP LLM09", "NIST MEASURE 2.5"]),
  S("R10", "Fairness & Bias", "Biased or discriminatory decisions",
    "Decisions about people produce unfair outcomes for protected groups.",
    has("consequential"), 3, 5, [{ id: "rc-bias-audit", l: 2 }, { id: "rc-impact-assessment", i: 1 }],
    ["NIST MEASURE 2.11", "NYC LL 144", "EU AI Act Art. 27"]),
  S("R11", "Human-AI Interaction", "Adverse decisions without human review",
    "People are denied a job, claim or service with no way to reach a human or contest the outcome.",
    has("consequential"), 4, 4, [{ id: "rc-human-review", l: 2 }, { id: "rc-ai-disclosure", i: 1 }],
    ["GDPR Art. 22", "CO SB 26-189", "EU AI Act Art. 14"]),
  S("R12", "Transparency", "People not told they're dealing with AI",
    "Customers or candidates don't know an AI system is involved in the interaction or decision.",
    any("customerFacing", "consequential"), 4, 3, [{ id: "rc-ai-disclosure", l: 3 }],
    ["EU AI Act Art. 50", "CO SB 26-189", "OECD 1.3"]),
  S("R13", "Security", "Knowledge base or data poisoning",
    "Tampered documents or data in the knowledge base change what the agent says or does.",
    has("retrieval"), 3, 4, [{ id: "rc-data-provenance", l: 2 }],
    ["OWASP LLM04", "OWASP LLM08", "ATLAS AML.T0070"]),
  S("R14", "Security", "Memory or context poisoning",
    "Malicious content written to the agent's memory influences later sessions or other users.",
    any("persistentMemory", "multiAgent"), 3, 4, [{ id: "rc-memory-integrity", l: 2 }],
    ["OWASP ASI06", "ATLAS AML.T0080"]),
  S("R15", "Security", "Unsafe output or code execution",
    "Generated code or output is executed or passed downstream without validation.",
    has("codeExec"), 3, 5, [{ id: "rc-output-validation", l: 2, i: 1 }],
    ["OWASP LLM05", "OWASP ASI05"]),
  S("R16", "Security", "Spoofed agent-to-agent messages",
    "A fake or compromised agent sends instructions or data that other agents trust.",
    has("multiAgent"), 3, 4, [{ id: "rc-agent-auth", l: 2 }],
    ["OWASP ASI07"]),
  S("R17", "Legal & Compliance", "Unapproved external communications",
    "The agent emails customers, vendors or the public with content no one approved.",
    has("externalComms"), 4, 3, [{ id: "p2", l: 2 }],
    ["OWASP ASI09", "EU AI Act Art. 14"]),
  S("R18", "Privacy", "Unauthorized access to health records",
    "The agent reads or discloses protected health information without a valid purpose.",
    has("healthData"), 3, 5, [{ id: "p3", l: 2 }],
    ["HIPAA 164.312(a)(1)", "HIPAA 164.502(b)"]),
  S("R19", "Operational", "Unauthorized or erroneous financial transactions",
    "The agent posts, pays or adjusts financial records incorrectly or without authority.",
    has("financialData"), 3, 5, [{ id: "p5", l: 1 }, { id: "p10", l: 1 }, { id: "p4", i: 1 }],
    ["SOC 2 CC6.1", "SOX ITGC"]),
  S("R20", "Privacy", "Personal data kept or used beyond legal limits",
    "EU personal data is retained or reused after deletion requests or beyond its purpose.",
    has("personalData", "euScope"), 3, 4, [{ id: "p7", l: 2 }],
    ["GDPR Art. 17", "GDPR Art. 25"]),
  S("R21", "Operational", "Unreviewed changes to agent configuration",
    "Model, prompt, tool or permission changes reach production without review, changing behavior.",
    all, 3, 3, [{ id: "rc-change-control", l: 2 }],
    ["SOC 2 CC8.1", "NIST GOVERN 1.6"]),
  S("R22", "Human-AI Interaction", "Owners and operators lack AI literacy",
    "The people running the agent don't understand its limits, so problems go unnoticed or are mishandled.",
    all, 3, 2, [{ id: "rc-ai-literacy", l: 2 }],
    ["EU AI Act Art. 4"]),
];

// Full autonomy raises the impact of agency-type risks
const AUTONOMY_IMPACT = { R04: 1, R07: 0, R19: 1 };

/* ---------------- per-agent assessment ---------------- */

// A violation is resolved once its root cause is recorded and the broken control is re-tested.
// Resolved violations stay in the history but no longer count against the agent.
export const isResolved = (agent, e) => !!(e.id && agent.resolutions?.[e.id] && agent.retests?.[e.policy]);

export function assessAgent(agent, policies, mapping = mapAgent(agent, policies), audit = []) {
  const polState = Object.fromEntries(mapping.policies.map(p => [p.id, p]));
  const inScope = id => polState[id] && !polState[id].excluded;
  // a control with a recorded violation by this agent is not working, so it doesn't reduce risk
  const violated = new Set(audit.filter(e => e.agent === agent.name && e.type === "Policy Violation" && e.policy && !isResolved(agent, e)).map(e => e.policy));
  const active = id => inScope(id) && polState[id].state === "active" && !violated.has(id);
  const fullAuto = agent.autonomy === "Full autonomy";

  return RISK_SCENARIOS.filter(s => s.when(agent)).map(s => {
    const iBoost = fullAuto ? (AUTONOMY_IMPACT[s.id] || 0) : 0;
    const L = s.l, I = Math.min(5, s.i + iBoost);
    const controls = s.controls.filter(c => inScope(c.id)).map(c => ({
      ...c, name: polState[c.id].name, state: polState[c.id].state, template: polState[c.id].template,
      active: active(c.id), violated: violated.has(c.id),
    }));
    const reduce = list => ({
      l: Math.max(1, L - list.reduce((n, c) => n + (c.l || 0), 0)),
      i: Math.max(1, I - list.reduce((n, c) => n + (c.i || 0), 0)),
    });
    const res = reduce(controls.filter(c => c.active));
    const tgt = reduce(controls);
    return {
      ...s, autonomyBoost: iBoost,
      inherent: { l: L, i: I, score: L * I },
      residual: { ...res, score: res.l * res.i },
      target: { ...tgt, score: tgt.l * tgt.i },
      controls,
    };
  });
}

/*
 * Agent risk score (0-100):
 *   average of the agent's three highest residual risk scores, scaled to 100 (x4)
 *   + 15 points per critical policy violation and 5 per warning on record (max 40)
 * A control the agent has violated is treated as not working when residual risk is scored.
 */
export const AGENT_SCORE_METHOD = "Average of the agent's three highest residual risk scores (each out of 25) scaled to 100, plus 15 points per open critical policy violation and 5 per open warning (up to 40), capped at 100. A control the agent has violated doesn't count toward reducing its risk until it is re-tested. Resolved violations stay in the history but stop counting.";

export function scoreAgent(agent, policies, audit) {
  const mapping = mapAgent(agent, policies);
  const risks = assessAgent(agent, policies, mapping, audit);
  const top = [...risks].map(r => r.residual.score).sort((a, b) => b - a).slice(0, 3);
  const base = top.length ? (top.reduce((a, b) => a + b, 0) / top.length) * 4 : 0;
  const violations = audit.filter(e => e.agent === agent.name && e.type === "Policy Violation" && !isResolved(agent, e));
  const crit = violations.filter(e => e.sev === "critical").length;
  const warn = violations.filter(e => e.sev === "warn").length;
  const incidents = Math.min(40, crit * 15 + warn * 5);
  const score = Math.min(100, Math.round(base + incidents));
  const risk = score >= 80 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  return { score, risk, scoreBreakdown: { top, base: Math.round(base), crit, warn, incidents }, risks, mapping };
}

/* ---------------- organization risk register ---------------- */

export function buildRegister(scoredAgents) {
  return RISK_SCENARIOS.map(s => {
    const hits = scoredAgents
      .map(a => ({ agent: a, r: a.risks.find(x => x.id === s.id) }))
      .filter(x => x.r);
    if (!hits.length) return { ...s, agents: [], applicable: false };
    const worst = key => hits.reduce((m, h) => (h.r[key].score > m[key].score ? h.r : m), hits[0].r);
    return {
      ...s, applicable: true,
      agents: hits.map(h => ({ id: h.agent.id, name: h.agent.name, inherent: h.r.inherent, residual: h.r.residual, target: h.r.target, controls: h.r.controls })),
      inherent: worst("inherent").inherent,
      residual: worst("residual").residual,
      target: worst("target").target,
      worstAgent: hits.reduce((m, h) => (h.r.residual.score > m.r.residual.score ? h : m), hits[0]).agent.name,
    };
  }).filter(s => s.applicable);
}

/* ---------------- gap assessment ---------------- */

export const GAP_STATUS = ["Met", "Partially met", "Not met", "Not applicable"];

/*
 * Requirement status, worked out from the evidence:
 *   Met            - always-on platform capability, or an approved, enabled policy with a document on file
 *   Partially met  - approved policy without a document, or a policy still in draft
 *   Not met        - no control mapped, or the mapped policy is turned off
 *   Not applicable - no registered agent is in scope for the framework, or marked N/A with a reason
 */
export function gapAssessment(reqMap, policies, scoredAgents, overrides = {}) {
  const cov = computeCoverage(reqMap, policies);
  const byId = Object.fromEntries(policies.map(p => [p.id, p]));
  const inScopeAgents = fwId => scoredAgents.filter(a => a.mapping.inScopeFrameworks.some(f => f.id === fwId));

  return cov.frameworks.map(f => {
    // program-level frameworks (maturity models) apply whenever any agent is registered
    const agents = f.maturity ? scoredAgents : inScopeAgents(f.id);
    const rows = f.reqs.map(req => {
      const ov = overrides[req.key] || {};
      const pols = req.refs.filter(r => !r.startsWith("cap:")).map(r => byId[r]).filter(Boolean);
      const caps = req.refs.filter(r => r.startsWith("cap:"));
      const live = pols.filter(p => p.enabled && p.status !== "draft");
      const withDoc = live.filter(p => p.doc);
      let status, basis;
      if (!agents.length) { status = "Not applicable"; basis = "No registered agent is in scope for this framework"; }
      else if (ov.na) { status = "Not applicable"; basis = `Marked not applicable: ${ov.na.reason}`; }
      else if (caps.length || withDoc.length) {
        status = "Met";
        basis = withDoc.length ? `Approved policy with evidence: ${withDoc[0].name}` : "Always-on platform capability with system-generated evidence";
      } else if (live.length) { status = "Partially met"; basis = `${live[0].name} is approved but no evidence document is on file`; }
      else if (pols.some(p => p.status === "draft")) { status = "Partially met"; basis = `${pols.find(p => p.status === "draft").name} is drafted and awaiting approval`; }
      else if (pols.length) { status = "Not met"; basis = `${pols[0].name} is turned off`; }
      else { status = "Not met"; basis = "No control mapped"; }
      return { ...req, framework: f, fwInScope: agents.length > 0, status, basis, policies: pols, owner: ov.owner || "", due: ov.due || "", na: ov.na || null };
    });
    const count = st => rows.filter(r => r.status === st).length;
    const applicable = rows.length - count("Not applicable");
    return {
      ...f, agents, rows,
      met: count("Met"), partial: count("Partially met"), notMet: count("Not met"), na: count("Not applicable"),
      score: applicable ? Math.round(((count("Met") + count("Partially met") * 0.5) / applicable) * 100) : null,
    };
  });
}

export const GAP_SCORE_METHOD = "Met counts as 1, Partially met as 0.5 and Not met as 0, divided by the applicable requirements. Not applicable requirements are left out.";

export const frameworkName = id => FRAMEWORKS.find(f => f.id === id)?.name ?? id;
