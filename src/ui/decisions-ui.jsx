// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { AlertTriangle, AlertCircle, ChevronRight } from "lucide-react";
import { riskLevel, isResolved } from "../riskLibrary.js";
import { localISO, fmtWhen, fmtDate, age, daysUntil } from "../timeline.js";
import { GATE_RISK_OPTIONS, GATE_SCORE_OPTIONS, EXCEPTION_MAX_DAYS, STATE_LABEL, operatingState, worstScenario } from "../gates.js";
import { COVERAGE_METHOD, FULFILLMENT_METHOD, EXCLUSION_METHOD, SCOPE_DISCLAIMER } from "../assessment.js";
import { DECISION_KINDS } from "../decisions.js";
import { can } from "../identity.js";
import { NotAllowed, useActor } from "./actor.jsx";
import { Card, PageHeader, Pill, SevDot, fieldStyle, labelStyle, useT } from "./base.jsx";
import { addDays } from "./controls-ui.jsx";
import { coverageColor } from "./dashboard.jsx";
import { RequirementSubs, btnStyle } from "./lifecycle-ui.jsx";
import { FilterChip, chipRow } from "./registry.jsx";

import { useQueryState } from "../router.js";
/* ---------------- assessment metrics, operating gates, alerts, decisions ---------------- */

export const lvlName = l => l[0] + l.slice(1).toLowerCase();
export const STATE_STYLE = (T, state) => state === "conflict" ? T.risk.HIGH : state === "exception" ? T.risk.MEDIUM : (T.status[state] || T.status.pending);

export function StatePill({ agent, ctx }) {
  const T = useT();
  const { state } = operatingState(agent, ctx);
  const s = STATE_STYLE(T, state);
  const extra = state === "active" ? (agent.conditions ? " · conditional" : agent.probation ? " · probation" : "") : "";
  return <Pill fg={s.fg} bg={s.bg} border={s.border}>{state === "conflict" ? "⚠ " : ""}{STATE_LABEL[state]}{extra}</Pill>;
}

// The worst individual scenario, shown next to the aggregate score so averaging can't hide it
export function WorstRisk({ agent, treatments, prefix = "Worst" }) {
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

export function MethodNote({ a, style }) {
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
export const assessmentTiles = (T, a) => [
  {
    label: "Mapped control coverage", value: `${a.coveragePct ?? 0}%`, color: coverageColor(T, a.coveragePct ?? 0),
    sub: `${a.mapped} of ${a.applicable} applicable requirements have a live control mapped · ${a.unmapped} unmapped`,
  },
  {
    label: "Requirement fulfillment", value: `${a.fulfillmentPct ?? 0}%`, color: coverageColor(T, a.fulfillmentPct ?? 0),
    sub: `${a.met} met · ${a.partial} partially met · ${a.notMet} not met, out of ${a.applicable} (evidence-weighted)`,
  },
];

export function RecentAlerts({ audit, agents, openAgent }) {
  const T = useT();
  const byName = Object.fromEntries(agents.map(a => [a.name, a]));
  const events = [...audit].filter(e => e.sev === "critical" || e.sev === "warn").sort((x, y) => y.at - x.at).slice(0, 6);
  const green = T.isDark ? "#34d399" : "#066a4d", red = T.isDark ? "#fb7185" : "#be123c";
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

export function DecisionForm({ agent, kind, blockers, life, onCancel }) {
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
export function GateCard({ agent, policies, audit, actions, life, ctx }) {
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

export function GatesSettings({ gates, onChange }) {
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

export const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export function SevBadge({ sev }) {
  const T = useT();
  const st = T.risk[sev.toUpperCase()] || T.risk.LOW;
  return <Pill small fg={st.fg} bg={st.bg} border={st.border}>{sev === "critical" ? "▲ " : sev === "high" ? "▲ " : ""}{SEV_LABEL[sev]}</Pill>;
}

export function Decisions({ items, gates, onGates, onAction }) {
  const T = useT();
  const [kind, setKind] = useQueryState("type");
  const [sev, setSev] = useQueryState("severity");
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
      <div style={{ fontSize: 13, marginTop: 2, color: warn ? (T.isDark ? "#fb7185" : "#be123c") : T.text, fontWeight: warn ? 700 : 400 }}>{v}</div>
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
