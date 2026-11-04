/*
 * ARGUS framework catalog
 *
 * Each framework lists a curated set of requirements that are in scope for
 * governing AI agents. This is a representative crosswalk for the demo, not
 * a complete reproduction of any framework.
 *
 * A requirement is covered when an always-on platform capability or at least
 * one enabled, approved policy is mapped to it. Requirements with neither are gaps.
 *
 * Status notes were checked against sources on Nov 3, 2026; see regulatory.js for
 * each claim, its source and its verification status.
 */

// Always-on platform capabilities (not toggleable like policies)
export const CAPABILITIES = {
  registry: "Agent Registry",
  audit: "Audit Trail",
  risk: "Risk Scoring",
};

export const FRAMEWORK_GROUPS = [
  { id: "regulation", label: "AI Regulation" },
  { id: "standard", label: "AI Standards & Principles" },
  { id: "security", label: "AI Security & Threats" },
  { id: "baseline", label: "Security & Privacy Baseline" },
];

// r(id, title, coveredBy) — coveredBy holds policy ids ("p9") and capability ids ("cap:audit")
const r = (id, title, coveredBy = []) => ({ id, title, coveredBy });

export const FRAMEWORKS = [
  /* ---------- AI regulation ---------- */
  {
    id: "eu-ai-act",
    short: "EU AI Act",
    name: "EU Artificial Intelligence Act",
    group: "regulation",
    source: "Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744 (Digital Omnibus on AI)",
    note: "The Digital Omnibus on AI (Regulation (EU) 2026/1744, in force July 27, 2026) moves Annex III high-risk obligations from Aug 2, 2026 to Dec 2, 2027, and Annex I product-regulated systems to Aug 2, 2028. Article 4 still requires providers and deployers to take measures supporting AI literacy, in softer wording than before. Transparency duties under Article 50 apply from Aug 2, 2026.",
    requirements: [
      r("Art. 4", "Measures supporting AI literacy of staff operating AI systems"),
      r("Art. 9", "Risk management system across the AI lifecycle", ["cap:risk", "p5"]),
      r("Art. 12", "Record-keeping through automatic event logs", ["cap:audit", "p4"]),
      r("Art. 14", "Human oversight, including ability to intervene or halt", ["p2", "p5", "p12"]),
      r("Art. 15", "Accuracy, robustness and cybersecurity", ["p9", "p11"]),
      r("Art. 26", "Deployer obligations: monitor operation, retain logs", ["cap:registry", "cap:audit"]),
      r("Art. 27", "Fundamental rights impact assessment"),
      r("Art. 50", "Transparency when people interact with AI"),
    ],
  },
  {
    id: "us-guidance",
    short: "US Regulatory",
    name: "US Regulatory Guidance",
    group: "regulation",
    source: "State and federal requirements",
    note: "Colorado SB 26-189 (signed May 14, 2026) replaced the 2024 Colorado AI Act with a narrower automated decision-making law effective Jan 1, 2027. No comprehensive federal AI statute; obligations come from state laws and existing agency authority.",
    requirements: [
      r("CO SB 26-189", "Notice when automated decision-making influences a consequential decision"),
      r("CO SB 26-189", "Meaningful human review of adverse decisions on request"),
      r("CO SB 26-189", "Retain decision records for at least three years", ["cap:audit"]),
      r("NYC LL 144", "Independent bias audit for automated employment decision tools"),
      r("HIPAA (sector)", "Safeguards for protected health information accessed by AI", ["p3"]),
    ],
  },

  /* ---------- AI standards & principles ---------- */
  {
    id: "nist-ai-rmf",
    short: "NIST AI RMF",
    name: "NIST AI Risk Management Framework",
    group: "standard",
    source: "NIST AI 100-1 (Govern, Map, Measure, Manage)",
    note: "Voluntary US framework; the de facto vocabulary for enterprise AI risk programs. Generative AI Profile published as NIST AI 600-1. NIST says AI RMF 1.0 is being revised under the White House AI Action Plan; no revised version had been published as of November 2026.",
    requirements: [
      r("GOVERN 1.6", "Mechanisms to inventory AI systems", ["cap:registry"]),
      r("GOVERN 6.1", "Policies for third-party AI risks", ["p13"]),
      r("MAP 1.1", "Intended purpose and context of use documented", ["cap:registry"]),
      r("MEASURE 2.7", "Security and resilience evaluated", ["p9"]),
      r("MEASURE 2.11", "Fairness and bias evaluated"),
      r("MANAGE 2.4", "Mechanisms to supersede, disengage or deactivate AI systems", ["p12"]),
      r("MANAGE 4.1", "Post-deployment monitoring", ["cap:audit", "cap:risk"]),
    ],
  },
  {
    id: "iso-42001",
    short: "ISO 42001",
    name: "ISO/IEC 42001 AI Management System",
    group: "standard",
    source: "ISO/IEC 42001:2023",
    note: "The certifiable AI management system standard. Requirements below draw on clause 6 and Annex A controls.",
    requirements: [
      r("Cl. 6.1", "Actions to address AI risks and opportunities", ["cap:risk"]),
      r("A.5.2", "AI system impact assessment process"),
      r("A.6.2.6", "AI system operation and monitoring", ["cap:audit", "p8"]),
      r("A.6.2.8", "AI system recording of event logs", ["cap:audit"]),
      r("A.9.2", "Processes for responsible use of AI systems", ["p2", "p5"]),
      r("A.10.3", "Supplier management for AI components", ["p13"]),
    ],
  },
  {
    id: "oecd",
    short: "OECD AI",
    name: "OECD AI Principles",
    group: "standard",
    source: "OECD Recommendation on AI (2019, updated 2024)",
    note: "Values-based principles adopted by OECD members and adherents; the conceptual basis for many national AI policies.",
    requirements: [
      r("1.1", "Inclusive growth, sustainable development and well-being"),
      r("1.2", "Human rights and democratic values, including fairness and privacy", ["p1", "p3"]),
      r("1.3", "Transparency and explainability", ["cap:audit"]),
      r("1.4", "Robustness, security and safety", ["p9", "p12"]),
      r("1.5", "Accountability", ["cap:registry"]),
    ],
  },

  /* ---------- AI security & threats ---------- */
  {
    id: "owasp-llm",
    short: "OWASP LLM",
    name: "OWASP Top 10 for LLM Applications",
    group: "security",
    source: "OWASP GenAI Security Project, 2025 edition",
    note: "The most widely cited LLM application risk list.",
    requirements: [
      r("LLM01", "Prompt Injection", ["p9"]),
      r("LLM02", "Sensitive Information Disclosure", ["p1", "p11"]),
      r("LLM03", "Supply Chain", ["p13"]),
      r("LLM04", "Data and Model Poisoning"),
      r("LLM05", "Improper Output Handling"),
      r("LLM06", "Excessive Agency", ["p10", "p5"]),
      r("LLM07", "System Prompt Leakage", ["p11"]),
      r("LLM08", "Vector and Embedding Weaknesses"),
      r("LLM09", "Misinformation"),
      r("LLM10", "Unbounded Consumption", ["p8"]),
    ],
  },
  {
    id: "owasp-agentic",
    short: "OWASP Agentic",
    name: "OWASP Top 10 for Agentic Applications",
    group: "security",
    source: "OWASP GenAI Security Project, 2026 edition (Dec 9, 2025)",
    note: "Risks specific to autonomous agents: goal hijacking, tool misuse, privilege abuse and rogue behavior.",
    requirements: [
      r("ASI01", "Agent Goal Hijack", ["p9"]),
      r("ASI02", "Tool Misuse & Exploitation", ["p10"]),
      r("ASI03", "Identity & Privilege Abuse", ["p6"]),
      r("ASI04", "Agentic Supply Chain Vulnerabilities", ["p13"]),
      r("ASI05", "Unexpected Code Execution (RCE)"),
      r("ASI06", "Memory & Context Poisoning"),
      r("ASI07", "Insecure Inter-Agent Communication"),
      r("ASI08", "Cascading Failures", ["p12"]),
      r("ASI09", "Human-Agent Trust Exploitation", ["p2"]),
      r("ASI10", "Rogue Agents", ["p12", "cap:registry"]),
    ],
  },
  {
    id: "csa-aicm",
    short: "CSA AICM",
    name: "CSA AI Controls Matrix",
    group: "security",
    source: "Cloud Security Alliance, AICM v1.1 (247 control objectives, 18 domains)",
    note: "Mapped at domain level. AICM maps onward to ISO/IEC 42001, the EU AI Act, NIST AI RMF and NIST AI 600-1.",
    requirements: [
      r("GRC", "Governance, Risk & Compliance", ["cap:risk"]),
      r("IAM", "Identity & Access Management", ["p6", "p10"]),
      r("DSP", "Data Security & Privacy Lifecycle Management", ["p1", "p7"]),
      r("LOG", "Logging & Monitoring", ["cap:audit"]),
      r("MDS", "Model Security", ["p9", "p11"]),
      r("STA", "Supply Chain Management, Transparency & Accountability", ["p13"]),
      r("SEF", "Security Incident Management", ["p12"]),
      r("TVM", "Threat & Vulnerability Management"),
    ],
  },
  {
    id: "csa-aismm",
    short: "CSA AISMM",
    name: "CSA AI Security Maturity Model",
    group: "security",
    source: "Cloud Security Alliance (released May 19, 2026)",
    note: "Program-level model with five maturity levels (L1 Initial to L5 Efficient), aligned with the AI Controls Matrix and structured like CSA's Cloud Security Maturity Model. CSA calls it a living document that will be revised, so ARGUS shows indicative capability evidence, not an official assessment.",
    maturity: true,
    requirements: [
      r("Inventory", "AI usage inventory across self-hosted, PaaS and API/SaaS", ["cap:registry"]),
      r("Policy", "Enforced AI usage policy", ["p5"]),
      r("Monitoring", "AI security monitoring and logging", ["cap:audit"]),
      r("Response", "Containment of compromised or misbehaving AI", ["p12"]),
      r("Third party", "AI supplier and model risk management", ["p13"]),
      r("Testing", "Adversarial testing and AI red teaming"),
    ],
  },
  {
    id: "mitre-atlas",
    short: "MITRE ATLAS",
    name: "MITRE ATLAS",
    group: "security",
    source: "Adversarial Threat Landscape for AI Systems, release 2026.10 (Oct 28, 2026)",
    note: "Adversary techniques against AI systems. Covered means an ARGUS control mitigates or detects the technique. In release 2026.10, Extract LLM System Prompt (AML.T0056) and LLM Data Leakage (AML.T0057) moved under Data from AI Services (AML.T0085), and AI Supply Chain Compromise was renamed Supply Chain Compromise.",
    requirements: [
      r("AML.T0051", "LLM Prompt Injection", ["p9"]),
      r("AML.T0053", "AI Agent Tool Invocation", ["p10"]),
      r("AML.T0085.003", "Data from AI Services: System Instructions", ["p11"]),
      r("AML.T0085.002", "Data from AI Services: Conversation Context and Memory", ["p1", "p11"]),
      r("AML.T0010", "Supply Chain Compromise", ["p13"]),
      r("AML.T0034.002", "Agentic Resource Consumption", ["p8"]),
      r("AML.T0070", "RAG Poisoning"),
      r("AML.T0080", "AI Agent Context Poisoning"),
    ],
  },

  /* ---------- security & privacy baseline ---------- */
  {
    id: "iso-27001",
    short: "ISO 27001",
    name: "ISO/IEC 27001",
    group: "baseline",
    source: "ISO/IEC 27001:2022 Annex A",
    requirements: [
      r("A.5.15", "Access control", ["p6"]),
      r("A.5.34", "Privacy and protection of PII", ["p1"]),
      r("A.8.15", "Logging", ["cap:audit", "p4"]),
    ],
  },
  {
    id: "soc2",
    short: "SOC 2",
    name: "SOC 2",
    group: "baseline",
    source: "AICPA Trust Services Criteria",
    requirements: [
      r("CC6.1", "Logical access security", ["p6"]),
      r("CC7.2", "Monitoring of system components for anomalies", ["cap:audit", "p8"]),
      r("CC8.1", "Change management for system changes"),
    ],
  },
  {
    id: "gdpr",
    short: "GDPR",
    name: "General Data Protection Regulation",
    group: "baseline",
    source: "Regulation (EU) 2016/679",
    requirements: [
      r("Art. 17", "Right to erasure", ["p7"]),
      r("Art. 22", "Safeguards for solely automated decisions"),
      r("Art. 25", "Data protection by design and by default", ["p1"]),
      r("Art. 32", "Security of processing", ["p6", "p11"]),
    ],
  },
  {
    id: "hipaa",
    short: "HIPAA",
    name: "HIPAA Security & Privacy Rules",
    group: "baseline",
    source: "45 CFR Parts 160 and 164",
    note: "Shows the Security Rule currently in effect. HHS proposed a major Security Rule update in January 2025; it has not been finalized, and the regulatory agenda targets July 2027.",
    requirements: [
      r("164.312(a)(1)", "Access control for ePHI", ["p3"]),
      r("164.312(b)", "Audit controls", ["cap:audit"]),
      r("164.502(b)", "Minimum necessary use and disclosure", ["p3"]),
    ],
  },
];

/*
 * Recommended controls
 *
 * For every requirement that has no control in the seed data, ARGUS recommends
 * a policy that would satisfy it, the enforcement action to use, and the
 * evidence an auditor would expect to see. One control often closes gaps in
 * several frameworks at once, which is how the recommendations are ranked.
 */

// Requirement key from framework id + requirement id (nth occurrence when an id repeats)
const key = (fwId, reqId, nth = 0) => {
  const f = FRAMEWORKS.find(x => x.id === fwId);
  const idxs = f.requirements.map((q, i) => (q.id === reqId ? i : -1)).filter(i => i >= 0);
  if (idxs[nth] === undefined) throw new Error(`Unknown requirement ${fwId} ${reqId} #${nth}`);
  return `${fwId}|${idxs[nth]}`;
};

// Roles that can own or approve a policy (role-based, not named people)
export const POLICY_ROLES = [
  "AI Governance Committee",
  "Chief AI Officer",
  "Chief Information Security Officer",
  "Chief Privacy Officer / DPO",
  "Chief Risk Officer",
  "Chief Compliance Officer",
  "General Counsel",
  "Chief Technology Officer",
  "Chief Human Resources Officer",
  "Head of Internal Audit",
];

const rec = (o) => ({ ...o, closeKeys: o.closes.map(c => key(...c)), template: `/templates/${o.id}.docx` });

export const RECOMMENDED_POLICIES = [
  rec({
    id: "rc-impact-assessment", name: "Impact Assessment Before High-Risk Deployment", tag: "AI Governance",
    action: "REQUIRE APPROVAL", owner: "Chief AI Officer",
    desc: "Agents used for consequential decisions (hiring, credit, housing, healthcare, essential services) cannot be activated until an AI impact assessment covering affected people, fundamental rights and societal effects is completed and approved.",
    evidence: "Completed impact assessment (FRIA under the EU AI Act), approver sign-off, review date",
    closes: [["eu-ai-act", "Art. 27"], ["iso-42001", "A.5.2"], ["oecd", "1.1"]],
    statements: [
      "Every AI agent must be classified at registration as consequential or non-consequential based on whether it makes or materially influences decisions about individuals in employment, credit, housing, insurance, healthcare, education or access to essential services.",
      "A consequential agent must not be activated until an AI impact assessment has been completed and approved.",
      "The assessment must identify affected individuals and groups, the intended purpose and context of use, foreseeable risks to fundamental rights and well-being, and the human oversight and mitigation measures in place.",
      "Where the EU AI Act applies to a high-risk deployment, the assessment must meet the fundamental rights impact assessment requirements of Article 27.",
      "Assessments must be reviewed at least annually and whenever the agent's purpose, model, data sources or affected population changes materially.",
    ],
  }),
  rec({
    id: "rc-bias-audit", name: "Bias Audit for Decision-Making Agents", tag: "AI Governance",
    action: "BLOCK", owner: "Chief Human Resources Officer",
    desc: "Agents that screen, rank or score people must have a current independent bias audit. Use is blocked when the audit is missing or more than 12 months old.",
    evidence: "Bias audit report with selection rates and impact ratios, auditor independence statement, published summary where required",
    closes: [["us-guidance", "NYC LL 144"], ["nist-ai-rmf", "MEASURE 2.11"]],
    statements: [
      "Any agent that screens, ranks, scores or recommends individuals for a consequential decision must have a bias audit completed within the past 12 months before it is used.",
      "Audits must be performed by an independent auditor and must report selection or scoring rates and impact ratios across the demographic categories required by applicable law.",
      "Where required by law (for example, New York City Local Law 144 for automated employment decision tools), a summary of the most recent audit must be published and candidates must receive the required notice.",
      "Material disparities identified by an audit must be remediated, or the agent's use restricted, before continued use is approved.",
      "ARGUS blocks use of the agent automatically when no current audit is on file.",
    ],
  }),
  rec({
    id: "rc-ai-disclosure", name: "Disclose AI Interaction and Automated Decisions", tag: "Transparency",
    action: "BLOCK", owner: "Chief Privacy Officer / DPO",
    desc: "Customer- and candidate-facing agents must show a clear notice that the person is dealing with AI, and a notice when an automated system influences a consequential decision. Agents without a configured notice cannot go live.",
    evidence: "Approved notice text per agent, screenshots of where it appears, notice delivery logs",
    closes: [["eu-ai-act", "Art. 50"], ["us-guidance", "CO SB 26-189", 0]],
    statements: [
      "Any agent that interacts directly with customers, candidates or the public must clearly disclose that the person is interacting with an AI system, unless this is obvious from context.",
      "When an agent makes or materially influences a consequential decision about an individual, the individual must receive clear notice that automated decision-making technology was used.",
      "AI-generated or manipulated content distributed externally must be labelled as such where required by law.",
      "Notice text must be approved by the policy owner and Legal, and stored with the agent's registry record.",
      "Customer-facing agents without an approved, configured notice must not be activated.",
    ],
  }),
  rec({
    id: "rc-human-review", name: "Human Review of Adverse Automated Decisions", tag: "Human Oversight",
    action: "REQUIRE APPROVAL", owner: "Chief Compliance Officer",
    desc: "Any adverse decision about an individual that an agent made or materially influenced is routed to a qualified human reviewer on request, with a way to correct inaccurate data and contest the outcome.",
    evidence: "Review request log, reviewer decisions and rationale, turnaround times",
    closes: [["us-guidance", "CO SB 26-189", 1], ["gdpr", "Art. 22"]],
    statements: [
      "Individuals affected by an adverse decision that an agent made or materially influenced must be told how to request human review.",
      "Review requests must be handled by a qualified reviewer who has authority to change the outcome and who did not make the original decision.",
      "Individuals must be able to correct inaccurate personal data used in the decision and to contest the outcome.",
      "Decisions producing legal or similarly significant effects must not be based solely on automated processing unless a lawful basis and appropriate safeguards are in place.",
      "Review requests, decisions, rationale and turnaround times must be logged and retained for at least three years.",
    ],
  }),
  rec({
    id: "rc-ai-literacy", name: "AI Literacy Training for Agent Owners", tag: "AI Governance",
    action: "REQUIRE APPROVAL", owner: "Chief AI Officer",
    desc: "Agent owners and operators must complete role-based AI literacy training before an agent they own can be activated, and refresh it annually.",
    evidence: "Training curriculum, completion records per owner, annual refresh tracking",
    closes: [["eu-ai-act", "Art. 4"]],
    statements: [
      "Every agent owner and operator must complete AI literacy training appropriate to their role before an agent they own or operate is activated.",
      "Training must cover the capabilities and limitations of AI systems, the risks relevant to the agent's use case, this organization's AI policies, and how to exercise oversight and escalate issues.",
      "Training must be refreshed at least annually and whenever a significant new AI capability or policy is introduced.",
      "Completion records must be maintained per individual and checked by ARGUS at agent activation.",
    ],
  }),
  rec({
    id: "rc-data-provenance", name: "Provenance Checks for Training and Retrieval Data", tag: "AI Security",
    action: "REQUIRE APPROVAL", owner: "Chief Information Security Officer",
    desc: "New datasets, fine-tuning data and knowledge sources connected to an agent need documented provenance, an integrity check and an owner before use. Changes to indexed content are logged.",
    evidence: "Data source register, provenance and integrity check results, retrieval index change log",
    closes: [["owasp-llm", "LLM04"], ["owasp-llm", "LLM08"], ["mitre-atlas", "AML.T0070"]],
    statements: [
      "Every dataset, fine-tuning corpus and retrieval knowledge source used by an agent must be recorded in the data source register with its origin, owner, licence and sensitivity.",
      "New or changed data sources must pass a provenance and integrity check before an agent can use them.",
      "Retrieval indexes must enforce the access permissions of the underlying source documents, and access must be scoped per agent.",
      "Additions, modifications and deletions to indexed content must be logged and attributable.",
      "Suspected poisoning or unauthorized modification must be handled as a security incident.",
    ],
  }),
  rec({
    id: "rc-output-validation", name: "Validate Agent Output Before Execution", tag: "AI Security",
    action: "BLOCK", owner: "Chief Information Security Officer",
    desc: "Agent output passed to code, queries, shells, browsers or downstream systems is validated and sanitized first. Generated code only runs in an isolated sandbox.",
    evidence: "Validation rules per integration, sandbox configuration, blocked-output log",
    closes: [["owasp-llm", "LLM05"], ["owasp-agentic", "ASI05"]],
    statements: [
      "Agent output must be treated as untrusted input by every downstream system.",
      "Output passed to interpreters, databases, shells, browsers or APIs must be validated and sanitized against rules defined for that integration.",
      "Code generated by an agent may only be executed in an isolated sandbox with no access to production credentials or networks unless explicitly approved.",
      "Output that fails validation must be blocked and logged.",
    ],
  }),
  rec({
    id: "rc-memory-integrity", name: "Protect Agent Memory and Context", tag: "AI Security",
    action: "BLOCK", owner: "Chief Information Security Officer",
    desc: "Writes to an agent's persistent memory from untrusted content are quarantined for review. Memory is scoped per user and session and expires on a set schedule.",
    evidence: "Memory write policy, quarantine log, retention settings",
    closes: [["owasp-agentic", "ASI06"], ["mitre-atlas", "AML.T0080"]],
    statements: [
      "Agent memory and persistent context must be scoped per user and per session so that one user's content cannot influence another's.",
      "Writes to persistent memory that originate from untrusted content (web pages, emails, documents, tool output) must be quarantined for review.",
      "Memory must expire on a defined retention schedule and be deletable on request.",
      "Memory contents must be inspectable by the agent owner for investigation.",
    ],
  }),
  rec({
    id: "rc-red-team", name: "Adversarial Testing Before Release", tag: "AI Security",
    action: "REQUIRE APPROVAL", owner: "Chief Information Security Officer",
    desc: "Agents must pass adversarial testing (prompt injection, jailbreak, data leakage, tool abuse) before activation and after significant changes. Findings above medium severity block release.",
    evidence: "Test plan, red-team findings and remediation, retest results",
    closes: [["csa-aicm", "TVM"], ["csa-aismm", "Testing"]],
    statements: [
      "Every agent must undergo adversarial testing before activation and after any significant change to its model, prompts, tools or data sources.",
      "Testing must cover at minimum prompt injection, jailbreaks, sensitive data leakage, tool misuse and excessive agency.",
      "Findings rated above medium severity must be remediated and retested before release.",
      "Test plans, findings and retest results must be retained with the agent's registry record.",
    ],
  }),
  rec({
    id: "rc-agent-auth", name: "Authenticate Inter-Agent Communication", tag: "AI Security",
    action: "BLOCK", owner: "Chief Information Security Officer",
    desc: "Agent-to-agent calls require mutual authentication and signed messages. Messages from unregistered agents are rejected.",
    evidence: "Agent identity and credential inventory, authentication configuration, rejected-message log",
    closes: [["owasp-agentic", "ASI07"]],
    statements: [
      "Every agent must have a unique, managed identity recorded in the agent registry.",
      "Communication between agents must use mutual authentication, and messages must be integrity-protected.",
      "Messages from unregistered or unauthenticated agents must be rejected and logged.",
      "Agent credentials must be rotated on a defined schedule and revoked immediately when an agent is suspended.",
    ],
  }),
  rec({
    id: "rc-grounding", name: "Grounding Checks for Factual Output", tag: "AI Quality",
    action: "WARN", owner: "Chief AI Officer",
    desc: "Factual answers must cite approved sources. Responses that can't be grounded are flagged to the user and logged for review.",
    evidence: "Approved source list, grounding check results, flagged-response samples",
    closes: [["owasp-llm", "LLM09"]],
    statements: [
      "Agents that provide factual information to employees or customers must ground answers in an approved source list and cite the sources used.",
      "Responses that cannot be grounded must be flagged to the user as unverified.",
      "Flagged responses must be logged and sampled for review at a defined frequency.",
      "Agents must not be used as the sole source for legal, medical or financial determinations.",
    ],
  }),
  rec({
    id: "rc-change-control", name: "Change Approval for Agent Configuration", tag: "Change Management",
    action: "REQUIRE APPROVAL", owner: "Chief Technology Officer",
    desc: "Changes to a production agent's model, system prompt, tools or permissions need approval and are recorded with before and after versions.",
    evidence: "Change tickets with approvals, configuration version history",
    closes: [["soc2", "CC8.1"]],
    statements: [
      "Changes to a production agent's model, model version, system prompt, tools, permissions or data sources must be requested, risk-assessed and approved before deployment.",
      "Approvers must be independent of the person making the change.",
      "Each change must be recorded with before and after configuration versions and linked to its approval.",
      "Emergency changes must be approved retroactively within two business days.",
    ],
  }),
];

export const recommendationFor = reqKey => RECOMMENDED_POLICIES.find(t => t.closeKeys.includes(reqKey));

// "EU AI Act Art. 27" style label for a requirement key
export const reqLabel = reqKey => {
  const [fwId, i] = reqKey.split("|");
  const f = FRAMEWORKS.find(x => x.id === fwId);
  return `${f.short} ${f.requirements[Number(i)].id}`;
};

// Flat mapping { "<frameworkId>|<index>": [coveredBy...] } used as editable app state
export const SEED_REQ_MAP = Object.fromEntries(
  FRAMEWORKS.flatMap(f => f.requirements.map((req, i) => [`${f.id}|${i}`, req.coveredBy]))
);

// Coverage for every framework given the current mapping and policy state
export function computeCoverage(reqMap, policies) {
  // a policy only counts as a control once it is enabled and approved (drafts don't count)
  const enabled = new Set(policies.filter(p => p.enabled && p.status !== "draft").map(p => p.id));
  const isLive = ref => ref.startsWith("cap:") || enabled.has(ref);

  const frameworks = FRAMEWORKS.map(f => {
    const reqs = f.requirements.map((req, i) => {
      const refs = reqMap[`${f.id}|${i}`] || [];
      return { ...req, key: `${f.id}|${i}`, refs, covered: refs.some(isLive) };
    });
    const covered = reqs.filter(x => x.covered).length;
    // manually tagged policies (from Create Policy) that are not linked to a requirement
    const tagged = policies.filter(p => (p.frameworks || []).includes(f.short) &&
      !reqs.some(x => x.refs.includes(p.id)));
    return { ...f, reqs, covered, total: reqs.length, pct: Math.round((covered / reqs.length) * 100), tagged };
  });

  const covered = frameworks.reduce((s, f) => s + f.covered, 0);
  const total = frameworks.reduce((s, f) => s + f.total, 0);
  return { frameworks, covered, total, gaps: total - covered, pct: Math.round((covered / total) * 100) };
}

// Short names of frameworks a policy supports (linked requirements plus manual tags)
export function frameworksForPolicy(policy, reqMap) {
  const linked = FRAMEWORKS.filter(f =>
    f.requirements.some((_, i) => (reqMap[`${f.id}|${i}`] || []).includes(policy.id))
  ).map(f => f.short);
  return [...new Set([...linked, ...(policy.frameworks || [])])];
}

// Generic starting point when no recommended control fits
export const BLANK_TEMPLATE = "/templates/argus-policy-template.docx";
