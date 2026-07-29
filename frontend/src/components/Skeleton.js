import React from "react";

/**
 * Skeleton — shimmering placeholder shown while data loads.
 *
 * Preferred over a centred spinner for content that has a known shape:
 * the page keeps its layout, so nothing jumps once the data arrives.
 */
const Skeleton = ({ width = "100%", height = 16, radius = "var(--radius-sm)", style }) => (
    <div
        className="skeleton"
        style={{ width, height, borderRadius: radius, ...style }}
        aria-hidden="true"
    />
);

/** A block of stacked lines, e.g. a paragraph placeholder. */
export const SkeletonText = ({ lines = 3, gap = 10 }) => (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
        {Array.from({ length: lines }, (_, i) => (
            <Skeleton
                key={i}
                // Ragged last line reads as text rather than a solid block
                width={i === lines - 1 ? "60%" : "100%"}
                height={12}
            />
        ))}
    </div>
);

/** Placeholder rows for a table, matching its column count. */
export const SkeletonTable = ({ rows = 6, columns = 4 }) => (
    <div className="skeleton-table" aria-busy="true">
        {Array.from({ length: rows }, (_, r) => (
            <div className="skeleton-row" key={r}>
                {Array.from({ length: columns }, (_, c) => (
                    <Skeleton key={c} height={14} width={c === 0 ? "70%" : "45%"} />
                ))}
            </div>
        ))}
    </div>
);

/** Placeholder grid of cards. */
export const SkeletonCards = ({ count = 6, height = 150 }) => (
    <div className="skeleton-cards" aria-busy="true">
        {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} height={height} radius="var(--radius-lg)" />
        ))}
    </div>
);

export default Skeleton;
