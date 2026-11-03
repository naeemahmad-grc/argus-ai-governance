// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, AlertCircle, BadgeCheck, Clock, Network, UserCheck } from "lucide-react";
import { lifecycle, requirements, CONDITION_MAX_DAYS } from "../lifecycle.js";
import { can } from "../identity.js";
import { NotAllowed, useActor } from "./actor.jsx";
import { SevDot, fieldStyle, labelStyle, useT } from "./base.jsx";
import { ControlAction, ControlPill, RiskScore, addDays, controlStatus } from "./controls-ui.jsx";

/* ---------------- agent lifecycle (activation & reinstatement) ---------------- */

export const btnStyle = (T, primary = true, enabled = true) => ({
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8, whiteSpace: "nowrap",
  border: primary ? "none" : `1px solid ${T.border}`, cursor: enabled ? "pointer" : "not-allowed",
  background: !enabled ? "rgba(148,163,184,.25)" : primary ? T.accent : "transparent", color: !enabled ? T.faint : primary ? "#fff" : T.dim,
});

export function InlineForm({ fields, submitLabel, onSubmit }) {
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

export function RequirementSubs({ item, agent, policies, audit, actions, life }) {
  const T = useT();
  const green = T.isDark ? "#34d399" : "#066a4d";
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

export function RequirementRow({ item, agent, policies, audit, actions, life, onShowTab }) {
  const T = useT();
  const green = T.isDark ? "#34d399" : "#066a4d";
  const amber = T.isDark ? "#f59e0b" : "#92400e";
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

export function ApprovalPanel({ agent, req, life }) {
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
          <label htmlFor="lifecycle-ui-open-items-due-by-max-days" style={labelStyle(T)}>Open items due by (max {CONDITION_MAX_DAYS} days)</label>
          <input id="lifecycle-ui-open-items-due-by-max-days" type="date" value={due} max={maxDue} onChange={e => setDue(e.target.value)} style={fieldStyle(T)} />
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

export function LifecycleCard({ agent, policies, audit, treatments, gates, actions, life, onShowTab }) {
  const T = useT();
  const red = T.isDark ? "#fb7185" : "#be123c";
  const green = T.isDark ? "#34d399" : "#066a4d";
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
                  {it.met ? <CheckCircle2 size={15} color={green} /> : <Clock size={15} color={T.isDark ? "#f59e0b" : "#92400e"} />}
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
          <div style={{ width: `${pct}%`, height: "100%", background: req.done ? green : T.accent, borderRadius: 99 }} />
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
              Submit for {req.kind} <span style={{ fontWeight: 500 }}>(as owner: {agent.owner})</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
