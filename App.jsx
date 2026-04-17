import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   TRUSTSCORE — Production Frontend
   Dark / Light / System theme · Profile photo upload
   Shareable profile links · Full API integration
═══════════════════════════════════════════════════════════ */

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&display=swap');`;

// ── Theme CSS Variables ────────────────────────────────────
const THEME_CSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* LIGHT theme (default) */
:root, [data-theme="light"] {
  --bg:         #f5f2ec;
  --surface:    #ffffff;
  --surface2:   #ede9e0;
  --surface3:   #e4dfd4;
  --ink:        #0a0a0f;
  --mid:        #6b6760;
  --mid2:       #4a4745;
  --border:     #d9d4c7;
  --border2:    #c8c2b4;
  --gold:       #c9a84c;
  --gold-dim:   #7a6230;
  --teal:       #2a7a6e;
  --teal-dim:   #1a5248;
  --red:        #c0392b;
  --nav-bg:     rgba(245,242,236,0.95);
  --modal-ov:   rgba(10,10,15,0.50);
  --shadow:     0 4px 20px rgba(0,0,0,0.07);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.10);
}

/* DARK theme */
[data-theme="dark"] {
  --bg:         #0f0f13;
  --surface:    #17171d;
  --surface2:   #1f1f27;
  --surface3:   #27272f;
  --ink:        #e8e4dc;
  --mid:        #7a7670;
  --mid2:       #9b9690;
  --border:     #2a2a34;
  --border2:    #38383f;
  --gold:       #d4b05a;
  --gold-dim:   #a07830;
  --teal:       #3db09e;
  --teal-dim:   #2a7a6e;
  --red:        #e05050;
  --nav-bg:     rgba(15,15,19,0.95);
  --modal-ov:   rgba(0,0,0,0.65);
  --shadow:     0 4px 20px rgba(0,0,0,0.3);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.4);
}

html, body, #root { height: 100%; background: var(--bg); font-family: 'Instrument Sans', sans-serif; color: var(--ink); transition: background 0.25s, color 0.25s; }
.serif { font-family: 'DM Serif Display', serif; }
.mono  { font-family: 'DM Mono', monospace; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
input, textarea, select, button { font-family: 'Instrument Sans', sans-serif; color: var(--ink); }
input::placeholder, textarea::placeholder { color: var(--mid); }

@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes spin   { to { transform: rotate(360deg); } }
`;

// ── API Config ─────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = {
  get: async (path, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  post: async (path, body, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  patch: async (path, body, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  delete: async (path, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  upload: async (path, formData, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
};

// ── Score Helpers ──────────────────────────────────────────
const SC = (s) => s >= 90 ? "var(--teal)" : s >= 75 ? "var(--gold)" : s >= 60 ? "#d97706" : "var(--red)";
const SH = (s) => {
  const d = document.documentElement.getAttribute("data-theme");
  if (s >= 90) return d === "dark" ? "#3db09e" : "#2a7a6e";
  if (s >= 75) return d === "dark" ? "#d4b05a" : "#c9a84c";
  if (s >= 60) return "#d97706";
  return d === "dark" ? "#e05050" : "#c0392b";
};
const SL = (s) => s >= 90 ? "Exceptional" : s >= 75 ? "Trustworthy" : s >= 60 ? "Developing" : "Caution";
const ST = (s) => s >= 90 ? "Platinum" : s >= 75 ? "Gold" : s >= 60 ? "Silver" : "Basic";
const VL = { phone:"Phone Verified", standard:"Email + Phone", advanced:"ID Verified" };
const VC = { phone:"var(--gold)", standard:"var(--teal)", advanced:"var(--teal)" };
const fmtDate = () => new Date().toLocaleDateString("en-NG", { month:"short", year:"numeric" });
const OCCUPATIONS = ["Freelancer","Developer","Designer","Vendor","Seller","Buyer","Dispatch Rider","Worker","Student","Recruiter","Landlord","Tenant","Business","Consultant","Artisan","Content Creator","Teacher","Driver"];

// ── Global Store ───────────────────────────────────────────
const createStore = () => {
  const saved = (() => { try { return JSON.parse(localStorage.getItem("ts_state") || "{}"); } catch { return {}; } })();
  let st = {
    page:           "landing",
    user:           saved.user    || null,
    token:          saved.token   || null,
    theme:          saved.theme   || "system",
    profiles:       [],
    currentProfile: null,
    toast:          null,
    disputes:       [],
    reviewModal:    null,
    reportModal:    null,
    loading:        false,
    // URL routing: parse on load
    ...parseUrlPage(),
  };
  const subs = new Set();
  return {
    get: () => ({ ...st }),
    set: (fn) => {
      st = { ...st, ...fn(st) };
      // Persist auth + theme
      localStorage.setItem("ts_state", JSON.stringify({ user: st.user, token: st.token, theme: st.theme }));
      subs.forEach(f => f({ ...st }));
    },
    sub: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
};

function parseUrlPage() {
  const path = window.location.pathname;
  const m = path.match(/^\/u\/([^/]+)/);
  if (m) return { page: "profile", urlUsername: m[1] };
  return {};
}

const store = createStore();

const useStore = () => {
  const [s, setS] = useState(store.get());
  useEffect(() => store.sub(setS), []);
  return [s, store.set];
};

const showToast = (set, msg, type = "info") => {
  set(s => ({ ...s, toast: { msg, type } }));
  setTimeout(() => set(s => ({ ...s, toast: null })), 3500);
};

// ── Theme Manager ──────────────────────────────────────────
const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "system") {
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.setAttribute("data-theme", sys);
  } else {
    root.setAttribute("data-theme", theme);
  }
};

// ══════════════════ PRIMITIVES ══════════════════

function ScoreRing({ score, size = 80, stroke = 6 }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(score), 150); return () => clearTimeout(t); }, [score]);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const color = SC(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: size < 70 ? 13 : size < 100 ? 18 : 26, fontWeight: 500, color, lineHeight: 1 }}>{anim}</span>
        {size >= 80 && <span style={{ fontSize: 8, color: "var(--mid)", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>Score</span>}
      </div>
    </div>
  );
}

function StarRow({ rating, size = 13, interactive = false, onSet }) {
  const [hov, setHov] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= (interactive ? (hov || rating) : rating) ? "var(--gold)" : "var(--border)"}
          style={{ cursor: interactive ? "pointer" : "default", transition: "fill 0.1s" }}
          onClick={() => interactive && onSet && onSet(i)}
          onMouseEnter={() => interactive && setHov(i)}
          onMouseLeave={() => interactive && setHov(0)}>
          <path d="M10 1l2.4 7H19l-5.7 4.1 2.2 6.9L10 15 4.5 19l2.2-6.9L1 9h6.6z" />
        </svg>
      ))}
    </span>
  );
}

function Av({ src, initials, color, size = 44, premium = false }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: src && !imgError ? "transparent" : color,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "DM Serif Display, serif", fontSize: size * 0.34, fontWeight: 400,
        border: "2px solid rgba(128,128,128,0.2)", overflow: "hidden", flexShrink: 0 }}>
        {src && !imgError
          ? <img src={src} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)} />
          : initials}
      </div>
      {premium && (
        <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%",
          background: "var(--gold)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "var(--ink)" }}>★</div>
      )}
    </div>
  );
}

function Bdg({ label }) {
  const map = {
    "Top Rated":       { bg: "var(--gold)",    c: "var(--ink)",  icon: "★" },
    "Fast Responder":  { bg: "var(--teal)",    c: "#fff",        icon: "⚡" },
    "Verified ID":     { bg: "var(--teal)",    c: "#fff",        icon: "✓" },
    "5-Star Streak":   { bg: "var(--ink)",     c: "var(--gold)", icon: "◆" },
    "Trusted Seller":  { bg: "var(--teal-dim)",c: "#fff",        icon: "✦" },
    "Reliable Worker": { bg: "var(--gold-dim)",c: "#fff",        icon: "⚙" },
    "Verified Phone":  { bg: "var(--surface3)",c: "var(--mid2)", icon: "✓" },
    "Verified Dev":    { bg: "var(--ink)",     c: "var(--gold)", icon: "</>" },
    "Code Reviewed":   { bg: "var(--surface3)",c: "var(--mid2)", icon: "✓" },
    "Trusted Client":  { bg: "var(--gold)",    c: "var(--ink)",  icon: "♦" },
    "Verified":        { bg: "var(--teal)",    c: "#fff",        icon: "✓" },
    "Rising Star":     { bg: "var(--gold)",    c: "var(--ink)",  icon: "✦" },
  };
  const d = map[label] || { bg: "var(--surface3)", c: "var(--mid)", icon: "•" };
  return (
    <span className="mono" style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20,
      background: d.bg, color: d.c, fontWeight: 500, letterSpacing: 0.3,
      display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <span>{d.icon}</span>{label}
    </span>
  );
}

function VBdg({ level }) {
  const icons = { phone: "✓", standard: "✓✓", advanced: "✓ ID" };
  const bgs   = { phone: "rgba(201,168,76,0.12)", standard: "rgba(42,122,110,0.12)", advanced: "var(--teal)" };
  const colors = { phone: "var(--gold)", standard: "var(--teal)", advanced: "#fff" };
  return (
    <span className="mono" style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20,
      background: bgs[level], color: colors[level], border: `1px solid ${VC[level]}40`,
      display: "inline-flex", alignItems: "center", gap: 4 }}>
      {icons[level]} {VL[level]}
    </span>
  );
}

function SBar({ label, value }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--mid)" }}>{label}</span>
        <span className="mono" style={{ fontWeight: 500, color: SC(value) }}>{value}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: SC(value), borderRadius: 4, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: 24, transition: "all 0.15s", cursor: onClick ? "pointer" : "default", ...style }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "var(--shadow)"; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } : undefined}>
      {children}
    </div>
  );
}

function TLIn({ label, value, onChange, placeholder, type = "text", multi = false, autoFocus = false }) {
  const base = { width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 10,
    background: "var(--surface2)", fontSize: 14, outline: "none", fontFamily: "inherit",
    color: "var(--ink)", transition: "border-color 0.15s" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>{label}</label>}
      {multi
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
            style={{ ...base, resize: "vertical", lineHeight: 1.6 }} autoFocus={autoFocus} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={base} autoFocus={autoFocus} />}
    </div>
  );
}

function Btn({ children, onClick, v = "primary", sz = "md", disabled = false, loading = false, full = false, style = {} }) {
  const sizes = { sm: { padding: "7px 14px", fontSize: 12 }, md: { padding: "11px 22px", fontSize: 13 }, lg: { padding: "14px 32px", fontSize: 15 } };
  const variants = {
    primary: { background: "var(--ink)", color: "var(--bg)", border: "none" },
    teal:    { background: "var(--teal)", color: "#fff", border: "none" },
    gold:    { background: "var(--gold)", color: "var(--ink)", border: "none" },
    outline: { background: "transparent", color: "var(--ink)", border: "1px solid var(--border)" },
    danger:  { background: "rgba(192,57,43,0.08)", color: "var(--red)", border: "1px solid rgba(192,57,43,0.25)" },
    ghost:   { background: "transparent", color: "var(--mid)", border: "1px solid var(--border)" },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ ...sizes[sz], ...variants[v], borderRadius: 10, cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1, fontWeight: 600, transition: "all 0.15s",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        width: full ? "100%" : undefined, ...style }}>
      {loading && <span style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />}
      {children}
    </button>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid",
      borderColor: active ? "var(--teal)" : "var(--border)", background: active ? "var(--teal)" : "transparent",
      color: active ? "#fff" : "var(--mid)", fontSize: 12, cursor: "pointer", transition: "all 0.15s",
      fontFamily: "inherit", fontWeight: active ? 500 : 400 }}>
      {label}
    </button>
  );
}

function Toast({ t }) {
  if (!t) return null;
  const icon  = t.type === "success" ? "✓" : t.type === "error" ? "✕" : "✦";
  const color = t.type === "success" ? "var(--teal)" : t.type === "error" ? "var(--red)" : "var(--gold)";
  return (
    <div style={{ position: "fixed", top: 76, right: 20, zIndex: 9999, background: "var(--surface)",
      border: "1px solid var(--border)", borderRadius: 12, padding: "12px 18px",
      display: "flex", alignItems: "center", gap: 10, animation: "fadeUp 0.3s ease",
      boxShadow: "var(--shadow-lg)", maxWidth: 340 }}>
      <span className="mono" style={{ color, fontWeight: 600 }}>{icon}</span>
      <span style={{ fontSize: 13 }}>{t.msg}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--teal)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

// ── Logo ───────────────────────────────────────────────────
function Logo({ size = "md", onClick }) {
  const sz = { sm: 28, md: 36, lg: 48 }[size];
  const ts = { sm: 16, md: 19, lg: 26 }[size];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onClick}>
      <svg width={sz} height={sz} viewBox="0 0 48 54" fill="none">
        <path d="M24 2L3 11v14c0 12.5 8.1 24.2 19 28C33.9 49.2 45 37.5 45 25V11L24 2z" fill="var(--ink)" opacity="0.95" />
        <path d="M24 2L3 11v14c0 12.5 8.1 24.2 19 28C33.9 49.2 45 37.5 45 25V11L24 2z" stroke="var(--gold)" strokeWidth="1.2" fill="none" />
        <path d="M15 27l5.5 5.5L33 20" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <div className="serif" style={{ fontSize: ts, lineHeight: 1, letterSpacing: -0.3 }}>
          Trust<span style={{ color: "var(--teal)" }}>Score</span>
        </div>
        {size !== "sm" && <div className="mono" style={{ fontSize: 8, color: "var(--mid)", letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>Trust Identity Platform</div>}
      </div>
    </div>
  );
}

// ── Theme Toggle ───────────────────────────────────────────
function ThemeToggle() {
  const [s, set] = useStore();
  const opts = [
    { key: "light",  icon: "☀", label: "Light"  },
    { key: "dark",   icon: "◑", label: "Dark"   },
    { key: "system", icon: "⊙", label: "System" },
  ];
  const cycle = () => {
    const next = { light: "dark", dark: "system", system: "light" }[s.theme];
    set(x => ({ ...x, theme: next }));
    applyTheme(next);
  };
  const cur = opts.find(o => o.key === s.theme) || opts[2];
  return (
    <button onClick={cycle} title={`Theme: ${cur.label}`}
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8,
        padding: "6px 10px", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center",
        gap: 5, color: "var(--mid)", fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0 }}>
      <span>{cur.icon}</span>
      <span style={{ fontSize: 11 }}>{cur.label}</span>
    </button>
  );
}

// ── Nav ────────────────────────────────────────────────────
function Nav() {
  const [s, set] = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (p, opts = {}) => {
    set(x => ({ ...x, page: p, ...opts }));
    setMenuOpen(false);
    window.history.pushState({}, "", p === "profile" && opts.urlUsername ? `/u/${opts.urlUsername}` : "/");
  };

  const mainLinks = [
    { key: "search",   label: "Search"   },
    { key: "business", label: "Business" },
    { key: "reports",  label: "Reports"  },
  ];
  const menuLinks = s.user
    ? [{ key: "dashboard", label: "Dashboard" }, { key: "admin", label: "Admin" }, { key: "settings", label: "Settings" }]
    : [];

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 200 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Logo size="sm" onClick={() => go("landing")} />
        <nav style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {mainLinks.map(l => (
            <button key={l.key} onClick={() => go(l.key)}
              style={{ background: s.page === l.key ? "var(--surface2)" : "transparent", border: "none", borderRadius: 8,
                padding: "6px 12px", color: s.page === l.key ? "var(--ink)" : "var(--mid)",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: s.page === l.key ? 600 : 400, transition: "all 0.12s", whiteSpace: "nowrap" }}>
              {l.label}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <ThemeToggle />
          {s.user ? (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 10px 4px 4px",
                borderRadius: 30, background: menuOpen ? "var(--surface2)" : "transparent",
                border: "1px solid", borderColor: menuOpen ? "var(--border)" : "transparent", transition: "all 0.15s" }}
                onClick={() => setMenuOpen(o => !o)}>
                <Av src={s.user.avatar} initials={s.user.avatarInitials || "?"} color={s.user.avatarColor || "var(--teal)"} size={30} premium={s.user.premium} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.user.name?.split(" ")[0]}</span>
                <span style={{ fontSize: 9, color: "var(--mid)", marginLeft: 2 }}>{menuOpen ? "▲" : "▼"}</span>
              </div>
              {menuOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--surface)",
                    border: "1px solid var(--border)", borderRadius: 12, padding: "6px", minWidth: 160,
                    boxShadow: "var(--shadow-lg)", zIndex: 20, animation: "fadeUp 0.15s ease" }}>
                    {menuLinks.map(l => (
                      <button key={l.key} onClick={() => go(l.key)}
                        style={{ display: "block", width: "100%", textAlign: "left",
                          background: s.page === l.key ? "var(--surface2)" : "transparent",
                          border: "none", borderRadius: 8, padding: "9px 14px",
                          color: s.page === l.key ? "var(--ink)" : "var(--mid)",
                          fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          fontWeight: s.page === l.key ? 600 : 400, transition: "background 0.1s" }}>
                        {l.label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }} />
                    <button onClick={() => { set(x => ({ ...x, user: null, token: null, page: "landing" })); setMenuOpen(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "transparent",
                        border: "none", borderRadius: 8, padding: "9px 14px", color: "var(--red)",
                        fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Btn v="ghost" sz="sm" onClick={() => go("login")}>Sign In</Btn>
              <Btn sz="sm" onClick={() => go("signup")}>Get Started</Btn>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Profile Avatar with Upload ─────────────────────────────
function AvatarUpload({ user, onUpload }) {
  const [s] = useStore();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.avatar || null);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Local preview
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const data = await api.upload("/upload/avatar", fd, s.token);
      onUpload(data.avatar);
    } catch (err) {
      alert(err.message);
      setPreview(user?.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Av src={preview} initials={user?.avatarInitials || "?"} color={user?.avatarColor || "var(--teal)"} size={80} premium={user?.premium} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%",
          background: "var(--teal)", border: "2px solid var(--bg)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>
        {uploading ? <span style={{ width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "block" }} /> : "✎"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

// ══════════════════ PAGES ══════════════════

// ── Landing ────────────────────────────────────────────────
function Landing() {
  const [, set] = useStore();
  const go = p => set(s => ({ ...s, page: p }));

  const features = [
    ["✦", "TrustScore Rating", "Every user gets a 0–100 score built from real reviews, verified activity, and consistent behaviour."],
    ["✓", "Identity Verification", "Multi-level verification via NIN, BVN, selfie, or LinkedIn. Real identities only."],
    ["↗", "Portable Trust Page", "Share trustscore.ng/yourname anywhere — jobs, proposals, marketplaces, clients."],
    ["◈", "Search & Discover", "Find trusted vendors, workers, or clients by name, occupation, location, or score."],
    ["⚙", "Business Portal", "Verify candidates, compare applicants, and reduce fraud before you commit."],
    ["⚑", "Dispute Center", "Report scams, fake reviews, or impersonation. Every case reviewed by admins."],
  ];
  const howItWorks = [
    ["01", "Create & Verify", "Set up your profile and verify your identity via NIN, BVN, or phone."],
    ["02", "Collect Reviews", "Clients and collaborators leave verified, tamper-proof reviews."],
    ["03", "Score Computes", "We analyse reliability, quality, communication, ethics, and timeliness."],
    ["04", "Share Anywhere", "Embed your TrustScore on LinkedIn, proposals, or connect via API."],
  ];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ padding: "64px 0 48px", borderBottom: "1px solid var(--border)" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>◆ Nigeria's Reputation Identity Platform</div>
        <h1 className="serif" style={{ fontSize: "clamp(38px,7vw,64px)", lineHeight: 1.05, marginBottom: 20, letterSpacing: -0.5 }}>
          Know who you can<br /><em>actually trust.</em>
        </h1>
        <p style={{ fontSize: 16, color: "var(--mid)", lineHeight: 1.75, maxWidth: 520, marginBottom: 36 }}>
          TrustScore gives every person and business a verified reputation profile with a live trust rating — portable, shareable, and impossible to fake.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
          <Btn sz="lg" onClick={() => go("signup")}>Create Free Profile →</Btn>
          <Btn sz="lg" v="outline" onClick={() => go("search")}>Search Profiles</Btn>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[["✓", "Identity Verified"], ["✦", "Tamper-proof Reviews"], ["↗", "API Shareable"], ["⚡", "Real-time Score"]].map(([icon, label]) => (
            <span key={label} className="mono" style={{ fontSize: 11, color: "var(--mid)", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "var(--gold)" }}>{icon}</span>{label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "32px 0", borderBottom: "1px solid var(--border)" }}>
        {[["50K+", "Verified Profiles"], ["₦2.8B", "Deals Protected"], ["98%", "Fraud Prevention"], ["4.9★", "Platform Rating"]].map(([val, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 26, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: "var(--mid)" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "48px 0 40px", borderBottom: "1px solid var(--border)" }}>
        <h2 className="serif" style={{ fontSize: 32, marginBottom: 28 }}>Everything you need<br /><em>to build & check trust.</em></h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {features.map(([icon, title, desc]) => (
            <Card key={title} style={{ padding: "20px 22px" }}>
              <div className="mono" style={{ fontSize: 16, color: "var(--gold)", marginBottom: 10 }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.65 }}>{desc}</div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ padding: "48px 0 40px", borderBottom: "1px solid var(--border)" }}>
        <h2 className="serif" style={{ fontSize: 32, marginBottom: 28 }}>How TrustScore works.</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {howItWorks.map(([num, title, desc]) => (
            <div key={num} style={{ display: "flex", gap: 18, padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--gold)", paddingTop: 2, flexShrink: 0 }}>{num}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.65 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "48px 0 72px", textAlign: "center" }}>
        <h2 className="serif" style={{ fontSize: 36, marginBottom: 16 }}>Start building your<br /><em>trust identity today.</em></h2>
        <p style={{ color: "var(--mid)", marginBottom: 28, fontSize: 14 }}>Free to join. Portable forever. Your reputation starts here.</p>
        <Btn sz="lg" onClick={() => go("signup")}>Create Your Profile — It's Free</Btn>
      </div>
    </div>
  );
}

// ── Auth ───────────────────────────────────────────────────
function Auth({ mode }) {
  const [s, set] = useStore();
  const [tab, setTab] = useState(mode || "signup");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "", occupation: "", location: "", bio: "", otp: "" });
  const [demoOtp, setDemoOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }));
  const go = p => set(x => ({ ...x, page: p }));

  const signup = async () => {
    if (!form.name || !form.username || !form.email || !form.password)
      return showToast(set, "Please fill all required fields", "error");
    setLoading(true);
    try {
      const data = await api.post("/auth/signup", {
        name: form.name, username: form.username, email: form.email,
        phone: form.phone, password: form.password,
        occupation: form.occupation, location: form.location, bio: form.bio,
      });
      if (data.otpCode) setDemoOtp(data.otpCode);
      set(x => ({ ...x, user: data.user, token: data.token }));
      setStep(3);
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { otp: form.otp }, s.token);
      set(x => ({ ...x, page: "dashboard" }));
      showToast(set, `Welcome to TrustScore, ${s.user?.name?.split(" ")[0]}! ✦`, "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!form.email || !form.password) return showToast(set, "Email and password required", "error");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email: form.email, password: form.password });
      set(x => ({ ...x, user: data.user, token: data.token, page: "dashboard" }));
      showToast(set, `Welcome back, ${data.user.name?.split(" ")[0]}! ✦`, "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo size="lg" onClick={() => go("landing")} />
          <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, marginTop: 28 }}>
            {["signup", "login"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none",
                background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? "var(--ink)" : "var(--mid)",
                fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {t === "signup" ? "Create Account" : "Sign In"}
              </button>
            ))}
          </div>
        </div>

        <Card>
          {tab === "signup" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                {[1, 2, 3].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= n ? "var(--teal)" : "var(--border)", transition: "background 0.3s" }} />)}
              </div>

              {step === 1 && <>
                <h3 className="serif" style={{ fontSize: 22 }}>Basic Information</h3>
                <TLIn label="Full Name *" value={form.name} onChange={v => f("name", v)} placeholder="Adeola Bello" />
                <TLIn label="Username *" value={form.username} onChange={v => f("username", v.toLowerCase().replace(/\s/g, "."))} placeholder="adeola.bello" />
                <div>
                  <label style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500, display: "block", marginBottom: 6 }}>Occupation</label>
                  <select value={form.occupation} onChange={e => f("occupation", e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)", fontSize: 14, color: "var(--ink)" }}>
                    <option value="">Select occupation…</option>
                    {OCCUPATIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <TLIn label="Location" value={form.location} onChange={v => f("location", v)} placeholder="Lagos, Nigeria" />
                <Btn full onClick={() => form.name && form.username ? setStep(2) : showToast(set, "Name and username required", "error")}>Continue →</Btn>
              </>}

              {step === 2 && <>
                <h3 className="serif" style={{ fontSize: 22 }}>Contact & Password</h3>
                <TLIn label="Email *" value={form.email} onChange={v => f("email", v)} placeholder="you@email.com" type="email" />
                <TLIn label="Phone" value={form.phone} onChange={v => f("phone", v)} placeholder="+234 800 000 0000" />
                <TLIn label="Password *" value={form.password} onChange={v => f("password", v)} placeholder="Min. 8 characters" type="password" />
                <TLIn label="Short Bio" value={form.bio} onChange={v => f("bio", v)} placeholder="Tell people about yourself…" multi />
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn v="outline" onClick={() => setStep(1)}>← Back</Btn>
                  <Btn full loading={loading} onClick={signup}>Send OTP →</Btn>
                </div>
              </>}

              {step === 3 && <>
                <h3 className="serif" style={{ fontSize: 22 }}>Verify Phone</h3>
                {demoOtp && (
                  <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--mid)", lineHeight: 1.65 }}>
                    OTP sent to your phone.<br />
                    <span className="mono" style={{ color: "var(--teal)" }}>Demo OTP: {demoOtp}</span>
                  </div>
                )}
                <TLIn label="Enter OTP" value={form.otp} onChange={v => f("otp", v)} placeholder="6-digit code" autoFocus />
                <Btn v="teal" full loading={loading} onClick={verifyOtp}>Verify & Continue ✦</Btn>
                <button onClick={() => { set(x => ({ ...x, page: "dashboard" })); showToast(set, "Skip verification for now.", "info"); }}
                  style={{ background: "none", border: "none", color: "var(--mid)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                  Skip for now
                </button>
              </>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h3 className="serif" style={{ fontSize: 22 }}>Welcome back.</h3>
              <TLIn label="Email or Username" value={form.email} onChange={v => f("email", v)} placeholder="you@email.com" />
              <TLIn label="Password" value={form.password} onChange={v => f("password", v)} placeholder="Your password" type="password" />
              <Btn full loading={loading} onClick={login}>Sign In →</Btn>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--mid)" }}>
                <span style={{ color: "var(--teal)", cursor: "pointer" }} onClick={() => go("forgot")}>Forgot password?</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard() {
  const [s, set] = useStore();
  const { user } = s;
  const [tab, setTab] = useState("overview");
  if (!user) return null;

  const upgradeVerify = async () => {
    try {
      const data = await api.post("/profiles/upgrade-verify", {}, s.token);
      set(x => ({ ...x, user: data.user }));
      showToast(set, "Verification upgraded! ✦", "success");
    } catch (err) {
      showToast(set, err.message, "error");
    }
  };

  const verifySteps = [
    { label: "Phone Verified",  done: user.verifyLevel >= 1 },
    { label: "Email Verified",  done: user.verifyLevel >= 2 },
    { label: "ID Verified",     done: user.verifyLevel >= 3 },
    { label: "Selfie Check",    done: false },
  ];

  const handleAvatarUpload = (url) => {
    set(x => ({ ...x, user: { ...x.user, avatar: url } }));
    showToast(set, "Profile photo updated! ✦", "success");
  };

  const activity = [
    { dot: "var(--gold)",     msg: "New review received — 5 stars",               time: "2h ago"  },
    { dot: "var(--teal)",     msg: `TrustScore updated to ${user.trustScore}`,    time: "1d ago"  },
    { dot: "var(--mid)",      msg: "Profile viewed 12 times this week",            time: "3d ago"  },
    { dot: "var(--gold-dim)", msg: `Earned "${user.badges[0] || "Fast Responder"}" badge`, time: "1w ago" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <AvatarUpload user={user} onUpload={handleAvatarUpload} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{user.name}</h1>
            <VBdg level={user.verified} />
          </div>
          <div style={{ fontSize: 13, color: "var(--mid)" }}>{user.occupation} · {user.location}</div>
        </div>
        <Btn v="outline" sz="sm" onClick={() => set(x => ({ ...x, currentProfile: user, page: "profile", urlUsername: user.username }))}>View Public Profile ↗</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
        {[{ label: "TrustScore", val: user.trustScore, color: SC(user.trustScore) }, { label: "Reviews", val: (user.reviews || []).length, color: "var(--gold-dim)" }, { label: "Deals Done", val: user.deals || 0, color: "var(--teal)" }, { label: "Response %", val: `${user.responseRate || 0}%`, color: "var(--ink)" }].map(({ label, val, color }) => (
          <Card key={label} style={{ padding: "16px 18px", textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 500, color, lineHeight: 1, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: "var(--mid)" }}>{label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["overview", "reviews", "verification", "analytics"].map(t => (
          <Pill key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card style={{ gridColumn: "1/-1" }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <ScoreRing score={user.trustScore || 0} size={120} stroke={9} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{SL(user.trustScore)} · {ST(user.trustScore)}</div>
                <div style={{ fontSize: 12, color: "var(--mid)", marginBottom: 16 }}>Based on {(user.reviews || []).length} reviews · {user.deals || 0} completed deals</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(user.scoreBreakdown || {}).map(([k, v]) => <SBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v || 0} />)}
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Your Badges</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(user.badges || []).length ? user.badges.map(b => <Bdg key={b} label={b} />) : <span style={{ fontSize: 13, color: "var(--mid)" }}>Complete deals to earn badges</span>}
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Recent Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{a.msg}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--mid)", marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "reviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!(user.reviews || []).length && (
            <Card style={{ textAlign: "center", padding: "40px" }}>
              <div className="serif" style={{ fontSize: 24, marginBottom: 8 }}>No reviews yet.</div>
              <div style={{ fontSize: 13, color: "var(--mid)" }}>Complete deals and ask clients to review your profile.</div>
            </Card>
          )}
          {(user.reviews || []).map(r => (
            <Card key={r._id || r.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Av initials={(r.authorName || "?")[0]} color="var(--mid)" size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.authorName || r.author}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>{r.category} · {r.date ? new Date(r.date).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : ""}</div>
                  </div>
                </div>
                <StarRow rating={r.rating} />
              </div>
              <p style={{ fontSize: 13, color: "var(--mid2)", lineHeight: 1.7 }}>{r.text}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "verification" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>Verification Progress</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {verifySteps.map(({ label, done }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid",
                    borderColor: done ? "var(--teal)" : "var(--border)", background: done ? "rgba(42,122,110,0.1)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                    color: done ? "var(--teal)" : "var(--mid)", flexShrink: 0 }}>{done ? "✓" : "○"}</div>
                  <span style={{ fontSize: 14, color: done ? "var(--ink)" : "var(--mid)" }}>{label}</span>
                  {done && <span className="mono" style={{ fontSize: 10, color: "var(--teal)", marginLeft: "auto" }}>Complete</span>}
                </div>
              ))}
            </div>
            {user.verified !== "advanced" && (
              <Btn v="teal" style={{ marginTop: 20 }} onClick={upgradeVerify}>Upgrade Verification Level</Btn>
            )}
          </Card>
          <Card>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Current: <span style={{ color: VC[user.verified] }}>{VL[user.verified]}</span></div>
            <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.7 }}>
              {user.verified === "phone"    && "Phone verified. Upgrade to Standard by adding email verification. Advanced unlocks the highest TrustScore potential."}
              {user.verified === "standard" && "Email and phone verified. Submit a government ID to unlock the Verified ID badge and the highest score ceiling."}
              {user.verified === "advanced" && "Maximum verification achieved. You have access to all platform features and the highest TrustScore credibility."}
            </div>
          </Card>
        </div>
      )}

      {tab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[{ label: "Profile Views (30 days)", val: user.profileViews || 0, note: "total views" }, { label: "TrustScore", val: user.trustScore || 0, note: SL(user.trustScore) }, { label: "Avg Rating", val: (user.reviews || []).length ? ((user.reviews.reduce((a, r) => a + r.rating, 0) / user.reviews.length).toFixed(1) + "★") : "—", note: "across all reviews" }, { label: "Reviews", val: (user.reviews || []).length, note: "verified reviews" }].map(({ label, val, note }) => (
            <Card key={label} style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--mid)", marginBottom: 8 }}>{label}</div>
              <div className="mono" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1, marginBottom: 4 }}>{val}</div>
              <div style={{ fontSize: 11, color: "var(--mid)" }}>{note}</div>
            </Card>
          ))}
          <Card style={{ gridColumn: "1/-1", padding: "20px" }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Score Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(user.scoreBreakdown || {}).map(([k, v]) => <SBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v || 0} />)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Profile Page (shareable) ───────────────────────────────
function ProfilePage() {
  const [s, set] = useStore();
  const [profile, setProfile] = useState(s.currentProfile || null);
  const [loading, setLoading] = useState(!s.currentProfile);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const username = s.urlUsername || profile?.username;
  const url = `${window.location.origin}/u/${username}`;

  useEffect(() => {
    if (!username) return;
    if (s.currentProfile && s.currentProfile.username === username) { setProfile(s.currentProfile); setLoading(false); return; }
    setLoading(true);
    api.get(`/public/profile/${username}`).then(data => { setProfile(data.profile); setLoading(false); }).catch(() => setLoading(false));
  }, [username]);

  const copy = txt => { navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const isOwn = s.user?.username === profile?.username;
  const prevPage = s.user ? "dashboard" : "search";

  if (loading) return <Spinner />;
  if (!profile) return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 32, marginBottom: 12 }}>Profile not found.</div>
      <div style={{ fontSize: 14, color: "var(--mid)", marginBottom: 24 }}>This profile doesn't exist or has been removed.</div>
      <Btn v="outline" onClick={() => set(x => ({ ...x, page: "search" }))}>← Search Profiles</Btn>
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn v="ghost" sz="sm" onClick={() => set(x => ({ ...x, page: prevPage }))}>← Back</Btn>
        {!isOwn && <Btn v="ghost" sz="sm" onClick={() => set(x => ({ ...x, reportModal: profile }))}>⚑ Report</Btn>}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Av src={profile.avatar} initials={profile.avatarInitials || "?"} color={profile.avatarColor || "var(--teal)"} size={76} premium={profile.premium} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 className="serif" style={{ fontSize: 28 }}>{profile.name}</h1>
              <VBdg level={profile.verified} />
            </div>
            <div style={{ fontSize: 14, color: "var(--mid)", marginBottom: 10 }}>{profile.title} · {profile.location}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>{(profile.badges || []).map(b => <Bdg key={b} label={b} />)}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn sz="sm" onClick={() => setShowShare(true)}>Share Profile ↗</Btn>
              {!isOwn && s.user && <Btn sz="sm" v="outline" onClick={() => set(x => ({ ...x, reviewModal: profile }))}>✦ Write Review</Btn>}
            </div>
          </div>
          <ScoreRing score={profile.trustScore || 0} size={110} stroke={9} />
        </div>
        {profile.bio && <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16, fontSize: 13, color: "var(--mid)", lineHeight: 1.8 }}>{profile.bio}</div>}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[["Deals Done", profile.deals || 0], ["Reviews", (profile.reviews || []).length], ["Member Since", profile.joinDate || "—"]].map(([label, val]) => (
          <Card key={label} style={{ padding: "14px 16px", textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: "var(--mid)" }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="serif" style={{ fontSize: 20 }}>TrustScore™</h2>
          <span className="mono" style={{ fontSize: 11, color: SC(profile.trustScore), background: "var(--surface2)", padding: "3px 10px", borderRadius: 20 }}>{SL(profile.trustScore)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(profile.scoreBreakdown || {}).map(([k, v]) => <SBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v || 0} />)}
        </div>
        <p className="mono" style={{ fontSize: 10, color: "var(--mid)", marginTop: 14, lineHeight: 1.6 }}>
          Score computed from {(profile.reviews || []).length} verified reviews · response patterns · delivery history. Updated weekly.
        </p>
      </Card>

      {(profile.skills || []).length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Skills & Expertise</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.skills.map(sk => <span key={sk} className="mono" style={{ fontSize: 11, padding: "4px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20, color: "var(--mid2)" }}>{sk}</span>)}
          </div>
        </Card>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="serif" style={{ fontSize: 22 }}>{(profile.reviews || []).length} Reviews</h2>
          {(profile.reviews || []).length > 0 && <StarRow rating={5} />}
        </div>
        {!(profile.reviews || []).length
          ? <Card style={{ textAlign: "center", padding: "32px" }}><div style={{ fontSize: 13, color: "var(--mid)" }}>No reviews yet.</div></Card>
          : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profile.reviews.map(r => (
                <Card key={r._id || r.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Av initials={(r.authorName || "?")[0]} color="var(--mid)" size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.authorName || "Anonymous"}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>{r.category} · {r.date ? new Date(r.date).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : ""}</div>
                      </div>
                    </div>
                    <StarRow rating={r.rating} />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--mid2)", lineHeight: 1.7 }}>{r.text}</p>
                </Card>
              ))}
            </div>}
      </div>

      {/* Share Modal */}
      {showShare && (
        <div style={{ position: "fixed", inset: 0, background: "var(--modal-ov)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, animation: "fadeIn 0.2s ease" }}
          onClick={() => setShowShare(false)}>
          <Card style={{ width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="serif" style={{ fontSize: 22 }}>Share Profile</h3>
              <button onClick={() => setShowShare(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--mid)" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--mid)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Public Link</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="mono" style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--mid)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
                  <Btn sz="sm" onClick={() => copy(url)}>{copied ? "✓ Copied" : "Copy"}</Btn>
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--mid)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Embed Widget Preview</div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px" }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                    <Av src={profile.avatar} initials={profile.avatarInitials || "?"} color={profile.avatarColor || "var(--teal)"} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{profile.name}</div>
                      <div style={{ fontSize: 11, color: "var(--mid)" }}>{profile.title}</div>
                      <div style={{ marginTop: 6 }}><StarRow rating={5} size={11} /></div>
                    </div>
                    <ScoreRing score={profile.trustScore || 0} size={60} stroke={5} />
                  </div>
                </div>
                <Btn v="outline" full style={{ marginTop: 8 }} onClick={() => copy(`<iframe src="${url}/embed" width="320" height="160" frameborder="0"></iframe>`)}>Copy Embed Code</Btn>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--mid)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>API Integration</div>
                <div style={{ background: "var(--ink)", color: "#a8e6cf", borderRadius: 8, padding: "12px 16px", fontSize: 11, lineHeight: 1.8, fontFamily: "DM Mono, monospace" }}>
                  <div style={{ color: "#6b8e9f" }}># TrustScore API</div>
                  <div>GET {API_BASE}/public/trust/<span style={{ color: "var(--gold)" }}>{profile.username}</span></div>
                  <div style={{ color: "#6b8e9f" }}># Returns</div>
                  <div>{"{ score: "}<span style={{ color: "var(--gold)" }}>{profile.trustScore}</span>{", verified: true }"}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Search ─────────────────────────────────────────────────
function SearchPage() {
  const [s, set] = useStore();
  const [q, setQ]               = useState("");
  const [occ, setOcc]           = useState("");
  const [minScore, setMinScore]  = useState(0);
  const [verOnly, setVerOnly]   = useState(false);
  const [sortBy, setSortBy]     = useState("score");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy, minScore, ...(q && { q }), ...(occ && { occupation: occ }), ...(verOnly && { verified: "true" }) });
      const data = await api.get(`/profiles?${params}`);
      setProfiles(data.profiles || []);
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [q, occ, minScore, verOnly, sortBy]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const openProfile = (p) => {
    set(x => ({ ...x, currentProfile: p, page: "profile", urlUsername: p.username }));
    window.history.pushState({}, "", `/u/${p.username}`);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>◆ Search Profiles</div>
      <h1 className="serif" style={{ fontSize: 32, marginBottom: 6 }}>Find trusted people.</h1>
      <p style={{ color: "var(--mid)", fontSize: 14, marginBottom: 24 }}>Search by name, occupation, location, or score before you engage.</p>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 18px", display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 16, color: "var(--mid)" }}>🔍</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, username, occupation, or location…"
          style={{ flex: 1, background: "none", border: "none", color: "var(--ink)", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
        {q && <button onClick={() => setQ("")} style={{ background: "none", border: "none", color: "var(--mid)", cursor: "pointer", fontSize: 18 }}>×</button>}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select value={occ} onChange={e => setOcc(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: occ ? "var(--teal)" : "var(--mid)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <option value="">All Occupations</option>
          {OCCUPATIONS.map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: minScore > 0 ? "var(--teal)" : "var(--mid)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <option value={0}>Any Score</option>
          <option value={60}>60+ Score</option>
          <option value={75}>75+ Score</option>
          <option value={90}>90+ Score</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mid)", cursor: "pointer" }}>
          <input type="checkbox" checked={verOnly} onChange={e => setVerOnly(e.target.checked)} style={{ accentColor: "var(--teal)" }} />
          Verified Only
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["score", "reviews", "name"].map(t => <Pill key={t} label={`Sort: ${t}`} active={sortBy === t} onClick={() => setSortBy(t)} />)}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="mono" style={{ fontSize: 11, color: "var(--mid)", marginBottom: 14 }}>{profiles.length} profile{profiles.length !== 1 ? "s" : ""} found</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {profiles.map(p => (
              <Card key={p._id || p.id} onClick={() => openProfile(p)} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Av src={p.avatar} initials={p.avatarInitials || "?"} color={p.avatarColor || "var(--teal)"} size={52} premium={p.premium} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</span>
                    <VBdg level={p.verified} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mid)", marginBottom: 8 }}>{p.title} · {p.location}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <StarRow rating={(p.reviews || []).length > 0 ? 5 : 4} size={11} />
                    <span className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>{(p.reviews || []).length} reviews · {p.deals || 0} deals</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{(p.badges || []).slice(0, 3).map(b => <Bdg key={b} label={b} />)}</div>
                </div>
                <ScoreRing score={p.trustScore || 0} size={70} stroke={6} />
              </Card>
            ))}
            {!profiles.length && (
              <Card style={{ textAlign: "center", padding: "48px" }}>
                <div className="serif" style={{ fontSize: 24, marginBottom: 8 }}>No profiles found.</div>
                <div style={{ fontSize: 13, color: "var(--mid)" }}>Try a different search or adjust the filters.</div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Business Portal ────────────────────────────────────────
function BusinessPortal() {
  const [s, set] = useStore();
  const [q, setQ]               = useState("");
  const [compared, setCompared] = useState([]);
  const [tab, setTab]           = useState("verify");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = q ? `?q=${q}` : "";
    api.get(`/profiles${params}`).then(d => { setProfiles(d.profiles || []); setLoading(false); }).catch(() => setLoading(false));
  }, [q]);

  const toggle = p => setCompared(c => c.find(x => x._id === p._id) ? c.filter(x => x._id !== p._id) : c.length < 3 ? [...c, p] : c);
  const openProfile = p => { set(x => ({ ...x, currentProfile: p, page: "profile", urlUsername: p.username })); window.history.pushState({}, "", `/u/${p.username}`); };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>◆ Business Portal</div>
      <h1 className="serif" style={{ fontSize: 32, marginBottom: 6 }}>Verify before you commit.</h1>
      <p style={{ color: "var(--mid)", fontSize: 14, marginBottom: 24 }}>Check workers, freelancers, and candidates before contracts.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[["12,400+", "Trust Checks Done"], ["₦480M+", "Fraud Prevented"], ["3,200+", "Businesses Using"]].map(([val, label]) => (
          <Card key={label} style={{ padding: "18px", textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 26, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 11, color: "var(--mid)" }}>{label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["verify", "Verify Candidates"], ["compare", "Compare Profiles"], ["history", "Hire History"]].map(([key, label]) => (
          <Pill key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
        ))}
      </div>

      {tab === "verify" && (
        <div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
            <span>🔍</span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search workers, freelancers, or vendors…"
              style={{ flex: 1, background: "none", border: "none", fontSize: 14, outline: "none", fontFamily: "inherit", color: "var(--ink)" }} />
          </div>
          {loading ? <Spinner /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {profiles.map(p => (
                <Card key={p._id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Av src={p.avatar} initials={p.avatarInitials || "?"} color={p.avatarColor || "var(--teal)"} size={48} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--mid)", marginBottom: 6 }}>{p.occupation} · {p.location}</div>
                    <div style={{ display: "flex", gap: 6 }}><VBdg level={p.verified} /><span className="mono" style={{ fontSize: 10, color: "var(--mid)", alignSelf: "center" }}>{p.deals || 0} deals</span></div>
                  </div>
                  <ScoreRing score={p.trustScore || 0} size={60} stroke={5} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Btn sz="sm" onClick={() => openProfile(p)}>View</Btn>
                    <Btn sz="sm" v={compared.find(x => x._id === p._id) ? "danger" : "outline"} onClick={() => toggle(p)}>{compared.find(x => x._id === p._id) ? "Remove" : "Compare"}</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "compare" && (
        !compared.length
          ? <Card style={{ textAlign: "center", padding: "48px" }}>
              <div className="serif" style={{ fontSize: 24, marginBottom: 8 }}>No profiles selected.</div>
              <div style={{ fontSize: 13, color: "var(--mid)" }}>Go to Verify tab and click Compare on up to 3 profiles.</div>
            </Card>
          : <div style={{ display: "grid", gridTemplateColumns: `repeat(${compared.length},1fr)`, gap: 12 }}>
              {compared.map(p => (
                <Card key={p._id} style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Av src={p.avatar} initials={p.avatarInitials || "?"} color={p.avatarColor || "var(--teal)"} size={52} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--mid)", marginBottom: 12 }}>{p.occupation}</div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <ScoreRing score={p.trustScore || 0} size={90} stroke={7} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(p.scoreBreakdown || {}).map(([k, v]) => <SBar key={k} label={k} value={v || 0} />)}
                  </div>
                  <div style={{ marginTop: 12 }}><VBdg level={p.verified} /></div>
                </Card>
              ))}
            </div>
      )}

      {tab === "history" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent Verifications</div>
          {[["Tunde Okafor", "Verified for contract", "2h ago", "Approved"], ["Adeola Bello", "Background trust check", "1d ago", "Approved"], ["Unknown User", "Pre-hire screening", "3d ago", "Rejected"]].map(([name, action, time, outcome], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "var(--mid)" }}>{name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 11, color: "var(--mid)" }}>{action} · {time}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: outcome === "Approved" ? "rgba(42,122,110,0.12)" : "rgba(192,57,43,0.08)", color: outcome === "Approved" ? "var(--teal)" : "var(--red)" }}>{outcome}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────
function Reports() {
  const [s, set] = useStore();
  const [form, setForm] = useState({ target: "", type: "Scam/Fraud", detail: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!s.token) return;
    api.get("/reports/mine", s.token).then(d => setMyReports(d.reports || [])).catch(() => {});
  }, [s.token]);

  const submit = async () => {
    if (!form.target || !form.detail) return showToast(set, "All fields required", "error");
    setLoading(true);
    try {
      await api.post("/reports", form, s.token);
      setDone(true);
      showToast(set, "Report submitted. Admin will review shortly.", "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = { pending: "var(--gold)", reviewing: "var(--teal)", resolved: "var(--mid)", dismissed: "var(--red)" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>◆ Report & Dispute Center</div>
      <h1 className="serif" style={{ fontSize: 32, marginBottom: 6 }}>Report bad actors.</h1>
      <p style={{ color: "var(--mid)", fontSize: 14, marginBottom: 28 }}>Report scams, fake reviews, or fraud. Every case is reviewed by our admin team.</p>

      <div style={{ display: "grid", gap: 14 }}>
        <Card>
          {done ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div className="serif" style={{ fontSize: 48, color: "var(--teal)", marginBottom: 12 }}>✦</div>
              <div className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Report Submitted.</div>
              <div style={{ fontSize: 13, color: "var(--mid)", marginBottom: 20 }}>Our admin team will review it within 24 hours.</div>
              <Btn v="outline" onClick={() => { setDone(false); setForm({ target: "", type: "Scam/Fraud", detail: "" }); }}>Submit Another</Btn>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>⚑ File a Report</div>
              {!s.user && <div style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--mid)", marginBottom: 14 }}>
                <span style={{ color: "var(--gold)" }}>⚠</span> You must be <span style={{ color: "var(--teal)", cursor: "pointer" }} onClick={() => set(x => ({ ...x, page: "login" }))}>signed in</span> to submit a report.
              </div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <TLIn label="Username or Name" value={form.target} onChange={v => f("target", v)} placeholder="@username or full name" />
                <div>
                  <label style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500, display: "block", marginBottom: 6 }}>Report Type</label>
                  <select value={form.type} onChange={e => f("type", e.target.value)} style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)", fontSize: 14, color: "var(--ink)", fontFamily: "inherit" }}>
                    {["Scam/Fraud", "Fake Review", "Impersonation", "Abuse/Harassment", "Suspicious Activity", "Other"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <TLIn label="Details" value={form.detail} onChange={v => f("detail", v)} placeholder="Describe what happened in detail…" multi />
                <Btn v="teal" disabled={!s.user || !form.target || !form.detail} loading={loading} onClick={submit}>Submit Report</Btn>
              </div>
            </>
          )}
        </Card>

        {myReports.length > 0 && (
          <Card>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Your Reports</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myReports.map(d => (
                <div key={d._id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.type}</span>
                      <span style={{ fontSize: 12, color: "var(--mid)", marginLeft: 8 }}>against {d.target}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "var(--surface3)", color: statusColor[d.status] }}>{d.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.6 }}>{d.detail}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--mid)", marginTop: 6 }}>{new Date(d.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Admin ──────────────────────────────────────────────────
function Admin() {
  const [s, set] = useStore();
  const [tab, setTab]     = useState("overview");
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!s.token || s.user?.role !== "admin") return;
    Promise.all([
      api.get("/admin/stats", s.token),
      api.get("/admin/users", s.token),
      api.get("/admin/reports", s.token),
    ]).then(([st, us, rp]) => {
      setStats(st);
      setUsers(us.users || []);
      setReports(rp.reports || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [s.token]);

  const resolve = async (id) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status: "resolved" }, s.token);
      setReports(r => r.map(x => x._id === id ? { ...x, status: "resolved" } : x));
      showToast(set, "Dispute resolved.", "success");
    } catch (err) { showToast(set, err.message, "error"); }
  };

  const suspend = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/suspend`, {}, s.token);
      setUsers(u => u.map(x => x._id === id ? { ...x, suspended: true } : x));
      showToast(set, "User suspended.", "info");
    } catch (err) { showToast(set, err.message, "error"); }
  };

  if (!s.user || s.user.role !== "admin") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 32, marginBottom: 12 }}>Access Denied</div>
      <div style={{ fontSize: 14, color: "var(--mid)" }}>Admin access required.</div>
    </div>
  );

  const statusColor = { pending: "var(--gold)", reviewing: "var(--teal)", resolved: "var(--mid)", dismissed: "var(--red)" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span className="mono" style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, background: "rgba(192,57,43,0.1)", color: "var(--red)", textTransform: "uppercase", letterSpacing: 1 }}>Admin</span>
        <h1 className="serif" style={{ fontSize: 28 }}>Platform Dashboard</h1>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
            {[{ label: "Total Users", val: stats.totalUsers || 0, color: "var(--ink)" }, { label: "Pending Reports", val: stats.pendingReports || 0, color: "var(--gold)" }, { label: "Verified (Adv)", val: stats.advancedVerified || 0, color: "var(--teal)" }, { label: "Avg Score", val: stats.avgScore || 0, color: "var(--teal)" }].map(({ label, val, color }) => (
              <Card key={label} style={{ padding: "16px 18px" }}>
                <div className="mono" style={{ fontSize: 26, fontWeight: 500, color, lineHeight: 1, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 11, color: "var(--mid)" }}>{label}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["overview", "users", "disputes"].map(t => <Pill key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => setTab(t)} />)}
          </div>

          {tab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map(u => (
                <Card key={u._id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Av src={u.avatar} initials={u.avatarInitials || "?"} color={u.avatarColor || "var(--teal)"} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--mid)" }}>{u.occupation} · {u.location}</div>
                  </div>
                  <VBdg level={u.verified} />
                  <ScoreRing score={u.trustScore || 0} size={50} stroke={4} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn sz="sm" v="outline" onClick={() => { set(x => ({ ...x, currentProfile: u, page: "profile", urlUsername: u.username })); }}>View</Btn>
                    {!u.suspended && <Btn sz="sm" v="danger" onClick={() => suspend(u._id)}>Suspend</Btn>}
                    {u.suspended && <span className="mono" style={{ fontSize: 10, color: "var(--red)", alignSelf: "center" }}>Suspended</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "disputes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map(d => (
                <Card key={d._id}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div><span style={{ fontWeight: 700, fontSize: 14 }}>{d.type}</span><span className="mono" style={{ fontSize: 10, color: "var(--mid)", marginLeft: 10 }}>{new Date(d.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</span></div>
                    <span className="mono" style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "var(--surface2)", color: statusColor[d.status] }}>{d.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--mid)", marginBottom: 10, lineHeight: 1.6 }}><strong>Target:</strong> {d.target} · <strong>By:</strong> {d.reporterName}<br />{d.detail}</div>
                  {d.status !== "resolved" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn sz="sm" v="teal" onClick={() => resolve(d._id)}>Mark Resolved</Btn>
                      <Btn sz="sm" v="outline" onClick={async () => { await api.patch(`/admin/reports/${d._id}`, { status: "reviewing" }, s.token); setReports(r => r.map(x => x._id === d._id ? { ...x, status: "reviewing" } : x)); }}>Mark Reviewing</Btn>
                    </div>
                  )}
                </Card>
              ))}
              {!reports.length && <Card style={{ textAlign: "center", padding: "32px" }}><div style={{ fontSize: 13, color: "var(--mid)" }}>No reports filed yet.</div></Card>}
            </div>
          )}

          {tab === "overview" && (
            <Card>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Platform Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["Total registered users", stats.totalUsers || 0], ["Advanced verified", stats.advancedVerified || 0], ["Pending reports", stats.pendingReports || 0], ["Average TrustScore", stats.avgScore || 0]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 13, color: "var(--mid)" }}>{label}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────
function SettingsPage() {
  const [s, set] = useStore();
  const { user } = s;
  const [form, setForm] = useState({ name: user?.name || "", title: user?.title || "", location: user?.location || "", bio: user?.bio || "", skills: (user?.skills || []).join(", ") });
  const [loading, setLoading] = useState(false);
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }));
  if (!user) return null;

  const save = async () => {
    setLoading(true);
    try {
      const data = await api.patch("/profiles/me", { ...form, skills: form.skills.split(",").map(s => s.trim()).filter(Boolean) }, s.token);
      set(x => ({ ...x, user: data.user }));
      showToast(set, "Profile updated! ✦", "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (url) => {
    set(x => ({ ...x, user: { ...x.user, avatar: url } }));
    showToast(set, "Photo updated! ✦", "success");
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px 80px" }}>
      <h1 className="serif" style={{ fontSize: 32, marginBottom: 28 }}>Account Settings</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Profile Photo</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <AvatarUpload user={user} onUpload={handleAvatarUpload} />
            <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6 }}>
              Upload a clear professional photo.<br />
              <span className="mono" style={{ fontSize: 11 }}>JPG, PNG or WebP · Max 5MB</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Profile Information</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <TLIn label="Full Name" value={form.name} onChange={v => f("name", v)} placeholder="Your full name" />
            <TLIn label="Professional Title" value={form.title} onChange={v => f("title", v)} placeholder="UX Designer · Freelancer" />
            <TLIn label="Location" value={form.location} onChange={v => f("location", v)} placeholder="Lagos, Nigeria" />
            <TLIn label="Bio" value={form.bio} onChange={v => f("bio", v)} placeholder="Tell people about yourself…" multi />
            <TLIn label="Skills (comma-separated)" value={form.skills} onChange={v => f("skills", v)} placeholder="Figma, UX Research, Prototyping" />
            <Btn v="teal" loading={loading} onClick={save}>Save Changes</Btn>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Theme Preference</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ key: "light", icon: "☀", label: "Light" }, { key: "dark", icon: "◑", label: "Dark" }, { key: "system", icon: "⊙", label: "System" }].map(opt => (
              <button key={opt.key} onClick={() => { set(x => ({ ...x, theme: opt.key })); applyTheme(opt.key); }}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid",
                  borderColor: s.theme === opt.key ? "var(--teal)" : "var(--border)",
                  background: s.theme === opt.key ? "var(--teal)" : "var(--surface2)",
                  color: s.theme === opt.key ? "#fff" : "var(--mid)", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 13 }}>
                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Privacy Controls</div>
          {["Show profile in search results", "Allow reviews from anyone", "Display TrustScore publicly", "Show deal count on profile"].map((item, i) => (
            <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 13 }}>{item}</span>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: i < 3 ? "var(--teal)" : "var(--border)", position: "relative", cursor: "pointer" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, right: i < 3 ? 3 : "auto", left: i < 3 ? "auto" : 3 }} />
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Account</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="outline">Download My Data</Btn>
            <Btn v="danger" onClick={() => { set(x => ({ ...x, user: null, token: null, page: "landing" })); showToast(set, "Signed out.", "info"); }}>Sign Out</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Review Modal ───────────────────────────────────────────
function ReviewModal() {
  const [s, set] = useStore();
  const p = s.reviewModal;
  const [rating, setRating] = useState(0);
  const [form, setForm]     = useState({ text: "", category: "Professionalism" });
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  if (!p) return null;

  const close = () => set(x => ({ ...x, reviewModal: null }));

  const submit = async () => {
    if (!s.user) return showToast(set, "Sign in to leave a review", "error");
    if (!rating || !form.text.trim()) return;
    setLoading(true);
    try {
      const data = await api.post(`/reviews/${p.username}`, { rating, text: form.text, category: form.category }, s.token);
      setDone(true);
      // Update currentProfile if it matches
      if (s.currentProfile?.username === p.username) {
        set(x => ({ ...x, currentProfile: { ...x.currentProfile, reviews: [data.review, ...(x.currentProfile?.reviews || [])], trustScore: x.currentProfile.trustScore } }));
      }
      setTimeout(close, 1600);
      showToast(set, "Review submitted! ✦", "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-ov)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, animation: "fadeIn 0.2s ease" }}
      onClick={close}>
      <Card style={{ width: "100%", maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div className="serif" style={{ fontSize: 48, color: "var(--teal)", marginBottom: 12 }}>✦</div>
            <div className="serif" style={{ fontSize: 24, marginBottom: 8 }}>Review Submitted!</div>
            <div style={{ fontSize: 13, color: "var(--mid)" }}>It will appear after quick verification.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 className="serif" style={{ fontSize: 22 }}>Write a Review</h3>
                <p style={{ fontSize: 12, color: "var(--mid)", marginTop: 3 }}>for {p.name}</p>
              </div>
              <button onClick={close} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--mid)", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--mid)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Your Rating</div>
                <StarRow rating={rating} size={36} interactive onSet={setRating} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)", fontSize: 14, fontFamily: "inherit", color: "var(--ink)" }}>
                  {["Professionalism", "Reliability", "Communication", "Quality", "Honesty", "Timeliness"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <TLIn label="Your Review" value={form.text} onChange={v => setForm(x => ({ ...x, text: v }))} placeholder="Share your honest experience working with this person…" multi />
              <Btn v="teal" full loading={loading} onClick={submit} disabled={!rating || !form.text.trim()}>Submit Review ✦</Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── Report Modal ───────────────────────────────────────────
function ReportModal() {
  const [s, set] = useStore();
  const p = s.reportModal;
  const [form, setForm] = useState({ type: "Scam/Fraud", detail: "" });
  const [loading, setLoading] = useState(false);
  if (!p) return null;

  const close = () => set(x => ({ ...x, reportModal: null }));
  const submit = async () => {
    if (!s.user) return showToast(set, "Sign in to report", "error");
    setLoading(true);
    try {
      await api.post("/reports", { target: p.username || p.name, ...form }, s.token);
      set(x => ({ ...x, reportModal: null }));
      showToast(set, "Report submitted. Our team will review it.", "success");
    } catch (err) {
      showToast(set, err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-ov)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={close}>
      <Card style={{ width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>⚑ Report Profile</h3>
          <button onClick={close} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--mid)" }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--mid)", marginBottom: 16 }}>Reporting: <strong style={{ color: "var(--ink)" }}>{p.name}</strong></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Report Type</label>
            <select value={form.type} onChange={e => setForm(x => ({ ...x, type: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)", fontSize: 14, fontFamily: "inherit", color: "var(--ink)" }}>
              {["Scam/Fraud", "Fake Reviews", "Impersonation", "Harassment", "Suspicious Activity"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <TLIn label="Describe what happened" value={form.detail} onChange={v => setForm(x => ({ ...x, detail: v }))} placeholder="Give details to help us investigate…" multi />
          <Btn v="danger" full loading={loading} onClick={submit} disabled={!form.detail.trim()}>Submit Report</Btn>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════ ROOT APP ══════════════════

export default function App() {
  const [s] = useStore();

  // Apply theme on mount and system change
  useEffect(() => {
    applyTheme(s.theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (s.theme === "system") applyTheme("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [s.theme]);

  // Handle browser back/forward
  useEffect(() => {
    const handler = () => {
      const { page, urlUsername } = parseUrlPage();
      store.set(x => ({ ...x, page, urlUsername }));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const pages = {
    landing:   <Landing />,
    signup:    <Auth mode="signup" />,
    login:     <Auth mode="login" />,
    dashboard: <Dashboard />,
    profile:   <ProfilePage />,
    search:    <SearchPage />,
    business:  <BusinessPortal />,
    reports:   <Reports />,
    admin:     <Admin />,
    settings:  <SettingsPage />,
  };

  return (
    <>
      <style>{THEME_CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <Nav />
        <div style={{ flex: 1, animation: "fadeUp 0.35s ease" }} key={s.page}>
          {pages[s.page] || <Landing />}
        </div>
        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", textAlign: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--mid)" }}>TrustScore · Reputation Infrastructure for Africa © 2025</span>
        </footer>
        <ReviewModal />
        <ReportModal />
        <Toast t={s.toast} />
      </div>
    </>
  );
}
