import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import { fetchAnalytics, fetchProgress } from "../services/account";
import { useAsync } from "../hooks";
import {
    verdictMeta, difficultyMeta, languageMeta, deriveStreaks,
    VERDICT_ORDER, DIFFICULTY_ORDER
} from "../lib/domain";
import { number as fmtNumber, duration, relativeTime, dayKey } from "../lib/format";
import {
    Card, CardHeader, StatTile, Button, VerdictBadge,
    Segmented, EmptyState, ErrorState, Skeleton
} from "../components/ui";
import { PageHeader, Section } from "../components/shell/AppShell";
import {
    BarSeries, CompositionBar, TrendLine, ActivityHeatmap,
    RadialMeter, ProgressRow, ChartTable, seriesColor
} from "../components/charts";

/*
 |==========================================================================
 | Telemetry — analytics
 |==========================================================================
 | The deep version of what the Deck summarises. Every figure on this page
 | is computed from the user's own submission rows; nothing is modelled,
 | projected or smoothed.
 |
 | Each chart ships an accessible table alternative behind a toggle, which
 | is also the relief for the two series colours that sit below 3:1 on the
 | light surface.
 */

const RANGES = [
    { id: 14, label: "14 days" },
    { id: 30, label: "30 days" },
    { id: 90, label: "90 days" }
];

/** Wraps a chart with a chart/table view switch. */
const ChartCard = ({ title, subtitle, icon, children, table, loading }) => {
    const [view, setView] = useState("chart");

    return (
        <Card size="lg">
            <CardHeader
                title={title}
                subtitle={subtitle}
                icon={icon}
                action={
                    table && (
                        <Segmented
                            size="sm"
                            items={[
                                { id: "chart", label: "", icon: Icons.LuChartNoAxesColumn, title: "Chart view" },
                                { id: "table", label: "", icon: Icons.LuTable, title: "Table view" }
                            ]}
                            value={view}
                            onChange={setView}
                        />
                    )
                }
            />

            {loading ? (
                <Skeleton h={160} radius="var(--r-md)" />
            ) : view === "table" && table ? (
                table
            ) : (
                children
            )}
        </Card>
    );
};

const Telemetry = () => {
    const analytics = useAsync(fetchAnalytics, []);
    const progress = useAsync(fetchProgress, []);

    const [range, setRange] = useState(30);

    const loading = analytics.loading;
    const data = analytics.data;

    /* ── Derivations ───────────────────────────────────────────────────── */

    const streaks = useMemo(
        () => deriveStreaks(data?.activityData || []),
        [data]
    );

    /*
     | A continuous daily series for the chosen window. The API returns only
     | days that *had* activity, so gaps have to be filled with zeros —
     | otherwise the line chart connects last Tuesday straight to today and
     | implies activity that never happened.
     */
    const trend = useMemo(() => {
        const map = new Map((data?.activityData || []).map((a) => [a.date, a.count]));
        const out = [];

        for (let i = range - 1; i >= 0; i -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = dayKey(date);

            out.push({
                label: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
                value: map.get(key) || 0,
                key
            });
        }

        return out;
    }, [data, range]);

    const verdictRows = useMemo(() => {
        const rows = data?.verdictDistribution || [];

        return VERDICT_ORDER
            .map((verdict) => {
                const row = rows.find((r) => r.verdict === verdict);
                return row
                    ? { label: verdict, value: row.count, color: verdictMeta(verdict).color }
                    : null;
            })
            .filter(Boolean);
    }, [data]);

    const languageRows = useMemo(
        () =>
            (data?.languageDistribution || []).map((row, i) => ({
                label: languageMeta(row.language).label,
                value: row.count,
                color: languageMeta(row.language).color || seriesColor(i)
            })),
        [data]
    );

    const difficultyRows = useMemo(
        () =>
            DIFFICULTY_ORDER.map((level) => ({
                label: level,
                value: data?.difficultyBreakdown?.[level] || 0,
                color: difficultyMeta(level).color
            })),
        [data]
    );

    const accepted = useMemo(
        () => verdictRows.find((r) => r.label === "Accepted")?.value || 0,
        [verdictRows]
    );

    const acceptanceRate =
        data?.totalSubmissions > 0
            ? Math.round((accepted / data.totalSubmissions) * 100)
            : 0;

    /* Average runtime across accepted runs — the only cohort where runtime
       is meaningful. A TLE's runtime is just the limit. */
    const avgRuntime = useMemo(() => {
        const runs = (data?.recentSubmissions || []).filter(
            (s) => s.verdict === "Accepted" && s.executionTime > 0
        );
        if (!runs.length) return null;

        return runs.reduce((sum, s) => sum + s.executionTime, 0) / runs.length;
    }, [data]);

    const busiestDay = useMemo(() => {
        const rows = data?.activityData || [];
        if (!rows.length) return null;
        return rows.reduce((max, row) => (row.count > max.count ? row : max));
    }, [data]);

    /* ── Render ────────────────────────────────────────────────────────── */

    if (analytics.error) {
        return (
            <div className="shell">
                <ErrorState
                    title="Analytics didn't load"
                    body="Your analytics couldn't be fetched. Nothing is lost — this is a read of existing submission rows."
                    onRetry={analytics.reload}
                />
            </div>
        );
    }

    const hasData = (data?.totalSubmissions || 0) > 0;

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.telemetry.group}
                title={MODULE.telemetry.label}
                description="Everything the judge recorded about you, and nothing it didn't. No projections, no smoothing, no vanity metrics."
                actions={
                    <Button variant="secondary" to={MODULE.chronicle.path} icon={Icons.LuHistory}>
                        Submissions
                    </Button>
                }
            />

            {!loading && !hasData ? (
                <EmptyState
                    icon={Icons.LuActivity}
                    title="No analytics yet"
                    body="Analytics are derived from submissions. Solve one problem and this page fills in immediately."
                    action={<Button variant="primary" to={MODULE.vault.path}>Browse Problems</Button>}
                />
            ) : (
                <>
                    {/* ── Headline figures ──────────────────────────── */}

                    <div className="autogrid" style={{ "--min": "205px", marginBottom: "var(--sp-8)" }}>
                        <StatTile
                            label="Total submissions"
                            value={loading ? "—" : fmtNumber(data.totalSubmissions)}
                            icon={Icons.LuSend}
                            sub="Every attempt, all verdicts"
                            accent="var(--brand-violet)"
                        />
                        <StatTile
                            label="Acceptance rate"
                            value={loading ? "—" : `${acceptanceRate}%`}
                            icon={Icons.LuCrosshair}
                            sub={`${fmtNumber(accepted)} accepted`}
                            accent="var(--series-3)"
                        />
                        <StatTile
                            label="Current streak"
                            value={`${streaks.current} ${streaks.current === 1 ? "day" : "days"}`}
                            icon={Icons.LuFlame}
                            sub={`Best: ${streaks.longest} days`}
                            accent="var(--status-warning)"
                        />
                        <StatTile
                            label="Avg accepted runtime"
                            value={avgRuntime === null ? "—" : duration(avgRuntime)}
                            icon={Icons.LuTimer}
                            sub="Across recent accepts only"
                            accent="var(--series-1)"
                        />
                    </div>

                    {/* ── Trend ─────────────────────────────────────── */}

                    <Section
                        title="Submission cadence"
                        description="Submissions per day. Gaps are real zeros, not missing data."
                        icon={Icons.LuTrendingUp}
                        action={
                            <Segmented items={RANGES} value={range} onChange={setRange} />
                        }
                    >
                        <ChartCard
                            title={`Last ${range} days`}
                            subtitle={
                                busiestDay
                                    ? `Busiest day: ${busiestDay.count} submissions on ${busiestDay.date}`
                                    : undefined
                            }
                            icon={Icons.LuChartLine}
                            loading={loading}
                            table={
                                <ChartTable
                                    caption={`Submissions per day over the last ${range} days`}
                                    columns={["Date", "Submissions"]}
                                    rows={trend.map((d) => [d.label, fmtNumber(d.value)])}
                                />
                            }
                        >
                            <TrendLine
                                data={trend}
                                height={190}
                                color="var(--brand-violet)"
                                formatLabel={(d) => d.label}
                                formatValue={(v) =>
                                    `${fmtNumber(v)} submission${v === 1 ? "" : "s"}`
                                }
                            />
                        </ChartCard>
                    </Section>

                    {/* ── Distributions ─────────────────────────────── */}

                    <div className="autogrid" style={{ "--min": "340px", marginTop: "var(--sp-8)" }}>
                        <ChartCard
                            title="Verdict distribution"
                            subtitle="What the judge actually returned"
                            icon={Icons.LuScale}
                            loading={loading}
                            table={
                                <ChartTable
                                    caption="Submissions by verdict"
                                    columns={["Verdict", "Count"]}
                                    rows={verdictRows.map((r) => [r.label, fmtNumber(r.value)])}
                                />
                            }
                        >
                            {verdictRows.length ? (
                                <BarSeries data={verdictRows} showPercent />
                            ) : (
                                <p className="chart__empty">No verdicts recorded.</p>
                            )}
                        </ChartCard>

                        <ChartCard
                            title="Language mix"
                            subtitle="Submissions per language"
                            icon={Icons.LuLanguages}
                            loading={loading}
                            table={
                                <ChartTable
                                    caption="Submissions by language"
                                    columns={["Language", "Count"]}
                                    rows={languageRows.map((r) => [r.label, fmtNumber(r.value)])}
                                />
                            }
                        >
                            {languageRows.length ? (
                                <div className="stack stack-5">
                                    <CompositionBar data={languageRows} height={16} />
                                    <BarSeries data={languageRows} showPercent height={16} />
                                </div>
                            ) : (
                                <p className="chart__empty">Nothing submitted yet.</p>
                            )}
                        </ChartCard>

                        <ChartCard
                            title="Solved by difficulty"
                            subtitle="Unique problems against what exists"
                            icon={Icons.LuLayers}
                            loading={loading || progress.loading}
                            table={
                                <ChartTable
                                    caption="Solved problems by difficulty"
                                    columns={["Difficulty", "Solved", "Available"]}
                                    rows={(progress.data?.byDifficulty || []).map((r) => [
                                        r.difficulty,
                                        fmtNumber(r.solved),
                                        fmtNumber(r.total)
                                    ])}
                                />
                            }
                        >
                            <div className="stack stack-5">
                                <CompositionBar data={difficultyRows} height={16} />
                                <div className="stack stack-4">
                                    {(progress.data?.byDifficulty || []).map((row) => (
                                        <ProgressRow
                                            key={row.difficulty}
                                            label={row.difficulty}
                                            solved={row.solved}
                                            total={row.total}
                                            color={difficultyMeta(row.difficulty).color}
                                            sub={`${row.percentage}% of published ${row.difficulty} problems`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </ChartCard>
                    </div>

                    {/* ── Consistency ───────────────────────────────── */}

                    <Section
                        title="Consistency"
                        description="Ninety days of activity, and the streaks derived from it."
                        icon={Icons.LuCalendarDays}
                        style={{ marginTop: "var(--sp-8)" }}
                    >
                        <div className="telemetry__consistency">
                            <Card size="lg">
                                {loading ? (
                                    <Skeleton h={130} radius="var(--r-md)" />
                                ) : (
                                    <ActivityHeatmap data={data.activityData || []} weeks={20} />
                                )}
                            </Card>

                            <Card size="lg" className="telemetry__streaks">
                                <RadialMeter
                                    value={streaks.current}
                                    max={Math.max(streaks.longest, 1)}
                                    size={128}
                                    color="var(--status-warning)"
                                    label={String(streaks.current)}
                                    caption="Day streak"
                                />

                                <div className="stack stack-3" style={{ width: "100%" }}>
                                    <div className="telemetry__stat">
                                        <span>Longest streak</span>
                                        <strong className="tnum">{streaks.longest} days</strong>
                                    </div>
                                    <div className="telemetry__stat">
                                        <span>Active days (90d)</span>
                                        <strong className="tnum">{streaks.activeDays}</strong>
                                    </div>
                                    <div className="telemetry__stat">
                                        <span>Consistency</span>
                                        <strong className="tnum">
                                            {Math.round((streaks.activeDays / 90) * 100)}%
                                        </strong>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </Section>

                    {/* ── Recent ────────────────────────────────────── */}

                    <Section
                        title="Recent submissions"
                        description="The last twenty attempts, newest first."
                        icon={Icons.LuHistory}
                        style={{ marginTop: "var(--sp-8)" }}
                        action={
                            <Button variant="ghost" size="sm" to={MODULE.chronicle.path} trailingIcon={Icons.LuArrowRight}>
                                All submissions
                            </Button>
                        }
                    >
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th scope="col">Problem</th>
                                        <th scope="col">Verdict</th>
                                        <th scope="col">Language</th>
                                        <th scope="col" className="table__num">Runtime</th>
                                        <th scope="col">When</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data?.recentSubmissions || []).map((s) => (
                                        <tr key={s._id}>
                                            <td>
                                                {s.problemId?.slug ? (
                                                    <Link
                                                        to={forgePath(s.problemId.slug)}
                                                        style={{ fontWeight: "var(--fw-medium)" }}
                                                    >
                                                        {s.problemId.title}
                                                    </Link>
                                                ) : (
                                                    <span className="text-faint">Deleted problem</span>
                                                )}
                                            </td>
                                            <td><VerdictBadge verdict={s.verdict} /></td>
                                            <td>
                                                <span className="text-secondary" style={{ fontSize: "var(--fs-xs)" }}>
                                                    {languageMeta(s.language).label}
                                                </span>
                                            </td>
                                            <td className="table__num tnum">{duration(s.executionTime)}</td>
                                            <td className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                                {relativeTime(s.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
};

export default Telemetry;
