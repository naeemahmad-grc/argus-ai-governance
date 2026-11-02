/*
 * ARGUS framework catalog
 *
 * Each framework lists a curated set of requirements that are in scope for
 * governing AI agents. This is a representative crosswalk for the demo, not
 * a complete reproduction of any framework.
 *
 * A requirement is covered when an always-on platform capability or at least
 * one ENABLED policy is mapped to it. Requirements with neither are gaps.
 *
 * Status notes reflect public information as of November 2026.
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
    source: "Regulation (EU) 2024/1689",
    note: "Under the Digital Omnibus agreed in 2026, Annex III high-risk obligations move from Aug 2, 2026 to Dec 2, 2027, and Annex I product-regulated systems to Aug 2028.",
    requirements: [
      r("Art. 4", "AI literacy for staff operating AI systems"),
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
    note: "Voluntary US framework; the de facto vocabulary for enterprise AI risk programs. Generative AI Profile published as NIST AI 600-1.",
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
    source: "OWASP GenAI Security Project, 2026 edition (Dec 2025)",
    note: "Risks specific to autonomous agents: goal hijacking, tool misuse, privilege abuse and rogue behavior.",
    requirements: [
      r("ASI01", "Agent Goal Hijack", ["p9"]),
      r("ASI02", "Tool Misuse & Exploitation", ["p10"]),
      r("ASI03", "Identity & Privilege Abuse", ["p6"]),
      r("ASI04", "Agentic Supply Chain Vulnerabilities", ["p13"]),
      r("ASI05", "Unexpected Code Execution"),
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
    source: "Cloud Security Alliance (introduced May 2026)",
    note: "Program-level model with five CCM-aligned maturity levels, layered on the AICM. Its control objectives were still in public review at release, so ARGUS shows indicative capability evidence, not an official assessment.",
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
    source: "Adversarial Threat Landscape for AI Systems",
    note: "Adversary techniques against AI systems. Covered means an ARGUS control mitigates or detects the technique.",
    requirements: [
      r("AML.T0051", "LLM Prompt Injection", ["p9"]),
      r("AML.T0053", "AI Agent Tool Invocation", ["p10"]),
      r("AML.T0056", "Extract LLM System Prompt", ["p11"]),
      r("AML.T0057", "LLM Data Leakage", ["p1", "p11"]),
      r("AML.T0010", "AI Supply Chain Compromise", ["p13"]),
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

const rec = (id, name, tag, action, desc, evidence, closes) =>
  ({ id, name, tag, action, desc, evidence, closeKeys: closes.map(c => key(...c)) });

export const RECOMMENDED_POLICIES = [
  rec("rc-impact-assessment", "Impact Assessment Before High-Risk Deployment", "AI Governance", "REQUIRE APPROVAL",
    "Agents used for consequential decisions (hiring, credit, housing, healthcare, essential services) cannot be activated until an AI impact assessment covering affected people, fundamental rights and societal effects is completed and approved.",
    "Completed impact assessment (FRIA under the EU AI Act), approver sign-off, review date",
    [["eu-ai-act", "Art. 27"], ["iso-42001", "A.5.2"], ["oecd", "1.1"]]),
  rec("rc-bias-audit", "Bias Audit for Decision-Making Agents", "AI Governance", "BLOCK",
    "Agents that screen, rank or score people must have a current independent bias audit. Use is blocked when the audit is missing or more than 12 months old.",
    "Bias audit report with selection rates and impact ratios, auditor independence statement, published summary where required",
    [["us-guidance", "NYC LL 144"], ["nist-ai-rmf", "MEASURE 2.11"]]),
  rec("rc-ai-disclosure", "Disclose AI Interaction and Automated Decisions", "Transparency", "BLOCK",
    "Customer- and candidate-facing agents must show a clear notice that the person is dealing with AI, and a notice when an automated system influences a consequential decision. Agents without a configured notice cannot go live.",
    "Approved notice text per agent, screenshots of where it appears, notice delivery logs",
    [["eu-ai-act", "Art. 50"], ["us-guidance", "CO SB 26-189", 0]]),
  rec("rc-human-review", "Human Review of Adverse Automated Decisions", "Human Oversight", "REQUIRE APPROVAL",
    "Any adverse decision about an individual that an agent made or materially influenced is routed to a qualified human reviewer on request, with a way to correct inaccurate data and contest the outcome.",
    "Review request log, reviewer decisions and rationale, turnaround times",
    [["us-guidance", "CO SB 26-189", 1], ["gdpr", "Art. 22"]]),
  rec("rc-ai-literacy", "AI Literacy Training for Agent Owners", "AI Governance", "REQUIRE APPROVAL",
    "Agent owners and operators must complete role-based AI literacy training before an agent they own can be activated, and refresh it annually.",
    "Training curriculum, completion records per owner, annual refresh tracking",
    [["eu-ai-act", "Art. 4"]]),
  rec("rc-data-provenance", "Provenance Checks for Training and Retrieval Data", "AI Security", "REQUIRE APPROVAL",
    "New datasets, fine-tuning data and knowledge sources connected to an agent need documented provenance, an integrity check and an owner before use. Changes to indexed content are logged.",
    "Data source register, provenance and integrity check results, retrieval index change log",
    [["owasp-llm", "LLM04"], ["owasp-llm", "LLM08"], ["mitre-atlas", "AML.T0070"]]),
  rec("rc-output-validation", "Validate Agent Output Before Execution", "AI Security", "BLOCK",
    "Agent output passed to code, queries, shells, browsers or downstream systems is validated and sanitized first. Generated code only runs in an isolated sandbox.",
    "Validation rules per integration, sandbox configuration, blocked-output log",
    [["owasp-llm", "LLM05"], ["owasp-agentic", "ASI05"]]),
  rec("rc-memory-integrity", "Protect Agent Memory and Context", "AI Security", "BLOCK",
    "Writes to an agent's persistent memory from untrusted content are quarantined for review. Memory is scoped per user and session and expires on a set schedule.",
    "Memory write policy, quarantine log, retention settings",
    [["owasp-agentic", "ASI06"], ["mitre-atlas", "AML.T0080"]]),
  rec("rc-red-team", "Adversarial Testing Before Release", "AI Security", "REQUIRE APPROVAL",
    "Agents must pass adversarial testing (prompt injection, jailbreak, data leakage, tool abuse) before activation and after significant changes. Findings above medium severity block release.",
    "Test plan, red-team findings and remediation, retest results",
    [["csa-aicm", "TVM"], ["csa-aismm", "Testing"]]),
  rec("rc-agent-auth", "Authenticate Inter-Agent Communication", "AI Security", "BLOCK",
    "Agent-to-agent calls require mutual authentication and signed messages. Messages from unregistered agents are rejected.",
    "Agent identity and credential inventory, authentication configuration, rejected-message log",
    [["owasp-agentic", "ASI07"]]),
  rec("rc-grounding", "Grounding Checks for Factual Output", "AI Quality", "WARN",
    "Factual answers must cite approved sources. Responses that can't be grounded are flagged to the user and logged for review.",
    "Approved source list, grounding check results, flagged-response samples",
    [["owasp-llm", "LLM09"]]),
  rec("rc-change-control", "Change Approval for Agent Configuration", "Change Management", "REQUIRE APPROVAL",
    "Changes to a production agent's model, system prompt, tools or permissions need approval and are recorded with before and after versions.",
    "Change tickets with approvals, configuration version history",
    [["soc2", "CC8.1"]]),
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
  const enabled = new Set(policies.filter(p => p.enabled).map(p => p.id));
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
