import React, { useState, useMemo, useContext, createContext } from "react";
import {
  Shield, Search, Bell, Activity, Users, FileText, AlertTriangle,
  ScanSearch, Cpu, HeartPulse, ShieldAlert, CheckCircle2, Download,
  X, Filter, Plus, Info, AlertOctagon, AlertCircle, Sun, Moon,
  RotateCcw, MessageCircle, ExternalLink
} from "lucide-react";
import * as d3 from "d3";

/* ---------------- seed data ---------------- */

const SEED_AGENTS = [
  { id: 1, name: "Aria CX Bot", model: "gpt-4o", dept: "Customer Success", status: "active", risk: "LOW", score: 18, autonomy: "Supervised", owner: "CX Ops" },
  { id: 2, name: "DataSync Pro", model: "claude-3-5-sonnet", dept: "Engineering", status: "active", risk: "MEDIUM", score: 42, autonomy: "Semi-autonomous", owner: "Platform Eng" },
  { id: 3, name: "ThreatWatch AI", model: "gpt-4o", dept: "Security", status: "active", risk: "HIGH", score: 67, autonomy: "Semi-autonomous", owner: "SecOps" },
  { id: 4, name: "HireFlow Agent", model: "claude-3-haiku", dept: "HR", status: "active", risk: "LOW", score: 12, autonomy: "Supervised", owner: "People Ops" },
  { id: 5, name: "FinanceBot Alpha", model: "gpt-4o", dept: "Finance", status: "suspended", risk: "CRITICAL", score: 89, autonomy: "Full autonomy", owner: "FP&A" },
  { id: 6, name: "MarketSentinel", model: "claude-3-5-sonnet", dept: "Marketing", status: "active", risk: "MEDIUM", score: 35, autonomy: "Supervised", owner: "Growth" },
  { id: 7, name: "CodeReview AI", model: "gpt-4o", dept: "Engineering", status: "active", risk: "LOW", score: 22, autonomy: "Supervised", owner: "Dev Experience" },
  { id: 8, name: "LegalScan Bot", model: "claude-3-5-sonnet", dept: "Legal", status: "pending", risk: "MEDIUM", score: 38, autonomy: "Supervised", owner: "Legal Ops" },
];

const FRAMEWORKS = ["EU AI Act", "NIST AI RMF", "ISO 42001", "ISO 27001", "SOC 2", "GDPR", "HIPAA"];

// TODO: replace with your real form link (Tally / Google Form) before deploying
const FEEDBACK_URL = "https://tally.so/r/YOUR-FORM-ID";

const SEED_POLICIES = [
  { id: "p1", tag: "Data Privacy", name: "Block PII Export to External APIs", desc: "Prevents any AI agent from sending personally identifiable information to external third-party APIs without explicit authorization.", action: "BLOCK", violations: 7, enabled: true, frameworks: ["GDPR", "SOC 2"] },
  { id: "p2", tag: "External Communication", name: "Require Approval for Outbound Emails", desc: "All agent-initiated outbound emails to external domains must receive human approval before sending.", action: "REQUIRE APPROVAL", violations: 3, enabled: true, frameworks: ["EU AI Act", "ISO 42001"] },
  { id: "p3", tag: "HIPAA", name: "Restrict HIPAA Record Access", desc: "Agents without explicit HIPAA clearance are blocked from accessing health-related records.", action: "BLOCK", violations: 12, enabled: true, frameworks: ["HIPAA"] },
  { id: "p4", tag: "GDPR", name: "Audit Financial Data Reads", desc: "Log all agent access to financial systems for SOX compliance.", action: "AUDIT", violations: 0, enabled: true, frameworks: ["SOC 2", "ISO 27001"] },
  { id: "p5", tag: "Access Control", name: "Limit Full-Autonomy Agent Actions", desc: "Agents with full autonomy level require supervisor approval for any write operations.", action: "REQUIRE APPROVAL", violations: 4, enabled: true, frameworks: ["EU AI Act", "NIST AI RMF", "ISO 42001"] },
  { id: "p6", tag: "Access Control", name: "Block Admin Privilege Escalation", desc: "Prevents agents from acquiring admin permissions they were not originally granted.", action: "BLOCK", violations: 2, enabled: true, frameworks: ["ISO 27001", "SOC 2"] },
  { id: "p7", tag: "GDPR", name: "GDPR Data Deletion Compliance", desc: "Ensures agents processing EU customer data respect deletion requests within 72 hours.", action: "AUDIT", violations: 0, enabled: false, frameworks: ["GDPR"] },
  { id: "p8", tag: "Custom", name: "Rate Limit External API Calls", desc: "Warns when an agent makes more than 1000 external API calls per hour.", action: "WARN", violations: 5, enabled: true, frameworks: ["SOC 2"] },
];

const SEED_AUDIT = [
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

function RegisterAgentModal({ onClose, onRegister }) {
  const T = useT();
  const [f, setF] = useState({ name: "", model: "claude-3-5-sonnet", dept: "Engineering", autonomy: "Supervised", owner: "" });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.name.trim() && f.owner.trim();
  return (
    <Modal title="Register Agent" subtitle="New agents enter the registry as pending until security review completes." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle(T)}>Agent name</label>
          <input style={fieldStyle(T)} value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. ContractDraft AI" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Model</label>
            <select style={fieldStyle(T)} value={f.model} onChange={e => set("model", e.target.value)}>
              {["claude-3-5-sonnet", "claude-3-haiku", "gpt-4o", "gpt-4o-mini", "gemini-1.5-pro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Department</label>
            <select style={fieldStyle(T)} value={f.dept} onChange={e => set("dept", e.target.value)}>
              {["Engineering", "Finance", "Legal", "HR", "Marketing", "Security", "Customer Success", "Operations"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Autonomy level</label>
            <select style={fieldStyle(T)} value={f.autonomy} onChange={e => set("autonomy", e.target.value)}>
              {["Supervised", "Semi-autonomous", "Full autonomy"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Owner (team)</label>
            <input style={fieldStyle(T)} value={f.owner} onChange={e => set("owner", e.target.value)} placeholder="e.g. Legal Ops" />
          </div>
        </div>
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

function CreatePolicyModal({ onClose, onCreate }) {
  const T = useT();
  const [f, setF] = useState({ name: "", tag: "Access Control", desc: "", action: "BLOCK", frameworks: [] });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggleFw = fw => setF(s => ({
    ...s, frameworks: s.frameworks.includes(fw) ? s.frameworks.filter(x => x !== fw) : [...s.frameworks, fw],
  }));
  const valid = f.name.trim() && f.desc.trim();
  return (
    <Modal title="Create Policy" subtitle="New policies are enabled immediately and count toward the compliance score." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle(T)}>Policy name</label>
          <input style={fieldStyle(T)} value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Require Model Card Before Activation" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle(T)}>Category</label>
            <select style={fieldStyle(T)} value={f.tag} onChange={e => set("tag", e.target.value)}>
              {["Access Control", "Data Privacy", "External Communication", "GDPR", "HIPAA", "Model Governance", "Custom"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(T)}>Enforcement action</label>
            <select style={fieldStyle(T)} value={f.action} onChange={e => set("action", e.target.value)}>
              {["BLOCK", "REQUIRE APPROVAL", "WARN", "AUDIT"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle(T)}>Description</label>
          <textarea rows={3} style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} value={f.desc}
            onChange={e => set("desc", e.target.value)} placeholder="What behavior does this policy govern, and when does it trigger?" />
        </div>
        <div>
          <label style={labelStyle(T)}>Framework mapping</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FRAMEWORKS.map(fw => {
              const on = f.frameworks.includes(fw);
              return (
                <button key={fw} onClick={() => toggleFw(fw)} style={{
                  fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                  background: on ? T.blueSoft : T.panelSoft,
                  border: `1px solid ${on ? T.blue : T.border}`,
                  color: on ? T.blue : T.dim, transition: "all .12s",
                }}>{fw}</button>
              );
            })}
          </div>
          <div style={{ color: T.faint, fontSize: 12, marginTop: 8 }}>
            Tag which compliance frameworks this control supports. Mapped policies roll up into framework coverage.
          </div>
        </div>
        <button disabled={!valid} onClick={() => onCreate(f)} style={{
          background: valid ? T.blue : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 9, padding: "12px 16px", fontSize: 15, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed", marginTop: 4,
        }}>
          Create policy
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- views ---------------- */

function Dashboard({ agents, policies, openAgent }) {
  const T = useT();
  const active = agents.filter(a => a.status === "active").length;
  const suspended = agents.filter(a => a.status === "suspended").length;
  const activePolicies = policies.filter(p => p.enabled).length;
  const compliance = Math.min(100, Math.round((activePolicies / policies.length) * 86));
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
    { label: "Compliance Score", value: `${compliance}%`, sub: `Based on ${activePolicies} active policies`, icon: <HeartPulse size={18} color={green} />, color: green },
    { label: "Critical Risk", value: critical, sub: "Agents requiring immediate review", icon: <ShieldAlert size={18} color={red} />, color: red },
    { label: "Policy Violations", value: 0, sub: "Violations in the last 24 hours", icon: <CheckCircle2 size={18} color={amber} />, color: amber },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ color: T.dim, fontSize: 14 }}>{k.label}</span>{k.icon}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: k.color, marginBottom: 6 }}>{k.value}</div>
            <div style={{ color: T.faint, fontSize: 13 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 20 }}>
        <Card style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Risk Field</div>
              <div style={{ color: T.dim, fontSize: 13 }}>Bubble size scales with risk score — the biggest risks take up the most room. Click to inspect.</div>
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

        <Card style={{ padding: 22, display: "flex", flexDirection: "column" }}>
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
    </div>
  );
}

function Registry({ agents, openAgent, onOpenRegister }) {
  const T = useT();
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    agents.filter(a =>
      [a.name, a.model, a.dept, a.risk, a.status].join(" ").toLowerCase().includes(q.toLowerCase())
    ), [agents, q]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Agent Registry</h1>
          <div style={{ color: T.dim, marginTop: 6, fontSize: 14 }}>Directory of all deployed AI agents across the enterprise.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "9px 16px", fontSize: 14, cursor: "pointer" }}>
            <Filter size={15} /> Filters
          </button>
          <button onClick={onOpenRegister} style={{ display: "flex", alignItems: "center", gap: 8, background: T.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Register Agent
          </button>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 560, margin: "18px 0" }}>
        <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents..."
          style={{ ...fieldStyle(T), background: T.panel, borderRadius: 10, padding: "11px 14px 11px 40px" }} />
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 13, textAlign: "left" }}>
                {["Agent Name", "Department", "Status", "Risk Level", ""].map((h, i) => (
                  <th key={i} style={{ padding: "13px 18px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const r = T.risk[a.risk], s = T.status[a.status];
                return (
                  <tr key={a.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</div>
                      <div style={{ color: T.faint, fontSize: 12.5, marginTop: 2 }}>{a.model}</div>
                    </td>
                    <td style={{ padding: "14px 18px", fontSize: 14 }}>{a.dept}</td>
                    <td style={{ padding: "14px 18px" }}><Pill fg={s.fg} bg={s.bg} border={s.border}>{a.status}</Pill></td>
                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {a.risk === "CRITICAL" && <ShieldAlert size={14} color={r.fg} />}
                        <Pill fg={r.fg} bg={r.bg} border={r.border}>{a.risk}</Pill>
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <button onClick={() => openAgent(a.name)} style={{ background: "none", border: "none", color: T.blue, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>View Details</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 28, textAlign: "center", color: T.faint }}>No agents match "{q}". Clear the search to see all agents.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PolicyEngine({ policies, toggle, onOpenCreate }) {
  const T = useT();
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Policy Engine</h1>
          <div style={{ color: T.dim, marginTop: 6, fontSize: 14 }}>Define and manage governance rules for AI agent behavior.</div>
        </div>
        <button onClick={onOpenCreate} style={{ display: "flex", alignItems: "center", gap: 8, background: T.blue, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Create Policy
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginTop: 20 }}>
        {policies.map(p => {
          const a = T.action[p.action];
          return (
            <Card key={p.id} style={{ display: "flex", flexDirection: "column", opacity: p.enabled ? 1 : 0.6, transition: "opacity .15s" }}>
              <div style={{ padding: "18px 18px 14px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Pill fg={T.dim} bg={T.panelSoft} border={T.border}>{p.tag}</Pill>
                  <Toggle on={p.enabled} onChange={() => toggle(p.id)} />
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ color: T.dim, fontSize: 13.5, lineHeight: 1.5 }}>{p.desc}</div>
                {p.frameworks?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {p.frameworks.map(fw => (
                      <Pill key={fw} small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>{fw}</Pill>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Audit Trail</h1>
          <div style={{ color: T.dim, marginTop: 6, fontSize: 14 }}>Immutable ledger of all platform events and governance actions.</div>
        </div>
        <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "9px 16px", fontSize: 14, cursor: "pointer" }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

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
    </div>
  );
}

function RiskBubbles({ agents, openAgent }) {
  const T = useT();
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
    const maxY = Math.max(...leaves.map(n => n.y + n.r)) + pad + 8; // extra for labels under small bubbles
    return { nodes: leaves, vb: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
  }, [agents]);

  return (
    <div>
      <style>{`.argus-bubble { transition: filter .15s; } .argus-bubble:hover { filter: brightness(1.18); }`}</style>
      <svg viewBox={vb} style={{ width: "100%", height: "auto", maxHeight: 460, display: "block", margin: "8px auto 0" }}>
        {nodes.map(n => {
          const a = n.data;
          const c = T.bar[tier(a.score)];
          const big = n.r >= 40, mid = n.r >= 26;
          return (
            <g key={a.id} className="argus-bubble" onClick={() => openAgent(a.name)} style={{ cursor: "pointer" }}>
              <circle cx={n.x} cy={n.y} r={n.r} fill={c} opacity={T.isDark ? 0.16 : 0.12} />
              <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={c} strokeWidth={2} opacity={0.85} />
              {a.score >= 80 && (
                <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={c} strokeWidth={1.6}>
                  <animate attributeName="r" values={`${n.r};${n.r + 16}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {big ? (
                <>
                  <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={T.text}>{a.name}</text>
                  <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize={24} fontWeight={800} fill={c}>{a.score}</text>
                  <text x={n.x} y={n.y + 38} textAnchor="middle" fontSize={9.5} letterSpacing="1.2" fontWeight={700}
                    fill={c} opacity={0.8}>{tier(a.score)}</text>
                </>
              ) : mid ? (
                <>
                  <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill={c}>{a.score}</text>
                  <text x={n.x} y={n.y + n.r + 15} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={T.text}>{a.name}</text>
                </>
              ) : (
                <>
                  <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill={c}>{a.score}</text>
                  <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill={T.text}>{a.name}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RiskRadar({ agents, openAgent }) {
  const T = useT();
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
      <svg viewBox={`0 0 ${S} 660`} style={{ width: "100%", maxWidth: 760, height: "auto", display: "block", margin: "0 auto" }}>
        {/* rings: score 25 / 55 / 80 / 100 */}
        {[25, 55, 80, 100].map(v => {
          const rr = 36 + (v / 100) * (R - 36);
          const crit = v === 80;
          return (
            <g key={v}>
              <circle cx={CX} cy={CY} r={rr} fill="none"
                stroke={crit ? (T.isDark ? "#f43f5e" : "#e11d48") : T.grid}
                strokeWidth={crit ? 1.4 : 1} strokeDasharray={crit ? "5 5" : "none"} opacity={crit ? 0.55 : 1} />
              <text x={CX + 6} y={CY - rr - 5} fontSize={10} fill={crit ? (T.isDark ? "#f43f5e" : "#e11d48") : T.faint}>
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
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize={8} fontWeight={700} letterSpacing="1.6" fill={T.blue}>CONTROL</text>

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
              <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10.5} fontWeight={600}
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
              <text x={a.x} y={a.y - 14} textAnchor="middle" fontSize={11} fontWeight={600} fill={T.text}>{a.name}</text>
              <text x={a.x} y={a.y + 22} textAnchor="middle" fontSize={10} fill={T.faint}>{a.score}</text>
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
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Risk Radar</h1>
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
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16, marginTop: 22 }}>
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

function AgentDrawer({ agent, audit, onClose }) {
  const T = useT();
  if (!agent) return null;
  const r = T.risk[agent.risk], s = T.status[agent.status];
  const events = audit.filter(e => e.agent === agent.name);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 50,
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(440px, 100%)", height: "100%", background: T.panel,
        borderLeft: `1px solid ${T.border}`, padding: 26, overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>{agent.name}</div>
          <button onClick={onClose} aria-label="Close details" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ color: T.faint, fontSize: 13.5, marginBottom: 18 }}>{agent.model}</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          <Pill fg={s.fg} bg={s.bg} border={s.border}>{agent.status}</Pill>
          <Pill fg={r.fg} bg={r.bg} border={r.border}>{agent.risk}</Pill>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[["Department", agent.dept], ["Owner", agent.owner], ["Autonomy", agent.autonomy], ["Risk Score", agent.score]].map(([k, v]) => (
            <div key={k} style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ color: T.faint, fontSize: 12, marginBottom: 4 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{v}</div>
            </div>
          ))}
        </div>

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
  const T = THEMES[mode];
  const [view, setView] = useState("dashboard");
  const [agents, setAgents] = useState(SEED_AGENTS);
  const [policies, setPolicies] = useState(SEED_POLICIES);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(null);
  const [globalQ, setGlobalQ] = useState("");
  const [toast, setToast] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const resetDemo = () => {
    setAgents(SEED_AGENTS);
    setPolicies(SEED_POLICIES);
    setAudit(SEED_AUDIT);
    setDetail(null);
    notify("Demo data reset to its original state");
  };

  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const togglePolicy = id =>
    setPolicies(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  const openAgent = name => {
    const a = agents.find(x => x.name === name);
    if (a) setDetail(a);
  };

  const nowTs = () => new Date().toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const registerAgent = f => {
    const fullAuto = f.autonomy === "Full autonomy";
    const newAgent = {
      id: Date.now(), name: f.name.trim(), model: f.model, dept: f.dept,
      status: "pending", risk: fullAuto ? "MEDIUM" : "LOW",
      score: fullAuto ? 40 : 15, autonomy: f.autonomy, owner: f.owner.trim(),
    };
    setAgents(a => [...a, newAgent]);
    setAudit(ev => [{
      sev: "info", ts: nowTs(), type: "Agent Registered", agent: newAgent.name,
      desc: `${newAgent.name} registered and pending security review before activation`,
    }, ...ev]);
    setModal(null);
    notify(`${newAgent.name} registered — pending security review`);
  };

  const createPolicy = f => {
    const newPolicy = {
      id: `p${Date.now()}`, tag: f.tag, name: f.name.trim(), desc: f.desc.trim(),
      action: f.action, violations: 0, enabled: true, frameworks: f.frameworks,
    };
    setPolicies(ps => [...ps, newPolicy]);
    setAudit(ev => [{
      sev: "info", ts: nowTs(), type: "Policy Created", agent: "—",
      desc: `Policy "${newPolicy.name}" created with enforcement action ${newPolicy.action}`,
    }, ...ev]);
    setModal(null);
    notify(`Policy created: ${newPolicy.name}`);
  };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <Activity size={17} /> },
    { id: "registry", label: "Agent Registry", icon: <Users size={17} /> },
    { id: "policy", label: "Policy Engine", icon: <FileText size={17} /> },
    { id: "audit", label: "Audit Trail", icon: <ScanSearch size={17} /> },
    { id: "heatmap", label: "Risk Radar", icon: <AlertTriangle size={17} /> },
  ];

  const globalHits = globalQ.trim()
    ? agents.filter(a => a.name.toLowerCase().includes(globalQ.toLowerCase()))
    : [];

  return (
    <ThemeCtx.Provider value={T}>
      <div style={{
        display: "flex", minHeight: "100vh", background: T.bg, color: T.text,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        transition: "background .2s, color .2s",
      }}>
        <aside style={{
          width: 240, flexShrink: 0, background: T.sidebar, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", padding: "22px 14px", transition: "background .2s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px", marginBottom: 34 }}>
            <PanoptesMark size={30} color={T.text} />
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: ".14em", color: T.text }}>ARGUS</span>
          </div>
          <div style={{ color: T.faint, fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", padding: "0 8px", marginBottom: 10 }}>OPERATIONS</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)} style={{
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

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 28px",
            background: T.blueSoft, borderBottom: `1px solid ${T.blueBorder}`,
            fontSize: 13, color: T.isDark ? "#9ec8f2" : "#1d5c9e",
          }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              Demo environment — all agents, violations, and events are synthetic. Explore freely: register agents, toggle policies, click anything.
            </span>
            <button onClick={resetDemo} style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: `1px solid ${T.blueBorder}`, color: "inherit", borderRadius: 7,
              padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <RotateCcw size={13} /> Reset demo
            </button>
          </div>
          <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 28px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 620 }}>
              <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
              <input value={globalQ} onChange={e => setGlobalQ(e.target.value)}
                placeholder="Global search agents, logs, policies..."
                style={{ ...fieldStyle(T), background: T.panel, borderRadius: 10, padding: "11px 14px 11px 40px" }} />
              {globalHits.length > 0 && (
                <div style={{ position: "absolute", top: 46, left: 0, right: 0, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, zIndex: 40, overflow: "hidden", boxShadow: T.shadow }}>
                  {globalHits.map(a => (
                    <button key={a.id} onClick={() => { setDetail(a); setGlobalQ(""); }} style={{
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
                marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center",
                width: 38, height: 38, borderRadius: 10, cursor: "pointer",
                background: T.panel, border: `1px solid ${T.border}`, color: T.dim, transition: "all .15s",
              }}>
              {T.isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div style={{ position: "relative" }}>
              <Bell size={19} color={T.dim} />
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: T.isDark ? "#f43f5e" : "#e11d48" }} />
            </div>
          </header>

          <main style={{ padding: 28, overflowY: "auto" }}>
            {view === "dashboard" && <Dashboard agents={agents} policies={policies} openAgent={openAgent} />}
            {view === "registry" && <Registry agents={agents} openAgent={openAgent} onOpenRegister={() => setModal("register")} />}
            {view === "policy" && <PolicyEngine policies={policies} toggle={togglePolicy} onOpenCreate={() => setModal("policy")} />}
            {view === "audit" && <AuditTrail audit={audit} />}
            {view === "heatmap" && <Heatmap agents={agents} openAgent={openAgent} />}
          </main>
        </div>

        {modal === "register" && <RegisterAgentModal onClose={() => setModal(null)} onRegister={registerAgent} />}
        {modal === "policy" && <CreatePolicyModal onClose={() => setModal(null)} onCreate={createPolicy} />}
        <AgentDrawer agent={detail} audit={audit} onClose={() => setDetail(null)} />

        <button onClick={() => setFeedbackOpen(true)} style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 45,
          display: "flex", alignItems: "center", gap: 8,
          background: T.blue, color: "#fff", border: "none", borderRadius: 999,
          padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: T.shadow,
        }}>
          <MessageCircle size={16} /> Feedback
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
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: T.panelSoft, border: `1px solid ${T.blueBorder}`, color: T.text,
            borderRadius: 10, padding: "12px 20px", fontSize: 14, zIndex: 70,
            display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadow,
          }}>
            <CheckCircle2 size={16} color={T.isDark ? "#34d399" : "#059669"} /> {toast}
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
