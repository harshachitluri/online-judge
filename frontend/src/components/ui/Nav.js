import React, { useId } from "react";
import { motion } from "framer-motion";

/*
 |==========================================================================
 | Tabs, segmented controls and avatars
 |==========================================================================
 | The travelling indicators use Framer's shared `layoutId` rather than a
 | measured transform, so they interpolate correctly even when a tab's width
 | changes (a count badge appearing, a label translating).
 */

/* ── Tabs ──────────────────────────────────────────────────────────────── */

/**
 * @param {Array<{id, label, icon?, count?}>} items
 */
export const Tabs = ({ items = [], value, onChange, className = "" }) => {
    const groupId = useId();

    return (
        <div className={`tabs ${className}`} role="tablist">
            {items.map((item) => {
                const selected = item.id === value;
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        id={`${groupId}-${item.id}`}
                        aria-selected={selected}
                        aria-controls={`${groupId}-${item.id}-panel`}
                        // Only the active tab is a tab stop; arrow keys move
                        // between them, which is the ARIA tabs pattern.
                        tabIndex={selected ? 0 : -1}
                        className="tabs__tab"
                        onClick={() => onChange?.(item.id)}
                        onKeyDown={(event) => {
                            const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                            if (!dir) return;

                            event.preventDefault();
                            const index = items.findIndex((i) => i.id === value);
                            const next = items[(index + dir + items.length) % items.length];
                            onChange?.(next.id);
                        }}
                    >
                        {Icon && (
                            <span aria-hidden="true" style={{ display: "grid" }}>
                                <Icon size={14} />
                            </span>
                        )}

                        {item.label}

                        {item.count !== undefined && (
                            <span
                                className="tnum"
                                style={{
                                    fontSize: "var(--fs-2xs)",
                                    color: "var(--text-faint)",
                                    fontWeight: "var(--fw-medium)"
                                }}
                            >
                                {item.count}
                            </span>
                        )}

                        {selected && (
                            <motion.span
                                layoutId={`tabs-ink-${groupId}`}
                                className="tabs__ink"
                                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

/** The panel a tab controls — wires the aria relationship back. */
export const TabPanel = ({ id, groupId, active, children }) =>
    active ? (
        <div role="tabpanel" id={`${groupId}-${id}-panel`} aria-labelledby={`${groupId}-${id}`}>
            {children}
        </div>
    ) : null;

/* ── Segmented control ─────────────────────────────────────────────────── */

/**
 * A compact two-to-four-way switch. Use it for view modes and ranges;
 * anything with more options or longer labels wants Tabs or a Select.
 */
export const Segmented = ({ items = [], value, onChange, className = "", size }) => {
    const groupId = useId();

    return (
        <div
            className={`segmented ${className}`}
            role="tablist"
            aria-orientation="horizontal"
        >
            {items.map((item) => {
                const id = typeof item === "string" ? item : item.id;
                const label = typeof item === "string" ? item : item.label;
                const Icon = typeof item === "string" ? null : item.icon;
                const selected = id === value;

                return (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        className="segmented__item"
                        style={size === "sm" ? { padding: "2px var(--sp-3)" } : undefined}
                        onClick={() => onChange?.(id)}
                        title={typeof item === "object" ? item.title : undefined}
                    >
                        {Icon && (
                            <span aria-hidden="true" style={{ display: "inline-grid", verticalAlign: "-2px", marginRight: label ? 5 : 0 }}>
                                <Icon size={13} />
                            </span>
                        )}
                        {label}

                        {selected && (
                            <motion.span
                                layoutId={`segmented-pill-${groupId}`}
                                className="segmented__pill"
                                transition={{ type: "spring", stiffness: 480, damping: 38 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

/* ── Avatar ────────────────────────────────────────────────────────────── */

/*
 | The gradient is derived from the name, so a person keeps the same
 | identity colour on every screen without the backend storing an avatar.
 | The hues are spread 46° apart so two adjacent names rarely collide.
 */
const hashString = (value = "") => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0; // force 32-bit
    }
    return Math.abs(hash);
};

export const avatarGradient = (name = "") => {
    const hue = hashString(name) % 360;
    return `linear-gradient(135deg, hsl(${hue} 62% 48%), hsl(${(hue + 46) % 360} 68% 40%))`;
};

const initialsOf = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar = ({ name = "", size = "md", ring = false, src, className = "" }) => (
    <span
        className={`avatar avatar--${size} ${ring ? "avatar--ring" : ""} ${className}`}
        style={{ background: src ? undefined : avatarGradient(name) }}
        // The name is already rendered beside the avatar everywhere it is
        // used, so this is decorative and must not be announced twice.
        aria-hidden="true"
    >
        {src ? (
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
            initialsOf(name)
        )}
    </span>
);

/* ── Progress ──────────────────────────────────────────────────────────── */

export const ProgressBar = ({ value = 0, max = 100, label, thin = false, color }) => {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    return (
        <div
            className={`progress ${thin ? "progress--thin" : ""}`}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <motion.span
                className="progress__fill"
                style={color ? { background: color } : undefined}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
        </div>
    );
};
