/*
 * ARGUS demo seed data. Everything here is synthetic: fictional agents, people,
 * violations, tests and events. Dates are written as if "today" were
 * 21 May 2026 and shifted at load time so the history sits just before the
 * viewer's today (see timeline.js).
 */
import { seedAt, seedDate, addDaysISO, fmtWhen, fmtWhenLong } from "./timeline.js";
import { sealAll, SYSTEM } from "./audit.js";

const tr = (...ids) => Object.fromEntries(ids.map(id => [id, true]));
const SEED_AGENTS_RAW = [
  { id: 1, name: "Aria CX Bot", model: "gpt-4o", dept: "Customer Success", status: "active", autonomy: "Supervised", owner: "CX Ops",
    desc: "Answers customer support questions in chat for customers in the US and EU, looks up order and account status, and hands off to a human agent when it can't resolve an issue.",
    traits: tr("customerFacing", "personalData", "euScope", "tools", "retrieval", "persistentMemory"), exclusions: {} },
  { id: 2, name: "DataSync Pro", model: "claude-3-5-sonnet", dept: "Engineering", status: "active", autonomy: "Semi-autonomous", owner: "Platform Eng",
    desc: "Reconciles customer and billing records between the CRM, data warehouse and finance systems overnight, and opens tickets for records it can't match.",
    traits: tr("personalData", "financialData", "tools"), exclusions: {} },
  { id: 3, name: "ThreatWatch AI", model: "gpt-4o", dept: "Security", status: "active", autonomy: "Semi-autonomous", owner: "SecOps",
    desc: "Triages security alerts, enriches them from external threat-intelligence APIs, and coordinates with the SOC's response agents to open and route incidents.",
    traits: tr("tools", "retrieval", "multiAgent"), exclusions: {} },
  { id: 4, name: "HireFlow Agent", model: "claude-3-haiku", dept: "HR", status: "active", autonomy: "Supervised", owner: "People Ops",
    desc: "Screens and ranks job applications against role requirements for US and EU openings, and drafts shortlist summaries for recruiters to review.",
    traits: tr("consequential", "customerFacing", "personalData", "euScope"), exclusions: {} },
  { id: 5, name: "FinanceBot Alpha", model: "gpt-4o", dept: "Finance", status: "suspended", autonomy: "Full autonomy", owner: "FP&A",
    desc: "Automates accounts-payable reconciliation and vendor follow-ups, including emailing vendors about invoices and payment status. Suspended after repeated policy violations.",
    traits: tr("personalData", "euScope", "financialData", "externalComms", "tools"), exclusions: {},
    suspension: { on: "5/21/2026, 10:53 AM", by: "Auto-Suspend Rogue Agents policy", reason: "3 critical policy violations within 6 hours", autonomy: "Full autonomy" } },
  { id: 6, name: "MarketSentinel", model: "claude-3-5-sonnet", dept: "Marketing", status: "active", autonomy: "Supervised", owner: "Growth",
    desc: "Monitors competitor news and social channels, summarizes trends, and drafts campaign copy that marketers review before publishing.",
    traits: tr("externalComms", "tools", "retrieval", "sharedOutput"), exclusions: {} },
  { id: 7, name: "CodeReview AI", model: "gpt-4o", dept: "Engineering", status: "active", autonomy: "Supervised", owner: "Dev Experience",
    desc: "Reviews pull requests, suggests fixes, and runs generated tests in CI. Suggestions are applied only after an engineer approves them.",
    traits: tr("codeExec", "tools", "retrieval"), exclusions: {} },
  { id: 8, name: "LegalScan Bot", model: "claude-3-5-sonnet", dept: "Legal", status: "pending", autonomy: "Supervised", owner: "Legal Ops",
    desc: "Reviews incoming vendor contracts against the legal playbook and flags non-standard clauses for counsel. Pending security review before activation.",
    traits: tr("personalData", "euScope", "retrieval"), exclusions: {} },
  { id: 9, name: "JobFit", model: "Claude (claude.ai skill)", dept: "Personal Projects", status: "pending", autonomy: "Supervised", owner: "John Smith",
    desc: "Tailors a candidate's resume to a specific job posting. Fetches the posting from the web, scores fit from a recruiter's perspective, stops to ask the candidate about information gaps before rewriting, and produces an editable DOCX resume. Must never invent employers, dates, credentials, skills or metrics.",
    traits: tr("personalData", "tools", "codeExec", "sharedOutput"), exclusions: {} },
  { id: 10, name: "ClaimsGuide", model: "claude-3-5-sonnet", dept: "Operations", status: "pending", autonomy: "Semi-autonomous", owner: "Claims Ops",
    desc: "Helps health-plan members in the US and EU file and track medical claims. Checks eligibility against plan documents, recommends approve or deny to claims examiners, pays approved claims through the payments API, sends members decision letters, remembers each member's claim history, and hands suspicious claims to the fraud-detection agent.",
    traits: tr("consequential", "customerFacing", "personalData", "euScope", "healthData", "financialData", "externalComms", "sharedOutput", "tools", "retrieval", "multiAgent", "persistentMemory"), exclusions: {} },
];


const SEED_POLICIES_RAW = [
  { id: "p1", tag: "Data Privacy", name: "Block PII Export to External APIs", desc: "Prevents any AI agent from sending personally identifiable information to external third-party APIs without explicit authorization.", action: "BLOCK", violations: 7, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11", doc: { name: "AI-POL-001 PII Export Policy v2.pdf", uploadedOn: "2026-02-11", seeded: true } },
  { id: "p2", tag: "External Communication", name: "Require Approval for Outbound Emails", desc: "All agent-initiated outbound emails to external domains must receive human approval before sending.", action: "REQUIRE APPROVAL", violations: 3, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11", doc: { name: "AI-POL-002 Outbound Communications Approval.pdf", uploadedOn: "2026-02-11", seeded: true } },
  { id: "p3", tag: "HIPAA", name: "Restrict HIPAA Record Access", desc: "Agents without explicit HIPAA clearance are blocked from accessing health-related records.", action: "BLOCK", violations: 12, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-01-20", doc: { name: "AI-POL-003 HIPAA Access Standard.pdf", uploadedOn: "2026-01-20", seeded: true } },
  { id: "p4", tag: "GDPR", name: "Audit Financial Data Reads", desc: "Log all agent access to financial systems for SOX compliance.", action: "AUDIT", violations: 0, enabled: true, frameworks: [], owner: "Chief Compliance Officer", status: "approved", approvedBy: "Head of Internal Audit", approvedOn: "2025-04-10", doc: { name: "AI-POL-004 Financial Data Access Logging.pdf", uploadedOn: "2025-04-10", seeded: true } },
  { id: "p5", tag: "Access Control", name: "Limit Full-Autonomy Agent Actions", desc: "Agents with full autonomy level require supervisor approval for any write operations.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-03-04", doc: { name: "AI-POL-005 Autonomy Levels and Write Approval.pdf", uploadedOn: "2026-03-04", seeded: true } },
  { id: "p6", tag: "Access Control", name: "Block Admin Privilege Escalation", desc: "Prevents agents from acquiring admin permissions they were not originally granted.", action: "BLOCK", violations: 2, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "Chief Risk Officer", approvedOn: "2026-01-20", doc: { name: "AI-POL-006 Privileged Access for Agents.pdf", uploadedOn: "2026-01-20", seeded: true } },
  { id: "p7", tag: "GDPR", name: "GDPR Data Deletion Compliance", desc: "Ensures agents processing EU customer data respect deletion requests within 72 hours.", action: "AUDIT", violations: 0, enabled: false, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-03-04", doc: { name: "AI-POL-007 GDPR Deletion Procedure.pdf", uploadedOn: "2026-03-04", seeded: true } },
  { id: "p8", tag: "Custom", name: "Rate Limit External API Calls", desc: "Warns when an agent makes more than 1000 external API calls per hour.", action: "WARN", violations: 5, enabled: true, frameworks: [], owner: "Chief Technology Officer", status: "approved", approvedBy: "Chief Information Security Officer", approvedOn: "2026-04-15" },
  { id: "p9", tag: "AI Security", name: "Prompt Injection Guardrail", desc: "Screens user input, retrieved documents and tool outputs for injected instructions, and blocks agent actions that originate from untrusted instructions.", action: "BLOCK", violations: 6, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-SEC-009 Prompt Injection Guardrail Standard.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p10", tag: "AI Security", name: "Least-Privilege Tool Scope", desc: "Each agent may only call tools on its approved allowlist. Calls outside that scope are held for human approval.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-SEC-010 Agent Tool Allowlist Standard.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p11", tag: "AI Security", name: "Block System Prompt and Secret Leakage", desc: "Filters agent responses for system prompt contents, credentials and other secrets before they leave the platform.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p12", tag: "Incident Response", name: "Auto-Suspend Rogue Agents", desc: "Suspends an agent automatically after 3 critical violations within 6 hours and pages its owner. Reinstatement requires review.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-IR-012 Agent Containment Runbook.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p13", tag: "Third-Party Risk", name: "Vet Third-Party Models and Tools", desc: "New model providers, plugins and MCP tools must pass a security and provenance review before any agent can use them.", action: "REQUIRE APPROVAL", violations: 0, enabled: true, frameworks: [], owner: "Chief Risk Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-12", doc: { name: "AI-TPR-013 Third-Party Model and Tool Review.pdf", uploadedOn: "2026-05-12", seeded: true } },
];

const SEED_AUDIT_RAW = [
  { sev: "info", ts: "5/23/2026, 3:10:00 PM", type: "Agent Registered", agent: "ClaimsGuide", desc: "ClaimsGuide registered and pending security review before activation" },
  { sev: "info", ts: "5/23/2026, 3:05:00 PM", type: "Agent Registered", agent: "JobFit", desc: "JobFit registered and pending security review before activation" },
  { id: "v1", sev: "critical", ts: "5/21/2026, 11:42:25 AM", type: "Policy Violation", agent: "ThreatWatch AI", policy: "p8", desc: "ThreatWatch AI exceeded external API rate limit — 1,247 calls in 60 minutes" },
  { sev: "critical", ts: "5/21/2026, 10:53:25 AM", type: "Agent Suspended", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha suspended automatically by Auto-Suspend Rogue Agents after 3 critical policy violations within 6 hours" },
  { id: "v2", sev: "critical", ts: "5/21/2026, 10:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p1", desc: "FinanceBot Alpha accessed 3,400 EU customer PII records without GDPR deletion check" },
  { id: "v3", sev: "critical", ts: "5/21/2026, 8:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p2", desc: "FinanceBot Alpha sent outbound emails to external vendors without approval" },
  { id: "v4", sev: "critical", ts: "5/21/2026, 5:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p3", desc: "FinanceBot Alpha attempted to access HIPAA-tagged records without clearance" },
  { sev: "warn", ts: "5/20/2026, 11:52:25 AM", type: "Risk Change", agent: "DataSync Pro", scoreFrom: 35, scoreTo: 42, desc: "DataSync Pro risk score updated from 35 to 42 after new financial data permissions added" },
  { sev: "info", ts: "5/19/2026, 11:52:25 AM", type: "Agent Registered", agent: "LegalScan Bot", desc: "LegalScan Bot registered and pending security review before activation" },
  { sev: "warn", ts: "5/18/2026, 11:52:25 AM", type: "Risk Change", agent: "ThreatWatch AI", levelTo: "HIGH", desc: "ThreatWatch AI risk level elevated to HIGH after external API access pattern detected" },
  { sev: "info", ts: "5/16/2026, 11:52:25 AM", type: "Status Change", agent: "CodeReview AI", desc: "CodeReview AI status changed from pending to active after security clearance" },
  { sev: "info", ts: "4/21/2026, 11:52:25 AM", type: "Agent Registered", agent: "Aria CX Bot", desc: "Aria CX Bot registered and activated for customer success department" },
];


// Synthetic control test history. Each result is bound to the policy version it tested.
const SEED_TESTS = {
  p1: [{ testedOn: "2026-04-02", result: "pass", version: 2, evidence: "DLP replay of 200 synthetic PII payloads to external endpoints: all blocked (TEST-0412)", owner: "Chief Privacy Officer / DPO", by: "Priya Nair" }],
  p2: [{ testedOn: "2026-03-10", result: "pass", evidence: "Outbound email to 12 external domains held for human approval in staging (TEST-0388)", owner: "Chief Information Security Officer", by: "Jordan Patel" }],
  p3: [{ testedOn: "2026-02-15", result: "pass", evidence: "Five uncleared service accounts blocked from HIPAA-tagged records (TEST-0351)", owner: "Chief Privacy Officer / DPO", by: "Priya Nair" }],
  p4: [{ testedOn: "2025-04-20", result: "pass", evidence: "Sampled 50 financial-system reads; all logged with agent ID and purpose (TEST-0102)", owner: "Chief Compliance Officer", by: "Morgan Lee" }],
  p5: [{ testedOn: "2026-03-20", result: "pass", evidence: "Write operations by full-autonomy test agent held for supervisor approval (TEST-0395)", owner: "Chief AI Officer", by: "Avery Chen" }],
  p6: [
    { testedOn: "2025-11-12", result: "pass", evidence: "Privilege escalation via role assumption blocked (TEST-0233)", owner: "Chief Information Security Officer", by: "Jordan Patel" },
    { testedOn: "2026-05-12", result: "fail", evidence: "Red-team test: agent escalated through an over-scoped service token in staging and was not blocked (TEST-0467)", owner: "Chief Information Security Officer", by: "Jordan Patel" },
  ],
  p8: [{ testedOn: "2026-04-20", result: "pass", evidence: "Synthetic burst of 1,500 calls in an hour raised a warning within 2 minutes (TEST-0420)", owner: "Chief Technology Officer", by: "Jordan Patel" }],
  p9: [{ testedOn: "2026-05-08", result: "pass", evidence: "Injection corpus of 300 prompts across input, retrieval and tool output: 297 blocked, 3 held for review (TEST-0455)", owner: "Chief Information Security Officer", by: "Jordan Patel" }],
  p10: [{ testedOn: "2026-05-08", result: "pass", evidence: "Calls outside each test agent's allowlist held for approval (TEST-0456)", owner: "Chief Information Security Officer", by: "Jordan Patel" }],
  p11: [{ testedOn: "2026-05-09", result: "pass", evidence: "Canary secrets planted in system prompts never appeared in 1,000 sampled responses (TEST-0458)", owner: "Chief Information Security Officer", by: "Jordan Patel" }],
  p12: [{ testedOn: "2026-05-06", result: "pass", evidence: "Staging drill: test agent suspended 40 seconds after its third critical alert, owner paged (TEST-0449)", owner: "Chief AI Officer", by: "Avery Chen" }],
};

// Who did each seeded thing. Detections and automatic actions are the system.
const seedActor = e => {
  if (e.type === "Policy Violation" || e.type === "Agent Suspended" || e.type === "Risk Change") return SYSTEM;
  if (e.type === "Status Change") return { name: "Avery Chen", role: "AI Governance Committee" };
  const owner = SEED_AGENTS_RAW.find(a => a.name === e.agent)?.owner;
  return { name: owner === "John Smith" ? "John Smith" : `${owner} team`, role: "Agent owner" };
};
const seedDetail = e => {
  if (e.type === "Policy Violation") return { outcome: "detected", entity: { kind: "policy", id: e.policy, version: 1 } };
  if (e.type === "Agent Suspended") return { entity: { kind: "agent", id: e.agent }, before: { status: "active" }, after: { status: "suspended" } };
  if (e.type === "Risk Change") return { entity: { kind: "agent", id: e.agent }, before: e.scoreFrom !== undefined ? { score: e.scoreFrom } : { level: "MEDIUM" }, after: e.scoreTo !== undefined ? { score: e.scoreTo } : { level: e.levelTo } };
  if (e.type === "Status Change") return { entity: { kind: "agent", id: e.agent }, before: { status: "pending" }, after: { status: "active" } };
  return { entity: { kind: "agent", id: e.agent }, after: { status: e.agent === "Aria CX Bot" ? "active" : "pending" } };
};

export const SEED_AUDIT = sealAll([...SEED_AUDIT_RAW].reverse().map((e, i) => {
  const at = seedAt(e.ts);
  return { outcome: "success", ...seedDetail(e), ...e, eid: `EVT-${String(i + 1).padStart(4, "0")}`, at, ts: fmtWhenLong(at), actor: seedActor(e), synthetic: true };
}));

export const SEED_POLICIES = SEED_POLICIES_RAW.map(p => {
  const version = p.id === "p1" ? 2 : 1;
  return {
    ...p,
    version,
    createdBy: "seed",
    ...(p.approvedOn ? { approvedOn: seedDate(p.approvedOn), approvedVersion: version } : {}),
    ...(p.doc?.uploadedOn ? { doc: { ...p.doc, version, uploadedOn: seedDate(p.doc.uploadedOn) } } : {}),
    tests: (SEED_TESTS[p.id] || []).map((t, i) => {
      const testedOn = seedDate(t.testedOn);
      return { id: `T-${p.id}-${i + 1}`, scope: "all", version: 1, ...t, testedOn, expiresOn: addDaysISO(365, new Date(testedOn + "T12:00:00")), at: new Date(testedOn + "T12:00:00").getTime(), synthetic: true };
    }),
  };
});

export const SEED_AGENTS = SEED_AGENTS_RAW.map(a => ({
  ...a, rev: 0,
  ...(a.suspension ? { suspension: { ...a.suspension, at: seedAt(a.suspension.on), on: fmtWhen(seedAt(a.suspension.on)) } } : {}),
}));
