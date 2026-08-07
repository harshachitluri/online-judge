import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LuInfo } from "react-icons/lu";

import { riseChild } from "../../lib/motion";

/*
 |==========================================================================
 | Card
 |==========================================================================
 | The container everything in the app sits in. Renders as a <div>, a
 | react-router <Link>, or a motion element, so an interactive card is a
 | real link (middle-clickable, keyboard-navigable) rather than a div with
 | an onClick.
 */

const Card = ({
    as,
    to,
    variant,            // "glass" | "sunk"
    size,               // "lg" | "flush"
    interactive = false,
    edge = false,
    animate = false,
    className = "",
    children,
    ...rest
}) => {
    const classes = [
        "card",
        variant && `card--${variant}`,
        size && `card--${size}`,
        interactive && "card--interactive",
        edge && "card--edge",
        className
    ]
        .filter(Boolean)
        .join(" ");

    if (to) {
        return (
            <Link to={to} className={classes} {...rest}>
                {children}
            </Link>
        );
    }

    if (animate) {
        const Component = motion[as || "div"];
        return (
            <Component className={classes} variants={riseChild} {...rest}>
                {children}
            </Component>
        );
    }

    const Component = as || "div";

    return (
        <Component className={classes} {...rest}>
            {children}
        </Component>
    );
};

export default Card;

/** The title / subtitle / action row at the top of a card. */
export const CardHeader = ({ title, subtitle, icon: Icon, action, className = "" }) => (
    <div className={`card__header ${className}`}>
        <div className="stack">
            <span className="card__title">
                {Icon && (
                    <span aria-hidden="true" style={{ display: "grid", color: "var(--text-muted)" }}>
                        <Icon size={15} />
                    </span>
                )}
                {title}
            </span>
            {subtitle && <span className="card__subtitle">{subtitle}</span>}
        </div>

        {action}
    </div>
);

/*
 | A stat tile. Deliberately *not* a chart: a single number with a label is
 | the right form for a headline magnitude, and wrapping it in a gauge just
 | to have a visual would be decoration.
 |
 | The optional delta always carries an arrow glyph and a sign as well as
 | its colour.
 */
export const StatTile = ({
    label,
    value,
    sub,
    hint,
    icon: Icon,
    accent = "var(--brand-violet)",
    delta,
    deltaLabel,
    className = ""
}) => {
    const positive = Number(delta) > 0;
    const negative = Number(delta) < 0;

    return (
        <motion.div className={`stat-tile ${className}`} variants={riseChild}>
            <div className="stat-tile__top">
                <span className="stat-tile__label">
                    {label}
                    {/* `hint` explains where a number comes from. A figure like
                        "10 more to Intermediate" is a goal only if the rule
                        behind it is discoverable; otherwise it reads as an
                        arbitrary number. tabIndex so it is reachable by
                        keyboard, not just hover. */}
                    {hint && (
                        <span className="stat-tile__hint" title={hint} tabIndex={0} role="note" aria-label={hint}>
                            <LuInfo size={11} aria-hidden="true" />
                        </span>
                    )}
                </span>
                {Icon && (
                    <span className="stat-tile__icon" style={{ color: accent }} aria-hidden="true">
                        <Icon size={15} />
                    </span>
                )}
            </div>

            <span className="stat-tile__value">{value}</span>

            <div className="stat-tile__foot">
                {delta !== undefined && delta !== null && (
                    <span
                        className="stat-tile__delta"
                        style={{
                            color: positive
                                ? "var(--status-good)"
                                : negative
                                    ? "var(--status-critical)"
                                    : "var(--text-muted)"
                        }}
                    >
                        {positive ? "▲" : negative ? "▼" : "—"}{" "}
                        {positive ? "+" : ""}
                        {delta}
                        {deltaLabel && <span className="text-muted"> {deltaLabel}</span>}
                    </span>
                )}
                {sub && <span className="stat-tile__sub">{sub}</span>}
            </div>
        </motion.div>
    );
};
