import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, Bell, Activity, Users, FileText, AlertTriangle, ScanSearch, CheckCircle2, X, Info, Sun, Moon,
  RotateCcw, MessageCircle, ExternalLink, Menu, Layers, ClipboardCheck, Inbox
} from "lucide-react";
import { FRAMEWORKS, SEED_REQ_MAP, RECOMMENDED_POLICIES, reqLabel } from "./frameworks.js";
import { TRAITS, mapAgent } from "./agentMapping.js";
import { scoreAgent, buildRegister } from "./riskLibrary.js";
import { requirements, PROBATION_DAYS } from "./lifecycle.js";
import { localISO, fmtWhen, fmtWhenLong } from "./timeline.js";
import { DEFAULT_GATES } from "./gates.js";
import { buildAssessment } from "./assessment.js";
import { decisionQueue } from "./decisions.js";
import { newTest } from "./controls.js";
import { DEMO_USERS, DEFAULT_USER, can, ownsAgent } from "./identity.js";
import { checkCommand } from "./commands.js";
import { seal, redact } from "./audit.js";

import { SEED_AGENTS, SEED_POLICIES, SEED_AUDIT } from "./seedData.js";
import { useRouter, RouterCtx, slugify } from "./router.js";

const FEEDBACK_URL = "https://tally.so/r/YOUR-FORM-ID";
import { ActorCtx, IdentitySwitcher, NotAllowed } from "./ui/actor.jsx";
import { AgentDrawer } from "./ui/agent-drawer.jsx";
import { Assessments } from "./ui/assessments.jsx";
import { AuditTrail } from "./ui/audit-trail.jsx";
import { Modal, NotFound, PanoptesMark, Pill, THEMES, ThemeCtx, dialogProps, fieldStyle, srOnly, useDialog, useIsMobile } from "./ui/base.jsx";
import { Heatmap } from "./ui/charts.jsx";
import { TestForm, addDays } from "./ui/controls-ui.jsx";
import { Dashboard } from "./ui/dashboard.jsx";
import { Decisions } from "./ui/decisions-ui.jsx";
import { ApprovePolicyModal, CreatePolicyModal, RegisterAgentModal, fmtSize } from "./ui/forms.jsx";
import { FrameworkDrawer, Frameworks } from "./ui/frameworks-ui.jsx";
import { PolicyEngine } from "./ui/policies.jsx";
import { Registry } from "./ui/registry.jsx";

/* ---------------- shell ---------------- */

export default function ArgusMVP() {
  // theme: dark by default, and the viewer's choice is remembered in this browser
  const [mode, setMode] = useState(() => {
    try { const saved = localStorage.getItem("argus-theme"); if (saved === "dark" || saved === "light") return saved; } catch { /* storage unavailable */ }
    return "dark";
  });
  useEffect(() => { try { localStorage.setItem("argus-theme", mode); } catch { /* storage unavailable */ } }, [mode]);
  const mobile = useIsMobile();
  const T = useMemo(() => ({ ...THEMES[mode], mobile }), [mode, mobile]);
  // where you are lives in the URL (see router.js)
  const router = useRouter();
  const { route, navigate } = router;
  const view = route.view;
  const [agents, setAgents] = useState(SEED_AGENTS);
  const [policies, setPolicies] = useState(SEED_POLICIES);
  const [audit, setAudit] = useState(SEED_AUDIT);
  const [reqMap, setReqMap] = useState(SEED_REQ_MAP);
  const routedAgent = route.agent ? agents.find(a => slugify(a.name) === route.agent) : null;
  const detailId = routedAgent?.id ?? null;
  const fwOpen = route.framework || null;
  const returnTo = useRef(null);
  const [modal, setModal] = useState(null);
  const [policyTemplate, setPolicyTemplate] = useState(null);
  const [approving, setApproving] = useState(null);
  const [globalQ, setGlobalQ] = useState("");
  const [toast, setToast] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [testing, setTesting] = useState(null);
  // simulated identity: who is acting. Checks run in the browser only (see identity.js).
  const [userId, setUserId] = useState(DEFAULT_USER.id);
  const user = DEMO_USERS.find(u => u.id === userId) || DEFAULT_USER;
  const userRef = useRef(user);
  userRef.current = user;
  const evSeq = useRef(SEED_AUDIT.length);

  const [treatments, setTreatments] = useState({});
  const [gates, setGates] = useState(DEFAULT_GATES);
  const [gapOverrides, setGapOverrides] = useState({});
  // agent risk scores, the risk register and the gap assessment are all derived from current state
  const scored = useMemo(() => agents.map(a => ({ ...a, ...scoreAgent(a, policies, audit) })), [agents, policies, audit]);
  const register = useMemo(() => buildRegister(scored), [scored]);
  // one assessment feeds the dashboard, frameworks, gap assessment and report
  const assessment = useMemo(() => buildAssessment(reqMap, policies, scored, gapOverrides), [reqMap, policies, scored, gapOverrides]);
  const openFramework = fwOpen ? assessment.frameworks.find(f => f.id === fwOpen) : null;
  const gapKeys = assessment.gapKeys;
  const decisions = useMemo(() => decisionQueue({ scored, register, policies, audit, treatments, gates, assessment, gapOverrides }),
    [scored, register, policies, audit, treatments, gates, assessment, gapOverrides]);

  useEffect(() => { if (!mobile) setNavOpen(false); }, [mobile]);

  const notify = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Append-only: events are only ever added, sealed into the checksum chain, and free text is redacted first
  const log = (sev, type, agent, desc, extra = {}) => {
    const at = Date.now();
    const u = userRef.current;
    const { role, actor, ...rest } = extra;
    const eid = `EVT-${String(++evSeq.current).padStart(4, "0")}`;
    const ev = { eid, sev, at, ts: fmtWhenLong(at), type, agent, desc: redact(desc), outcome: "success", ...rest,
      actor: actor || { name: u.name, role: role || u.roles[0] || "Agent owner" } };
    setAudit(list => [seal(ev, list), ...list]);
  };
  const denied = (label, reason, agent = "—") => {
    notify(reason);
    log("warn", "Action Denied", agent || "—", `${label} denied for ${userRef.current.name}: ${reason}`, { outcome: "denied" });
  };
  // the browser-side stand-in for a server authorization check
  const allowed = (action, ctx, label, agent) => {
    const r = can(userRef.current, action, ctx);
    if (!r.ok) denied(label, r.reason, agent);
    return r.ok;
  };
  const actAs = id => {
    const u = DEMO_USERS.find(x => x.id === id);
    if (!u || u.id === userRef.current.id) return;
    setUserId(id);
    notify(`Now acting as ${u.name} (simulated)`);
  };

  const resetDemo = () => {
    setAgents(SEED_AGENTS);
    setPolicies(SEED_POLICIES);
    setAudit(SEED_AUDIT);
    setReqMap(SEED_REQ_MAP);
    setTreatments({});
    setGates(DEFAULT_GATES);
    setGapOverrides({});
    evSeq.current = SEED_AUDIT.length;
    setTesting(null);
    if (route.agent) navigate({ view: "registry" }, { replace: true });
    setModal(null);
    setApproving(null);
    notify("Demo data reset to its original state");
  };

  const togglePolicy = id => {
    const p = policies.find(x => x.id === id);
    if (!allowed("policy.manage", {}, p?.enabled ? "Disabling a policy" : "Enabling a policy")) return;
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    if (p) log("info", "Policy Change", "—", `Policy "${p.name}" ${p.enabled ? "disabled" : "enabled"}`, { entity: { kind: "policy", id, version: p.version || 1 }, before: { enabled: p.enabled }, after: { enabled: !p.enabled } });
  };

  const linkPolicy = (key, policyId) => {
    if (!allowed("policy.manage", {}, "Control mapping")) return;
    setReqMap(m => ({ ...m, [key]: [...(m[key] || []), policyId] }));
    const [fwId, idx] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const req = fw?.requirements[Number(idx)];
    const p = policies.find(x => x.id === policyId);
    if (fw && req && p) {
      log("info", "Control Mapped", "—", `"${p.name}" mapped to ${fw.short} ${req.id} (${req.title})`, { entity: { kind: "mapping", id: key }, after: { policy: policyId } });
      notify(`Mapped to ${fw.short} ${req.id}`);
    }
  };

  const openCreatePolicy = (templateId = null) => { setPolicyTemplate(templateId); setModal("policy"); };

  // From a recommendation: approve a draft, re-enable a disabled policy, or open the form pre-filled from the template
  const adoptRecommendation = tpl => {
    if (!allowed("policy.manage", {}, "Adopting a recommended control")) return;
    const existing = policies.find(p => p.id === tpl.id);
    if (!existing) return openCreatePolicy(tpl.id);
    if (existing.status === "draft") return setApproving(existing.id);
    const closing = tpl.closeKeys.filter(k => gapKeys.has(k));
    if (!existing.enabled) setPolicies(ps => ps.map(p => p.id === tpl.id ? { ...p, enabled: true } : p));
    setReqMap(m => {
      const next = { ...m };
      tpl.closeKeys.forEach(k => { if (!(next[k] || []).includes(tpl.id)) next[k] = [...(next[k] || []), tpl.id]; });
      return next;
    });
    log("info", "Policy Change", "—", `"${tpl.name}" enabled and mapped; closes ${closing.map(reqLabel).join(", ") || "no open gaps"}`);
    notify(`${tpl.name} enabled. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.`);
  };

  const approvePolicy = (id, a) => {
    const p = policies.find(x => x.id === id);
    if (!p) return;
    const tpl = RECOMMENDED_POLICIES.find(t => t.id === (p.templateId || p.id));
    const keys = Object.entries(reqMap).filter(([, refs]) => refs.includes(id)).map(([k]) => k);
    const closing = keys.filter(k => gapKeys.has(k));
    if (!allowed("policy.approve", { role: a.approvedBy, owner: p.owner, requester: p.revisedBy || p.createdBy }, `Approval of "${p.name}"`)) return;
    const v = p.version || 1;
    const u = userRef.current;
    const doc = a.doc && a.doc !== p.doc ? { ...a.doc, version: v } : p.doc;
    setPolicies(ps => ps.map(x => x.id === id ? { ...x, status: "approved", approvedBy: a.approvedBy, approvedOn: a.approvedOn, approvedVersion: v, approvedByUser: u.id, approvalSource: "argus", doc } : x));
    if (a.doc && a.doc !== p.doc) log("info", "Document Uploaded", "—", `"${a.doc.name}" (v${v}, ${fmtSize(a.doc.size)}, SHA-256 ${a.doc.sha256?.slice(0, 12)}…) attached to policy "${p.name}"`, { entity: { kind: "policy", id, version: v } });
    log("info", "Policy Approved", "—", `${u.name} (${a.approvedBy}) approved version ${v} of "${p.name}" on ${a.approvedOn}${closing.length ? `; closes ${closing.map(reqLabel).join(", ")}` : ""}`,
      { role: a.approvedBy, entity: { kind: "policy", id, version: v }, before: { status: p.status }, after: { status: "approved", version: v } });
    setApproving(null);
    notify(closing.length ? `Approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy approved by ${a.approvedBy}`);
  };

  // open an agent's panel at /registry/:agent; closing returns to wherever it was opened from
  const setDetailId = (id, tab = "overview") => {
    if (id === null) { const back = returnTo.current; returnTo.current = null; navigate(back || { view: "registry" }); return; }
    const a = agents.find(x => x.id === id);
    if (!a) return;
    if (!route.agent) returnTo.current = window.location.pathname + window.location.search;
    navigate({ view: "registry", agent: slugify(a.name), agentTab: tab });
  };
  const setFwOpen = id => navigate({ view: "frameworks", framework: id || undefined, query: id ? {} : route.query });
  const openAgent = name => {
    const a = agents.find(x => x.name === name);
    if (a) setDetailId(a.id);
  };

  const updateAgent = (id, patch) => setAgents(as => as.map(a => a.id === id ? { ...a, ...(typeof patch === "function" ? patch(a) : patch), rev: (a.rev || 0) + 1 } : a));
  const today = () => localISO();

  // Agent lifecycle: owner works the requirements and submits; an independent approver decides.
  // Every command is validated first (who, state, and whether the record changed since it was opened).
  const ctxNow = { audit, treatments, gates };
  const command = (id, cmd, label) => {
    const a = scored.find(x => x.id === id);
    const r = checkCommand(a, cmd, userRef.current, ctxNow);
    if (!r.ok) denied(label, r.reason, a?.name);
    return r.ok ? a : null;
  };
  const agentEntity = a => ({ kind: "agent", id: a.name, version: a.rev || 0 });
  const life = {
    attest: (id, key) => {
      const a = command(id, { type: "attest" }, "Owner attestation"); if (!a) return;
      const u = userRef.current;
      updateAgent(id, x => ({ attest: { ...(x.attest || {}), [key]: { by: u.name, on: today() } } }));
      log("info", "Owner Attestation", a.name, `${u.name} (owner, ${a.owner}) confirmed ${a.name}'s ${key === "arch" ? "architecture" : "characteristics"} are accurate`, { role: "Agent owner", entity: agentEntity(a) });
    },
    rootCause: (id, vid, v) => {
      const a = command(id, { type: "rootCause" }, "Root cause"); if (!a) return;
      const clean = { cause: redact(v.cause), fix: redact(v.fix) };
      updateAgent(id, x => ({ resolutions: { ...(x.resolutions || {}), [vid]: { ...clean, by: userRef.current.name, on: today() } } }));
      log("info", "Root Cause Recorded", a.name, `Root cause recorded for ${a.name} violation ${vid}: ${clean.cause}. Fix: ${clean.fix}`, { role: "Agent owner", entity: agentEntity(a) });
    },
    retest: (id, pid, evidence) => {
      const a = command(id, { type: "retest" }, "Control re-test"); if (!a) return;
      const p = policies.find(x => x.id === pid);
      const u = userRef.current;
      const ev = redact(evidence);
      updateAgent(id, x => ({ retests: { ...(x.retests || {}), [pid]: { evidence: ev, by: u.name, on: today() } } }));
      // the re-test is also control evidence, scoped to this agent and bound to the policy version
      if (p) setPolicies(ps => ps.map(x => x.id === pid ? { ...x, tests: [...(x.tests || []), newTest({ policy: x, result: "pass", evidence: ev, owner: `${a.owner} (agent owner)`, by: u.name, scope: [a.id] })] } : x));
      log("info", "Control Re-tested", a.name, `"${p?.name}" re-tested against ${a.name} and passed: ${ev}`, { role: "Agent owner", entity: { kind: "policy", id: pid, version: p?.version || 1 }, after: { result: "pass", scope: a.name } });
      notify(`${p?.name} re-tested`);
    },
    autonomy: (id, level) => {
      const a = command(id, { type: "autonomy" }, "Autonomy change"); if (!a) return;
      updateAgent(id, { autonomy: level });
      log("info", "Autonomy Change", a.name, `${a.name} autonomy reduced from ${a.autonomy.toLowerCase()} to ${level.toLowerCase()}`, { role: "Agent owner", entity: agentEntity(a), before: { autonomy: a.autonomy }, after: { autonomy: level } });
      notify(`${a.name} is now ${level.toLowerCase()}`);
    },
    submit: (id, kind) => {
      const a = command(id, { type: "submit" }, `Submission for ${kind}`); if (!a) return;
      const r = requirements(a, kind, ctxNow);
      const u = userRef.current;
      const correlation = `SUB-${Date.now().toString(36).toUpperCase()}`;
      updateAgent(id, { review: { kind, by: a.owner, byUser: u.id, byName: u.name, on: today(), at: Date.now(), correlation } });
      log("info", kind === "activation" ? "Submitted for Activation" : "Submitted for Reinstatement", a.name,
        `${u.name} submitted ${a.name} for ${kind} with ${r.met} of ${r.total} requirements met`, { role: "Agent owner", entity: agentEntity(a), correlation, after: { review: kind } });
      notify("Submitted for approval");
    },
    withdraw: id => {
      const a = command(id, { type: "withdraw" }, "Withdrawal"); if (!a) return;
      updateAgent(id, { review: null });
      log("info", "Submission Withdrawn", a.name, `${userRef.current.name} withdrew ${a.name}'s submission`, { role: "Agent owner", entity: agentEntity(a), correlation: a.review?.correlation });
    },
    decide: (id, dec) => {
      const kind0 = scored.find(x => x.id === id)?.status === "pending" ? "activation" : "reinstatement";
      const a = command(id, { type: "decide", ...dec }, `${kind0[0].toUpperCase() + kind0.slice(1)} decision`); if (!a) return;
      const kind = kind0;
      const u = userRef.current;
      const meta = { role: dec.by, entity: agentEntity(a), correlation: a.review?.correlation };
      // apply only if nothing changed between the check and the write (two approvers deciding at once)
      const guarded = patch => setAgents(as => as.map(x => x.id === id && (x.rev || 0) === (a.rev || 0) && x.review ? { ...x, ...patch, rev: (x.rev || 0) + 1 } : x));
      const stamp = { by: dec.by, byUser: u.id, byName: u.name, on: today(), rev: a.rev || 0 };
      if (dec.decision === "reject") {
        const reason = redact(dec.reason);
        guarded({ review: null, lastDecision: { decision: "reject", reason, ...stamp } });
        log("warn", kind === "activation" ? "Activation Returned" : "Reinstatement Returned", a.name, `${u.name} (${dec.by}) returned ${a.name} to its owner: ${reason}`, { ...meta, before: { review: kind }, after: { review: null } });
        notify("Returned to owner");
        return;
      }
      if (kind === "activation") {
        const r = requirements(a, "activation", ctxNow);
        const conditional = dec.decision === "conditional";
        guarded({
          status: "active", review: null, lastDecision: { decision: dec.decision, ...stamp },
          conditions: conditional ? { items: r.open.map(i => i.id), due: dec.due, by: dec.by, on: today() } : null,
        });
        log("info", conditional ? "Agent Conditionally Activated" : "Agent Activated", a.name, conditional
          ? `${u.name} (${dec.by}) activated ${a.name} with conditions. Open items due ${dec.due}: ${r.open.map(i => i.label.replace(/ \(.*\)$/, "").toLowerCase()).join("; ")}`
          : `${u.name} (${dec.by}) activated ${a.name} with all requirements met`, { ...meta, before: { status: "pending" }, after: { status: "active", conditional } });
        notify(`${a.name} activated${conditional ? " with conditions" : ""}`);
      } else {
        guarded({
          status: "active", review: null, lastDecision: { decision: "approve", ...stamp },
          pastSuspension: a.suspension, suspension: null,
          probation: { until: addDays(PROBATION_DAYS), by: dec.by, on: today() },
        });
        log("info", "Agent Reinstated", a.name, `${u.name} (${dec.by}) reinstated ${a.name} with all remediation complete. On probation until ${addDays(PROBATION_DAYS)}`, { ...meta, before: { status: "suspended" }, after: { status: "active", probationUntil: addDays(PROBATION_DAYS) } });
        notify(`${a.name} reinstated on ${PROBATION_DAYS}-day probation`);
      }
    },
    openRisk: sid => { setNavOpen(false); navigate({ view: "assessments", riskTab: "risk", scenario: sid }); },
    grantException: (id, ex) => {
      const a = command(id, { type: "grantException", ...ex }, "Gate exception"); if (!a) return;
      const u = userRef.current;
      const reason = redact(ex.reason);
      updateAgent(id, { exception: { ...ex, reason, byUser: u.id, byName: u.name, on: today(), at: Date.now() } });
      log("warn", "Gate Exception Approved", a.name, `${u.name} (${ex.by}) approved an exception for ${a.name} until ${ex.until} covering ${ex.gates.join(", ")}: ${reason}`, { role: ex.by, entity: agentEntity(a), after: { exceptionUntil: ex.until } });
      notify(`Exception approved until ${ex.until}`);
    },
    revokeException: id => {
      const a = command(id, { type: "revokeException" }, "Exception revocation"); if (!a) return;
      updateAgent(id, { exception: null });
      log("info", "Gate Exception Revoked", a.name, `${userRef.current.name} revoked the exception for ${a.name}`, { entity: agentEntity(a), before: { exceptionUntil: a.exception.until }, after: { exceptionUntil: null } });
    },
    suspend: (id, d) => {
      const a = command(id, { type: "suspend", ...d }, "Suspension"); if (!a) return;
      const at = Date.now();
      const u = userRef.current;
      const reason = redact(d.reason);
      updateAgent(id, { status: "suspended", exception: null, conditions: null, probation: null, review: null,
        suspension: { on: fmtWhen(at), at, by: `${u.name} (${d.by})`, reason, autonomy: a.autonomy } });
      log("critical", "Agent Suspended", a.name, `${u.name} (${d.by}) suspended ${a.name}: ${reason}`, { role: d.by, entity: agentEntity(a), before: { status: "active" }, after: { status: "suspended" } });
      notify(`${a.name} suspended`);
    },
    reviewPolicy: pid => {
      const p = policies.find(x => x.id === pid);
      if (!allowed("policy.manage", {}, "Policy review")) return;
      setPolicies(ps => ps.map(x => x.id === pid ? { ...x, reviewedOn: today() } : x));
      log("info", "Policy Reviewed", "—", `Annual review of "${p.name}" recorded; next review due in 12 months`, { entity: { kind: "policy", id: pid, version: p.version || 1 } });
      notify("Policy review recorded");
    },
    setGates: patch => {
      if (!allowed("gates.configure", {}, "Gate configuration")) return;
      setGates(g => ({ ...g, ...patch }));
      log("warn", "Gate Configuration Changed", "—", `Operating gates changed: ${Object.entries(patch).map(([k, v]) => `${k} = ${v}`).join(", ")}`, { role: "AI Governance Committee", entity: { kind: "config", id: "operating-gates" }, before: Object.fromEntries(Object.keys(patch).map(k => [k, gates[k]])), after: patch });
      notify("Operating gates updated");
    },
  };

  // Control testing and versioning
  const recordTest = (pid, t) => {
    const p = policies.find(x => x.id === pid);
    if (!p || !allowed("policy.manage", { role: t.owner }, "Control test")) return;
    const u = userRef.current;
    const test = newTest({ policy: p, result: t.result, evidence: redact(t.evidence), owner: t.owner, by: u.name, testedOn: t.testedOn, scope: t.scope, validDays: t.validDays });
    setPolicies(ps => ps.map(x => x.id === pid ? { ...x, tests: [...(x.tests || []), test] } : x));
    const scopeTxt = t.scope === "all" ? "all agents in scope" : agents.filter(a => t.scope.includes(a.id)).map(a => a.name).join(", ");
    log(t.result === "pass" ? "info" : "warn", t.result === "pass" ? "Control Test Passed" : "Control Test Failed", "—",
      `"${p.name}" v${p.version || 1} ${t.result === "pass" ? "passed" : "failed"} a test on ${t.testedOn} (${scopeTxt}): ${test.evidence}`,
      { role: t.owner, entity: { kind: "policy", id: pid, version: p.version || 1 }, after: { result: t.result, expiresOn: test.expiresOn } });
    setTesting(null);
    notify(t.result === "pass" ? `Test recorded. ${p.name} is verified effective until ${test.expiresOn}.` : `Failed test recorded. ${p.name} no longer counts as effective.`);
  };
  const revisePolicy = (pid, summary) => {
    const p = policies.find(x => x.id === pid);
    if (!p || !allowed("policy.manage", {}, "New policy version")) return;
    const u = userRef.current;
    const v = (p.version || 1) + 1;
    setPolicies(ps => ps.map(x => x.id === pid ? { ...x, version: v, status: "draft", revision: redact(summary), revisedBy: u.id, approvedBy: null, approvedOn: null, approvalSource: null } : x));
    log("warn", "Policy Revised", "—", `"${p.name}" revised to version ${v} by ${u.name}: ${redact(summary)}. Back to draft until approved; tests on version ${p.version || 1} are now stale.`,
      { entity: { kind: "policy", id: pid, version: v }, before: { version: p.version || 1, status: p.status }, after: { version: v, status: "draft" } });
    notify(`Version ${v} drafted. It needs an independent approval and a new test.`);
  };
  const openPolicy = pid => navigate({ view: "policy", policy: pid });

  const runDecision = act => {
    if (act.type === "agent") { setDetailId(act.id); return; }
    if (act.type === "risk") { life.openRisk(act.id); return; }
    if (act.type === "gaps") { navigate({ view: "assessments", riskTab: "gap" }); return; }
    if (act.type === "enable") { togglePolicy(act.id); return; }
    if (act.type === "approve") { setApproving(act.id); return; }
    if (act.type === "review") life.reviewPolicy(act.id);
    if (act.type === "test") setTesting(act.id);
  };

  const updateTraits = (id, traits) => {
    const a = agents.find(x => x.id === id);
    const u = userRef.current;
    if (!ownsAgent(u, a) && !allowed("scope.change", {}, "Changing characteristics", a.name)) return;
    // characteristics drive scope, so a change invalidates the owner's earlier confirmations
    updateAgent(id, { traits, ...(a.attest ? { attest: null } : {}) });
    if (a.attest) log("warn", "Assessment Invalidated", a.name, `${a.name}'s characteristics changed, so the owner's architecture and characteristics confirmations were cleared and must be redone`, { entity: { kind: "agent", id: a.name, version: (a.rev || 0) + 1 } });
    const before = new Set(Object.keys(a.traits || {}).filter(k => a.traits[k]));
    const after = new Set(Object.keys(traits).filter(k => traits[k]));
    const added = [...after].filter(k => !before.has(k)), removed = [...before].filter(k => !after.has(k));
    if (added.length || removed.length) log("info", "Scope Change", a.name,
      `${a.name} characteristics updated${added.length ? `; added: ${added.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}${removed.length ? `; removed: ${removed.map(k => TRAITS.find(t => t.id === k).label.toLowerCase()).join(", ")}` : ""}`);
    notify("Characteristics saved. Mapping updated.");
  };

  const excludeMapping = (id, key, reason) => {
    const a = agents.find(x => x.id === id);
    if (!allowed("scope.change", {}, "Scope exclusion", a.name)) return;
    reason = redact(reason);
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    updateAgent(id, { exclusions: { ...(a.exclusions || {}), [key]: { reason, on: localISO() } } });
    log("warn", "Scope Exclusion", a.name, `${item?.short || item?.name || key} excluded from ${a.name}'s scope: ${reason}`);
    notify(`Excluded ${item?.short || item?.name}`);
  };

  const includeMapping = (id, key) => {
    const a = agents.find(x => x.id === id);
    if (!allowed("scope.change", {}, "Returning an item to scope", a.name)) return;
    const m = mapAgent(a, policies);
    const item = [...m.frameworks, ...m.policies].find(x => x.key === key);
    const { [key]: _, ...rest } = a.exclusions || {};
    updateAgent(id, { exclusions: rest });
    log("info", "Scope Change", a.name, `${item?.short || item?.name || key} returned to ${a.name}'s scope`);
  };

  const registerAgent = f => {
    if (!allowed("agent.register", {}, "Agent registration")) return;
    const fullAuto = f.autonomy === "Full autonomy";
    const newAgent = {
      id: Date.now(), name: f.name.trim(), model: f.model, dept: f.dept,
      status: "pending", risk: fullAuto ? "MEDIUM" : "LOW",
      score: fullAuto ? 40 : 15, autonomy: f.autonomy, owner: f.owner.trim(),
      desc: f.desc.trim(), traits: f.traits, exclusions: {}, rev: 0,
    };
    setAgents(a => [...a, newAgent]);
    log("info", "Agent Registered", newAgent.name, `${newAgent.name} registered and pending security review before activation`, { entity: { kind: "agent", id: newAgent.name, version: 0 }, after: { status: "pending", owner: newAgent.owner } });
    setModal(null);
    notify(`${newAgent.name} registered — pending security review`);
  };

  const createPolicy = f => {
    if (!allowed("policy.manage", {}, "Policy creation")) return;
    const u = userRef.current;
    const tpl = RECOMMENDED_POLICIES.find(t => t.id === f.templateId);
    const id = tpl && !policies.some(p => p.id === tpl.id) ? tpl.id : `p${Date.now()}`;
    const approved = f.approved;
    const newPolicy = {
      id, tag: f.tag, name: f.name.trim(), desc: f.desc.trim(), action: f.action, violations: 0, enabled: true,
      frameworks: tpl ? [] : f.frameworks, owner: f.owner, templateId: tpl?.id, evidence: tpl?.evidence,
      status: approved ? "approved" : "draft", version: 1, createdBy: u.id, tests: [],
      doc: f.doc ? { ...f.doc, version: 1 } : null,
      ...(approved ? { approvedBy: f.approvedBy, approvedOn: f.approvedOn, approvedVersion: 1, approvalSource: "recorded" } : {}),
    };
    setPolicies(ps => [...ps, newPolicy]);
    // a template carries its requirement mapping with it
    if (tpl) setReqMap(m => {
      const next = { ...m };
      tpl.closeKeys.forEach(k => { if (!(next[k] || []).includes(id)) next[k] = [...(next[k] || []), id]; });
      return next;
    });
    const closing = tpl ? tpl.closeKeys.filter(k => gapKeys.has(k)) : [];
    const pe = { kind: "policy", id, version: 1 };
    log("info", "Policy Created", "—", `Policy "${newPolicy.name}" created as ${approved ? "approved" : "draft"} (owner: ${f.owner}, action: ${f.action})${tpl ? `; mapped to ${tpl.closeKeys.map(reqLabel).join(", ")}` : ""}`, { entity: pe, after: { status: newPolicy.status } });
    if (f.doc) log("info", "Document Uploaded", "—", `"${f.doc.name}" (${fmtSize(f.doc.size)}, SHA-256 ${f.doc.sha256?.slice(0, 12)}…) attached to policy "${newPolicy.name}"`, { entity: pe });
    if (approved) log("info", "Approval Recorded", "—", `${u.name} recorded that ${f.approvedBy} approved "${newPolicy.name}" outside ARGUS on ${f.approvedOn}, with the signed document as evidence`, { entity: pe, after: { status: "approved", source: "outside ARGUS" } });
    setModal(null);
    setPolicyTemplate(null);
    notify(approved
      ? (closing.length ? `Policy approved. Closed ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : `Policy created: ${newPolicy.name}`)
      : `Saved as draft.${closing.length ? ` Approve it to close ${closing.length} gap${closing.length === 1 ? "" : "s"}.` : ""}`);
  };

  const actions = { createPolicy: openCreatePolicy, approve: setApproving, togglePolicy, testPolicy: setTesting };

  const saveTreatment = (sid, t) => {
    const sc = register.find(x => x.id === sid);
    if (!allowed("risk.treat", {}, `Treatment of ${sid}`)) return;
    if (t.treatment === "Accept" && !allowed("risk.accept", { owner: t.owner, role: t.acceptance.by }, `Acceptance of ${sid}`)) return;
    if (t.acceptance) t = { ...t, acceptance: { ...t.acceptance, reason: redact(t.acceptance.reason), byUser: userRef.current.id, byName: userRef.current.name } };
    setTreatments(m => ({ ...m, [sid]: t }));
    if (t.treatment === "Accept") {
      log("warn", "Risk Accepted", "—", `${sid} ${sc?.title}: residual risk ${sc?.residual.score} accepted by ${userRef.current.name} (${t.acceptance.by}) (owner: ${t.owner}, review ${t.reviewOn}). Justification: ${t.acceptance.reason}`, { role: t.acceptance.by, entity: { kind: "risk", id: sid }, after: { treatment: "Accept" } });
    } else {
      log("info", "Risk Treatment", "—", `${sid} ${sc?.title}: treatment set to ${t.treatment} (owner: ${t.owner}, review ${t.reviewOn})${t.note ? `. ${t.note}` : ""}`);
    }
    notify(t.treatment === "Accept" ? `${sid} accepted` : `${sid} treatment saved`);
  };

  const setGapField = (key, field, value) => {
    if (!allowed("risk.treat", {}, "Remediation assignment")) return;
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), [field]: value } }));
    if (field === "owner" && value) {
      const [fwId, i] = key.split("|");
      const fw = FRAMEWORKS.find(f => f.id === fwId);
      log("info", "Remediation Assigned", "—", `${fw.short} ${fw.requirements[Number(i)].id} remediation assigned to ${value}`);
    }
  };

  const markNA = (key, reason) => {
    if (!allowed("scope.change", {}, "Not-applicable marking")) return;
    if (reason) reason = redact(reason);
    const [fwId, i] = key.split("|");
    const fw = FRAMEWORKS.find(f => f.id === fwId);
    const label = `${fw.short} ${fw.requirements[Number(i)].id}`;
    setGapOverrides(o => ({ ...o, [key]: { ...(o[key] || {}), na: reason ? { reason, on: localISO() } : null } }));
    log(reason ? "warn" : "info", "Scope Change", "—", reason ? `${label} marked not applicable: ${reason}` : `${label} marked applicable again`);
    notify(reason ? `${label} marked not applicable` : `${label} back in scope`);
  };

  const go = id => { navigate({ view: id }); setNavOpen(false); };

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: <Activity size={17} /> },
    { id: "decisions", label: "Needs my decision", icon: <Inbox size={17} />, badge: decisions.filter(d => d.sev === "critical").length },
    { id: "registry", label: "Agent Registry", icon: <Users size={17} /> },
    { id: "policy", label: "Policy Engine", icon: <FileText size={17} /> },
    { id: "frameworks", label: "Frameworks", icon: <Layers size={17} /> },
    { id: "assessments", label: "Risk & Gaps", icon: <ClipboardCheck size={17} /> },
    { id: "audit", label: "Audit Trail", icon: <ScanSearch size={17} /> },
    { id: "heatmap", label: "Risk Radar", icon: <AlertTriangle size={17} /> },
  ];

  // the mobile menu behaves as a dialog; each page sets the document title
  const navRef = useDialog(() => setNavOpen(false), mobile && navOpen);
  const TITLES = { dashboard: "Dashboard", decisions: "Needs my decision", registry: "Agent Registry", policy: "Policy Engine", frameworks: "Frameworks", assessments: "Risk & Gaps", audit: "Audit Trail", heatmap: "Risk Radar", notfound: "Not found" };
  useEffect(() => {
    const detail = routedAgent ? `${routedAgent.name} · ` : fwOpen ? `${fwOpen} · ` : route.scenario ? `${route.scenario} · ` : "";
    document.title = `${detail}${TITLES[view] || "ARGUS"} · ARGUS`;
  }, [view, routedAgent?.name, fwOpen, route.scenario]);
  const focusRing = T.isDark ? "#7cc0ff" : "#1d5fb0";

  const globalHits = globalQ.trim()
    ? scored.filter(a => a.name.toLowerCase().includes(globalQ.toLowerCase()))
    : [];

  const sidebar = (
    <aside style={{
      width: 240, flexShrink: 0, background: T.sidebar, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", padding: "22px 14px", transition: "background .2s",
      ...(mobile ? { height: "100%", boxSizing: "border-box", boxShadow: T.shadow } : { position: "sticky", top: 0, height: "100vh", boxSizing: "border-box" }),
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 8px", marginBottom: 34 }}>
        <PanoptesMark size={30} color={T.text} />
        <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: ".14em", color: T.text, flex: 1 }}>ARGUS</span>
        {mobile && (
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        )}
      </div>
      <div style={{ color: T.faint, fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em", padding: "0 8px", marginBottom: 10 }}>OPERATIONS</div>
      <nav aria-label="Main" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => go(n.id)} aria-current={view === n.id ? "page" : undefined} aria-label={n.badge ? `${n.label}, ${n.badge} critical` : undefined} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", whiteSpace: "nowrap",
            borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 500,
            background: view === n.id ? T.accent : "transparent",
            color: view === n.id ? "#fff" : T.navText, textAlign: "left", transition: "background .12s",
          }}>
            {n.icon}<span style={{ flex: 1 }}>{n.label}</span>
            {n.badge > 0 && <span aria-hidden="true" style={{ fontSize: 11.5, fontWeight: 700, minWidth: 20, textAlign: "center", padding: "1px 6px", borderRadius: 99, background: view === n.id ? "rgba(0,0,0,.3)" : (T.isDark ? "#e11d48" : "#be123c"), color: "#fff" }}>{n.badge}</span>}
          </button>
        ))}
      </nav>
      <IdentitySwitcher />
    </aside>
  );

  const px = mobile ? 16 : 28;

  return (
    <ThemeCtx.Provider value={T}>
     <RouterCtx.Provider value={router}>
     <ActorCtx.Provider value={{ user, actAs }}>
      <div style={{
        display: "flex", minHeight: "100vh", background: T.bg, color: T.text,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        transition: "background .2s, color .2s", overflowX: "hidden",
      }}>
        <style>{`
          :focus-visible { outline: 2px solid ${focusRing} !important; outline-offset: 2px; }
          g[role=button]:focus-visible { outline: none !important; }
          g[role=button]:focus-visible > circle:nth-of-type(2), g[role=button]:focus-visible > rect:first-of-type { stroke: ${focusRing}; stroke-width: 4px; }
          .argus-skip { position: absolute; left: -9999px; top: 8px; z-index: 100; background: ${T.accent}; color: #fff; padding: 9px 14px; border-radius: 8px; font-weight: 700; text-decoration: none; }
          .argus-skip:focus { left: 8px; }
        `}</style>
        <a href="#main" className="argus-skip" onClick={e => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to main content</a>
        {!mobile && sidebar}
        {mobile && navOpen && (
          <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 55 }}>
            <div ref={navRef} {...dialogProps("Menu")} onClick={e => e.stopPropagation()} style={{ height: "100%", width: 260 }}>{sidebar}</div>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div role="region" aria-label="Demo notice" style={{
            display: "flex", alignItems: "center", gap: 10, padding: `8px ${px}px`,
            background: T.blueSoft, borderBottom: `1px solid ${T.blueBorder}`,
            fontSize: mobile ? 12 : 13, color: T.isDark ? "#9ec8f2" : "#1d5c9e",
          }}>
            <Info size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, lineHeight: 1.4 }}>
              {mobile
                ? "Demo environment with synthetic data."
                : "Demo environment: all agents, violations and events are synthetic, and the seeded history is dated relative to today. Nothing is enforced on a server. Links and refresh keep your place, but refreshing resets any changes."}
            </span>
            <button onClick={resetDemo} style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: `1px solid ${T.blueBorder}`, color: "inherit", borderRadius: 7,
              padding: "5px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              <RotateCcw size={13} /> Reset{mobile ? "" : " demo"}
            </button>
          </div>

          <header style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 16, padding: `${mobile ? 12 : 16}px ${px}px`, borderBottom: `1px solid ${T.border}` }}>
            {mobile && (
              <>
                <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, flexShrink: 0,
                  borderRadius: 10, cursor: "pointer", background: T.panel, border: `1px solid ${T.border}`, color: T.text,
                }}><Menu size={18} /></button>
                <PanoptesMark size={26} color={T.text} />
              </>
            )}
            <div style={{ position: "relative", flex: 1, minWidth: 0, maxWidth: 620 }}>
              <Search size={16} color={T.faint} style={{ position: "absolute", left: 14, top: 12, zIndex: 1 }} />
              <input value={globalQ} onChange={e => setGlobalQ(e.target.value)} aria-label="Search agents" type="search"
                placeholder={mobile ? "Search agents..." : "Global search agents, logs, policies..."}
                style={{ ...fieldStyle(T), background: T.panel, borderRadius: 10, padding: "11px 14px 11px 40px" }} />
              {globalHits.length > 0 && (
                <div style={{ position: "absolute", top: 46, left: 0, right: 0, background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, zIndex: 40, overflow: "hidden", boxShadow: T.shadow }}>
                  {globalHits.map(a => (
                    <button key={a.id} onClick={() => { setDetailId(a.id); setGlobalQ(""); }} style={{
                      display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 14px", background: "none", border: "none", cursor: "pointer",
                      color: T.text, fontSize: 14, borderBottom: `1px solid ${T.border}`,
                    }}>
                      <span>{a.name}</span>
                      <Pill fg={T.risk[a.risk].fg} bg={T.risk[a.risk].bg} border={T.risk[a.risk].border}>{a.risk}</Pill>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setMode(m => m === "dark" ? "light" : "dark")}
              aria-label={T.isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: 38, height: 38, borderRadius: 10, cursor: "pointer",
                background: T.panel, border: `1px solid ${T.border}`, color: T.dim, transition: "all .15s",
              }}>
              {T.isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {!mobile && (
              <div style={{ position: "relative" }} aria-hidden="true">
                <Bell size={19} color={T.dim} />
                <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: T.isDark ? "#fb7185" : "#be123c" }} />
              </div>
            )}
          </header>

          <main id="main" tabIndex={-1} style={{ padding: mobile ? "18px 16px 96px" : 28, minWidth: 0, outline: "none" }}>
            {view === "dashboard" && <Dashboard agents={scored} assessment={assessment} audit={audit} treatments={treatments} gates={gates} decisions={decisions}
              openAgent={openAgent} onOpenFrameworks={() => go("frameworks")} onOpenDecisions={() => go("decisions")} />}
            {view === "decisions" && <Decisions items={decisions} gates={gates} onGates={life.setGates} onAction={runDecision} />}
            {view === "registry" && route.agent && !routedAgent && <NotFound what={`agent “${route.agent}”`} hint="No registered agent has that name." onBack={() => navigate({ view: "registry" })} backLabel="All agents" />}
            {view === "registry" && route.badTab && routedAgent && <NotFound what={`tab “${route.badTab}”`} hint="Agent panels have Overview, Architecture and Risk tabs." onBack={() => navigate({ view: "registry", agent: route.agent })} backLabel={`Open ${routedAgent.name}`} />}
            {view === "frameworks" && fwOpen && !assessment.frameworks.some(f => f.id === fwOpen) && <NotFound what={`framework “${fwOpen}”`} onBack={() => navigate({ view: "frameworks" })} backLabel="All frameworks" />}
            {view === "assessments" && route.badTab && <NotFound what={`page “${route.badTab}”`} hint="Risk & Gaps has register, gaps and report pages." onBack={() => navigate({ view: "assessments" })} backLabel="Risk register" />}
            {view === "notfound" && <NotFound page what={`page ${route.path}`} onBack={() => navigate({ view: "dashboard" })} backLabel="Go to the dashboard" />}
            {view === "registry" && <Registry agents={scored} policies={policies} audit={audit} treatments={treatments} gates={gates} openAgent={openAgent} onOpenRegister={() => setModal("register")} />}
            {view === "policy" && route.policy && !policies.some(p => p.id === route.policy) && <NotFound what={`policy ${route.policy}`} onBack={() => navigate({ view: "policy" })} backLabel="All policies" />}
            {view === "policy" && <PolicyEngine policies={policies} reqMap={reqMap} toggle={togglePolicy} onOpenCreate={() => openCreatePolicy()} onApprove={setApproving}
              agents={scored} onTest={recordTest} onRevise={revisePolicy} focus={route.policy} />}
            {view === "frameworks" && <Frameworks assessment={assessment} gapKeys={gapKeys} policies={policies} onOpen={setFwOpen} onAdopt={adoptRecommendation} />}
            {view === "audit" && <AuditTrail audit={audit} agents={scored} policies={policies} onOpenAgent={openAgent} onOpenPolicy={openPolicy} notify={notify} />}
            {view === "heatmap" && <Heatmap agents={scored} openAgent={openAgent} />}
            {view === "assessments" && <Assessments tab={route.riskTab} scenario={route.scenario} onTab={t => navigate({ view: "assessments", riskTab: t })}
              onScenario={id => navigate({ view: "assessments", riskTab: "risk", scenario: id || undefined, query: route.query })}
              scored={scored} register={register} assessment={assessment} policies={policies} audit={audit} treatments={treatments}
              actions={actions} onSaveTreatment={saveTreatment} onGapField={setGapField} onMarkNA={markNA} onOpenAgent={openAgent} />}
          </main>
        </div>

        {modal === "register" && <RegisterAgentModal onClose={() => setModal(null)} onRegister={registerAgent} policies={policies} />}
        {modal === "policy" && <CreatePolicyModal onClose={() => { setModal(null); setPolicyTemplate(null); }} onCreate={createPolicy}
          initialTemplate={policyTemplate} policies={policies} />}
        {approving && policies.find(p => p.id === approving) && (
          <ApprovePolicyModal policy={policies.find(p => p.id === approving)} onClose={() => setApproving(null)} onApprove={approvePolicy} />
        )}
        {testing && policies.find(p => p.id === testing) && (
          <Modal title="Record a control test" subtitle={`${policies.find(p => p.id === testing).name}. Only a current, passing test makes a control count as effective.`} onClose={() => setTesting(null)}>
            <TestForm policy={policies.find(p => p.id === testing)} agents={scored.filter(a => a.mapping.policies.some(m => m.id === testing && !m.excluded))} onCancel={() => setTesting(null)} onSave={t => recordTest(testing, t)} />
            <NotAllowed action="policy.manage" />
          </Modal>
        )}
        <AgentDrawer key={detailId ?? "none"} agent={scored.find(a => a.id === detailId)} audit={audit} policies={policies} actions={actions}
          treatments={treatments} gates={gates} life={life} panelTab={route.agentTab} onTab={t => navigate({ view: "registry", agent: route.agent, agentTab: t }, { replace: true })}
          onClose={() => setDetailId(null)} onUpdateTraits={updateTraits} onExclude={excludeMapping} onInclude={includeMapping} />
        <FrameworkDrawer framework={openFramework} policies={policies} gapKeys={gapKeys} onClose={() => setFwOpen(null)}
          onLink={linkPolicy} onTogglePolicy={togglePolicy} onAdopt={adoptRecommendation} onApprove={setApproving} />

        <aside aria-label="Feedback">
        <button onClick={() => setFeedbackOpen(true)} aria-label="Send feedback" style={{
          position: "fixed", bottom: mobile ? 16 : 24, right: mobile ? 16 : 24, zIndex: 45,
          display: "flex", alignItems: "center", gap: 8,
          background: T.accent, color: "#fff", border: "none", borderRadius: 999,
          padding: mobile ? 14 : "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: T.shadow,
        }}>
          <MessageCircle size={mobile ? 20 : 16} />{!mobile && " Feedback"}
        </button>
        </aside>

        {feedbackOpen && (
          <Modal title="Help shape ARGUS" subtitle="This is an early MVP exploring what agentic AI governance tooling should look like. Two minutes of your perspective directly shapes what gets built next." onClose={() => setFeedbackOpen(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: T.panelSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: T.dim, lineHeight: 1.6 }}>
                Especially useful: your role, which view would matter most in your organization, and what's missing before you'd trust a tool like this.
              </div>
              <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: T.accent, color: "#fff", borderRadius: 9, padding: "12px 16px",
                fontSize: 15, fontWeight: 700, textDecoration: "none",
              }}>
                Open feedback form <ExternalLink size={15} />
              </a>
            </div>
          </Modal>
        )}

        <div role="status" aria-live="polite" style={srOnly}>{toast || ""}</div>
        {toast && (
          <div aria-hidden="true" style={{
            position: "fixed", bottom: mobile ? 84 : 24, left: "50%", transform: "translateX(-50%)",
            width: mobile ? "calc(100% - 32px)" : "auto", boxSizing: "border-box",
            background: T.panelSoft, border: `1px solid ${T.blueBorder}`, color: T.text,
            borderRadius: 10, padding: "12px 20px", fontSize: 14, zIndex: 70,
            display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadow,
          }}>
            <CheckCircle2 size={16} color={T.isDark ? "#34d399" : "#066a4d"} style={{ flexShrink: 0 }} /> {toast}
          </div>
        )}
      </div>
     </ActorCtx.Provider>
     </RouterCtx.Provider>
    </ThemeCtx.Provider>
  );
}
