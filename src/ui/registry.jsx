// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useMemo } from "react";
import { Search, ShieldAlert, Plus, ChevronRight } from "lucide-react";
import { FRAMEWORKS } from "../frameworks.js";
import { mapAgent } from "../agentMapping.js";
import { nextStep } from "../lifecycle.js";
import { operatingState } from "../gates.js";
import { Card, PageHeader, Pill, fieldStyle, srOnly, useT } from "./base.jsx";
import { StatePill, WorstRisk } from "./decisions-ui.jsx";

import { useQueryState } from "../router.js";
export const FilterChip = ({ active, onClick, label, count }) => {
  const T = useT();
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
      background: active ? T.accent : T.panel, color: active ? T.onAccent : T.dim,
      border: `1px solid ${active ? T.blue : T.border}`,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 11.5, fontWeight: 700, minWidth: 18, textAlign: "center", padding: "1px 6px", borderRadius: 99,
          background: active ? "rgba(127,127,127,.25)" : T.panelSoft, color: active ? T.onAccent : T.faint,
        }}>{count}</span>
      )}
    </button>
  );
};

export const chipRow = mobile => ({
  display: "flex", gap: 8, flexWrap: mobile ? "nowrap" : "wrap", overflowX: "auto", paddingBottom: 2,
});

// framework short name -> group id, used to place each policy in the framework groups
export const FW_GROUP = Object.fromEntries(FRAMEWORKS.map(f => [f.short, f.group]));

export function ControlsBadge({ m }) {
  const T = useT();
  const pct = m.controlsRequired ? m.controlsInPlace / m.controlsRequired : 1;
  const c = pct >= 1 ? (T.isDark ? "#34d399" : "#066a4d") : pct >= 0.7 ? (T.isDark ? "#fbbf3c" : "#92400e") : (T.isDark ? "#ffadb8" : "#be123c");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, whiteSpace: "nowrap" }}>
      <span style={{ width: 46, height: 6, borderRadius: 99, background: T.panelSoft, border: `1px solid ${T.border}`, overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", width: `${pct * 100}%`, height: "100%", background: c }} />
      </span>
      <span><b style={{ color: c }}>{m.controlsInPlace}</b><span style={{ color: T.dim }}> of {m.controlsRequired}</span></span>
    </span>
  );
}

export function Registry({ agents, policies, audit, treatments, gates, openAgent, onOpenRegister }) {
  const ctx = { audit, treatments, gates };
  const stepFor = a => nextStep(a, ctx);
  const T = useT();
  const [q, setQ] = useQueryState("q", "");
  const [risk, setRisk] = useQueryState("risk");
  const [status, setStatus] = useQueryState("status");
  const [fw, setFw] = useQueryState("framework");

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
        <button onClick={onOpenRegister} style={{ display: "flex", alignItems: "center", gap: 8, background: T.accent, border: "none", color: T.onAccent, borderRadius: 999, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Register Agent
        </button>
      </PageHeader>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0 14px" }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 520 }}>
          <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents, descriptions, owners..."
            style={{ ...fieldStyle(T), background: T.panel, borderRadius: 14, padding: "11px 14px 11px 40px" }} />
        </div>
        <select value={fw} onChange={e => setFw(e.target.value)} aria-label="Filter by framework in scope"
          style={{ ...fieldStyle(T), background: fw === "all" ? T.panel : T.blueSoft, borderColor: fw === "all" ? T.border : T.blue, color: fw === "all" ? T.text : T.blue, fontWeight: fw === "all" ? 400 : 600, width: "auto", flex: T.mobile ? "1 1 100%" : "0 1 260px", borderRadius: 14 }}>
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
                    <th key={i} scope="col" style={{ padding: "13px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{h || <span style={srOnly}>Actions</span>}</th>
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
                        {stepFor(a) && <div style={{ fontSize: 11.5, color: a.status === "suspended" || operatingState(a, ctx).state === "conflict" ? (T.isDark ? "#ffadb8" : "#be123c") : T.faint, marginTop: 5, whiteSpace: "nowrap" }}>{stepFor(a)}</div>}
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
