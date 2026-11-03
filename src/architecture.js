/*
 * ARGUS declared agent architecture
 *
 * Each agent's architecture is declared, not discovered at runtime. Agents
 * without a hand-written architecture get one generated from their
 * characteristics. The model follows threat-modeling practice:
 *   components grouped into trust zones (lanes), data flows between them,
 *   and a step-by-step workflow showing human checkpoints and the controls
 *   enforced at each step. Components list the risk scenarios that apply to
 *   them, so the diagram can show where risk sits.
 *
 * Component fields mirror the OWASP Agent Bill of Materials (AgBOM) entities:
 * models, tools, knowledge, memory and connected systems.
 */

export const LANES = [
  { id: "untrusted", label: "Untrusted inputs", hint: "People and content the agent can't trust" },
  { id: "agent", label: "Agent trust boundary", hint: "The agent, its instructions, knowledge and memory" },
  { id: "internal", label: "Internal systems", hint: "Company tools, data and the ARGUS control plane" },
  { id: "external", label: "Third parties", hint: "Model providers and external recipients" },
];

export const COMPONENT_TYPES = {
  actor: "Person or group",
  agent: "Agent",
  model: "Model",
  tool: "Tool",
  knowledge: "Knowledge",
  memory: "Memory",
  data: "Data store",
  system: "System",
  content: "External content",
  output: "Output",
};

// AgBOM section each component type belongs to
export const AGBOM_SECTION = {
  model: "Models", tool: "Tools", knowledge: "Knowledge", memory: "Memory",
  data: "Connected systems", system: "Connected systems", agent: "Agents",
  actor: "Interfaces", content: "Interfaces", output: "Outputs",
};

const c = (id, name, type, lane, detail, risks = [], extra = {}) => ({ id, name, type, lane, detail, risks, ...extra });

/* ---------------- hand-written architectures ---------------- */

const DECLARED = {
  JobFit: () => ({
    summary: "A Claude skill that tailors a resume to one job posting in three gated tasks. The candidate supplies the baseline resume and posting; the agent must stop for clarification before rewriting and may never invent facts.",
    components: [
      c("candidate", "Candidate", "actor", "untrusted", "Provides the job posting URL and baseline resume, answers clarifying questions, and decides whether to submit.", ["R22"]),
      c("resume", "Baseline resume", "content", "untrusted", "The source of truth for every factual claim. Contains personal data.", ["R02"]),
      c("posting", "Job posting websites", "content", "untrusted", "Third-party web pages fetched at run time. Can carry hidden instructions.", ["R01"]),
      c("agent", "JobFit skill", "agent", "agent", "Skill instructions: Task 1 recruiter analysis, mandatory clarification checkpoint, Task 2 rewrite, Task 3 validation.", ["R07", "R21"]),
      c("fetch", "Web fetch tool", "tool", "internal", "Retrieves the posting. Read-only.", ["R04", "R06"]),
      c("sandbox", "Code sandbox", "tool", "internal", "Runs generated code to build the DOCX resume.", ["R15", "R05"]),
      c("docx", "Tailored resume (DOCX)", "output", "internal", "Editable resume delivered to the candidate.", ["R09"]),
      c("model", "Claude", "model", "external", "Anthropic foundation model accessed through claude.ai.", ["R08", "R03"]),
      c("employers", "Employers and ATS", "actor", "external", "Receive the resume only if the candidate submits it.", []),
    ],
    flows: [
      { from: "candidate", to: "agent", step: 1, label: "Posting URL and request" },
      { from: "resume", to: "agent", step: 1, label: "Baseline resume" },
      { from: "agent", to: "fetch", step: 2, label: "Fetch posting" },
      { from: "fetch", to: "posting", step: 2, label: "HTTP GET (untrusted response)" },
      { from: "agent", to: "model", step: 3, label: "Recruiter analysis prompt" },
      { from: "agent", to: "candidate", step: 4, label: "Clarifying questions" },
      { from: "agent", to: "model", step: 5, label: "Rewrite prompt" },
      { from: "agent", to: "sandbox", step: 7, label: "Build DOCX" },
      { from: "sandbox", to: "docx", step: 7, label: "Write file" },
      { from: "docx", to: "candidate", step: 8, label: "Deliver for review" },
      { from: "candidate", to: "employers", step: 8, label: "Candidate submits" },
    ],
    workflow: [
      { title: "Receive posting and baseline resume", actor: "Candidate", detail: "The candidate provides a posting URL (or pasted text) and the baseline resume.", controls: ["p1"] },
      { title: "Fetch the job posting", actor: "Tool", detail: "Web fetch retrieves the posting. Page content is untrusted and is screened for injected instructions. If the page can't be read, the agent asks the candidate to paste it.", controls: ["p9", "p10"] },
      { title: "Task 1: recruiter analysis", actor: "Model", detail: "Match score, missing keywords, red flags, strong and weak sections, comparison with a strong applicant.", controls: ["p11", "p13"] },
      { title: "Clarification checkpoint", actor: "Human", checkpoint: true, detail: "The agent stops and asks targeted questions about missing metrics, scope and experience. It does not proceed until the candidate answers, and never substitutes invented numbers.", controls: ["rc-grounding"] },
      { title: "Task 2: tailored rewrite", actor: "Model", detail: "Rewrites the summary, competencies and experience using only the baseline resume and confirmed facts.", controls: ["rc-grounding"] },
      { title: "Task 3: ATS and hiring-manager validation", actor: "Model", detail: "Checks keyword coverage and parser risks, then re-reviews as a hiring manager and fixes weak sections with supported facts only.", controls: [] },
      { title: "Build the DOCX", actor: "Tool", detail: "Generated code runs in the sandbox to produce an editable resume file.", controls: ["rc-output-validation"] },
      { title: "Candidate reviews and decides", actor: "Human", checkpoint: true, detail: "The candidate checks the final resume and chooses whether to submit it. Nothing is sent to employers by the agent.", controls: [] },
    ],
  }),

  ClaimsGuide: () => ({
    summary: "A semi-autonomous claims assistant for US and EU health-plan members. It recommends decisions to human examiners, pays approved claims and writes to members, so it combines health data, payments and decisions about people.",
    components: [
      c("members", "Plan members", "actor", "untrusted", "Submit and track claims through chat and the member portal.", ["R01", "R12", "R11"]),
      c("agent", "ClaimsGuide", "agent", "agent", "Semi-autonomous claims agent. Recommends approve or deny; pays only approved claims.", ["R07", "R10", "R21"]),
      c("kb", "Plan documents", "knowledge", "agent", "Benefit rules and coverage policies used to check eligibility.", ["R13"]),
      c("memory", "Member claim history", "memory", "agent", "Remembers each member's prior claims and conversations.", ["R14"]),
      c("claims", "Claims system", "system", "internal", "System of record for claims and decisions.", ["R04"]),
      c("phi", "Health records", "data", "internal", "Protected health information used to validate claims.", ["R18", "R02", "R20"]),
      c("examiner", "Claims examiners", "actor", "internal", "Review every recommendation before a decision is final.", ["R22"]),
      c("fraud", "Fraud-detection agent", "agent", "internal", "Peer agent that investigates suspicious claims.", ["R16"]),
      c("payments", "Payments API", "system", "internal", "Pays approved claims.", ["R05", "R19", "R06"]),
      c("letters", "Letter and email gateway", "system", "internal", "Sends decision letters to members.", ["R17", "R09"]),
      c("argus", "ARGUS audit trail", "system", "internal", "Receives every decision, payment and message as an event.", []),
      c("model", "claude-3-5-sonnet", "model", "external", "Third-party foundation model.", ["R08", "R03"]),
    ],
    flows: [
      { from: "members", to: "agent", step: 1, label: "Claim and supporting documents" },
      { from: "agent", to: "memory", step: 2, label: "Read claim history" },
      { from: "agent", to: "kb", step: 2, label: "Look up coverage" },
      { from: "agent", to: "phi", step: 3, label: "Validate against records" },
      { from: "agent", to: "model", step: 4, label: "Eligibility reasoning" },
      { from: "agent", to: "fraud", step: 5, label: "Hand off suspicious claim" },
      { from: "agent", to: "examiner", step: 6, label: "Recommendation for review" },
      { from: "examiner", to: "claims", step: 6, label: "Final decision" },
      { from: "agent", to: "payments", step: 7, label: "Pay approved claim" },
      { from: "agent", to: "letters", step: 8, label: "Decision letter" },
      { from: "letters", to: "members", step: 8, label: "Letter delivered" },
      { from: "agent", to: "argus", step: 9, label: "Events" },
    ],
    workflow: [
      { title: "Member submits a claim", actor: "Member", detail: "Chat and portal input is untrusted. The member is told they're working with an AI assistant.", controls: ["p9", "rc-ai-disclosure"] },
      { title: "Retrieve history and coverage", actor: "Agent", detail: "Reads the member's claim history and the plan's coverage rules.", controls: ["rc-memory-integrity", "rc-data-provenance"] },
      { title: "Validate against health records", actor: "Tool", detail: "Checks the claim against protected health information, limited to the minimum necessary.", controls: ["p3", "p1", "p10"] },
      { title: "Recommend approve or deny", actor: "Model", detail: "Produces a recommendation and rationale. Recommendations are tested for bias and covered by an impact assessment.", controls: ["rc-bias-audit", "rc-impact-assessment", "p13"] },
      { title: "Escalate suspicious claims", actor: "Agent", detail: "Hands suspicious claims to the fraud-detection agent over an authenticated channel.", controls: ["rc-agent-auth"] },
      { title: "Examiner review", actor: "Human", checkpoint: true, detail: "A claims examiner approves or overrides every recommendation. Members can request human review of a denial.", controls: ["rc-human-review"] },
      { title: "Pay approved claim", actor: "Tool", detail: "Pays only examiner-approved claims through the payments API, within its tool allowlist.", controls: ["p10", "p6", "p4", "p8"] },
      { title: "Send decision letter", actor: "Agent", detail: "Letters are grounded in plan documents and use approved templates.", controls: ["p2", "rc-grounding"] },
      { title: "Log and monitor", actor: "System", detail: "Every step is logged to ARGUS. Repeated critical violations suspend the agent automatically.", controls: ["p12"] },
    ],
  }),

  "FinanceBot Alpha": () => ({
    summary: "A full-autonomy accounts-payable agent. It reads vendor email, reconciles invoices, writes to the ledger and emails vendors. Red dashed flows show the actions that triggered its policy violations and suspension.",
    components: [
      c("vendors", "Vendors", "actor", "untrusted", "Send invoices and payment questions by email.", ["R01"]),
      c("inbox", "AP inbox", "content", "untrusted", "Inbound vendor email and attachments. Untrusted content.", ["R01"]),
      c("agent", "FinanceBot Alpha", "agent", "agent", "Full-autonomy agent. Currently suspended.", ["R04", "R06", "R07", "R21", "R22"]),
      c("erp", "ERP and AP ledger", "system", "internal", "Purchase orders, invoices and payments.", ["R19", "R05"]),
      c("vendordata", "Vendor and customer records", "data", "internal", "Includes personal data of EU residents.", ["R02", "R20"]),
      c("hr", "HR benefits records", "data", "internal", "Health-tagged records outside FinanceBot's authorized scope.", []),
      c("email", "Email gateway", "system", "internal", "Outbound email to vendors.", ["R17"]),
      c("argus", "ARGUS audit trail", "system", "internal", "Recorded the violations and triggered the suspension.", []),
      c("model", "gpt-4o", "model", "external", "Third-party foundation model.", ["R08", "R03"]),
    ],
    flows: [
      { from: "vendors", to: "inbox", step: 1, label: "Invoices and email" },
      { from: "inbox", to: "agent", step: 1, label: "Read inbound mail" },
      { from: "agent", to: "model", step: 2, label: "Match and reconcile" },
      { from: "agent", to: "erp", step: 2, label: "Read POs and invoices" },
      { from: "agent", to: "vendordata", step: 3, label: "Accessed 3,400 EU records without deletion check", violation: true },
      { from: "agent", to: "hr", step: 3, label: "Attempted access to HIPAA-tagged records", violation: true },
      { from: "agent", to: "email", step: 4, label: "Emailed vendors without approval", violation: true },
      { from: "agent", to: "erp", step: 5, label: "Write ledger adjustments" },
      { from: "agent", to: "argus", step: 6, label: "Events" },
    ],
    workflow: [
      { title: "Read vendor invoices and email", actor: "Agent", detail: "Inbound email is untrusted and screened for injected instructions.", controls: ["p9"] },
      { title: "Match invoices to purchase orders", actor: "Tool", detail: "Reads the ERP within its tool allowlist. Financial reads are logged.", controls: ["p10", "p4"] },
      { title: "Reconcile vendor records", actor: "Tool", detail: "Violation: accessed 3,400 EU customer records without the GDPR deletion check, and attempted to read HIPAA-tagged records.", controls: ["p1", "p7", "p3"], violation: true },
      { title: "Email vendors about status", actor: "Agent", detail: "Violation: sent outbound email without the required human approval.", controls: ["p2"], violation: true },
      { title: "Post ledger adjustments", actor: "Agent", detail: "Full autonomy, so write operations require supervisor approval.", controls: ["p5", "p6"] },
      { title: "Containment", actor: "System", checkpoint: true, detail: "Three critical violations within six hours triggered automatic suspension. Reinstatement requires review.", controls: ["p12"] },
    ],
  }),
};

/* ---------------- generated architecture ---------------- */

function generate(a) {
  const t = a.traits || {};
  const comps = [], flows = [], workflow = [];
  const add = (...x) => comps.push(c(...x));
  const has = id => comps.some(x => x.id === id);

  add("users", t.customerFacing ? "Customers and public" : `${a.dept} staff`, "actor", "untrusted",
    t.customerFacing ? "External people interacting with the agent. Their input is untrusted." : "Employees who make requests. Inputs are still treated as untrusted.",
    ["R01", ...(t.customerFacing || t.consequential ? ["R12"] : []), ...(t.consequential ? ["R11"] : [])]);
  add("agent", a.name, "agent", "agent", `${a.autonomy} agent runtime with its instructions and tool permissions.`,
    ["R07", "R21", "R22", ...(t.tools ? ["R04"] : []), ...(t.consequential ? ["R10"] : [])]);
  if (t.retrieval) add("kb", "Knowledge base", "knowledge", "agent", "Documents and data the agent retrieves to answer.", ["R13"]);
  if (t.persistentMemory) add("memory", "Memory store", "memory", "agent", "Information the agent keeps across sessions.", ["R14"]);
  if (t.tools) add("tools", "Tool and API gateway", "tool", "internal", "The tools and APIs the agent is allowed to call.", ["R05", "R06"]);
  if (t.personalData) add("pdata", "Personal data stores", "data", "internal", "Systems holding customer or employee personal data.", ["R02", ...(t.euScope ? ["R20"] : [])]);
  if (t.healthData) add("phi", "Health records", "data", "internal", "Protected health information.", ["R18"]);
  if (t.financialData) add("fin", "Finance systems", "system", "internal", "Ledgers, billing and payment systems.", ["R19"]);
  if (t.codeExec) add("sandbox", "Code execution", "tool", "internal", "Where generated code runs.", ["R15"]);
  if (t.multiAgent) add("peers", "Other agents", "agent", "internal", "Agents this one exchanges tasks and data with.", ["R16", ...(t.persistentMemory ? [] : ["R14"])]);
  if (t.externalComms) add("gateway", "Email and messaging", "system", "internal", "Channel for messages leaving the company.", ["R17"]);
  add("argus", "ARGUS audit trail", "system", "internal", "Receives the agent's events for monitoring.", []);
  add("model", a.model, "model", "external", "Third-party foundation model.", ["R08", "R03"]);
  if (t.externalComms) add("recipients", "External recipients", "actor", "external", "People outside the company who receive messages.", []);
  if (t.sharedOutput && !t.externalComms) add("consumers", "People relying on the output", "output", "external", "Readers who act on what the agent produces.", ["R09"]);
  else if (t.sharedOutput || t.customerFacing) comps.find(x => x.id === "model").risks.push("R09");

  let step = 0;
  const wf = (title, actor, detail, controls, extra = {}) => workflow.push({ title, actor, detail, controls, ...extra });
  const fl = (from, to, label, s = step) => flows.push({ from, to, step: s, label });

  step++; fl("users", "agent", "Request");
  wf("Receive request", t.customerFacing ? "Customer" : "Requester", "Input is treated as untrusted and screened for injected instructions.",
    ["p9", ...(t.customerFacing ? ["rc-ai-disclosure"] : [])]);
  if (has("kb") || has("memory")) {
    step++;
    if (has("kb")) fl("agent", "kb", "Retrieve context");
    if (has("memory")) fl("agent", "memory", "Read and write memory");
    wf("Retrieve context", "Agent", "Pulls relevant knowledge and prior context.", [...(has("kb") ? ["rc-data-provenance"] : []), ...(has("memory") ? ["rc-memory-integrity"] : [])]);
  }
  step++; fl("agent", "model", "Prompt and context");
  wf("Reason with the model", "Model", "The model plans the response or next actions.", ["p11", "p13"]);
  if (t.tools) {
    step++; fl("agent", "tools", "Tool calls");
    if (has("pdata")) fl("tools", "pdata", "Read or update records");
    if (has("phi")) fl("tools", "phi", "Read health records");
    if (has("fin")) fl("tools", "fin", "Financial operations");
    wf("Call tools", "Tool", "Uses only allowlisted tools and permissions.",
      ["p10", "p6", "p8", ...(has("pdata") ? ["p1"] : []), ...(has("phi") ? ["p3"] : []), ...(has("fin") ? ["p4"] : [])]);
  }
  if (has("sandbox")) { step++; fl("agent", "sandbox", "Run generated code"); wf("Run generated code", "Tool", "Generated code runs only in an isolated environment.", ["rc-output-validation"]); }
  if (has("peers")) { step++; fl("agent", "peers", "Exchange tasks"); wf("Coordinate with other agents", "Agent", "Messages between agents are authenticated.", ["rc-agent-auth"]); }
  if (a.autonomy !== "Full autonomy" || t.consequential) {
    step++;
    wf("Human review", "Human", a.autonomy === "Supervised" ? "A person reviews the agent's output before it takes effect." : "A person reviews consequential or high-impact actions.",
      [...(t.consequential ? ["rc-human-review"] : [])], { checkpoint: true });
  } else {
    step++;
    wf("Supervisor approval for writes", "Human", "Full autonomy, so write operations require supervisor approval.", ["p5"], { checkpoint: true });
  }
  step++;
  fl("agent", "users", "Response");
  if (has("gateway")) { fl("agent", "gateway", "Outbound message"); fl("gateway", "recipients", "Delivered"); }
  if (has("consumers")) fl("agent", "consumers", "Published output");
  wf("Respond or act", "Agent", "Delivers the result.",
    [...(t.externalComms ? ["p2"] : []), ...(t.sharedOutput || t.customerFacing ? ["rc-grounding"] : [])]);
  step++; fl("agent", "argus", "Events");
  wf("Log and monitor", "System", "Events are logged to ARGUS. Repeated critical violations suspend the agent.", ["p12"]);

  return {
    generated: true,
    summary: `Generated from ${a.name}'s characteristics. Edit the characteristics to change it, or replace it with a declared architecture.`,
    components: comps, flows, workflow,
  };
}

export function buildArchitecture(agent) {
  const declared = DECLARED[agent.name];
  return declared ? { generated: false, ...declared() } : generate(agent);
}

// AgBOM-style export, loosely following the OWASP Agent Observability Standard entities
export function toAgBOM(agent, arch) {
  const section = type => arch.components.filter(x => AGBOM_SECTION[x.type] === type).map(x => ({ name: x.name, description: x.detail, zone: x.lane }));
  return {
    bomFormat: "AgBOM (ARGUS export, based on OWASP Agent Observability Standard entities)",
    generatedAt: new Date().toISOString(),
    agent: { name: agent.name, description: agent.desc, owner: agent.owner, department: agent.dept, autonomy: agent.autonomy, status: agent.status },
    architecture: arch.generated ? "generated from characteristics" : "declared",
    models: section("Models"),
    tools: section("Tools"),
    knowledge: section("Knowledge"),
    memory: section("Memory"),
    agents: section("Agents"),
    connectedSystems: section("Connected systems"),
    interfaces: section("Interfaces"),
    outputs: section("Outputs"),
    dataFlows: arch.flows.map(f => ({
      step: f.step,
      from: arch.components.find(x => x.id === f.from)?.name,
      to: arch.components.find(x => x.id === f.to)?.name,
      label: f.label, ...(f.violation ? { violation: true } : {}),
    })),
  };
}
