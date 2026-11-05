// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { Download } from "lucide-react";
import { localISO, fmtWhenLong, age } from "../timeline.js";
import { can, ownsAgent } from "../identity.js";
import { verifyChain, redact, toCSV } from "../audit.js";
import { useActor } from "./actor.jsx";
import { Card, PageHeader, Pill, SevDot, fieldStyle, useT } from "./base.jsx";
import { downloadFile } from "./controls-ui.jsx";

import { useRoute } from "../router.js";
/* ---------------- audit investigation ---------------- */

export const OUTCOME_LABEL = { success: "Success", denied: "Denied", detected: "Detected" };

export function AuditTrail({ audit, agents, policies, onOpenAgent, onOpenPolicy, notify }) {
  const T = useT();
  const { user } = useActor();
  const all = can(user, "audit.all").ok;
  const mine = new Set(agents.filter(a => ownsAgent(user, a)).map(a => a.name));
  const visible = all ? audit : audit.filter(e => mine.has(e.agent) || e.agent === "—");
  const { route, setQuery } = useRoute();
  const DEF = { q: "", agent: "all", type: "all", actor: "all", outcome: "all", from: "", to: "", corr: "" };
  const f = Object.fromEntries(Object.entries(DEF).map(([k, d]) => [k, route.query?.[k] ?? d]));
  const setF = fn => setQuery(Object.fromEntries(Object.entries(fn(f)).map(([k, v]) => [k, v === DEF[k] ? undefined : v])));
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
  const red = T.isDark ? "#ffadb8" : "#be123c", green = T.isDark ? "#34d399" : "#066a4d";

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
        <button onClick={exportCsv} disabled={!shown.length} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.blue, borderRadius: 12, padding: "9px 16px", fontSize: 14, cursor: shown.length ? "pointer" : "not-allowed" }}>
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
      {f.agent !== "all" && !all && !mine.has(f.agent) && (
        <div role="alert" style={{ fontSize: 13, color: T.warnBox.fg, background: T.warnBox.bg, border: `1px solid ${T.warnBox.border}`, borderRadius: 12, padding: "9px 12px", marginBottom: 10 }}>
          You're acting as {user.name}, who doesn't have access to {f.agent}'s events. Only its owner, governance roles and internal audit can see them.
        </div>
      )}
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
                        <td style={{ padding: "11px 12px", fontSize: 12.5, fontWeight: 700, color: oc === "denied" ? red : oc === "detected" ? (T.isDark ? "#fbbf3c" : "#92400e") : green }}>{OUTCOME_LABEL[oc]}</td>
                        <td style={{ padding: "11px 12px", fontSize: 13.5 }}>
                          {e.desc}
                          <div><button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.eid)} style={{ ...linkBtn(T), marginTop: 4 }}>{isOpen ? "Hide details" : "Details"}</button></div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr><td colSpan={7} style={{ padding: "0 12px 12px 44px" }}>
                          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 14px", margin: 0, fontSize: 12.5, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px" }}>
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

export const linkBtn = T => ({ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 });
