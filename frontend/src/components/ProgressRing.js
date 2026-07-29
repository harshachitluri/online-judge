import React from "react";

/**
 * ProgressRing — circular completion indicator.
 *
 * Rendered as inline SVG so it stays crisp at any size and needs no
 * external chart dependency.
 *
 * @param {number} value      - completed count
 * @param {number} max        - total count
 * @param {number} [size]     - diameter in px
 * @param {number} [stroke]   - ring thickness in px
 * @param {string} [color]
 * @param {string} [caption]  - small text under the percentage
 */
const ProgressRing = ({
    value = 0,
    max = 0,
    size = 132,
    stroke = 10,
    color = "var(--accent-light)",
    caption = "solved"
}) => {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="progress-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size} role="img" aria-label={`${value} of ${max} solved`}>
                <circle
                    className="ring-track"
                    cx={size / 2} cy={size / 2} r={radius}
                    strokeWidth={stroke} fill="none"
                />
                <circle
                    className="ring-fill"
                    cx={size / 2} cy={size / 2} r={radius}
                    strokeWidth={stroke} fill="none"
                    stroke={color}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    // Start the arc at 12 o'clock instead of 3 o'clock
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>

            <div className="ring-center">
                <div className="ring-value">{value}</div>
                <div className="ring-caption">
                    of {max} {caption}
                </div>
            </div>
        </div>
    );
};

export default ProgressRing;
