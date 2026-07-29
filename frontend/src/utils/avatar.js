/*
 |--------------------------------------------------------------------------
 | Avatar Helpers
 |--------------------------------------------------------------------------
 | Initials and a deterministic colour derived from a username. Previously
 | duplicated (with small differences) in Navbar, Sidebar, Layout and
 | ProfilePage, so the same user could get different colours per view.
 */

/** "Ada Lovelace" → "AL", "ada" → "A", missing → "U". */
export const getInitials = (name) => {
    if (!name) return "U";

    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();

    return parts[0][0].toUpperCase();
};

/** Stable hue (0–359) for a given name. */
export const getAvatarHue = (name = "") => {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return Math.abs(hash) % 360;
};

/**
 * Ready-to-use CSS gradient for an avatar background.
 * @param {string} name
 * @param {number} [lightness] - base lightness of the first stop
 */
export const getAvatarGradient = (name = "", lightness = 45) => {
    const hue = getAvatarHue(name);

    return `linear-gradient(135deg, hsl(${hue},65%,${lightness}%), hsl(${(hue + 40) % 360},65%,55%))`;
};
