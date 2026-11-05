// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { FileText, Download, X, AlertCircle, Upload } from "lucide-react";
import { FRAMEWORKS, RECOMMENDED_POLICIES, reqLabel, POLICY_ROLES, BLANK_TEMPLATE } from "../frameworks.js";
import { TRAITS, mapAgent } from "../agentMapping.js";
import { localISO } from "../timeline.js";
import { can } from "../identity.js";
import { NotAllowed, useActor } from "./actor.jsx";
import { Modal, Pill, fieldStyle, labelStyle, useT } from "./base.jsx";

/* ---------------- register agent modal ---------------- */

export function TraitPicker({ traits, onChange }) {
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

export const MappingPreview = ({ m }) => {
  const T = useT();
  const missing = m.policies.filter(p => p.state !== "active").length;
  return (
    <div style={{ background: T.blueSoft, border: `1px solid ${T.blueBorder}`, borderRadius: 14, padding: "10px 12px", fontSize: 13, lineHeight: 1.5 }}>
      In scope for <b>{m.frameworks.length} frameworks</b> and <b>{m.policies.length} policies</b>
      {missing > 0 && <span style={{ color: T.dim }}> ({missing} not yet in place)</span>}. You can review and exclude mappings after registering.
    </div>
  );
};

export function RegisterAgentModal({ onClose, onRegister, policies }) {
  const T = useT();
  const [f, setF] = useState({ name: "", model: "claude-3-5-sonnet", dept: "Engineering", autonomy: "Supervised", owner: "", desc: "", traits: {} });
  const set = patch => setF(s => ({ ...s, ...patch }));
  const valid = f.name.trim() && f.owner.trim() && f.desc.trim();
  const preview = mapAgent(f, policies);
  return (
    <Modal title="Register Agent" subtitle="New agents enter the registry as pending until security review completes." onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="forms-agent-name" style={labelStyle(T)}>Agent name</label>
          <input id="forms-agent-name" style={fieldStyle(T)} value={f.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. ContractDraft AI" />
        </div>
        <div>
          <label htmlFor="forms-description" style={labelStyle(T)}>Description</label>
          <textarea id="forms-description" rows={3} style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} value={f.desc}
            onChange={e => set({ desc: e.target.value })} placeholder="What does this agent do, for whom, and with what data or systems?" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label htmlFor="forms-model" style={labelStyle(T)}>Model</label>
            <select id="forms-model" style={fieldStyle(T)} value={f.model} onChange={e => set({ model: e.target.value })}>
              {["claude-3-5-sonnet", "claude-3-haiku", "gpt-4o", "gpt-4o-mini", "gemini-1.5-pro"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="forms-department" style={labelStyle(T)}>Department</label>
            <select id="forms-department" style={fieldStyle(T)} value={f.dept} onChange={e => set({ dept: e.target.value })}>
              {["Engineering", "Finance", "Legal", "HR", "Marketing", "Security", "Customer Success", "Operations"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label htmlFor="forms-autonomy-level" style={labelStyle(T)}>Autonomy level</label>
            <select id="forms-autonomy-level" style={fieldStyle(T)} value={f.autonomy} onChange={e => set({ autonomy: e.target.value })}>
              {["Supervised", "Semi-autonomous", "Full autonomy"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="forms-owner-team" style={labelStyle(T)}>Owner (team)</label>
            <input id="forms-owner-team" style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })} placeholder="e.g. Legal Ops" />
          </div>
        </div>
        <div>
          <div style={labelStyle(T)}>Characteristics</div>
          <div style={{ color: T.faint, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>
            Check everything that applies. ARGUS uses these to decide which frameworks and policies apply to the agent.
          </div>
          <TraitPicker traits={f.traits} onChange={traits => set({ traits })} />
        </div>
        <MappingPreview m={preview} />
        {f.autonomy === "Full autonomy" && (
          <div style={{ display: "flex", gap: 10, background: T.warnBox.bg, border: `1px solid ${T.warnBox.border}`, borderRadius: 14, padding: "12px 14px" }}>
            <AlertCircle size={16} color={T.warnBox.fg} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: T.warnBox.fg, lineHeight: 1.5 }}>
              Full-autonomy agents start with an elevated risk score and are subject to the "Limit Full-Autonomy Agent Actions" policy: write operations will require supervisor approval.
            </div>
          </div>
        )}
        <button disabled={!valid} onClick={() => onRegister(f)} style={{
          background: valid ? T.accent : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 15, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed", marginTop: 4,
        }}>
          Register agent
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- create policy modal ---------------- */

export const MAX_DOC_MB = 10;
export const todayISO = () => localISO();
export const fmtSize = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

// Read an uploaded file into an in-memory link with a SHA-256 fingerprint. Nothing leaves the browser.
export const DOC_TYPES = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
export const sha256 = async file => {
  const buf = await file.arrayBuffer();
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
};

export function DocUpload({ doc, onChange }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 12px" }}>
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
          border: `1px dashed ${T.blueBorder}`, borderRadius: 14, padding: "12px", color: T.blue, fontSize: 13.5, fontWeight: 600,
          background: T.blueSoft,
        }}>
          <Upload size={15} /> {busy ? "Checking and fingerprinting…" : "Upload approved policy (PDF or Word)"}
          <input type="file" aria-label="Upload approved policy document" accept=".pdf,.doc,.docx" disabled={busy} onChange={pick} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
        </label>
      )}
      {busy && <div role="status" style={{ color: T.dim, fontSize: 12.5, marginTop: 6 }}>Reading the file and computing its SHA-256 fingerprint…</div>}
      {err && (
        <div role="alert" style={{ color: T.isDark ? "#ff8e9e" : "#be123c", fontSize: 12.5, marginTop: 6 }}>
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
export function ApprovalFields({ owner, approvedBy, approvedOn, onChange, recorded, requester }) {
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
          <div style={{ color: T.isDark ? "#f59e0b" : "#92400e", fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
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

export const CATEGORIES = ["Access Control", "AI Governance", "AI Security", "AI Quality", "Change Management", "Data Privacy",
  "External Communication", "GDPR", "HIPAA", "Human Oversight", "Incident Response", "Third-Party Risk", "Transparency", "Custom"];

export function CreatePolicyModal({ onClose, onCreate, initialTemplate, policies }) {
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
          <label htmlFor="forms-start-from-a-template" style={labelStyle(T)}>Start from a template</label>
          <select id="forms-start-from-a-template" style={fieldStyle(T)} value={f.templateId} onChange={e => set(e.target.value ? fromTemplate(e.target.value) : { templateId: "" })}>
            <option value="">Blank policy</option>
            {RECOMMENDED_POLICIES.map(t => (
              <option key={t.id} value={t.id} disabled={adopted.has(t.id)}>{t.name}{adopted.has(t.id) ? " (already added)" : ""}</option>
            ))}
          </select>
          <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", marginTop: 8 }}>
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
          <label htmlFor="forms-policy-name" style={labelStyle(T)}>Policy name</label>
          <input id="forms-policy-name" style={fieldStyle(T)} value={f.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Require Model Card Before Activation" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div>
            <label htmlFor="forms-category" style={labelStyle(T)}>Category</label>
            <select id="forms-category" style={fieldStyle(T)} value={f.tag} onChange={e => set({ tag: e.target.value })}>
              {CATEGORIES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="forms-enforcement-action" style={labelStyle(T)}>Enforcement action</label>
            <select id="forms-enforcement-action" style={fieldStyle(T)} value={f.action} onChange={e => set({ action: e.target.value })}>
              {["BLOCK", "REQUIRE APPROVAL", "WARN", "AUDIT"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="forms-description" style={labelStyle(T)}>Description</label>
          <textarea id="forms-description" rows={3} style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} value={f.desc}
            onChange={e => set({ desc: e.target.value })} placeholder="What behavior does this policy govern, and when does it trigger?" />
        </div>
        <div>
          <label htmlFor="forms-policy-owner" style={labelStyle(T)}>Policy owner</label>
          <select id="forms-policy-owner" style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })}>
            <option value="">Select the accountable role…</option>
            {POLICY_ROLES.map(r => <option key={r} value={r}>{r}{tpl && tpl.owner === r ? " (suggested)" : ""}</option>)}
          </select>
        </div>

        <div>
          <div style={labelStyle(T)}>Policy document</div>
          <DocUpload doc={f.doc} onChange={doc => set({ doc })} />
        </div>

        <div style={{ border: `1px solid ${f.approved ? T.blueBorder : T.border}`, borderRadius: 14, padding: "12px 14px", background: f.approved ? T.blueSoft : "transparent" }}>
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
            <div style={labelStyle(T)}>Framework tags</div>
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
          background: valid ? T.accent : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 15, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed", marginTop: 4,
        }}>
          {f.approved ? "Create approved policy" : "Save as draft"}
        </button>
      </div>
    </Modal>
  );
}

export function ApprovePolicyModal({ policy, onClose, onApprove }) {
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
          <div style={labelStyle(T)}>Approved document</div>
          <DocUpload doc={a.doc} onChange={doc => set({ doc })} />
        </div>
        <button disabled={!valid} onClick={() => onApprove(policy.id, a)} style={{
          background: valid ? T.accent : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
          border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
        }}>
          Approve policy
        </button>
      </div>
    </Modal>
  );
}
