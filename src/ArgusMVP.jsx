import React, { useState, useMemo, useEffect, useContext, createContext } from "react";
import {
  Shield, Search, Bell, Activity, Users, FileText, AlertTriangle,
  ScanSearch, Cpu, HeartPulse, ShieldAlert, CheckCircle2, Download,
  X, Filter, Plus, Info, AlertOctagon, AlertCircle, Sun, Moon,
  RotateCcw, MessageCircle, ExternalLink, Menu, Layers, Link2, ChevronRight, Lightbulb, Upload, BadgeCheck, Clock
} from "lucide-react";
import * as d3 from "d3";
import {
  FRAMEWORKS, FRAMEWORK_GROUPS, CAPABILITIES, SEED_REQ_MAP, RECOMMENDED_POLICIES,
  computeCoverage, frameworksForPolicy, recommendationFor, reqLabel, POLICY_ROLES, BLANK_TEMPLATE,
} from "./frameworks.js";
import { TRAITS, mapAgent } from "./agentMapping.js";

/* ---------------- seed data ---------------- */

const tr = (...ids) => Object.fromEntries(ids.map(id => [id, true]));
const SEED_AGENTS = [
  { id: 1, name: "Aria CX Bot", model: "gpt-4o", dept: "Customer Success", status: "active", risk: "LOW", score: 18, autonomy: "Supervised", owner: "CX Ops",
    desc: "Answers customer support questions in chat for customers in the US and EU, looks up order and account status, and hands off to a human agent when it can't resolve an issue.",
    traits: tr("customerFacing", "personalData", "euScope", "tools", "retrieval", "persistentMemory"), exclusions: {} },
  { id: 2, name: "DataSync Pro", model: "claude-3-5-sonnet", dept: "Engineering", status: "active", risk: "MEDIUM", score: 42, autonomy: "Semi-autonomous", owner: "Platform Eng",
    desc: "Reconciles customer and billing records between the CRM, data warehouse and finance systems overnight, and opens tickets for records it can't match.",
    traits: tr("personalData", "financialData", "tools"), exclusions: {} },
  { id: 3, name: "ThreatWatch AI", model: "gpt-4o", dept: "Security", status: "active", risk: "HIGH", score: 67, autonomy: "Semi-autonomous", owner: "SecOps",
    desc: "Triages security alerts, enriches them from external threat-intelligence APIs, and coordinates with the SOC's response agents to open and route incidents.",
    traits: tr("tools", "retrieval", "multiAgent"), exclusions: {} },
  { id: 4, name: "HireFlow Agent", model: "claude-3-haiku", dept: "HR", status: "active", risk: "LOW", score: 12, autonomy: "Supervised", owner: "People Ops",
    desc: "Screens and ranks job applications against role requirements for US and EU openings, and drafts shortlist summaries for recruiters to review.",
    traits: tr("consequential", "customerFacing", "personalData", "euScope"), exclusions: {} },
  { id: 5, name: "FinanceBot Alpha", model: "gpt-4o", dept: "Finance", status: "suspended", risk: "CRITICAL", score: 89, autonomy: "Full autonomy", owner: "FP&A",
    desc: "Automates accounts-payable reconciliation and vendor follow-ups, including emailing vendors about invoices and payment status. Suspended after repeated policy violations.",
    traits: tr("personalData", "euScope", "financialData", "externalComms", "tools"), exclusions: {} },
  { id: 6, name: "MarketSentinel", model: "claude-3-5-sonnet", dept: "Marketing", status: "active", risk: "MEDIUM", score: 35, autonomy: "Supervised", owner: "Growth",
    desc: "Monitors competitor news and social channels, summarizes trends, and drafts campaign copy that marketers review before publishing.",
    traits: tr("externalComms", "tools", "retrieval", "sharedOutput"), exclusions: {} },
  { id: 7, name: "CodeReview AI", model: "gpt-4o", dept: "Engineering", status: "active", risk: "LOW", score: 22, autonomy: "Supervised", owner: "Dev Experience",
    desc: "Reviews pull requests, suggests fixes, and runs generated tests in CI. Suggestions are applied only after an engineer approves them.",
    traits: tr("codeExec", "tools", "retrieval"), exclusions: {} },
  { id: 8, name: "LegalScan Bot", model: "claude-3-5-sonnet", dept: "Legal", status: "pending", risk: "MEDIUM", score: 38, autonomy: "Supervised", owner: "Legal Ops",
    desc: "Reviews incoming vendor contracts against the legal playbook and flags non-standard clauses for counsel. Pending security review before activation.",
    traits: tr("personalData", "euScope", "retrieval"), exclusions: {} },
  { id: 9, name: "JobFit", model: "Claude (claude.ai skill)", dept: "Personal Projects", status: "pending", risk: "LOW", score: 20, autonomy: "Supervised", owner: "John Smith",
    desc: "Tailors a candidate's resume to a specific job posting. Fetches the posting from the web, scores fit from a recruiter's perspective, stops to ask the candidate about information gaps before rewriting, and produces an editable DOCX resume. Must never invent employers, dates, credentials, skills or metrics.",
    traits: tr("personalData", "tools", "codeExec", "sharedOutput"), exclusions: {} },
  { id: 10, name: "ClaimsGuide", model: "claude-3-5-sonnet", dept: "Operations", status: "pending", risk: "HIGH", score: 58, autonomy: "Semi-autonomous", owner: "Claims Ops",
    desc: "Helps health-plan members in the US and EU file and track medical claims. Checks eligibility against plan documents, recommends approve or deny to claims examiners, pays approved claims through the payments API, sends members decision letters, remembers each member's claim history, and hands suspicious claims to the fraud-detection agent.",
    traits: tr("consequential", "customerFacing", "personalData", "euScope", "healthData", "financialData", "externalComms", "sharedOutput", "tools", "retrieval", "multiAgent", "persistentMemory"), exclusions: {} },
];

// TODO: replace with your real form link (Tally / Google Form) before deploying
const FEEDBACK_URL = "https://tally.so/r/YOUR-FORM-ID";

const SEED_POLICIES = [
  { id: "p1", tag: "Data Privacy", name: "Block PII Export to External APIs", desc: "Prevents any AI agent from sending personally identifiable information to external third-party APIs without explicit authorization.", action: "BLOCK", violations: 7, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11" },
  { id: "p2", tag: "External Communication", name: "Require Approval for Outbound Emails", desc: "All agent-initiated outbound emails to external domains must receive human approval before sending.", action: "REQUIRE APPROVAL", violations: 3, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11" },
  { id: "p3", tag: "HIPAA", name: "Restrict HIPAA Record Access", desc: "Agents without explicit HIPAA clearance are blocked from accessing health-related records.", action: "BLOCK", violations: 12, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-01-20" },
  { id: "p4", tag: "GDPR", name: "Audit Financial Data Reads", desc: "Log all agent access to financial systems for SOX compliance.", action: "AUDIT", violations: 0, enabled: true, frameworks: [], owner: "Chief Compliance Officer", status: "approved", approvedBy: "Head of Internal Audit", approvedOn: "2026-01-20" },
  { id: "p5", tag: "Access Control", name: "Limit Full-Autonomy Agent Actions", desc: "Agents with full autonomy level require supervisor approval for any write operations.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-03-04" },
  { id: "p6", tag: "Access Control", name: "Block Admin Privilege Escalation", desc: "Prevents agents from acquiring admin permissions they were not originally granted.", action: "BLOCK", violations: 2, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "Chief Risk Officer", approvedOn: "2026-01-20" },
  { id: "p7", tag: "GDPR", name: "GDPR Data Deletion Compliance", desc: "Ensures agents processing EU customer data respect deletion requests within 72 hours.", action: "AUDIT", violations: 0, enabled: false, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-03-04" },
  { id: "p8", tag: "Custom", name: "Rate Limit External API Calls", desc: "Warns when an agent makes more than 1000 external API calls per hour.", action: "WARN", violations: 5, enabled: true, frameworks: [], owner: "Chief Technology Officer", status: "approved", approvedBy: "Chief Information Security Officer", approvedOn: "2026-04-15" },
  { id: "p9", tag: "AI Security", name: "Prompt Injection Guardrail", desc: "Screens user input, retrieved documents and tool outputs for injected instructions, and blocks agent actions that originate from untrusted instructions.", action: "BLOCK", violations: 6, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p10", tag: "AI Security", name: "Least-Privilege Tool Scope", desc: "Each agent may only call tools on its approved allowlist. Calls outside that scope are held for human approval.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p11", tag: "AI Security", name: "Block System Prompt and Secret Leakage", desc: "Filters agent responses for system prompt contents, credentials and other secrets before they leave the platform.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p12", tag: "Incident Response", name: "Auto-Suspend Rogue Agents", desc: "Suspends an agent automatically after 3 critical violations within 6 hours and pages its owner. Reinstatement requires review.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p13", tag: "Third-Party Risk", name: "Vet Third-Party Models and Tools", desc: "New model providers, plugins and MCP tools must pass a security and provenance review before any agent can use them.", action: "REQUIRE APPROVAL", violations: 0, enabled: true, frameworks: [], owner: "Chief Risk Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-06-10" },
];

const SEED_AUDIT = [
  { sev: "info", ts: "11/2/2026, 3:10:00 PM", type: "Agent Registered", agent: "ClaimsGuide", desc: "ClaimsGuide registered and pending security review before activation" },
  { sev: "info", ts: "11/2/2026, 3:05:00 PM", type: "Agent Registered", agent: "JobFit", desc: "JobFit registered and pending security review before activation" },
  { sev: "critical", ts: "5/21/2026, 11:42:25 AM", type: "Policy Violation", agent: "ThreatWatch AI", desc: "ThreatWatch AI exceeded external API rate limit — 1,247 calls in 60 minutes" },
  { sev: "critical", ts: "5/21/2026, 10:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha accessed 3,400 EU customer PII records without GDPR deletion check" },
  { sev: "warn", ts: "5/21/2026, 8:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha sent outbound emails to external vendors without approval" },
  { sev: "critical", ts: "5/21/2026, 5:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha attempted to access HIPAA-tagged records without clearance" },
  { sev: "warn", ts: "5/20/2026, 11:52:25 AM", type: "Risk Change", agent: "DataSync Pro", desc: "DataSync Pro risk score updated from 35 to 42 after new financial data permissions added" },
  { sev: "critical", ts: "5/19/2026, 11:52:25 AM", type: "Agent Suspended", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha suspended after 3 critical policy violations in 6-hour window" },
  { sev: "info", ts: "5/19/2026, 11:52:25 AM", type: "Agent Registered", agent: "LegalScan Bot", desc: "LegalScan Bot registered and pending security review before activation" },
  { sev: "warn", ts: "5/18/2026, 11:52:25 AM", type: "Risk Change", agent: "ThreatWatch AI", desc: "ThreatWatch AI risk level elevated to HIGH after external API access pattern detected" },
  { sev: "info", ts: "5/16/2026, 11:52:25 AM", type: "Status Change", agent: "CodeReview AI", desc: "CodeReview AI status changed from pending to active after security clearance" },
  { sev: "info", ts: "4/21/2026, 11:52:25 AM", type: "Agent Registered", agent: "Aria CX Bot", desc: "Aria CX Bot registered and activated for customer success department" },
];

const ALERTS = [
  { sev: "critical", title: "ThreatWatch AI exceeded external API rate limit — 1,247 calls in 60 minutes", agent: "ThreatWatch AI", time: "11:42:25 AM" },
  { sev: "critical", title: "FinanceBot Alpha accessed 3,400 EU customer PII records without GDPR deletion check", agent: "FinanceBot Alpha", time: "10:52:25 AM" },
  { sev: "warn", title: "FinanceBot Alpha sent outbound emails to external vendors without approval", agent: "FinanceBot Alpha", time: "8:52:25 AM" },
  { sev: "critical", title: "FinanceBot Alpha attempted to access HIPAA-tagged records without clearance", agent: "FinanceBot Alpha", time: "5:52:25 AM" },
  { sev: "warn", title: "DataSync Pro risk score updated from 35 to 42 after new financial data permissions added", agent: "DataSync Pro", time: "11:52:25 AM" },
];

/* ---------------- themes ---------------- */

const THEMES = {
  dark: {
    isDark: true,
    bg: "#0a0f1e", sidebar: "#0b1120", panel: "#0e1526", panelSoft: "#111a30",
    border: "rgba(148,163,184,.12)", text: "#e2e8f0", dim: "#94a3b8",
    faint: "#64748b", blue: "#4a9eea", blueSoft: "rgba(74,158,234,.1)",
    blueBorder: "rgba(74,158,234,.3)", avatarBg: "#1e3a5f",
    overlay: "rgba(2,6,16,.65)", shadow: "0 8px 30px rgba(0,0,0,.4)",
    grid: "rgba(148,163,184,.12)", barCursor: "rgba(148,163,184,.06)",
    navText: "#94a3b8",
    risk: {
      LOW: { bg: "rgba(52,211,153,.12)", fg: "#34d399", border: "rgba(52,211,153,.35)" },
      MEDIUM: { bg: "rgba(52,211,153,.10)", fg: "#6ee7b7", border: "rgba(110,231,183,.3)" },
      HIGH: { bg: "rgba(245,158,11,.14)", fg: "#f59e0b", border: "rgba(245,158,11,.4)" },
      CRITICAL: { bg: "rgba(244,63,94,.14)", fg: "#f43f5e", border: "rgba(244,63,94,.45)" },
    },
    status: {
      active: { fg: "#34d399", bg: "rgba(52,211,153,.1)", border: "rgba(52,211,153,.3)" },
      suspended: { fg: "#f43f5e", bg: "rgba(244,63,94,.1)", border: "rgba(244,63,94,.35)" },
      pending: { fg: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.3)" },
    },
    action: {
      BLOCK: { fg: "#f43f5e", bg: "rgba(244,63,94,.1)" },
      "REQUIRE APPROVAL": { fg: "#60a5fa", bg: "rgba(96,165,250,.1)" },
      AUDIT: { fg: "#94a3b8", bg: "rgba(148,163,184,.1)" },
      WARN: { fg: "#f59e0b", bg: "rgba(245,158,11,.12)" },
    },
    bar: { LOW: "#34d399", MEDIUM: "#6ee7b7", HIGH: "#f59e0b", CRITICAL: "#f43f5e" },
    heat: s => s >= 80
      ? { bg: "rgba(244,63,94,.12)", border: "rgba(244,63,94,.5)", fg: "#fff", sub: "#fca5b3" }
      : s >= 25
        ? { bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.45)", fg: "#f59e0b", sub: "#f59e0b" }
        : { bg: "rgba(52,211,153,.08)", border: "rgba(52,211,153,.4)", fg: "#34d399", sub: "#34d399" },
    warnBox: { bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.3)", fg: "#fbbf24" },
  },
  light: {
    isDark: false,
    bg: "#f3f5fa", sidebar: "#ffffff", panel: "#ffffff", panelSoft: "#f1f4f9",
    border: "rgba(15,23,42,.10)", text: "#0f172a", dim: "#475569",
    faint: "#64748b", blue: "#2f7fd1", blueSoft: "rgba(47,127,209,.09)",
    blueBorder: "rgba(47,127,209,.35)", avatarBg: "#dbeafe",
    overlay: "rgba(15,23,42,.4)", shadow: "0 8px 30px rgba(15,23,42,.15)",
    grid: "rgba(15,23,42,.08)", barCursor: "rgba(15,23,42,.04)",
    navText: "#475569",
    risk: {
      LOW: { bg: "rgba(5,150,105,.10)", fg: "#059669", border: "rgba(5,150,105,.3)" },
      MEDIUM: { bg: "rgba(13,148,136,.10)", fg: "#0d9488", border: "rgba(13,148,136,.3)" },
      HIGH: { bg: "rgba(180,83,9,.10)", fg: "#b45309", border: "rgba(180,83,9,.3)" },
      CRITICAL: { bg: "rgba(225,29,72,.10)", fg: "#e11d48", border: "rgba(225,29,72,.35)" },
    },
    status: {
      active: { fg: "#059669", bg: "rgba(5,150,105,.09)", border: "rgba(5,150,105,.3)" },
      suspended: { fg: "#e11d48", bg: "rgba(225,29,72,.08)", border: "rgba(225,29,72,.3)" },
      pending: { fg: "#475569", bg: "rgba(71,85,105,.08)", border: "rgba(71,85,105,.25)" },
    },
    action: {
      BLOCK: { fg: "#e11d48", bg: "rgba(225,29,72,.08)" },
      "REQUIRE APPROVAL": { fg: "#2563eb", bg: "rgba(37,99,235,.08)" },
      AUDIT: { fg: "#475569", bg: "rgba(71,85,105,.08)" },
      WARN: { fg: "#b45309", bg: "rgba(180,83,9,.1)" },
    },
    bar: { LOW: "#10b981", MEDIUM: "#14b8a6", HIGH: "#f59e0b", CRITICAL: "#e11d48" },
    heat: s => s >= 80
      ? { bg: "rgba(225,29,72,.08)", border: "rgba(225,29,72,.4)", fg: "#be123c", sub: "#e11d48" }
      : s >= 25
        ? { bg: "rgba(180,83,9,.07)", border: "rgba(180,83,9,.35)", fg: "#b45309", sub: "#b45309" }
        : { bg: "rgba(5,150,105,.06)", border: "rgba(5,150,105,.3)", fg: "#059669", sub: "#059669" },
    warnBox: { bg: "rgba(180,83,9,.07)", border: "rgba(180,83,9,.3)", fg: "#92400e" },
  },
};

const ThemeCtx = createContext(THEMES.dark);
const useT = () => useContext(ThemeCtx);

const useIsMobile = (bp = 820) => {
  const query = `(max-width: ${bp}px)`;
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
};

const PageHeader = ({ title, subtitle, children }) => {
  const T = useT();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, margin: 0 }}>{title}</h1>
        <div style={{ color: T.dim, marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{subtitle}</div>
      </div>
      {children && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
};

const fieldStyle = T => ({
  width: "100%", boxSizing: "border-box", background: T.panelSoft,
  border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px",
  color: T.text, fontSize: 14, outline: "none",
});
const labelStyle = T => ({ color: T.dim, fontSize: 12.5, fontWeight: 600, marginBottom: 6, display: "block" });

const PanoptesMark = ({ size = 26, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ color, flexShrink: 0 }} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <path strokeWidth="5.5" d="M31.2 51.2 A20 20 0 0 1 68.8 51.2" />
      <path strokeWidth="5.5" opacity="0.62" d="M20.9 47.4 A31 31 0 0 1 79.1 47.4" />
      <path strokeWidth="5.5" opacity="0.34" d="M10.5 43.6 A42 42 0 0 1 89.5 43.6" />
      <circle cx="50" cy="60" r="10.5" strokeWidth="5.5" />
    </g>
    <circle cx="50" cy="60" r="5.2" fill="#4a9eea" />
  </svg>
);

/* ---------------- small components ---------------- */

const Pill = ({ children, fg, bg, border, small }) => (
  <span style={{
    fontSize: small ? 11 : 12, fontWeight: 600, padding: small ? "2px 8px" : "3px 10px",
    borderRadius: 6, color: fg, background: bg, border: `1px solid ${border || "transparent"}`,
    whiteSpace: "nowrap", letterSpacing: ".02em",
  }}>{children}</span>
);

const SevDot = ({ sev, size = 16 }) => {
  const T = useT();
  const map = {
    critical: <AlertOctagon size={size} color={T.isDark ? "#f43f5e" : "#e11d48"} />,
    warn: <AlertCircle size={size} color={T.isDark ? "#f59e0b" : "#b45309"} />,
    info: <Info size={size} color={T.isDark ? "#60a5fa" : "#2563eb"} />,
  };
  return map[sev] || map.info;
};

const Card = ({ children, style, onClick }) => {
  const T = useT();
  return (
    <div onClick={onClick} style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, ...style,
    }}>{children}</div>
  );
};

const Toggle = ({ on, onChange }) => {
  const T = useT();
  return (
    <button onClick={onChange} aria-label={on ? "Disable policy" : "Enable policy"} style={{
      width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
      background: on ? T.blue : "rgba(148,163,184,.35)", position: "relative",
      transition: "background .15s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "#fff", transition: "left .15s",
      }} />
    </button>
  );
};

const Modal = ({ title, subtitle, onClose, children }) => {
  const T = useT();
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto",
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 26,
        boxSizing: "border-box", boxShadow: T.shadow,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={19} /></button>
        </div>
        <div style={{ color: T.dim, fontSize: 13.5, marginBottom: 20 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
};

/* ---------------- register agent modal ---------------- */

function TraitPicker({ traits, onChange }) {
  const T = useT();
  return (
    <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: "8px 14px" }}>
      {TRAITS.map(t => (
        <label key={t.id} title={t.hint} style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", fontSize: 13.5, lineHeight: 1.4 }}>
          <input type="checkbox" checked={!!traits[t.id]} onChange={e => onChange({ ...traits, [t.id]: e.target.checked })}
            style={{ width: 16, height: 16, marginTop: 1, accentColor: T.blue, flexShrink: 0 }} />
          <span>{t.label}</span>
        </label>
      ))}
    </div>
  );
}

const MappingPreview = ({ m }) => {
  const T = useT();
  const missing = m.policies.filter(p => p.state !== "active").length;
  return (
    <div style={{ background: T.blueSoft, border: `1px solid ${T.blueBorder}`, borderRadius: 9, padding: "10px 12px", fontSize: 13, lineHeight: 1.5 }}>
      In scope for <b>{m.frameworks.length} frameworks</b> and <b>{m.policies.length} policies</b>
      {missing > 0 && <span style={{ color: T.dim }}> ({missing} not yet in place)</span>}. You can review and exclude mappings after registering.
    </div>
  );
};

function RegisterAgentModal({ onClose, onRegister, policies }) {
  const T = useT();
  const [f, setF] = useState({ name: "", model: "claude-3-5-sonnet", dept: "Engineering", autonomy: "Supervised", owner: "", desc: "", traits: {} });
  const set = patch => setF(s => ({ ...s, ...patch }));
  const valid = f.name.trim() && f.owner.trim() && f.desc.trim();
  const preview = mapAgent(f, policies);
  return (
    <Modal title="Register Agent" subtitle="New agents enter the registry as pending until security review completes." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle(T)}>Agent name</label>
          <input style={fieldStyle(T)} value={f.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. ContractDraft AI" />
        </div>
        <div>
          <label style={labelStyle(T)}>Description</label>
          <textarea rows={3} style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} value={f.desc}
            onChange={e => set({ desc: e.target.value })} placeholder="What does this agent do, for whom, and with what data or systems?" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Model</label>
            <select style={fieldStyle(T)} value={f.model} onChange={e => set({ model: e.target.value })}>
              {["claude-3-5-sonnet", "claude-3-haiku", "gpt-4o", "gpt-4o-mini", "gemini-1.5-pro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Department</label>
            <select style={fieldStyle(T)} value={f.dept} onChange={e => set({ dept: e.target.value })}>
              {["Engineering", "Finance", "Legal", "HR", "Marketing", "Security", "Customer Success", "Operations"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Autonomy level</label>
            <select style={fieldStyle(T)} value={f.autonomy} onChange={e => set({ autonomy: e.target.value })}>
              {["Supervised", "Semi-autonomous", "Full autonomy"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Owner (team)</label>
            <input style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })} placeholder="e.g. Legal Ops" />
          </div>
        </div>
        <div>
          <label style={labelStyle(T)}>Characteristics</label>
          <div style={{ color: T.faint, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>
            Check everything that applies. ARGUS uses these to decide which frameworks and policies apply to the agent.
          </div>
          <TraitPicker traits={f.traits} onChange={traits => set({ traits })} />
        </div>
        <MappingPreview m={preview} />
        {f.autonomy === "Full autonomy" && (
          <div style={{ display: "flex", gap: 10, background: T.warnBox.bg, border: `1px solid ${T.warnBox.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <AlertCircle size={16} color={T.warnBox.fg} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.warnBox.fg, lineHeight: 1.5 }}>
              Full-autonomy agents start with an elevated risk score and are subject to the "Limit Full-Autonomy Agent Actions" policy: write operations will require supervisor approval.
            </div>
          </div>
        )}
        <button disabled={!valid} onClick={() => onRegister(f)} style={{
          background: valid ? T.blue : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 9, padding: "12px 16px", fontSize: 15, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed", marginTop: 4,
        }}>
          Register agent
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- create policy modal ---------------- */

const MAX_DOC_MB = 10;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtSize = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

// Read an uploaded file into an in-memory link. Nothing leaves the browser.
const toDocMeta = file => ({ name: file.name, size: file.size, url: URL.createObjectURL(file), uploadedOn: todayISO() });

function DocUpload({ doc, onChange }) {
  const T = useT();
  const [err, setErr] = useState("");
  const pick = e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) { setErr("Upload a PDF or Word document."); return; }
    if (file.size > MAX_DOC_MB * 1048576) { setErr(`Files must be ${MAX_DOC_MB} MB or smaller.`); return; }
    setErr("");
    onChange(toDocMeta(file));
  };
  return (
    <div>
      {doc ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px" }}>
          <FileText size={16} color={T.blue} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
            <div style={{ fontSize: 12, color: T.faint }}>{fmtSize(doc.size)}</div>
          </div>
          <button onClick={() => onChange(null)} aria-label="Remove document" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={16} /></button>
        </div>
      ) : (
        <label style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
          border: `1px dashed ${T.blueBorder}`, borderRadius: 8, padding: "12px", color: T.blue, fontSize: 13.5, fontWeight: 600,
          background: T.blueSoft,
        }}>
          <Upload size={15} /> Upload approved policy (PDF or Word)
          <input type="file" accept=".pdf,.doc,.docx" onChange={pick} style={{ display: "none" }} />
        </label>
      )}
      {err && <div style={{ color: T.isDark ? "#f43f5e" : "#e11d48", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <div style={{ color: T.faint, fontSize: 11.5, marginTop: 6, lineHeight: 1.45 }}>
        Demo: the file stays in this browser tab and is cleared on refresh. Don't upload confidential documents.
      </div>
    </div>
  );
}

// Approver picker + date, with a segregation-of-duties check against the owner
function ApprovalFields({ owner, approvedBy, approvedOn, onChange }) {
  const T = useT();
  const sameAsOwner = approvedBy && approvedBy === owner;
  return (
    <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1.5fr 1fr", gap: 12 }}>
      <div>
        <label style={labelStyle(T)}>Approved by</label>
        <select style={fieldStyle(T)} value={approvedBy} onChange={e => onChange({ approvedBy: e.target.value })}>
          <option value="">Select approver…</option>
          {POLICY_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {sameAsOwner && (
          <div style={{ color: T.isDark ? "#f59e0b" : "#b45309", fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
            The approver should be independent of the policy owner. Choose a different role.
          </div>
        )}
      </div>
      <div>
        <label style={labelStyle(T)}>Approval date</label>
        <input type="date" style={fieldStyle(T)} value={approvedOn} max={todayISO()} onChange={e => onChange({ approvedOn: e.target.value })} />
      </div>
    </div>
  );
}

const CATEGORIES = ["Access Control", "AI Governance", "AI Security", "AI Quality", "Change Management", "Data Privacy",
  "External Communication", "GDPR", "HIPAA", "Human Oversight", "Incident Response", "Third-Party Risk", "Transparency", "Custom"];

function CreatePolicyModal({ onClose, onCreate, initialTemplate, policies }) {
  const T = useT();
  const blank = { templateId: "", name: "", tag: "Access Control", desc: "", action: "BLOCK", owner: "", frameworks: [], doc: null, approved: false, approvedBy: "", approvedOn: todayISO() };
  const fromTemplate = id => {
    const t = RECOMMENDED_POLICIES.find(x => x.id === id);
    return t ? { templateId: t.id, name: t.name, tag: t.tag, desc: t.desc, action: t.action, owner: t.owner } : { templateId: "" };
  };
  const [f, setF] = useState(() => ({ ...blank, ...fromTemplate(initialTemplate) }));
  const set = patch => setF(s => ({ ...s, ...patch }));
  const toggleFw = fw => setF(s => ({
    ...s, frameworks: s.frameworks.includes(fw) ? s.frameworks.filter(x => x !== fw) : [...s.frameworks, fw],
  }));

  const tpl = RECOMMENDED_POLICIES.find(x => x.id === f.templateId);
  const adopted = new Set(policies.map(p => p.id));
  const approvalOk = !f.approved || (f.approvedBy && f.approvedBy !== f.owner && f.approvedOn);
  const valid = f.name.trim() && f.desc.trim() && f.owner && approvalOk;

  return (
    <Modal title="Create Policy" subtitle="Start from a template or write your own. A policy counts toward framework coverage once it is approved." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle(T)}>Start from a template</label>
          <select style={fieldStyle(T)} value={f.templateId} onChange={e => set(e.target.value ? fromTemplate(e.target.value) : { templateId: "" })}>
            <option value="">Blank policy</option>
            {RECOMMENDED_POLICIES.map(t => (
              <option key={t.id} value={t.id} disabled={adopted.has(t.id)}>{t.name}{adopted.has(t.id) ? " (already added)" : ""}</option>
            ))}
          </select>
          <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
            {tpl ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>Closes:</span>
                  {tpl.closeKeys.map(k => <Pill key={k} small fg={T.dim} bg={T.panel} border={T.border}>{reqLabel(k)}</Pill>)}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>Evidence to retain: </span><span style={{ color: T.dim }}>{tpl.evidence}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: T.dim }}>No template selected. Use the general template to draft the document.</div>
            )}
            <a href={tpl ? tpl.template : BLANK_TEMPLATE} download style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, color: T.blue, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Download size={14} /> Download {tpl ? "policy template" : "general policy template"} (.docx)
            </a>
          </div>
        </div>

        <div>
          <label style={labelStyle(T)}>Policy name</label>
          <input style={fieldStyle(T)} value={f.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Require Model Card Before Activation" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Category</label>
            <select style={fieldStyle(T)} value={f.tag} onChange={e => set({ tag: e.target.value })}>
              {CATEGORIES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Enforcement action</label>
            <select style={fieldStyle(T)} value={f.action} onChange={e => set({ action: e.target.value })}>
              {["BLOCK", "REQUIRE APPROVAL", "WARN", "AUDIT"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle(T)}>Description</label>
          <textarea rows={3} style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} value={f.desc}
            onChange={e => set({ desc: e.target.value })} placeholder="What behavior does this policy govern, and when does it trigger?" />
        </div>
        <div>
          <label style={labelStyle(T)}>Policy owner</label>
          <select style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })}>
            <option value="">Select the accountable role…</option>
            {POLICY_ROLES.map(r => <option key={r} value={r}>{r}{tpl && tpl.owner === r ? " (suggested)" : ""}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle(T)}>Policy document</label>
          <DocUpload doc={f.doc} onChange={doc => set({ doc })} />
        </div>

        <div style={{ border: `1px solid ${f.approved ? T.blueBorder : T.border}`, borderRadius: 10, padding: "12px 14px", background: f.approved ? T.blueSoft : "transparent" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={f.approved} onChange={e => set({ approved: e.target.checked })}
              style={{ width: 17, height: 17, marginTop: 1, accentColor: T.blue, flexShrink: 0 }} />
            <span>
              <span style={{ fontSize: 14, fontWeight: 700, display: "block" }}>This policy has been approved</span>
              <span style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, display: "block", marginTop: 2 }}>
                {f.approved
                  ? (f.doc ? "The uploaded document will be kept as approval evidence." : "Tip: upload the signed document above as approval evidence.")
                  : "Leave unchecked to save as a draft. Drafts don't count toward coverage until approved."}
              </span>
            </span>
          </label>
          {f.approved && (
            <div style={{ marginTop: 12 }}>
              <ApprovalFields owner={f.owner} approvedBy={f.approvedBy} approvedOn={f.approvedOn} onChange={set} />
            </div>
          )}
        </div>

        {!tpl && (
          <div>
            <label style={labelStyle(T)}>Framework tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FRAMEWORKS.map(fw => fw.short).map(fw => {
                const on = f.frameworks.includes(fw);
                return (
                  <button key={fw} onClick={() => toggleFw(fw)} style={{
                    fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                    background: on ? T.blueSoft : T.panelSoft, border: `1px solid ${on ? T.blue : T.border}`,
                    color: on ? T.blue : T.dim, transition: "all .12s",
                  }}>{fw}</button>
                );
              })}
            </div>
            <div style={{ color: T.faint, fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
              Tags group the policy by framework. To count toward coverage, map it to a specific requirement from the Frameworks page.
            </div>
          </div>
        )}

        <button disabled={!valid} onClick={() => onCreate(f)} style={{
          background: valid ? T.blue : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 9, padding: "12px 16px", fontSize: 15, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed", marginTop: 4,
        }}>
          {f.approved ? "Create approved policy" : "Save as draft"}
        </button>
      </div>
    </Modal>
  );
}

function ApprovePolicyModal({ policy, onClose, onApprove }) {
  const T = useT();
  const [a, setA] = useState({ approvedBy: "", approvedOn: todayISO(), doc: policy.doc || null });
  const set = patch => setA(s => ({ ...s, ...patch }));
  const valid = a.approvedBy && a.approvedBy !== policy.owner && a.approvedOn;
  return (
    <Modal title="Approve policy" subtitle={`${policy.name}. Once approved, it counts toward every framework requirement it is mapped to.`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13.5, color: T.dim }}>Policy owner: <b style={{ color: T.text }}>{policy.owner}</b></div>
        <ApprovalFields owner={policy.owner} approvedBy={a.approvedBy} approvedOn={a.approvedOn} onChange={set} />
        <div>
          <label style={labelStyle(T)}>Approved document</label>
          <DocUpload doc={a.doc} onChange={doc => set({ doc })} />
        </div>
        <button disabled={!valid} onClick={() => onApprove(policy.id, a)} style={{
          background: valid ? T.blue : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 9, padding: "12px 16px", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
        }}>
          Approve policy
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- views ---------------- */

function Dashboard({ agents, coverage, openAgent, onOpenFrameworks }) {
  const T = useT();
  const active = agents.filter(a => a.status === "active").length;
  const suspended = agents.filter(a => a.status === "suspended").length;
  const critical = agents.filter(a => a.risk === "CRITICAL").length;

  const dist = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(k => ({
    level: k[0] + k.slice(1).toLowerCase(),
    count: agents.filter(a => a.risk === k).length, key: k,
  }));

  const green = T.isDark ? "#34d399" : "#059669";
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const amber = T.isDark ? "#f59e0b" : "#b45309";

  const kpis = [
    { label: "Active Agents", value: `${active} / ${agents.length}`, sub: `${suspended} suspended`, icon: <Cpu size={18} color={T.blue} />, color: T.text },
    { label: "Compliance Score", value: `${coverage.pct}%`, sub: `${coverage.covered} of ${coverage.total} framework requirements covered`, icon: <HeartPulse size={18} color={green} />, color: green },
    { label: "Critical Risk", value: critical, sub: "Agents requiring immediate review", icon: <ShieldAlert size={18} color={red} />, color: red },
    { label: "Control Gaps", value: coverage.gaps, sub: `Across ${coverage.frameworks.length} frameworks`, icon: <AlertTriangle size={18} color={amber} />, color: amber },
  ];

  const pad = T.mobile ? 16 : 22;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.mobile ? 14 : 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 150 : 210}px, 1fr))`, gap: T.mobile ? 10 : 16 }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding: T.mobile ? 14 : 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: T.mobile ? 8 : 14, gap: 6 }}>
              <span style={{ color: T.dim, fontSize: T.mobile ? 12.5 : 14 }}>{k.label}</span>{k.icon}
            </div>
            <div style={{ fontSize: T.mobile ? 24 : 30, fontWeight: 700, color: k.color, marginBottom: 6 }}>{k.value}</div>
            <div style={{ color: T.faint, fontSize: T.mobile ? 11.5 : 13, lineHeight: 1.4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)", gap: T.mobile ? 14 : 20 }}>
        <Card style={{ padding: pad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Risk Field</div>
              <div style={{ color: T.dim, fontSize: 13 }}>Bubble size scales with risk score. Tap a bubble to inspect.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {dist.map(d => (
                <span key={d.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.dim }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.bar[d.key] }} />
                  {d.level} {d.count}
                </span>
              ))}
            </div>
          </div>
          <RiskBubbles agents={agents} openAgent={openAgent} />
        </Card>

        <Card style={{ padding: pad, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Recent Alerts</div>
          <div style={{ color: T.dim, fontSize: 13, marginBottom: 14 }}>Latest high-priority events requiring attention.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
            {ALERTS.map((a, i) => (
              <div key={i} onClick={() => openAgent(a.agent)} style={{
                background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "12px 14px", display: "flex", gap: 10, cursor: "pointer",
              }}>
                <div style={{ marginTop: 3 }}><SevDot sev={a.sev} size={13} /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{a.title}</div>
                  <div style={{ color: T.faint, fontSize: 12, marginTop: 4 }}>{a.agent} &nbsp;•&nbsp; {a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ padding: pad }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Framework Coverage</div>
            <div style={{ color: T.dim, fontSize: 13 }}>Share of mapped requirements with an active control.</div>
          </div>
          <button onClick={onOpenFrameworks} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: T.blue, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            View all frameworks <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${T.mobile ? 220 : 250}px, 1fr))`, gap: "12px 24px" }}>
          {coverage.frameworks.filter(f => f.group !== "baseline").map(f => (
            <CoverageBar key={f.id} label={f.short} covered={f.covered} total={f.total} pct={f.pct} />
          ))}
        </div>
      </Card>
    </div>
  );
}

const coverageColor = (T, pct) =>
  pct >= 80 ? (T.isDark ? "#34d399" : "#059669") : pct >= 60 ? (T.isDark ? "#f59e0b" : "#b45309") : (T.isDark ? "#f43f5e" : "#e11d48");

function CoverageBar({ label, covered, total, pct }) {
  const T = useT();
  const c = coverageColor(T, pct);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: T.dim, whiteSpace: "nowrap" }}>{covered}/{total} · <span style={{ color: c, fontWeight: 700 }}>{pct}%</span></span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 99, transition: "width .3s" }} />
      </div>
    </div>
  );
}

const FilterChip = ({ active, onClick, label, count }) => {
  const T = useT();
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
      background: active ? T.blue : T.panel, color: active ? "#fff" : T.dim,
      border: `1px solid ${active ? T.blue : T.border}`,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 11.5, fontWeight: 700, minWidth: 18, textAlign: "center", padding: "1px 6px", borderRadius: 99,
          background: active ? "rgba(255,255,255,.22)" : T.panelSoft, color: active ? "#fff" : T.faint,
        }}>{count}</span>
      )}
    </button>
  );
};

const chipRow = mobile => ({
  display: "flex", gap: 8, flexWrap: mobile ? "nowrap" : "wrap", overflowX: "auto", paddingBottom: 2,
});

// framework short name -> group id, used to place each policy in the framework groups
const FW_GROUP = Object.fromEntries(FRAMEWORKS.map(f => [f.short, f.group]));

function ControlsBadge({ m }) {
  const T = useT();
  const pct = m.controlsRequired ? m.controlsInPlace / m.controlsRequired : 1;
  const c = pct >= 1 ? (T.isDark ? "#34d399" : "#059669") : pct >= 0.7 ? (T.isDark ? "#f59e0b" : "#b45309") : (T.isDark ? "#f43f5e" : "#e11d48");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, whiteSpace: "nowrap" }}>
      <span style={{ width: 46, height: 6, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}`, overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", width: `${pct * 100}%`, height: "100%", background: c }} />
      </span>
      <span><b style={{ color: c }}>{m.controlsInPlace}</b><span style={{ color: T.dim }}> of {m.controlsRequired}</span></span>
    </span>
  );
}

function Registry({ agents, policies, openAgent, onOpenRegister }) {
  const T = useT();
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [fw, setFw] = useState("all");

  const rows = useMemo(() => agents.map(a => ({ a, m: mapAgent(a, policies) })), [agents, policies]);
  const matchQ = r => [r.a.name, r.a.model, r.a.dept, r.a.risk, r.a.status, r.a.desc, r.a.owner]
    .join(" ").toLowerCase().includes(q.toLowerCase());
  const matchFw = r => fw === "all" || r.m.inScopeFrameworks.some(x => x.id === fw);
  const matchRisk = (r, v = risk) => v === "all" || r.a.risk === v;
  const matchStatus = (r, v = status) => v === "all" || r.a.status === v;
  const base = rows.filter(r => matchQ(r) && matchFw(r));
  const shown = base.filter(r => matchRisk(r) && matchStatus(r));
  const filtered = q || risk !== "all" || status !== "all" || fw !== "all";

  const riskChips = [["all", "All risk levels"], ["CRITICAL", "Critical"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]];
  const statusChips = [["all", "Any status"], ["active", "Active"], ["pending", "Pending review"], ["suspended", "Suspended"]];

  return (
    <div>
      <PageHeader title="Agent Registry" subtitle="Directory of all deployed AI agents, with the frameworks and policies each one is in scope for.">
        <button onClick={onOpenRegister} style={{ display: "flex", alignItems: "center", gap: 8, background: T.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Register Agent
        </button>
      </PageHeader>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0 14px" }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 520 }}>
          <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents, descriptions, owners..."
            style={{ ...fieldStyle(T), background: T.panel, borderRadius: 10, padding: "11px 14px 11px 40px" }} />
        </div>
        <select value={fw} onChange={e => setFw(e.target.value)} aria-label="Filter by framework in scope"
          style={{ ...fieldStyle(T), background: fw === "all" ? T.panel : T.blueSoft, borderColor: fw === "all" ? T.border : T.blue, color: fw === "all" ? T.text : T.blue, fontWeight: fw === "all" ? 400 : 600, width: "auto", flex: T.mobile ? "1 1 100%" : "0 1 260px", borderRadius: 10 }}>
          <option value="all">In scope for: any framework</option>
          {FRAMEWORKS.filter(f => f.id !== "csa-aismm").map(f => (
            <option key={f.id} value={f.id}>In scope for: {f.short} ({rows.filter(r => matchQ(r) && r.m.inScopeFrameworks.some(x => x.id === f.id)).length})</option>
          ))}
        </select>
      </div>

      <div style={chipRow(T.mobile)}>
        {riskChips.map(([id, label]) => (
          <FilterChip key={id} active={risk === id} onClick={() => setRisk(id)} label={label}
            count={base.filter(r => matchRisk(r, id) && matchStatus(r)).length} />
        ))}
      </div>
      <div style={{ ...chipRow(T.mobile), marginTop: 8 }}>
        {statusChips.map(([id, label]) => (
          <FilterChip key={id} active={status === id} onClick={() => setStatus(id)} label={label}
            count={base.filter(r => matchRisk(r) && matchStatus(r, id)).length} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 14px", color: T.faint, fontSize: 13 }}>
        <span>Showing {shown.length} of {agents.length} agents</span>
        {filtered && (
          <button onClick={() => { setQ(""); setRisk("all"); setStatus("all"); setFw("all"); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Clear filters
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <Card style={{ padding: 28, textAlign: "center", color: T.faint }}>No agents match these filters.</Card>
      )}

      {T.mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map(({ a, m }) => {
            const r = T.risk[a.risk], s = T.status[a.status];
            return (
              <Card key={a.id} onClick={() => openAgent(a.name)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</div>
                    <div style={{ color: T.faint, fontSize: 12.5, marginTop: 2 }}>{a.dept} · {a.model}</div>
                  </div>
                  <ChevronRight size={18} color={T.faint} style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
                {a.desc && <div style={{ color: T.dim, fontSize: 13, lineHeight: 1.45, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.desc}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill fg={s.fg} bg={s.bg} border={s.border}>{a.status}</Pill>
                  <Pill fg={r.fg} bg={r.bg} border={r.border}>{a.risk}</Pill>
                  <span style={{ marginLeft: "auto" }}><ControlsBadge m={m} /></span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : shown.length > 0 && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 13, textAlign: "left" }}>
                  {["Agent", "Department", "Status", "Risk Level", "Frameworks", "Controls in place", ""].map((h, i) => (
                    <th key={i} style={{ padding: "13px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ a, m }) => {
                  const r = T.risk[a.risk], s = T.status[a.status];
                  return (
                    <tr key={a.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: "14px 16px", maxWidth: 340 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</div>
                        <div style={{ color: T.faint, fontSize: 12.5, marginTop: 2 }}>{a.model}</div>
                        {a.desc && <div title={a.desc} style={{ color: T.dim, fontSize: 12.5, marginTop: 4, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.desc}</div>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 14 }}>{a.dept}</td>
                      <td style={{ padding: "14px 16px" }}><Pill fg={s.fg} bg={s.bg} border={s.border}>{a.status}</Pill></td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {a.risk === "CRITICAL" && <ShieldAlert size={14} color={r.fg} />}
                          <Pill fg={r.fg} bg={r.bg} border={r.border}>{a.risk}</Pill>
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13.5 }} title={m.inScopeFrameworks.map(f => f.short).join(", ")}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {m.inScopeFrameworks.length}
                          {m.inScopeFrameworks.some(f => f.id === "eu-ai-act") && <Pill small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>EU AI Act</Pill>}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}><ControlsBadge m={m} /></td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button onClick={() => openAgent(a.name)} style={{ background: "none", border: "none", color: T.blue, fontSize: 14, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>View Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function PolicyMeta({ p, onApprove }) {
  const T = useT();
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const green = T.isDark ? "#34d399" : "#059669";
  const tpl = RECOMMENDED_POLICIES.find(t => t.id === p.templateId);
  const link = { display: "inline-flex", alignItems: "center", gap: 5, color: T.blue, fontSize: 12.5, fontWeight: 600, textDecoration: "none", maxWidth: "100%" };
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${T.border}`, display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
      {p.owner && <div style={{ color: T.dim }}>Owner: <span style={{ color: T.text, fontWeight: 600 }}>{p.owner}</span></div>}
      {p.status === "draft" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: amber, fontWeight: 700 }}>
            <Clock size={13} /> Draft, pending approval
          </span>
          <button onClick={() => onApprove(p.id)} style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 7, cursor: "pointer", background: T.blue, color: "#fff", border: "none" }}>
            Approve
          </button>
        </div>
      ) : p.approvedBy && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.dim }}>
          <BadgeCheck size={14} color={green} style={{ flexShrink: 0 }} />
          <span>Approved by <span style={{ color: T.text, fontWeight: 600 }}>{p.approvedBy}</span> · <span style={{ whiteSpace: "nowrap" }}>{p.approvedOn}</span></span>
        </div>
      )}
      {(p.doc || tpl) && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {p.doc && (
            <a href={p.doc.url} download={p.doc.name} style={link} title={p.doc.name}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.doc.name}</span>
            </a>
          )}
          {tpl && <a href={tpl.template} download style={link}><Download size={13} /> Template</a>}
        </div>
      )}
    </div>
  );
}

function PolicyEngine({ policies, reqMap, toggle, onOpenCreate, onApprove }) {
  const T = useT();
  const [group, setGroup] = useState("all");
  const [action, setAction] = useState("all");

  const rows = useMemo(() => policies.map(p => {
    const fws = frameworksForPolicy(p, reqMap);
    return { p, fws, groups: new Set(fws.map(f => FW_GROUP[f]).filter(Boolean)) };
  }), [policies, reqMap]);

  const inGroup = (r, g) => g === "all" || (g === "unmapped" ? r.groups.size === 0 : r.groups.has(g));
  const inAction = (r, act) => act === "all" || r.p.action === act;
  const shown = rows.filter(r => inGroup(r, group) && inAction(r, action));

  const groupChips = [{ id: "all", label: "All" }, ...FRAMEWORK_GROUPS];
  const unmapped = rows.filter(r => r.groups.size === 0).length;
  if (unmapped > 0 || group === "unmapped") groupChips.push({ id: "unmapped", label: "Not mapped" });
  const actionChips = [
    { id: "all", label: "Any action" },
    { id: "BLOCK", label: "Block" },
    { id: "REQUIRE APPROVAL", label: "Require approval" },
    { id: "WARN", label: "Warn" },
    { id: "AUDIT", label: "Audit" },
  ];
  const filtered = group !== "all" || action !== "all";

  return (
    <div>
      <PageHeader title="Policy Engine" subtitle="Define and manage governance rules for AI agent behavior. Framework tags come from the requirement crosswalk.">
        <button onClick={onOpenCreate} style={{ display: "flex", alignItems: "center", gap: 8, background: T.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Create Policy
        </button>
      </PageHeader>

      <div style={{ ...chipRow(T.mobile), marginTop: 20 }}>
        {groupChips.map(g => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label}
            count={rows.filter(r => inGroup(r, g.id) && inAction(r, action)).length} />
        ))}
      </div>
      <div style={{ ...chipRow(T.mobile), marginTop: 8 }}>
        {actionChips.map(c => (
          <FilterChip key={c.id} active={action === c.id} onClick={() => setAction(c.id)} label={c.label}
            count={rows.filter(r => inGroup(r, group) && inAction(r, c.id)).length} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, color: T.faint, fontSize: 13 }}>
        <span>Showing {shown.length} of {policies.length} policies</span>
        {filtered && (
          <button onClick={() => { setGroup("all"); setAction("all"); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Clear filters
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <Card style={{ padding: 28, textAlign: "center", color: T.faint, marginTop: 14 }}>
          No policies match these filters.
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: T.mobile ? 12 : 16, marginTop: 14 }}>
        {shown.map(({ p, fws }) => {
          const a = T.action[p.action];
          const tags = fws.slice(0, 5);
          return (
            <Card key={p.id} style={{ display: "flex", flexDirection: "column", opacity: p.enabled ? 1 : 0.6, transition: "opacity .15s" }}>
              <div style={{ padding: "18px 18px 14px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Pill fg={T.dim} bg={T.panelSoft} border={T.border}>{p.tag}</Pill>
                  <Toggle on={p.enabled} onChange={() => toggle(p.id)} />
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ color: T.dim, fontSize: 13.5, lineHeight: 1.5 }}>{p.desc}</div>
                {p.evidence && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
                    <span style={{ fontWeight: 700 }}>Evidence: </span><span style={{ color: T.dim }}>{p.evidence}</span>
                  </div>
                )}
                {fws.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {tags.map(fw => (
                      <Pill key={fw} small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>{fw}</Pill>
                    ))}
                    {fws.length > tags.length && (
                      <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>+{fws.length - tags.length} more</Pill>
                    )}
                  </div>
                )}
                <PolicyMeta p={p} onApprove={onApprove} />
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pill fg={a.fg} bg={a.bg}>Action: {p.action}</Pill>
                <span style={{ color: T.dim, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={13} /> {p.violations} Violations
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AuditTrail({ audit }) {
  const T = useT();
  const exportCsv = () => {
    const rows = [["Timestamp", "Event Type", "Agent", "Description"],
      ...audit.map(e => [e.ts, e.type, e.agent, e.desc])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "argus-audit-trail.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Ledger of platform events and governance actions.">
        <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "9px 16px", fontSize: 14, cursor: "pointer" }}>
          <Download size={15} /> Export CSV
        </button>
      </PageHeader>

      {T.mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {audit.map((e, i) => (
            <Card key={i} style={{ padding: "13px 14px", display: "flex", gap: 10 }}>
              <div style={{ marginTop: 2 }}><SevDot sev={e.sev} size={15} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <Pill small fg={T.text} bg={T.panelSoft} border={T.border}>{e.type}</Pill>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{e.agent}</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{e.desc}</div>
                <div style={{ color: T.faint, fontSize: 11.5, marginTop: 6, fontFamily: "ui-monospace, monospace" }}>{e.ts}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card style={{ marginTop: 20, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 13, textAlign: "left" }}>
                  {["", "Timestamp", "Event Type", "Agent", "Description"].map((h, i) => (
                    <th key={i} style={{ padding: "13px 16px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map((e, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "13px 16px", width: 20 }}><SevDot sev={e.sev} /></td>
                    <td style={{ padding: "13px 16px", fontFamily: "ui-monospace, monospace", fontSize: 13, color: T.dim, whiteSpace: "nowrap" }}>{e.ts}</td>
                    <td style={{ padding: "13px 16px" }}><Pill fg={T.text} bg={T.panelSoft} border={T.border}>{e.type}</Pill></td>
                    <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>{e.agent}</td>
                    <td style={{ padding: "13px 16px", fontSize: 14, color: T.text }}>{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- frameworks ---------------- */

function Frameworks({ coverage, gapKeys, policies, onOpen, onAdopt }) {
  const T = useT();
  const [group, setGroup] = useState("all");
  const list = coverage.frameworks.filter(f => group === "all" || f.group === group);

  const summary = [
    { label: "Overall coverage", value: `${coverage.pct}%`, color: coverageColor(T, coverage.pct) },
    { label: "Frameworks tracked", value: coverage.frameworks.length, color: T.text },
    { label: "Requirements mapped", value: coverage.total, color: T.text },
    { label: "Open gaps", value: coverage.gaps, color: T.isDark ? "#f59e0b" : "#b45309" },
  ];

  return (
    <div>
      <PageHeader title="Frameworks" subtitle="Requirement-to-control traceability across AI regulations, standards and threat frameworks. Open a framework to see which policies satisfy each requirement and to close gaps." />

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 140 : 180}px, 1fr))`, gap: T.mobile ? 10 : 14, marginTop: 20 }}>
        {summary.map(s => (
          <Card key={s.label} style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{s.label}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <RecommendationPlan gapKeys={gapKeys} policies={policies} onAdopt={onAdopt} totalGaps={coverage.gaps} />

      <div style={{ display: "flex", gap: 8, flexWrap: T.mobile ? "nowrap" : "wrap", overflowX: "auto", margin: "20px 0 16px", paddingBottom: 2 }}>
        {[{ id: "all", label: "All" }, ...FRAMEWORK_GROUPS].map(g => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label}
            count={coverage.frameworks.filter(f => g.id === "all" || f.group === g.id).length} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))", gap: T.mobile ? 12 : 16 }}>
        {list.map(f => {
          const gaps = f.total - f.covered;
          const level = Math.max(1, Math.min(5, 1 + Math.round((f.pct / 100) * 4)));
          return (
            <Card key={f.id} onClick={() => onOpen(f.id)} style={{ padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>{FRAMEWORK_GROUPS.find(g => g.id === f.group).label}</Pill>
                <ChevronRight size={17} color={T.faint} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{f.name}</div>
                <div style={{ color: T.faint, fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{f.source}</div>
              </div>
              <div style={{ marginTop: "auto" }}>
                <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Coverage"} covered={f.covered} total={f.total} pct={f.pct} />
                <div style={{ color: gaps ? (T.isDark ? "#f59e0b" : "#b45309") : T.faint, fontSize: 12.5, marginTop: 8 }}>
                  {gaps ? `${gaps} open gap${gaps > 1 ? "s" : ""}` : "No open gaps"}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ color: T.faint, fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
        Each framework shows a curated set of requirements relevant to governing AI agents, not the full text. Coverage counts a requirement once any enabled policy or always-on platform capability maps to it.
      </div>
    </div>
  );
}

function RecommendedControl({ tpl, reqKey, gapKeys, policies, onAdopt }) {
  const T = useT();
  const a = T.action[tpl.action];
  const existing = policies.find(p => p.id === tpl.id);
  const alsoCloses = tpl.closeKeys.filter(k => k !== reqKey && gapKeys.has(k)).map(reqLabel);
  return (
    <div style={{ marginTop: 10, background: T.panel, border: `1px dashed ${T.blueBorder}`, borderRadius: 9, padding: "12px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", color: T.blue, textTransform: "uppercase" }}>
        <Lightbulb size={13} /> Recommended control
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{tpl.name}</div>
        <Pill small fg={a.fg} bg={a.bg}>{tpl.action}</Pill>
      </div>
      <div style={{ color: T.dim, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
        <span style={{ fontWeight: 700 }}>Evidence to retain: </span>
        <span style={{ color: T.dim }}>{tpl.evidence}</span>
      </div>
      {alsoCloses.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Also closes:</span>
          {alsoCloses.map(l => <Pill key={l} small fg={T.dim} bg={T.panelSoft} border={T.border}>{l}</Pill>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 11 }}>
        <button onClick={() => onAdopt(tpl)} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
          padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: T.blue, color: "#fff", border: "none",
        }}>
          {existing
            ? (existing.status === "draft" ? <><BadgeCheck size={14} /> Approve this policy</> : <><Plus size={14} /> {existing.enabled ? "Map this policy" : "Enable and map this policy"}</>)
            : <><Plus size={14} /> Create from template</>}
        </button>
        <a href={tpl.template} download style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.blue, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <Download size={14} /> Download template (.docx)
        </a>
      </div>
    </div>
  );
}

function RecommendationPlan({ gapKeys, policies, onAdopt, totalGaps }) {
  const T = useT();
  const [showAll, setShowAll] = useState(false);
  const ranked = RECOMMENDED_POLICIES
    .map(t => ({ t, open: t.closeKeys.filter(k => gapKeys.has(k)) }))
    .filter(x => x.open.length > 0)
    .sort((a, b) => b.open.length - a.open.length);
  if (ranked.length === 0) return null;
  const closable = new Set(ranked.flatMap(x => x.open)).size;
  const shown = showAll ? ranked : ranked.slice(0, 4);

  return (
    <Card style={{ padding: T.mobile ? 16 : 20, marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lightbulb size={17} color={T.blue} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>Recommended controls</div>
      </div>
      <div style={{ color: T.dim, fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>
        Adding these {ranked.length} policies would close {closable} of {totalGaps} open gaps. Ranked by how many gaps each one closes.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {shown.map(({ t, open }) => {
          const a = T.action[t.action];
          const existing = policies.find(p => p.id === t.id);
          return (
            <div key={t.id} style={{
              display: "flex", flexDirection: T.mobile ? "column" : "row", alignItems: T.mobile ? "stretch" : "center",
              gap: T.mobile ? 10 : 16, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                  <Pill small fg={a.fg} bg={a.bg}>{t.action}</Pill>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: T.isDark ? "#f59e0b" : "#b45309", fontWeight: 700 }}>
                    Closes {open.length} gap{open.length > 1 ? "s" : ""}:
                  </span>
                  {open.map(k => <Pill key={k} small fg={T.dim} bg={T.panel} border={T.border}>{reqLabel(k)}</Pill>)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <a href={t.template} download aria-label={`Download ${t.name} template`} title="Download template (.docx)" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${T.blueBorder}`, color: T.blue, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
                  flex: T.mobile ? 1 : "none",
                }}>
                  <Download size={14} />{T.mobile && " Template"}
                </a>
                <button onClick={() => onAdopt(t)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700,
                  padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: T.blue, color: "#fff", border: "none", whiteSpace: "nowrap",
                  flex: T.mobile ? 1 : "none",
                }}>
                  {existing?.status === "draft" ? <><BadgeCheck size={14} /> Approve</> : <><Plus size={14} /> {existing ? "Enable and map" : "Create"}</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {ranked.length > 4 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop: 12, background: "none", border: "none", color: T.blue, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          {showAll ? "Show fewer" : `Show all ${ranked.length} recommendations`}
        </button>
      )}
    </Card>
  );
}

function FrameworkDrawer({ framework, policies, gapKeys, onClose, onLink, onTogglePolicy, onAdopt, onApprove }) {
  const T = useT();
  const [linking, setLinking] = useState(null);
  if (!framework) return null;
  const f = framework;
  const byId = Object.fromEntries(policies.map(p => [p.id, p]));
  const green = T.isDark ? "#34d399" : "#059669";
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const level = Math.max(1, Math.min(5, 1 + Math.round((f.pct / 100) * 4)));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(560px, 100%)", height: "100%", background: T.panel, borderLeft: `1px solid ${T.border}`,
        padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{f.name}</div>
            <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>{f.source}</div>
          </div>
          <button onClick={onClose} aria-label="Close framework" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", flexShrink: 0 }}><X size={20} /></button>
        </div>

        <div style={{ margin: "18px 0" }}>
          <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Coverage"} covered={f.covered} total={f.total} pct={f.pct} />
        </div>

        {f.note && (
          <div style={{ display: "flex", gap: 10, background: T.blueSoft, border: `1px solid ${T.blueBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <Info size={15} color={T.blue} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.55, color: T.text }}>{f.note}</div>
          </div>
        )}

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Requirements</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {f.reqs.map(req => {
            const linkedPolicies = req.refs.filter(x => !x.startsWith("cap:")).map(x => byId[x]).filter(Boolean);
            const caps = req.refs.filter(x => x.startsWith("cap:")).map(x => CAPABILITIES[x.slice(4)]);
            const disabledOnly = !req.covered && linkedPolicies.length > 0;
            const linkable = policies.filter(p => !req.refs.includes(p.id));
            return (
              <div key={req.key} style={{ background: T.panelSoft, border: `1px solid ${req.covered ? T.border : (T.isDark ? "rgba(245,158,11,.35)" : "rgba(180,83,9,.3)")}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {req.covered
                    ? <CheckCircle2 size={16} color={green} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <AlertCircle size={16} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.blue, fontFamily: "ui-monospace, monospace" }}>{req.id}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginTop: 2 }}>{req.title}</div>

                    {(caps.length > 0 || linkedPolicies.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {caps.map(c => <Pill key={c} small fg={T.dim} bg={T.panel} border={T.border}>{c}</Pill>)}
                        {linkedPolicies.map(p => (
                          <Pill key={p.id} small fg={p.enabled && p.status !== "draft" ? T.blue : T.faint} bg={p.enabled && p.status !== "draft" ? T.blueSoft : T.panel} border={p.enabled && p.status !== "draft" ? T.blueBorder : T.border}>
                            {p.name}{p.status === "draft" ? " (draft)" : p.enabled ? "" : " (off)"}
                          </Pill>
                        ))}
                      </div>
                    )}

                    {!req.covered && (
                      <div style={{ fontSize: 12.5, color: amber, marginTop: 8, lineHeight: 1.45 }}>
                        {!disabledOnly ? "Gap: no control mapped yet."
                          : linkedPolicies.some(p => p.status === "draft") ? "Gap: the mapped policy is awaiting approval."
                          : "Gap: the mapped policy is disabled."}
                      </div>
                    )}

                    {!req.covered && !disabledOnly && recommendationFor(req.key) && (
                      <RecommendedControl tpl={recommendationFor(req.key)} reqKey={req.key} gapKeys={gapKeys}
                        policies={policies} onAdopt={onAdopt} />
                    )}

                    {!req.covered && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {disabledOnly && linkedPolicies.filter(p => p.status === "draft").map(p => (
                          <button key={`a-${p.id}`} onClick={() => onApprove(p.id)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: T.blue, color: "#fff", border: "none" }}>
                            <BadgeCheck size={13} /> Approve {p.name}
                          </button>
                        ))}
                        {disabledOnly && linkedPolicies.filter(p => !p.enabled && p.status !== "draft").map(p => (
                          <button key={p.id} onClick={() => onTogglePolicy(p.id)} style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: T.blue, color: "#fff", border: "none" }}>
                            Enable {p.name}
                          </button>
                        ))}
                        {linking === req.key ? (
                          <select autoFocus defaultValue="" onChange={e => { if (e.target.value) { onLink(req.key, e.target.value); setLinking(null); } }}
                            onBlur={() => setLinking(null)}
                            style={{ ...fieldStyle(T), width: "auto", maxWidth: "100%", padding: "6px 8px", fontSize: 13, background: T.panel }}>
                            <option value="" disabled>Choose a policy to map…</option>
                            {linkable.map(p => <option key={p.id} value={p.id}>{p.name}{p.enabled ? "" : " (disabled)"}</option>)}
                          </select>
                        ) : (
                          <button onClick={() => setLinking(req.key)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: T.blue, border: `1px solid ${T.blueBorder}` }}>
                            <Link2 size={13} /> {recommendationFor(req.key) && !disabledOnly ? "Map an existing policy instead" : "Map a policy"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {f.tagged.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, margin: "22px 0 10px" }}>Also tagged to this framework</div>
            <div style={{ color: T.dim, fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
              These policies were tagged when created but are not mapped to a specific requirement, so they don't count toward coverage yet.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {f.tagged.map(p => <Pill key={p.id} small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>{p.name}</Pill>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RiskBubbles({ agents, openAgent }) {
  const T = useT();
  const fs = T.mobile ? 1.6 : 1;
  const tier = s => s >= 80 ? "CRITICAL" : s >= 55 ? "HIGH" : s >= 25 ? "MEDIUM" : "LOW";

  const { nodes, vb } = useMemo(() => {
    // pack in a square for optimal density, then crop the viewBox to the
    // actual content bounds so bubbles fill the card instead of floating
    // inside an oversized canvas
    const root = d3.pack()
      .size([640, 640])
      .padding(8)(
        d3.hierarchy({ children: agents }).sum(d => d.score ? Math.pow(d.score, 1.18) : 0)
      );
    const leaves = root.leaves();
    const pad = 14; // room for pulse rings and outside labels
    const minX = Math.min(...leaves.map(n => n.x - n.r)) - pad;
    const maxX = Math.max(...leaves.map(n => n.x + n.r)) + pad;
    const minY = Math.min(...leaves.map(n => n.y - n.r)) - pad;
    const maxY = Math.max(...leaves.map(n => n.y + n.r)) + pad + (T.mobile ? 26 : 8); // extra for labels under small bubbles
    return { nodes: leaves, vb: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
  }, [agents, T.mobile]);

  return (
    <div>
      <style>{`.argus-bubble { transition: filter .15s; } .argus-bubble:hover { filter: brightness(1.18); }`}</style>
      <svg viewBox={vb} style={{ width: "100%", height: "auto", maxHeight: 460, display: "block", margin: "8px auto 0" }}>
        {nodes.map(n => {
          const a = n.data;
          const c = T.bar[tier(a.score)];
          // on phones, only print a name inside a bubble when it actually fits; tapping opens details
          const fits = a.name.length * 6.8 * fs <= n.r * 1.8;
          const big = T.mobile ? n.r >= 40 && fits : n.r >= 40;
          const mid = !T.mobile && n.r >= 26;
          return (
            <g key={a.id} className="argus-bubble" onClick={() => openAgent(a.name)} style={{ cursor: "pointer" }}>
              <title>{`${a.name}: risk ${a.score} (${tier(a.score)})`}</title>
              <circle cx={n.x} cy={n.y} r={n.r} fill={c} opacity={T.isDark ? 0.16 : 0.12} />
              <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={c} strokeWidth={2} opacity={0.85} />
              {a.score >= 80 && (
                <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={c} strokeWidth={1.6}>
                  <animate attributeName="r" values={`${n.r};${n.r + 16}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <g transform={`translate(${n.x} ${n.y}) scale(${fs}) translate(${-n.x} ${-n.y})`}>
              {big ? (
                <>
                  <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={T.text}>{a.name}</text>
                  <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize={24} fontWeight={800} fill={c}>{a.score}</text>
                  <text x={n.x} y={n.y + 38} textAnchor="middle" fontSize={9.5} letterSpacing="1.2" fontWeight={700}
                    fill={c} opacity={0.8}>{tier(a.score)}</text>
                </>
              ) : mid ? (
                <>
                  {a.name.length * 5.6 <= n.r * 1.9 ? (
                    <>
                      <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={T.text}>{a.name}</text>
                      <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={17} fontWeight={800} fill={c}>{a.score}</text>
                    </>
                  ) : (
                    <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill={c}>{a.score}</text>
                  )}
                </>
              ) : (
                <>
                  <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill={c}>{a.score}</text>
                  {!T.mobile && <text x={n.x} y={n.y + n.r / fs + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill={T.text}>{a.name}</text>}
                </>
              )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RiskRadar({ agents, openAgent }) {
  const T = useT();
  const fs = T.mobile ? 1.7 : 1;
  const S = 700, CX = 350, CY = 330, R = 250;
  const depts = [...new Set(agents.map(a => a.dept))];
  const slice = (Math.PI * 2) / depts.length;
  const tier = s => s >= 80 ? "CRITICAL" : s >= 55 ? "HIGH" : s >= 25 ? "MEDIUM" : "LOW";

  const pos = (a, i, n) => {
    const d = depts.indexOf(a.dept);
    const ang = -Math.PI / 2 + d * slice + ((i + 1) / (n + 1)) * slice;
    const r = 36 + (a.score / 100) * (R - 36);
    return { x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang) };
  };
  const byDept = {};
  agents.forEach(a => { (byDept[a.dept] = byDept[a.dept] || []).push(a); });
  const blips = agents.map(a => {
    const group = byDept[a.dept];
    return { ...a, ...pos(a, group.indexOf(a), group.length) };
  });

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes argusSweep { to { transform: rotate(360deg); } }
        .argus-sweep { animation: argusSweep 9s linear infinite; transform-origin: ${CX}px ${CY}px; }
        @media (prefers-reduced-motion: reduce) { .argus-sweep { animation: none; opacity: 0; } }
      `}</style>
      <svg viewBox={T.mobile ? `-50 -10 ${S + 100} 690` : `0 0 ${S} 660`} style={{ width: "100%", maxWidth: 760, height: "auto", display: "block", margin: "0 auto" }}>
        {/* rings: score 25 / 55 / 80 / 100 */}
        {[25, 55, 80, 100].map(v => {
          const rr = 36 + (v / 100) * (R - 36);
          const crit = v === 80;
          return (
            <g key={v}>
              <circle cx={CX} cy={CY} r={rr} fill="none"
                stroke={crit ? (T.isDark ? "#f43f5e" : "#e11d48") : T.grid}
                strokeWidth={crit ? 1.4 : 1} strokeDasharray={crit ? "5 5" : "none"} opacity={crit ? 0.55 : 1} />
              <text x={CX + 6} y={CY - rr - 5} fontSize={10 * fs} fill={crit ? (T.isDark ? "#f43f5e" : "#e11d48") : T.faint}>
                {crit ? "critical threshold" : v}
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={36} fill={T.blueSoft} stroke={T.blueBorder} />
        <g transform={`translate(${CX - 21}, ${CY - 23}) scale(0.42)`} style={{ color: T.text }}>
          <g fill="none" stroke="currentColor" strokeLinecap="round">
            <path strokeWidth="5.5" d="M31.2 51.2 A20 20 0 0 1 68.8 51.2" />
            <path strokeWidth="5.5" opacity="0.62" d="M20.9 47.4 A31 31 0 0 1 79.1 47.4" />
            <path strokeWidth="5.5" opacity="0.34" d="M10.5 43.6 A42 42 0 0 1 89.5 43.6" />
            <circle cx="50" cy="60" r="10.5" strokeWidth="5.5" />
          </g>
          <circle cx="50" cy="60" r="5.2" fill="#4a9eea" />
        </g>
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize={8 * fs} fontWeight={700} letterSpacing="1.6" fill={T.blue}>CONTROL</text>

        {/* department spokes + rim labels */}
        {depts.map((d, i) => {
          const ang = -Math.PI / 2 + i * slice;
          const mid = ang + slice / 2;
          const lx = CX + (R + 26) * Math.cos(mid), ly = CY + (R + 26) * Math.sin(mid);
          return (
            <g key={d}>
              <line x1={CX + 36 * Math.cos(ang)} y1={CY + 36 * Math.sin(ang)}
                x2={CX + R * Math.cos(ang)} y2={CY + R * Math.sin(ang)}
                stroke={T.grid} strokeWidth={1} />
              <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10.5 * fs} fontWeight={600}
                fill={T.dim} letterSpacing="0.4">{d}</text>
            </g>
          );
        })}

        {/* sweep */}
        <g className="argus-sweep" style={{ pointerEvents: "none" }}>
          <path d={`M${CX} ${CY} L${CX} ${CY - R} A${R} ${R} 0 0 1 ${CX + R * Math.sin(0.7)} ${CY - R * Math.cos(0.7)} Z`}
            fill={T.blue} opacity={0.07} />
          <line x1={CX} y1={CY} x2={CX} y2={CY - R} stroke={T.blue} strokeWidth={1.6} opacity={0.45} />
        </g>

        {/* blips */}
        {blips.map(a => {
          const c = T.bar[tier(a.score)];
          return (
            <g key={a.id} onClick={() => openAgent(a.name)} style={{ cursor: "pointer" }}>
              <circle cx={a.x} cy={a.y} r={15} fill={c} opacity={0.15} />
              <circle cx={a.x} cy={a.y} r={7.5} fill={c} stroke={T.panel} strokeWidth={2} />
              {a.score >= 80 && (
                <circle cx={a.x} cy={a.y} r={8} fill="none" stroke={c} strokeWidth={1.6}>
                  <animate attributeName="r" values="9;26" dur="1.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="1.9s" repeatCount="indefinite" />
                </circle>
              )}
              {!T.mobile && <text x={a.x} y={a.y - 14} textAnchor="middle" fontSize={11 * fs} fontWeight={600} fill={T.text}>{a.name}</text>}
              <text x={a.x} y={a.y + (T.mobile ? 30 : 22)} textAnchor="middle" fontSize={10 * fs} fontWeight={T.mobile ? 700 : 400} fill={T.mobile ? T.text : T.faint}>{a.score}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Heatmap({ agents, openAgent }) {
  const T = useT();
  const [mode, setMode] = useState("radar");
  const sorted = [...agents].sort((a, b) => b.score - a.score);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, margin: 0 }}>Risk Radar</h1>
          <div style={{ color: T.dim, marginTop: 6, fontSize: 14 }}>
            {mode === "radar"
              ? "Distance from center is aggregated risk. Sectors are departments. Agents drifting past the dashed ring need review."
              : "Visual distribution of agents by aggregated risk score."}
          </div>
        </div>
        <div style={{ display: "flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 3 }}>
          {[["radar", "Radar"], ["grid", "Grid"]].map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} style={{
              border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 13.5, fontWeight: 600,
              cursor: "pointer", background: mode === id ? T.blue : "transparent",
              color: mode === id ? "#fff" : T.dim, transition: "all .12s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {mode === "radar" ? (
        <Card style={{ marginTop: 20, padding: "18px 12px" }}>
          <RiskRadar agents={agents} openAgent={openAgent} />
          {T.mobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, padding: "0 4px" }}>
              {sorted.map(a => (
                <button key={a.id} onClick={() => openAgent(a.name)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 9,
                  padding: "10px 12px", color: T.text, fontSize: 14, cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: T.bar[a.score >= 80 ? "CRITICAL" : a.score >= 55 ? "HIGH" : a.score >= 25 ? "MEDIUM" : "LOW"] }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  </span>
                  <span style={{ color: T.dim, fontSize: 13, whiteSpace: "nowrap" }}>{a.dept} · <b style={{ color: T.text }}>{a.score}</b></span>
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${T.mobile ? 140 : 190}px, 1fr))`, gap: T.mobile ? 10 : 16, marginTop: 22 }}>
          {sorted.map(a => {
            const t = T.heat(a.score);
            return (
              <Card key={a.id} onClick={() => openAgent(a.name)} style={{
                background: t.bg, border: `1px solid ${t.border}`, padding: "26px 16px",
                textAlign: "center", cursor: "pointer",
              }}>
                {a.score >= 80 && <div style={{ marginBottom: 8 }}><ShieldAlert size={20} color={t.fg} style={{ opacity: .9 }} /></div>}
                <div style={{ fontSize: 34, fontWeight: 800, color: t.fg }}>{a.score}</div>
                <div style={{ color: t.sub, fontSize: 14, marginTop: 8, fontWeight: 500 }}>{a.name}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- agent detail drawer ---------------- */

const POLICY_STATE = {
  active: { label: "In place", tone: "green" },
  draft: { label: "Draft, needs approval", tone: "amber" },
  disabled: { label: "Policy is off", tone: "amber" },
  missing: { label: "Not adopted", tone: "amber" },
};

// One mapped framework or policy: why it applies, and exclude / re-include with a reason
function MappingRow({ item, kind, onExclude, onInclude, action }) {
  const T = useT();
  const [excluding, setExcluding] = useState(false);
  const [reason, setReason] = useState("");
  const green = T.isDark ? "#34d399" : "#059669";
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const st = kind === "policy" ? POLICY_STATE[item.state] : null;
  const ex = item.excluded;

  return (
    <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 12px", opacity: ex ? 0.72 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        {ex ? <X size={15} color={T.faint} style={{ flexShrink: 0, marginTop: 2 }} />
          : st ? (st.tone === "green" ? <CheckCircle2 size={15} color={green} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={15} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />)
          : <CheckCircle2 size={15} color={T.blue} style={{ flexShrink: 0, marginTop: 2 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, textDecoration: ex ? "line-through" : "none" }}>
              {kind === "framework" ? item.name : item.name}
            </div>
            {!excluding && (ex
              ? <button onClick={() => onInclude(item.key)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>Include</button>
              : <button onClick={() => setExcluding(true)} aria-label={`Exclude ${item.name}`} title="Exclude from this agent's scope" style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 0, display: "flex" }}><X size={15} /></button>)}
          </div>
          <div style={{ fontSize: 12.5, color: T.dim, marginTop: 3, lineHeight: 1.45 }}>
            {ex ? <>Excluded: {ex.reason} <span style={{ color: T.faint }}>({ex.on})</span></> : item.why}
          </div>
          {!ex && st && st.tone !== "green" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: amber }}>{st.label}</span>
              {action}
            </div>
          )}
          {excluding && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <input autoFocus value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Why doesn't this apply? (required, logged)"
                style={{ ...fieldStyle(T), background: T.panel, padding: "8px 10px", fontSize: 13 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!reason.trim()} onClick={() => { onExclude(item.key, reason.trim()); setExcluding(false); setReason(""); }} style={{
                  fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 7, border: "none",
                  background: reason.trim() ? T.blue : "rgba(148,163,184,.25)", color: reason.trim() ? "#fff" : T.faint,
                  cursor: reason.trim() ? "pointer" : "not-allowed",
                }}>Exclude</button>
                <button onClick={() => { setExcluding(false); setReason(""); }} style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.dim, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ title, sub, children }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ color: T.dim, fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function AgentDrawer({ agent, audit, policies, onClose, onUpdateTraits, onExclude, onInclude, onCreatePolicy, onApprove, onTogglePolicy }) {
  const T = useT();
  const [editing, setEditing] = useState(false);
  const [draftTraits, setDraftTraits] = useState({});
  const [tab, setTab] = useState("gaps");
  if (!agent) return null;
  const r = T.risk[agent.risk], s = T.status[agent.status];
  const events = audit.filter(e => e.agent === agent.name);
  const m = mapAgent(agent, policies);
  const activeTraits = TRAITS.filter(t => agent.traits?.[t.id]);
  const gaps = m.policies.filter(p => !p.excluded && p.state !== "active");
  const inPlace = m.policies.filter(p => !p.excluded && p.state === "active");
  const excludedPols = m.policies.filter(p => p.excluded);

  const policyAction = p => {
    if (p.state === "missing" && p.template) return (
      <button onClick={() => onCreatePolicy(p.template.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
        <Plus size={12} /> Create from template
      </button>);
    if (p.state === "draft") return (
      <button onClick={() => onApprove(p.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
        <BadgeCheck size={12} /> Approve
      </button>);
    if (p.state === "disabled") return (
      <button onClick={() => onTogglePolicy(p.id)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
        Enable policy
      </button>);
    return null;
  };

  const tabs = [
    { id: "gaps", label: "Missing", count: gaps.length },
    { id: "inplace", label: "In place", count: inPlace.length },
    ...(excludedPols.length ? [{ id: "excluded", label: "Excluded", count: excludedPols.length }] : []),
  ];
  const listFor = { gaps, inplace: inPlace, excluded: excludedPols }[tab] || gaps;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(520px, 100%)", height: "100%", background: T.panel,
        borderLeft: `1px solid ${T.border}`, padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>{agent.name}</div>
          <button onClick={onClose} aria-label="Close details" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ color: T.faint, fontSize: 13.5, marginBottom: 14 }}>{agent.model}</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Pill fg={s.fg} bg={s.bg} border={s.border}>{agent.status}</Pill>
          <Pill fg={r.fg} bg={r.bg} border={r.border}>{agent.risk}</Pill>
        </div>

        {agent.desc && <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>{agent.desc}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[["Department", agent.dept], ["Owner", agent.owner], ["Autonomy", agent.autonomy], ["Risk Score", agent.score]].map(([k, v]) => (
            <div key={k} style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ color: T.faint, fontSize: 12, marginBottom: 4 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{v}</div>
            </div>
          ))}
        </div>

        <DrawerSection title="Characteristics" sub="These drive the framework and policy mapping below.">
          {editing ? (
            <>
              <TraitPicker traits={draftTraits} onChange={setDraftTraits} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => { onUpdateTraits(agent.id, draftTraits); setEditing(false); }} style={{ fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>Save and remap</button>
                <button onClick={() => setEditing(false)} style={{ fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.dim, cursor: "pointer" }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeTraits.length ? activeTraits.map(t => <Pill key={t.id} small fg={T.text} bg={T.panelSoft} border={T.border}>{t.label}</Pill>)
                  : <span style={{ color: T.faint, fontSize: 13 }}>None recorded.</span>}
              </div>
              <button onClick={() => { setDraftTraits({ ...(agent.traits || {}) }); setEditing(true); }} style={{ marginTop: 10, background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                Edit characteristics
              </button>
            </>
          )}
        </DrawerSection>

        <DrawerSection title={`Frameworks in scope (${m.inScopeFrameworks.length})`} sub="Mapped automatically. Exclude any that don't apply, with a reason for the record.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {m.frameworks.map(f => <MappingRow key={f.key} item={f} kind="framework" onExclude={(k, why) => onExclude(agent.id, k, why)} onInclude={k => onInclude(agent.id, k)} />)}
          </div>
        </DrawerSection>

        <DrawerSection title={`Policies (${m.controlsInPlace} of ${m.controlsRequired} in place)`} sub="Policies this agent must follow, based on its characteristics.">
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {tabs.map(t => <FilterChip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} label={t.label} count={t.count} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listFor.length === 0 && <div style={{ color: T.faint, fontSize: 13 }}>{tab === "gaps" ? "Every applicable policy is in place." : "Nothing here."}</div>}
            {listFor.map(p => <MappingRow key={p.key} item={p} kind="policy" action={policyAction(p)}
              onExclude={(k, why) => onExclude(agent.id, k, why)} onInclude={k => onInclude(agent.id, k)} />)}
          </div>
        </DrawerSection>

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Event History</div>
        {events.length === 0 && <div style={{ color: T.faint, fontSize: 13.5 }}>No recorded events for this agent.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((e, i) => (
            <div key={i} style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10 }}>
              <div style={{ marginTop: 2 }}><SevDot sev={e.sev} size={14} /></div>
              <div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{e.desc}</div>
                <div style={{ color: T.faint, fontSize: 12, marginTop: 4, fontFamily: "ui-monospace, monospace" }}>{e.ts}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ---------------- shell ---------------- */

export default function ArgusMVP() {
  const [mode, setMode] = useState("dark");
  const mobile = useIsMobile();
  const T = useMemo(() => ({ ...THEMES[mode], mobile }), [mode, mobile]);
  const [view, setView] = useState("dashboard");
  const [agents, setAgents] = useState(SEED_AGENTS);
  const [policies, setPolicies] = useState(SEED_POLICIES);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [reqMap, setReqMap] = useState(SEED_REQ_MAP);
  const [detailId, setDetailId] = useState(null);
  const [fwOpen, setFwOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const [policyTemplate, setPolicyTemplate] = useState(null);
  const [approving, setApproving] = useState(null);
  const [globalQ, setGlobalQ] = useState("");
  const [toast, setToast] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const coverage = useMemo(() => computeCoverage(reqMap, policies), [reqMap, policies]);
  const openFramework = fwOpen ? coverage.frameworks.find(f => f.id === fwOpen) : null;
  const gapKeys = useMemo(() => new Set(
    coverage.frameworks.flatMap(f => f.reqs.filter(q => !q.covered).map(q => q.key))
  ), [coverage]);

  useEffect(() => { if (!mobile) setNavOpen(false); }, [mobile]);

  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const nowTs = () => new Date().toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const log = (sev, type, agent, desc) =>
    setAudit(ev => [{ sev, ts: nowTs(), type, agent, desc }, ...ev]);

  const resetDemo = () => {
    setAgents(SEED_AGENTS);
    setPolicies(SEED_POLICIES);
    setAudit(SEED_AUDIT);
    setReqMap(SEED_REQ_MAP);
    setDetailId(null);
    setFwOpen(null);
    setModal(null);
    setApproving(null);
    notify("Demo data reset to its original state");
  };

  const togglePolicy = id => {
    const p = policies.find(x => x.id === id);
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (p) log("info", "Policy Change", "—", `Policy "${p.name}" ${p.enabled ? "disabled" : "enabled"}`);
  };

  const linkPolicy = (key, policyId) => {
    setReqMap(m => ({ ...m, [key]: [...(m[key] || []), policyId] }));
    const [fwId, idx] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const req = fw?.requirements[Number(idx)];
    const p = policies.find(x => x.id === policyId);
    if (fw && req && p) {
      log("info", "Control Mapped", "—", `"${p.name}" mapped to ${fw.short} ${req.id} (${req.title})`);
      notify(`Mapped to ${fw.short} ${req.id}`);
    }
  };

  const openCreatePolicy = (templateId = null) => { setPolicyTemplate(templateId); setModal("policy"); };

  // From a recommendation: approve a draft, re-enable a disabled policy, or open the form pre-filled from the template
  const adoptRecommendation = tpl => {
    const existing = policies.find(p => p.id === tpl.id);
    if (!existing) return openCreatePolicy(tpl.id);
    if (existing.status === "draft") return setApproving(existing.id);
    const closing = tpl.closeKeys.filter(k => gapKeys.has(k));
    if (!existing.enabled) setPolicies(ps => ps.map(p => p.id === tpl.id ? { ...p, enabled: true } : p));
    setReqMap(m => {
      const next = { ...m };
      tpl.closeKeys.forEach(k => { if (!(next[k] || []).includes(tpl.id)) next[k] = [...(next[k] || []), tpl.id]; });
      return next;
    });
    log("info", "Policy Change", "—", `"${tpl.name}" enabled and mapped; closes ${closing.map(reqLabel).join(", ") || "no open gaps"}`);
    notify(`${tpl.name} enabled. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.`);
  };

  const approvePolicy = (id, a) => {
    const p = policies.find(x => x.id === id);
    if (!p) return;
    const tpl = RECOMMENDED_POLICIES.find(t => t.id === (p.templateId || p.id));
    const keys = Object.entries(reqMap).filter(([, refs]) => refs.includes(id)).map(([k]) => k);
    const closing = keys.filter(k => gapKeys.has(k));
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, status: "approved", approvedBy: a.approvedBy, approvedOn: a.approvedOn, doc: a.doc || x.doc } : x));
    if (a.doc && a.doc !== p.doc) log("info", "Document Uploaded", "—", `"${a.doc.name}" attached to policy "${p.name}"`);
    log("info", "Policy Approved", "—", `Policy "${p.name}" approved by ${a.approvedBy} on ${a.approvedOn}${closing.length ? `; closes ${closing.map(reqLabel).join(", ")}` : ""}`);
    setApproving(null);
    notify(closing.length ? `Approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy approved by ${a.approvedBy}`);
  };

  const openAgent = name => {
    const a = agents.find(x => x.name === name);
    if (a) setDetailId(a.id);
  };

  const updateAgent = (id, patch) => setAgents(as => as.map(a => a.id === id ? { ...a, ...patch } : a));

  const updateTraits = (id, traits) => {
    const a = agents.find(x => x.id === id);
    updateAgent(id, { traits });
    const before = new Set(Object.keys(a.traits || {}).filter(k => a.traits[k]));
    const after = new Set(Object.keys(traits).filter(k => traits[k]));
    const added = [...after].filter(k => !before.has(k)), removed = [...before].filter(k => !after.has(k));
    if (added.length || removed.length) log("info", "Scope Change", a.name,
      `${a.name} characteristics updated${added.length ? `; added: ${added.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}${removed.length ? `; removed: ${removed.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}`);
    notify("Characteristics saved. Mapping updated.");
  };

  const excludeMapping = (id, key, reason) => {
    const a = agents.find(x => x.id === id);
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    updateAgent(id, { exclusions: { ...(a.exclusions || {}), [key]: { reason, on: new Date().toISOString().slice(0, 10) } } });
    log("warn", "Scope Exclusion", a.name, `${item?.short || item?.name || key} excluded from ${a.name}'s scope: ${reason}`);
    notify(`Excluded ${item?.short || item?.name}`);
  };

  const includeMapping = (id, key) => {
    const a = agents.find(x => x.id === id);
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    const { [key]: _, ...rest } = a.exclusions || {};
    updateAgent(id, { exclusions: rest });
    log("info", "Scope Change", a.name, `${item?.short || item?.name || key} returned to ${a.name}'s scope`);
  };

  const registerAgent = f => {
    const fullAuto = f.autonomy === "Full autonomy";
    const newAgent = {
      id: Date.now(), name: f.name.trim(), model: f.model, dept: f.dept,
      status: "pending", risk: fullAuto ? "MEDIUM" : "LOW",
      score: fullAuto ? 40 : 15, autonomy: f.autonomy, owner: f.owner.trim(),
      desc: f.desc.trim(), traits: f.traits, exclusions: {},
    };
    setAgents(a => [...a, newAgent]);
    log("info", "Agent Registered", newAgent.name, `${newAgent.name} registered and pending security review before activation`);
    setModal(null);
    notify(`${newAgent.name} registered — pending security review`);
  };

  const createPolicy = f => {
    const tpl = RECOMMENDED_POLICIES.find(t => t.id === f.templateId);
    const id = tpl && !policies.some(p => p.id === tpl.id) ? tpl.id : `p${Date.now()}`;
    const approved = f.approved;
    const newPolicy = {
      id, tag: f.tag, name: f.name.trim(), desc: f.desc.trim(), action: f.action, violations: 0, enabled: true,
      frameworks: tpl ? [] : f.frameworks, owner: f.owner, templateId: tpl?.id, evidence: tpl?.evidence, doc: f.doc,
      status: approved ? "approved" : "draft",
      ...(approved ? { approvedBy: f.approvedBy, approvedOn: f.approvedOn } : {}),
    };
    setPolicies(ps => [...ps, newPolicy]);
    // a template carries its requirement mapping with it
    if (tpl) setReqMap(m => {
      const next = { ...m };
      tpl.closeKeys.forEach(k => { if (!(next[k] || []).includes(id)) next[k] = [...(next[k] || []), id]; });
      return next;
    });
    const closing = tpl ? tpl.closeKeys.filter(k => gapKeys.has(k)) : [];
    log("info", "Policy Created", "—", `Policy "${newPolicy.name}" created as ${approved ? "approved" : "draft"} (owner: ${f.owner}, action: ${f.action})${tpl ? `; mapped to ${tpl.closeKeys.map(reqLabel).join(", ")}` : ""}`);
    if (f.doc) log("info", "Document Uploaded", "—", `"${f.doc.name}" attached to policy "${newPolicy.name}"`);
    if (approved) log("info", "Policy Approved", "—", `Policy "${newPolicy.name}" approved by ${f.approvedBy} on ${f.approvedOn}`);
    setModal(null);
    setPolicyTemplate(null);
    notify(approved
      ? (closing.length ? `Policy approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy created: ${newPolicy.name}`)
      : `Saved as draft.${closing.length ? ` Approve it to close ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : ""}`);
  };

  const go = id => { setView(id); setNavOpen(false); };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <Activity size={17} /> },
    { id: "registry", label: "Agent Registry", icon: <Users size={17} /> },
    { id: "policy", label: "Policy Engine", icon: <FileText size={17} /> },
    { id: "frameworks", label: "Frameworks", icon: <Layers size={17} /> },
    { id: "audit", label: "Audit Trail", icon: <ScanSearch size={17} /> },
    { id: "heatmap", label: "Risk Radar", icon: <AlertTriangle size={17} /> },
  ];

  const globalHits = globalQ.trim()
    ? agents.filter(a => a.name.toLowerCase().includes(globalQ.toLowerCase()))
    : [];

  const sidebar = (
    <aside style={{
      width: 240, flexShrink: 0, background: T.sidebar, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", padding: "22px 14px", transition: "background .2s",
      ...(mobile ? { height: "100%", boxSizing: "border-box", boxShadow: T.shadow } : { position: "sticky", top: 0, height: "100vh", boxSizing: "border-box" }),
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px", marginBottom: 34 }}>
        <PanoptesMark size={30} color={T.text} />
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: ".14em", color: T.text, flex: 1 }}>ARGUS</span>
        {mobile && (
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        )}
      </div>
      <div style={{ color: T.faint, fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", padding: "0 8px", marginBottom: 10 }}>OPERATIONS</div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => go(n.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
            borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 500,
            background: view === n.id ? T.blue : "transparent",
            color: view === n.id ? "#fff" : T.navText, textAlign: "left", transition: "background .12s",
          }}>
            {n.icon}{n.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12, padding: "14px 8px 0", borderTop: `1px solid ${T.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.blue }}>OP</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Ops Admin</div>
          <div style={{ color: T.faint, fontSize: 12 }}>Level 4 Clearance</div>
        </div>
      </div>
    </aside>
  );

  const px = mobile ? 16 : 28;

  return (
    <ThemeCtx.Provider value={T}>
      <div style={{
        display: "flex", minHeight: "100vh", background: T.bg, color: T.text,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        transition: "background .2s, color .2s", overflowX: "hidden",
      }}>
        {!mobile && sidebar}
        {mobile && navOpen && (
          <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 55 }}>
            <div onClick={e => e.stopPropagation()} style={{ height: "100%", width: 260 }}>{sidebar}</div>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: `8px ${px}px`,
            background: T.blueSoft, borderBottom: `1px solid ${T.blueBorder}`,
            fontSize: mobile ? 12 : 13, color: T.isDark ? "#9ec8f2" : "#1d5c9e",
          }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1.4 }}>
              {mobile
                ? "Demo environment with synthetic data."
                : "Demo environment — all agents, violations, and events are synthetic. Explore freely: register agents, toggle policies, click anything."}
            </span>
            <button onClick={resetDemo} style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: `1px solid ${T.blueBorder}`, color: "inherit", borderRadius: 7,
              padding: "5px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <RotateCcw size={13} /> Reset{mobile ? "" : " demo"}
            </button>
          </div>

          <header style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 16, padding: `${mobile ? 12 : 16}px ${px}px`, borderBottom: `1px solid ${T.border}` }}>
            {mobile && (
              <>
                <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, flexShrink: 0,
                  borderRadius: 10, cursor: "pointer", background: T.panel, border: `1px solid ${T.border}`, color: T.text,
                }}><Menu size={18} /></button>
                <PanoptesMark size={26} color={T.text} />
              </>
            )}
            <div style={{ position: "relative", flex: 1, minWidth: 0, maxWidth: 620 }}>
              <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
              <input value={globalQ} onChange={e => setGlobalQ(e.target.value)}
                placeholder={mobile ? "Search agents..." : "Global search agents, logs, policies..."}
                style={{ ...fieldStyle(T), background: T.panel, borderRadius: 10, padding: "11px 14px 11px 40px" }} />
              {globalHits.length > 0 && (
                <div style={{ position: "absolute", top: 46, left: 0, right: 0, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, zIndex: 40, overflow: "hidden", boxShadow: T.shadow }}>
                  {globalHits.map(a => (
                    <button key={a.id} onClick={() => { setDetailId(a.id); setGlobalQ(""); }} style={{
                      display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 14px", background: "none", border: "none", cursor: "pointer",
                      color: T.text, fontSize: 14, borderBottom: `1px solid ${T.border}`,
                    }}>
                      <span>{a.name}</span>
                      <Pill fg={T.risk[a.risk].fg} bg={T.risk[a.risk].bg} border={T.risk[a.risk].border}>{a.risk}</Pill>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
              aria-label={T.isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: 38, height: 38, borderRadius: 10, cursor: "pointer",
                background: T.panel, border: `1px solid ${T.border}`, color: T.dim, transition: "all .15s",
              }}>
              {T.isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {!mobile && (
              <div style={{ position: "relative" }}>
                <Bell size={19} color={T.dim} />
                <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: T.isDark ? "#f43f5e" : "#e11d48" }} />
              </div>
            )}
          </header>

          <main style={{ padding: mobile ? "18px 16px 96px" : 28, minWidth: 0 }}>
            {view === "dashboard" && <Dashboard agents={agents} coverage={coverage} openAgent={openAgent} onOpenFrameworks={() => go("frameworks")} />}
            {view === "registry" && <Registry agents={agents} policies={policies} openAgent={openAgent} onOpenRegister={() => setModal("register")} />}
            {view === "policy" && <PolicyEngine policies={policies} reqMap={reqMap} toggle={togglePolicy} onOpenCreate={() => openCreatePolicy()} onApprove={setApproving} />}
            {view === "frameworks" && <Frameworks coverage={coverage} gapKeys={gapKeys} policies={policies} onOpen={setFwOpen} onAdopt={adoptRecommendation} />}
            {view === "audit" && <AuditTrail audit={audit} />}
            {view === "heatmap" && <Heatmap agents={agents} openAgent={openAgent} />}
          </main>
        </div>

        {modal === "register" && <RegisterAgentModal onClose={() => setModal(null)} onRegister={registerAgent} policies={policies} />}
        {modal === "policy" && <CreatePolicyModal onClose={() => { setModal(null); setPolicyTemplate(null); }} onCreate={createPolicy}
          initialTemplate={policyTemplate} policies={policies} />}
        {approving && policies.find(p => p.id === approving) && (
          <ApprovePolicyModal policy={policies.find(p => p.id === approving)} onClose={() => setApproving(null)} onApprove={approvePolicy} />
        )}
        <AgentDrawer key={detailId ?? "none"} agent={agents.find(a => a.id === detailId)} audit={audit} policies={policies}
          onClose={() => setDetailId(null)} onUpdateTraits={updateTraits} onExclude={excludeMapping} onInclude={includeMapping}
          onCreatePolicy={openCreatePolicy} onApprove={setApproving} onTogglePolicy={togglePolicy} />
        <FrameworkDrawer framework={openFramework} policies={policies} gapKeys={gapKeys} onClose={() => setFwOpen(null)}
          onLink={linkPolicy} onTogglePolicy={togglePolicy} onAdopt={adoptRecommendation} onApprove={setApproving} />

        <button onClick={() => setFeedbackOpen(true)} aria-label="Send feedback" style={{
          position: "fixed", bottom: mobile ? 16 : 24, right: mobile ? 16 : 24, zIndex: 45,
          display: "flex", alignItems: "center", gap: 8,
          background: T.blue, color: "#fff", border: "none", borderRadius: 999,
          padding: mobile ? 14 : "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: T.shadow,
        }}>
          <MessageCircle size={mobile ? 20 : 16} />{!mobile && " Feedback"}
        </button>

        {feedbackOpen && (
          <Modal title="Help shape ARGUS" subtitle="This is an early MVP exploring what agentic AI governance tooling should look like. Two minutes of your perspective directly shapes what gets built next." onClose={() => setFeedbackOpen(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: T.dim, lineHeight: 1.6 }}>
                Especially useful: your role, which view would matter most in your organization, and what's missing before you'd trust a tool like this.
              </div>
              <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: T.blue, color: "#fff", borderRadius: 9, padding: "12px 16px",
                fontSize: 15, fontWeight: 700, textDecoration: "none",
              }}>
                Open feedback form <ExternalLink size={15} />
              </a>
            </div>
          </Modal>
        )}

        {toast && (
          <div style={{
            position: "fixed", bottom: mobile ? 84 : 24, left: "50%", transform: "translateX(-50%)",
            width: mobile ? "calc(100% - 32px)" : "auto", boxSizing: "border-box",
            background: T.panelSoft, border: `1px solid ${T.blueBorder}`, color: T.text,
            borderRadius: 10, padding: "12px 20px", fontSize: 14, zIndex: 70,
            display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadow,
          }}>
            <CheckCircle2 size={16} color={T.isDark ? "#34d399" : "#059669"} style={{ flexShrink: 0 }} /> {toast}
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
