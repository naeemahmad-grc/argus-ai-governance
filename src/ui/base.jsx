// Split out of ArgusMVP.jsx. Shared helpers and components are imported from sibling modules.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { X, Info, AlertOctagon, AlertCircle } from "lucide-react";

/* ---------------- themes ---------------- */

export const THEMES = {
  dark: {
    isDark: true,
    // Pulse soft cards, dark: navy page (#0B1F3B), lighter navy cards, periwinkle accent
    bg: "#0B1F3B", sidebar: "#0B1F3B", panel: "#13294a", panelSoft: "#1a3358",
    border: "#25416b", text: "#eef3fb", dim: "#b0bfd8",
    faint: "#9cadca", blue: "#a9c0f2", accent: "#4a63b5", blueSoft: "rgba(143,166,230,.12)",
    blueBorder: "rgba(143,166,230,.35)", avatarBg: "#25416b",
    overlay: "rgba(3,10,22,.65)", shadow: "0 10px 30px rgba(3,10,22,.5)",
    cardShadow: "0 1px 2px rgba(0,0,0,.18), 0 10px 30px rgba(3,10,22,.3)",
    grid: "rgba(176,191,216,.14)", barCursor: "rgba(176,191,216,.06)",
    navText: "#b0bfd8",
    risk: {
      LOW: { bg: "rgba(52,211,153,.12)", fg: "#34d399", border: "rgba(52,211,153,.35)" },
      MEDIUM: { bg: "rgba(234,179,8,.12)", fg: "#eab308", border: "rgba(234,179,8,.38)" },
      HIGH: { bg: "rgba(249,115,22,.14)", fg: "#fb923c", border: "rgba(249,115,22,.42)" },
      CRITICAL: { bg: "rgba(244,63,94,.14)", fg: "#ff8e9e", border: "rgba(244,63,94,.45)" },
    },
    status: {
      active: { fg: "#34d399", bg: "rgba(52,211,153,.1)", border: "rgba(52,211,153,.3)" },
      suspended: { fg: "#ff8e9e", bg: "rgba(244,63,94,.1)", border: "rgba(244,63,94,.35)" },
      pending: { fg: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.3)" },
    },
    action: {
      BLOCK: { fg: "#ff8e9e", bg: "rgba(244,63,94,.1)" },
      "REQUIRE APPROVAL": { fg: "#8cbcfb", bg: "rgba(96,165,250,.1)" },
      AUDIT: { fg: "#94a3b8", bg: "rgba(148,163,184,.1)" },
      WARN: { fg: "#f59e0b", bg: "rgba(245,158,11,.12)" },
    },
    bar: { LOW: "#34d399", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#fb7185" },
    heat: s => s >= 80
      ? { bg: "rgba(244,63,94,.12)", border: "rgba(244,63,94,.5)", fg: "#fff", sub: "#fca5b3" }
      : s >= 25
        ? { bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.45)", fg: "#f59e0b", sub: "#f59e0b" }
        : { bg: "rgba(52,211,153,.08)", border: "rgba(52,211,153,.4)", fg: "#34d399", sub: "#34d399" },
    warnBox: { bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.3)", fg: "#fbbf24" },
  },
  light: {
    isDark: false,
    // Pulse soft cards, light: cool grey-blue page, near-white floating cards, slate-navy accent
    bg: "#e9eef6", sidebar: "#e9eef6", panel: "#f8fafd", panelSoft: "#eef2f8",
    border: "#dde3ed", text: "#1b2233", dim: "#4f586b",
    faint: "#5a6376", blue: "#3a4a85", accent: "#3d4b7c", blueSoft: "rgba(61,75,124,.08)",
    blueBorder: "rgba(61,75,124,.3)", avatarBg: "#e1e6f1",
    overlay: "rgba(15,23,42,.4)", shadow: "0 10px 30px rgba(40,52,90,.14)",
    cardShadow: "0 1px 2px rgba(16,24,40,.04), 0 10px 30px rgba(40,52,90,.07)",
    grid: "rgba(27,34,51,.08)", barCursor: "rgba(27,34,51,.04)",
    navText: "#4f586b",
    risk: {
      LOW: { bg: "rgba(5,150,105,.10)", fg: "#066a4d", border: "rgba(5,150,105,.3)" },
      MEDIUM: { bg: "rgba(161,98,7,.10)", fg: "#854d0e", border: "rgba(161,98,7,.32)" },
      HIGH: { bg: "rgba(194,65,12,.10)", fg: "#9a3412", border: "rgba(194,65,12,.32)" },
      CRITICAL: { bg: "rgba(225,29,72,.10)", fg: "#be123c", border: "rgba(225,29,72,.35)" },
    },
    status: {
      active: { fg: "#066a4d", bg: "rgba(5,150,105,.09)", border: "rgba(5,150,105,.3)" },
      suspended: { fg: "#be123c", bg: "rgba(225,29,72,.08)", border: "rgba(225,29,72,.3)" },
      pending: { fg: "#475569", bg: "rgba(71,85,105,.08)", border: "rgba(71,85,105,.25)" },
    },
    action: {
      BLOCK: { fg: "#be123c", bg: "rgba(225,29,72,.08)" },
      "REQUIRE APPROVAL": { fg: "#1d4ed8", bg: "rgba(37,99,235,.08)" },
      AUDIT: { fg: "#475569", bg: "rgba(71,85,105,.08)" },
      WARN: { fg: "#92400e", bg: "rgba(180,83,9,.1)" },
    },
    bar: { LOW: "#10b981", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#be123c" },
    heat: s => s >= 80
      ? { bg: "rgba(225,29,72,.08)", border: "rgba(225,29,72,.4)", fg: "#be123c", sub: "#be123c" }
      : s >= 25
        ? { bg: "rgba(180,83,9,.07)", border: "rgba(180,83,9,.35)", fg: "#92400e", sub: "#92400e" }
        : { bg: "rgba(5,150,105,.06)", border: "rgba(5,150,105,.3)", fg: "#066a4d", sub: "#066a4d" },
    warnBox: { bg: "rgba(180,83,9,.07)", border: "rgba(180,83,9,.3)", fg: "#92400e" },
  },
};

export const ThemeCtx = createContext(THEMES.dark);
export const useT = () => useContext(ThemeCtx);

export const useIsMobile = (bp = 820) => {
  const query = `(max-width: ${bp}px)`;
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = e => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
};

export const PageHeader = ({ title, subtitle, children }) => {
  const T = useT();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: T.mobile ? 22 : 26, fontWeight: 800, margin: 0 }}>{title}</h1>
        <div style={{ color: T.dim, marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>{subtitle}</div>
      </div>
      {children && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
};

export const fieldStyle = T => ({
  width: "100%", boxSizing: "border-box", background: T.panelSoft,
  border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px",
  color: T.text, fontSize: 14, outline: "none",
});
export const labelStyle = T => ({ color: T.dim, fontSize: 12.5, fontWeight: 600, marginBottom: 6, display: "block" });

export const PanoptesMark = ({ size = 26, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ color, flexShrink: 0 }} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <path strokeWidth="5.5" d="M31.2 51.2 A20 20 0 0 1 68.8 51.2" />
      <path strokeWidth="5.5" opacity="0.62" d="M20.9 47.4 A31 31 0 0 1 79.1 47.4" />
      <path strokeWidth="5.5" opacity="0.34" d="M10.5 43.6 A42 42 0 0 1 89.5 43.6" />
      <circle cx="50" cy="60" r="10.5" strokeWidth="5.5" />
    </g>
    <circle cx="50" cy="60" r="5.2" fill="#4a9eea" />
  </svg>
);

/* ---------------- small components ---------------- */

export const Pill = ({ children, fg, bg, border, small }) => (
  <span style={{
    fontSize: small ? 11 : 12, fontWeight: 600, padding: small ? "2px 8px" : "3px 10px",
    borderRadius: 8, color: fg, background: bg, border: `1px solid ${border || "transparent"}`,
    whiteSpace: "nowrap", letterSpacing: ".02em",
  }}>{children}</span>
);

export const SevDot = ({ sev, size = 16 }) => {
  const T = useT();
  const map = {
    critical: <AlertOctagon size={size} color={T.isDark ? "#ff8e9e" : "#be123c"} />,
    warn: <AlertCircle size={size} color={T.isDark ? "#f59e0b" : "#92400e"} />,
    info: <Info size={size} color={T.isDark ? "#60a5fa" : "#1d4ed8"} />,
  };
  return map[sev] || map.info;
};

// A clickable card is a keyboard-operable button (Enter or Space); a plain card is just a container
export const Card = ({ children, style, onClick, id, label, pressed, tabIndex }) => {
  const T = useT();
  const interactive = !!onClick;
  return (
    <div id={id} onClick={onClick}
      {...(interactive ? {
        role: "button", tabIndex: 0, "aria-label": label, "aria-pressed": pressed,
        onKeyDown: e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(e); } },
      } : { tabIndex })}
      className={interactive ? "argus-focusable" : undefined}
      style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: T.cardShadow, ...style }}>{children}</div>
  );
};

// Shown when a link points at something that doesn't exist (or no longer exists)
export function NotFound({ what, hint, onBack, backLabel = "Go back", page }) {
  const T = useT();
  const H = page ? "h1" : "h2";
  return (
    <div role="alert" style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: T.cardShadow, padding: "22px 24px", margin: "16px 0" }}>
      <H style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Not found: {what}</H>
      <div style={{ color: T.dim, fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
        {hint || "The link may be mistyped, or it points at something that was removed."} Demo data also resets on refresh, so things created in an earlier session won't be here.
      </div>
      {onBack && <button onClick={onBack} style={{ marginTop: 12, background: T.accent, color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{backLabel}</button>}
    </div>
  );
}

export const Toggle = ({ on, onChange }) => {
  const T = useT();
  return (
    <button onClick={onChange} aria-label={on ? "Disable policy" : "Enable policy"} style={{
      width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
      background: on ? T.accent : "rgba(148,163,184,.35)", position: "relative",
      transition: "background .15s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "#fff", transition: "left .15s",
      }} />
    </button>
  );
};

export const Modal = ({ title, subtitle, onClose, children }) => {
  const T = useT();
  const ref = useDialog(onClose);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: T.overlay, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div ref={ref} {...dialogProps(title)} onClick={e => e.stopPropagation()} style={{
        width: "min(520px, 100%)", maxHeight: "90vh", overflowY: "auto",
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 20, padding: 26,
        boxSizing: "border-box", boxShadow: T.shadow,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={19} /></button>
        </div>
        <div style={{ color: T.dim, fontSize: 13.5, marginBottom: 20 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
};

/*
 * Dialog behavior shared by every modal and side panel: announced by name,
 * focus moves in and stays in while open (Tab and Shift+Tab wrap), Escape
 * closes, and focus returns to whatever opened it.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function useDialog(onClose, active = true) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement;
    node.focus({ preventScroll: true });
    const onKey = e => {
      if (e.key === "Escape") { e.stopPropagation(); close.current?.(); return; }
      if (e.key !== "Tab") return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [active]);
  return ref;
}
export const dialogProps = label => ({ role: "dialog", "aria-modal": "true", "aria-label": label, tabIndex: -1 });

export const srOnly = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };

// Accessible, sortable table used as the text alternative to charts
export function SortableTable({ caption, columns, rows, initial }) {
  const T = useT();
  const [sort, setSort] = useState(initial || { key: columns[0].key, dir: "asc" });
  const col = columns.find(c => c.key === sort.key);
  const val = r => (col.value ? col.value(r) : r[col.key]);
  const sorted = [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sort.dir === "asc" ? d : -d;
  });
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <caption style={srOnly}>{caption}. Select a column heading to sort.</caption>
        <thead>
          <tr style={{ background: T.panelSoft, color: T.dim, textAlign: "left" }}>
            {columns.map(c => (
              <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} style={{ padding: 0, fontWeight: 600 }}>
                <button onClick={() => setSort(s => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))}
                  style={{ background: "none", border: "none", color: "inherit", font: "inherit", padding: "10px 12px", cursor: "pointer", width: "100%", textAlign: c.num ? "right" : "left", whiteSpace: "nowrap" }}>
                  {c.label} <span aria-hidden="true">{sort.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id ?? i} style={{ borderTop: `1px solid ${T.border}` }}>
              {columns.map((c, j) => {
                const content = c.render ? c.render(r) : (c.value ? c.value(r) : r[c.key]);
                return j === 0
                  ? <th key={c.key} scope="row" style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600 }}>{content}</th>
                  : <td key={c.key} style={{ padding: "9px 12px", textAlign: c.num ? "right" : "left" }}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// "Chart / Table" switch for every chart that has a table alternative
export function ViewSwitch({ value, onChange, label = "Display as" }) {
  const T = useT();
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 3, gap: 3 }}>
      {[["chart", "Chart"], ["table", "Table"]].map(([id, l]) => (
        <button key={id} aria-pressed={value === id} onClick={() => onChange(id)} style={{
          border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          background: value === id ? T.accent : "transparent", color: value === id ? "#fff" : T.dim,
        }}>{l}</button>
      ))}
    </div>
  );
}
