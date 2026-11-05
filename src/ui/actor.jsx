// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { useContext, createContext } from "react";
import { UserCheck } from "lucide-react";
import { DEMO_USERS, DEFAULT_USER, can } from "../identity.js";
import { fieldStyle, useT } from "./base.jsx";

/* ---------------- simulated identity ---------------- */

export const ActorCtx = createContext({ user: DEFAULT_USER, actAs: () => {} });
export const useActor = () => useContext(ActorCtx);
// first demo user who would be allowed, to offer a one-click switch
export const suggestUser = (action, ctx) => DEMO_USERS.find(u => can(u, action, ctx).ok) || null;

export function NotAllowed({ action, ctx, why, compact }) {
  const T = useT();
  const { user, actAs } = useActor();
  const r = can(user, action, ctx);
  if (r.ok) return null;
  const alt = suggestUser(action, ctx);
  return (
    <div role="note" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, lineHeight: 1.45, marginTop: compact ? 6 : 10, background: T.panelSoft, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "8px 11px", color: T.dim }}>
      <UserCheck size={14} color={T.faint} style={{ flexShrink: 0 }} />
      <span style={{ flex: "1 1 220px" }}>Acting as <b style={{ color: T.text }}>{user.name}</b>. {why ? `${why} ` : ""}{r.reason}</span>
      {alt && <button onClick={() => actAs(alt.id)} style={{ background: "none", border: "none", color: T.blue, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>Act as {alt.name}</button>}
    </div>
  );
}

export function IdentitySwitcher() {
  const T = useT();
  const { user, actAs } = useActor();
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 8px 0", marginTop: "auto" }}>
      <label htmlFor="acting-as" style={{ display: "block", color: T.faint, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", marginBottom: 6 }}>ACTING AS (SIMULATED)</label>
      <select id="acting-as" value={user.id} onChange={e => actAs(e.target.value)} style={{ ...fieldStyle(T), padding: "8px 10px", fontSize: 13 }}>
        {DEMO_USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
      </select>
      <div style={{ color: T.faint, fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
        {user.roles.length ? user.roles.join(", ") : `Owner: ${user.teams.join(", ")}`}. No real sign-in; checks run in this browser only.
      </div>
    </div>
  );
}
