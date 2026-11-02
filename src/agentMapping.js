/*
 * ARGUS agent mapping rules
 *
 * Which frameworks and policies apply to an agent is decided by transparent
 * rules over the agent's characteristics (set at registration), never by
 * guessing from free text. Every match carries the reason it applies, so a
 * reviewer can judge it and exclude it with a justification if it doesn't fit.
 */
import { FRAMEWORKS, RECOMMENDED_POLICIES } from "./frameworks.js";

export const TRAITS = [
  { id: "consequential", label: "Makes or influences decisions about people", hint: "Hiring, credit, housing, insurance, healthcare, education or access to services" },
  { id: "customerFacing", label: "Interacts with customers, candidates or the public" },
  { id: "personalData", label: "Processes personal data" },
  { id: "euScope", label: "Used in the EU or affects EU residents" },
  { id: "healthData", label: "Accesses health information" },
  { id: "financialData", label: "Accesses financial systems or data" },
  { id: "externalComms", label: "Sends email or messages outside the company" },
  { id: "tools", label: "Calls tools, APIs or other systems" },
  { id: "codeExec", label: "Generates or runs code" },
  { id: "retrieval", label: "Uses a knowledge base or document retrieval" },
  { id: "multiAgent", label: "Coordinates with other agents" },
];
export const traitLabel = id => TRAITS.find(t => t.id === id)?.label ?? id;

const all = () => true;
const has = (...ids) => a => ids.every(id => a.traits?.[id]);
const any = (...ids) => a => ids.some(id => a.traits?.[id]);

const FRAMEWORK_RULES = [
  { id: "nist-ai-rmf", when: all, why: () => "Applies to every AI system in the inventory" },
  { id: "iso-42001", when: all, why: () => "Covered by the AI management system" },
  { id: "oecd", when: all, why: () => "Organization-wide responsible AI principles" },
  { id: "owasp-llm", when: all, why: a => `Built on a large language model (${a.model})` },
  { id: "mitre-atlas", when: all, why: () => "LLM agents are exposed to adversarial AI techniques" },
  { id: "csa-aicm", when: all, why: () => "AI security control baseline" },
  { id: "iso-27001", when: all, why: () => "Organization-wide security baseline" },
  { id: "soc2", when: all, why: () => "Organization-wide security baseline" },
  { id: "owasp-agentic", when: a => a.traits?.tools || a.traits?.multiAgent || a.autonomy !== "Supervised",
    why: a => a.autonomy !== "Supervised" ? `Acts with ${a.autonomy.toLowerCase()}` : a.traits?.tools ? "Calls tools and other systems" : "Coordinates with other agents" },
  { id: "eu-ai-act", when: has("euScope"),
    why: a => a.traits?.consequential ? "Used in the EU for decisions about people (likely high-risk)" : "Used in the EU or affects EU residents" },
  { id: "us-guidance", when: any("consequential", "healthData"),
    why: a => a.traits?.consequential ? "Automated decisions about people (state ADMT and hiring laws)" : "Handles health information (sector rules)" },
  { id: "gdpr", when: has("personalData", "euScope"), why: () => "Processes personal data of EU residents" },
  { id: "hipaa", when: has("healthData"), why: () => "Accesses health information" },
];

const POLICY_RULES = [
  { id: "p9", when: all, why: () => "Every LLM agent processes untrusted input" },
  { id: "p11", when: all, why: () => "Every LLM agent can leak prompts or secrets in output" },
  { id: "p12", when: all, why: () => "Containment applies to every agent" },
  { id: "p13", when: all, why: a => `Runs on a third-party model (${a.model})` },
  { id: "rc-red-team", when: all, why: () => "Every agent is tested before release" },
  { id: "rc-change-control", when: all, why: () => "Every production agent's configuration is change-controlled" },
  { id: "rc-ai-literacy", when: all, why: a => `Owner (${a.owner}) must be trained before activation` },
  { id: "p5", when: a => a.autonomy === "Full autonomy", why: () => "Runs with full autonomy" },
  { id: "p6", when: has("tools"), why: () => "Has system access through tools" },
  { id: "p10", when: has("tools"), why: () => "Calls tools, so tool scope must be limited" },
  { id: "p8", when: has("tools"), why: () => "Calls external APIs" },
  { id: "p1", when: has("personalData"), why: () => "Processes personal data" },
  { id: "p7", when: has("personalData", "euScope"), why: () => "Processes personal data of EU residents" },
  { id: "p3", when: has("healthData"), why: () => "Accesses health information" },
  { id: "p4", when: has("financialData"), why: () => "Accesses financial systems" },
  { id: "p2", when: has("externalComms"), why: () => "Sends messages outside the company" },
  { id: "rc-impact-assessment", when: has("consequential"), why: () => "Makes or influences decisions about people" },
  { id: "rc-human-review", when: has("consequential"), why: () => "Adverse decisions about people need human review" },
  { id: "rc-bias-audit", when: has("consequential"), why: () => "Screens, ranks or scores people" },
  { id: "rc-ai-disclosure", when: any("customerFacing", "consequential"),
    why: a => a.traits?.customerFacing ? "Interacts directly with people" : "Automated decisions require notice" },
  { id: "rc-grounding", when: has("customerFacing"), why: () => "Gives information to customers or the public" },
  { id: "rc-output-validation", when: has("codeExec"), why: () => "Generates or runs code" },
  { id: "rc-data-provenance", when: has("retrieval"), why: () => "Uses a knowledge base" },
  { id: "rc-memory-integrity", when: any("customerFacing", "multiAgent"),
    why: a => a.traits?.multiAgent ? "Shares context with other agents" : "Keeps conversation context with users" },
  { id: "rc-agent-auth", when: has("multiAgent"), why: () => "Coordinates with other agents" },
];

const FW_ORDER = FRAMEWORKS.map(f => f.id);

/*
 * Map an agent against the rules. Returns frameworks and policies, each with
 * the reason it applies and whether the user excluded it.
 * Policy state: "active" (enabled + approved), "draft", "disabled" or "missing"
 * (a recommended control not yet adopted).
 */
export function mapAgent(agent, policies) {
  const ex = agent.exclusions || {};
  const frameworks = FRAMEWORK_RULES
    .filter(r => r.when(agent))
    .map(r => {
      const f = FRAMEWORKS.find(x => x.id === r.id);
      return { key: `fw:${r.id}`, id: r.id, short: f.short, name: f.name, why: r.why(agent), excluded: ex[`fw:${r.id}`] || null };
    })
    .sort((a, b) => FW_ORDER.indexOf(a.id) - FW_ORDER.indexOf(b.id));

  const pols = POLICY_RULES
    .filter(r => r.when(agent))
    .map(r => {
      const p = policies.find(x => x.id === r.id);
      const tpl = RECOMMENDED_POLICIES.find(t => t.id === r.id);
      const state = !p ? "missing" : p.status === "draft" ? "draft" : !p.enabled ? "disabled" : "active";
      return { key: `pol:${r.id}`, id: r.id, name: p?.name ?? tpl?.name ?? r.id, why: r.why(agent), state, template: tpl, excluded: ex[`pol:${r.id}`] || null };
    });

  const inScope = pols.filter(x => !x.excluded);
  return {
    frameworks, policies: pols,
    inScopeFrameworks: frameworks.filter(x => !x.excluded),
    controlsInPlace: inScope.filter(x => x.state === "active").length,
    controlsRequired: inScope.length,
  };
}
