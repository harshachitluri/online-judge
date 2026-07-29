import React, { useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";

import { number as fmtNumber, percent as fmtPercent } from "../../lib/format";

/*
 |==========================================================================
 | Charts
 |==========================================================================
 | Hand-built SVG rather than a charting library: the whole surface is a
 | dozen marks, and a library would drag in its own colour system, its own
 | tooltip and its own idea of what a legend looks like — all of which would
 | then have to be fought back into this design system.
 |
 | Rules these all obey:
 |   · Categorical hues come from --series-N in fixed slot order, never
 |     cycled and never assigned by rank, so filtering a series out doesn't
 |     repaint the survivors.
 |   · A legend is present whenever there are two or more series; a single
 |     series is named by the title instead.
 |   · Four or fewer series are also direct-labelled, so identity is never
 |     carried by colour alone.
 |   · Every plot has a hover layer. Grid and axes stay recessive.
 |   · One value axis. Never two.
 */

export const SERIES = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
    "var(--series-5)",
    "var(--series-6)"
];

/** Slot colour for index `i`; anything past the palette folds into "Other". */
export const seriesColor = (i) => SERIES[i] ?? "var(--series-other)";

/* ── Tooltip ───────────────────────────────────────────────────────────── */

/*
 | Positioned with `position: fixed` against the pointer, and flipped when it
 | would run off the right or bottom edge. Rendered inline rather than in a
 | portal because the charts are never inside a clipping container.
 */
const Tooltip = ({ x, y, children }) => {
    const ref = useRef(null);

    // Measured after paint so the flip uses the real width, not an estimate.
    const [flip, setFlip] = useState({ x: false, y: false });

    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        setFlip({
            x: x + rect.width + 20 > window.innerWidth,
            y: y + rect.height + 20 > window.innerHeight
        });
    }, [x, y, children]);

    return (
        <div
            ref={ref}
            className="tooltip"
            style={{
                left: flip.x ? x - 14 : x + 14,
                top: flip.y ? y - 14 : y + 14,
                transform: `translate(${flip.x ? "-100%" : "0"}, ${flip.y ? "-100%" : "0"})`
            }}
            role="tooltip"
        >
            {children}
        </div>
    );
};

/** Wires pointer tracking + tooltip state into any chart. */
const useHover = () => {
    const [hover, setHover] = useState(null);

    const bind = useCallback(
        (payload) => ({
            onPointerEnter: (e) => setHover({ payload, x: e.clientX, y: e.clientY }),
            onPointerMove: (e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h)),
            onPointerLeave: () => setHover(null)
        }),
        []
    );

    return { hover, bind, clear: () => setHover(null) };
};

/* ── Legend ────────────────────────────────────────────────────────────── */

export const Legend = ({ items = [], className = "" }) => (
    <ul className={`legend ${className}`}>
        {items.map((item) => (
            <li key={item.label} className="legend__item">
                <span
                    className="legend__swatch"
                    style={{ background: item.color }}
                    aria-hidden="true"
                />
                <span className="legend__label">{item.label}</span>
                {item.value !== undefined && (
                    <span className="legend__value tnum">{item.value}</span>
                )}
            </li>
        ))}
    </ul>
);

/*
 |--------------------------------------------------------------------------
 | BarSeries — magnitude across named categories
 |--------------------------------------------------------------------------
 | Horizontal, because category names are words and horizontal bars give
 | them room to be read without rotating the axis labels.
 |
 | Every bar is directly labelled with its value, so this needs no legend:
 | the row label *is* the identity.
 */
export const BarSeries = ({
    data = [],              // [{ label, value, color? }]
    max,                    // override the scale ceiling
    formatValue = fmtNumber,
    showPercent = false,
    height = 22,
    emptyLabel = "No data yet"
}) => {
    const { hover, bind } = useHover();

    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    const ceiling = max ?? Math.max(...data.map((d) => d.value || 0), 1);

    if (!data.length) {
        return <p className="chart__empty">{emptyLabel}</p>;
    }

    return (
        <div className="bars">
            {data.map((d, i) => {
                const pct = ceiling > 0 ? (d.value / ceiling) * 100 : 0;

                return (
                    <div key={d.label} className="bars__row" {...bind(d)}>
                        <span className="bars__label truncate" title={d.label}>
                            {d.label}
                        </span>

                        <span className="bars__track" style={{ height }}>
                            <motion.span
                                className="bars__fill"
                                style={{ background: d.color || seriesColor(i) }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </span>

                        <span className="bars__value tnum">
                            {formatValue(d.value)}
                            {showPercent && total > 0 && (
                                <span className="text-faint"> · {fmtPercent(d.value, total)}</span>
                            )}
                        </span>
                    </div>
                );
            })}

            {hover && (
                <Tooltip x={hover.x} y={hover.y}>
                    <div className="tooltip__label">{hover.payload.label}</div>
                    <div className="tooltip__value">
                        {formatValue(hover.payload.value)}
                        {total > 0 && ` · ${fmtPercent(hover.payload.value, total)} of ${fmtNumber(total)}`}
                    </div>
                </Tooltip>
            )}
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | CompositionBar — one stacked bar, part-to-whole
 |--------------------------------------------------------------------------
 | The right form when the question is "what is this made of" and there are
 | four or fewer parts. A 2px surface-coloured gap separates the segments so
 | adjacent hues never touch — that gap is what keeps two similar colours
 | legible to a colour-blind reader.
 */
export const CompositionBar = ({
    data = [],              // [{ label, value, color? }]
    height = 14,
    showLegend = true,
    formatValue = fmtNumber
}) => {
    const { hover, bind } = useHover();

    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    const parts = data.filter((d) => d.value > 0);

    if (!total) {
        return <p className="chart__empty">Nothing recorded yet</p>;
    }

    return (
        <div className="stack stack-3">
            <div className="composition" style={{ height }}>
                {parts.map((d, i) => (
                    <motion.span
                        key={d.label}
                        className="composition__seg"
                        style={{ background: d.color || seriesColor(i) }}
                        initial={{ flexGrow: 0 }}
                        animate={{ flexGrow: d.value }}
                        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                        {...bind(d)}
                    />
                ))}
            </div>

            {showLegend && (
                <Legend
                    items={parts.map((d, i) => ({
                        label: d.label,
                        color: d.color || seriesColor(i),
                        value: `${formatValue(d.value)} · ${fmtPercent(d.value, total)}`
                    }))}
                />
            )}

            {hover && (
                <Tooltip x={hover.x} y={hover.y}>
                    <div className="tooltip__label">{hover.payload.label}</div>
                    <div className="tooltip__value">
                        {formatValue(hover.payload.value)} · {fmtPercent(hover.payload.value, total)}
                    </div>
                </Tooltip>
            )}
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | TrendLine — a measure over time
 |--------------------------------------------------------------------------
 | A single 2px line with an area wash beneath it, a recessive baseline, and
 | a crosshair that snaps to the nearest point. One series, so the card title
 | names it and no legend is drawn.
 */
const TREND_PAD = { top: 10, right: 6, bottom: 18, left: 6 };

export const TrendLine = ({
    data = [],              // [{ label, value }]
    height = 160,
    color = "var(--brand-violet)",
    formatValue = fmtNumber,
    formatLabel = (d) => d.label
}) => {
    const [index, setIndex] = useState(null);
    const [pointer, setPointer] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    const W = 600;
    const H = height;

    const geometry = useMemo(() => {
        if (data.length < 2) return null;

        const max = Math.max(...data.map((d) => d.value), 1);
        const innerW = W - TREND_PAD.left - TREND_PAD.right;
        const innerH = H - TREND_PAD.top - TREND_PAD.bottom;

        const points = data.map((d, i) => ({
            ...d,
            x: TREND_PAD.left + (i / (data.length - 1)) * innerW,
            y: TREND_PAD.top + innerH - (d.value / max) * innerH
        }));

        // A monotone-ish cubic: control points sit halfway between
        // neighbours horizontally, which avoids the overshoot a naive
        // Catmull-Rom produces on spiky data.
        const line = points.reduce((path, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cx = (prev.x + p.x) / 2;
            return `${path} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
        }, "");

        const area = `${line} L ${points[points.length - 1].x} ${H - TREND_PAD.bottom} L ${points[0].x} ${H - TREND_PAD.bottom} Z`;

        return { points, line, area, max, baseline: H - TREND_PAD.bottom };
    }, [data, H]);

    const onMove = (event) => {
        if (!geometry || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const nearest = Math.round(ratio * (data.length - 1));

        setIndex(Math.max(0, Math.min(data.length - 1, nearest)));
        setPointer({ x: event.clientX, y: event.clientY });
    };

    if (!geometry) {
        return <p className="chart__empty">Not enough history to plot a trend yet</p>;
    }

    const active = index !== null ? geometry.points[index] : null;
    const gradientId = `trend-fill-${color.replace(/[^a-z0-9]/gi, "")}`;

    return (
        <div className="chart">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="chart__svg"
                style={{ height }}
                onPointerMove={onMove}
                onPointerLeave={() => setIndex(null)}
                role="img"
                aria-label={`Trend over ${data.length} points, peaking at ${geometry.max}`}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Baseline — recessive, and the only rule on the plot. */}
                <line
                    x1={TREND_PAD.left}
                    x2={W - TREND_PAD.right}
                    y1={geometry.baseline}
                    y2={geometry.baseline}
                    stroke="var(--gridline)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />

                <motion.path
                    d={geometry.area}
                    fill={`url(#${gradientId})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                />

                <motion.path
                    d={geometry.line}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />

                {active && (
                    <g>
                        <line
                            x1={active.x}
                            x2={active.x}
                            y1={TREND_PAD.top}
                            y2={geometry.baseline}
                            stroke="var(--border-strong)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            vectorEffect="non-scaling-stroke"
                        />
                        {/* A surface-coloured ring keeps the marker legible
                            wherever it lands on the area fill. */}
                        <circle
                            cx={active.x}
                            cy={active.y}
                            r="5"
                            fill={color}
                            stroke="var(--surface-1)"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                )}
            </svg>

            {active && (
                <Tooltip x={pointer.x} y={pointer.y}>
                    <div className="tooltip__label">{formatLabel(active)}</div>
                    <div className="tooltip__value">{formatValue(active.value)}</div>
                </Tooltip>
            )}
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | Sparkline — a trend with no axis, for inline use
 |--------------------------------------------------------------------------
 */
export const Sparkline = ({ data = [], width = 90, height = 26, color = "var(--brand-violet)" }) => {
    if (data.length < 2) return <span className="text-faint">—</span>;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data
        .map((v, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((v - min) / range) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg width={width} height={height} aria-hidden="true" style={{ display: "block" }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/*
 |--------------------------------------------------------------------------
 | ActivityHeatmap — a calendar of daily counts
 |--------------------------------------------------------------------------
 | Sequential encoding: one hue, five ordinal steps, validated so the
 | lightest step still clears the surface. Empty days get a neutral wash
 | rather than the lightest ramp step, so "nothing happened" is visibly
 | different from "a little happened".
 */
const RAMP = ["var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)", "var(--ramp-5)"];

export const ActivityHeatmap = ({ data = [], weeks = 20, onSelect }) => {
    const { hover, bind } = useHover();

    const { cells, max, byDay } = useMemo(() => {
        const map = new Map(data.map((d) => [d.date, d.count]));
        const peak = Math.max(...data.map((d) => d.count), 1);

        const out = [];
        const today = new Date();

        // Land the grid on a Sunday so the weekday rows line up.
        const end = new Date(today);
        end.setDate(end.getDate() + (6 - end.getDay()));

        const totalDays = weeks * 7;

        for (let i = totalDays - 1; i >= 0; i -= 1) {
            const date = new Date(end);
            date.setDate(date.getDate() - i);

            const pad = (n) => String(n).padStart(2, "0");
            const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

            out.push({
                key,
                date,
                count: map.get(key) || 0,
                future: date > today
            });
        }

        return { cells: out, max: peak, byDay: map };
    }, [data, weeks]);

    /* Five ordinal buckets. Quantile-free: a linear split on the peak keeps
       the ramp meaning stable as the peak grows. */
    const stepFor = (count) => {
        if (count <= 0) return "var(--ramp-0)";
        const step = Math.ceil((count / max) * RAMP.length);
        return RAMP[Math.min(RAMP.length, Math.max(1, step)) - 1];
    };

    const monthLabels = useMemo(() => {
        const labels = [];
        let lastMonth = null;

        for (let w = 0; w < weeks; w += 1) {
            const cell = cells[w * 7];
            if (!cell) continue;

            const month = cell.date.getMonth();
            if (month !== lastMonth) {
                labels.push({
                    week: w,
                    label: cell.date.toLocaleDateString(undefined, { month: "short" })
                });
                lastMonth = month;
            }
        }

        return labels;
    }, [cells, weeks]);

    return (
        <div className="stack stack-3">
            <div className="heatmap scroll-x">
                <div className="heatmap__inner">
                    <div className="heatmap__months">
                        {monthLabels.map((m) => (
                            <span
                                key={`${m.week}-${m.label}`}
                                className="heatmap__month"
                                style={{ gridColumn: m.week + 1 }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    <div className="heatmap__grid">
                        {cells.map((cell) => (
                            <button
                                key={cell.key}
                                type="button"
                                className="heatmap__cell"
                                style={{
                                    background: cell.future ? "transparent" : stepFor(cell.count),
                                    visibility: cell.future ? "hidden" : "visible"
                                }}
                                aria-label={`${cell.count} submissions on ${cell.date.toDateString()}`}
                                onClick={() => onSelect?.(cell)}
                                {...bind(cell)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="row row-between" style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
                <span>{byDay.size} active days</span>

                <span className="row" style={{ gap: "var(--sp-1)" }}>
                    Less
                    <span className="heatmap__key" style={{ background: "var(--ramp-0)" }} />
                    {RAMP.map((c) => (
                        <span key={c} className="heatmap__key" style={{ background: c }} />
                    ))}
                    More
                </span>
            </div>

            {hover && !hover.payload.future && (
                <Tooltip x={hover.x} y={hover.y}>
                    <div className="tooltip__label">
                        {hover.payload.date.toLocaleDateString(undefined, {
                            weekday: "short", day: "numeric", month: "short"
                        })}
                    </div>
                    <div className="tooltip__value">
                        {hover.payload.count === 0
                            ? "No submissions"
                            : `${hover.payload.count} submission${hover.payload.count === 1 ? "" : "s"}`}
                    </div>
                </Tooltip>
            )}
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | RadialMeter — one ratio, as a hero figure
 |--------------------------------------------------------------------------
 | The number is the point; the arc is its frame. The centre label is always
 | rendered, so this degrades to a legible stat if the arc doesn't paint.
 */
export const RadialMeter = ({
    value = 0,
    max = 100,
    size = 130,
    thickness = 9,
    color = "var(--brand-violet)",
    label,
    caption
}) => {
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

    return (
        <div className="meter" style={{ width: size, height: size }}>
            <svg width={size} height={size} aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--surface-3)"
                    strokeWidth={thickness}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    // Rotated so the arc starts at twelve o'clock rather than
                    // three, which is where people expect a gauge to begin.
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - ratio) }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
            </svg>

            <div className="meter__center">
                <span className="meter__value">{label ?? `${Math.round(ratio * 100)}%`}</span>
                {caption && <span className="meter__caption">{caption}</span>}
            </div>
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | ProgressRow — a labelled solved/total bar
 |--------------------------------------------------------------------------
 | Used for difficulty and topic progress. Difficulty borrows the status
 | palette, so the label text always sits beside the colour.
 */
export const ProgressRow = ({ label, solved = 0, total = 0, color, sub }) => {
    const pct = total > 0 ? (solved / total) * 100 : 0;

    return (
        <div className="progress-row">
            <div className="progress-row__head">
                <span className="progress-row__label">
                    {color && (
                        <span
                            className="progress-row__dot"
                            style={{ background: color }}
                            aria-hidden="true"
                        />
                    )}
                    {label}
                </span>
                <span className="progress-row__value tnum">
                    {fmtNumber(solved)}
                    <span className="text-faint"> / {fmtNumber(total)}</span>
                </span>
            </div>

            <div className="progress progress--thin">
                <motion.span
                    className="progress__fill"
                    style={color ? { background: color } : undefined}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                />
            </div>

            {sub && <span className="progress-row__sub">{sub}</span>}
        </div>
    );
};

/*
 |--------------------------------------------------------------------------
 | DataTable — the accessible fallback every chart owes its reader
 |--------------------------------------------------------------------------
 */
export const ChartTable = ({ columns = [], rows = [], caption }) => (
    <div className="scroll-x">
        <table className="table" style={{ minWidth: 0 }}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th key={c} scope="col">{c}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>
                        {row.map((cell, j) => (
                            <td key={j} className={j > 0 ? "table__num" : undefined}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
