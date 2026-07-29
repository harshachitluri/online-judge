/*
 |--------------------------------------------------------------------------
 | Verdicts
 |--------------------------------------------------------------------------
 | Icon, colour and badge class for every verdict the backend can return
 | (see backend/src/models/Submission.js).
 |
 | NOTE ON CLASS NAMES: the CSS selectors in index.css escape the dots
 | (`.verdict-Wrong\.Answer`), which matches a class literally named
 | "verdict-Wrong.Answer". The strings below must therefore contain plain
 | dots — escaping them here would make the class name contain a backslash
 | and match nothing.
 */

export const VERDICT_META = {
    "Accepted": {
        icon: "✅", color: "var(--success)", cls: "verdict-Accepted"
    },
    "Wrong Answer": {
        icon: "❌", color: "var(--error)", cls: "verdict-Wrong.Answer"
    },
    "Time Limit Exceeded": {
        icon: "⏰", color: "var(--warning)", cls: "verdict-Time.Limit.Exceeded"
    },
    "Compilation Error": {
        icon: "🔴", color: "var(--purple)", cls: "verdict-Compilation.Error"
    },
    "Runtime Error": {
        icon: "⚠️", color: "var(--orange)", cls: "verdict-Runtime.Error"
    },
    "Memory Limit Exceeded": {
        icon: "💾", color: "var(--info)", cls: "verdict-Memory.Limit.Exceeded"
    },
    "Pending": {
        icon: "⏳", color: "var(--text-muted)", cls: "verdict-Pending"
    }
};

const FALLBACK = { icon: "❓", color: "var(--text-secondary)", cls: "" };

export const getVerdictMeta = (verdict) => VERDICT_META[verdict] || FALLBACK;
