import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { BRAND } from "../../config/brand";

/*
 |==========================================================================
 | Wordmark
 |==========================================================================
 | The mark is an isometric "A" drawn as three strokes — a stylised call
 | stack. Pure SVG so it stays crisp at any size and inherits the theme
 | without a second asset for dark mode.
 */

export const Mark = ({ size = 26, animated = false }) => {
    const Wrapper = animated ? motion.svg : "svg";

    return (
        <Wrapper
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            {...(animated
                ? {
                      initial: { rotate: -8, opacity: 0, scale: 0.9 },
                      animate: { rotate: 0, opacity: 1, scale: 1 },
                      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
                  }
                : {})}
        >
            <defs>
                <linearGradient id="axiom-mark" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#7f6bf0" />
                    <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
            </defs>

            {/* Outer apex */}
            <path
                d="M16 3.2 L28.6 26.4 H22.2 L16 13.6 L9.8 26.4 H3.4 Z"
                fill="url(#axiom-mark)"
            />
            {/* Inner crossbar — the "frame" of the A, held at 62% opacity so
                the gradient still reads through it. */}
            <path
                d="M11.6 20.6 H20.4 L22.6 25 H9.4 Z"
                fill="url(#axiom-mark)"
                opacity="0.62"
            />
        </Wrapper>
    );
};

const Logo = ({ to = "/", size = 26, showWord = true, className = "" }) => (
    <Link to={to} className={`logo ${className}`} aria-label={`${BRAND.name} home`}>
        <Mark size={size} />
        {showWord && <span className="logo__word">{BRAND.wordmark}</span>}
    </Link>
);

export default Logo;
