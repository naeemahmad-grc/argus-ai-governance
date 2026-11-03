/*
 * ARGUS routes
 *
 * Every screen and detail panel has a stable URL, and filters live in the query
 * string, so links can be shared and refresh, Back and Forward work.
 *
 *   /                                   dashboard
 *   /decisions                          Needs my decision
 *   /registry  /registry/:agent[/:tab]  agent registry, agent panel (tab: overview | architecture | risk)
 *   /policies  /policies/:id            policy engine, scrolled to one policy
 *   /frameworks  /frameworks/:id        frameworks, one framework's requirements
 *   /risk/register[/:scenario]  /risk/gaps  /risk/report
 *   /audit                              audit trail
 *   /radar                              risk radar
 *
 * The demo has no saved data: a refresh keeps the page and filters but resets
 * whatever was changed in the session.
 */
import { useEffect, useState, useCallback, useContext, createContext } from "react";

export const VIEWS = { "": "dashboard", decisions: "decisions", registry: "registry", policies: "policy", frameworks: "frameworks", risk: "assessments", audit: "audit", radar: "heatmap" };
const PATH_OF = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [v, k]));
export const AGENT_TABS = ["overview", "architecture", "risk"];
export const RISK_TABS = { register: "risk", gaps: "gap", report: "report" };
const RISK_PATH = Object.fromEntries(Object.entries(RISK_TABS).map(([k, v]) => [v, k]));

export const slugify = s => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parse(pathname, search = "") {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(search));
  const head = parts[0] || "";
  const view = VIEWS[head];
  if (view === undefined) return { view: "notfound", path: pathname, query };
  const r = { view, query };
  if (view === "registry" && parts[1]) { r.agent = parts[1]; r.agentTab = AGENT_TABS.includes(parts[2]) ? parts[2] : "overview"; if (parts[2] && !AGENT_TABS.includes(parts[2])) r.badTab = parts[2]; }
  if (view === "policy" && parts[1]) r.policy = parts[1];
  if (view === "frameworks" && parts[1]) r.framework = parts[1];
  if (view === "assessments") {
    r.riskTab = RISK_TABS[parts[1]] || "risk";
    if (parts[1] && !RISK_TABS[parts[1]]) r.badTab = parts[1];
    if (r.riskTab === "risk" && parts[2]) r.scenario = parts[2].toUpperCase();
  }
  if (["dashboard", "decisions", "audit", "heatmap"].includes(view) && parts.length > 1) return { view: "notfound", path: pathname, query };
  return r;
}

export function build(r) {
  let path = "/" + (PATH_OF[r.view] ?? "");
  if (r.view === "registry" && r.agent) path += `/${r.agent}${r.agentTab && r.agentTab !== "overview" ? `/${r.agentTab}` : ""}`;
  if (r.view === "policy" && r.policy) path += `/${r.policy}`;
  if (r.view === "frameworks" && r.framework) path += `/${r.framework}`;
  if (r.view === "assessments") path += `/${RISK_PATH[r.riskTab || "risk"]}${r.scenario ? `/${r.scenario}` : ""}`;
  const q = Object.entries(r.query || {}).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all");
  return path.replace(/\/$/, "") + (path === "/" ? "/" : "") + (q.length ? "?" + new URLSearchParams(q).toString() : "");
}

const here = () => parse(window.location.pathname, window.location.search);

// Minimal history router: the URL is the single source of truth for where you are
export function useRouter() {
  const [route, setRoute] = useState(here);
  useEffect(() => {
    const onPop = () => setRoute(here());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback((next, { replace = false } = {}) => {
    const url = typeof next === "string" ? next : build(next);
    if (url === window.location.pathname + window.location.search) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    setRoute(here());
  }, []);
  // filters: merge into the current query string without adding history entries
  const setQuery = useCallback(patch => {
    const cur = here();
    const query = { ...cur.query, ...patch };
    Object.keys(query).forEach(k => (query[k] === undefined || query[k] === null || query[k] === "" || query[k] === "all") && delete query[k]);
    const url = (cur.view === "notfound" ? cur.path : build({ ...cur, query: {} }).split("?")[0]) + (Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "");
    if (url === window.location.pathname + window.location.search) return;
    window.history.replaceState(null, "", url);
    setRoute(here());
  }, []);
  return { route, navigate, setQuery };
}

export const RouterCtx = createContext({ route: { view: "dashboard", query: {} }, navigate: () => {}, setQuery: () => {} });
// a filter value kept in the URL (?key=value); the default is left out of the URL
export function useQueryState(key, def = "all") {
  const { route, setQuery } = useContext(RouterCtx);
  const value = route.query?.[key] ?? def;
  const set = useCallback(v => setQuery({ [key]: v === def ? undefined : v }), [key, def, setQuery]);
  return [value, set];
}
export const useRoute = () => useContext(RouterCtx);
