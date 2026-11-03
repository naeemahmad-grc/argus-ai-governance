import React, { useState, useMemo, useEffect, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import {
  Shield, Search, Bell, Activity, Users, FileText, AlertTriangle,
  ScanSearch, Cpu, HeartPulse, ShieldAlert, CheckCircle2, Download,
  X, Filter, Plus, Info, AlertOctagon, AlertCircle, Sun, Moon,
  RotateCcw, MessageCircle, ExternalLink, Menu, Layers, Link2, ChevronRight, Lightbulb, Upload, BadgeCheck, Clock,
  ClipboardCheck, Printer, Network, ListOrdered, Boxes, ArrowRight, UserCheck, FileSpreadsheet, Grid3x3
} from "lucide-react";
import * as d3 from "d3";
import {
  FRAMEWORKS, FRAMEWORK_GROUPS, CAPABILITIES, SEED_REQ_MAP, RECOMMENDED_POLICIES,
  computeCoverage, frameworksForPolicy, recommendationFor, reqLabel, POLICY_ROLES, BLANK_TEMPLATE,
} from "./frameworks.js";
import { TRAITS, mapAgent } from "./agentMapping.js";
import {
  RISK_CATEGORIES, LIKELIHOOD, IMPACT, RISK_BANDS, GAP_STATUS, AGENT_SCORE_METHOD, GAP_SCORE_METHOD,
  riskLevel, scoreAgent, buildRegister, gapAssessment,
} from "./riskLibrary.js";
import { LANES, COMPONENT_TYPES, AGBOM_SECTION, buildArchitecture, toAgBOM } from "./architecture.js";
import { lifecycle, requirements, nextStep, CONDITION_MAX_DAYS, PROBATION_DAYS } from "./lifecycle.js";

/* ---------------- seed data ---------------- */

const tr = (...ids) => Object.fromEntries(ids.map(id => [id, true]));
const SEED_AGENTS = [
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

// TODO: replace with your real form link (Tally / Google Form) before deploying
const FEEDBACK_URL = "https://tally.so/r/YOUR-FORM-ID";

const SEED_POLICIES = [
  { id: "p1", tag: "Data Privacy", name: "Block PII Export to External APIs", desc: "Prevents any AI agent from sending personally identifiable information to external third-party APIs without explicit authorization.", action: "BLOCK", violations: 7, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11", doc: { name: "AI-POL-001 PII Export Policy v2.pdf", uploadedOn: "2026-02-11", seeded: true } },
  { id: "p2", tag: "External Communication", name: "Require Approval for Outbound Emails", desc: "All agent-initiated outbound emails to external domains must receive human approval before sending.", action: "REQUIRE APPROVAL", violations: 3, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-02-11", doc: { name: "AI-POL-002 Outbound Communications Approval.pdf", uploadedOn: "2026-02-11", seeded: true } },
  { id: "p3", tag: "HIPAA", name: "Restrict HIPAA Record Access", desc: "Agents without explicit HIPAA clearance are blocked from accessing health-related records.", action: "BLOCK", violations: 12, enabled: true, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-01-20", doc: { name: "AI-POL-003 HIPAA Access Standard.pdf", uploadedOn: "2026-01-20", seeded: true } },
  { id: "p4", tag: "GDPR", name: "Audit Financial Data Reads", desc: "Log all agent access to financial systems for SOX compliance.", action: "AUDIT", violations: 0, enabled: true, frameworks: [], owner: "Chief Compliance Officer", status: "approved", approvedBy: "Head of Internal Audit", approvedOn: "2026-01-20", doc: { name: "AI-POL-004 Financial Data Access Logging.pdf", uploadedOn: "2026-01-20", seeded: true } },
  { id: "p5", tag: "Access Control", name: "Limit Full-Autonomy Agent Actions", desc: "Agents with full autonomy level require supervisor approval for any write operations.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-03-04", doc: { name: "AI-POL-005 Autonomy Levels and Write Approval.pdf", uploadedOn: "2026-03-04", seeded: true } },
  { id: "p6", tag: "Access Control", name: "Block Admin Privilege Escalation", desc: "Prevents agents from acquiring admin permissions they were not originally granted.", action: "BLOCK", violations: 2, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "Chief Risk Officer", approvedOn: "2026-01-20", doc: { name: "AI-POL-006 Privileged Access for Agents.pdf", uploadedOn: "2026-01-20", seeded: true } },
  { id: "p7", tag: "GDPR", name: "GDPR Data Deletion Compliance", desc: "Ensures agents processing EU customer data respect deletion requests within 72 hours.", action: "AUDIT", violations: 0, enabled: false, frameworks: [], owner: "Chief Privacy Officer / DPO", status: "approved", approvedBy: "General Counsel", approvedOn: "2026-03-04", doc: { name: "AI-POL-007 GDPR Deletion Procedure.pdf", uploadedOn: "2026-03-04", seeded: true } },
  { id: "p8", tag: "Custom", name: "Rate Limit External API Calls", desc: "Warns when an agent makes more than 1000 external API calls per hour.", action: "WARN", violations: 5, enabled: true, frameworks: [], owner: "Chief Technology Officer", status: "approved", approvedBy: "Chief Information Security Officer", approvedOn: "2026-04-15" },
  { id: "p9", tag: "AI Security", name: "Prompt Injection Guardrail", desc: "Screens user input, retrieved documents and tool outputs for injected instructions, and blocks agent actions that originate from untrusted instructions.", action: "BLOCK", violations: 6, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-SEC-009 Prompt Injection Guardrail Standard.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p10", tag: "AI Security", name: "Least-Privilege Tool Scope", desc: "Each agent may only call tools on its approved allowlist. Calls outside that scope are held for human approval.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-SEC-010 Agent Tool Allowlist Standard.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p11", tag: "AI Security", name: "Block System Prompt and Secret Leakage", desc: "Filters agent responses for system prompt contents, credentials and other secrets before they leave the platform.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief Information Security Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06" },
  { id: "p12", tag: "Incident Response", name: "Auto-Suspend Rogue Agents", desc: "Suspends an agent automatically after 3 critical violations within 6 hours and pages its owner. Reinstatement requires review.", action: "BLOCK", violations: 1, enabled: true, frameworks: [], owner: "Chief AI Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-05-06", doc: { name: "AI-IR-012 Agent Containment Runbook.pdf", uploadedOn: "2026-05-06", seeded: true } },
  { id: "p13", tag: "Third-Party Risk", name: "Vet Third-Party Models and Tools", desc: "New model providers, plugins and MCP tools must pass a security and provenance review before any agent can use them.", action: "REQUIRE APPROVAL", violations: 0, enabled: true, frameworks: [], owner: "Chief Risk Officer", status: "approved", approvedBy: "AI Governance Committee", approvedOn: "2026-06-10", doc: { name: "AI-TPR-013 Third-Party Model and Tool Review.pdf", uploadedOn: "2026-06-10", seeded: true } },
];

const SEED_AUDIT = [
  { sev: "info", ts: "11/2/2026, 3:10:00 PM", type: "Agent Registered", agent: "ClaimsGuide", desc: "ClaimsGuide registered and pending security review before activation" },
  { sev: "info", ts: "11/2/2026, 3:05:00 PM", type: "Agent Registered", agent: "JobFit", desc: "JobFit registered and pending security review before activation" },
  { id: "v1", sev: "critical", ts: "5/21/2026, 11:42:25 AM", type: "Policy Violation", agent: "ThreatWatch AI", policy: "p8", desc: "ThreatWatch AI exceeded external API rate limit — 1,247 calls in 60 minutes" },
  { sev: "critical", ts: "5/21/2026, 10:53:25 AM", type: "Agent Suspended", agent: "FinanceBot Alpha", desc: "FinanceBot Alpha suspended automatically by Auto-Suspend Rogue Agents after 3 critical policy violations within 6 hours" },
  { id: "v2", sev: "critical", ts: "5/21/2026, 10:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p1", desc: "FinanceBot Alpha accessed 3,400 EU customer PII records without GDPR deletion check" },
  { id: "v3", sev: "critical", ts: "5/21/2026, 8:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p2", desc: "FinanceBot Alpha sent outbound emails to external vendors without approval" },
  { id: "v4", sev: "critical", ts: "5/21/2026, 5:52:25 AM", type: "Policy Violation", agent: "FinanceBot Alpha", policy: "p3", desc: "FinanceBot Alpha attempted to access HIPAA-tagged records without clearance" },
  { sev: "warn", ts: "5/20/2026, 11:52:25 AM", type: "Risk Change", agent: "DataSync Pro", desc: "DataSync Pro risk score updated from 35 to 42 after new financial data permissions added" },
  { sev: "info", ts: "5/19/2026, 11:52:25 AM", type: "Agent Registered", agent: "LegalScan Bot", desc: "LegalScan Bot registered and pending security review before activation" },
  { sev: "warn", ts: "5/18/2026, 11:52:25 AM", type: "Risk Change", agent: "ThreatWatch AI", desc: "ThreatWatch AI risk level elevated to HIGH after external API access pattern detected" },
  { sev: "info", ts: "5/16/2026, 11:52:25 AM", type: "Status Change", agent: "CodeReview AI", desc: "CodeReview AI status changed from pending to active after security clearance" },
  { sev: "info", ts: "4/21/2026, 11:52:25 AM", type: "Agent Registered", agent: "Aria CX Bot", desc: "Aria CX Bot registered and activated for customer success department" },
];

const ALERTS = [
  { sev: "critical", title: "ThreatWatch AI exceeded external API rate limit — 1,247 calls in 60 minutes", agent: "ThreatWatch AI", time: "11:42:25 AM" },
  { sev: "critical", title: "FinanceBot Alpha accessed 3,400 EU customer PII records without GDPR deletion check", agent: "FinanceBot Alpha", time: "10:52:25 AM" },
  { sev: "critical", title: "FinanceBot Alpha sent outbound emails to external vendors without approval", agent: "FinanceBot Alpha", time: "8:52:25 AM" },
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
      MEDIUM: { bg: "rgba(234,179,8,.12)", fg: "#eab308", border: "rgba(234,179,8,.38)" },
      HIGH: { bg: "rgba(249,115,22,.14)", fg: "#fb923c", border: "rgba(249,115,22,.42)" },
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
    bar: { LOW: "#34d399", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#f43f5e" },
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
      MEDIUM: { bg: "rgba(161,98,7,.10)", fg: "#a16207", border: "rgba(161,98,7,.32)" },
      HIGH: { bg: "rgba(194,65,12,.10)", fg: "#c2410c", border: "rgba(194,65,12,.32)" },
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
    bar: { LOW: "#10b981", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#e11d48" },
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

function Registry({ agents, policies, audit, treatments, openAgent, onOpenRegister }) {
  const stepFor = a => nextStep(a, { audit, treatments });
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
                  {stepFor(a) && <span style={{ fontSize: 11.5, color: T.faint }}>{stepFor(a)}</span>}
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
                      <td style={{ padding: "14px 16px" }}>
                        <Pill fg={s.fg} bg={s.bg} border={s.border}>{a.status}</Pill>
                        {stepFor(a) && <div style={{ fontSize: 11.5, color: a.status === "suspended" ? (T.isDark ? "#f43f5e" : "#e11d48") : T.faint, marginTop: 5, whiteSpace: "nowrap" }}>{stepFor(a)}</div>}
                      </td>
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
          {p.doc && (p.doc.url ? (
            <a href={p.doc.url} download={p.doc.name} style={link} title={p.doc.name}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.doc.name}</span>
            </a>
          ) : (
            <span style={{ ...link, color: T.dim, fontWeight: 500 }} title={`${p.doc.name} (evidence on file, demo placeholder)`}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.doc.name}</span>
            </span>
          ))}
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

/* ---------------- shared risk & control helpers ---------------- */

const CONTROL_LABEL = { active: "In place", violated: "Violated", draft: "Draft", disabled: "Off", missing: "Not adopted" };

// Live status of any policy or recommended control, including violations by a given agent
const controlStatus = (id, policies, audit = [], agentName) => {
  const p = policies.find(x => x.id === id);
  const tpl = RECOMMENDED_POLICIES.find(t => t.id === id);
  const violated = !!agentName && audit.some(e => e.agent === agentName && e.type === "Policy Violation" && e.policy === id);
  const state = violated ? "violated" : !p ? "missing" : p.status === "draft" ? "draft" : !p.enabled ? "disabled" : "active";
  return { id, name: p?.name ?? tpl?.name ?? id, state, template: tpl };
};

function ControlPill({ c }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const st = c.state === "active" ? { fg: T.blue, bg: T.blueSoft, border: T.blueBorder }
    : c.state === "violated" ? { fg: red, bg: T.isDark ? "rgba(244,63,94,.1)" : "rgba(225,29,72,.07)", border: T.isDark ? "rgba(244,63,94,.4)" : "rgba(225,29,72,.3)" }
    : { fg: amber, bg: "transparent", border: T.isDark ? "rgba(245,158,11,.4)" : "rgba(180,83,9,.35)" };
  return <Pill small fg={st.fg} bg={st.bg} border={st.border}>{c.name}{c.state === "active" ? "" : ` · ${CONTROL_LABEL[c.state]}`}</Pill>;
}

// The one action that moves a control toward "in place"
function ControlAction({ c, actions, small = true }) {
  const T = useT();
  const btn = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: small ? 12 : 13, fontWeight: 700, padding: small ? "4px 9px" : "6px 11px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" };
  if (c.state === "missing" && c.template) return <button style={btn} onClick={() => actions.createPolicy(c.template.id)}><Plus size={12} /> Create from template</button>;
  if (c.state === "draft") return <button style={btn} onClick={() => actions.approve(c.id)}><BadgeCheck size={12} /> Approve</button>;
  if (c.state === "disabled") return <button style={btn} onClick={() => actions.togglePolicy(c.id)}>Enable policy</button>;
  return null;
}

function RiskScore({ s, label, big }) {
  const T = useT();
  const lv = riskLevel(s.score), st = T.risk[lv];
  return (
    <span title={`Likelihood ${s.l} (${LIKELIHOOD[s.l - 1]}) × impact ${s.i} (${IMPACT[s.i - 1]}) = ${s.score}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: big ? "5px 10px" : "2px 8px", borderRadius: 6, background: st.bg, border: `1px solid ${st.border}`, color: st.fg, fontSize: big ? 13 : 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label && <span style={{ fontWeight: 600, opacity: .8 }}>{label}</span>}{s.score} {lv[0] + lv.slice(1).toLowerCase()}
    </span>
  );
}

const GAP_STYLE = T => ({
  "Met": { fg: T.isDark ? "#34d399" : "#059669", bg: T.isDark ? "rgba(52,211,153,.1)" : "rgba(5,150,105,.08)", border: T.isDark ? "rgba(52,211,153,.35)" : "rgba(5,150,105,.3)" },
  "Partially met": { fg: T.isDark ? "#f59e0b" : "#b45309", bg: T.isDark ? "rgba(245,158,11,.1)" : "rgba(180,83,9,.07)", border: T.isDark ? "rgba(245,158,11,.35)" : "rgba(180,83,9,.3)" },
  "Not met": { fg: T.isDark ? "#f43f5e" : "#e11d48", bg: T.isDark ? "rgba(244,63,94,.1)" : "rgba(225,29,72,.07)", border: T.isDark ? "rgba(244,63,94,.35)" : "rgba(225,29,72,.3)" },
  "Not applicable": { fg: T.faint, bg: T.panelSoft, border: T.border },
});
const GapPill = ({ status }) => { const T = useT(); const s = GAP_STYLE(T)[status]; return <Pill small fg={s.fg} bg={s.bg} border={s.border}>{status}</Pill>; };

const toCSV = rows => "﻿" + rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
const downloadFile = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const SegTabs = ({ tabs, value, onChange }) => {
  const T = useT();
  return (
    <div role="tablist" style={{ display: "flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 3, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} style={{
          display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13.5, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap", background: value === id ? T.blue : "transparent", color: value === id ? "#fff" : T.dim,
        }}>{icon}{label}</button>
      ))}
    </div>
  );
};

/* ---------------- agent architecture ---------------- */

const ARCH = { BW: 142, BH: 56, VG: 18, TOP: 50, BOTTOM: 26, PADIN: 10, TRACK: 7, MINGUT: 22, BADGE_H: 16 };

// Orthogonal polyline with rounded corners
function roundedPath(raw) {
  const pts = raw.filter((p, i) => i === 0 || p[0] !== raw[i - 1][0] || p[1] !== raw[i - 1][1]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const r = Math.min(6, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2);
    d += ` L${x1 - Math.sign(x1 - x0) * r} ${y1 - Math.sign(y1 - y0) * r} Q${x1} ${y1} ${x1 + Math.sign(x2 - x1) * r} ${y1 + Math.sign(y2 - y1) * r}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0]} ${l[1]}`;
}

/*
 * Lay out lanes and boxes, then route every flow orthogonally through the
 * gutters between lanes. Each vertical run gets its own track (interval
 * coloring, innermost track first) so lines never overlap, and gutters widen
 * to fit their tracks. Lines never pass through a component.
 */
function computeDiagram(arch) {
  const { BW, BH, VG, TOP, BOTTOM, PADIN, TRACK, MINGUT } = ARCH;
  const laneW = BW + 2 * PADIN;
  const lanes = LANES.map(l => ({ ...l, comps: arch.components.filter(c => c.lane === l.id) })).filter(l => l.comps.length);
  const n = lanes.length;
  const maxN = Math.max(...lanes.map(l => l.comps.length));
  const H = TOP + maxN * BH + (maxN - 1) * VG + BOTTOM;

  const yPos = {}, laneOf = {};
  lanes.forEach((l, li) => {
    const total = l.comps.length * BH + (l.comps.length - 1) * VG;
    const y0 = TOP + (H - TOP - BOTTOM - total) / 2;
    l.comps.forEach((c, i) => { yPos[c.id] = y0 + i * (BH + VG); laneOf[c.id] = li; });
  });

  const groups = [];
  arch.flows.forEach(f => {
    const g = groups.find(x => x.from === f.from && x.to === f.to);
    if (g) g.flows.push(f); else groups.push({ from: f.from, to: f.to, flows: [f] });
  });

  // ports: spread every edge that touches a box side along that side, ordered by the other end's height
  const sideFor = (id, other) => (laneOf[other] >= laneOf[id] ? "right" : "left");
  const ports = {};
  groups.forEach((g, gi) => {
    [["from", g.from, g.to], ["to", g.to, g.from]].forEach(([end, id, other]) => {
      const key = `${id}:${sideFor(id, other)}`;
      (ports[key] = ports[key] || []).push({ gi, end, otherY: yPos[other] });
    });
  });
  const portY = {};
  Object.entries(ports).forEach(([key, list]) => {
    const y = yPos[key.split(":")[0]];
    list.sort((p, q) => p.otherY - q.otherY).forEach((p, k) => { portY[`${p.gi}:${p.end}`] = y + (BH * (k + 1)) / (list.length + 1); });
  });

  // horizontal crossing height for flows that skip over a lane
  const usedY = [];
  const freeY = (laneIdx, pref) => {
    const boxes = laneIdx.flatMap(li => lanes[li].comps.map(c => yPos[c.id]));
    let best = null;
    for (let y = 40; y <= H - 8; y += 2) {
      if (boxes.some(by => y > by - 7 && y < by + BH + 7)) continue;
      if (usedY.some(u => Math.abs(u - y) < 6)) continue;
      if (best === null || Math.abs(y - pref) < Math.abs(best - pref)) best = y;
    }
    const y = best ?? H - 10;
    usedY.push(y);
    return y;
  };

  // vertical runs: boundary k sits between lane k-1 and lane k; inner = side the run is entered from
  const segs = [];
  groups.forEach((g, gi) => {
    const la = laneOf[g.from], lb = laneOf[g.to];
    const ya = portY[`${gi}:from`], yb = portY[`${gi}:to`];
    g.ya = ya; g.yb = yb;
    if (la === lb) { g.kind = "loop"; segs.push({ gi, k: la + 1, y1: ya, y2: yb, inner: "left", part: 0 }); return; }
    const dir = lb > la ? 1 : -1, inner = dir > 0 ? "left" : "right";
    const k1 = dir > 0 ? la + 1 : la, k2 = dir > 0 ? lb : lb + 1;
    g.dir = dir;
    if (k1 === k2) { g.kind = "adj"; segs.push({ gi, k: k1, y1: ya, y2: yb, inner, part: 0 }); return; }
    const mid = []; for (let k = Math.min(la, lb) + 1; k < Math.max(la, lb); k++) mid.push(k);
    g.kind = "skip"; g.yF = freeY(mid, (ya + yb) / 2);
    segs.push({ gi, k: k1, y1: ya, y2: g.yF, inner, part: 0 }, { gi, k: k2, y1: g.yF, y2: yb, inner, part: 1 });
  });

  // interval coloring per boundary and side; upward runs take inner tracks from the top, downward from the bottom
  const trackCount = {};
  for (let k = 0; k <= n; k++) {
    let total = 0;
    ["left", "right"].forEach(side => {
      const list = segs.filter(s => s.k === k && s.inner === side)
        .sort((a, b) => (a.y2 < a.y1 ? a.y1 : 1e6 - a.y1) - (b.y2 < b.y1 ? b.y1 : 1e6 - b.y1));
      const tracks = [];
      list.forEach(s => {
        const lo = Math.min(s.y1, s.y2) - 4, hi = Math.max(s.y1, s.y2) + 4;
        let t = tracks.findIndex(iv => iv.every(([a, b]) => hi < a || lo > b));
        if (t < 0) { tracks.push([]); t = tracks.length - 1; }
        tracks[t].push([lo, hi]); s.track = t;
      });
      total += tracks.length;
      trackCount[`${k}:${side}`] = tracks.length;
    });
    trackCount[k] = total;
  }

  const gut = Array.from({ length: n + 1 }, (_, k) => Math.max(MINGUT, (trackCount[k] + 1) * TRACK + 8));
  const laneX = []; let x = 0;
  for (let li = 0; li < n; li++) { x += gut[li]; laneX.push(x); x += laneW; }
  const W = x + gut[n];
  const gutterLeft = k => (k === 0 ? 0 : laneX[k - 1] + laneW);
  const trackX = s => {
    const L = trackCount[`${s.k}:left`], R = trackCount[`${s.k}:right`];
    const start = gutterLeft(s.k) + (gut[s.k] - (L + R - 1) * TRACK) / 2;
    const idx = s.inner === "left" ? s.track : L + (R - 1 - s.track);
    return start + idx * TRACK;
  };

  const pos = {};
  lanes.forEach((l, li) => l.comps.forEach(c => { pos[c.id] = { x: laneX[li] + PADIN, y: yPos[c.id], w: BW, h: BH }; }));

  const placed = [];
  const edges = groups.map((g, gi) => {
    const a = pos[g.from], b = pos[g.to];
    const mine = segs.filter(s => s.gi === gi).sort((p, q) => p.part - q.part);
    const tx = mine.map(trackX);
    let raw;
    if (g.kind === "loop") raw = [[a.x + a.w, g.ya], [tx[0], g.ya], [tx[0], g.yb], [b.x + b.w, g.yb]];
    else {
      const x1 = g.dir > 0 ? a.x + a.w : a.x, x2 = g.dir > 0 ? b.x : b.x + b.w;
      raw = g.kind === "adj"
        ? [[x1, g.ya], [tx[0], g.ya], [tx[0], g.yb], [x2, g.yb]]
        : [[x1, g.ya], [tx[0], g.ya], [tx[0], g.yF], [tx[1], g.yF], [tx[1], g.yb], [x2, g.yb]];
    }
    // badge: slide along the longest run until it clears other badges
    const steps = [...new Set(g.flows.map(f => f.step))].join(",");
    const bw = 10 + steps.length * 6.2;
    const runs = raw.slice(0, -1).map((p, i) => [p, raw[i + 1]]).sort((p, q) => Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) - Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]));
    let badge = null;
    for (const [p, q] of runs) {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      for (const off of [0, -18, 18, -36, 36, -54, 54, -72, 72]) {
        const t = 0.5 + off / Math.max(len, 1);
        if (t < 0.12 || t > 0.88) continue;
        const cand = { x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t };
        if (placed.every(o => Math.abs(o.x - cand.x) > (o.w + bw) / 2 + 2 || Math.abs(o.y - cand.y) > ARCH.BADGE_H + 2)) { badge = cand; break; }
      }
      if (badge) break;
    }
    if (!badge) { const [p, q] = runs[0]; badge = { x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2 }; }
    placed.push({ ...badge, w: bw });
    return { ...g, d: roundedPath(raw), badge, badgeW: bw, steps, violation: g.flows.some(f => f.violation) };
  });

  return { lanes, laneX, laneW, pos, W, H, edges };
}

const wrapText = (s, n) => {
  const words = s.split(" "); const lines = [""];
  words.forEach(w => { const cur = lines[lines.length - 1]; if ((cur + " " + w).trim().length <= n) lines[lines.length - 1] = (cur + " " + w).trim(); else lines.push(w); });
  if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, n - 1) + "…"; }
  return lines;
};

// Worst residual risk on a component, for this agent
const componentRisk = (comp, riskById) => {
  const rs = comp.risks.map(id => riskById[id]).filter(Boolean);
  return { rs, worst: rs.length ? Math.max(...rs.map(r => r.residual.score)) : null };
};
const statusColor = (T, worst) => worst === null ? T.faint : worst >= 10 ? (T.isDark ? "#f43f5e" : "#e11d48") : worst >= 5 ? (T.isDark ? "#f59e0b" : "#b45309") : (T.isDark ? "#34d399" : "#059669");

function ArchDiagram({ arch, riskById, selected, onSelect }) {
  const T = useT();
  const L = useMemo(() => computeDiagram(arch), [arch]);
  const edges = L.edges;
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const linked = e => selected && (e.from === selected || e.to === selected);
  const ordered = [...edges].sort((a, b) => Number(linked(a)) - Number(linked(b)));
  const edgeColor = e => e.violation ? red : linked(e) ? T.blue : T.dim;

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label={`Architecture diagram of ${arch.components.length} components and ${arch.flows.length} data flows`}>
      <defs>
        {[["n", T.dim], ["h", T.blue], ["v", red]].map(([k, col]) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={col} />
          </marker>
        ))}
      </defs>

      {L.lanes.map((l, li) => {
        const boundary = l.id === "agent", untrusted = l.id === "untrusted";
        return (
          <g key={l.id}>
            <rect x={L.laneX[li]} y={6} width={L.laneW} height={L.H - 12} rx={10}
              fill={boundary ? T.blueSoft : untrusted ? (T.isDark ? "rgba(244,63,94,.04)" : "rgba(225,29,72,.03)") : T.panelSoft}
              stroke={boundary ? T.blue : untrusted ? (T.isDark ? "rgba(244,63,94,.35)" : "rgba(225,29,72,.3)") : T.border}
              strokeWidth={boundary ? 1.5 : 1} strokeDasharray={boundary || untrusted ? "6 4" : "none"} />
            <text x={L.laneX[li] + L.laneW / 2} y={26} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing=".04em"
              fill={boundary ? T.blue : untrusted ? red : T.faint}>{l.label.toUpperCase()}</text>
          </g>
        );
      })}

      {ordered.map(e => (
        <g key={`${e.from}-${e.to}`} opacity={selected && !linked(e) ? 0.25 : 1}>
          <title>{e.flows.map(f => `Step ${f.step}: ${f.label}`).join("\n")}</title>
          <path d={e.d} fill="none" stroke={edgeColor(e)} strokeWidth={linked(e) ? 2 : 1.4}
            strokeDasharray={e.violation ? "5 4" : "none"} markerEnd={`url(#arrow-${e.violation ? "v" : linked(e) ? "h" : "n"})`} />
        </g>
      ))}

      {arch.components.map(c => {
        const b = L.pos[c.id];
        const { worst } = componentRisk(c, riskById);
        const col = statusColor(T, worst);
        const sel = selected === c.id;
        const lines = wrapText(c.name, 21);
        return (
          <g key={c.id} onClick={() => onSelect(sel ? null : c.id)} style={{ cursor: "pointer" }} role="button" tabIndex={0}
            onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && onSelect(sel ? null : c.id)}
            aria-label={`${c.name}, ${COMPONENT_TYPES[c.type]}${worst !== null ? `, highest residual risk ${worst}` : ""}`}
            opacity={selected && !sel && !edges.some(e => linked(e) && (e.from === c.id || e.to === c.id)) ? 0.45 : 1}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={T.panel} stroke={sel ? T.blue : T.border} strokeWidth={sel ? 2 : 1} />
            <rect x={b.x} y={b.y + 8} width={4} height={b.h - 16} rx={2} fill={col} />
            {lines.map((ln, i) => (
              <text key={i} x={b.x + 13} y={b.y + 19 + i * 13.5} fontSize={11.5} fontWeight={700} fill={T.text}>{ln}</text>
            ))}
            <text x={b.x + 13} y={b.y + b.h - 9} fontSize={9.5} fill={T.faint}>{COMPONENT_TYPES[c.type]}</text>
          </g>
        );
      })}

      {edges.map(e => {
        const steps = e.steps, w = e.badgeW;
        return (
          <g key={`b-${e.from}-${e.to}`} opacity={selected && !linked(e) ? 0.3 : 1} pointerEvents="none">
            <rect x={e.badge.x - w / 2} y={e.badge.y - 8} width={w} height={16} rx={8} fill={e.violation ? red : linked(e) ? T.blue : T.panel} stroke={e.violation ? red : linked(e) ? T.blue : T.dim} strokeWidth={1} />
            <text x={e.badge.x} y={e.badge.y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={e.violation || linked(e) ? "#fff" : T.text}>{steps}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Phones: lanes as stacked groups plus a numbered flow list
function ArchStacked({ arch, riskById, selected, onSelect }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const name = id => arch.components.find(c => c.id === id)?.name;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {LANES.map(l => {
        const comps = arch.components.filter(c => c.lane === l.id);
        if (!comps.length) return null;
        const boundary = l.id === "agent", untrusted = l.id === "untrusted";
        return (
          <div key={l.id} style={{ border: `1px ${boundary || untrusted ? "dashed" : "solid"} ${boundary ? T.blue : untrusted ? (T.isDark ? "rgba(244,63,94,.4)" : "rgba(225,29,72,.3)") : T.border}`, borderRadius: 10, padding: 10, background: boundary ? T.blueSoft : T.panelSoft }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: boundary ? T.blue : untrusted ? red : T.faint, marginBottom: 8 }}>{l.label.toUpperCase()}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {comps.map(c => {
                const { worst } = componentRisk(c, riskById);
                return (
                  <button key={c.id} onClick={() => onSelect(selected === c.id ? null : c.id)} style={{
                    textAlign: "left", background: T.panel, border: `${selected === c.id ? 2 : 1}px solid ${selected === c.id ? T.blue : T.border}`,
                    borderLeft: `4px solid ${statusColor(T, worst)}`, borderRadius: 8, padding: "8px 9px", cursor: "pointer", color: T.text,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{COMPONENT_TYPES[c.type]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Data flows</div>
      {arch.flows.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.45, opacity: selected && f.from !== selected && f.to !== selected ? 0.4 : 1 }}>
          <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 10, background: f.violation ? red : T.panelSoft, border: `1px solid ${f.violation ? red : T.border}`, color: f.violation ? "#fff" : T.text, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{f.step}</span>
          <span><b>{name(f.from)}</b> → <b>{name(f.to)}</b>: <span style={{ color: f.violation ? red : T.dim }}>{f.label}</span></span>
        </div>
      ))}
    </div>
  );
}

function ComponentDetail({ comp, arch, riskById, policies, audit, agent, actions, onClose }) {
  const T = useT();
  const { rs } = componentRisk(comp, riskById);
  const name = id => arch.components.find(c => c.id === id)?.name;
  const flows = arch.flows.filter(f => f.from === comp.id || f.to === comp.id);
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  return (
    <div style={{ marginTop: 12, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{comp.name}</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{COMPONENT_TYPES[comp.type]} · {LANES.find(l => l.id === comp.lane).label}</div>
        </div>
        <button onClick={onClose} aria-label="Close component details" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", alignSelf: "flex-start" }}><X size={16} /></button>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 8, color: T.dim }}>{comp.detail}</div>

      <div style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 6px" }}>Threats at this component</div>
      {rs.length === 0 && <div style={{ fontSize: 12.5, color: T.faint }}>No risk scenarios for this agent are placed here.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rs.map(r => (
          <div key={r.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}><span style={{ color: T.faint, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>{r.id}</span> {r.title}</div>
              <RiskScore s={r.residual} label="Residual" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {r.refs.map(x => <Pill key={x} small fg={T.dim} bg={T.panelSoft} border={T.border}>{x}</Pill>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
              {r.controls.length === 0 && <span style={{ fontSize: 12, color: T.faint }}>No mapped controls in scope.</span>}
              {r.controls.map(c => {
                const st = controlStatus(c.id, policies, audit, agent.name);
                return <span key={c.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><ControlPill c={st} /><ControlAction c={st} actions={actions} /></span>;
              })}
            </div>
          </div>
        ))}
      </div>

      {flows.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 6px" }}>Data flows</div>
          {flows.map((f, i) => (
            <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: f.violation ? red : T.dim }}>
              Step {f.step}: {name(f.from)} → {name(f.to)}, {f.label.charAt(0).toLowerCase() + f.label.slice(1)}{f.violation ? " (violation)" : ""}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function WorkflowView({ arch, policies, audit, agent, actions }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const green = T.isDark ? "#34d399" : "#059669";
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {arch.workflow.map((w, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800,
              background: w.violation ? red : w.checkpoint ? green : T.blueSoft, color: w.violation || w.checkpoint ? "#fff" : T.blue, border: `1px solid ${w.violation ? red : w.checkpoint ? green : T.blueBorder}` }}>{i + 1}</div>
            {i < arch.workflow.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 14, background: T.border, margin: "4px 0" }} />}
          </div>
          <div style={{ paddingBottom: 16, minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{w.title}</span>
              <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>{w.actor}</Pill>
              {w.checkpoint && <Pill small fg={green} bg="transparent" border={green}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserCheck size={11} /> Human checkpoint</span></Pill>}
              {w.violation && <Pill small fg={red} bg="transparent" border={red}>Violation recorded</Pill>}
            </div>
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5, marginTop: 4 }}>{w.detail}</div>
            {w.controls.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
                {w.controls.map(id => {
                  const st = controlStatus(id, policies, audit, agent.name);
                  return <span key={id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><ControlPill c={st} /><ControlAction c={st} actions={actions} /></span>;
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentsView({ arch, agent, riskById }) {
  const T = useT();
  const sections = [...new Set(arch.components.map(c => AGBOM_SECTION[c.type]))];
  const exportBom = () => downloadFile(`${agent.name.replace(/\W+/g, "-").toLowerCase()}-agbom.json`, JSON.stringify(toAgBOM(agent, arch), null, 2), "application/json");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.5, flex: "1 1 260px" }}>
          Inventory of the agent's parts, grouped like the OWASP Agent Bill of Materials (AgBOM).
        </div>
        <button onClick={exportBom} style={{ display: "flex", alignItems: "center", gap: 6, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Download size={14} /> Export AgBOM (JSON)
        </button>
      </div>
      {sections.map(sec => (
        <div key={sec} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: T.faint, marginBottom: 6 }}>{sec.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {arch.components.filter(c => AGBOM_SECTION[c.type] === sec).map(c => {
              const { worst } = componentRisk(c, riskById);
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderLeft: `4px solid ${statusColor(T, worst)}`, borderRadius: 8, padding: "9px 11px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, marginTop: 2 }}>{c.detail}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.faint, whiteSpace: "nowrap" }}>{LANES.find(l => l.id === c.lane).label}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchitectureTab({ agent, policies, audit, actions }) {
  const T = useT();
  const arch = useMemo(() => buildArchitecture(agent), [agent.name, agent.model, agent.autonomy, agent.dept, JSON.stringify(agent.traits)]);
  const riskById = useMemo(() => Object.fromEntries(agent.risks.map(r => [r.id, r])), [agent.risks]);
  const [view, setView] = useState("diagram");
  const [sel, setSel] = useState(null);
  const comp = sel && arch.components.find(c => c.id === sel);
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const legend = [
    [statusColor(T, 12), "High or critical residual risk"], [statusColor(T, 6), "Medium"], [statusColor(T, 2), "Low"], [T.faint, "No risk placed"],
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <Pill small fg={arch.generated ? T.dim : T.blue} bg={arch.generated ? T.panelSoft : T.blueSoft} border={arch.generated ? T.border : T.blueBorder}>
          {arch.generated ? "Generated from characteristics" : "Declared architecture"}
        </Pill>
        <span style={{ fontSize: 12, color: T.faint }}>{arch.components.length} components · {arch.flows.length} data flows · {arch.workflow.filter(w => w.checkpoint).length} human checkpoints</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{arch.summary}</div>

      <div style={{ marginBottom: 14 }}>
        <SegTabs value={view} onChange={setView} tabs={[["diagram", "Diagram", <Network size={14} key="i" />], ["workflow", "Workflow", <ListOrdered size={14} key="i" />], ["components", "Components", <Boxes size={14} key="i" />]]} />
      </div>

      {view === "diagram" && (
        <>
          {T.mobile
            ? <ArchStacked arch={arch} riskById={riskById} selected={sel} onSelect={setSel} />
            : <ArchDiagram arch={arch} riskById={riskById} selected={sel} onSelect={setSel} />}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, fontSize: 11.5, color: T.dim }}>
            {legend.map(([c, l]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 12, borderRadius: 2, background: c }} />{l}</span>)}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, borderTop: `1.5px dashed ${T.blue}` }} />Trust boundary</span>
            {arch.flows.some(f => f.violation) && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, borderTop: `1.5px dashed ${red}` }} />Flow that caused a violation</span>}
            <span>Numbers are workflow steps. {T.mobile ? "Tap" : "Click"} a component to see its threats and controls.</span>
          </div>
          {comp && <ComponentDetail comp={comp} arch={arch} riskById={riskById} policies={policies} audit={audit} agent={agent} actions={actions} onClose={() => setSel(null)} />}
        </>
      )}
      {view === "workflow" && <WorkflowView arch={arch} policies={policies} audit={audit} agent={agent} actions={actions} />}
      {view === "components" && <ComponentsView arch={arch} agent={agent} riskById={riskById} />}
    </div>
  );
}

function AgentRiskTab({ agent, policies, audit, actions }) {
  const T = useT();
  const b = agent.scoreBreakdown;
  const st = T.risk[agent.risk];
  const sorted = [...agent.risks].sort((x, y) => y.residual.score - x.residual.score || y.inherent.score - x.inherent.score);
  const avg = b.top.length ? (b.top.reduce((a, c) => a + c, 0) / b.top.length) : 0;
  return (
    <div>
      <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: st.fg }}>{agent.score}</div>
          <div>
            <Pill fg={st.fg} bg={st.bg} border={st.border}>{agent.risk}</Pill>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 4 }}>Agent risk score out of 100</div>
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
          Highest residual risks: <b>{b.top.join(", ") || "none"}</b> → average {avg.toFixed(1)} × 4 = <b>{b.base}</b>
          <br />Violations on record: {b.crit} critical, {b.warn} warning → <b>+{b.incidents}</b>
        </div>
        <div style={{ fontSize: 12, color: T.faint, lineHeight: 1.5, marginTop: 6 }}>{AGENT_SCORE_METHOD}</div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700 }}>Risk scenarios ({sorted.length})</div>
      <div style={{ color: T.dim, fontSize: 12.5, marginTop: 3, marginBottom: 10, lineHeight: 1.45 }}>
        Scenarios that apply to this agent, from highest residual risk. Adopting the missing controls moves each one toward its target.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(r => (
          <div key={r.id} style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 12px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>
              <span style={{ color: T.faint, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>{r.id}</span> {r.title}
            </div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{r.category}{r.autonomyBoost ? " · impact +1 for full autonomy" : ""}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <RiskScore s={r.inherent} label="Inherent" /><ArrowRight size={13} color={T.faint} />
              <RiskScore s={r.residual} label="Residual" /><ArrowRight size={13} color={T.faint} />
              <RiskScore s={r.target} label="Target" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
              {r.controls.map(c => {
                const s2 = controlStatus(c.id, policies, audit, agent.name);
                return <span key={c.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><ControlPill c={s2} /><ControlAction c={s2} actions={actions} /></span>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- agent lifecycle (activation & reinstatement) ---------------- */

const btnStyle = (T, primary = true, enabled = true) => ({
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8, whiteSpace: "nowrap",
  border: primary ? "none" : `1px solid ${T.border}`, cursor: enabled ? "pointer" : "not-allowed",
  background: !enabled ? "rgba(148,163,184,.25)" : primary ? T.blue : "transparent", color: !enabled ? T.faint : primary ? "#fff" : T.dim,
});

function InlineForm({ fields, submitLabel, onSubmit }) {
  const T = useT();
  const [v, setV] = useState(() => Object.fromEntries(fields.map(f => [f.key, ""])));
  const ok = fields.every(f => v[f.key].trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      {fields.map(f => (
        <input key={f.key} value={v[f.key]} onChange={e => setV(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} aria-label={f.placeholder}
          style={{ ...fieldStyle(T), background: T.panel, padding: "7px 9px", fontSize: 12.5 }} />
      ))}
      <div><button disabled={!ok} onClick={() => onSubmit(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()])))} style={btnStyle(T, true, ok)}>{submitLabel}</button></div>
    </div>
  );
}

function RequirementSubs({ item, agent, policies, audit, actions, life }) {
  const T = useT();
  const green = T.isDark ? "#34d399" : "#059669";
  const box = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px" };
  if (item.id === "controls") return item.subs.map(p => {
    const c = controlStatus(p.id, policies, audit, agent.name);
    return <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><ControlPill c={c} /><ControlAction c={c} actions={actions} /></div>;
  });
  if (item.id === "risks") return item.subs.map(r => {
    const fix = r.controls.map(c => controlStatus(c.id, policies, audit, agent.name)).find(c => c.state !== "active");
    return (
      <div key={r.id} style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}><span style={{ color: T.faint, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>{r.id}</span> {r.title}</span>
          <RiskScore s={r.residual} label="Residual" />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 7 }}>
          {fix && <><ControlPill c={fix} /><ControlAction c={fix} actions={actions} /></>}
          <button onClick={() => life.openRisk(r.id)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            {fix ? "Or treat it in the risk register" : "Treat it in the risk register"}
          </button>
        </div>
      </div>
    );
  });
  if (item.id === "violations") return item.subs.map(e => <div key={e.id} style={{ ...box, fontSize: 12.5 }}>{e.desc}</div>);
  if (item.id === "rootcause") return item.subs.map(e => {
    const pol = controlStatus(e.policy, policies);
    return (
      <div key={e.id} style={box}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <SevDot sev={e.sev} size={14} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{e.desc}</div>
            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>{e.ts} · broke {pol.name}</div>
            {e.resolution ? (
              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>
                <div><b>Root cause:</b> <span style={{ color: T.dim }}>{e.resolution.cause}</span></div>
                <div><b>Fix:</b> <span style={{ color: T.dim }}>{e.resolution.fix}</span></div>
                <div style={{ color: green, fontSize: 11.5, marginTop: 2 }}>Recorded by {e.resolution.by} on {e.resolution.on}</div>
              </div>
            ) : (
              <InlineForm submitLabel="Record root cause" onSubmit={v => life.rootCause(agent.id, e.id, v)} fields={[
                { key: "cause", placeholder: "Root cause: what allowed this to happen?" },
                { key: "fix", placeholder: "Fix applied: what was changed?" },
              ]} />
            )}
          </div>
        </div>
      </div>
    );
  });
  if (item.id === "retest") return item.subs.map(p => {
    const pol = controlStatus(p.id, policies);
    return (
      <div key={p.id} style={box}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{pol.name}</div>
        {p.retest ? (
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
            <span style={{ color: T.dim }}>{p.retest.evidence}</span>
            <div style={{ color: green, fontSize: 11.5, marginTop: 2 }}>Re-tested on {p.retest.on}</div>
          </div>
        ) : (
          <InlineForm submitLabel="Record re-test" onSubmit={v => life.retest(agent.id, p.id, v.evidence)} fields={[
            { key: "evidence", placeholder: "Test performed and result, e.g. ticket or test ID" },
          ]} />
        )}
      </div>
    );
  });
  return null;
}

function RequirementRow({ item, agent, policies, audit, actions, life, onShowTab }) {
  const T = useT();
  const green = T.isDark ? "#34d399" : "#059669";
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const showSubs = !item.met && item.subs?.length || item.id === "rootcause" || item.id === "retest";
  return (
    <div style={{ display: "flex", gap: 10, padding: "11px 0", borderTop: `1px solid ${T.border}` }}>
      {item.met ? <CheckCircle2 size={17} color={green} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={17} color={amber} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: item.met ? T.dim : T.text }}>{item.label}</div>
        {!item.met && <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, marginTop: 2 }}>{item.detail}</div>}
        {item.met && item.attest && <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Confirmed by {item.attest.by} on {item.attest.on}</div>}
        {showSubs && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}><RequirementSubs item={item} agent={agent} policies={policies} audit={audit} actions={actions} life={life} /></div>}
        {!item.met && item.id === "attest-arch" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => onShowTab("architecture")} style={btnStyle(T, false)}><Network size={13} /> Review architecture</button>
            <button onClick={() => life.attest(agent.id, "arch")} style={btnStyle(T)}><UserCheck size={13} /> Confirm as owner</button>
          </div>
        )}
        {!item.met && item.id === "attest-traits" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: T.faint }}>Characteristics are listed further down this tab.</span>
            <button onClick={() => life.attest(agent.id, "traits")} style={btnStyle(T)}><UserCheck size={13} /> Confirm as owner</button>
          </div>
        )}
        {!item.met && item.id === "autonomy" && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => life.autonomy(agent.id, "Semi-autonomous")} style={btnStyle(T)}>Reduce to semi-autonomous</button>
            <button onClick={() => life.autonomy(agent.id, "Supervised")} style={btnStyle(T, false)}>Reduce to supervised</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalPanel({ agent, req, life }) {
  const T = useT();
  const [by, setBy] = useState("");
  const [due, setDue] = useState(addDays(60));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const activation = req.kind === "activation";
  const maxDue = addDays(CONDITION_MAX_DAYS);
  const byOk = by && by !== agent.owner;
  const dueOk = due && due <= maxDue && due > addDays(0);
  return (
    <div style={{ marginTop: 12, background: T.panel, border: `1px solid ${T.blueBorder}`, borderRadius: 10, padding: 13 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Approver decision</div>
      <div style={{ fontSize: 12.5, color: T.dim, marginTop: 2, lineHeight: 1.45 }}>
        Must be someone other than the owner ({agent.owner}).
        {activation && !req.done && ` ${req.open.length} item${req.open.length === 1 ? " is" : "s are"} still open, so this can only be a conditional activation.`}
        {!activation && !req.done && " Reinstatement needs every item met first."}
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle(T)}>Approved by</label>
        <select value={by} onChange={e => setBy(e.target.value)} style={fieldStyle(T)}>
          <option value="">Select approver…</option>
          {POLICY_ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      {activation && !req.done && (
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle(T)}>Open items due by (max {CONDITION_MAX_DAYS} days)</label>
          <input type="date" value={due} max={maxDue} onChange={e => setDue(e.target.value)} style={fieldStyle(T)} />
        </div>
      )}
      {rejecting ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <input autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for returning it to the owner (required)" style={fieldStyle(T)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={!byOk || !reason.trim()} onClick={() => life.decide(agent.id, { decision: "reject", by, reason: reason.trim() })} style={btnStyle(T, true, byOk && !!reason.trim())}>Return to owner</button>
            <button onClick={() => setRejecting(false)} style={btnStyle(T, false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {req.done
            ? <button disabled={!byOk} onClick={() => life.decide(agent.id, { decision: "approve", by })} style={btnStyle(T, true, byOk)}><BadgeCheck size={14} /> {activation ? "Approve activation" : "Approve reinstatement"}</button>
            : activation && <button disabled={!byOk || !dueOk} onClick={() => life.decide(agent.id, { decision: "conditional", by, due })} style={btnStyle(T, true, byOk && dueOk)}><BadgeCheck size={14} /> Approve with conditions</button>}
          {!activation && !req.done && <button disabled style={btnStyle(T, true, false)}>Approve reinstatement</button>}
          <button onClick={() => setRejecting(true)} style={btnStyle(T, false)}>Return to owner</button>
        </div>
      )}
    </div>
  );
}

function LifecycleCard({ agent, policies, audit, treatments, actions, life, onShowTab }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const green = T.isDark ? "#34d399" : "#059669";
  const ctx = { audit, treatments };

  if (agent.status === "active") {
    if (!agent.conditions && !agent.probation) return null;
    const act = agent.conditions ? requirements(agent, "activation", ctx) : null;
    return (
      <div id="lifecycle-card" style={{ border: `1px solid ${T.blueBorder}`, background: T.blueSoft, borderRadius: 10, padding: 14, marginBottom: 18 }}>
        {agent.probation && (
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <b>On probation until {agent.probation.until}.</b> Reinstated by {agent.probation.by} on {agent.probation.on}. A single critical violation suspends the agent again.
          </div>
        )}
        {agent.conditions && (
          <div style={{ marginTop: agent.probation ? 10 : 0 }}>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}><b>Conditional activation</b> approved by {agent.conditions.by} on {agent.conditions.on}. Open items are due by <b>{agent.conditions.due}</b>.</div>
            {agent.conditions.items.map(id => {
              const it = act.items.find(i => i.id === id);
              return it && (
                <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 13 }}>
                  {it.met ? <CheckCircle2 size={15} color={green} /> : <Clock size={15} color={T.isDark ? "#f59e0b" : "#b45309"} />}
                  <span style={{ color: it.met ? T.dim : T.text }}>{it.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const req = lifecycle(agent, ctx);
  const activation = req.kind === "activation";
  const pct = Math.round((req.met / req.total) * 100);
  return (
    <div id="lifecycle-card" style={{ border: `1px solid ${activation ? T.blueBorder : (T.isDark ? "rgba(244,63,94,.45)" : "rgba(225,29,72,.35)")}`, borderRadius: 10, padding: 14, marginBottom: 18, background: activation ? T.blueSoft : (T.isDark ? "rgba(244,63,94,.06)" : "rgba(225,29,72,.04)") }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {activation ? <Clock size={17} color={T.blue} /> : <ShieldAlert size={17} color={red} />}
        <div style={{ fontSize: 15.5, fontWeight: 800, color: activation ? T.text : red }}>
          {activation ? "Pending review" : "Suspended"}
        </div>
      </div>
      {activation ? (
        <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5, marginTop: 4 }}>
          New agents can't run until the owner completes these requirements and an independent approver activates them.
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
          Suspended on <b>{agent.suspension?.on}</b> by the <b>{agent.suspension?.by}</b>: {agent.suspension?.reason}. The owner must fix the causes below, then an independent approver can reinstate it.
        </div>
      )}

      {agent.lastDecision?.decision === "reject" && !agent.review && (
        <div style={{ marginTop: 10, background: T.warnBox.bg, border: `1px solid ${T.warnBox.border}`, borderRadius: 8, padding: "8px 11px", fontSize: 12.5, color: T.warnBox.fg, lineHeight: 1.45 }}>
          Returned by {agent.lastDecision.by} on {agent.lastDecision.on}: {agent.lastDecision.reason}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 4px" }}>
        <div style={{ flex: 1, height: 7, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: req.done ? green : T.blue, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{req.met} of {req.total} met</span>
      </div>

      <div>
        {req.items.map(it => <RequirementRow key={it.id} item={it} agent={agent} policies={policies} audit={audit} actions={actions} life={life} onShowTab={onShowTab} />)}
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        {agent.review ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <b>Submitted for {req.kind}</b> by {agent.review.by} (owner) on {agent.review.on}. Awaiting an approver.
              <button onClick={() => life.withdraw(agent.id)} style={{ marginLeft: 8, background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>Withdraw</button>
            </div>
            <ApprovalPanel agent={agent} req={req} life={life} />
          </>
        ) : (
          <>
            {!req.done && (
              <div style={{ fontSize: 12.5, color: T.dim, marginBottom: 8, lineHeight: 1.45 }}>
                {activation
                  ? `${req.total - req.met} item${req.total - req.met === 1 ? "" : "s"} still open. You can submit now and the approver may activate conditionally, with a due date for the rest.`
                  : "Submit once every item is met. Reinstatement after a suspension can't be conditional."}
              </div>
            )}
            <button disabled={!activation && !req.done} onClick={() => life.submit(agent.id, req.kind)} style={btnStyle(T, true, activation || req.done)}>
              Submit for {req.kind} <span style={{ fontWeight: 500, opacity: .85 }}>(as owner: {agent.owner})</span>
            </button>
          </>
        )}
      </div>
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

function AgentDrawer({ agent, audit, policies, actions, treatments, life, onClose, onUpdateTraits, onExclude, onInclude }) {
  const T = useT();
  const [editing, setEditing] = useState(false);
  const [draftTraits, setDraftTraits] = useState({});
  const [tab, setTab] = useState("gaps");
  const [view, setView] = useState("overview");
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
      <button onClick={() => actions.createPolicy(p.template.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
        <Plus size={12} /> Create from template
      </button>);
    if (p.state === "draft") return (
      <button onClick={() => actions.approve(p.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
        <BadgeCheck size={12} /> Approve
      </button>);
    if (p.state === "disabled") return (
      <button onClick={() => actions.togglePolicy(p.id)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", cursor: "pointer" }}>
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
        width: view === "architecture" && !T.mobile ? "min(900px, 100%)" : "min(540px, 100%)", height: "100%", background: T.panel, transition: "width .2s",
        borderLeft: `1px solid ${T.border}`, padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>{agent.name}</div>
          <button onClick={onClose} aria-label="Close details" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ color: T.faint, fontSize: 13.5, marginBottom: 14 }}>{agent.model}</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button onClick={() => { setView("overview"); setTimeout(() => document.getElementById("lifecycle-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
            title="Show status and next steps" aria-label={`Status ${agent.status}. Show next steps`}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <Pill fg={s.fg} bg={s.bg} border={s.border}>{agent.status}{agent.conditions ? " · conditional" : ""}{agent.probation ? " · probation" : ""}</Pill>
          </button>
          <Pill fg={r.fg} bg={r.bg} border={r.border}>{agent.risk}</Pill>
          {nextStep(agent, { audit, treatments }) && <span style={{ fontSize: 12, color: T.faint, alignSelf: "center" }}>{nextStep(agent, { audit, treatments })}</span>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <SegTabs value={view} onChange={setView} tabs={[["overview", "Overview"], ["architecture", "Architecture"], ["risk", `Risk (${agent.score})`]]} />
        </div>
        {view === "architecture" && <ArchitectureTab agent={agent} policies={policies} audit={audit} actions={actions} />}
        {view === "risk" && <AgentRiskTab agent={agent} policies={policies} audit={audit} actions={actions} />}
        {view === "overview" && (<>
        <LifecycleCard agent={agent} policies={policies} audit={audit} treatments={treatments} actions={actions} life={life} onShowTab={setView} />
        {agent.desc && <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>{agent.desc}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[["Department", agent.dept], ["Owner", agent.owner], ["Autonomy", agent.autonomy], ["Risk score", `${agent.score} / 100`]].map(([k, v]) => (
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
        </>)}
      </div>
    </div>
  );
}


/* ---------------- risk & gap assessment ---------------- */

const TREATMENTS = ["Mitigate", "Accept", "Transfer", "Avoid"];
const TREATMENT_HINT = {
  Mitigate: "Reduce the risk by adopting the mapped controls.",
  Accept: "Keep the current residual risk. Requires a justification and an approver other than the owner.",
  Transfer: "Shift the risk to a third party, for example through insurance or a contract.",
  Avoid: "Stop the activity that creates the risk, for example by retiring or restricting the agent.",
};
const defaultTreatment = s => ({ treatment: "Mitigate", owner: s.owner, reviewOn: addDays(180), note: "", acceptance: null });

function RiskMatrix({ items, scoreKey, title, cell, onCell }) {
  const T = useT();
  const count = (l, i) => items.filter(x => x[scoreKey].l === l && x[scoreKey].i === i).length;
  return (
    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 11, color: T.faint, textAlign: "center" }}>Impact →</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
            {[5, 4, 3, 2, 1].map(i => [1, 2, 3, 4, 5].map(l => {
              const n = count(l, i), lv = riskLevel(l * i), sel = cell && cell.key === scoreKey && cell.l === l && cell.i === i;
              return (
                <button key={`${l}-${i}`} disabled={!n} onClick={() => onCell(sel ? null : { key: scoreKey, l, i })}
                  aria-label={`Likelihood ${l}, impact ${i}: ${n} scenario${n === 1 ? "" : "s"}`}
                  title={`Likelihood ${l} (${LIKELIHOOD[l - 1]}) × impact ${i} (${IMPACT[i - 1]}) = ${l * i}`}
                  style={{
                    aspectRatio: "1.35", borderRadius: 5, border: sel ? `2px solid ${T.text}` : "1px solid transparent",
                    background: T.bar[lv], opacity: n ? 0.92 : 0.16, color: "#0b1120", fontWeight: 800, fontSize: 13,
                    cursor: n ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}>{n || ""}</button>
              );
            }))}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: T.faint, marginTop: 5 }}>Likelihood →</div>
        </div>
      </div>
    </div>
  );
}

function RiskScenarioDrawer({ entry, treatment, policies, audit, actions, onSave, onClose, onOpenAgent }) {
  const T = useT();
  const [f, setF] = useState(() => ({ ...treatment, accBy: treatment.acceptance?.by || "", accReason: treatment.acceptance?.reason || "" }));
  const set = p => setF(s => ({ ...s, ...p }));
  const worst = [...entry.agents].sort((a, b) => b.residual.score - a.residual.score)[0];
  const sameOwner = f.treatment === "Accept" && f.accBy && f.accBy === f.owner;
  const valid = f.owner && f.reviewOn && (f.treatment !== "Accept" || (f.accReason.trim() && f.accBy && !sameOwner)) && (!["Transfer", "Avoid"].includes(f.treatment) || f.note.trim());
  const save = () => onSave(entry.id, {
    treatment: f.treatment, owner: f.owner, reviewOn: f.reviewOn, note: f.note.trim(),
    acceptance: f.treatment === "Accept" ? { by: f.accBy, reason: f.accReason.trim(), on: new Date().toISOString().slice(0, 10) } : null,
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", height: "100%", background: T.panel, borderLeft: `1px solid ${T.border}`, padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: T.faint, fontFamily: "ui-monospace, monospace" }}>{entry.id} · {entry.category}</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, marginTop: 4 }}>{entry.title}</div>
          </div>
          <button onClick={onClose} aria-label="Close risk" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", alignSelf: "flex-start" }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>{entry.desc}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {entry.refs.map(x => <Pill key={x} small fg={T.dim} bg={T.panelSoft} border={T.border}>{x}</Pill>)}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", margin: "16px 0 6px" }}>
          <RiskScore s={entry.inherent} label="Inherent" big /><ArrowRight size={14} color={T.faint} />
          <RiskScore s={entry.residual} label="Residual" big /><ArrowRight size={14} color={T.faint} />
          <RiskScore s={entry.target} label="Target" big />
        </div>
        <div style={{ fontSize: 12, color: T.faint, marginBottom: 20, lineHeight: 1.5 }}>Register scores are the worst case across affected agents. Bands: {RISK_BANDS}.</div>

        <DrawerSection title="How the residual score is calculated" sub={`Shown for ${worst.name}, the agent with the highest residual risk.`}>
          <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 13px", fontSize: 13, lineHeight: 1.65 }}>
            <div>Inherent: likelihood <b>{worst.inherent.l}</b> ({LIKELIHOOD[worst.inherent.l - 1]}) × impact <b>{worst.inherent.i}</b> ({IMPACT[worst.inherent.i - 1]}) = <b>{worst.inherent.score}</b></div>
            {worst.controls.length === 0 && <div style={{ color: T.dim }}>No mapped controls are in scope for this agent.</div>}
            {worst.controls.map(c => (
              <div key={c.id} style={{ color: c.active ? T.text : T.dim }}>
                {c.name}: {[c.l && `−${c.l} likelihood`, c.i && `−${c.i} impact`].filter(Boolean).join(", ")}{" "}
                <span style={{ color: c.active ? (T.isDark ? "#34d399" : "#059669") : c.violated ? (T.isDark ? "#f43f5e" : "#e11d48") : (T.isDark ? "#f59e0b" : "#b45309"), fontWeight: 600 }}>
                  ({c.active ? "in place" : c.violated ? "violated by this agent, no credit" : `${CONTROL_LABEL[c.state].toLowerCase()}, no credit`})
                </span>
              </div>
            ))}
            <div>Residual: likelihood <b>{worst.residual.l}</b> × impact <b>{worst.residual.i}</b> = <b>{worst.residual.score}</b> ({riskLevel(worst.residual.score).toLowerCase()})</div>
          </div>
        </DrawerSection>

        <DrawerSection title="Mitigating controls">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {entry.controls.map(c => {
              const st = controlStatus(c.id, policies);
              return (
                <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ControlPill c={st} />
                  <span style={{ fontSize: 12, color: T.faint }}>{[c.l && `−${c.l} likelihood`, c.i && `−${c.i} impact`].filter(Boolean).join(", ")}</span>
                  <ControlAction c={st} actions={actions} />
                </div>
              );
            })}
          </div>
        </DrawerSection>

        <DrawerSection title={`Affected agents (${entry.agents.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...entry.agents].sort((a, b) => b.residual.score - a.residual.score).map(a => (
              <button key={a.id} onClick={() => onOpenAgent(a.name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 11px", cursor: "pointer", color: T.text, fontSize: 13.5, textAlign: "left" }}>
                <span>{a.name}</span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><RiskScore s={a.residual} /><ChevronRight size={15} color={T.faint} /></span>
              </button>
            ))}
          </div>
        </DrawerSection>

        <DrawerSection title="Treatment" sub="Recorded in the audit trail when saved.">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {TREATMENTS.map(t => <FilterChip key={t} active={f.treatment === t} onClick={() => set({ treatment: t })} label={t} />)}
          </div>
          <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, marginBottom: 12 }}>{TREATMENT_HINT[f.treatment]}</div>
          <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1.5fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle(T)}>Risk owner</label>
              <select style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })}>
                {POLICY_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle(T)}>Next review</label>
              <input type="date" style={fieldStyle(T)} value={f.reviewOn} onChange={e => set({ reviewOn: e.target.value })} />
            </div>
          </div>
          {f.treatment === "Accept" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, border: `1px solid ${T.warnBox.border}`, background: T.warnBox.bg, borderRadius: 9, padding: 12 }}>
              <div style={{ fontSize: 12.5, color: T.warnBox.fg, lineHeight: 1.45 }}>Accepting leaves the residual score at {entry.residual.score}. It stays in the register and on the report.</div>
              <div>
                <label style={labelStyle(T)}>Justification</label>
                <textarea rows={2} value={f.accReason} onChange={e => set({ accReason: e.target.value })} placeholder="Why is this level of risk acceptable?"
                  style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={labelStyle(T)}>Accepted by</label>
                <select style={fieldStyle(T)} value={f.accBy} onChange={e => set({ accBy: e.target.value })}>
                  <option value="">Select approver…</option>
                  {POLICY_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                {sameOwner && <div style={{ color: T.warnBox.fg, fontSize: 12.5, marginTop: 6 }}>The approver should be independent of the risk owner.</div>}
              </div>
            </div>
          )}
          {["Transfer", "Avoid", "Mitigate"].includes(f.treatment) && (
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle(T)}>{f.treatment === "Mitigate" ? "Notes (optional)" : "How the risk is transferred or avoided"}</label>
              <textarea rows={2} value={f.note} onChange={e => set({ note: e.target.value })}
                placeholder={f.treatment === "Transfer" ? "e.g. Covered by cyber insurance policy and vendor indemnity" : f.treatment === "Avoid" ? "e.g. Agent restricted to read-only access" : "Plan, tickets or dependencies"}
                style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} />
            </div>
          )}
          <button disabled={!valid} onClick={save} style={{
            marginTop: 14, width: "100%", background: valid ? T.blue : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
            border: "none", borderRadius: 9, padding: "11px 16px", fontSize: 14.5, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
          }}>Save treatment</button>
        </DrawerSection>
      </div>
    </div>
  );
}

function RiskRegister({ register, treatments, onOpen }) {
  const T = useT();
  const [cat, setCat] = useState("all");
  const [lvl, setLvl] = useState("all");
  const [cell, setCell] = useState(null);
  const tr = s => treatments[s.id] || defaultTreatment(s);

  const inCat = (s, c = cat) => c === "all" || s.category === c;
  const inLvl = (s, v = lvl) => v === "all" || riskLevel(s.residual.score) === v;
  const inCell = s => !cell || (s[cell.key].l === cell.l && s[cell.key].i === cell.i);
  const shown = register.filter(s => inCat(s) && inLvl(s) && inCell(s)).sort((a, b) => b.residual.score - a.residual.score || b.inherent.score - a.inherent.score);

  const sumI = register.reduce((n, s) => n + s.inherent.score, 0), sumR = register.reduce((n, s) => n + s.residual.score, 0);
  const highCrit = register.filter(s => s.residual.score >= 10).length;
  const accepted = register.filter(s => tr(s).treatment === "Accept").length;
  const cats = RISK_CATEGORIES.filter(c => register.some(s => s.category === c));

  const exportCsv = () => downloadFile("argus-risk-register.csv", toCSV([
    ["ID", "Category", "Scenario", "Affected agents", "Inherent L", "Inherent I", "Inherent score", "Residual L", "Residual I", "Residual score", "Residual level", "Target score", "Mitigating controls", "Treatment", "Owner", "Next review", "Accepted by", "Acceptance reason", "References"],
    ...register.map(s => {
      const t = tr(s);
      return [s.id, s.category, s.title, s.agents.map(a => a.name).join("; "), s.inherent.l, s.inherent.i, s.inherent.score, s.residual.l, s.residual.i, s.residual.score, riskLevel(s.residual.score),
        s.target.score, s.controls.map(c => c.id).join("; "), t.treatment, t.owner, t.reviewOn, t.acceptance?.by || "", t.acceptance?.reason || "", s.refs.join("; ")];
    }),
  ]), "text/csv;charset=utf-8");

  const stats = [
    ["Scenarios assessed", register.length, T.text],
    ["High or critical residual", highCrit, highCrit ? (T.isDark ? "#f43f5e" : "#e11d48") : T.text],
    ["Risk reduced by controls", `${sumI ? Math.round((1 - sumR / sumI) * 100) : 0}%`, T.isDark ? "#34d399" : "#059669"],
    ["Accepted risks", accepted, T.text],
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 140 : 180}px, 1fr))`, gap: T.mobile ? 10 : 14 }}>
        {stats.map(([l, v, c]) => (
          <Card key={l} style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{l}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: c, marginTop: 4 }}>{v}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: T.mobile ? 14 : 20, marginTop: 16 }}>
        <div style={{ display: "flex", gap: T.mobile ? 18 : 30, flexWrap: "wrap" }}>
          <RiskMatrix items={register} scoreKey="inherent" title="Inherent risk (before controls)" cell={cell} onCell={setCell} />
          <RiskMatrix items={register} scoreKey="residual" title="Residual risk (with current controls)" cell={cell} onCell={setCell} />
        </div>
        <div style={{ fontSize: 12, color: T.faint, marginTop: 10, lineHeight: 1.5 }}>
          Each scenario is plotted at its worst case across affected agents. Select a cell to filter the register. Bands: {RISK_BANDS}.
        </div>
      </Card>

      <div style={{ ...chipRow(T.mobile), marginTop: 18 }}>
        {[["all", "All categories"], ...cats.map(c => [c, c])].map(([id, label]) => (
          <FilterChip key={id} active={cat === id} onClick={() => setCat(id)} label={label} count={register.filter(s => inCat(s, id) && inLvl(s) && inCell(s)).length} />
        ))}
      </div>
      <div style={{ ...chipRow(T.mobile), marginTop: 8 }}>
        {[["all", "Any residual level"], ["CRITICAL", "Critical"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]].map(([id, label]) => (
          <FilterChip key={id} active={lvl === id} onClick={() => setLvl(id)} label={label} count={register.filter(s => inCat(s) && inLvl(s, id) && inCell(s)).length} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "12px 0 14px", color: T.faint, fontSize: 13 }}>
        <span>Showing {shown.length} of {register.length} scenarios</span>
        {(cat !== "all" || lvl !== "all" || cell) && <button onClick={() => { setCat("all"); setLvl("all"); setCell(null); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>Clear filters</button>}
        <button onClick={exportCsv} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <FileSpreadsheet size={14} /> Export register (CSV)
        </button>
      </div>

      {T.mobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map(s => {
            const t = tr(s);
            return (
              <Card key={s.id} onClick={() => onOpen(s.id)} style={{ padding: "13px 14px", cursor: "pointer" }}>
                <div style={{ fontSize: 12, color: T.faint, fontFamily: "ui-monospace, monospace" }}>{s.id} · {s.category}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3, lineHeight: 1.35 }}>{s.title}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                  <RiskScore s={s.inherent} /><ArrowRight size={12} color={T.faint} /><RiskScore s={s.residual} />
                  <span style={{ fontSize: 12, color: T.faint, marginLeft: "auto" }}>{s.agents.length} agent{s.agents.length === 1 ? "" : "s"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.dim, marginTop: 7 }}>{t.treatment === "Accept" ? "Accepted" : t.treatment} · {t.owner}</div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
              <thead>
                <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 13, textAlign: "left" }}>
                  {["Risk scenario", "Agents", "Inherent", "Residual", "Target", "Treatment", "Owner"].map(h => <th key={h} style={{ padding: "12px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map(s => {
                  const t = tr(s);
                  return (
                    <tr key={s.id} onClick={() => onOpen(s.id)} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <td style={{ padding: "12px 14px", maxWidth: 360 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}><span style={{ color: T.faint, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{s.id}</span> {s.title}</div>
                        <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{s.category}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13.5 }} title={s.agents.map(a => a.name).join(", ")}>{s.agents.length}</td>
                      <td style={{ padding: "12px 14px" }}><RiskScore s={s.inherent} /></td>
                      <td style={{ padding: "12px 14px" }}><RiskScore s={s.residual} /></td>
                      <td style={{ padding: "12px 14px" }}><RiskScore s={s.target} /></td>
                      <td style={{ padding: "12px 14px", fontSize: 13.5 }}>
                        {t.treatment === "Accept" ? <Pill small fg={T.warnBox.fg} bg={T.warnBox.bg} border={T.warnBox.border}>Accepted</Pill> : t.treatment}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: T.dim }}>{t.owner}</td>
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

// The next step that would move a requirement toward "Met"
const gapNextStep = (row, policies) => {
  const mapped = row.policies.map(p => controlStatus(p.id, policies)).find(c => c.state !== "active");
  if (mapped) return mapped;
  const rec = recommendationFor(row.key);
  if (rec) { const c = controlStatus(rec.id, policies); if (c.state !== "active") return c; }
  return null;
};

function GapAssessment({ gap, policies, actions, onGapField, onMarkNA }) {
  const T = useT();
  const [fw, setFw] = useState("all");
  const [status, setStatus] = useState("all");
  const [naFor, setNaFor] = useState(null);
  const [naReason, setNaReason] = useState("");
  const rows = gap.flatMap(f => f.rows);
  const inFw = (r, v = fw) => v === "all" || r.framework.id === v;
  const inSt = (r, v = status) => v === "all" || r.status === v;
  const shown = rows.filter(r => inFw(r) && inSt(r));
  const totals = st => rows.filter(r => r.status === st).length;
  const applicable = rows.length - totals("Not applicable");
  const overall = applicable ? Math.round(((totals("Met") + totals("Partially met") * 0.5) / applicable) * 100) : 0;
  const GS = GAP_STYLE(T);

  const exportCsv = () => downloadFile("argus-gap-assessment.csv", toCSV([
    ["Framework", "Requirement ID", "Requirement", "Status", "Basis", "Mapped controls", "Recommended control", "Remediation owner", "Target date", "Not applicable reason"],
    ...rows.map(r => [r.framework.name, r.id, r.title, r.status, r.basis, r.policies.map(p => p.name).join("; "),
      recommendationFor(r.key)?.name || "", r.owner || (r.status === "Not met" || r.status === "Partially met" ? recommendationFor(r.key)?.owner || "" : ""), r.due, r.na?.reason || ""]),
  ]), "text/csv;charset=utf-8");

  const remediation = r => {
    if (r.status !== "Not met" && r.status !== "Partially met") return null;
    const suggested = recommendationFor(r.key)?.owner || "";
    const next = gapNextStep(r, policies);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select aria-label={`Remediation owner for ${r.framework.short} ${r.id}`} value={r.owner || suggested} onChange={e => onGapField(r.key, "owner", e.target.value)}
            style={{ ...fieldStyle(T), width: "auto", flex: "1 1 170px", padding: "6px 8px", fontSize: 12.5 }}>
            <option value="">Assign owner…</option>
            {POLICY_ROLES.map(o => <option key={o}>{o}</option>)}
          </select>
          <input type="date" aria-label={`Target date for ${r.framework.short} ${r.id}`} value={r.due} onChange={e => onGapField(r.key, "due", e.target.value)}
            style={{ ...fieldStyle(T), width: "auto", flex: "0 1 140px", padding: "6px 8px", fontSize: 12.5 }} />
        </div>
        {next && <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><ControlPill c={next} /><ControlAction c={next} actions={actions} /></div>}
      </div>
    );
  };

  const naControl = r => {
    if (!r.fwInScope) return null;
    if (r.na) return <button onClick={() => onMarkNA(r.key, null)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>Mark applicable again</button>;
    if (r.status === "Met") return null;
    if (naFor === r.key) return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <input autoFocus value={naReason} onChange={e => setNaReason(e.target.value)} placeholder="Reason (required, logged)" style={{ ...fieldStyle(T), flex: "1 1 180px", padding: "6px 8px", fontSize: 12.5 }} />
        <button disabled={!naReason.trim()} onClick={() => { onMarkNA(r.key, naReason.trim()); setNaFor(null); setNaReason(""); }} style={{ fontSize: 12.5, fontWeight: 700, padding: "6px 10px", borderRadius: 7, border: "none", background: naReason.trim() ? T.blue : "rgba(148,163,184,.25)", color: naReason.trim() ? "#fff" : T.faint, cursor: naReason.trim() ? "pointer" : "not-allowed" }}>Save</button>
        <button onClick={() => { setNaFor(null); setNaReason(""); }} style={{ fontSize: 12.5, padding: "6px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.dim, cursor: "pointer" }}>Cancel</button>
      </div>
    );
    return <button onClick={() => { setNaFor(r.key); setNaReason(""); }} style={{ background: "none", border: "none", color: T.faint, fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: "underline" }}>Mark not applicable</button>;
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 140 : 160}px, 1fr))`, gap: T.mobile ? 10 : 14 }}>
        <Card style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
          <div style={{ color: T.dim, fontSize: 12.5 }}>Gap score</div>
          <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: coverageColor(T, overall), marginTop: 4 }}>{overall}%</div>
        </Card>
        {GAP_STATUS.map(st => (
          <Card key={st} onClick={() => setStatus(status === st ? "all" : st)} style={{ padding: T.mobile ? "12px 14px" : "16px 18px", cursor: "pointer", borderColor: status === st ? GS[st].fg : T.border }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{st}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: GS[st].fg, marginTop: 4 }}>{totals(st)}</div>
          </Card>
        ))}
      </div>
      <div style={{ fontSize: 12, color: T.faint, marginTop: 8, lineHeight: 1.5 }}>{GAP_SCORE_METHOD}</div>

      <Card style={{ marginTop: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: T.mobile ? 520 : 0 }}>
            <thead>
              <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 12.5, textAlign: "left" }}>
                {["Framework", "Met", "Partial", "Not met", "N/A", "Gap score"].map(h => <th key={h} style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {gap.map(f => (
                <tr key={f.id} onClick={() => setFw(fw === f.id ? "all" : f.id)} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer", background: fw === f.id ? T.blueSoft : "transparent" }}>
                  <td style={{ padding: "9px 12px", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>{f.short}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13.5, color: GS["Met"].fg }}>{f.met}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13.5, color: GS["Partially met"].fg }}>{f.partial}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13.5, color: GS["Not met"].fg }}>{f.notMet}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13.5, color: T.faint }}>{f.na}</td>
                  <td style={{ padding: "9px 12px", minWidth: 130 }}>
                    {f.score === null ? <span style={{ fontSize: 12.5, color: T.faint }}>Not in scope</span> : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span style={{ width: 70, height: 6, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}`, overflow: "hidden", display: "inline-block" }}>
                          <span style={{ display: "block", width: `${f.score}%`, height: "100%", background: coverageColor(T, f.score) }} />
                        </span>
                        <b style={{ color: coverageColor(T, f.score) }}>{f.score}%</b>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "18px 0 10px" }}>
        <select value={fw} onChange={e => setFw(e.target.value)} aria-label="Filter by framework"
          style={{ ...fieldStyle(T), width: "auto", flex: T.mobile ? "1 1 100%" : "0 1 280px", background: fw === "all" ? T.panel : T.blueSoft, borderColor: fw === "all" ? T.border : T.blue }}>
          <option value="all">All frameworks ({rows.filter(r => inSt(r)).length})</option>
          {gap.map(f => <option key={f.id} value={f.id}>{f.name} ({f.rows.filter(r => inSt(r)).length})</option>)}
        </select>
        <div style={{ ...chipRow(T.mobile), flex: 1 }}>
          {[["all", "Any status"], ...GAP_STATUS.map(s => [s, s])].map(([id, label]) => (
            <FilterChip key={id} active={status === id} onClick={() => setStatus(id)} label={label} count={rows.filter(r => inFw(r) && inSt(r, id)).length} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14, color: T.faint, fontSize: 13 }}>
        <span>Showing {shown.length} of {rows.length} requirements</span>
        {(fw !== "all" || status !== "all") && <button onClick={() => { setFw("all"); setStatus("all"); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>Clear filters</button>}
        <button onClick={exportCsv} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <FileSpreadsheet size={14} /> Export gap assessment (CSV)
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(r => (
          <Card key={r.key} style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "minmax(0,1.3fr) minmax(0,1fr)", gap: T.mobile ? 10 : 18, alignItems: "start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.faint }}>{r.framework.short}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.blue, fontFamily: "ui-monospace, monospace" }}>{r.id}</span>
                <GapPill status={r.status} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginTop: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, marginTop: 4 }}>{r.basis}</div>
              <div style={{ marginTop: 6 }}>{naControl(r)}</div>
            </div>
            <div>{remediation(r)}</div>
          </Card>
        ))}
        {shown.length === 0 && <Card style={{ padding: 28, textAlign: "center", color: T.faint }}>No requirements match these filters.</Card>}
      </div>
    </div>
  );
}

function ReportBody({ scored, register, gap, treatments, policies, today }) {
  const T = useT();
  const tr = s => treatments[s.id] || defaultTreatment(s);
  const rows = gap.flatMap(f => f.rows);
  const count = st => rows.filter(r => r.status === st).length;
  const applicable = rows.length - count("Not applicable");
  const overall = applicable ? Math.round(((count("Met") + count("Partially met") * 0.5) / applicable) * 100) : 0;
  const lvls = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const top = [...register].sort((a, b) => b.residual.score - a.residual.score).slice(0, 8);
  const accepted = register.filter(s => tr(s).treatment === "Accept");
  const notMet = rows.filter(r => r.status === "Not met").slice(0, 12);
  const th = { padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: T.dim, borderBottom: `1.5px solid ${T.text}` };
  const td = { padding: "6px 8px", fontSize: 12, borderBottom: `1px solid ${T.border}`, verticalAlign: "top" };
  const H2 = ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 800, margin: "22px 0 8px", color: T.text, breakAfter: "avoid" }}>{children}</h2>;
  const lvlName = l => l[0] + l.slice(1).toLowerCase();

  return (
    <div style={{ color: T.text, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: `2px solid ${T.text}`, paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: T.blue }}>ARGUS</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 2px" }}>AI Risk and Gap Assessment</h1>
          <div style={{ color: T.dim }}>Point-in-time report · {today}</div>
        </div>
        <PanoptesMark size={40} color={T.text} />
      </div>
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 8 }}>
        Scope: {scored.length} AI agents, {gap.length} frameworks, {register.length} risk scenarios. Demo environment: all agents, events and evidence are synthetic.
      </div>

      <H2>Summary</H2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[["Gap score", `${overall}%`], ["Requirements not met", count("Not met")], ["High or critical residual risks", register.filter(s => s.residual.score >= 10).length], ["Agents rated high or critical", scored.filter(a => a.risk === "HIGH" || a.risk === "CRITICAL").length]].map(([l, v]) => (
          <div key={l} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10.5, color: T.dim }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0" }}>
        Of {applicable} applicable requirements, {count("Met")} are met, {count("Partially met")} partially met and {count("Not met")} not met.
        Residual risk across {register.length} scenarios: {lvls.map(l => `${register.filter(s => riskLevel(s.residual.score) === l).length} ${lvlName(l).toLowerCase()}`).join(", ")}.
        {accepted.length ? ` ${accepted.length} risk${accepted.length > 1 ? "s have" : " has"} been formally accepted.` : " No risks have been formally accepted."}
      </p>

      <H2>Gap status by framework</H2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Framework", "Met", "Partial", "Not met", "N/A", "Gap score"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{gap.map(f => (
          <tr key={f.id}><td style={td}>{f.name}</td><td style={td}>{f.met}</td><td style={td}>{f.partial}</td><td style={td}>{f.notMet}</td><td style={td}>{f.na}</td><td style={{ ...td, fontWeight: 700 }}>{f.score === null ? "Not in scope" : `${f.score}%`}</td></tr>
        ))}</tbody>
      </table>

      <H2>Highest residual risks</H2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["ID", "Scenario", "Worst affected agent", "Inherent", "Residual", "Target", "Treatment"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{top.map(s => (
          <tr key={s.id}>
            <td style={td}>{s.id}</td><td style={td}>{s.title}</td><td style={td}>{s.worstAgent}</td>
            <td style={td}>{s.inherent.score} {lvlName(riskLevel(s.inherent.score))}</td>
            <td style={{ ...td, fontWeight: 700 }}>{s.residual.score} {lvlName(riskLevel(s.residual.score))}</td>
            <td style={td}>{s.target.score}</td><td style={td}>{tr(s).treatment}</td>
          </tr>
        ))}</tbody>
      </table>

      <H2>Agent risk scores</H2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Agent", "Status", "Score", "Level", "Highest residual risks", "Violations"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{[...scored].sort((a, b) => b.score - a.score).map(a => (
          <tr key={a.id}>
            <td style={td}>{a.name}</td><td style={td}>{a.status}</td><td style={{ ...td, fontWeight: 700 }}>{a.score}</td><td style={td}>{lvlName(a.risk)}</td>
            <td style={td}>{a.scoreBreakdown.top.join(", ")}</td><td style={td}>{a.scoreBreakdown.crit} critical, {a.scoreBreakdown.warn} warning</td>
          </tr>
        ))}</tbody>
      </table>

      <H2>Priority remediation</H2>
      {notMet.length === 0 ? <p>No requirements are currently not met.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Requirement", "Gap", "Recommended control", "Owner", "Target date"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{notMet.map(r => {
            const rec = recommendationFor(r.key);
            return (
              <tr key={r.key}>
                <td style={td}><b>{r.framework.short} {r.id}</b><br />{r.title}</td><td style={td}>{r.basis}</td>
                <td style={td}>{rec?.name || (r.policies[0] ? `Enable ${r.policies[0].name}` : "Define a control")}</td>
                <td style={td}>{r.owner || rec?.owner || "Unassigned"}</td><td style={td}>{r.due || "Not set"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      )}

      {accepted.length > 0 && (
        <>
          <H2>Accepted risks</H2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["ID", "Scenario", "Residual", "Accepted by", "Date", "Justification"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{accepted.map(s => {
              const t = tr(s);
              return <tr key={s.id}><td style={td}>{s.id}</td><td style={td}>{s.title}</td><td style={td}>{s.residual.score}</td><td style={td}>{t.acceptance?.by}</td><td style={td}>{t.acceptance?.on}</td><td style={td}>{t.acceptance?.reason}</td></tr>;
            })}</tbody>
          </table>
        </>
      )}

      <H2>Methodology</H2>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>Risk scenarios follow a {RISK_CATEGORIES.length}-category AI risk taxonomy and are mapped to OWASP, MITRE ATLAS, NIST AI RMF and applicable regulations.</li>
        <li>Each scenario is scored likelihood × impact on 5-point scales. Inherent risk is before controls; residual risk credits only controls that are enabled, approved, in scope for the agent and not violated by it; target risk assumes every mapped control is in place. Bands: {RISK_BANDS}.</li>
        <li>Agent risk score: {AGENT_SCORE_METHOD}</li>
        <li>Requirement status: Met needs an always-on platform capability or an approved, enabled policy with evidence on file. An approved policy without evidence, or a draft, is Partially met. {GAP_SCORE_METHOD}</li>
      </ul>
      <div style={{ marginTop: 18, paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 10.5, color: T.faint }}>Generated by ARGUS · {today}</div>
    </div>
  );
}

function AssessmentReport(props) {
  const T = useT();
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const paper = { ...THEMES.light, mobile: T.mobile };
  return (
    <div>
      <style>{`
        .argus-print-portal { display: none; }
        @media print {
          #root { display: none !important; }
          .argus-print-portal { display: block !important; }
          html, body { background: #fff !important; }
          @page { margin: 14mm; }
          tr { break-inside: avoid; }
        }
      `}</style>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: T.dim, flex: "1 1 300px", lineHeight: 1.5 }}>
          A point-in-time summary of the risk register and gap assessment, ready to share with leadership or auditors.
        </div>
        <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8, background: T.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Printer size={15} /> Print or save as PDF
        </button>
      </div>
      <ThemeCtx.Provider value={paper}>
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${T.border}`, padding: T.mobile ? 16 : 36, overflowX: "auto" }}>
          <div style={{ minWidth: T.mobile ? 640 : 0 }}><ReportBody {...props} today={today} /></div>
        </div>
        {createPortal(<div className="argus-print-portal"><ReportBody {...props} today={today} /></div>, document.body)}
      </ThemeCtx.Provider>
    </div>
  );
}

function Assessments({ scored, register, gap, policies, audit, treatments, actions, onSaveTreatment, onGapField, onMarkNA, onOpenAgent, focus, onFocusDone }) {
  const T = useT();
  const [tab, setTab] = useState("risk");
  const [openId, setOpenId] = useState(null);
  useEffect(() => { if (focus) { setTab("risk"); setOpenId(focus); onFocusDone(); } }, [focus]);
  const entry = openId && register.find(s => s.id === openId);
  return (
    <div>
      <PageHeader title="Risk & Gap Assessment" subtitle="AI risk register scored for inherent, residual and target risk, a requirement-by-requirement gap assessment across every framework, and a report you can share." />
      <div style={{ margin: "18px 0" }}>
        <SegTabs value={tab} onChange={setTab} tabs={[["risk", "Risk register", <Grid3x3 size={14} key="i" />], ["gap", "Gap assessment", <ClipboardCheck size={14} key="i" />], ["report", "Report", <FileText size={14} key="i" />]]} />
      </div>
      {tab === "risk" && <RiskRegister register={register} treatments={treatments} onOpen={setOpenId} />}
      {tab === "gap" && <GapAssessment gap={gap} policies={policies} actions={actions} onGapField={onGapField} onMarkNA={onMarkNA} />}
      {tab === "report" && <AssessmentReport scored={scored} register={register} gap={gap} treatments={treatments} policies={policies} />}
      {entry && (
        <RiskScenarioDrawer key={entry.id} entry={entry} treatment={treatments[entry.id] || defaultTreatment(entry)} policies={policies} audit={audit} actions={actions}
          onSave={(id, t) => { onSaveTreatment(id, t); setOpenId(null); }} onClose={() => setOpenId(null)} onOpenAgent={name => { setOpenId(null); onOpenAgent(name); }} />
      )}
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
  const [treatments, setTreatments] = useState({});
  const [gapOverrides, setGapOverrides] = useState({});
  const [riskFocus, setRiskFocus] = useState(null);
  // agent risk scores, the risk register and the gap assessment are all derived from current state
  const scored = useMemo(() => agents.map(a => ({ ...a, ...scoreAgent(a, policies, audit) })), [agents, policies, audit]);
  const register = useMemo(() => buildRegister(scored), [scored]);
  const gap = useMemo(() => gapAssessment(reqMap, policies, scored, gapOverrides), [reqMap, policies, scored, gapOverrides]);
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
    setTreatments({});
    setRiskFocus(null);
    setGapOverrides({});
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

  const updateAgent = (id, patch) => setAgents(as => as.map(a => a.id === id ? { ...a, ...(typeof patch === "function" ? patch(a) : patch) } : a));
  const today = () => new Date().toISOString().slice(0, 10);

  // Agent lifecycle: owner works the requirements and submits; an independent approver decides
  const life = {
    attest: (id, key) => {
      const a = agents.find(x => x.id === id);
      updateAgent(id, x => ({ attest: { ...(x.attest || {}), [key]: { by: x.owner, on: today() } } }));
      log("info", "Owner Attestation", a.name, `${a.owner} confirmed ${a.name}'s ${key === "arch" ? "architecture" : "characteristics"} are accurate`);
    },
    rootCause: (id, vid, v) => {
      const a = agents.find(x => x.id === id);
      updateAgent(id, x => ({ resolutions: { ...(x.resolutions || {}), [vid]: { ...v, by: x.owner, on: today() } } }));
      log("info", "Root Cause Recorded", a.name, `Root cause recorded for ${a.name} violation ${vid}: ${v.cause}. Fix: ${v.fix}`);
    },
    retest: (id, pid, evidence) => {
      const a = agents.find(x => x.id === id);
      const p = policies.find(x => x.id === pid);
      updateAgent(id, x => ({ retests: { ...(x.retests || {}), [pid]: { evidence, by: x.owner, on: today() } } }));
      log("info", "Control Re-tested", a.name, `"${p?.name}" re-tested against ${a.name}: ${evidence}`);
      notify(`${p?.name} re-tested`);
    },
    autonomy: (id, level) => {
      const a = agents.find(x => x.id === id);
      updateAgent(id, { autonomy: level });
      log("info", "Autonomy Change", a.name, `${a.name} autonomy reduced from ${a.autonomy.toLowerCase()} to ${level.toLowerCase()}`);
      notify(`${a.name} is now ${level.toLowerCase()}`);
    },
    submit: (id, kind) => {
      const a = scored.find(x => x.id === id);
      const r = requirements(a, kind, { audit, treatments });
      updateAgent(id, { review: { kind, by: a.owner, on: today() } });
      log("info", kind === "activation" ? "Submitted for Activation" : "Submitted for Reinstatement", a.name,
        `${a.owner} submitted ${a.name} for ${kind} with ${r.met} of ${r.total} requirements met`);
      notify("Submitted for approval");
    },
    withdraw: id => {
      const a = agents.find(x => x.id === id);
      updateAgent(id, { review: null });
      log("info", "Submission Withdrawn", a.name, `${a.owner} withdrew ${a.name}'s submission`);
    },
    decide: (id, dec) => {
      const a = scored.find(x => x.id === id);
      const kind = a.status === "pending" ? "activation" : "reinstatement";
      if (dec.decision === "reject") {
        updateAgent(id, { review: null, lastDecision: { decision: "reject", by: dec.by, reason: dec.reason, on: today() } });
        log("warn", kind === "activation" ? "Activation Returned" : "Reinstatement Returned", a.name, `${dec.by} returned ${a.name} to its owner: ${dec.reason}`);
        notify("Returned to owner");
        return;
      }
      if (kind === "activation") {
        const r = requirements(a, "activation", { audit, treatments });
        const conditional = dec.decision === "conditional";
        updateAgent(id, {
          status: "active", review: null, lastDecision: { decision: dec.decision, by: dec.by, on: today() },
          conditions: conditional ? { items: r.open.map(i => i.id), due: dec.due, by: dec.by, on: today() } : null,
        });
        log("info", conditional ? "Agent Conditionally Activated" : "Agent Activated", a.name, conditional
          ? `${dec.by} activated ${a.name} with conditions. Open items due ${dec.due}: ${r.open.map(i => i.label.replace(/ \(.*\)$/, "").toLowerCase()).join("; ")}`
          : `${dec.by} activated ${a.name} with all requirements met`);
        notify(`${a.name} activated${conditional ? " with conditions" : ""}`);
      } else {
        updateAgent(id, {
          status: "active", review: null, lastDecision: { decision: "approve", by: dec.by, on: today() },
          pastSuspension: a.suspension, suspension: null,
          probation: { until: addDays(PROBATION_DAYS), by: dec.by, on: today() },
        });
        log("info", "Agent Reinstated", a.name, `${dec.by} reinstated ${a.name} with all remediation complete. On probation until ${addDays(PROBATION_DAYS)}`);
        notify(`${a.name} reinstated on ${PROBATION_DAYS}-day probation`);
      }
    },
    openRisk: sid => { setDetailId(null); setView("assessments"); setNavOpen(false); setRiskFocus(sid); },
  };

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

  const actions = { createPolicy: openCreatePolicy, approve: setApproving, togglePolicy };

  const saveTreatment = (sid, t) => {
    const sc = register.find(x => x.id === sid);
    setTreatments(m => ({ ...m, [sid]: t }));
    if (t.treatment === "Accept") {
      log("warn", "Risk Accepted", "—", `${sid} ${sc?.title}: residual risk ${sc?.residual.score} accepted by ${t.acceptance.by} (owner: ${t.owner}, review ${t.reviewOn}). Justification: ${t.acceptance.reason}`);
    } else {
      log("info", "Risk Treatment", "—", `${sid} ${sc?.title}: treatment set to ${t.treatment} (owner: ${t.owner}, review ${t.reviewOn})${t.note ? `. ${t.note}` : ""}`);
    }
    notify(t.treatment === "Accept" ? `${sid} accepted` : `${sid} treatment saved`);
  };

  const setGapField = (key, field, value) => {
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), [field]: value } }));
    if (field === "owner" && value) {
      const [fwId, i] = key.split("|");
      const fw = FRAMEWORKS.find(f => f.id === fwId);
      log("info", "Remediation Assigned", "—", `${fw.short} ${fw.requirements[Number(i)].id} remediation assigned to ${value}`);
    }
  };

  const markNA = (key, reason) => {
    const [fwId, i] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const label = `${fw.short} ${fw.requirements[Number(i)].id}`;
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), na: reason ? { reason, on: new Date().toISOString().slice(0, 10) } : null } }));
    log(reason ? "warn" : "info", "Scope Change", "—", reason ? `${label} marked not applicable: ${reason}` : `${label} marked applicable again`);
    notify(reason ? `${label} marked not applicable` : `${label} back in scope`);
  };

  const go = id => { setView(id); setNavOpen(false); };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <Activity size={17} /> },
    { id: "registry", label: "Agent Registry", icon: <Users size={17} /> },
    { id: "policy", label: "Policy Engine", icon: <FileText size={17} /> },
    { id: "frameworks", label: "Frameworks", icon: <Layers size={17} /> },
    { id: "assessments", label: "Risk & Gaps", icon: <ClipboardCheck size={17} /> },
    { id: "audit", label: "Audit Trail", icon: <ScanSearch size={17} /> },
    { id: "heatmap", label: "Risk Radar", icon: <AlertTriangle size={17} /> },
  ];

  const globalHits = globalQ.trim()
    ? scored.filter(a => a.name.toLowerCase().includes(globalQ.toLowerCase()))
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
            {view === "dashboard" && <Dashboard agents={scored} coverage={coverage} openAgent={openAgent} onOpenFrameworks={() => go("frameworks")} />}
            {view === "registry" && <Registry agents={scored} policies={policies} audit={audit} treatments={treatments} openAgent={openAgent} onOpenRegister={() => setModal("register")} />}
            {view === "policy" && <PolicyEngine policies={policies} reqMap={reqMap} toggle={togglePolicy} onOpenCreate={() => openCreatePolicy()} onApprove={setApproving} />}
            {view === "frameworks" && <Frameworks coverage={coverage} gapKeys={gapKeys} policies={policies} onOpen={setFwOpen} onAdopt={adoptRecommendation} />}
            {view === "audit" && <AuditTrail audit={audit} />}
            {view === "heatmap" && <Heatmap agents={scored} openAgent={openAgent} />}
            {view === "assessments" && <Assessments scored={scored} register={register} gap={gap} policies={policies} audit={audit} treatments={treatments}
              actions={actions} onSaveTreatment={saveTreatment} onGapField={setGapField} onMarkNA={markNA} onOpenAgent={openAgent}
              focus={riskFocus} onFocusDone={() => setRiskFocus(null)} />}
          </main>
        </div>

        {modal === "register" && <RegisterAgentModal onClose={() => setModal(null)} onRegister={registerAgent} policies={policies} />}
        {modal === "policy" && <CreatePolicyModal onClose={() => { setModal(null); setPolicyTemplate(null); }} onCreate={createPolicy}
          initialTemplate={policyTemplate} policies={policies} />}
        {approving && policies.find(p => p.id === approving) && (
          <ApprovePolicyModal policy={policies.find(p => p.id === approving)} onClose={() => setApproving(null)} onApprove={approvePolicy} />
        )}
        <AgentDrawer key={detailId ?? "none"} agent={scored.find(a => a.id === detailId)} audit={audit} policies={policies} actions={actions}
          treatments={treatments} life={life}
          onClose={() => setDetailId(null)} onUpdateTraits={updateTraits} onExclude={excludeMapping} onInclude={includeMapping} />
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
