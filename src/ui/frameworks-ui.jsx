// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useState } from "react";
import { CheckCircle2, Download, X, Plus, Info, AlertCircle, Link2, ChevronRight, Lightbulb, BadgeCheck } from "lucide-react";
import { FRAMEWORK_GROUPS, CAPABILITIES, RECOMMENDED_POLICIES, recommendationFor, reqLabel } from "../frameworks.js";
import { COVERAGE_METHOD, SCOPE_DISCLAIMER } from "../assessment.js";
import { Card, PageHeader, Pill, dialogProps, fieldStyle, useDialog, useT } from "./base.jsx";
import { GAP_STYLE } from "./controls-ui.jsx";
import { CoverageBar } from "./dashboard.jsx";
import { MethodNote, assessmentTiles } from "./decisions-ui.jsx";
import { FilterChip } from "./registry.jsx";

import { useQueryState } from "../router.js";
import { RECORD_VERIFICATION, VERIFICATION, FORCE, CONTENT_VERSION, CONTENT_REVIEWED, regulatoryFor, reviewState } from "../regulatory.js";
import { fmtDate } from "../timeline.js";
/* ---------------- frameworks ---------------- */

export function Frameworks({ assessment, gapKeys, policies, onOpen, onAdopt }) {
  const T = useT();
  const [group, setGroup] = useQueryState("group");
  const frameworks = assessment.frameworks;
  const list = frameworks.filter(f => group === "all" || f.group === group);

  const summary = [
    ...assessmentTiles(T, assessment),
    { label: "Frameworks tracked", value: frameworks.length, color: T.text, sub: `${assessment.total} curated requirements, ${assessment.na} excluded` },
    { label: "Unmapped requirements", value: assessment.unmapped, color: T.isDark ? "#f59e0b" : "#92400e", sub: "Applicable requirements with no live control" },
  ];

  return (
    <div>
      <PageHeader title="Frameworks" subtitle="Requirement-to-control traceability across AI regulations, standards and threat frameworks. Open a framework to see which policies satisfy each requirement and to close gaps." />

      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${T.mobile ? 140 : 180}px, 1fr))`, gap: T.mobile ? 10 : 14, marginTop: 20 }}>
        {summary.map(s => (
          <Card key={s.label} style={{ padding: T.mobile ? "12px 14px" : "16px 18px" }}>
            <div style={{ color: T.dim, fontSize: 12.5 }}>{s.label}</div>
            <div style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            {s.sub && <div style={{ color: T.faint, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>}
          </Card>
        ))}
      </div>
      <MethodNote a={assessment} style={{ marginTop: 10 }} />

      <RecommendationPlan gapKeys={gapKeys} policies={policies} onAdopt={onAdopt} totalGaps={assessment.unmapped} />

      <div style={{ display: "flex", gap: 8, flexWrap: T.mobile ? "nowrap" : "wrap", overflowX: "auto", margin: "20px 0 16px", paddingBottom: 2 }}>
        {[{ id: "all", label: "All" }, ...FRAMEWORK_GROUPS].map(g => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label}
            count={frameworks.filter(f => g.id === "all" || f.group === g.id).length} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))", gap: T.mobile ? 12 : 16 }}>
        {list.map(f => {
          const gaps = f.unmapped;
          const level = Math.max(1, Math.min(5, 1 + Math.round(((f.coveragePct ?? 0) / 100) * 4)));
          return (
            <Card key={f.id} onClick={() => onOpen(f.id)} style={{ padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>{FRAMEWORK_GROUPS.find(g => g.id === f.group).label}</Pill>
                  <ReviewBadge id={f.id} />
                </span>
                <ChevronRight size={17} color={T.faint} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{f.name}</div>
                <div style={{ color: T.faint, fontSize: 12.5, marginTop: 3, lineHeight: 1.4 }}>{f.source}</div>
              </div>
              <div style={{ marginTop: "auto" }}>
                <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Mapped coverage"} covered={f.mapped} total={f.applicable} pct={f.coveragePct} fulfillment={f.fulfillmentPct} />
                <div style={{ color: gaps ? (T.isDark ? "#f59e0b" : "#92400e") : T.faint, fontSize: 12.5, marginTop: 8 }}>
                  {f.applicable === 0 ? "No agent in scope" : gaps ? `${gaps} unmapped requirement${gaps > 1 ? "s" : ""}` : "Every applicable requirement mapped"}
                  {f.na > 0 && f.applicable > 0 && <span style={{ color: T.faint }}> · {f.na} excluded</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ color: T.faint, fontSize: 12, marginTop: 18, lineHeight: 1.5 }}>
        {SCOPE_DISCLAIMER} {COVERAGE_METHOD} Regulatory content version {CONTENT_VERSION}, last reviewed {fmtDate(CONTENT_REVIEWED)}; open a framework to see its sources and which claims still need review.
      </div>
    </div>
  );
}

export function RecommendedControl({ tpl, reqKey, gapKeys, policies, onAdopt }) {
  const T = useT();
  const a = T.action[tpl.action];
  const existing = policies.find(p => p.id === tpl.id);
  const alsoCloses = tpl.closeKeys.filter(k => k !== reqKey && gapKeys.has(k)).map(reqLabel);
  return (
    <div style={{ marginTop: 10, background: T.panel, border: `1px dashed ${T.blueBorder}`, borderRadius: 9, padding: "12px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", color: T.blue, textTransform: "uppercase" }}>
        <Lightbulb size={13} /> Recommended control
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{tpl.name}</div>
        <Pill small fg={a.fg} bg={a.bg}>{tpl.action}</Pill>
      </div>
      <div style={{ color: T.dim, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{tpl.desc}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
        <span style={{ fontWeight: 700 }}>Evidence to retain: </span>
        <span style={{ color: T.dim }}>{tpl.evidence}</span>
      </div>
      {alsoCloses.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Also closes:</span>
          {alsoCloses.map(l => <Pill key={l} small fg={T.dim} bg={T.panelSoft} border={T.border}>{l}</Pill>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 11 }}>
        <button onClick={() => onAdopt(tpl)} style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700,
          padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: T.accent, color: "#fff", border: "none",
        }}>
          {existing
            ? (existing.status === "draft" ? <><BadgeCheck size={14} /> Approve this policy</> : <><Plus size={14} /> {existing.enabled ? "Map this policy" : "Enable and map this policy"}</>)
            : <><Plus size={14} /> Create from template</>}
        </button>
        <a href={tpl.template} download style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.blue, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <Download size={14} /> Download template (.docx)
        </a>
      </div>
    </div>
  );
}

export function RecommendationPlan({ gapKeys, policies, onAdopt, totalGaps }) {
  const T = useT();
  const [showAll, setShowAll] = useState(false);
  const ranked = RECOMMENDED_POLICIES
    .map(t => ({ t, open: t.closeKeys.filter(k => gapKeys.has(k)) }))
    .filter(x => x.open.length > 0)
    .sort((a, b) => b.open.length - a.open.length);
  if (ranked.length === 0) return null;
  const closable = new Set(ranked.flatMap(x => x.open)).size;
  const shown = showAll ? ranked : ranked.slice(0, 4);

  return (
    <Card style={{ padding: T.mobile ? 16 : 20, marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lightbulb size={17} color={T.blue} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>Recommended controls</div>
      </div>
      <div style={{ color: T.dim, fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>
        Adding these {ranked.length} policies would close {closable} of {totalGaps} open gaps. Ranked by how many gaps each one closes.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {shown.map(({ t, open }) => {
          const a = T.action[t.action];
          const existing = policies.find(p => p.id === t.id);
          return (
            <div key={t.id} style={{
              display: "flex", flexDirection: T.mobile ? "column" : "row", alignItems: T.mobile ? "stretch" : "center",
              gap: T.mobile ? 10 : 16, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                  <Pill small fg={a.fg} bg={a.bg}>{t.action}</Pill>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: T.isDark ? "#f59e0b" : "#92400e", fontWeight: 700 }}>
                    Closes {open.length} gap{open.length > 1 ? "s" : ""}:
                  </span>
                  {open.map(k => <Pill key={k} small fg={T.dim} bg={T.panel} border={T.border}>{reqLabel(k)}</Pill>)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <a href={t.template} download aria-label={`Download ${t.name} template`} title="Download template (.docx)" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${T.blueBorder}`, color: T.blue, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
                  flex: T.mobile ? 1 : "none",
                }}>
                  <Download size={14} />{T.mobile && " Template"}
                </a>
                <button onClick={() => onAdopt(t)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700,
                  padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: T.accent, color: "#fff", border: "none", whiteSpace: "nowrap",
                  flex: T.mobile ? 1 : "none",
                }}>
                  {existing?.status === "draft" ? <><BadgeCheck size={14} /> Approve</> : <><Plus size={14} /> {existing ? "Enable and map" : "Create"}</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {ranked.length > 4 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop: 12, background: "none", border: "none", color: T.blue, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          {showAll ? "Show fewer" : `Show all ${ranked.length} recommendations`}
        </button>
      )}
    </Card>
  );
}

export function FrameworkDrawer({ framework, policies, gapKeys, onClose, onLink, onTogglePolicy, onAdopt, onApprove }) {
  const T = useT();
  const [linking, setLinking] = useState(null);
  const dialogRef = useDialog(onClose, !!framework);
  if (!framework) return null;
  const f = framework;
  const byId = Object.fromEntries(policies.map(p => [p.id, p]));
  const green = T.isDark ? "#34d399" : "#066a4d";
  const amber = T.isDark ? "#f59e0b" : "#92400e";
  const level = Math.max(1, Math.min(5, 1 + Math.round(((f.coveragePct ?? 0) / 100) * 4)));
  const GS = GAP_STYLE(T);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div ref={dialogRef} {...dialogProps(`${f.name} requirements`)} onClick={e => e.stopPropagation()} style={{
        width: "min(560px, 100%)", height: "100%", background: T.panel, borderLeft: `1px solid ${T.border}`,
        padding: T.mobile ? 18 : 26, overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>{f.name}</h2>
            <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>{f.source}</div>
          </div>
          <button onClick={onClose} aria-label="Close framework" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", flexShrink: 0 }}><X size={20} /></button>
        </div>

        <div style={{ margin: "18px 0" }}>
          <CoverageBar label={f.maturity ? `Indicative level ${level} of 5` : "Mapped control coverage"} covered={f.mapped} total={f.applicable} pct={f.coveragePct} fulfillment={f.fulfillmentPct} />
          <div style={{ fontSize: 12, color: T.faint, marginTop: 6, lineHeight: 1.5 }}>
            {f.met} met · {f.partial} partially met · {f.notMet} not met{f.na ? ` · ${f.na} not applicable` : ""}. Curated subset of the framework, not a compliance determination.
          </div>
        </div>

        {f.note && (
          <div style={{ display: "flex", gap: 10, background: T.blueSoft, border: `1px solid ${T.blueBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <Info size={15} color={T.blue} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.55, color: T.text }}>{f.note}</div>
          </div>
        )}
        <RegulatorySource id={f.id} />

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Requirements</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {f.rows.map(req => {
            const na = req.status === "Not applicable";
            const linkedPolicies = req.refs.filter(x => !x.startsWith("cap:")).map(x => byId[x]).filter(Boolean);
            const caps = req.refs.filter(x => x.startsWith("cap:")).map(x => CAPABILITIES[x.slice(4)]);
            const gapOpen = !req.covered && !na;
            const disabledOnly = !req.covered && linkedPolicies.length > 0;
            const linkable = policies.filter(p => !req.refs.includes(p.id));
            return (
              <div key={req.key} style={{ background: T.panelSoft, border: `1px solid ${!gapOpen ? T.border : (T.isDark ? "rgba(245,158,11,.35)" : "rgba(180,83,9,.3)")}`, borderRadius: 10, padding: "12px 14px", borderStyle: na ? "dashed" : "solid" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {!gapOpen
                    ? <CheckCircle2 size={16} color={green} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <AlertCircle size={16} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.blue, fontFamily: "ui-monospace, monospace" }}>{req.id}</span>
                      <Pill small fg={GS[req.status].fg} bg={GS[req.status].bg} border={GS[req.status].border}>{req.status}</Pill>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginTop: 2 }}>{req.title}</div>

                    {(caps.length > 0 || linkedPolicies.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {caps.map(c => <Pill key={c} small fg={T.dim} bg={T.panel} border={T.border}>{c}</Pill>)}
                        {linkedPolicies.map(p => (
                          <Pill key={p.id} small fg={p.enabled && p.status !== "draft" ? T.blue : T.faint} bg={p.enabled && p.status !== "draft" ? T.blueSoft : T.panel} border={p.enabled && p.status !== "draft" ? T.blueBorder : T.border}>
                            {p.name}{p.status === "draft" ? " (draft)" : p.enabled ? "" : " (off)"}
                          </Pill>
                        ))}
                      </div>
                    )}

                    {na && <div style={{ fontSize: 12.5, color: T.faint, marginTop: 8, lineHeight: 1.45 }}>Excluded: {req.basis.replace(/^Marked not applicable: /, "")}</div>}
                    {gapOpen && (
                      <div style={{ fontSize: 12.5, color: amber, marginTop: 8, lineHeight: 1.45 }}>
                        {!disabledOnly ? "Gap: no control mapped yet."
                          : linkedPolicies.some(p => p.status === "draft") ? "Gap: the mapped policy is awaiting approval."
                          : "Gap: the mapped policy is disabled."}
                      </div>
                    )}

                    {gapOpen && !disabledOnly && recommendationFor(req.key) && (
                      <RecommendedControl tpl={recommendationFor(req.key)} reqKey={req.key} gapKeys={gapKeys}
                        policies={policies} onAdopt={onAdopt} />
                    )}

                    {gapOpen && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {disabledOnly && linkedPolicies.filter(p => p.status === "draft").map(p => (
                          <button key={`a-${p.id}`} onClick={() => onApprove(p.id)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: T.accent, color: "#fff", border: "none" }}>
                            <BadgeCheck size={13} /> Approve {p.name}
                          </button>
                        ))}
                        {disabledOnly && linkedPolicies.filter(p => !p.enabled && p.status !== "draft").map(p => (
                          <button key={p.id} onClick={() => onTogglePolicy(p.id)} style={{ fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: T.accent, color: "#fff", border: "none" }}>
                            Enable {p.name}
                          </button>
                        ))}
                        {linking === req.key ? (
                          <select autoFocus defaultValue="" onChange={e => { if (e.target.value) { onLink(req.key, e.target.value); setLinking(null); } }}
                            onBlur={() => setLinking(null)}
                            style={{ ...fieldStyle(T), width: "auto", maxWidth: "100%", padding: "6px 8px", fontSize: 13, background: T.panel }}>
                            <option value="" disabled>Choose a policy to map…</option>
                            {linkable.map(p => <option key={p.id} value={p.id}>{p.name}{p.enabled ? "" : " (disabled)"}</option>)}
                          </select>
                        ) : (
                          <button onClick={() => setLinking(req.key)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: T.blue, border: `1px solid ${T.blueBorder}` }}>
                            <Link2 size={13} /> {recommendationFor(req.key) && !disabledOnly ? "Map an existing policy instead" : "Map a policy"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {f.tagged.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, margin: "22px 0 10px" }}>Also tagged to this framework</div>
            <div style={{ color: T.dim, fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
              These policies were tagged when created but are not mapped to a specific requirement, so they don't count toward coverage yet.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {f.tagged.map(p => <Pill key={p.id} small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>{p.name}</Pill>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Verification badge for a framework's regulatory record
export function ReviewBadge({ id }) {
  const T = useT();
  const st = reviewState(id);
  const tone = st === "verified" ? T.risk.LOW : st === "secondary" ? T.risk.MEDIUM : T.risk.HIGH;
  return <span title={VERIFICATION[st].detail}><Pill small fg={tone.fg} bg={tone.bg} border={tone.border}>{st === "pending" ? "! " : "✓ "}{VERIFICATION[st].label}</Pill></span>;
}

// Where a framework comes from, what kind of instrument it is, the dates that matter, and what has been checked
export function RegulatorySource({ id }) {
  const T = useT();
  const r = regulatoryFor(id);
  const [open, setOpen] = useState(false);
  if (!r) return null;
  const row = (k, v) => (<><dt style={{ color: T.faint }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></>);
  const pending = r.claims.filter(c => c.verification === "pending").length;
  return (
    <section aria-label="Source and status" style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Source and status</h3>
        <ReviewBadge id={id} />
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 12px", margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.45 }}>
        {row("Instrument", r.official)}
        {row("Issued by", `${r.publisher} · ${r.jurisdiction}`)}
        {row("Legal force", FORCE[r.force])}
        {row("Version used", r.version)}
        {r.dates.length > 0 && row("Key dates", <ul style={{ margin: 0, paddingLeft: 16 }}>{r.dates.map(d => <li key={d.label}>{d.label}: {/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? fmtDate(d.date) : d.date}</li>)}</ul>)}
        {row("Primary source", <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: T.blue, wordBreak: "break-all" }}>{r.url}</a>)}
        {row("Record status", `${VERIFICATION[RECORD_VERIFICATION[id]].label}: ${VERIFICATION[RECORD_VERIFICATION[id]].detail.toLowerCase()}`)}
        {row("Last reviewed", `${fmtDate(CONTENT_REVIEWED)} · content version ${CONTENT_VERSION}`)}
      </dl>
      <button aria-expanded={open} onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 8 }}>
        {open ? "Hide" : "Show"} the {r.claims.length} claim{r.claims.length === 1 ? "" : "s"} ARGUS makes{pending ? ` (${pending} need${pending === 1 ? "s" : ""} review)` : ""}
      </button>
      {open && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {r.claims.map(c => (
            <li key={c.id} style={{ fontSize: 12.5, lineHeight: 1.45, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 9px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <b>{VERIFICATION[c.verification].label}</b><span style={{ color: T.faint }}>· {c.kind}</span>
              </div>
              <div style={{ color: T.dim, marginTop: 2 }}>{c.text}</div>
              {c.finding && <div style={{ marginTop: 2 }}>Finding: {c.finding}</div>}
              {c.sources && <div style={{ marginTop: 2 }}>{c.sources.map(x => <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" style={{ color: T.blue, marginRight: 10 }}>{x.label}</a>)}</div>}
              {c.checkedOn && <div style={{ color: T.faint, marginTop: 2 }}>Checked {fmtDate(c.checkedOn)}</div>}
            </li>
          ))}
        </ul>
      )}
      <div style={{ fontSize: 12, color: T.faint, marginTop: 8, lineHeight: 1.45 }}>
        Requirement titles below are ARGUS summaries used to map controls, not the official wording. Not legal advice.
      </div>
    </section>
  );
}
