import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath, tierFor } from "../config/brand";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks";
import { fetchAnalytics, fetchProgress } from "../services/account";
import { fetchProblems } from "../services/judge";
import {
    deriveStreaks, evaluateBadges, verdictMeta, difficultyMeta,
    DIFFICULTY_ORDER, languageMeta, VERDICT_ORDER
} from "../lib/domain";
import { number as fmtNumber, relativeTime, duration } from "../lib/format";
import {
    Card, CardHeader, StatTile, Button, Badge, VerdictBadge,
    DifficultyBadge, SkeletonGrid, ErrorState, EmptyState, ProgressBar
} from "../components/ui";
import { PageHeader, Section } from "../components/shell/AppShell";
import {
    BarSeries, CompositionBar, ActivityHeatmap, RadialMeter, ProgressRow, seriesColor
} from "../components/charts";
import { staggerParent } from "../lib/motion";

/*
 |==========================================================================
 | Command Deck — the dashboard
 |==========================================================================
 | Answers four questions, in this order:
 |   1. Where do I stand?      (tier, solved, streak)
 |   2. What did I just do?    (recent verdicts)
 |   3. Where am I weak?       (difficulty and verdict distribution)
 |   4. What should I do next? (a concrete recommendation)
 |
 | Question 4 is the one that makes this a dashboard rather than a report,
 | so the recommendation is derived, not random: it picks the difficulty
 | with the lowest completion and surfaces an unsolved problem from it.
 */

const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Still up";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

const Deck = () => {
    const { user, stats } = useAuth();

    const analytics = useAsync(fetchAnalytics, []);
    const progress = useAsync(fetchProgress, []);

    /*
     | The recommendation needs a pool of problems to pick from. Fetching
     | the newest 40 is enough for the derivation below and costs one
     | request rather than one per difficulty.
     */
    const catalogue = useAsync(() => fetchProblems({ limit: 40, sort: "-createdAt" }), []);

    const loading = analytics.loading || progress.loading;

    /* ── Derivations ───────────────────────────────────────────────────── */

    const streaks = useMemo(
        () => deriveStreaks(analytics.data?.activityData || []),
        [analytics.data]
    );

    const languagesUsed = analytics.data?.languageDistribution?.length || 0;

    const tier = tierFor(stats?.problemsSolved || 0);

    const badges = useMemo(
        () =>
            evaluateBadges({
                ...(stats || {}),
                languagesUsed,
                currentStreak: streaks.current,
                longestStreak: streaks.longest
            }),
        [stats, languagesUsed, streaks]
    );

    const unlockedBadges = badges.filter((b) => b.unlocked);

    /*
     | "Focus next": the difficulty tier where the gap between solved and
     | available is widest *relative to its size*, so a user with 2/3 Hard
     | isn't told to grind Hard while 4/60 Easy sits untouched.
     */
    const focus = useMemo(() => {
        const rows = progress.data?.byDifficulty || [];
        if (!rows.length) return null;

        const candidates = rows.filter((r) => r.total > r.solved);
        if (!candidates.length) return null;

        return candidates.reduce((worst, row) =>
            row.percentage < worst.percentage ? row : worst
        );
    }, [progress.data]);

    /*
     | A concrete next problem: unsolved, in the focus difficulty, preferring
     | the one most people have attempted (a proxy for "well-trodden").
     */
    const recommendation = useMemo(() => {
        const problems = catalogue.data?.problems || [];
        if (!problems.length) return null;

        const solvedTitles = new Set(
            (analytics.data?.recentSubmissions || [])
                .filter((s) => s.verdict === "Accepted")
                .map((s) => s.problemId?._id)
                .filter(Boolean)
        );

        const pool = problems
            .filter((p) => !solvedTitles.has(p._id))
            .filter((p) => !focus || p.difficulty === focus.difficulty);

        const chosen = (pool.length ? pool : problems).slice().sort(
            (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0)
        );

        return chosen[0] || null;
    }, [catalogue.data, analytics.data, focus]);

    const verdictData = useMemo(() => {
        const rows = analytics.data?.verdictDistribution || [];

        // Fixed order, so the colour of "Wrong Answer" doesn't change when
        // a new verdict type appears above it.
        return VERDICT_ORDER
            .map((verdict) => {
                const row = rows.find((r) => r.verdict === verdict);
                return row
                    ? { label: verdict, value: row.count, color: verdictMeta(verdict).color }
                    : null;
            })
            .filter(Boolean);
    }, [analytics.data]);

    const languageData = useMemo(
        () =>
            (analytics.data?.languageDistribution || []).map((row, i) => ({
                label: languageMeta(row.language).label,
                value: row.count,
                color: languageMeta(row.language).color || seriesColor(i)
            })),
        [analytics.data]
    );

    const difficultyData = useMemo(
        () =>
            DIFFICULTY_ORDER.map((level) => ({
                label: level,
                value: stats?.difficultyBreakdown?.[level] || 0,
                color: difficultyMeta(level).color
            })),
        [stats]
    );

    const recent = (analytics.data?.recentSubmissions || []).slice(0, 6);

    /* ── Render ────────────────────────────────────────────────────────── */

    if (analytics.error && progress.error) {
        return (
            <div className="shell">
                <ErrorState
                    title="The Deck couldn't sync"
                    body="Your analytics didn't come back. This is usually a connection blip rather than lost data."
                    onRetry={() => {
                        analytics.reload();
                        progress.reload();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.deck.group}
                title={`${greeting()}, ${user?.username || "solver"}`}
                description={MODULE.deck.blurb}
                actions={
                    <>
                        <Button variant="secondary" to={MODULE.telemetry.path} icon={Icons.LuActivity}>
                            Analytics
                        </Button>
                        <Button variant="primary" to={MODULE.vault.path} icon={Icons.LuBoxes}>
                            Browse Problems
                        </Button>
                    </>
                }
            />

            {/* ── Standing ──────────────────────────────────────────── */}

            <motion.div
                className="autogrid"
                style={{ "--min": "210px", marginBottom: "var(--sp-6)" }}
                variants={staggerParent(0.06)}
                initial="initial"
                animate="animate"
            >
                <StatTile
                    label="Problems conquered"
                    value={fmtNumber(stats?.problemsSolved || 0)}
                    icon={Icons.LuTarget}
                    sub={`of ${fmtNumber(progress.data?.overall?.total || 0)} published`}
                    accent="var(--brand-violet)"
                />
                <StatTile
                    label="Acceptance rate"
                    value={`${stats?.acceptanceRate || 0}%`}
                    icon={Icons.LuCrosshair}
                    sub={`${fmtNumber(stats?.acceptedSubmissions || 0)} of ${fmtNumber(stats?.totalSubmissions || 0)} accepted`}
                    accent="var(--series-3)"
                />
                <StatTile
                    label="Current streak"
                    value={`${streaks.current} ${streaks.current === 1 ? "day" : "days"}`}
                    icon={Icons.LuFlame}
                    sub={`Longest: ${streaks.longest} days`}
                    accent="var(--status-warning)"
                />
                <StatTile
                    label="Rank tier"
                    value={tier.current.label}
                    icon={Icons.LuShield}
                    sub={
                        tier.next
                            ? `${tier.toNext} more to ${tier.next.label}`
                            : "Highest tier reached"
                    }
                    accent={tier.current.accent}
                />
            </motion.div>

            {/* ── Focus + recommendation ────────────────────────────── */}

            <div className="deck__split">
                <Card size="lg" edge className="deck__focus">
                    <div className="row row-between row-wrap" style={{ marginBottom: "var(--sp-5)" }}>
                        <div className="stack stack-1">
                            <span className="eyebrow">
                                <Icons.LuCompass size={13} /> Recommended next
                            </span>
                            <h2 style={{ fontSize: "var(--fs-lg)" }}>
                                {focus
                                    ? `Your thinnest tier is ${focus.difficulty}`
                                    : "Pick up where you left off"}
                            </h2>
                        </div>

                        {focus && (
                            <Badge tone="brand" size="lg">
                                {focus.solved} / {focus.total} solved
                            </Badge>
                        )}
                    </div>

                    {catalogue.loading ? (
                        <div className="skeleton" style={{ height: 128, borderRadius: "var(--r-lg)" }} />
                    ) : recommendation ? (
                        <Link to={forgePath(recommendation.slug)} className="deck__rec">
                            <div className="stack stack-3" style={{ flex: 1, minWidth: 0 }}>
                                <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                                    <DifficultyBadge level={recommendation.difficulty} />
                                    {(recommendation.tags || []).slice(0, 3).map((tag) => (
                                        <Badge key={tag} tone="neutral">{tag}</Badge>
                                    ))}
                                </div>

                                <h3 style={{ fontSize: "var(--fs-lg)" }}>{recommendation.title}</h3>

                                <p className="text-muted clamp-2" style={{ fontSize: "var(--fs-sm)" }}>
                                    {String(recommendation.description || "")
                                        .replace(/[#*`>_]/g, "")
                                        .slice(0, 180)}
                                </p>
                            </div>

                            <span className="deck__rec-go" aria-hidden="true">
                                <Icons.LuArrowRight size={18} />
                            </span>
                        </Link>
                    ) : (
                        <EmptyState
                            icon={Icons.LuBoxes}
                            title="No problems published yet"
                            body="An admin needs to publish some before there's anything to solve."
                        />
                    )}

                    <div className="deck__progress">
                        {(progress.data?.byDifficulty || []).map((row) => (
                            <ProgressRow
                                key={row.difficulty}
                                label={row.difficulty}
                                solved={row.solved}
                                total={row.total}
                                color={difficultyMeta(row.difficulty).color}
                            />
                        ))}
                    </div>
                </Card>

                <Card size="lg" className="deck__meter">
                    <CardHeader
                        title="Archive completion"
                        subtitle="Against every published problem"
                        icon={Icons.LuCircleGauge}
                    />

                    <div className="deck__meter-body">
                        <RadialMeter
                            value={progress.data?.overall?.solved || 0}
                            max={progress.data?.overall?.total || 1}
                            size={148}
                            caption="Complete"
                        />

                        <div className="stack stack-2" style={{ textAlign: "center" }}>
                            <span className="tnum" style={{ fontSize: "var(--fs-md)", fontWeight: "var(--fw-semi)" }}>
                                {fmtNumber(progress.data?.overall?.solved || 0)}
                                <span className="text-faint"> / {fmtNumber(progress.data?.overall?.total || 0)}</span>
                            </span>
                            <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                Problems solved
                            </span>
                        </div>
                    </div>

                    <div className="stack stack-3" style={{ marginTop: "var(--sp-5)" }}>
                        <span className="eyebrow">Tier progress</span>
                        <ProgressBar
                            value={tier.progress}
                            label={`${tier.progress}% toward ${tier.next?.label || "max tier"}`}
                            color={tier.current.accent}
                        />
                        <div className="row row-between" style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
                            <span>{tier.current.label}</span>
                            <span>{tier.next?.label || "Maximum"}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Activity ──────────────────────────────────────────── */}

            <Section
                title="Ninety days of activity"
                description="Every square is one day. Darker means more submissions."
                icon={Icons.LuCalendarDays}
                style={{ marginTop: "var(--sp-8)" }}
                action={
                    <Badge tone="neutral" icon={Icons.LuFlame}>
                        {streaks.activeDays} active days
                    </Badge>
                }
            >
                <Card>
                    {analytics.loading ? (
                        <div className="skeleton" style={{ height: 120, borderRadius: "var(--r-md)" }} />
                    ) : (
                        <ActivityHeatmap data={analytics.data?.activityData || []} weeks={20} />
                    )}
                </Card>
            </Section>

            {/* ── Distributions ─────────────────────────────────────── */}

            <div className="autogrid" style={{ "--min": "330px", marginTop: "var(--sp-8)" }}>
                <Card size="lg">
                    <CardHeader
                        title="Verdict distribution"
                        subtitle="Across every submission you've made"
                        icon={Icons.LuScale}
                    />
                    {loading ? (
                        <div className="skeleton" style={{ height: 150, borderRadius: "var(--r-md)" }} />
                    ) : verdictData.length ? (
                        <BarSeries data={verdictData} showPercent />
                    ) : (
                        <p className="chart__empty">No submissions yet — solve something and this fills in.</p>
                    )}
                </Card>

                <Card size="lg">
                    <CardHeader
                        title="Solved by difficulty"
                        subtitle="Unique problems, not submissions"
                        icon={Icons.LuLayers}
                    />
                    {loading ? (
                        <div className="skeleton" style={{ height: 150, borderRadius: "var(--r-md)" }} />
                    ) : (
                        <div className="stack stack-5">
                            <CompositionBar data={difficultyData} height={16} />
                            <div className="stack stack-4">
                                {difficultyData.map((row) => (
                                    <ProgressRow
                                        key={row.label}
                                        label={row.label}
                                        solved={row.value}
                                        total={
                                            progress.data?.byDifficulty?.find(
                                                (d) => d.difficulty === row.label
                                            )?.total || row.value
                                        }
                                        color={row.color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card size="lg">
                    <CardHeader
                        title="Language mix"
                        subtitle="Submissions per language"
                        icon={Icons.LuLanguages}
                    />
                    {loading ? (
                        <div className="skeleton" style={{ height: 150, borderRadius: "var(--r-md)" }} />
                    ) : languageData.length ? (
                        <CompositionBar data={languageData} height={16} />
                    ) : (
                        <p className="chart__empty">Nothing submitted yet.</p>
                    )}
                </Card>
            </div>

            {/* ── Recent + badges ───────────────────────────────────── */}

            <div className="deck__split deck__split--even" style={{ marginTop: "var(--sp-8)" }}>
                <Card size="lg">
                    <CardHeader
                        title="Latest verdicts"
                        icon={Icons.LuHistory}
                        action={
                            <Button variant="ghost" size="sm" to={MODULE.chronicle.path} trailingIcon={Icons.LuArrowRight}>
                                All submissions
                            </Button>
                        }
                    />

                    {analytics.loading ? (
                        <SkeletonGrid count={3} min={240} lines={1} showMeta={false} />
                    ) : recent.length ? (
                        <ul className="stack stack-2">
                            {recent.map((submission) => (
                                <li key={submission._id}>
                                    <Link
                                        to={
                                            submission.problemId?.slug
                                                ? forgePath(submission.problemId.slug)
                                                : MODULE.chronicle.path
                                        }
                                        className="deck__row"
                                    >
                                        <VerdictBadge verdict={submission.verdict} short />

                                        <span className="truncate" style={{ flex: 1, fontWeight: "var(--fw-medium)" }}>
                                            {submission.problemId?.title || "Deleted problem"}
                                        </span>

                                        <span className="text-faint tnum" style={{ fontSize: "var(--fs-2xs)" }}>
                                            {duration(submission.executionTime)}
                                        </span>

                                        <span className="text-muted" style={{ fontSize: "var(--fs-2xs)", whiteSpace: "nowrap" }}>
                                            {relativeTime(submission.createdAt)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={Icons.LuFileCode}
                            title="No submissions yet"
                            body="Your verdicts will appear here the moment the judge returns one."
                            action={
                                <Button variant="primary" to={MODULE.vault.path}>
                                    Find a problem
                                </Button>
                            }
                        />
                    )}
                </Card>

                <Card size="lg">
                    <CardHeader
                        title="Badges"
                        subtitle={`${unlockedBadges.length} of ${badges.length} earned`}
                        icon={Icons.LuAward}
                        action={
                            <Button variant="ghost" size="sm" to={MODULE.identity.path} trailingIcon={Icons.LuArrowRight}>
                                View profile
                            </Button>
                        }
                    />

                    <div className="badge-grid">
                        {badges.map((badge) => {
                            const Icon = Icons[badge.icon] || Icons.LuAward;

                            return (
                                <div
                                    key={badge.id}
                                    className={`badge-tile ${badge.unlocked ? "badge-tile--on" : ""}`}
                                    title={
                                        badge.unlocked
                                            ? `${badge.label} — ${badge.blurb}`
                                            : `Locked — ${badge.blurb}`
                                    }
                                >
                                    <span className="badge-tile__icon" aria-hidden="true">
                                        <Icon size={17} />
                                    </span>
                                    <span className="badge-tile__label">{badge.label}</span>
                                    {!badge.unlocked && (
                                        <span className="badge-tile__lock" aria-label="Locked">
                                            <Icons.LuLock size={10} />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Deck;
