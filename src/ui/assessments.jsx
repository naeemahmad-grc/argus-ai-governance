// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X, ChevronRight, ClipboardCheck, Printer, ArrowRight, FileSpreadsheet, Grid3x3 } from "lucide-react";
import { recommendationFor, POLICY_ROLES } from "../frameworks.js";
import { RISK_CATEGORIES, LIKELIHOOD, IMPACT, RISK_BANDS, GAP_STATUS, AGENT_SCORE_METHOD, riskLevel } from "../riskLibrary.js";
import { localISO, fmtWhen } from "../timeline.js";
import { worstScenario } from "../gates.js";
import { COVERAGE_METHOD, FULFILLMENT_METHOD, EXCLUSION_METHOD, SCOPE_DISCLAIMER } from "../assessment.js";
import { can } from "../identity.js";
import { toCSV } from "../audit.js";
import { NotAllowed, useActor } from "./actor.jsx";
import { DrawerSection } from "./agent-drawer.jsx";
import { Card, PageHeader, PanoptesMark, Pill, THEMES, ThemeCtx, dialogProps, fieldStyle, labelStyle, useDialog, useT } from "./base.jsx";
import { 
  CONTROL_LABEL, ControlAction, ControlPill, GAP_STYLE, GapPill, RiskScore, SegTabs, addDays,
  controlStatus, downloadFile
} from "./controls-ui.jsx";
import { coverageColor } from "./dashboard.jsx";
import { MethodNote, assessmentTiles } from "./decisions-ui.jsx";
import { FilterChip, chipRow } from "./registry.jsx";

import { useQueryState } from "../router.js";
import { NotFound } from "./base.jsx";
import { CONTENT_VERSION, CONTENT_REVIEWED, allClaims } from "../regulatory.js";
/* ---------------- risk & gap assessment ---------------- */

export const TREATMENTS = ["Mitigate", "Accept", "Transfer", "Avoid"];
export const TREATMENT_HINT = {
  Mitigate: "Reduce the risk by adopting the mapped controls.",
  Accept: "Keep the current residual risk. Requires a justification and an approver other than the owner.",
  Transfer: "Shift the risk to a third party, for example through insurance or a contract.",
  Avoid: "Stop the activity that creates the risk, for example by retiring or restricting the agent.",
};
export const defaultTreatment = s => ({ treatment: "Mitigate", owner: s.owner, reviewOn: addDays(180), note: "", acceptance: null });

export function RiskMatrix({ items, scoreKey, title, cell, onCell }) {
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

export function RiskScenarioDrawer({ entry, treatment, policies, audit, actions, onSave, onClose, onOpenAgent }) {
  const T = useT();
  const [f, setF] = useState(() => ({ ...treatment, accBy: treatment.acceptance?.by || "", accReason: treatment.acceptance?.reason || "" }));
  const set = p => setF(s => ({ ...s, ...p }));
  const worst = [...entry.agents].sort((a, b) => b.residual.score - a.residual.score)[0];
  const dialogRef = useDialog(onClose);
  const { user: actor } = useActor();
  const sameOwner = f.treatment === "Accept" && f.accBy && (f.accBy === f.owner || !can(actor, "risk.accept", { owner: f.owner, role: f.accBy }).ok);
  const valid = f.owner && f.reviewOn && (f.treatment !== "Accept" || (f.accReason.trim() && f.accBy && !sameOwner)) && (!["Transfer", "Avoid"].includes(f.treatment) || f.note.trim());
  const save = () => onSave(entry.id, {
    treatment: f.treatment, owner: f.owner, reviewOn: f.reviewOn, note: f.note.trim(),
    acceptance: f.treatment === "Accept" ? { by: f.accBy, reason: f.accReason.trim(), on: localISO() } : null,
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div ref={dialogRef} {...dialogProps(`${entry.id} ${entry.title}`)} onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", height: "100%", background: T.panel, borderLeft: `1px solid ${T.border}`, padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box" }}>
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
                <span style={{ color: c.active ? (T.isDark ? "#34d399" : "#066a4d") : c.violated ? (T.isDark ? "#fb7185" : "#be123c") : (T.isDark ? "#f59e0b" : "#92400e"), fontWeight: 600 }}>
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
              <label htmlFor="assessments-risk-owner" style={labelStyle(T)}>Risk owner</label>
              <select id="assessments-risk-owner" style={fieldStyle(T)} value={f.owner} onChange={e => set({ owner: e.target.value })}>
                {POLICY_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="assessments-next-review" style={labelStyle(T)}>Next review</label>
              <input id="assessments-next-review" type="date" style={fieldStyle(T)} value={f.reviewOn} onChange={e => set({ reviewOn: e.target.value })} />
            </div>
          </div>
          {f.treatment === "Accept" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, border: `1px solid ${T.warnBox.border}`, background: T.warnBox.bg, borderRadius: 9, padding: 12 }}>
              <div style={{ fontSize: 12.5, color: T.warnBox.fg, lineHeight: 1.45 }}>Accepting leaves the residual score at {entry.residual.score}. It stays in the register and on the report.</div>
              <div>
                <label htmlFor="assessments-justification" style={labelStyle(T)}>Justification</label>
                <textarea id="assessments-justification" rows={2} value={f.accReason} onChange={e => set({ accReason: e.target.value })} placeholder="Why is this level of risk acceptable?"
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
              <label htmlFor="assessments-field" style={labelStyle(T)}>{f.treatment === "Mitigate" ? "Notes (optional)" : "How the risk is transferred or avoided"}</label>
              <textarea id="assessments-field" rows={2} value={f.note} onChange={e => set({ note: e.target.value })}
                placeholder={f.treatment === "Transfer" ? "e.g. Covered by cyber insurance policy and vendor indemnity" : f.treatment === "Avoid" ? "e.g. Agent restricted to read-only access" : "Plan, tickets or dependencies"}
                style={{ ...fieldStyle(T), resize: "vertical", fontFamily: "inherit" }} />
            </div>
          )}
          <button disabled={!valid} onClick={save} style={{
            marginTop: 14, width: "100%", background: valid ? T.accent : "rgba(148,163,184,.25)", color: valid ? "#fff" : T.faint,
            border: "none", borderRadius: 9, padding: "11px 16px", fontSize: 14.5, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
          }}>Save treatment</button>
        </DrawerSection>
      </div>
    </div>
  );
}

export function RiskRegister({ register, treatments, onOpen }) {
  const T = useT();
  const [cat, setCat] = useQueryState("category");
  const [lvl, setLvl] = useQueryState("level");
  const [cellQ, setCellQ] = useQueryState("cell", "");
  // cell is kept in the URL as matrix:likelihood-impact, e.g. residual:4-4
  const cell = (() => { const m = cellQ.match(/^(inherent|residual):([1-5])-([1-5])$/); return m ? { key: m[1], l: Number(m[2]), i: Number(m[3]) } : null; })();
  const setCell = c => setCellQ(c ? `${c.key}:${c.l}-${c.i}` : "");
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
    ["High or critical residual", highCrit, highCrit ? (T.isDark ? "#fb7185" : "#be123c") : T.text],
    ["Risk reduced by controls", `${sumI ? Math.round((1 - sumR / sumI) * 100) : 0}%`, T.isDark ? "#34d399" : "#066a4d"],
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
export const gapNextStep = (row, policies) => {
  const mapped = row.policies.map(p => controlStatus(p.id, policies)).find(c => c.state !== "active");
  if (mapped) return mapped;
  const rec = recommendationFor(row.key);
  if (rec) { const c = controlStatus(rec.id, policies); if (c.state !== "active") return c; }
  return null;
};

export function GapAssessment({ assessment, policies, actions, onGapField, onMarkNA }) {
  const gap = assessment.frameworks;
  const T = useT();
  const [fw, setFw] = useQueryState("framework");
  const [status, setStatus] = useQueryState("status");
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
        <button disabled={!naReason.trim()} onClick={() => { onMarkNA(r.key, naReason.trim()); setNaFor(null); setNaReason(""); }} style={{ fontSize: 12.5, fontWeight: 700, padding: "6px 10px", borderRadius: 7, border: "none", background: naReason.trim() ? T.accent : "rgba(148,163,184,.25)", color: naReason.trim() ? "#fff" : T.faint, cursor: naReason.trim() ? "pointer" : "not-allowed" }}>Save</button>
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

export function ReportBody({ scored, register, assessment, treatments, policies, today }) {
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
        <li>Regulatory content version {CONTENT_VERSION}, last reviewed {CONTENT_REVIEWED}. {(() => { const c = allClaims(); const p = c.filter(x => x.verification === "pending").length; return `${c.length - p} of ${c.length} regulatory claims checked against sources; ${p ? `${p} still need review and are flagged in the Frameworks view` : "none outstanding"}.`; })()} Requirement titles are ARGUS summaries, not official wording, and nothing in this report is legal advice.</li>
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

export function AssessmentReport(props) {
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
        <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8, background: T.accent, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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

export function Assessments({ scored, register, assessment, policies, audit, treatments, actions, onSaveTreatment, onGapField, onMarkNA, onOpenAgent, tab = "risk", scenario, onTab, onScenario }) {
  const T = useT();
  const setTab = onTab;
  const setOpenId = id => onScenario(id);
  const entry = scenario && register.find(s => s.id === scenario);
  return (
    <div>
      <PageHeader title="Risk & Gap Assessment" subtitle="AI risk register scored for inherent, residual and target risk, a requirement-by-requirement gap assessment across every framework, and a report you can share." />
      <div style={{ margin: "18px 0" }}>
        <SegTabs value={tab} onChange={setTab} tabs={[["risk", "Risk register", <Grid3x3 size={14} key="i" />], ["gap", "Gap assessment", <ClipboardCheck size={14} key="i" />], ["report", "Report", <FileText size={14} key="i" />]]} />
      </div>
      {scenario && !entry && <NotFound what={`risk scenario ${scenario}`} hint="It may not apply to any registered agent." onBack={() => setOpenId(null)} backLabel="Back to the risk register" />}
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
