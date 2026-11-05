// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React from "react";
import { Cpu, HeartPulse, ShieldAlert, Layers, ChevronRight, Inbox } from "lucide-react";
import { operatingState, isTreated } from "../gates.js";
import { Card, ViewSwitch, srOnly, useT } from "./base.jsx";
import { AgentRiskTable, RiskBubbles } from "./charts.jsx";
import { MethodNote, RecentAlerts, assessmentTiles } from "./decisions-ui.jsx";

import { useQueryState } from "../router.js";
/* ---------------- views ---------------- */

export function Dashboard({ agents, assessment, audit, treatments, gates, decisions, openAgent, onOpenFrameworks, onOpenDecisions }) {
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

  const green = T.isDark ? "#34d399" : "#066a4d";
  const red = T.isDark ? "#ffadb8" : "#be123c";
  const amber = T.isDark ? "#fbbf3c" : "#92400e";

  const [cov, ful] = assessmentTiles(T, assessment);
  const kpis = [
    { label: "Active Agents", value: `${active} / ${agents.length}`, sub: `${suspended} suspended · ${conflicts} with a gate conflict`, icon: <Cpu size={18} color={T.blue} />, color: T.text },
    { label: "Needs my decision", value: decisions.length, sub: `${urgent} critical · open the queue`, icon: <Inbox size={18} color={urgent ? red : T.blue} />, color: urgent ? red : T.text, onClick: onOpenDecisions },
    { label: "Untreated critical risks", value: critScenarios, sub: `Scenarios at residual 16+ across ${critAgents} agent${critAgents === 1 ? "" : "s"}, whatever their aggregate score`, icon: <ShieldAlert size={18} color={red} />, color: critScenarios ? red : green },
    { ...cov, icon: <Layers size={18} color={cov.color} /> },
    { ...ful, icon: <HeartPulse size={18} color={ful.color} /> },
  ];

  const pad = T.mobile ? 16 : 22;
  const [fieldView, setFieldView] = useQueryState("field", "chart");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.mobile ? 14 : 20 }}>
      <h1 style={srOnly}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 150 : 210}px, 1fr))`, gap: T.mobile ? 10 : 16 }}>
        {kpis.map(k => (
          <Card key={k.label} onClick={k.onClick} style={{ padding: T.mobile ? 14 : 20, cursor: k.onClick ? "pointer" : "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: T.mobile ? 8 : 14, gap: 6 }}>
              <span style={{ color: T.dim, fontSize: T.mobile ? 12.5 : 14 }}>{k.label}</span>{k.icon}
            </div>
            <div style={{ fontSize: T.mobile ? 26 : 34, fontWeight: 500, letterSpacing: "-0.02em", color: k.color, marginBottom: 6 }}>{k.value}</div>
            <div style={{ color: T.faint, fontSize: T.mobile ? 11.5 : 13, lineHeight: 1.4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>
      <MethodNote a={assessment} style={{ marginTop: T.mobile ? -6 : -10 }} />

      <div style={{ display: "grid", gridTemplateColumns: T.mobile ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)", gap: T.mobile ? 14 : 20 }}>
        <Card style={{ padding: pad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Risk Field</h2>
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
          <div style={{ marginTop: 10 }}><ViewSwitch value={fieldView} onChange={setFieldView} label="Show the risk field as" /></div>
          {fieldView === "table"
            ? <div style={{ marginTop: 12 }}><AgentRiskTable agents={agents} openAgent={openAgent} caption="Agents by aggregate risk score" /></div>
            : <RiskBubbles agents={agents} openAgent={openAgent} />}
        </Card>

        <Card style={{ padding: pad, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Recent Alerts</h2>
          <div style={{ color: T.dim, fontSize: 13, marginBottom: 14 }}>Latest critical and warning events, with their current state.</div>
          <RecentAlerts audit={audit} agents={agents} openAgent={openAgent} />
        </Card>
      </div>

      <Card style={{ padding: pad }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Mapped control coverage by framework</h2>
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

export const coverageColor = (T, pct) =>
  pct >= 80 ? (T.isDark ? "#34d399" : "#066a4d") : pct >= 60 ? (T.isDark ? "#fbbf3c" : "#92400e") : (T.isDark ? "#ffadb8" : "#be123c");

export function CoverageBar({ label, covered, total, pct, fulfillment }) {
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
