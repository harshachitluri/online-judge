import React from "react";
import { motion } from "framer-motion";
import { LuInbox, LuTriangleAlert, LuRotateCw } from "react-icons/lu";

import Button from "./Button";
import { staggerParent, riseChild } from "../../lib/motion";

/*
 |==========================================================================
 | Loading, empty and error states
 |==========================================================================
 | Every async surface in the app is required to handle all three. A page
 | that only handles the happy path is the fastest way to make a polished
 | product feel broken.
 */

/* ── Skeleton ──────────────────────────────────────────────────────────── */

export const Skeleton = ({ w = "100%", h = 12, radius, className = "", style }) => (
    <span
        className={`skeleton ${className}`}
        style={{
            display: "block",
            width: w,
            height: h,
            borderRadius: radius,
            ...style
        }}
        aria-hidden="true"
    />
);

export const SkeletonText = ({ lines = 3, lastWidth = "62%" }) => (
    <span className="stack stack-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                h={11}
                w={i === lines - 1 ? lastWidth : "100%"}
                radius="var(--r-full)"
            />
        ))}
    </span>
);

/**
 * A skeleton shaped like the card it stands in for. Matching the real
 * layout is the whole point — a generic grey box just moves the layout
 * shift from load time to render time.
 */
export const SkeletonCard = ({ lines = 2, showMeta = true }) => (
    <div className="card stack stack-3" aria-hidden="true">
        <div className="row" style={{ gap: "var(--sp-3)" }}>
            <Skeleton w={38} h={38} radius="var(--r-md)" />
            <span className="stack stack-2" style={{ flex: 1 }}>
                <Skeleton h={13} w="58%" radius="var(--r-full)" />
                <Skeleton h={10} w="34%" radius="var(--r-full)" />
            </span>
        </div>

        <SkeletonText lines={lines} />

        {showMeta && (
            <div className="row" style={{ gap: "var(--sp-2)" }}>
                <Skeleton w={62} h={20} radius="var(--r-full)" />
                <Skeleton w={48} h={20} radius="var(--r-full)" />
            </div>
        )}
    </div>
);

export const SkeletonGrid = ({ count = 6, min = 280, ...cardProps }) => (
    <div className="autogrid" style={{ "--min": `${min}px` }}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} {...cardProps} />
        ))}
    </div>
);

export const SkeletonRows = ({ rows = 6, cols = 5 }) => (
    <div className="table-wrap" aria-hidden="true">
        <div className="stack" style={{ padding: "var(--sp-4)", gap: "var(--sp-4)" }}>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="row" style={{ gap: "var(--sp-4)" }}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton
                            key={c}
                            h={12}
                            w={c === 0 ? "28%" : `${Math.round(72 / (cols - 1))}%`}
                            radius="var(--r-full)"
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

/* ── Spinner ───────────────────────────────────────────────────────────── */

export const Spinner = ({ size = 16, className = "" }) => (
    <span
        className={`spinner ${className}`}
        style={{ width: size, height: size }}
        role="status"
        aria-label="Loading"
    />
);

/**
 * The full-route fallback for lazily-loaded pages. Deliberately quiet —
 * a big animated splash between every navigation makes the app feel slower
 * than it is.
 */
export const RouteFallback = ({ label = "Loading" }) => (
    <div
        className="stack stack-4"
        style={{
            minHeight: "60vh",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)"
        }}
        role="status"
        aria-live="polite"
    >
        <motion.span
            initial={{ opacity: 0 }}
            // Delayed so a fast chunk load shows nothing at all rather than
            // a flash of spinner.
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="stack stack-3"
            style={{ alignItems: "center" }}
        >
            <Spinner size={22} />
            <span style={{ fontSize: "var(--fs-xs)" }}>{label}</span>
        </motion.span>
    </div>
);

/* ── Empty ─────────────────────────────────────────────────────────────── */

export const EmptyState = ({
    icon: Icon = LuInbox,
    title = "Nothing here yet",
    body,
    action,
    className = ""
}) => (
    <motion.div
        className={`empty ${className}`}
        variants={staggerParent(0.06)}
        initial="initial"
        animate="animate"
    >
        <motion.span className="empty__icon" variants={riseChild} aria-hidden="true">
            <Icon />
        </motion.span>
        <motion.h3 className="empty__title" variants={riseChild}>
            {title}
        </motion.h3>
        {body && (
            <motion.p className="empty__body" variants={riseChild}>
                {body}
            </motion.p>
        )}
        {action && <motion.div variants={riseChild}>{action}</motion.div>}
    </motion.div>
);

/* ── Error ─────────────────────────────────────────────────────────────── */

/**
 * The recoverable-failure state. Always offers a retry: a dead end with no
 * way forward is the worst possible outcome of a transient network blip.
 */
export const ErrorState = ({
    title = "That didn't load",
    body = "Something went wrong on the way here.",
    onRetry,
    className = ""
}) => (
    <div className={`empty ${className}`} role="alert">
        <span
            className="empty__icon"
            style={{ color: "var(--status-critical)", borderColor: "rgba(208,59,59,.34)" }}
            aria-hidden="true"
        >
            <LuTriangleAlert />
        </span>
        <h3 className="empty__title">{title}</h3>
        <p className="empty__body">{body}</p>
        {onRetry && (
            <Button variant="secondary" icon={LuRotateCw} onClick={onRetry}>
                Try again
            </Button>
        )}
    </div>
);
