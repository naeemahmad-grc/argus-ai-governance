// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { CheckCircle2, X, Plus, AlertCircle, BadgeCheck } from "lucide-react";
import { TRAITS, mapAgent } from "../agentMapping.js";
import { nextStep } from "../lifecycle.js";
import { STATE_LABEL, operatingState } from "../gates.js";
import { AgentRiskTab, ArchitectureTab } from "./architecture-ui.jsx";
import { Pill, SevDot, dialogProps, fieldStyle, useDialog, useT } from "./base.jsx";
import { SegTabs } from "./controls-ui.jsx";
import { GateCard, StatePill, WorstRisk } from "./decisions-ui.jsx";
import { TraitPicker } from "./forms.jsx";
import { LifecycleCard } from "./lifecycle-ui.jsx";
import { FilterChip } from "./registry.jsx";

/* ---------------- agent detail drawer ---------------- */

export const POLICY_STATE = {
  active: { label: "In place", tone: "green" },
  draft: { label: "Draft, needs approval", tone: "amber" },
  disabled: { label: "Policy is off", tone: "amber" },
  missing: { label: "Not adopted", tone: "amber" },
};

// One mapped framework or policy: why it applies, and exclude / re-include with a reason
export function MappingRow({ item, kind, onExclude, onInclude, action }) {
  const T = useT();
  const [excluding, setExcluding] = useState(false);
  const [reason, setReason] = useState("");
  const green = T.isDark ? "#34d399" : "#066a4d";
  const amber = T.isDark ? "#f59e0b" : "#92400e";
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
                  background: reason.trim() ? T.accent : "rgba(148,163,184,.25)", color: reason.trim() ? "#fff" : T.faint,
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

export function DrawerSection({ title, sub, children }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ color: T.dim, fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export function AgentDrawer({ agent, audit, policies, actions, treatments, gates, life, onClose, onUpdateTraits, onExclude, onInclude, panelTab, onTab }) {
  const T = useT();
  const [editing, setEditing] = useState(false);
  const [draftTraits, setDraftTraits] = useState({});
  const [tab, setTab] = useState("gaps");
  const view = panelTab || "overview";
  const dialogRef = useDialog(onClose, !!agent);
  const setView = v => onTab(v);
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
      <button onClick={() => actions.createPolicy(p.template.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}>
        <Plus size={12} /> Create from template
      </button>);
    if (p.state === "draft") return (
      <button onClick={() => actions.approve(p.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}>
        <BadgeCheck size={12} /> Approve
      </button>);
    if (p.state === "disabled") return (
      <button onClick={() => actions.togglePolicy(p.id)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}>
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
      <div ref={dialogRef} {...dialogProps(`${agent.name} details`)} onClick={e => e.stopPropagation()} style={{
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
                <button onClick={() => { onUpdateTraits(agent.id, draftTraits); setEditing(false); }} style={{ fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}>Save and remap</button>
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
