/*
 |==========================================================================
 | Formatting
 |==========================================================================
 | Every user-visible number and date passes through here, so the app can't
 | drift into three different date formats across four pages.
 */

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** "just now" · "4m ago" · "3d ago" · "12 Mar 2026" past a fortnight. */
export const relativeTime = (input) => {
    if (!input) return "—";

    const then = new Date(input).getTime();
    if (Number.isNaN(then)) return "—";

    const seconds = Math.round((Date.now() - then) / 1000);

    // A clock skew between client and server can make a fresh record look
    // like it's from the future; show it as "just now" rather than "-3s ago".
    if (seconds < 45) return "just now";
    if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
    if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
    if (seconds < DAY * 14) return `${Math.floor(seconds / DAY)}d ago`;

    return absoluteDate(input);
};

/** "12 Mar 2026" */
export const absoluteDate = (input) => {
    if (!input) return "—";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

/** "12 Mar 2026, 14:30" */
export const dateTime = (input) => {
    if (!input) return "—";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

/** "Sun 17:00" — the schedule line on a contest card. */
export const shortDateTime = (input) => {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
};

/** "1,204" — grouped, with the locale's separator. */
export const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : "0";
};

/** "1.2K" · "3.4M" — for stat tiles where width is tight. */
export const compact = (value) => {
    const n = Number(value) || 0;
    if (Math.abs(n) < 1000) return String(n);

    return new Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(n);
};

/** "48%" */
export const percent = (value, total) => {
    if (!total) return "0%";
    return `${Math.round((Number(value) / Number(total)) * 100)}%`;
};

/** "342ms" · "1.4s" */
export const duration = (ms) => {
    const n = Number(ms) || 0;
    if (n < 1000) return `${Math.round(n)}ms`;
    return `${(n / 1000).toFixed(2)}s`;
};

/** "12.4 MB" — the judge reports memory in kilobytes. */
export const memory = (kb) => {
    const n = Number(kb) || 0;
    if (n < 1024) return `${Math.round(n)} KB`;
    return `${(n / 1024).toFixed(1)} MB`;
};

/** "1h 30m" — contest length. */
export const minutes = (mins) => {
    const n = Number(mins) || 0;
    const h = Math.floor(n / 60);
    const m = n % 60;

    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
};

/** Title-cases a slug or a snake_cased key for display. */
export const titleCase = (value = "") =>
    String(value)
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

/** "AK" from "Ada Kowalski", "A" from "ada". */
export const initials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** An ISO date key ("2026-03-12") in *local* time, for calendar bucketing. */
export const dayKey = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
