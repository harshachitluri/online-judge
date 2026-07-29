import React from "react";

/**
 * ProgressBar — labelled completion bar.
 *
 * @param {string} label
 * @param {number} value    - completed count
 * @param {number} max      - total count
 * @param {string} [color]  - CSS colour for the fill (defaults to accent)
 * @param {string} [size]   - "sm" for the compact variant
 */
const ProgressBar = ({ label, value = 0, max = 0, color, size = "md", emptyLabel = "None yet" }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    const complete = max > 0 && value >= max;

    // A category with nothing in it can't show progress. Say so, instead of
    // rendering a dead "0 / 0" bar that reads like a stuck loading state.
    const isEmpty = max === 0;

    return (
        <div className={`progress-row ${size === "sm" ? "progress-row-sm" : ""} ${isEmpty ? "is-empty" : ""}`}>
            {label && (
                <div className="progress-head">
                    <span className="progress-label">
                        {label}
                        {complete && <span className="progress-done" aria-hidden="true">✓</span>}
                    </span>
                    <span className="progress-count">
                        {isEmpty ? (
                            <span className="progress-empty">{emptyLabel}</span>
                        ) : (
                            <>
                                <strong>{value}</strong>
                                <span className="progress-sep">/</span>
                                {max}
                            </>
                        )}
                    </span>
                </div>
            )}

            <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label ? `${label}: ${value} of ${max} solved` : undefined}
            >
                <div
                    className="progress-fill"
                    style={{
                        width: `${pct}%`,
                        // A hard 0% reads as "broken bar"; show a sliver instead.
                        minWidth: pct > 0 ? 6 : 0,
                        background: color || "var(--accent)"
                    }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
