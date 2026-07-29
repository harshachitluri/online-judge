import React from "react";
import * as Icons from "react-icons/lu";

import { verdictMeta, difficultyMeta, languageMeta } from "../../lib/domain";

/*
 |==========================================================================
 | Badges & chips
 |==========================================================================
 | A badge labels state; a chip is an interactive filter. They look similar
 | on purpose but are never interchangeable — a chip is a <button>.
 |
 | Every status badge in here renders an icon *and* a word. Colour is the
 | third channel, never the first.
 */

export const Badge = ({
    tone = "neutral",
    icon: Icon,
    size,
    dot = false,
    pulse = false,
    className = "",
    children,
    ...rest
}) => (
    <span
        className={`badge badge--${tone} ${size === "lg" ? "badge--lg" : ""} ${className}`}
        {...rest}
    >
        {dot && (
            <span
                className={`badge__dot ${pulse ? "badge__dot--pulse" : ""}`}
                aria-hidden="true"
            />
        )}
        {Icon && (
            <span aria-hidden="true" style={{ display: "grid" }}>
                <Icon size={size === "lg" ? 13 : 11} />
            </span>
        )}
        {children}
    </span>
);

/* ── Verdict ───────────────────────────────────────────────────────────── */

/**
 * @param {string} verdict  one of the backend's Submission.verdict values
 * @param {boolean} short   render "AC" instead of "Accepted" (tables)
 */
export const VerdictBadge = ({ verdict, short = false, size, className = "" }) => {
    const meta = verdictMeta(verdict);
    const Icon = Icons[meta.icon] || Icons.LuCircleHelp;

    return (
        <Badge
            tone={meta.tone}
            icon={Icon}
            size={size}
            className={className}
            title={meta.blurb}
        >
            {short ? meta.short : verdict}
        </Badge>
    );
};

/* ── Difficulty ────────────────────────────────────────────────────────── */

/*
 | Difficulty is drawn as a dot plus the word. The dot is small enough to
 | read as a marker rather than a status light, and the word is what
 | actually communicates the level.
 */
export const DifficultyBadge = ({ level, size, className = "" }) => {
    const meta = difficultyMeta(level);

    return (
        <span
            className={`badge ${size === "lg" ? "badge--lg" : ""} ${className}`}
            style={{
                background: meta.wash,
                borderColor: meta.color,
                color: meta.color
            }}
            title={`${level} difficulty`}
        >
            <span className="badge__dot" aria-hidden="true" />
            {level}
        </span>
    );
};

/* ── Language ──────────────────────────────────────────────────────────── */

export const LanguageBadge = ({ language, size, className = "" }) => {
    const meta = languageMeta(language);

    return (
        <span
            className={`badge badge--neutral ${size === "lg" ? "badge--lg" : ""} ${className}`}
        >
            <span
                className="badge__dot"
                style={{ background: meta.color }}
                aria-hidden="true"
            />
            {meta.label}
        </span>
    );
};

/* ── Chip ──────────────────────────────────────────────────────────────── */

/**
 * An interactive filter token.
 * @param {boolean} active    controls the pressed state
 * @param {Function} onRemove renders a dismiss affordance when provided
 */
export const Chip = ({
    active = false,
    onClick,
    onRemove,
    icon: Icon,
    count,
    className = "",
    children,
    ...rest
}) => {
    // Without an onClick this is a static token, so it should not be a
    // button and should not be in the tab order.
    const Component = onClick ? "button" : "span";

    return (
        <Component
            type={onClick ? "button" : undefined}
            className={`chip ${className}`}
            aria-pressed={onClick ? active : undefined}
            onClick={onClick}
            {...rest}
        >
            {Icon && (
                <span aria-hidden="true" style={{ display: "grid" }}>
                    <Icon size={13} />
                </span>
            )}

            {children}

            {count !== undefined && (
                <span className="tnum" style={{ color: "var(--text-faint)" }}>
                    {count}
                </span>
            )}

            {onRemove && (
                <span
                    className="chip__x"
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${children} filter`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove();
                        }
                    }}
                >
                    <Icons.LuX size={12} />
                </span>
            )}
        </Component>
    );
};

/* ── Live indicator ────────────────────────────────────────────────────── */

/** A pulsing "live" marker — the pulse stops when `live` is false. */
export const LiveBadge = ({ live = true, children = "Live" }) => (
    <Badge tone={live ? "critical" : "neutral"} dot pulse={live}>
        {children}
    </Badge>
);

/**
 * Marks a surface whose data is illustrative rather than live, so nobody
 * mistakes a scheduled preview or a seeded thread for real activity.
 */
export const PreviewBadge = ({ label = "Preview data", title }) => (
    <Badge tone="neutral" icon={Icons.LuFlaskConical} title={title}>
        {label}
    </Badge>
);
