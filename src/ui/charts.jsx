// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import * as d3 from "d3";
import { Card, SortableTable, useT } from "./base.jsx";

import { useQueryState } from "../router.js";
export function RiskBubbles({ agents, openAgent }) {
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
            <g key={a.id} className="argus-bubble" onClick={() => openAgent(a.name)} style={{ cursor: "pointer" }}
              role="button" tabIndex={0} aria-label={`${a.name}: score ${a.score}, ${tier(a.score).toLowerCase()}. Open details`}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openAgent(a.name))}>
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
                  <text x={n.x} y={n.y + 38} textAnchor="middle" fontSize={11} letterSpacing="1" fontWeight={700}
                    fill={c} opacity={0.8}>{tier(a.score)}</text>
                </>
              ) : mid ? (
                <>
                  {a.name.length * 5.6 <= n.r * 1.9 ? (
                    <>
                      <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={T.text}>{a.name}</text>
                      <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize={17} fontWeight={800} fill={c}>{a.score}</text>
                    </>
                  ) : (
                    <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill={c}>{a.score}</text>
                  )}
                </>
              ) : (
                <>
                  <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill={c}>{a.score}</text>
                  {!T.mobile && <text x={n.x} y={n.y + n.r / fs + 14} textAnchor="middle" fontSize={11} fontWeight={600} fill={T.text}>{a.name}</text>}
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

export function RiskRadar({ agents, openAgent }) {
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
                stroke={crit ? (T.isDark ? "#fb7185" : "#be123c") : T.grid}
                strokeWidth={crit ? 1.4 : 1} strokeDasharray={crit ? "5 5" : "none"} opacity={crit ? 0.55 : 1} />
              <text x={CX + 6} y={CY - rr - 5} fontSize={10 * fs} fill={crit ? (T.isDark ? "#fb7185" : "#be123c") : T.faint}>
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
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize={10 * fs} fontWeight={700} letterSpacing="1.4" fill={T.blue}>CONTROL</text>

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
            <g key={a.id} onClick={() => openAgent(a.name)} style={{ cursor: "pointer" }} className="argus-blip"
              role="button" tabIndex={0} aria-label={`${a.name} (${a.dept}): score ${a.score}, ${tier(a.score).toLowerCase()}. Open details`}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openAgent(a.name))}>
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

export function Heatmap({ agents, openAgent }) {
  const T = useT();
  const [mode, setMode] = useQueryState("mode", "radar");
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
          {[["radar", "Radar"], ["grid", "Grid"], ["table", "Table"]].map(([id, label]) => (
            <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)} style={{
              border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 13.5, fontWeight: 600,
              cursor: "pointer", background: mode === id ? T.accent : "transparent",
              color: mode === id ? "#fff" : T.dim, transition: "all .12s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {mode === "table" ? (
        <Card style={{ marginTop: 20, overflow: "hidden" }}>
          <AgentRiskTable agents={agents} openAgent={openAgent} caption="Agents by aggregate risk score" />
        </Card>
      ) : mode === "radar" ? (
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

// Table alternative to the risk charts: every agent, its score, level, department and worst scenario
export function AgentRiskTable({ agents, openAgent, caption }) {
  const T = useT();
  const lv = s => (s >= 80 ? "Critical" : s >= 55 ? "High" : s >= 25 ? "Medium" : "Low");
  return (
    <SortableTable caption={caption} initial={{ key: "score", dir: "desc" }} rows={agents} columns={[
      { key: "name", label: "Agent", render: a => <button onClick={() => openAgent(a.name)} style={{ background: "none", border: "none", color: T.blue, font: "inherit", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left" }}>{a.name}</button> },
      { key: "score", label: "Score", num: true },
      { key: "level", label: "Level", value: a => lv(a.score) },
      { key: "dept", label: "Department" },
      { key: "status", label: "Status" },
      { key: "worst", label: "Highest residual scenario", value: a => Math.max(0, ...a.risks.map(r => r.residual.score)),
        render: a => { const w = [...a.risks].sort((x, y) => y.residual.score - x.residual.score)[0]; return w ? `${w.id} · ${w.residual.score}` : "None"; } },
    ]} />
  );
}
