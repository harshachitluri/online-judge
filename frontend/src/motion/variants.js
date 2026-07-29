/*
 |--------------------------------------------------------------------------
 | Shared Motion Variants
 |--------------------------------------------------------------------------
 | One vocabulary for every animation in the app, so timing and easing stay
 | consistent. Only transform + opacity are animated (both GPU-composited);
 | nothing animates layout properties.
 |
 | Framer Motion honours `prefers-reduced-motion` when the MotionConfig in
 | App.js sets reducedMotion="user".
 */

export const EASE = [0.16, 1, 0.3, 1];

/** Page-level enter/exit, used by PageTransition. */
export const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE } }
};

/** Parent that reveals its children one after another. */
export const staggerContainer = (stagger = 0.06, delay = 0) => ({
    initial: {},
    animate: { transition: { staggerChildren: stagger, delayChildren: delay } }
});

/** Standard child reveal — pairs with staggerContainer. */
export const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }
};

export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.45, ease: EASE } }
};

export const scaleIn = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE } }
};

export const slideInLeft = {
    initial: { opacity: 0, x: -18 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } }
};

/** Reveal on scroll — attach with whileInView. */
export const revealOnScroll = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
    viewport: { once: true, amount: 0.25 }
};

/** Interactive lift for cards and tiles. */
export const hoverLift = {
    whileHover: { y: -4, transition: { duration: 0.2, ease: EASE } },
    whileTap: { scale: 0.99 }
};

/** Press feedback for buttons that are motion components. */
export const tapScale = {
    whileHover: { y: -2 },
    whileTap: { scale: 0.97 }
};
