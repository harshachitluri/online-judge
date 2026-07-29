import React from "react";
import { motion } from "framer-motion";

import { pageVariants } from "../../lib/motion";

/*
 |==========================================================================
 | Layout primitives
 |==========================================================================
 */

/**
 * Wraps a routed page so AnimatePresence can run its exit animation.
 *
 * The key is the pathname, set by the router — without it, React reuses the
 | same element across navigations and no transition ever runs.
 */
export const PageTransition = ({ children, className = "" }) => (
    <motion.main
        id="main"
        className={`page ${className}`}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
    >
        {children}
    </motion.main>
);

/**
 * The header every application page opens with: eyebrow, title, description
 * and an actions slot.
 *
 * `eyebrow` carries the plain-English name of the module. The codename is
 * the identity; the eyebrow is what stops the branding from costing anyone
 * comprehension.
 */
export const PageHeader = ({
    eyebrow,
    title,
    description,
    actions,
    children,
    className = ""
}) => (
    <header className={`page-header ${className}`}>
        <div className="page-header__row">
            <div className="stack stack-2" style={{ minWidth: 0 }}>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                <h1 className="page-header__title">{title}</h1>
                {description && (
                    <p className="page-header__desc">{description}</p>
                )}
            </div>

            {actions && <div className="page-header__actions">{actions}</div>}
        </div>

        {children}
    </header>
);

/** A titled block within a page. */
export const Section = ({
    title,
    description,
    action,
    icon: Icon,
    children,
    className = "",
    ...rest
}) => (
    <section className={`section-block ${className}`} {...rest}>
        {(title || action) && (
            <div className="section-block__head">
                <div className="stack stack-1">
                    {title && (
                        <h2 className="section-block__title">
                            {Icon && (
                                <span aria-hidden="true" style={{ display: "grid", color: "var(--text-muted)" }}>
                                    <Icon size={16} />
                                </span>
                            )}
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className="section-block__desc">{description}</p>
                    )}
                </div>

                {action}
            </div>
        )}

        {children}
    </section>
);

/**
 * The ambient background used on the landing page and auth screens: a
 * static gradient mesh plus a slow-drifting orb.
 *
 * Both layers are `pointer-events: none` and purely decorative, and the orb
 * animation is a transform-only loop so it stays on the compositor.
 */
export const Aurora = ({ orbs = true, grid = false }) => (
    <div className="aurora" aria-hidden="true">
        <div className="aurora__mesh" />

        {grid && <div className="aurora__grid" />}

        {orbs && (
            <>
                <motion.span
                    className="aurora__orb aurora__orb--violet"
                    animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
                    transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                    className="aurora__orb aurora__orb--cyan"
                    animate={{ x: [0, -50, 25, 0], y: [0, 25, -25, 0] }}
                    transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
                />
            </>
        )}
    </div>
);
