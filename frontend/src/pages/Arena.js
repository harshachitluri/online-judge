import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import { listRounds, countdown, ROUND_TEMPLATES } from "../services/arena";
import { useAsync, useNow } from "../hooks";
import { number as fmtNumber, shortDateTime, minutes } from "../lib/format";
import {
    Card, Button, Badge, LiveBadge, PreviewBadge, DifficultyBadge,
    Segmented, SkeletonGrid, EmptyState, ErrorState, ProgressBar
} from "../components/ui";
import { PageHeader, Section } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | The Arena — contests
 |==========================================================================
 | Contest scheduling has no backend yet, so the rounds here are assembled
 | from the real published archive on a fixed weekly cadence. The problems
 | are genuine and solvable; the schedule and entrant counts are not.
 |
 | Every card says so. A fabricated leaderboard that looks real is worse
 | than an empty page, and a "Preview" badge costs one line.
 */

const STATUS_META = {
    live:     { tone: "critical", label: "Live now" },
    upcoming: { tone: "brand",    label: "Scheduled" },
    finished: { tone: "neutral",  label: "Concluded" }
};

/* ── Round card ────────────────────────────────────────────────────────── */

const RoundCard = ({ round, now }) => {
    const meta = STATUS_META[round.status];

    const elapsed =
        round.status === "live"
            ? Math.min(100, ((now - round.startsAt) / (round.endsAt - round.startsAt)) * 100)
            : 0;

    return (
        <motion.div variants={riseChild}>
            <Card
                size="lg"
                className={`round round--${round.status}`}
                style={{ "--accent": round.accent }}
            >
                <div className="round__head">
                    <div className="stack stack-2" style={{ minWidth: 0 }}>
                        <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                            {round.status === "live" ? (
                                <LiveBadge />
                            ) : (
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                            )}

                            {round.rated ? (
                                <Badge tone="warning" icon={Icons.LuTrendingUp}>Rated</Badge>
                            ) : (
                                <Badge tone="neutral">Unrated</Badge>
                            )}

                            <Badge tone="neutral" icon={Icons.LuRepeat}>{round.cadence}</Badge>
                        </div>

                        <h3 className="round__name">{round.name}</h3>
                        <p className="round__blurb">{round.blurb}</p>
                    </div>
                </div>

                <div className="round__meta">
                    <span>
                        <Icons.LuCalendar size={13} aria-hidden="true" />
                        {shortDateTime(round.startsAt)}
                    </span>
                    <span>
                        <Icons.LuTimer size={13} aria-hidden="true" />
                        {minutes(round.durationMin)}
                    </span>
                    <span>
                        <Icons.LuFileCode size={13} aria-hidden="true" />
                        {round.problems.length} problems
                    </span>
                </div>

                {round.status === "live" && (
                    <div className="stack stack-2">
                        <div className="row row-between" style={{ fontSize: "var(--fs-xs)" }}>
                            <span className="text-muted">Time remaining</span>
                            <strong className="tnum">{countdown(round.endsAt)}</strong>
                        </div>
                        <ProgressBar
                            value={elapsed}
                            label={`${Math.round(elapsed)}% of the round elapsed`}
                            color="var(--status-critical)"
                            thin
                        />
                    </div>
                )}

                {round.status === "upcoming" && (
                    <div className="round__countdown">
                        <span className="round__countdown-label">Starts in</span>
                        <span className="round__countdown-value tnum">
                            {countdown(round.startsAt)}
                        </span>
                    </div>
                )}

                {round.status === "finished" && round.placement && (
                    <div className="round__result">
                        <Icons.LuFlag size={14} aria-hidden="true" />
                        <span>
                            Concluded · <strong>{fmtNumber(round.entrants)}</strong> entrants
                        </span>
                    </div>
                )}

                {round.problems.length > 0 ? (
                    <ul className="round__problems">
                        {round.problems.map((problem, i) => (
                            <li key={problem._id}>
                                <Link to={forgePath(problem.slug)} className="round__problem">
                                    <span className="round__letter">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="truncate" style={{ flex: 1 }}>
                                        {problem.title}
                                    </span>
                                    <DifficultyBadge level={problem.difficulty} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                        No published problems match this round's difficulty yet.
                    </p>
                )}

                <div className="row row-between row-wrap" style={{ gap: "var(--sp-3)" }}>
                    <PreviewBadge
                        label="Scheduled preview"
                        title="Contest scheduling has no backend yet — the problems are real, the schedule and entrant count are illustrative."
                    />

                    <Button
                        variant={round.status === "live" ? "primary" : "secondary"}
                        size="sm"
                        to={round.problems[0] ? forgePath(round.problems[0].slug) : MODULE.vault.path}
                        trailingIcon={Icons.LuArrowRight}
                        disabled={!round.problems.length}
                    >
                        {round.status === "live" ? "Enter the round" : "Practise the set"}
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Arena = () => {
    const { data, loading, error, reload } = useAsync(listRounds, []);
    const now = useNow(1000);

    const [filter, setFilter] = useState("all");

    const rounds = useMemo(() => data || [], [data]);

    const filtered = useMemo(
        () => (filter === "all" ? rounds : rounds.filter((r) => r.status === filter)),
        [rounds, filter]
    );

    const counts = useMemo(
        () => ({
            live: rounds.filter((r) => r.status === "live").length,
            upcoming: rounds.filter((r) => r.status === "upcoming").length,
            finished: rounds.filter((r) => r.status === "finished").length
        }),
        [rounds]
    );

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.arena.group}
                title={MODULE.arena.label}
                description="Timed rounds against the clock and everyone else. Four formats, from a forty-five minute sprint to a three-hour gauntlet."
                actions={
                    <Segmented
                        items={[
                            { id: "all", label: "All" },
                            { id: "live", label: `Live${counts.live ? ` (${counts.live})` : ""}` },
                            { id: "upcoming", label: "Upcoming" },
                            { id: "finished", label: "Past" }
                        ]}
                        value={filter}
                        onChange={setFilter}
                    />
                }
            >
                <div className="arena__notice">
                    <Icons.LuFlaskConical size={16} aria-hidden="true" />
                    <div className="stack stack-1">
                        <strong style={{ fontSize: "var(--fs-sm)" }}>
                            Contests is a designed preview
                        </strong>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                            Live contest scheduling isn't wired to a backend yet. Every problem
                            below is real and submitting counts toward your record — but the
                            start times, entrant counts and placements are illustrative, not a
                            live event you can register for.
                        </span>
                    </div>
                </div>
            </PageHeader>

            {/* ── Formats ───────────────────────────────────────────── */}

            <Section
                title="Formats"
                description="Each round type has a different shape and a different point."
                icon={Icons.LuSwords}
            >
                <div className="autogrid" style={{ "--min": "230px" }}>
                    {ROUND_TEMPLATES.map((template) => (
                        <Card
                            key={template.id}
                            className="format"
                            style={{ "--accent": template.accent }}
                        >
                            <span className="format__dot" aria-hidden="true" />
                            <h3 className="format__name">{template.name}</h3>
                            <p className="format__blurb">{template.blurb}</p>
                            <div className="format__meta">
                                <span>{minutes(template.durationMin)}</span>
                                <span>·</span>
                                <span>{template.size} {template.size === 1 ? "problem" : "problems"}</span>
                                <span>·</span>
                                <span>{template.rated ? "Rated" : "Unrated"}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </Section>

            {/* ── Rounds ────────────────────────────────────────────── */}

            <Section
                title={filter === "all" ? "All rounds" : `${filter[0].toUpperCase()}${filter.slice(1)} rounds`}
                icon={Icons.LuCalendarClock}
                style={{ marginTop: "var(--sp-10)" }}
            >
                {error ? (
                    <ErrorState
                        title="Rounds didn't load"
                        body="Contests are built from the live problem archive, and the archive didn't respond."
                        onRetry={reload}
                    />
                ) : loading ? (
                    <SkeletonGrid count={4} min={360} lines={3} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Icons.LuSwords}
                        title={`No ${filter} rounds`}
                        body={
                            rounds.length === 0
                                ? "Rounds are assembled from published problems. Once there are some, rounds appear here."
                                : "Try a different filter — there are rounds in the other states."
                        }
                        action={
                            <Button variant="secondary" onClick={() => setFilter("all")}>
                                Show all rounds
                            </Button>
                        }
                    />
                ) : (
                    <motion.div
                        className="autogrid"
                        style={{ "--min": "400px", "--gap": "var(--sp-5)" }}
                        variants={staggerParent(0.06)}
                        initial="initial"
                        animate="animate"
                    >
                        {filtered.map((round) => (
                            <RoundCard key={round.key} round={round} now={now} />
                        ))}
                    </motion.div>
                )}
            </Section>
        </div>
    );
};

export default Arena;
