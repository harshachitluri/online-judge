/*
 |==========================================================================
 | Motion vocabulary
 |==========================================================================
 | Framer Motion variants shared across the app. Defining them once keeps
 | timing consistent, and means "make the app feel calmer" is a change to
 | one file rather than forty components.
 |
 | The app wraps everything in <MotionConfig reducedMotion="user">, so every
 | variant here is automatically neutralised for anyone who has asked their
 | OS for reduced motion. Nothing below needs its own media query.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_SPRING = [0.34, 1.56, 0.64, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];

/* ── Page transitions ──────────────────────────────────────────────────── */

/*
 | A page transition has to be *fast*. Anything above ~300ms in and out and
 | navigation starts to feel like it's fighting the user. The exit is
 | deliberately shorter than the entrance so back-to-back clicks stay snappy.
 */
/*
 | Deliberately no `filter: blur()` here. Framer leaves the settled value on
 | the element as `blur(0px)`, and a non-none filter makes the page both a
 | stacking context and a *backdrop root* — which is what pushed the account
 | dropdown's glass panel behind the page content instead of over it. The
 | transition reads the same without it, and costs far less to composite.
 */
export const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.34, ease: EASE_OUT }
    },
    exit: {
        opacity: 0,
        y: -8,
        transition: { duration: 0.18, ease: EASE_IN_OUT }
    }
};

/* ── Staggered lists ───────────────────────────────────────────────────── */

/**
 * @param {number} stagger  seconds between children
 * @param {number} delay    seconds before the first child
 */
export const staggerParent = (stagger = 0.045, delay = 0) => ({
    initial: {},
    animate: {
        transition: { staggerChildren: stagger, delayChildren: delay }
    }
});

export const riseChild = {
    initial: { opacity: 0, y: 16 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: EASE_OUT }
    }
};

export const fadeChild = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } }
};

export const scaleChild = {
    initial: { opacity: 0, scale: 0.94 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.42, ease: EASE_OUT }
    }
};

/* ── Scroll reveal ─────────────────────────────────────────────────────── */

/*
 | `once: true` matters: re-animating a section every time it re-enters the
 | viewport is the single most common way a "premium" landing page starts
 | feeling cheap. The margin fires the animation slightly before the element
 | is fully on screen so it's already settled when the user looks at it.
 */
export const revealProps = {
    initial: "initial",
    whileInView: "animate",
    viewport: { once: true, margin: "-12% 0px -8% 0px" }
};

/* ── Overlays ──────────────────────────────────────────────────────────── */

export const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const modalVariants = {
    initial: { opacity: 0, scale: 0.96, y: 12 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.26, ease: EASE_OUT }
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        y: 8,
        transition: { duration: 0.16, ease: EASE_IN_OUT }
    }
};

export const popVariants = {
    initial: { opacity: 0, scale: 0.95, y: -6 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.18, ease: EASE_OUT }
    },
    exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }
};

export const toastVariants = {
    initial: { opacity: 0, x: 40, scale: 0.96 },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.32, ease: EASE_SPRING }
    },
    exit: {
        opacity: 0,
        x: 24,
        scale: 0.96,
        transition: { duration: 0.18, ease: EASE_IN_OUT }
    }
};

/* ── Micro-interactions ────────────────────────────────────────────────── */

/** Standard press feedback for anything clickable that isn't a .btn. */
export const tapScale = { scale: 0.975 };
export const hoverLift = { y: -3 };

/** A spring configured to settle without a visible bounce. */
export const softSpring = { type: "spring", stiffness: 320, damping: 34, mass: 0.8 };

/** A springier one, for toggles and thumbs where the bounce is the point. */
export const bouncySpring = { type: "spring", stiffness: 460, damping: 22 };
