import React, { useState, useMemo, useEffect, useContext, createContext, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Shield, Search, Bell, Activity, Users, FileText, AlertTriangle,
  ScanSearch, Cpu, HeartPulse, ShieldAlert, CheckCircle2, Download,
  X, Filter, Plus, Info, AlertOctagon, AlertCircle, Sun, Moon,
  RotateCcw, MessageCircle, ExternalLink, Menu, Layers, Link2, ChevronRight, Lightbulb, Upload, BadgeCheck, Clock,
  ClipboardCheck, Printer, Network, ListOrdered, Boxes, ArrowRight, UserCheck, FileSpreadsheet, Grid3x3, Inbox
} from "lucide-react";
import * as d3 from "d3";
import {
  FRAMEWORKS, FRAMEWORK_GROUPS, CAPABILITIES, SEED_REQ_MAP, RECOMMENDED_POLICIES,
  computeCoverage, frameworksForPolicy, recommendationFor, reqLabel, POLICY_ROLES, BLANK_TEMPLATE,
} from "./frameworks.js";
import { TRAITS, mapAgent } from "./agentMapping.js";
import {
  RISK_CATEGORIES, LIKELIHOOD, IMPACT, RISK_BANDS, GAP_STATUS, AGENT_SCORE_METHOD,
  riskLevel, scoreAgent, buildRegister, isResolved,
} from "./riskLibrary.js";
import { LANES, COMPONENT_TYPES, AGBOM_SECTION, buildArchitecture, toAgBOM } from "./architecture.js";
import { lifecycle, requirements, nextStep, CONDITION_MAX_DAYS, PROBATION_DAYS } from "./lifecycle.js";
import { seedAt, seedDate, localISO, addDaysISO, fmtWhen, fmtWhenLong, fmtDate, age, daysUntil } from "./timeline.js";
import { DEFAULT_GATES, GATE_RISK_OPTIONS, GATE_SCORE_OPTIONS, EXCEPTION_MAX_DAYS, STATE_LABEL, operatingState, worstScenario, isTreated } from "./gates.js";
import { buildAssessment, COVERAGE_METHOD, FULFILLMENT_METHOD, EXCLUSION_METHOD, SCOPE_DISCLAIMER } from "./assessment.js";
import { decisionQueue, DECISION_KINDS } from "./decisions.js";
import { effectiveness, attributes, latestTest, newTest, EFFECT } from "./controls.js";
import { DEMO_USERS, DEFAULT_USER, can, ownsAgent, ownerOf } from "./identity.js";
import { checkCommand } from "./commands.js";
import { seal, verifyChain, redact, toCSV, SYSTEM } from "./audit.js";

import { SEED_AGENTS, SEED_POLICIES, SEED_AUDIT } from "./seedData.js";

const FEEDBACK_URL = "https://tally.so/r/YOUR-FORM-ID";

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

const Card = ({ children, style, onClick, id }) => {
  const T = useT();
  return (
    <div id={id} onClick={onClick} style={{
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
const todayISO = () => localISO();
const fmtSize = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

// Read an uploaded file into an in-memory link with a SHA-256 fingerprint. Nothing leaves the browser.
const DOC_TYPES = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const sha256 = async file => {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
};

function DocUpload({ doc, onChange }) {
  const T = useT();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const ingest = async file => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!DOC_TYPES[ext]) { setErr("Upload a PDF or Word document (.pdf, .doc, .docx)."); return; }
    if (file.type && !Object.values(DOC_TYPES).includes(file.type)) { setErr(`The file says it is ${file.type}, which doesn't match its .${ext} name.`); return; }
    if (file.size === 0) { setErr("That file is empty."); return; }
    if (file.size > MAX_DOC_MB * 1048576) { setErr(`Files must be ${MAX_DOC_MB} MB or smaller.`); return; }
    setErr(""); setBusy(true); setLast(file);
    try {
      const hash = await sha256(file);
      onChange({ name: file.name, size: file.size, type: file.type || DOC_TYPES[ext], sha256: hash, url: URL.createObjectURL(file), uploadedOn: todayISO() });
      setLast(null);
    } catch (x) {
      setErr("Couldn't read the file. Check it isn't open elsewhere, then retry.");
    } finally { setBusy(false); }
  };
  const pick = e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) ingest(file);
  };
  return (
    <div>
      {doc ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px" }}>
          <FileText size={16} color={T.blue} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
            <div style={{ fontSize: 12, color: T.faint }}>{doc.size ? fmtSize(doc.size) : "Seeded placeholder"}{doc.sha256 ? <> · SHA-256 <span style={{ fontFamily: "ui-monospace, monospace" }} title={doc.sha256}>{doc.sha256.slice(0, 12)}…</span></> : ""}</div>
          </div>
          <button onClick={() => onChange(null)} aria-label="Remove document" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={16} /></button>
        </div>
      ) : (
        <label style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
          border: `1px dashed ${T.blueBorder}`, borderRadius: 8, padding: "12px", color: T.blue, fontSize: 13.5, fontWeight: 600,
          background: T.blueSoft,
        }}>
          <Upload size={15} /> {busy ? "Checking and fingerprinting…" : "Upload approved policy (PDF or Word)"}
          <input type="file" aria-label="Upload approved policy document" accept=".pdf,.doc,.docx" disabled={busy} onChange={pick} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
        </label>
      )}
      {busy && <div role="status" style={{ color: T.dim, fontSize: 12.5, marginTop: 6 }}>Reading the file and computing its SHA-256 fingerprint…</div>}
      {err && (
        <div role="alert" style={{ color: T.isDark ? "#f43f5e" : "#e11d48", fontSize: 12.5, marginTop: 6 }}>
          {err} {last && <button onClick={() => ingest(last)} style={{ background: "none", border: "none", color: T.blue, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12.5 }}>Retry</button>}
        </div>
      )}
      <div style={{ color: T.faint, fontSize: 11.5, marginTop: 6, lineHeight: 1.45 }}>
        Demo: the file stays in this browser tab and is cleared on refresh, and it is not scanned for malware. In production, uploads would be malware-scanned before storage, kept as versioned evidence with their fingerprint, and retained per the evidence retention schedule. Don't upload confidential documents.
      </div>
    </div>
  );
}

// Approver picker + date, with a segregation-of-duties check against the owner
function ApprovalFields({ owner, approvedBy, approvedOn, onChange, recorded, requester }) {
  const T = useT();
  const { user } = useActor();
  const sameAsOwner = approvedBy && approvedBy === owner;
  // approving in ARGUS: you act in one of your own roles. Recording an outside approval: name the role that approved it.
  const options = (recorded ? POLICY_ROLES : user.roles).filter(r => r !== owner);
  return (
    <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1.5fr 1fr", gap: 12 }}>
      <div>
        <label htmlFor="approval-role" style={labelStyle(T)}>{recorded ? "Approved by (role)" : "Approve as (your role)"}</label>
        <select id="approval-role" style={fieldStyle(T)} value={approvedBy} onChange={e => onChange({ approvedBy: e.target.value })}>
          <option value="">{recorded ? "Select the approving role…" : "Approve as…"}</option>
          {options.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {!recorded && <NotAllowed action="policy.approve" ctx={{ owner, requester }} compact />}
        {sameAsOwner && (
          <div style={{ color: T.isDark ? "#f59e0b" : "#b45309", fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
            The approver should be independent of the policy owner. Choose a different role.
          </div>
        )}
      </div>
      <div>
        <label htmlFor="approval-date" style={labelStyle(T)}>Approval date</label>
        <input id="approval-date" type="date" style={fieldStyle(T)} value={approvedOn} max={todayISO()} onChange={e => onChange({ approvedOn: e.target.value })} />
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
  const approvalOk = !f.approved || (f.approvedBy && f.approvedBy !== f.owner && f.approvedOn && f.doc);
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
              <span style={{ fontSize: 14, fontWeight: 700, display: "block" }}>Already approved outside ARGUS</span>
              <span style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, display: "block", marginTop: 2 }}>
                {f.approved
                  ? (f.doc ? "The signed document is kept as approval evidence, and the approval is recorded as made outside ARGUS." : "Upload the signed document above. It's required as evidence of an approval made outside ARGUS.")
                  : "Leave unchecked to save as a draft. Someone other than you then approves it in ARGUS. Drafts don't count toward coverage."}
              </span>
            </span>
          </label>
          {f.approved && (
            <div style={{ marginTop: 12 }}>
              <ApprovalFields recorded owner={f.owner} approvedBy={f.approvedBy} approvedOn={f.approvedOn} onChange={set} />
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
  const { user } = useActor();
  const [a, setA] = useState({ approvedBy: "", approvedOn: todayISO(), doc: policy.doc || null });
  const set = patch => setA(s => ({ ...s, ...patch }));
  const requester = policy.revisedBy || policy.createdBy;
  const valid = a.approvedBy && a.approvedBy !== policy.owner && a.approvedOn && can(user, "policy.approve", { role: a.approvedBy, owner: policy.owner, requester }).ok;
  return (
    <Modal title="Approve policy" subtitle={`${policy.name}. Once approved, it counts toward every framework requirement it is mapped to.`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13.5, color: T.dim }}>Policy owner: <b style={{ color: T.text }}>{policy.owner}</b></div>
        <div style={{ fontSize: 13, color: T.dim }}>Approving version <b style={{ color: T.text }}>{policy.version || 1}</b>{policy.revision ? `: ${policy.revision}` : ""}. The approval is bound to this version.</div>
        <ApprovalFields owner={policy.owner} approvedBy={a.approvedBy} approvedOn={a.approvedOn} onChange={set} requester={requester} />
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

/* ---------------- simulated identity ---------------- */

const ActorCtx = createContext({ user: DEFAULT_USER, actAs: () => {} });
const useActor = () => useContext(ActorCtx);
// first demo user who would be allowed, to offer a one-click switch
const suggestUser = (action, ctx) => DEMO_USERS.find(u => can(u, action, ctx).ok) || null;

function NotAllowed({ action, ctx, why, compact }) {
  const T = useT();
  const { user, actAs } = useActor();
  const r = can(user, action, ctx);
  if (r.ok) return null;
  const alt = suggestUser(action, ctx);
  return (
    <div role="note" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, lineHeight: 1.45, marginTop: compact ? 6 : 10, background: T.panelSoft, border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px 11px", color: T.dim }}>
      <UserCheck size={14} color={T.faint} style={{ flexShrink: 0 }} />
      <span style={{ flex: "1 1 220px" }}>Acting as <b style={{ color: T.text }}>{user.name}</b>. {why ? `${why} ` : ""}{r.reason}</span>
      {alt && <button onClick={() => actAs(alt.id)} style={{ background: "none", border: "none", color: T.blue, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>Act as {alt.name}</button>}
    </div>
  );
}

function IdentitySwitcher() {
  const T = useT();
  const { user, actAs } = useActor();
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 8px 0", marginTop: "auto" }}>
      <label htmlFor="acting-as" style={{ display: "block", color: T.faint, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", marginBottom: 6 }}>ACTING AS (SIMULATED)</label>
      <select id="acting-as" value={user.id} onChange={e => actAs(e.target.value)} style={{ ...fieldStyle(T), padding: "8px 10px", fontSize: 13 }}>
        {DEMO_USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
      </select>
      <div style={{ color: T.faint, fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
        {user.roles.length ? user.roles.join(", ") : `Owner: ${user.teams.join(", ")}`}. No real sign-in; checks run in this browser only.
      </div>
    </div>
  );
}

/* ---------------- control evidence and testing ---------------- */

const EFFECT_STYLE = (T, state) => {
  const tone = EFFECT[state].tone;
  return tone === "good" ? T.risk.LOW : tone === "bad" ? T.risk.CRITICAL : T.risk.MEDIUM;
};
function EffectPill({ policy, agentId }) {
  const T = useT();
  const e = effectiveness(policy, agentId);
  const st = EFFECT_STYLE(T, e.state);
  return <span title={e.reason}><Pill small fg={st.fg} bg={st.bg} border={st.border}>{e.state === "effective" ? "✓ " : "! "}{EFFECT[e.state].label}</Pill></span>;
}

function TestForm({ policy, agents, onSave, onCancel }) {
  const T = useT();
  const { user } = useActor();
  const [f, setF] = useState({ result: "pass", testedOn: localISO(), evidence: "", owner: user.roles[0] || "", scope: "all", validDays: 365 });
  const set = p => setF(x => ({ ...x, ...p }));
  const ok = f.evidence.trim() && f.owner && f.testedOn && f.testedOn <= localISO();
  const id = `test-${policy.id}`;
  return (
    <div style={{ marginTop: 10, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Record a test of version {policy.version || 1}</div>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", gap: 14 }}>
        <legend style={{ ...labelStyle(T), marginBottom: 4 }}>Result</legend>
        {[["pass", "Passed"], ["fail", "Failed"]].map(([v, l]) => (
          <label key={v} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            <input type="radio" name={`${id}-result`} checked={f.result === v} onChange={() => set({ result: v })} /> {l}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={`${id}-ev`} style={labelStyle(T)}>Test performed and evidence (required)</label>
        <input id={`${id}-ev`} value={f.evidence} onChange={e => set({ evidence: e.target.value })} placeholder="e.g. TEST-0501: replayed 50 blocked payloads, all blocked" style={fieldStyle(T)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 9 }}>
        <div>
          <label htmlFor={`${id}-on`} style={labelStyle(T)}>Test date</label>
          <input id={`${id}-on`} type="date" max={localISO()} value={f.testedOn} onChange={e => set({ testedOn: e.target.value })} style={fieldStyle(T)} />
        </div>
        <div>
          <label htmlFor={`${id}-valid`} style={labelStyle(T)}>Evidence valid for</label>
          <select id={`${id}-valid`} value={f.validDays} onChange={e => set({ validDays: Number(e.target.value) })} style={fieldStyle(T)}>
            {[90, 180, 365].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-owner`} style={labelStyle(T)}>Evidence owner (your role)</label>
          <select id={`${id}-owner`} value={f.owner} onChange={e => set({ owner: e.target.value })} style={fieldStyle(T)}>
            {user.roles.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-scope`} style={labelStyle(T)}>Agents covered</label>
          <select id={`${id}-scope`} value={f.scope} onChange={e => set({ scope: e.target.value })} style={fieldStyle(T)}>
            <option value="all">All agents in scope</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} only</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={!ok} onClick={() => onSave({ ...f, evidence: f.evidence.trim(), scope: f.scope === "all" ? "all" : [Number(f.scope) || f.scope] })} style={btnStyle(T, true, !!ok)}>Save test result</button>
        <button onClick={onCancel} style={btnStyle(T, false)}>Cancel</button>
      </div>
    </div>
  );
}

function ControlEvidence({ p, agents, onTest, onRevise }) {
  const T = useT();
  const { user } = useActor();
  const [mode, setMode] = useState(null);
  const [summary, setSummary] = useState("");
  const [hist, setHist] = useState(false);
  const green = T.isDark ? "#34d399" : "#059669", amber = T.isDark ? "#f59e0b" : "#b45309";
  const attrs = attributes(p);
  const tests = [...(p.tests || [])].sort((a, b) => (b.testedOn > a.testedOn ? 1 : -1));
  const users = agents.filter(a => a.mapping.policies.some(m => m.id === p.id && !m.excluded));
  const perm = can(user, "policy.manage");
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <EffectPill policy={p} />
        <span style={{ fontSize: 11.5, color: T.faint }}>v{p.version || 1}{users.length ? ` · ${users.length} agent${users.length > 1 ? "s" : ""} in scope` : ""}</span>
      </div>
      <ul aria-label="Control attributes" style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "4px 10px" }}>
        {attrs.map(a => (
          <li key={a.key} title={a.detail} style={{ display: "flex", gap: 5, alignItems: "flex-start", fontSize: 12, lineHeight: 1.35 }}>
            {a.ok ? <CheckCircle2 size={13} color={green} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={13} color={amber} style={{ flexShrink: 0, marginTop: 1 }} />}
            <span><b>{a.label}</b> <span style={{ color: T.faint }}>{a.detail}</span></span>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <button disabled={!perm.ok || p.status === "draft"} title={perm.reason || (p.status === "draft" ? "Approve this version before testing it" : "")} onClick={() => setMode(mode === "test" ? null : "test")} style={{ ...btnStyle(T, false, perm.ok && p.status !== "draft"), padding: "4px 10px", fontSize: 12 }}>Record test…</button>
        <button disabled={!perm.ok} title={perm.reason} onClick={() => setMode(mode === "revise" ? null : "revise")} style={{ ...btnStyle(T, false, perm.ok), padding: "4px 10px", fontSize: 12 }}>New version…</button>
        {tests.length > 0 && <button aria-expanded={hist} onClick={() => setHist(h => !h)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>{hist ? "Hide" : "Show"} test history ({tests.length})</button>}
      </div>
      {!perm.ok && <NotAllowed action="policy.manage" compact />}
      {mode === "test" && <TestForm policy={p} agents={users} onCancel={() => setMode(null)} onSave={t => { onTest(p.id, t); setMode(null); }} />}
      {mode === "revise" && (
        <div style={{ marginTop: 10, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Publish version {(p.version || 1) + 1}</div>
          <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45 }}>A new version goes back to draft until someone other than you approves it, and test results on version {p.version || 1} become stale. Assessments that relied on them drop until it is re-tested.</div>
          <label htmlFor={`rev-${p.id}`} style={labelStyle(T)}>What changed (required)</label>
          <input id={`rev-${p.id}`} value={summary} onChange={e => setSummary(e.target.value)} style={fieldStyle(T)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={!summary.trim()} onClick={() => { onRevise(p.id, summary.trim()); setMode(null); setSummary(""); }} style={btnStyle(T, true, !!summary.trim())}>Create draft version</button>
            <button onClick={() => setMode(null)} style={btnStyle(T, false)}>Cancel</button>
          </div>
        </div>
      )}
      {hist && (
        <ol style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {tests.map(t => (
            <li key={t.id} style={{ fontSize: 12, lineHeight: 1.45, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 9px" }}>
              <b style={{ color: t.result === "pass" ? green : (T.isDark ? "#f43f5e" : "#e11d48") }}>{t.result === "pass" ? "Passed" : "Failed"}</b> {t.testedOn} on v{t.version || 1}
              {t.scope !== "all" && <> · {agents.filter(a => t.scope.includes(a.id)).map(a => a.name).join(", ")} only</>}
              <div style={{ color: T.dim }}>{t.evidence}</div>
              <div style={{ color: T.faint }}>Owner {t.owner} · recorded by {t.by} · valid until {t.expiresOn}{t.synthetic ? " · synthetic" : ""}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------------- audit investigation ---------------- */

const OUTCOME_LABEL = { success: "Success", denied: "Denied", detected: "Detected" };

function AuditTrail({ audit, agents, policies, onOpenAgent, onOpenPolicy, notify }) {
  const T = useT();
  const { user } = useActor();
  const all = can(user, "audit.all").ok;
  const mine = new Set(agents.filter(a => ownsAgent(user, a)).map(a => a.name));
  const visible = all ? audit : audit.filter(e => mine.has(e.agent) || e.agent === "—");
  const [f, setF] = useState({ q: "", agent: "all", type: "all", actor: "all", outcome: "all", from: "", to: "", corr: "" });
  const [open, setOpen] = useState(null);
  const [check, setCheck] = useState(null);
  const set = p => setF(x => ({ ...x, ...p }));
  const uniq = k => [...new Set(visible.map(k))].filter(Boolean).sort();
  const day = at => localISO(new Date(at));
  const shown = visible.filter(e =>
    (f.agent === "all" || e.agent === f.agent) && (f.type === "all" || e.type === f.type) &&
    (f.actor === "all" || e.actor?.name === f.actor) && (f.outcome === "all" || (e.outcome || "success") === f.outcome) &&
    (!f.from || day(e.at) >= f.from) && (!f.to || day(e.at) <= f.to) && (!f.corr || e.correlation === f.corr) &&
    (!f.q || [e.eid, e.desc, e.type, e.agent, e.actor?.name].join(" ").toLowerCase().includes(f.q.toLowerCase())));
  const filtered = Object.entries(f).some(([k, v]) => v && v !== "all");
  const sel = { ...fieldStyle(T), width: "auto", flex: T.mobile ? "1 1 45%" : "0 1 180px", padding: "8px 10px", fontSize: 13 };
  const red = T.isDark ? "#f43f5e" : "#e11d48", green = T.isDark ? "#34d399" : "#059669";

  const exportCsv = () => {
    downloadFile("argus-audit-trail.csv", toCSV([
      ["Event ID", "Time (ISO 8601 UTC)", "Time (local)", "Type", "Severity", "Outcome", "Agent", "Actor", "Accountable role", "Entity", "Entity version", "Before", "After", "Correlation ID", "Description", "Synthetic", "Hash"],
      ...shown.map(e => [e.eid, new Date(e.at).toISOString(), e.ts, e.type, e.sev, e.outcome || "success", e.agent, e.actor?.name, e.actor?.role,
        e.entity ? `${e.entity.kind}:${e.entity.id}` : "", e.entity?.version ?? "", e.before ? JSON.stringify(e.before) : "", e.after ? JSON.stringify(e.after) : "",
        e.correlation || "", redact(e.desc), e.synthetic ? "yes" : "no", e.hash]),
    ]), "text/csv;charset=utf-8");
    notify(`Exported ${shown.length} event${shown.length === 1 ? "" : "s"}`);
  };
  const related = e => {
    const links = [];
    if (e.agent && e.agent !== "—" && agents.some(a => a.name === e.agent)) links.push(<button key="a" onClick={() => onOpenAgent(e.agent)} style={linkBtn(T)}>Open {e.agent}</button>);
    const pid = e.entity?.kind === "policy" ? e.entity.id : e.policy;
    const pol = pid && policies.find(p => p.id === pid);
    if (pol) links.push(<button key="p" onClick={() => onOpenPolicy(pol.id)} style={linkBtn(T)}>Open policy “{pol.name}”</button>);
    if (e.correlation) links.push(<button key="c" onClick={() => set({ corr: e.correlation })} style={linkBtn(T)}>All events in {e.correlation}</button>);
    return links;
  };

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Append-only ledger of platform events and governance actions, with who acted, in which role, and what changed.">
        <button onClick={exportCsv} disabled={!shown.length} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 8, padding: "9px 16px", fontSize: 14, cursor: shown.length ? "pointer" : "not-allowed" }}>
          <Download size={15} /> Export {filtered ? "filtered " : ""}CSV
        </button>
      </PageHeader>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: T.dim, marginTop: 12, lineHeight: 1.5 }}>
        <span>{all ? `Showing all ${audit.length} events.` : `Acting as ${user.name}: showing ${visible.length} events for your agents and program-wide events.`} Seeded history is synthetic and marked as such. Free text is screened for secrets and personal data before it is logged.</span>
        <button onClick={() => setCheck(verifyChain(audit))} style={linkBtn(T)}>Verify ledger integrity</button>
        {check && <span role="status" style={{ fontWeight: 700, color: check.ok ? green : red }}>{check.ok ? `Checksum chain intact across ${check.checked} events (demo checksum, not cryptographic)` : `Chain broken at ${check.at}`}</span>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }} role="search" aria-label="Filter audit events">
        <input aria-label="Search events" value={f.q} onChange={e => set({ q: e.target.value })} placeholder="Search ID, text, actor…" style={{ ...sel, flex: T.mobile ? "1 1 100%" : "1 1 220px" }} />
        <select aria-label="Agent" value={f.agent} onChange={e => set({ agent: e.target.value })} style={sel}><option value="all">Any agent</option>{uniq(e => e.agent).map(v => <option key={v}>{v}</option>)}</select>
        <select aria-label="Event type" value={f.type} onChange={e => set({ type: e.target.value })} style={sel}><option value="all">Any event type</option>{uniq(e => e.type).map(v => <option key={v}>{v}</option>)}</select>
        <select aria-label="Actor" value={f.actor} onChange={e => set({ actor: e.target.value })} style={sel}><option value="all">Any actor</option>{uniq(e => e.actor?.name).map(v => <option key={v}>{v}</option>)}</select>
        <select aria-label="Outcome" value={f.outcome} onChange={e => set({ outcome: e.target.value })} style={sel}><option value="all">Any outcome</option>{Object.entries(OUTCOME_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: T.dim }}>From <input type="date" aria-label="From date" value={f.from} onChange={e => set({ from: e.target.value })} style={{ ...sel, flex: "0 0 auto" }} /></label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: T.dim }}>To <input type="date" aria-label="To date" value={f.to} onChange={e => set({ to: e.target.value })} style={{ ...sel, flex: "0 0 auto" }} /></label>
        {f.corr && <Pill fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>Correlation {f.corr}</Pill>}
        {filtered && <button onClick={() => set({ q: "", agent: "all", type: "all", actor: "all", outcome: "all", from: "", to: "", corr: "" })} style={linkBtn(T)}>Clear filters</button>}
      </div>
      <div style={{ fontSize: 13, color: T.faint, marginBottom: 10 }} aria-live="polite">Showing {shown.length} of {visible.length} events</div>

      {shown.length === 0 ? <Card style={{ padding: 28, textAlign: "center", color: T.faint }}>No events match these filters.</Card> : (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <caption style={{ position: "absolute", left: -9999 }}>Audit events, newest first</caption>
              <thead>
                <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 12.5, textAlign: "left" }}>
                  {["", "Time", "Event", "Agent", "Actor", "Outcome", "Description"].map((h, i) => <th key={i} scope="col" style={{ padding: "11px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{h || <span style={{ position: "absolute", left: -9999 }}>Severity</span>}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map(e => {
                  const isOpen = open === e.eid;
                  const oc = e.outcome || "success";
                  return (
                    <React.Fragment key={e.eid}>
                      <tr style={{ borderTop: `1px solid ${T.border}`, verticalAlign: "top" }}>
                        <td style={{ padding: "11px 12px", width: 20 }}><SevDot sev={e.sev} /><span style={{ position: "absolute", left: -9999 }}>{e.sev}</span></td>
                        <td style={{ padding: "11px 12px", fontSize: 12.5, color: T.dim, whiteSpace: "nowrap" }}>
                          <time dateTime={new Date(e.at).toISOString()}>{e.ts}</time><div style={{ color: T.faint, fontSize: 11.5 }}>{age(e.at)}</div>
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <Pill small fg={T.text} bg={T.panelSoft} border={T.border}>{e.type}</Pill>
                          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: T.faint, marginTop: 4 }}>{e.eid}{e.synthetic ? " · synthetic" : ""}</div>
                        </td>
                        <td style={{ padding: "11px 12px", fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap" }}>{e.agent}</td>
                        <td style={{ padding: "11px 12px", fontSize: 13 }}>{e.actor?.name}<div style={{ color: T.faint, fontSize: 11.5 }}>{e.actor?.role}</div></td>
                        <td style={{ padding: "11px 12px", fontSize: 12.5, fontWeight: 700, color: oc === "denied" ? red : oc === "detected" ? (T.isDark ? "#f59e0b" : "#b45309") : green }}>{OUTCOME_LABEL[oc]}</td>
                        <td style={{ padding: "11px 12px", fontSize: 13.5 }}>
                          {e.desc}
                          <div><button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.eid)} style={{ ...linkBtn(T), marginTop: 4 }}>{isOpen ? "Hide details" : "Details"}</button></div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr><td colSpan={7} style={{ padding: "0 12px 12px 44px" }}>
                          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 14px", margin: 0, fontSize: 12.5, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}>
                            <dt style={{ color: T.faint }}>Record</dt><dd style={{ margin: 0 }}>{e.entity ? `${e.entity.kind} ${e.entity.id}${e.entity.version !== undefined ? ` (version ${e.entity.version})` : ""}` : "—"}</dd>
                            <dt style={{ color: T.faint }}>Change</dt><dd style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{e.before || e.after ? `${JSON.stringify(e.before || {})} → ${JSON.stringify(e.after || {})}` : "—"}</dd>
                            <dt style={{ color: T.faint }}>Correlation</dt><dd style={{ margin: 0 }}>{e.correlation || "—"}</dd>
                            <dt style={{ color: T.faint }}>Recorded</dt><dd style={{ margin: 0 }}>{fmtWhenLong(e.at)} ({new Date(e.at).toISOString()}){e.synthetic ? " · synthetic demo history" : ""}</dd>
                            <dt style={{ color: T.faint }}>Checksum</dt><dd style={{ margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{e.hash} (previous {e.prev})</dd>
                            <dt style={{ color: T.faint }}>Related</dt><dd style={{ margin: 0, display: "flex", gap: 12, flexWrap: "wrap" }}>{related(e).length ? related(e) : "—"}</dd>
                          </dl>
                        </td></tr>
                      )}
                    </React.Fragment>
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

const linkBtn = T => ({ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 });

/* ---------------- architecture provenance ---------------- */

function Provenance({ agent, arch }) {
  const T = useT();
  const att = agent.attest?.arch;
  return (
    <div style={{ display: "flex", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 13px", margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.5, color: T.dim }}>
      <Info size={15} color={T.blue} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div><b style={{ color: T.text }}>Source:</b> {arch.generated ? "generated by ARGUS from the agent's declared characteristics" : `declared by the owner (${agent.owner})`}. <b style={{ color: T.text }}>Last verified:</b> {att ? `confirmed by ${att.by} on ${att.on}` : "not yet confirmed by the owner"}.</div>
        <div><b style={{ color: T.text }}>Observed runtime architecture:</b> not available. No runtime integration is connected, so ARGUS can't compare this against what the agent actually calls and can't detect mismatches.</div>
      </div>
    </div>
  );
}

/* ---------------- assessment metrics, operating gates, alerts, decisions ---------------- */

const lvlName = l => l[0] + l.slice(1).toLowerCase();
const STATE_STYLE = (T, state) => state === "conflict" ? T.risk.HIGH : state === "exception" ? T.risk.MEDIUM : (T.status[state] || T.status.pending);

function StatePill({ agent, ctx }) {
  const T = useT();
  const { state } = operatingState(agent, ctx);
  const s = STATE_STYLE(T, state);
  const extra = state === "active" ? (agent.conditions ? " · conditional" : agent.probation ? " · probation" : "") : "";
  return <Pill fg={s.fg} bg={s.bg} border={s.border}>{state === "conflict" ? "⚠ " : ""}{STATE_LABEL[state]}{extra}</Pill>;
}

// The worst individual scenario, shown next to the aggregate score so averaging can't hide it
function WorstRisk({ agent, treatments, prefix = "Worst" }) {
  const T = useT();
  const { worst, worstUntreated } = worstScenario(agent, treatments);
  if (!worst) return null;
  const r = worstUntreated || worst;
  const lv = riskLevel(r.residual.score), st = T.risk[lv];
  return (
    <span title={`${r.id} ${r.title || ""}: residual ${r.residual.score}${worstUntreated ? ", untreated" : ", treated"}`} style={{ fontSize: 11.5, color: T.dim, whiteSpace: "nowrap" }}>
      {prefix}: <b style={{ color: st.fg }}>{r.id} · {r.residual.score} {lvlName(lv)}</b>{worstUntreated ? "" : " (treated)"}
    </span>
  );
}

function MethodNote({ a, style }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ fontSize: 12, color: T.faint, lineHeight: 1.55, ...style }}>
      Assessed {fmtWhen(a.asOf)} · {a.applicable} applicable requirements{a.na ? `, ${a.na} excluded as not applicable` : ", none excluded"} · a curated subset of each framework, not a legal compliance determination.{" "}
      <button aria-expanded={open} onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
        {open ? "Hide method" : "How these are calculated"}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 13px", color: T.dim, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><b style={{ color: T.text }}>Mapped control coverage: </b>{COVERAGE_METHOD}</div>
          <div><b style={{ color: T.text }}>Requirement fulfillment: </b>{FULFILLMENT_METHOD}</div>
          <div><b style={{ color: T.text }}>Exclusions: </b>{EXCLUSION_METHOD}
            {a.exclusions.length > 0 && <> Currently excluded: {a.exclusions.slice(0, 6).map(r => `${r.framework.short} ${r.id} (${r.basis.replace(/^Marked not applicable: /, "")})`).join("; ")}{a.exclusions.length > 6 ? `; and ${a.exclusions.length - 6} more` : ""}.</>}
          </div>
          <div><b style={{ color: T.text }}>Scope: </b>{SCOPE_DISCLAIMER}</div>
        </div>
      )}
    </div>
  );
}

// the two headline measures, as tiles
const assessmentTiles = (T, a) => [
  {
    label: "Mapped control coverage", value: `${a.coveragePct ?? 0}%`, color: coverageColor(T, a.coveragePct ?? 0),
    sub: `${a.mapped} of ${a.applicable} applicable requirements have a live control mapped · ${a.unmapped} unmapped`,
  },
  {
    label: "Requirement fulfillment", value: `${a.fulfillmentPct ?? 0}%`, color: coverageColor(T, a.fulfillmentPct ?? 0),
    sub: `${a.met} met · ${a.partial} partially met · ${a.notMet} not met, out of ${a.applicable} (evidence-weighted)`,
  },
];

function RecentAlerts({ audit, agents, openAgent }) {
  const T = useT();
  const byName = Object.fromEntries(agents.map(a => [a.name, a]));
  const events = [...audit].filter(e => e.sev === "critical" || e.sev === "warn").sort((x, y) => y.at - x.at).slice(0, 6);
  const green = T.isDark ? "#34d399" : "#059669", red = T.isDark ? "#f43f5e" : "#e11d48";
  const stateOf = e => {
    const a = byName[e.agent];
    if (!a) return null;
    if (e.type === "Policy Violation" && e.id) return isResolved(a, e) ? { label: "Resolved", color: green } : { label: a.status === "suspended" ? "Open · agent suspended" : "Open", color: red };
    if (e.type === "Agent Suspended") return a.status === "suspended" ? { label: "Still suspended", color: red } : { label: "Since reinstated", color: green };
    if (e.scoreTo !== undefined) return { label: `Historical value ${e.scoreTo} · current score ${a.score}`, color: T.dim };
    if (e.levelTo) return { label: `Historical level ${e.levelTo} · current ${a.risk}`, color: T.dim };
    return null;
  };
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {events.length === 0 && <div style={{ color: T.faint, fontSize: 13, padding: "16px 0" }}>No critical or warning events.</div>}
        {events.map((e, i) => {
          const st = stateOf(e);
          return (
            <button key={i} onClick={() => openAgent(e.agent)} style={{
              background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: "left", color: T.text, font: "inherit",
              padding: "12px 14px", display: "flex", gap: 10, cursor: "pointer", width: "100%",
            }}>
              <div style={{ marginTop: 3 }}><SevDot sev={e.sev} size={13} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{e.desc}</div>
                <div style={{ color: T.faint, fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
                  {e.agent} · <time dateTime={new Date(e.at).toISOString()}>{fmtWhen(e.at)}</time> · {age(e.at)}
                </div>
                {st && <div style={{ fontSize: 11.5, fontWeight: 700, color: st.color, marginTop: 4 }}>{st.label}</div>}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 12, lineHeight: 1.45 }}>
        Runtime telemetry: not connected. These are synthetic demo events, dated relative to today.
      </div>
    </>
  );
}

function DecisionForm({ agent, kind, blockers, life, onCancel }) {
  const T = useT();
  const { user } = useActor();
  const [rev] = useState(agent.rev || 0);
  const [by, setBy] = useState("");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState(addDays(30));
  const maxUntil = addDays(EXCEPTION_MAX_DAYS);
  const perm = can(user, kind === "exception" ? "agent.exception" : "agent.suspend", { agent });
  const byOk = by && by !== agent.owner && perm.ok;
  const ok = byOk && reason.trim() && (kind === "suspend" || (until && until <= maxUntil && until > localISO()));
  const id = `${kind}-${agent.id}`;
  return (
    <div style={{ marginTop: 10, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{kind === "exception" ? "Approve a time-limited exception" : "Suspend this agent"}</div>
      <div>
        <label htmlFor={`${id}-by`} style={labelStyle(T)}>Decide as (your role; not the owner, {agent.owner})</label>
        <select id={`${id}-by`} value={by} onChange={e => setBy(e.target.value)} style={fieldStyle(T)}>
          <option value="">Select role…</option>
          {user.roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <NotAllowed action={kind === "exception" ? "agent.exception" : "agent.suspend"} ctx={{ agent }} compact />
      </div>
      <div>
        <label htmlFor={`${id}-why`} style={labelStyle(T)}>{kind === "exception" ? "Why this risk can be carried for now (required)" : "Reason for suspension (required)"}</label>
        <input id={`${id}-why`} value={reason} onChange={e => setReason(e.target.value)} style={fieldStyle(T)} />
      </div>
      {kind === "exception" && (
        <div>
          <label htmlFor={`${id}-until`} style={labelStyle(T)}>Exception ends (max {EXCEPTION_MAX_DAYS} days)</label>
          <input id={`${id}-until`} type="date" value={until} max={maxUntil} onChange={e => setUntil(e.target.value)} style={fieldStyle(T)} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!ok} onClick={() => kind === "exception"
          ? life.grantException(agent.id, { by, reason: reason.trim(), until, gates: blockers.map(b => b.id), rev })
          : life.suspend(agent.id, { by, reason: reason.trim(), rev })} style={btnStyle(T, true, !!ok)}>
          {kind === "exception" ? "Approve exception" : "Suspend agent"}
        </button>
        <button onClick={onCancel} style={btnStyle(T, false)}>Cancel</button>
      </div>
    </div>
  );
}

// Overview card for an active agent that fails a continued-operation gate, or runs under an exception
function GateCard({ agent, policies, audit, actions, life, ctx }) {
  const T = useT();
  const [form, setForm] = useState(null);
  const op = operatingState(agent, ctx);
  if (op.state !== "conflict" && op.state !== "exception") return null;
  const tone = op.state === "conflict" ? T.risk.HIGH : T.risk.MEDIUM;
  const rowFor = b => {
    if (b.id === "risk") return <RequirementSubs item={{ id: "risks", subs: b.subs }} agent={agent} policies={policies} audit={audit} actions={actions} life={life} />;
    if (b.id === "violation") {
      const pols = [...new Set(b.subs.map(e => e.policy))].map(id => ({ id, retest: agent.retests?.[id] || null }));
      return <>
        <RequirementSubs item={{ id: "rootcause", subs: b.subs.map(e => ({ ...e, resolution: agent.resolutions?.[e.id] || null })) }} agent={agent} policies={policies} audit={audit} actions={actions} life={life} />
        <RequirementSubs item={{ id: "retest", subs: pols }} agent={agent} policies={policies} audit={audit} actions={actions} life={life} />
      </>;
    }
    return null;
  };
  return (
    <div id="gate-card" style={{ border: `1px solid ${tone.border}`, background: tone.bg, borderRadius: 10, padding: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={17} color={tone.fg} />
        <div style={{ fontSize: 15.5, fontWeight: 800, color: tone.fg }}>{op.state === "conflict" ? "Gate conflict" : "Operating under an exception"}</div>
      </div>
      {op.state === "conflict" ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
          {agent.name} is active but fails its continued-operation gate. ARGUS flags this for a decision rather than switching the agent off: fix the blockers, approve a time-limited exception, or suspend it.
          {op.expired && <> The exception approved by {agent.exception.by} ended on <b>{agent.exception.until}</b>.</>}
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>
          Approved by <b>{agent.exception.by}</b> on {agent.exception.on} until <b>{agent.exception.until}</b>: {agent.exception.reason}. The blockers below still need fixing before then.
        </div>
      )}
      {op.blockers.some(b => b.subs && b.id === "violation") && <NotAllowed action="agent.owner" ctx={{ agent }} why="Root causes and re-tests are recorded by the owner." />}
      <div style={{ marginTop: 8 }}>
        {op.blockers.map(b => (
          <div key={b.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.border}` }}>
            <AlertCircle size={16} color={tone.fg} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.label}</div>
              <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.45, marginTop: 2 }}>{b.detail}</div>
              {b.subs && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>{rowFor(b)}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {op.state === "conflict" ? <>
          <button onClick={() => setForm("exception")} aria-pressed={form === "exception"} style={btnStyle(T, false)}>Approve exception…</button>
          <button onClick={() => setForm("suspend")} aria-pressed={form === "suspend"} style={btnStyle(T, false)}>Suspend agent…</button>
        </> : <button onClick={() => life.revokeException(agent.id)} style={btnStyle(T, false)}>Revoke exception</button>}
      </div>
      {form && op.state === "conflict" && <DecisionForm key={form} agent={agent} kind={form} blockers={op.blockers} life={life} onCancel={() => setForm(null)} />}
    </div>
  );
}

function GatesSettings({ gates, onChange }) {
  const T = useT();
  const { user } = useActor();
  const locked = !can(user, "gates.configure").ok;
  const sel = { ...fieldStyle(T), width: "auto", padding: "7px 9px", fontSize: 13 };
  const row = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "9px 0", borderTop: `1px solid ${T.border}` };
  return (
    <Card style={{ padding: T.mobile ? 14 : 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Operating gates</div>
      <div style={{ fontSize: 12.5, color: T.dim, lineHeight: 1.5, margin: "3px 0 8px" }}>
        Checked against each agent's worst individual scenario, not just its aggregate score. Failing agents are flagged, never switched off automatically. Changes are logged. Evaluated in the browser for this demo, not enforced at runtime.
      </div>
      <NotAllowed action="gates.configure" compact />
      <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
      <div style={row}>
        <label htmlFor="gate-act" style={{ fontSize: 13 }}>Activation and reinstatement: block on untreated risk at</label>
        <select id="gate-act" value={gates.activationRisk} onChange={e => onChange({ activationRisk: Number(e.target.value) })} style={sel}>
          {GATE_RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={row}>
        <label htmlFor="gate-op" style={{ fontSize: 13 }}>Continued operation: flag untreated risk at</label>
        <select id="gate-op" value={gates.operateRisk} onChange={e => onChange({ operateRisk: Number(e.target.value) })} style={sel}>
          {GATE_RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={row}>
        <label htmlFor="gate-score" style={{ fontSize: 13 }}>Continued operation: flag agent score at or above</label>
        <select id="gate-score" value={gates.operateScore} onChange={e => onChange({ operateScore: Number(e.target.value) })} style={sel}>
          {GATE_SCORE_OPTIONS.map(v => <option key={v} value={v}>{v} ({v >= 80 ? "Critical" : "High"})</option>)}
        </select>
      </div>
      <div style={row}>
        <label htmlFor="gate-viol" style={{ fontSize: 13 }}>Continued operation: flag open critical violations</label>
        <input id="gate-viol" type="checkbox" checked={gates.operateViolations} onChange={e => onChange({ operateViolations: e.target.checked })} style={{ width: 18, height: 18 }} />
      </div>
      </fieldset>
    </Card>
  );
}

const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
function SevBadge({ sev }) {
  const T = useT();
  const st = T.risk[sev.toUpperCase()] || T.risk.LOW;
  return <Pill small fg={st.fg} bg={st.bg} border={st.border}>{sev === "critical" ? "▲ " : sev === "high" ? "▲ " : ""}{SEV_LABEL[sev]}</Pill>;
}

function Decisions({ items, gates, onGates, onAction }) {
  const T = useT();
  const [kind, setKind] = useState("all");
  const [sev, setSev] = useState("all");
  const inKind = (i, v = kind) => v === "all" || i.kind === v;
  const inSev = (i, v = sev) => v === "all" || i.sev === v;
  const shown = items.filter(i => inKind(i) && inSev(i));
  const dueText = due => {
    if (!due) return "—";
    const d = daysUntil(due);
    return `${fmtDate(due)} · ${d < 0 ? `${-d} day${d === -1 ? "" : "s"} overdue` : d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`}`;
  };
  const meta = (k, v, warn) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{k}</div>
      <div style={{ fontSize: 13, marginTop: 2, color: warn ? (T.isDark ? "#f43f5e" : "#e11d48") : T.text, fontWeight: warn ? 700 : 400 }}>{v}</div>
    </div>
  );
  return (
    <div>
      <PageHeader title="Needs my decision" subtitle="Everything waiting on a governance decision, ranked by severity, agents affected, how overdue it is and how long it has been open." />
      <div style={{ ...chipRow(T.mobile), marginTop: 18 }}>
        {[{ id: "all", label: "All" }, ...DECISION_KINDS].map(k => (
          <FilterChip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)} label={k.label} count={items.filter(i => inKind(i, k.id) && inSev(i)).length} />
        ))}
      </div>
      <div style={{ ...chipRow(T.mobile), marginTop: 8 }}>
        {["all", "critical", "high", "medium"].map(s => (
          <FilterChip key={s} active={sev === s} onClick={() => setSev(s)} label={s === "all" ? "Any severity" : SEV_LABEL[s]} count={items.filter(i => inKind(i) && inSev(i, s)).length} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }} role="list" aria-label="Decision queue">
        {items.length === 0 && <Card style={{ padding: 28, textAlign: "center", color: T.faint }}>Nothing needs a decision right now.</Card>}
        {items.length > 0 && shown.length === 0 && (
          <Card style={{ padding: 28, textAlign: "center", color: T.faint }}>
            No items match these filters. <button onClick={() => { setKind("all"); setSev("all"); }} style={{ background: "none", border: "none", color: T.blue, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 14 }}>Clear filters</button>
          </Card>
        )}
        {shown.map(i => (
          <Card key={i.id} style={{ padding: T.mobile ? 14 : 16 }}>
            <div role="listitem">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <SevBadge sev={i.sev} />
                    <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>{DECISION_KINDS.find(k => k.id === i.kind).label}</Pill>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 7, lineHeight: 1.35 }}>{i.title}</div>
                  <div style={{ fontSize: 13, color: T.dim, marginTop: 4, lineHeight: 1.5 }}>{i.reason}</div>
                </div>
                <button onClick={() => onAction(i.action)} style={{ ...btnStyle(T, true, true), whiteSpace: "nowrap" }}>{i.action.label} <ChevronRight size={14} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 130 : 150}px, 1fr))`, gap: 10, marginTop: 12 }}>
                {meta(i.agents.length > 1 ? "Agents" : "Agent", i.agents.length ? i.agents.join(", ") : "Program-wide")}
                {meta("Owner", i.owner)}
                {meta("Age", i.since ? `${age(i.since)} (${fmtDate(localISO(i.since))})` : "Not recorded")}
                {meta("Due", dueText(i.due), i.due && daysUntil(i.due) < 0)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginTop: 20 }}>
        <GatesSettings gates={gates} onChange={onGates} />
        <Card style={{ padding: T.mobile ? 14 : 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Telemetry and integrations</div>
          <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.55, marginTop: 6 }}>
            No runtime integrations are connected in this demo, so there is no live telemetry to go stale and no connector to fail. Agent activity, violations and alerts are synthetic. Once an integration is connected, stale feeds and disconnected connectors would be queued here.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- views ---------------- */

function Dashboard({ agents, assessment, audit, treatments, gates, decisions, openAgent, onOpenFrameworks, onOpenDecisions }) {
  const T = useT();
  const ctx = { audit, treatments, gates };
  const active = agents.filter(a => a.status === "active").length;
  const suspended = agents.filter(a => a.status === "suspended").length;
  const conflicts = agents.filter(a => operatingState(a, ctx).state === "conflict").length;
  // critical exposure counted per scenario, regardless of each agent's aggregate score
  const critPairs = agents.flatMap(a => a.risks.filter(r => r.residual.score >= 16 && !isTreated(r.id, treatments)).map(r => ({ a, r })));
  const critScenarios = new Set(critPairs.map(p => p.r.id)).size;
  const critAgents = new Set(critPairs.map(p => p.a.name)).size;
  const urgent = decisions.filter(d => d.sev === "critical").length;

  const dist = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(k => ({
    level: k[0] + k.slice(1).toLowerCase(),
    count: agents.filter(a => a.risk === k).length, key: k,
  }));

  const green = T.isDark ? "#34d399" : "#059669";
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const amber = T.isDark ? "#f59e0b" : "#b45309";

  const [cov, ful] = assessmentTiles(T, assessment);
  const kpis = [
    { label: "Active Agents", value: `${active} / ${agents.length}`, sub: `${suspended} suspended · ${conflicts} with a gate conflict`, icon: <Cpu size={18} color={T.blue} />, color: T.text },
    { label: "Needs my decision", value: decisions.length, sub: `${urgent} critical · open the queue`, icon: <Inbox size={18} color={urgent ? red : T.blue} />, color: urgent ? red : T.text, onClick: onOpenDecisions },
    { label: "Untreated critical risks", value: critScenarios, sub: `Scenarios at residual 16+ across ${critAgents} agent${critAgents === 1 ? "" : "s"}, whatever their aggregate score`, icon: <ShieldAlert size={18} color={red} />, color: critScenarios ? red : green },
    { ...cov, icon: <Layers size={18} color={cov.color} /> },
    { ...ful, icon: <HeartPulse size={18} color={ful.color} /> },
  ];

  const pad = T.mobile ? 16 : 22;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.mobile ? 14 : 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 150 : 210}px, 1fr))`, gap: T.mobile ? 10 : 16 }}>
        {kpis.map(k => (
          <Card key={k.label} onClick={k.onClick} style={{ padding: T.mobile ? 14 : 20, cursor: k.onClick ? "pointer" : "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: T.mobile ? 8 : 14, gap: 6 }}>
              <span style={{ color: T.dim, fontSize: T.mobile ? 12.5 : 14 }}>{k.label}</span>{k.icon}
            </div>
            <div style={{ fontSize: T.mobile ? 24 : 30, fontWeight: 700, color: k.color, marginBottom: 6 }}>{k.value}</div>
            <div style={{ color: T.faint, fontSize: T.mobile ? 11.5 : 13, lineHeight: 1.4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>
      <MethodNote a={assessment} style={{ marginTop: T.mobile ? -6 : -10 }} />

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
          <div style={{ color: T.dim, fontSize: 13, marginBottom: 14 }}>Latest critical and warning events, with their current state.</div>
          <RecentAlerts audit={audit} agents={agents} openAgent={openAgent} />
        </Card>
      </div>

      <Card style={{ padding: pad }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Mapped control coverage by framework</div>
            <div style={{ color: T.dim, fontSize: 13 }}>Applicable requirements with a live control mapped. Evidence-weighted fulfillment is shown alongside.</div>
          </div>
          <button onClick={onOpenFrameworks} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: T.blue, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            View all frameworks <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${T.mobile ? 220 : 250}px, 1fr))`, gap: "12px 24px" }}>
          {assessment.frameworks.filter(f => f.group !== "baseline").map(f => (
            <CoverageBar key={f.id} label={f.short} covered={f.mapped} total={f.applicable} pct={f.coveragePct} fulfillment={f.fulfillmentPct} />
          ))}
        </div>
      </Card>
    </div>
  );
}

const coverageColor = (T, pct) =>
  pct >= 80 ? (T.isDark ? "#34d399" : "#059669") : pct >= 60 ? (T.isDark ? "#f59e0b" : "#b45309") : (T.isDark ? "#f43f5e" : "#e11d48");

function CoverageBar({ label, covered, total, pct, fulfillment }) {
  const T = useT();
  if (pct === null || pct === undefined) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}</span><span style={{ color: T.faint }}>Not in scope</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}` }} />
    </div>
  );
  const c = coverageColor(T, pct);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: T.dim, whiteSpace: "nowrap" }} title={fulfillment !== undefined ? "Mapped control coverage, then evidence-weighted fulfillment" : undefined}>
          {covered}/{total} · <span style={{ color: c, fontWeight: 700 }}>{pct}%</span>
          {fulfillment !== undefined && fulfillment !== null && <> · <span style={{ color: T.faint }}>fulfilled</span> <span style={{ color: coverageColor(T, fulfillment), fontWeight: 700 }}>{fulfillment}%</span></>}
        </span>
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

function Registry({ agents, policies, audit, treatments, gates, openAgent, onOpenRegister }) {
  const ctx = { audit, treatments, gates };
  const stepFor = a => nextStep(a, ctx);
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
  const matchStatus = (r, v = status) => v === "all" || (v === "conflict" ? operatingState(r.a, ctx).state === "conflict" : r.a.status === v);
  const base = rows.filter(r => matchQ(r) && matchFw(r));
  const shown = base.filter(r => matchRisk(r) && matchStatus(r));
  const filtered = q || risk !== "all" || status !== "all" || fw !== "all";

  const riskChips = [["all", "All risk levels"], ["CRITICAL", "Critical"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]];
  const statusChips = [["all", "Any status"], ["active", "Active"], ["conflict", "Gate conflict"], ["pending", "Pending review"], ["suspended", "Suspended"]];

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
                  <StatePill agent={a} ctx={ctx} />
                  <Pill fg={r.fg} bg={r.bg} border={r.border}>{a.score} {a.risk}</Pill>
                  <span style={{ marginLeft: "auto" }}><ControlsBadge m={m} /></span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <WorstRisk agent={a} treatments={treatments} />
                  {stepFor(a) && <span style={{ fontSize: 11.5, color: T.faint }}>{stepFor(a)}</span>}
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
                  {["Agent", "Department", "Status", "Agent score", "Frameworks", "Controls in place", ""].map((h, i) => (
                    <th key={i} scope="col" style={{ padding: "13px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
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
                        <StatePill agent={a} ctx={ctx} />
                        {stepFor(a) && <div style={{ fontSize: 11.5, color: a.status === "suspended" || operatingState(a, ctx).state === "conflict" ? (T.isDark ? "#f43f5e" : "#e11d48") : T.faint, marginTop: 5, whiteSpace: "nowrap" }}>{stepFor(a)}</div>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {a.risk === "CRITICAL" && <ShieldAlert size={14} color={r.fg} />}
                          <Pill fg={r.fg} bg={r.bg} border={r.border}>{a.score} {a.risk}</Pill>
                        </span>
                        <div style={{ marginTop: 5 }}><WorstRisk agent={a} treatments={treatments} /></div>
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
          <span>Approved by <span style={{ color: T.text, fontWeight: 600 }}>{p.approvedBy}</span> · <span style={{ whiteSpace: "nowrap" }}>{p.approvedOn}</span>{p.approvalSource === "recorded" ? " · recorded from outside ARGUS" : ""}</span>
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

function PolicyEngine({ policies, reqMap, toggle, onOpenCreate, onApprove, agents, onTest, onRevise }) {
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
            <Card key={p.id} id={`policy-${p.id}`} style={{ display: "flex", flexDirection: "column", opacity: p.enabled ? 1 : 0.75, transition: "opacity .15s", scrollMarginTop: 20 }}>
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
                <ControlEvidence p={p} agents={agents} onTest={onTest} onRevise={onRevise} />
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


/* ---------------- frameworks ---------------- */

function Frameworks({ assessment, gapKeys, policies, onOpen, onAdopt }) {
  const T = useT();
  const [group, setGroup] = useState("all");
  const frameworks = assessment.frameworks;
  const list = frameworks.filter(f => group === "all" || f.group === group);

  const summary = [
    ...assessmentTiles(T, assessment),
    { label: "Frameworks tracked", value: frameworks.length, color: T.text, sub: `${assessment.total} curated requirements, ${assessment.na} excluded` },
    { label: "Unmapped requirements", value: assessment.unmapped, color: T.isDark ? "#f59e0b" : "#b45309", sub: "Applicable requirements with no live control" },
  ];

  return (
    <div>
      <PageHeader title="Frameworks" subtitle="Requirement-to-control traceability across AI regulations, standards and threat frameworks. Open a framework to see which policies satisfy each requirement and to close gaps." />

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 140 : 180}px, 1fr))`, gap: T.mobile ? 10 : 14, marginTop: 20 }}>
        {summary.map(s => (
          <Card key={s.label} style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{s.label}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            {s.sub && <div style={{ color: T.faint, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>}
          </Card>
        ))}
      </div>
      <MethodNote a={assessment} style={{ marginTop: 10 }} />

      <RecommendationPlan gapKeys={gapKeys} policies={policies} onAdopt={onAdopt} totalGaps={assessment.unmapped} />

      <div style={{ display: "flex", gap: 8, flexWrap: T.mobile ? "nowrap" : "wrap", overflowX: "auto", margin: "20px 0 16px", paddingBottom: 2 }}>
        {[{ id: "all", label: "All" }, ...FRAMEWORK_GROUPS].map(g => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label}
            count={frameworks.filter(f => g.id === "all" || f.group === g.id).length} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))", gap: T.mobile ? 12 : 16 }}>
        {list.map(f => {
          const gaps = f.unmapped;
          const level = Math.max(1, Math.min(5, 1 + Math.round(((f.coveragePct ?? 0) / 100) * 4)));
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
                <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Mapped coverage"} covered={f.mapped} total={f.applicable} pct={f.coveragePct} fulfillment={f.fulfillmentPct} />
                <div style={{ color: gaps ? (T.isDark ? "#f59e0b" : "#b45309") : T.faint, fontSize: 12.5, marginTop: 8 }}>
                  {f.applicable === 0 ? "No agent in scope" : gaps ? `${gaps} unmapped requirement${gaps > 1 ? "s" : ""}` : "Every applicable requirement mapped"}
                  {f.na > 0 && f.applicable > 0 && <span style={{ color: T.faint }}> · {f.na} excluded</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ color: T.faint, fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
        {SCOPE_DISCLAIMER} {COVERAGE_METHOD}
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
  const level = Math.max(1, Math.min(5, 1 + Math.round(((f.coveragePct ?? 0) / 100) * 4)));
  const GS = GAP_STYLE(T);

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
          <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Mapped control coverage"} covered={f.mapped} total={f.applicable} pct={f.coveragePct} fulfillment={f.fulfillmentPct} />
          <div style={{ fontSize: 12, color: T.faint, marginTop: 6, lineHeight: 1.5 }}>
            {f.met} met · {f.partial} partially met · {f.notMet} not met{f.na ? ` · ${f.na} not applicable` : ""}. Curated subset of the framework, not a compliance determination.
          </div>
        </div>

        {f.note && (
          <div style={{ display: "flex", gap: 10, background: T.blueSoft, border: `1px solid ${T.blueBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <Info size={15} color={T.blue} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.55, color: T.text }}>{f.note}</div>
          </div>
        )}

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Requirements</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {f.rows.map(req => {
            const na = req.status === "Not applicable";
            const linkedPolicies = req.refs.filter(x => !x.startsWith("cap:")).map(x => byId[x]).filter(Boolean);
            const caps = req.refs.filter(x => x.startsWith("cap:")).map(x => CAPABILITIES[x.slice(4)]);
            const gapOpen = !req.covered && !na;
            const disabledOnly = !req.covered && linkedPolicies.length > 0;
            const linkable = policies.filter(p => !req.refs.includes(p.id));
            return (
              <div key={req.key} style={{ background: T.panelSoft, border: `1px solid ${!gapOpen ? T.border : (T.isDark ? "rgba(245,158,11,.35)" : "rgba(180,83,9,.3)")}`, borderRadius: 10, padding: "12px 14px", opacity: na ? .75 : 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {!gapOpen
                    ? <CheckCircle2 size={16} color={green} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <AlertCircle size={16} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.blue, fontFamily: "ui-monospace, monospace" }}>{req.id}</span>
                      <Pill small fg={GS[req.status].fg} bg={GS[req.status].bg} border={GS[req.status].border}>{req.status}</Pill>
                    </div>
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

                    {na && <div style={{ fontSize: 12.5, color: T.faint, marginTop: 8, lineHeight: 1.45 }}>Excluded: {req.basis.replace(/^Marked not applicable: /, "")}</div>}
                    {gapOpen && (
                      <div style={{ fontSize: 12.5, color: amber, marginTop: 8, lineHeight: 1.45 }}>
                        {!disabledOnly ? "Gap: no control mapped yet."
                          : linkedPolicies.some(p => p.status === "draft") ? "Gap: the mapped policy is awaiting approval."
                          : "Gap: the mapped policy is disabled."}
                      </div>
                    )}

                    {gapOpen && !disabledOnly && recommendationFor(req.key) && (
                      <RecommendedControl tpl={recommendationFor(req.key)} reqKey={req.key} gapKeys={gapKeys}
                        policies={policies} onAdopt={onAdopt} />
                    )}

                    {gapOpen && (
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

const CONTROL_LABEL = { active: "Effective", violated: "Violated", draft: "Draft", disabled: "Off", missing: "Not adopted", untested: "Untested", stale: "Test stale", failed: "Failed test" };

// Live status of any policy or recommended control, including violations by a given agent
const controlStatus = (id, policies, audit = [], agentName) => {
  const p = policies.find(x => x.id === id);
  const tpl = RECOMMENDED_POLICIES.find(t => t.id === id);
  const violated = !!agentName && audit.some(e => e.agent === agentName && e.type === "Policy Violation" && e.policy === id);
  const base = violated ? "violated" : !p ? "missing" : p.status === "draft" ? "draft" : !p.enabled ? "disabled" : "active";
  const eff = base === "active" ? effectiveness(p).state : null;
  const state = base === "active" && eff !== "effective" ? eff : base;
  return { id, name: p?.name ?? tpl?.name ?? id, state, template: tpl };
};

function ControlPill({ c }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const amber = T.isDark ? "#f59e0b" : "#b45309";
  const st = c.state === "active" ? { fg: T.blue, bg: T.blueSoft, border: T.blueBorder }
    : c.state === "violated" || c.state === "failed" ? { fg: red, bg: T.isDark ? "rgba(244,63,94,.1)" : "rgba(225,29,72,.07)", border: T.isDark ? "rgba(244,63,94,.4)" : "rgba(225,29,72,.3)" }
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
  if (["untested", "stale", "failed"].includes(c.state) && actions.testPolicy) return <button style={btn} onClick={() => actions.testPolicy(c.id)}><BadgeCheck size={12} /> Record test</button>;
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

const downloadFile = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const addDays = n => addDaysISO(n);

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
      <Provenance agent={agent} arch={arch} />
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
  const { user } = useActor();
  const [rev, setRev] = useState(agent.rev || 0);
  const [by, setBy] = useState("");
  const [due, setDue] = useState(addDays(60));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const activation = req.kind === "activation";
  const maxDue = addDays(CONDITION_MAX_DAYS);
  const perm = can(user, "agent.approve", { agent, requester: agent.review?.byUser });
  const byOk = by && by !== agent.owner && perm.ok;
  const dueOk = due && due <= maxDue && due > addDays(0);
  const changed = (agent.rev || 0) !== rev;
  return (
    <div style={{ marginTop: 12, background: T.panel, border: `1px solid ${T.blueBorder}`, borderRadius: 10, padding: 13 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Approver decision</div>
      <div style={{ fontSize: 12.5, color: T.dim, marginTop: 2, lineHeight: 1.45 }}>
        Must be someone other than the owner ({agent.owner}).
        {activation && !req.done && ` ${req.open.length} item${req.open.length === 1 ? " is" : "s are"} still open, so this can only be a conditional activation.`}
        {!activation && !req.done && " Reinstatement needs every item met first."}
      </div>
      <div style={{ marginTop: 10 }}>
        <label htmlFor={`approve-${agent.id}`} style={labelStyle(T)}>Decide as (your role)</label>
        <select id={`approve-${agent.id}`} value={by} onChange={e => setBy(e.target.value)} style={fieldStyle(T)}>
          <option value="">Select role…</option>
          {user.roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <NotAllowed action="agent.approve" ctx={{ agent, requester: agent.review?.byUser }} compact />
      </div>
      {changed && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12.5, color: T.warnBox.fg, background: T.warnBox.bg, border: `1px solid ${T.warnBox.border}`, borderRadius: 8, padding: "8px 11px" }}>
          {agent.name} changed after you opened this decision. Check the requirements again.{" "}
          <button onClick={() => setRev(agent.rev || 0)} style={{ background: "none", border: "none", color: T.blue, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12.5 }}>I've reviewed the latest</button>
        </div>
      )}
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
            <button disabled={!byOk || !reason.trim()} onClick={() => life.decide(agent.id, { decision: "reject", by, reason: reason.trim(), rev })} style={btnStyle(T, true, byOk && !!reason.trim())}>Return to owner</button>
            <button onClick={() => setRejecting(false)} style={btnStyle(T, false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {req.done
            ? <button disabled={!byOk} onClick={() => life.decide(agent.id, { decision: "approve", by, rev })} style={btnStyle(T, true, byOk)}><BadgeCheck size={14} /> {activation ? "Approve activation" : "Approve reinstatement"}</button>
            : activation && <button disabled={!byOk || !dueOk} onClick={() => life.decide(agent.id, { decision: "conditional", by, due, rev })} style={btnStyle(T, true, byOk && dueOk)}><BadgeCheck size={14} /> Approve with conditions</button>}
          {!activation && !req.done && <button disabled style={btnStyle(T, true, false)}>Approve reinstatement</button>}
          <button onClick={() => setRejecting(true)} style={btnStyle(T, false)}>Return to owner</button>
        </div>
      )}
    </div>
  );
}

function LifecycleCard({ agent, policies, audit, treatments, gates, actions, life, onShowTab }) {
  const T = useT();
  const red = T.isDark ? "#f43f5e" : "#e11d48";
  const green = T.isDark ? "#34d399" : "#059669";
  const ctx = { audit, treatments, gates };

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

      {!agent.review && <NotAllowed action="agent.owner" ctx={{ agent }} why="The owner works this checklist." />}
      <div>
        {req.items.map(it => <RequirementRow key={it.id} item={it} agent={agent} policies={policies} audit={audit} actions={actions} life={life} onShowTab={onShowTab} />)}
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        {agent.review ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <b>Submitted for {req.kind}</b> by {agent.review.byName || agent.review.by} for {agent.owner} on {agent.review.on}. Awaiting an independent approver.
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

function AgentDrawer({ agent, audit, policies, actions, treatments, gates, life, onClose, onUpdateTraits, onExclude, onInclude }) {
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
          <button onClick={() => { setView("overview"); setTimeout(() => (document.getElementById("gate-card") || document.getElementById("lifecycle-card"))?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
            title="Show status and next steps" aria-label={`Status ${STATE_LABEL[operatingState(agent, { audit, treatments, gates }).state]}. Show next steps`}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <StatePill agent={agent} ctx={{ audit, treatments, gates }} />
          </button>
          <Pill fg={r.fg} bg={r.bg} border={r.border}>{agent.score} {agent.risk}</Pill>
          <span style={{ alignSelf: "center" }}><WorstRisk agent={agent} treatments={treatments} prefix="Worst scenario" /></span>
          {nextStep(agent, { audit, treatments, gates }) && <span style={{ fontSize: 12, color: T.faint, alignSelf: "center", flexBasis: "100%" }}>{nextStep(agent, { audit, treatments, gates })}</span>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <SegTabs value={view} onChange={setView} tabs={[["overview", "Overview"], ["architecture", "Architecture"], ["risk", `Risk (${agent.score})`]]} />
        </div>
        {view === "architecture" && <ArchitectureTab agent={agent} policies={policies} audit={audit} actions={actions} />}
        {view === "risk" && <AgentRiskTab agent={agent} policies={policies} audit={audit} actions={actions} />}
        {view === "overview" && (<>
        <GateCard agent={agent} policies={policies} audit={audit} actions={actions} life={life} ctx={{ audit, treatments, gates }} />
        <LifecycleCard agent={agent} policies={policies} audit={audit} treatments={treatments} gates={gates} actions={actions} life={life} onShowTab={setView} />
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
  const { user: actor } = useActor();
  const sameOwner = f.treatment === "Accept" && f.accBy && (f.accBy === f.owner || !can(actor, "risk.accept", { owner: f.owner, role: f.accBy }).ok);
  const valid = f.owner && f.reviewOn && (f.treatment !== "Accept" || (f.accReason.trim() && f.accBy && !sameOwner)) && (!["Transfer", "Avoid"].includes(f.treatment) || f.note.trim());
  const save = () => onSave(entry.id, {
    treatment: f.treatment, owner: f.owner, reviewOn: f.reviewOn, note: f.note.trim(),
    acceptance: f.treatment === "Accept" ? { by: f.accBy, reason: f.accReason.trim(), on: localISO() } : null,
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
                <label htmlFor="accept-role" style={labelStyle(T)}>Accept as (your role)</label>
                <select id="accept-role" style={fieldStyle(T)} value={f.accBy} onChange={e => set({ accBy: e.target.value })}>
                  <option value="">Select role…</option>
                  {actor.roles.filter(r => r !== f.owner).map(r => <option key={r}>{r}</option>)}
                </select>
                <NotAllowed action="risk.accept" ctx={{ owner: f.owner }} compact />
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

function GapAssessment({ assessment, policies, actions, onGapField, onMarkNA }) {
  const gap = assessment.frameworks;
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
        {assessmentTiles(T, assessment).map(k => (
          <Card key={k.label} style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{k.label}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
          </Card>
        ))}
        {GAP_STATUS.map(st => (
          <Card key={st} onClick={() => setStatus(status === st ? "all" : st)} style={{ padding: T.mobile ? "12px 14px" : "16px 18px", cursor: "pointer", borderColor: status === st ? GS[st].fg : T.border }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{st}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: GS[st].fg, marginTop: 4 }}>{totals(st)}</div>
          </Card>
        ))}
      </div>
      <MethodNote a={assessment} style={{ marginTop: 8 }} />

      <Card style={{ marginTop: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: T.mobile ? 520 : 0 }}>
            <thead>
              <tr style={{ background: T.panelSoft, color: T.dim, fontSize: 12.5, textAlign: "left" }}>
                {["Framework", "Met", "Partial", "Not met", "N/A", "Mapped", "Fulfillment"].map(h => <th key={h} scope="col" style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
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
                  <td style={{ padding: "9px 12px", fontSize: 13, whiteSpace: "nowrap" }}>{f.coveragePct === null ? "—" : `${f.mapped}/${f.applicable} · ${f.coveragePct}%`}</td>
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

function ReportBody({ scored, register, assessment, treatments, policies, today }) {
  const T = useT();
  const tr = s => treatments[s.id] || defaultTreatment(s);
  const gap = assessment.frameworks;
  const rows = assessment.rows;
  const count = st => rows.filter(r => r.status === st).length;
  const applicable = assessment.applicable;
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
          <div style={{ color: T.dim }}>Point-in-time report · assessed {fmtWhen(assessment.asOf)}</div>
        </div>
        <PanoptesMark size={40} color={T.text} />
      </div>
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 8 }}>
        Scope: {scored.length} AI agents, {gap.length} frameworks, {register.length} risk scenarios. Demo environment: all agents, events and evidence are synthetic.
      </div>

      <H2>Summary</H2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[["Requirement fulfillment", `${assessment.fulfillmentPct ?? 0}%`], ["Mapped control coverage", `${assessment.coveragePct ?? 0}% (${assessment.mapped}/${applicable})`], ["Requirements not met", count("Not met")], ["Untreated critical scenarios", register.filter(s => s.residual.score >= 16 && tr(s).treatment === "Mitigate").length]].map(([l, v]) => (
          <div key={l} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10.5, color: T.dim }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: "10px 0 0" }}>
        Of {applicable} applicable requirements ({assessment.na} excluded as not applicable), {count("Met")} are met, {count("Partially met")} partially met and {count("Not met")} not met; {assessment.mapped} have a live control mapped.
        Residual risk across {register.length} scenarios: {lvls.map(l => `${register.filter(s => riskLevel(s.residual.score) === l).length} ${lvlName(l).toLowerCase()}`).join(", ")}.
        {accepted.length ? ` ${accepted.length} risk${accepted.length > 1 ? "s have" : " has"} been formally accepted.` : " No risks have been formally accepted."}
      </p>

      <p style={{ margin: "6px 0 0", fontSize: 11.5, color: T.dim }}>{SCOPE_DISCLAIMER}</p>

      <H2>Requirement status by framework</H2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Framework", "Met", "Partial", "Not met", "N/A", "Mapped coverage", "Fulfillment"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{gap.map(f => (
          <tr key={f.id}><td style={td}>{f.name}</td><td style={td}>{f.met}</td><td style={td}>{f.partial}</td><td style={td}>{f.notMet}</td><td style={td}>{f.na}</td>
            <td style={td}>{f.coveragePct === null ? "Not in scope" : `${f.mapped}/${f.applicable} (${f.coveragePct}%)`}</td>
            <td style={{ ...td, fontWeight: 700 }}>{f.fulfillmentPct === null ? "Not in scope" : `${f.fulfillmentPct}%`}</td></tr>
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
        <thead><tr>{["Agent", "Status", "Score", "Level", "Worst untreated scenario", "Highest residual risks", "Open violations"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{[...scored].sort((a, b) => b.score - a.score).map(a => {
          const w = worstScenario(a, treatments).worstUntreated;
          return (
            <tr key={a.id}>
              <td style={td}>{a.name}</td><td style={td}>{a.status}</td><td style={{ ...td, fontWeight: 700 }}>{a.score}</td><td style={td}>{lvlName(a.risk)}</td>
              <td style={{ ...td, fontWeight: w && w.residual.score >= 16 ? 700 : 400 }}>{w ? `${w.id} · ${w.residual.score} ${lvlName(riskLevel(w.residual.score))}` : "None"}</td>
              <td style={td}>{a.scoreBreakdown.top.join(", ")}</td><td style={td}>{a.scoreBreakdown.crit} critical, {a.scoreBreakdown.warn} warning</td>
            </tr>
          );
        })}</tbody>
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
        <li>Requirement status: Met needs an always-on platform capability or an approved, enabled policy with evidence on file. An approved policy without evidence, or a draft, is Partially met. {FULFILLMENT_METHOD} {EXCLUSION_METHOD}</li>
        <li>{COVERAGE_METHOD}</li>
        <li>An agent's aggregate score averages its three highest residual risks, so the worst untreated scenario is reported separately. Operating gates flag any active agent with an untreated critical scenario regardless of its aggregate score.</li>
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

function Assessments({ scored, register, assessment, policies, audit, treatments, actions, onSaveTreatment, onGapField, onMarkNA, onOpenAgent, focus, onFocusDone }) {
  const T = useT();
  const [tab, setTab] = useState("risk");
  const [openId, setOpenId] = useState(null);
  useEffect(() => {
    if (!focus) return;
    if (focus.startsWith("tab:")) setTab(focus.slice(4));
    else { setTab("risk"); setOpenId(focus); }
    onFocusDone();
  }, [focus]);
  const entry = openId && register.find(s => s.id === openId);
  return (
    <div>
      <PageHeader title="Risk & Gap Assessment" subtitle="AI risk register scored for inherent, residual and target risk, a requirement-by-requirement gap assessment across every framework, and a report you can share." />
      <div style={{ margin: "18px 0" }}>
        <SegTabs value={tab} onChange={setTab} tabs={[["risk", "Risk register", <Grid3x3 size={14} key="i" />], ["gap", "Gap assessment", <ClipboardCheck size={14} key="i" />], ["report", "Report", <FileText size={14} key="i" />]]} />
      </div>
      {tab === "risk" && <RiskRegister register={register} treatments={treatments} onOpen={setOpenId} />}
      {tab === "gap" && <GapAssessment assessment={assessment} policies={policies} actions={actions} onGapField={onGapField} onMarkNA={onMarkNA} />}
      {tab === "report" && <AssessmentReport scored={scored} register={register} assessment={assessment} treatments={treatments} policies={policies} />}
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
  const [testing, setTesting] = useState(null);
  // simulated identity: who is acting. Checks run in the browser only (see identity.js).
  const [userId, setUserId] = useState(DEFAULT_USER.id);
  const user = DEMO_USERS.find(u => u.id === userId) || DEFAULT_USER;
  const userRef = useRef(user);
  userRef.current = user;
  const evSeq = useRef(SEED_AUDIT.length);

  const [treatments, setTreatments] = useState({});
  const [gates, setGates] = useState(DEFAULT_GATES);
  const [gapOverrides, setGapOverrides] = useState({});
  const [riskFocus, setRiskFocus] = useState(null);
  // agent risk scores, the risk register and the gap assessment are all derived from current state
  const scored = useMemo(() => agents.map(a => ({ ...a, ...scoreAgent(a, policies, audit) })), [agents, policies, audit]);
  const register = useMemo(() => buildRegister(scored), [scored]);
  // one assessment feeds the dashboard, frameworks, gap assessment and report
  const assessment = useMemo(() => buildAssessment(reqMap, policies, scored, gapOverrides), [reqMap, policies, scored, gapOverrides]);
  const openFramework = fwOpen ? assessment.frameworks.find(f => f.id === fwOpen) : null;
  const gapKeys = assessment.gapKeys;
  const decisions = useMemo(() => decisionQueue({ scored, register, policies, audit, treatments, gates, assessment, gapOverrides }),
    [scored, register, policies, audit, treatments, gates, assessment, gapOverrides]);

  useEffect(() => { if (!mobile) setNavOpen(false); }, [mobile]);

  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Append-only: events are only ever added, sealed into the checksum chain, and free text is redacted first
  const log = (sev, type, agent, desc, extra = {}) => {
    const at = Date.now();
    const u = userRef.current;
    const { role, actor, ...rest } = extra;
    const eid = `EVT-${String(++evSeq.current).padStart(4, "0")}`;
    const ev = { eid, sev, at, ts: fmtWhenLong(at), type, agent, desc: redact(desc), outcome: "success", ...rest,
      actor: actor || { name: u.name, role: role || u.roles[0] || "Agent owner" } };
    setAudit(list => [seal(ev, list), ...list]);
  };
  const denied = (label, reason, agent = "—") => {
    notify(reason);
    log("warn", "Action Denied", agent || "—", `${label} denied for ${userRef.current.name}: ${reason}`, { outcome: "denied" });
  };
  // the browser-side stand-in for a server authorization check
  const allowed = (action, ctx, label, agent) => {
    const r = can(userRef.current, action, ctx);
    if (!r.ok) denied(label, r.reason, agent);
    return r.ok;
  };
  const actAs = id => {
    const u = DEMO_USERS.find(x => x.id === id);
    if (!u || u.id === userRef.current.id) return;
    setUserId(id);
    notify(`Now acting as ${u.name} (simulated)`);
  };

  const resetDemo = () => {
    setAgents(SEED_AGENTS);
    setPolicies(SEED_POLICIES);
    setAudit(SEED_AUDIT);
    setReqMap(SEED_REQ_MAP);
    setTreatments({});
    setRiskFocus(null);
    setGates(DEFAULT_GATES);
    setGapOverrides({});
    evSeq.current = SEED_AUDIT.length;
    setTesting(null);
    setDetailId(null);
    setFwOpen(null);
    setModal(null);
    setApproving(null);
    notify("Demo data reset to its original state");
  };

  const togglePolicy = id => {
    const p = policies.find(x => x.id === id);
    if (!allowed("policy.manage", {}, p?.enabled ? "Disabling a policy" : "Enabling a policy")) return;
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (p) log("info", "Policy Change", "—", `Policy "${p.name}" ${p.enabled ? "disabled" : "enabled"}`, { entity: { kind: "policy", id, version: p.version || 1 }, before: { enabled: p.enabled }, after: { enabled: !p.enabled } });
  };

  const linkPolicy = (key, policyId) => {
    if (!allowed("policy.manage", {}, "Control mapping")) return;
    setReqMap(m => ({ ...m, [key]: [...(m[key] || []), policyId] }));
    const [fwId, idx] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const req = fw?.requirements[Number(idx)];
    const p = policies.find(x => x.id === policyId);
    if (fw && req && p) {
      log("info", "Control Mapped", "—", `"${p.name}" mapped to ${fw.short} ${req.id} (${req.title})`, { entity: { kind: "mapping", id: key }, after: { policy: policyId } });
      notify(`Mapped to ${fw.short} ${req.id}`);
    }
  };

  const openCreatePolicy = (templateId = null) => { setPolicyTemplate(templateId); setModal("policy"); };

  // From a recommendation: approve a draft, re-enable a disabled policy, or open the form pre-filled from the template
  const adoptRecommendation = tpl => {
    if (!allowed("policy.manage", {}, "Adopting a recommended control")) return;
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
    if (!allowed("policy.approve", { role: a.approvedBy, owner: p.owner, requester: p.revisedBy || p.createdBy }, `Approval of "${p.name}"`)) return;
    const v = p.version || 1;
    const u = userRef.current;
    const doc = a.doc && a.doc !== p.doc ? { ...a.doc, version: v } : p.doc;
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, status: "approved", approvedBy: a.approvedBy, approvedOn: a.approvedOn, approvedVersion: v, approvedByUser: u.id, approvalSource: "argus", doc } : x));
    if (a.doc && a.doc !== p.doc) log("info", "Document Uploaded", "—", `"${a.doc.name}" (v${v}, ${fmtSize(a.doc.size)}, SHA-256 ${a.doc.sha256?.slice(0, 12)}…) attached to policy "${p.name}"`, { entity: { kind: "policy", id, version: v } });
    log("info", "Policy Approved", "—", `${u.name} (${a.approvedBy}) approved version ${v} of "${p.name}" on ${a.approvedOn}${closing.length ? `; closes ${closing.map(reqLabel).join(", ")}` : ""}`,
      { role: a.approvedBy, entity: { kind: "policy", id, version: v }, before: { status: p.status }, after: { status: "approved", version: v } });
    setApproving(null);
    notify(closing.length ? `Approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy approved by ${a.approvedBy}`);
  };

  const openAgent = name => {
    const a = agents.find(x => x.name === name);
    if (a) setDetailId(a.id);
  };

  const updateAgent = (id, patch) => setAgents(as => as.map(a => a.id === id ? { ...a, ...(typeof patch === "function" ? patch(a) : patch), rev: (a.rev || 0) + 1 } : a));
  const today = () => localISO();

  // Agent lifecycle: owner works the requirements and submits; an independent approver decides.
  // Every command is validated first (who, state, and whether the record changed since it was opened).
  const ctxNow = { audit, treatments, gates };
  const command = (id, cmd, label) => {
    const a = scored.find(x => x.id === id);
    const r = checkCommand(a, cmd, userRef.current, ctxNow);
    if (!r.ok) denied(label, r.reason, a?.name);
    return r.ok ? a : null;
  };
  const agentEntity = a => ({ kind: "agent", id: a.name, version: a.rev || 0 });
  const life = {
    attest: (id, key) => {
      const a = command(id, { type: "attest" }, "Owner attestation"); if (!a) return;
      const u = userRef.current;
      updateAgent(id, x => ({ attest: { ...(x.attest || {}), [key]: { by: u.name, on: today() } } }));
      log("info", "Owner Attestation", a.name, `${u.name} (owner, ${a.owner}) confirmed ${a.name}'s ${key === "arch" ? "architecture" : "characteristics"} are accurate`, { role: "Agent owner", entity: agentEntity(a) });
    },
    rootCause: (id, vid, v) => {
      const a = command(id, { type: "rootCause" }, "Root cause"); if (!a) return;
      const clean = { cause: redact(v.cause), fix: redact(v.fix) };
      updateAgent(id, x => ({ resolutions: { ...(x.resolutions || {}), [vid]: { ...clean, by: userRef.current.name, on: today() } } }));
      log("info", "Root Cause Recorded", a.name, `Root cause recorded for ${a.name} violation ${vid}: ${clean.cause}. Fix: ${clean.fix}`, { role: "Agent owner", entity: agentEntity(a) });
    },
    retest: (id, pid, evidence) => {
      const a = command(id, { type: "retest" }, "Control re-test"); if (!a) return;
      const p = policies.find(x => x.id === pid);
      const u = userRef.current;
      const ev = redact(evidence);
      updateAgent(id, x => ({ retests: { ...(x.retests || {}), [pid]: { evidence: ev, by: u.name, on: today() } } }));
      // the re-test is also control evidence, scoped to this agent and bound to the policy version
      if (p) setPolicies(ps => ps.map(x => x.id === pid ? { ...x, tests: [...(x.tests || []), newTest({ policy: x, result: "pass", evidence: ev, owner: `${a.owner} (agent owner)`, by: u.name, scope: [a.id] })] } : x));
      log("info", "Control Re-tested", a.name, `"${p?.name}" re-tested against ${a.name} and passed: ${ev}`, { role: "Agent owner", entity: { kind: "policy", id: pid, version: p?.version || 1 }, after: { result: "pass", scope: a.name } });
      notify(`${p?.name} re-tested`);
    },
    autonomy: (id, level) => {
      const a = command(id, { type: "autonomy" }, "Autonomy change"); if (!a) return;
      updateAgent(id, { autonomy: level });
      log("info", "Autonomy Change", a.name, `${a.name} autonomy reduced from ${a.autonomy.toLowerCase()} to ${level.toLowerCase()}`, { role: "Agent owner", entity: agentEntity(a), before: { autonomy: a.autonomy }, after: { autonomy: level } });
      notify(`${a.name} is now ${level.toLowerCase()}`);
    },
    submit: (id, kind) => {
      const a = command(id, { type: "submit" }, `Submission for ${kind}`); if (!a) return;
      const r = requirements(a, kind, ctxNow);
      const u = userRef.current;
      const correlation = `SUB-${Date.now().toString(36).toUpperCase()}`;
      updateAgent(id, { review: { kind, by: a.owner, byUser: u.id, byName: u.name, on: today(), at: Date.now(), correlation } });
      log("info", kind === "activation" ? "Submitted for Activation" : "Submitted for Reinstatement", a.name,
        `${u.name} submitted ${a.name} for ${kind} with ${r.met} of ${r.total} requirements met`, { role: "Agent owner", entity: agentEntity(a), correlation, after: { review: kind } });
      notify("Submitted for approval");
    },
    withdraw: id => {
      const a = command(id, { type: "withdraw" }, "Withdrawal"); if (!a) return;
      updateAgent(id, { review: null });
      log("info", "Submission Withdrawn", a.name, `${userRef.current.name} withdrew ${a.name}'s submission`, { role: "Agent owner", entity: agentEntity(a), correlation: a.review?.correlation });
    },
    decide: (id, dec) => {
      const kind0 = scored.find(x => x.id === id)?.status === "pending" ? "activation" : "reinstatement";
      const a = command(id, { type: "decide", ...dec }, `${kind0[0].toUpperCase() + kind0.slice(1)} decision`); if (!a) return;
      const kind = kind0;
      const u = userRef.current;
      const meta = { role: dec.by, entity: agentEntity(a), correlation: a.review?.correlation };
      // apply only if nothing changed between the check and the write (two approvers deciding at once)
      const guarded = patch => setAgents(as => as.map(x => x.id === id && (x.rev || 0) === (a.rev || 0) && x.review ? { ...x, ...patch, rev: (x.rev || 0) + 1 } : x));
      const stamp = { by: dec.by, byUser: u.id, byName: u.name, on: today(), rev: a.rev || 0 };
      if (dec.decision === "reject") {
        const reason = redact(dec.reason);
        guarded({ review: null, lastDecision: { decision: "reject", reason, ...stamp } });
        log("warn", kind === "activation" ? "Activation Returned" : "Reinstatement Returned", a.name, `${u.name} (${dec.by}) returned ${a.name} to its owner: ${reason}`, { ...meta, before: { review: kind }, after: { review: null } });
        notify("Returned to owner");
        return;
      }
      if (kind === "activation") {
        const r = requirements(a, "activation", ctxNow);
        const conditional = dec.decision === "conditional";
        guarded({
          status: "active", review: null, lastDecision: { decision: dec.decision, ...stamp },
          conditions: conditional ? { items: r.open.map(i => i.id), due: dec.due, by: dec.by, on: today() } : null,
        });
        log("info", conditional ? "Agent Conditionally Activated" : "Agent Activated", a.name, conditional
          ? `${u.name} (${dec.by}) activated ${a.name} with conditions. Open items due ${dec.due}: ${r.open.map(i => i.label.replace(/ \(.*\)$/, "").toLowerCase()).join("; ")}`
          : `${u.name} (${dec.by}) activated ${a.name} with all requirements met`, { ...meta, before: { status: "pending" }, after: { status: "active", conditional } });
        notify(`${a.name} activated${conditional ? " with conditions" : ""}`);
      } else {
        guarded({
          status: "active", review: null, lastDecision: { decision: "approve", ...stamp },
          pastSuspension: a.suspension, suspension: null,
          probation: { until: addDays(PROBATION_DAYS), by: dec.by, on: today() },
        });
        log("info", "Agent Reinstated", a.name, `${u.name} (${dec.by}) reinstated ${a.name} with all remediation complete. On probation until ${addDays(PROBATION_DAYS)}`, { ...meta, before: { status: "suspended" }, after: { status: "active", probationUntil: addDays(PROBATION_DAYS) } });
        notify(`${a.name} reinstated on ${PROBATION_DAYS}-day probation`);
      }
    },
    openRisk: sid => { setDetailId(null); setView("assessments"); setNavOpen(false); setRiskFocus(sid); },
    grantException: (id, ex) => {
      const a = command(id, { type: "grantException", ...ex }, "Gate exception"); if (!a) return;
      const u = userRef.current;
      const reason = redact(ex.reason);
      updateAgent(id, { exception: { ...ex, reason, byUser: u.id, byName: u.name, on: today(), at: Date.now() } });
      log("warn", "Gate Exception Approved", a.name, `${u.name} (${ex.by}) approved an exception for ${a.name} until ${ex.until} covering ${ex.gates.join(", ")}: ${reason}`, { role: ex.by, entity: agentEntity(a), after: { exceptionUntil: ex.until } });
      notify(`Exception approved until ${ex.until}`);
    },
    revokeException: id => {
      const a = command(id, { type: "revokeException" }, "Exception revocation"); if (!a) return;
      updateAgent(id, { exception: null });
      log("info", "Gate Exception Revoked", a.name, `${userRef.current.name} revoked the exception for ${a.name}`, { entity: agentEntity(a), before: { exceptionUntil: a.exception.until }, after: { exceptionUntil: null } });
    },
    suspend: (id, d) => {
      const a = command(id, { type: "suspend", ...d }, "Suspension"); if (!a) return;
      const at = Date.now();
      const u = userRef.current;
      const reason = redact(d.reason);
      updateAgent(id, { status: "suspended", exception: null, conditions: null, probation: null, review: null,
        suspension: { on: fmtWhen(at), at, by: `${u.name} (${d.by})`, reason, autonomy: a.autonomy } });
      log("critical", "Agent Suspended", a.name, `${u.name} (${d.by}) suspended ${a.name}: ${reason}`, { role: d.by, entity: agentEntity(a), before: { status: "active" }, after: { status: "suspended" } });
      notify(`${a.name} suspended`);
    },
    reviewPolicy: pid => {
      const p = policies.find(x => x.id === pid);
      if (!allowed("policy.manage", {}, "Policy review")) return;
      setPolicies(ps => ps.map(x => x.id === pid ? { ...x, reviewedOn: today() } : x));
      log("info", "Policy Reviewed", "—", `Annual review of "${p.name}" recorded; next review due in 12 months`, { entity: { kind: "policy", id: pid, version: p.version || 1 } });
      notify("Policy review recorded");
    },
    setGates: patch => {
      if (!allowed("gates.configure", {}, "Gate configuration")) return;
      setGates(g => ({ ...g, ...patch }));
      log("warn", "Gate Configuration Changed", "—", `Operating gates changed: ${Object.entries(patch).map(([k, v]) => `${k} = ${v}`).join(", ")}`, { role: "AI Governance Committee", entity: { kind: "config", id: "operating-gates" }, before: Object.fromEntries(Object.keys(patch).map(k => [k, gates[k]])), after: patch });
      notify("Operating gates updated");
    },
  };

  // Control testing and versioning
  const recordTest = (pid, t) => {
    const p = policies.find(x => x.id === pid);
    if (!p || !allowed("policy.manage", { role: t.owner }, "Control test")) return;
    const u = userRef.current;
    const test = newTest({ policy: p, result: t.result, evidence: redact(t.evidence), owner: t.owner, by: u.name, testedOn: t.testedOn, scope: t.scope, validDays: t.validDays });
    setPolicies(ps => ps.map(x => x.id === pid ? { ...x, tests: [...(x.tests || []), test] } : x));
    const scopeTxt = t.scope === "all" ? "all agents in scope" : agents.filter(a => t.scope.includes(a.id)).map(a => a.name).join(", ");
    log(t.result === "pass" ? "info" : "warn", t.result === "pass" ? "Control Test Passed" : "Control Test Failed", "—",
      `"${p.name}" v${p.version || 1} ${t.result === "pass" ? "passed" : "failed"} a test on ${t.testedOn} (${scopeTxt}): ${test.evidence}`,
      { role: t.owner, entity: { kind: "policy", id: pid, version: p.version || 1 }, after: { result: t.result, expiresOn: test.expiresOn } });
    setTesting(null);
    notify(t.result === "pass" ? `Test recorded. ${p.name} is verified effective until ${test.expiresOn}.` : `Failed test recorded. ${p.name} no longer counts as effective.`);
  };
  const revisePolicy = (pid, summary) => {
    const p = policies.find(x => x.id === pid);
    if (!p || !allowed("policy.manage", {}, "New policy version")) return;
    const u = userRef.current;
    const v = (p.version || 1) + 1;
    setPolicies(ps => ps.map(x => x.id === pid ? { ...x, version: v, status: "draft", revision: redact(summary), revisedBy: u.id, approvedBy: null, approvedOn: null, approvalSource: null } : x));
    log("warn", "Policy Revised", "—", `"${p.name}" revised to version ${v} by ${u.name}: ${redact(summary)}. Back to draft until approved; tests on version ${p.version || 1} are now stale.`,
      { entity: { kind: "policy", id: pid, version: v }, before: { version: p.version || 1, status: p.status }, after: { version: v, status: "draft" } });
    notify(`Version ${v} drafted. It needs an independent approval and a new test.`);
  };
  const openPolicy = pid => { go("policy"); setTimeout(() => document.getElementById(`policy-${pid}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); };

  const runDecision = act => {
    if (act.type === "agent") { setDetailId(act.id); return; }
    if (act.type === "risk") { life.openRisk(act.id); return; }
    if (act.type === "gaps") { go("assessments"); setRiskFocus("tab:gap"); return; }
    if (act.type === "enable") { togglePolicy(act.id); return; }
    if (act.type === "approve") { setApproving(act.id); return; }
    if (act.type === "review") life.reviewPolicy(act.id);
    if (act.type === "test") setTesting(act.id);
  };

  const updateTraits = (id, traits) => {
    const a = agents.find(x => x.id === id);
    const u = userRef.current;
    if (!ownsAgent(u, a) && !allowed("scope.change", {}, "Changing characteristics", a.name)) return;
    // characteristics drive scope, so a change invalidates the owner's earlier confirmations
    updateAgent(id, { traits, ...(a.attest ? { attest: null } : {}) });
    if (a.attest) log("warn", "Assessment Invalidated", a.name, `${a.name}'s characteristics changed, so the owner's architecture and characteristics confirmations were cleared and must be redone`, { entity: { kind: "agent", id: a.name, version: (a.rev || 0) + 1 } });
    const before = new Set(Object.keys(a.traits || {}).filter(k => a.traits[k]));
    const after = new Set(Object.keys(traits).filter(k => traits[k]));
    const added = [...after].filter(k => !before.has(k)), removed = [...before].filter(k => !after.has(k));
    if (added.length || removed.length) log("info", "Scope Change", a.name,
      `${a.name} characteristics updated${added.length ? `; added: ${added.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}${removed.length ? `; removed: ${removed.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}`);
    notify("Characteristics saved. Mapping updated.");
  };

  const excludeMapping = (id, key, reason) => {
    const a = agents.find(x => x.id === id);
    if (!allowed("scope.change", {}, "Scope exclusion", a.name)) return;
    reason = redact(reason);
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    updateAgent(id, { exclusions: { ...(a.exclusions || {}), [key]: { reason, on: localISO() } } });
    log("warn", "Scope Exclusion", a.name, `${item?.short || item?.name || key} excluded from ${a.name}'s scope: ${reason}`);
    notify(`Excluded ${item?.short || item?.name}`);
  };

  const includeMapping = (id, key) => {
    const a = agents.find(x => x.id === id);
    if (!allowed("scope.change", {}, "Returning an item to scope", a.name)) return;
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    const { [key]: _, ...rest } = a.exclusions || {};
    updateAgent(id, { exclusions: rest });
    log("info", "Scope Change", a.name, `${item?.short || item?.name || key} returned to ${a.name}'s scope`);
  };

  const registerAgent = f => {
    if (!allowed("agent.register", {}, "Agent registration")) return;
    const fullAuto = f.autonomy === "Full autonomy";
    const newAgent = {
      id: Date.now(), name: f.name.trim(), model: f.model, dept: f.dept,
      status: "pending", risk: fullAuto ? "MEDIUM" : "LOW",
      score: fullAuto ? 40 : 15, autonomy: f.autonomy, owner: f.owner.trim(),
      desc: f.desc.trim(), traits: f.traits, exclusions: {}, rev: 0,
    };
    setAgents(a => [...a, newAgent]);
    log("info", "Agent Registered", newAgent.name, `${newAgent.name} registered and pending security review before activation`, { entity: { kind: "agent", id: newAgent.name, version: 0 }, after: { status: "pending", owner: newAgent.owner } });
    setModal(null);
    notify(`${newAgent.name} registered — pending security review`);
  };

  const createPolicy = f => {
    if (!allowed("policy.manage", {}, "Policy creation")) return;
    const u = userRef.current;
    const tpl = RECOMMENDED_POLICIES.find(t => t.id === f.templateId);
    const id = tpl && !policies.some(p => p.id === tpl.id) ? tpl.id : `p${Date.now()}`;
    const approved = f.approved;
    const newPolicy = {
      id, tag: f.tag, name: f.name.trim(), desc: f.desc.trim(), action: f.action, violations: 0, enabled: true,
      frameworks: tpl ? [] : f.frameworks, owner: f.owner, templateId: tpl?.id, evidence: tpl?.evidence, doc: f.doc,
      status: approved ? "approved" : "draft", version: 1, createdBy: u.id, tests: [],
      doc: f.doc ? { ...f.doc, version: 1 } : null,
      ...(approved ? { approvedBy: f.approvedBy, approvedOn: f.approvedOn, approvedVersion: 1, approvalSource: "recorded" } : {}),
    };
    setPolicies(ps => [...ps, newPolicy]);
    // a template carries its requirement mapping with it
    if (tpl) setReqMap(m => {
      const next = { ...m };
      tpl.closeKeys.forEach(k => { if (!(next[k] || []).includes(id)) next[k] = [...(next[k] || []), id]; });
      return next;
    });
    const closing = tpl ? tpl.closeKeys.filter(k => gapKeys.has(k)) : [];
    const pe = { kind: "policy", id, version: 1 };
    log("info", "Policy Created", "—", `Policy "${newPolicy.name}" created as ${approved ? "approved" : "draft"} (owner: ${f.owner}, action: ${f.action})${tpl ? `; mapped to ${tpl.closeKeys.map(reqLabel).join(", ")}` : ""}`, { entity: pe, after: { status: newPolicy.status } });
    if (f.doc) log("info", "Document Uploaded", "—", `"${f.doc.name}" (${fmtSize(f.doc.size)}, SHA-256 ${f.doc.sha256?.slice(0, 12)}…) attached to policy "${newPolicy.name}"`, { entity: pe });
    if (approved) log("info", "Approval Recorded", "—", `${u.name} recorded that ${f.approvedBy} approved "${newPolicy.name}" outside ARGUS on ${f.approvedOn}, with the signed document as evidence`, { entity: pe, after: { status: "approved", source: "outside ARGUS" } });
    setModal(null);
    setPolicyTemplate(null);
    notify(approved
      ? (closing.length ? `Policy approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy created: ${newPolicy.name}`)
      : `Saved as draft.${closing.length ? ` Approve it to close ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : ""}`);
  };

  const actions = { createPolicy: openCreatePolicy, approve: setApproving, togglePolicy, testPolicy: setTesting };

  const saveTreatment = (sid, t) => {
    const sc = register.find(x => x.id === sid);
    if (!allowed("risk.treat", {}, `Treatment of ${sid}`)) return;
    if (t.treatment === "Accept" && !allowed("risk.accept", { owner: t.owner, role: t.acceptance.by }, `Acceptance of ${sid}`)) return;
    if (t.acceptance) t = { ...t, acceptance: { ...t.acceptance, reason: redact(t.acceptance.reason), byUser: userRef.current.id, byName: userRef.current.name } };
    setTreatments(m => ({ ...m, [sid]: t }));
    if (t.treatment === "Accept") {
      log("warn", "Risk Accepted", "—", `${sid} ${sc?.title}: residual risk ${sc?.residual.score} accepted by ${userRef.current.name} (${t.acceptance.by}) (owner: ${t.owner}, review ${t.reviewOn}). Justification: ${t.acceptance.reason}`, { role: t.acceptance.by, entity: { kind: "risk", id: sid }, after: { treatment: "Accept" } });
    } else {
      log("info", "Risk Treatment", "—", `${sid} ${sc?.title}: treatment set to ${t.treatment} (owner: ${t.owner}, review ${t.reviewOn})${t.note ? `. ${t.note}` : ""}`);
    }
    notify(t.treatment === "Accept" ? `${sid} accepted` : `${sid} treatment saved`);
  };

  const setGapField = (key, field, value) => {
    if (!allowed("risk.treat", {}, "Remediation assignment")) return;
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), [field]: value } }));
    if (field === "owner" && value) {
      const [fwId, i] = key.split("|");
      const fw = FRAMEWORKS.find(f => f.id === fwId);
      log("info", "Remediation Assigned", "—", `${fw.short} ${fw.requirements[Number(i)].id} remediation assigned to ${value}`);
    }
  };

  const markNA = (key, reason) => {
    if (!allowed("scope.change", {}, "Not-applicable marking")) return;
    if (reason) reason = redact(reason);
    const [fwId, i] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const label = `${fw.short} ${fw.requirements[Number(i)].id}`;
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), na: reason ? { reason, on: localISO() } : null } }));
    log(reason ? "warn" : "info", "Scope Change", "—", reason ? `${label} marked not applicable: ${reason}` : `${label} marked applicable again`);
    notify(reason ? `${label} marked not applicable` : `${label} back in scope`);
  };

  const go = id => { setView(id); setNavOpen(false); };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <Activity size={17} /> },
    { id: "decisions", label: "Needs my decision", icon: <Inbox size={17} />, badge: decisions.filter(d => d.sev === "critical").length },
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
          <button key={n.id} onClick={() => go(n.id)} aria-current={view === n.id ? "page" : undefined} aria-label={n.badge ? `${n.label}, ${n.badge} critical` : undefined} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", whiteSpace: "nowrap",
            borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 500,
            background: view === n.id ? T.blue : "transparent",
            color: view === n.id ? "#fff" : T.navText, textAlign: "left", transition: "background .12s",
          }}>
            {n.icon}<span style={{ flex: 1 }}>{n.label}</span>
            {n.badge > 0 && <span aria-hidden="true" style={{ fontSize: 11.5, fontWeight: 700, minWidth: 20, textAlign: "center", padding: "1px 6px", borderRadius: 99, background: view === n.id ? "rgba(255,255,255,.25)" : (T.isDark ? "#f43f5e" : "#e11d48"), color: "#fff" }}>{n.badge}</span>}
          </button>
        ))}
      </nav>
      <IdentitySwitcher />
    </aside>
  );

  const px = mobile ? 16 : 28;

  return (
    <ThemeCtx.Provider value={T}>
     <ActorCtx.Provider value={{ user, actAs }}>
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
                : "Demo environment: all agents, violations and events are synthetic, and the seeded history is dated relative to today. Nothing is enforced on a server. Explore freely."}
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
            {view === "dashboard" && <Dashboard agents={scored} assessment={assessment} audit={audit} treatments={treatments} gates={gates} decisions={decisions}
              openAgent={openAgent} onOpenFrameworks={() => go("frameworks")} onOpenDecisions={() => go("decisions")} />}
            {view === "decisions" && <Decisions items={decisions} gates={gates} onGates={life.setGates} onAction={runDecision} />}
            {view === "registry" && <Registry agents={scored} policies={policies} audit={audit} treatments={treatments} gates={gates} openAgent={openAgent} onOpenRegister={() => setModal("register")} />}
            {view === "policy" && <PolicyEngine policies={policies} reqMap={reqMap} toggle={togglePolicy} onOpenCreate={() => openCreatePolicy()} onApprove={setApproving}
              agents={scored} onTest={recordTest} onRevise={revisePolicy} />}
            {view === "frameworks" && <Frameworks assessment={assessment} gapKeys={gapKeys} policies={policies} onOpen={setFwOpen} onAdopt={adoptRecommendation} />}
            {view === "audit" && <AuditTrail audit={audit} agents={scored} policies={policies} onOpenAgent={openAgent} onOpenPolicy={openPolicy} notify={notify} />}
            {view === "heatmap" && <Heatmap agents={scored} openAgent={openAgent} />}
            {view === "assessments" && <Assessments scored={scored} register={register} assessment={assessment} policies={policies} audit={audit} treatments={treatments}
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
        {testing && policies.find(p => p.id === testing) && (
          <Modal title="Record a control test" subtitle={`${policies.find(p => p.id === testing).name}. Only a current, passing test makes a control count as effective.`} onClose={() => setTesting(null)}>
            <TestForm policy={policies.find(p => p.id === testing)} agents={scored.filter(a => a.mapping.policies.some(m => m.id === testing && !m.excluded))} onCancel={() => setTesting(null)} onSave={t => recordTest(testing, t)} />
            <NotAllowed action="policy.manage" />
          </Modal>
        )}
        <AgentDrawer key={detailId ?? "none"} agent={scored.find(a => a.id === detailId)} audit={audit} policies={policies} actions={actions}
          treatments={treatments} gates={gates} life={life}
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
     </ActorCtx.Provider>
    </ThemeCtx.Provider>
  );
}
