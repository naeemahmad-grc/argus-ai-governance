// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { CheckCircle2, Plus, AlertCircle, BadgeCheck } from "lucide-react";
import { RECOMMENDED_POLICIES } from "../frameworks.js";
import { LIKELIHOOD, IMPACT, riskLevel } from "../riskLibrary.js";
import { localISO, addDaysISO } from "../timeline.js";
import { effectiveness, attributes, EFFECT } from "../controls.js";
import { can } from "../identity.js";
import { NotAllowed, useActor } from "./actor.jsx";
import { Pill, fieldStyle, labelStyle, useT } from "./base.jsx";
import { btnStyle } from "./lifecycle-ui.jsx";

/* ---------------- control evidence and testing ---------------- */

export const EFFECT_STYLE = (T, state) => {
  const tone = EFFECT[state].tone;
  return tone === "good" ? T.risk.LOW : tone === "bad" ? T.risk.CRITICAL : T.risk.MEDIUM;
};
export function EffectPill({ policy, agentId }) {
  const T = useT();
  const e = effectiveness(policy, agentId);
  const st = EFFECT_STYLE(T, e.state);
  return <span title={e.reason}><Pill small fg={st.fg} bg={st.bg} border={st.border}>{e.state === "effective" ? "✓ " : "! "}{EFFECT[e.state].label}</Pill></span>;
}

export function TestForm({ policy, agents, onSave, onCancel }) {
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

export function ControlEvidence({ p, agents, onTest, onRevise }) {
  const T = useT();
  const { user } = useActor();
  const [mode, setMode] = useState(null);
  const [summary, setSummary] = useState("");
  const [hist, setHist] = useState(false);
  const green = T.isDark ? "#34d399" : "#066a4d", amber = T.isDark ? "#f59e0b" : "#92400e";
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
              <b style={{ color: t.result === "pass" ? green : (T.isDark ? "#fb7185" : "#be123c") }}>{t.result === "pass" ? "Passed" : "Failed"}</b> {t.testedOn} on v{t.version || 1}
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

/* ---------------- shared risk & control helpers ---------------- */

export const CONTROL_LABEL = { active: "Effective", violated: "Violated", draft: "Draft", disabled: "Off", missing: "Not adopted", untested: "Untested", stale: "Test stale", failed: "Failed test" };

// Live status of any policy or recommended control, including violations by a given agent
export const controlStatus = (id, policies, audit = [], agentName) => {
  const p = policies.find(x => x.id === id);
  const tpl = RECOMMENDED_POLICIES.find(t => t.id === id);
  const violated = !!agentName && audit.some(e => e.agent === agentName && e.type === "Policy Violation" && e.policy === id);
  const base = violated ? "violated" : !p ? "missing" : p.status === "draft" ? "draft" : !p.enabled ? "disabled" : "active";
  const eff = base === "active" ? effectiveness(p).state : null;
  const state = base === "active" && eff !== "effective" ? eff : base;
  return { id, name: p?.name ?? tpl?.name ?? id, state, template: tpl };
};

export function ControlPill({ c }) {
  const T = useT();
  const red = T.isDark ? "#fb7185" : "#be123c";
  const amber = T.isDark ? "#f59e0b" : "#92400e";
  const st = c.state === "active" ? { fg: T.blue, bg: T.blueSoft, border: T.blueBorder }
    : c.state === "violated" || c.state === "failed" ? { fg: red, bg: T.isDark ? "rgba(244,63,94,.1)" : "rgba(225,29,72,.07)", border: T.isDark ? "rgba(244,63,94,.4)" : "rgba(225,29,72,.3)" }
    : { fg: amber, bg: "transparent", border: T.isDark ? "rgba(245,158,11,.4)" : "rgba(180,83,9,.35)" };
  return <Pill small fg={st.fg} bg={st.bg} border={st.border}>{c.name}{c.state === "active" ? "" : ` · ${CONTROL_LABEL[c.state]}`}</Pill>;
}

// The one action that moves a control toward "in place"
export function ControlAction({ c, actions, small = true }) {
  const T = useT();
  const btn = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: small ? 12 : 13, fontWeight: 700, padding: small ? "4px 9px" : "6px 11px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" };
  if (c.state === "missing" && c.template) return <button style={btn} onClick={() => actions.createPolicy(c.template.id)}><Plus size={12} /> Create from template</button>;
  if (c.state === "draft") return <button style={btn} onClick={() => actions.approve(c.id)}><BadgeCheck size={12} /> Approve</button>;
  if (c.state === "disabled") return <button style={btn} onClick={() => actions.togglePolicy(c.id)}>Enable policy</button>;
  if (["untested", "stale", "failed"].includes(c.state) && actions.testPolicy) return <button style={btn} onClick={() => actions.testPolicy(c.id)}><BadgeCheck size={12} /> Record test</button>;
  return null;
}

export function RiskScore({ s, label, big }) {
  const T = useT();
  const lv = riskLevel(s.score), st = T.risk[lv];
  return (
    <span title={`Likelihood ${s.l} (${LIKELIHOOD[s.l - 1]}) × impact ${s.i} (${IMPACT[s.i - 1]}) = ${s.score}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: big ? "5px 10px" : "2px 8px", borderRadius: 6, background: st.bg, border: `1px solid ${st.border}`, color: st.fg, fontSize: big ? 13 : 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label && <span style={{ fontWeight: 600 }}>{label}</span>}{s.score} {lv[0] + lv.slice(1).toLowerCase()}
    </span>
  );
}

export const GAP_STYLE = T => ({
  "Met": { fg: T.isDark ? "#34d399" : "#066a4d", bg: T.isDark ? "rgba(52,211,153,.1)" : "rgba(5,150,105,.08)", border: T.isDark ? "rgba(52,211,153,.35)" : "rgba(5,150,105,.3)" },
  "Partially met": { fg: T.isDark ? "#f59e0b" : "#92400e", bg: T.isDark ? "rgba(245,158,11,.1)" : "rgba(180,83,9,.07)", border: T.isDark ? "rgba(245,158,11,.35)" : "rgba(180,83,9,.3)" },
  "Not met": { fg: T.isDark ? "#fb7185" : "#be123c", bg: T.isDark ? "rgba(244,63,94,.1)" : "rgba(225,29,72,.07)", border: T.isDark ? "rgba(244,63,94,.35)" : "rgba(225,29,72,.3)" },
  "Not applicable": { fg: T.faint, bg: T.panelSoft, border: T.border },
});
export const GapPill = ({ status }) => { const T = useT(); const s = GAP_STYLE(T)[status]; return <Pill small fg={s.fg} bg={s.bg} border={s.border}>{status}</Pill>; };

export const downloadFile = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const addDays = n => addDaysISO(n);

export const SegTabs = ({ tabs, value, onChange }) => {
  const T = useT();
  return (
    <div role="tablist" style={{ display: "flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 3, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} role="tab" aria-selected={value === id} tabIndex={value === id ? 0 : -1} onClick={() => onChange(id)}
          onKeyDown={e => {
            const i = tabs.findIndex(t => t[0] === id);
            const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
            if (next === null) return;
            e.preventDefault();
            const list = e.currentTarget.parentElement;
            onChange(tabs[next][0]);
            setTimeout(() => list?.children[next]?.focus(), 0);
          }} style={{
          display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13.5, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap", background: value === id ? T.accent : "transparent", color: value === id ? "#fff" : T.dim,
        }}>{icon}{label}</button>
      ))}
    </div>
  );
};
