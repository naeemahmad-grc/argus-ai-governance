// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useMemo, useEffect } from "react";
import { Shield, FileText, Download, Plus, BadgeCheck, Clock } from "lucide-react";
import { FRAMEWORK_GROUPS, RECOMMENDED_POLICIES, frameworksForPolicy } from "../frameworks.js";
import { Card, PageHeader, Pill, Toggle, useT } from "./base.jsx";
import { ControlEvidence } from "./controls-ui.jsx";
import { FW_GROUP, FilterChip, chipRow } from "./registry.jsx";

import { useQueryState } from "../router.js";
export function PolicyMeta({ p, onApprove }) {
  const T = useT();
  const amber = T.isDark ? "#fbbf3c" : "#92400e";
  const green = T.isDark ? "#34d399" : "#066a4d";
  const tpl = RECOMMENDED_POLICIES.find(t => t.id === p.templateId);
  const link = { display: "inline-flex", alignItems: "center", gap: 5, color: T.blue, fontSize: 12.5, fontWeight: 600, textDecoration: "none", maxWidth: "100%" };
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${T.border}`, display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
      {p.owner && <div style={{ color: T.dim }}>Owner: <span style={{ color: T.text, fontWeight: 600 }}>{p.owner}</span></div>}
      {p.status === "draft" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: amber, fontWeight: 700 }}>
            <Clock size={13} /> Draft, pending approval
          </span>
          <button onClick={() => onApprove(p.id)} style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, cursor: "pointer", background: T.accent, color: T.onAccent, border: "none" }}>
            Approve
          </button>
        </div>
      ) : p.approvedBy && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.dim }}>
          <BadgeCheck size={14} color={green} style={{ flexShrink: 0 }} />
          <span>Approved by <span style={{ color: T.text, fontWeight: 600 }}>{p.approvedBy}</span> · <span style={{ whiteSpace: "nowrap" }}>{p.approvedOn}</span>{p.approvalSource === "recorded" ? " · recorded from outside ARGUS" : ""}</span>
        </div>
      )}
      {(p.doc || tpl) && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {p.doc && (p.doc.url ? (
            <a href={p.doc.url} download={p.doc.name} style={link} title={p.doc.name}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.doc.name}</span>
            </a>
          ) : (
            <span style={{ ...link, color: T.dim, fontWeight: 500 }} title={`${p.doc.name} (evidence on file, demo placeholder)`}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.doc.name}</span>
            </span>
          ))}
          {tpl && <a href={tpl.template} download style={link}><Download size={13} /> Template</a>}
        </div>
      )}
    </div>
  );
}

export function PolicyEngine({ policies, reqMap, toggle, onOpenCreate, onApprove, agents, onTest, onRevise, focus }) {
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => { const el = document.getElementById(`policy-${focus}`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); el.focus({ preventScroll: true }); } }, 60);
    return () => clearTimeout(t);
  }, [focus]);
  const T = useT();
  const [group, setGroup] = useQueryState("group");
  const [action, setAction] = useQueryState("action");

  const rows = useMemo(() => policies.map(p => {
    const fws = frameworksForPolicy(p, reqMap);
    return { p, fws, groups: new Set(fws.map(f => FW_GROUP[f]).filter(Boolean)) };
  }), [policies, reqMap]);

  const inGroup = (r, g) => g === "all" || (g === "unmapped" ? r.groups.size === 0 : r.groups.has(g));
  const inAction = (r, act) => act === "all" || r.p.action === act;
  const shown = rows.filter(r => inGroup(r, group) && inAction(r, action));

  const groupChips = [{ id: "all", label: "All" }, ...FRAMEWORK_GROUPS];
  const unmapped = rows.filter(r => r.groups.size === 0).length;
  if (unmapped > 0 || group === "unmapped") groupChips.push({ id: "unmapped", label: "Not mapped" });
  const actionChips = [
    { id: "all", label: "Any action" },
    { id: "BLOCK", label: "Block" },
    { id: "REQUIRE APPROVAL", label: "Require approval" },
    { id: "WARN", label: "Warn" },
    { id: "AUDIT", label: "Audit" },
  ];
  const filtered = group !== "all" || action !== "all";

  return (
    <div>
      <PageHeader title="Policy Engine" subtitle="Define and manage governance rules for AI agent behavior. Framework tags come from the requirement crosswalk.">
        <button onClick={onOpenCreate} style={{ display: "flex", alignItems: "center", gap: 8, background: T.accent, border: "none", color: T.onAccent, borderRadius: 999, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Create Policy
        </button>
      </PageHeader>

      <div style={{ ...chipRow(T.mobile), marginTop: 20 }}>
        {groupChips.map(g => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label}
            count={rows.filter(r => inGroup(r, g.id) && inAction(r, action)).length} />
        ))}
      </div>
      <div style={{ ...chipRow(T.mobile), marginTop: 8 }}>
        {actionChips.map(c => (
          <FilterChip key={c.id} active={action === c.id} onClick={() => setAction(c.id)} label={c.label}
            count={rows.filter(r => inGroup(r, group) && inAction(r, c.id)).length} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, color: T.faint, fontSize: 13 }}>
        <span>Showing {shown.length} of {policies.length} policies</span>
        {filtered && (
          <button onClick={() => { setGroup("all"); setAction("all"); }} style={{ background: "none", border: "none", color: T.blue, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Clear filters
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <Card style={{ padding: 28, textAlign: "center", color: T.faint, marginTop: 14 }}>
          No policies match these filters.
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: T.mobile ? 12 : 16, marginTop: 14 }}>
        {shown.map(({ p, fws }) => {
          const a = T.action[p.action];
          const tags = fws.slice(0, 5);
          return (
            <Card key={p.id} id={`policy-${p.id}`} tabIndex={-1} style={{ outline: focus === p.id ? `2px solid ${T.blue}` : undefined, outlineOffset: 2, display: "flex", flexDirection: "column", borderStyle: p.enabled ? "solid" : "dashed", scrollMarginTop: 20 }}>
              <div style={{ padding: "18px 18px 14px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Pill fg={T.dim} bg={T.panelSoft} border={T.border}>{p.tag}</Pill>
                  <Toggle on={p.enabled} onChange={() => toggle(p.id)} />
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ color: T.dim, fontSize: 13.5, lineHeight: 1.5 }}>{p.desc}</div>
                {p.evidence && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 8 }}>
                    <span style={{ fontWeight: 700 }}>Evidence: </span><span style={{ color: T.dim }}>{p.evidence}</span>
                  </div>
                )}
                {fws.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {tags.map(fw => (
                      <Pill key={fw} small fg={T.blue} bg={T.blueSoft} border={T.blueBorder}>{fw}</Pill>
                    ))}
                    {fws.length > tags.length && (
                      <Pill small fg={T.dim} bg={T.panelSoft} border={T.border}>+{fws.length - tags.length} more</Pill>
                    )}
                  </div>
                )}
                <PolicyMeta p={p} onApprove={onApprove} />
                <ControlEvidence p={p} agents={agents} onTest={onTest} onRevise={onRevise} />
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pill fg={a.fg} bg={a.bg}>Action: {p.action}</Pill>
                <span style={{ color: T.dim, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={13} /> {p.violations} Violations
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
