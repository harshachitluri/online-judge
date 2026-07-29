/*
 |--------------------------------------------------------------------------
 | Date Formatting
 |--------------------------------------------------------------------------
 | Every page formatted dates inline with slightly different options.
 | These helpers also guard against invalid/missing dates, which previously
 | rendered as "Invalid Date".
 */

const LOCALE = "en-IN";

const toDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** "28 Jul 2026, 10:45 pm" */
export const formatDateTime = (value) => {
    const date = toDate(value);
    if (!date) return "—";

    return date.toLocaleDateString(LOCALE, {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
};

/** "28 Jul, 10:45 pm" — compact variant for dense tables */
export const formatShortDateTime = (value) => {
    const date = toDate(value);
    if (!date) return "—";

    return date.toLocaleDateString(LOCALE, {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
};

/** "28/07/2026" */
export const formatDate = (value) => {
    const date = toDate(value);
    if (!date) return "—";

    return date.toLocaleDateString(LOCALE);
};

/** "Jul 2026" */
export const formatMonthYear = (value) => {
    const date = toDate(value);
    if (!date) return "—";

    return date.toLocaleDateString(LOCALE, { month: "short", year: "numeric" });
};
