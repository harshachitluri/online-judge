import React, { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import { fetchProblems } from "../services/judge";
import { fetchProgress } from "../services/account";
import { useAsync } from "../hooks";
import { difficultyMeta, DIFFICULTY_ORDER } from "../lib/domain";
import { number as fmtNumber } from "../lib/format";
import {
    Card, Button, Badge, DifficultyBadge, Input, ProgressBar,
    SkeletonRows, EmptyState, ErrorState, Segmented
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { CompositionBar } from "../components/charts";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Track detail — one topic or one company
 |==========================================================================
 | Reached from a card on Topics or Companies. This used to be an accordion
 | that unrolled the whole problem list inside the card, which stops working
 | the moment a bundle has more than a handful of problems: the grid reflows
 | around a card that is suddenly ten times taller, and there is no way to
 | search or filter within it.
 |
 | A page of its own gets a real toolbar (search, difficulty, sort), room for
 | the full list, and a URL that can be shared or bookmarked.
 |
 | The problems come from the ordinary problems endpoint filtered by company
 | or topic — not from the grouped endpoint the index page uses. That way one
 | bundle's worth of rows crosses the wire instead of every bundle's.
 */

const SORTS = [
    { id: "difficulty", label: "By difficulty" },
    { id: "title", label: "A→Z" },
    { id: "unsolved", label: "Unsolved first" }
];

/* Large enough that scrolling is the norm rather than paging, bounded so a
   company with a huge bundle can't produce an unbounded response. */
const LIMIT = 200;

const TrackDetailPage = ({ module, field, progressKey, progressField, icon, backLabel }) => {
    const { name: rawName } = useParams();
    const navigate = useNavigate();

    const name = decodeURIComponent(rawName || "");

    const problems = useAsync(
        () => fetchProblems({ [field]: name, limit: LIMIT, sort: "title" }),
        [name]
    );
    const progress = useAsync(fetchProgress, []);

    const [query, setQuery] = useState("");
    const [difficulty, setDifficulty] = useState("all");
    const [sort, setSort] = useState("difficulty");

    const all = useMemo(() => problems.data?.problems || [], [problems.data]);

    /* Per-problem solved marks, from the ids the progress endpoint returns. */
    const solvedIds = useMemo(
        () => new Set(progress.data?.solvedProblemIds || []),
        [progress.data]
    );

    const row = useMemo(
        () => (progress.data?.[progressKey] || []).find((r) => r[progressField] === name),
        [progress.data, progressKey, progressField, name]
    );

    const solved = row?.solved ?? all.filter((p) => solvedIds.has(String(p._id))).length;
    const total = row?.total ?? all.length;
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    const complete = total > 0 && solved === total;

    const mix = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        all.forEach((p) => {
            if (counts[p.difficulty] !== undefined) counts[p.difficulty] += 1;
        });

        return DIFFICULTY_ORDER.map((level) => ({
            label: level,
            value: counts[level],
            color: difficultyMeta(level).color
        }));
    }, [all]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        const list = all.filter((p) => {
            if (difficulty !== "all" && p.difficulty !== difficulty) return false;
            if (!q) return true;

            return (
                p.title.toLowerCase().includes(q) ||
                (p.tags || []).some((tag) => tag.toLowerCase().includes(q))
            );
        });

        const order = { Easy: 0, Medium: 1, Hard: 2 };
        const sorted = list.slice();

        if (sort === "difficulty") {
            sorted.sort(
                (a, b) =>
                    (order[a.difficulty] ?? 3) - (order[b.difficulty] ?? 3) ||
                    a.title.localeCompare(b.title)
            );
        } else if (sort === "unsolved") {
            // The point of this page is finding the next thing to attempt, so
            // "what's left" sorts above "what's done".
            sorted.sort(
                (a, b) =>
                    Number(solvedIds.has(String(a._id))) - Number(solvedIds.has(String(b._id))) ||
                    (order[a.difficulty] ?? 3) - (order[b.difficulty] ?? 3)
            );
        } else {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }

        return sorted;
    }, [all, query, difficulty, sort, solvedIds]);

    const Icon = Icons[icon] || Icons.LuCircleDot;

    const nextUnsolved = useMemo(
        () => all.find((p) => !solvedIds.has(String(p._id))),
        [all, solvedIds]
    );

    return (
        <div className="shell">
            <PageHeader
                eyebrow={
                    <Link to={module.path} className="track-detail__back">
                        <Icons.LuArrowLeft size={12} aria-hidden="true" /> {backLabel}
                    </Link>
                }
                title={name}
                description={
                    problems.loading
                        ? "Loading this bundle…"
                        : `${fmtNumber(total)} ${total === 1 ? "problem" : "problems"} in this bundle.`
                }
                actions={
                    nextUnsolved && (
                        <Button
                            variant="primary"
                            to={forgePath(nextUnsolved.slug)}
                            trailingIcon={Icons.LuArrowRight}
                        >
                            Next unsolved
                        </Button>
                    )
                }
            />

            {problems.error ? (
                <ErrorState
                    title="This bundle didn't load"
                    body="The problem list couldn't be fetched."
                    onRetry={problems.reload}
                />
            ) : (
                <div className="stack stack-6">
                    {/* ── Summary ───────────────────────────────────── */}

                    <Card size="lg" className="track-detail__summary">
                        <div className="track-detail__stat">
                            <span className="track__icon" aria-hidden="true">
                                <Icon size={18} />
                            </span>

                            <div className="stack stack-2" style={{ flex: 1, minWidth: 0 }}>
                                <div className="row row-between" style={{ gap: "var(--sp-3)" }}>
                                    <span className="console__label">Your progress</span>
                                    {complete ? (
                                        <Badge tone="good" icon={Icons.LuCircleCheck}>
                                            Complete
                                        </Badge>
                                    ) : (
                                        <span className="track__pct tnum">{pct}%</span>
                                    )}
                                </div>

                                <ProgressBar
                                    value={solved}
                                    max={total || 1}
                                    label={`${solved} of ${total} solved`}
                                    color={complete ? "var(--status-good)" : undefined}
                                    thin
                                />

                                <div
                                    className="row row-between"
                                    style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}
                                >
                                    <span className="tnum">{fmtNumber(solved)} solved</span>
                                    <span className="tnum">
                                        {fmtNumber(Math.max(0, total - solved))} remaining
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="stack stack-2">
                            <span className="track__mixlabel">Difficulty mix</span>
                            <CompositionBar data={mix} height={8} showLegend={false} />
                            <div className="row row-wrap" style={{ gap: "var(--sp-3)" }}>
                                {mix.filter((m) => m.value > 0).map((m) => (
                                    <span key={m.label} className="track__mixitem">
                                        <span
                                            className="progress-row__dot"
                                            style={{ background: m.color }}
                                            aria-hidden="true"
                                        />
                                        {m.label} <span className="tnum text-faint">{m.value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* ── Toolbar ───────────────────────────────────── */}

                    <div className="track-detail__toolbar">
                        <Input
                            type="search"
                            placeholder="Filter problems…"
                            leadingIcon={Icons.LuSearch}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Filter problems in this bundle"
                            style={{ maxWidth: 320 }}
                        />

                        <Segmented
                            items={[
                                { id: "all", label: "All" },
                                ...DIFFICULTY_ORDER.map((d) => ({ id: d, label: d }))
                            ]}
                            value={difficulty}
                            onChange={setDifficulty}
                        />

                        <Segmented items={SORTS} value={sort} onChange={setSort} />
                    </div>

                    {/* ── List ──────────────────────────────────────── */}

                    {problems.loading ? (
                        <SkeletonRows rows={8} cols={4} />
                    ) : visible.length === 0 ? (
                        <EmptyState
                            icon={Icon}
                            title={
                                all.length === 0
                                    ? "Nothing in this bundle yet"
                                    : "Nothing matches those filters"
                            }
                            body={
                                all.length === 0
                                    ? "No published problems are tagged with this name."
                                    : "Try a shorter phrase, or widen the difficulty filter."
                            }
                            action={
                                all.length === 0 ? (
                                    <Button variant="primary" to={MODULE.vault.path}>
                                        Browse Problems
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            setQuery("");
                                            setDifficulty("all");
                                        }}
                                    >
                                        Clear filters
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <motion.ul
                            className="track-detail__list"
                            variants={staggerParent(0.03)}
                            initial="initial"
                            animate="animate"
                        >
                            {visible.map((problem, i) => {
                                const isSolved = solvedIds.has(String(problem._id));

                                return (
                                    <motion.li key={problem._id} variants={riseChild}>
                                        <Link
                                            to={forgePath(problem.slug)}
                                            className={`track-detail__row ${isSolved ? "track-detail__row--solved" : ""}`}
                                        >
                                            <span className="track-detail__mark" aria-hidden="true">
                                                {isSolved ? (
                                                    <Icons.LuCircleCheck size={16} />
                                                ) : (
                                                    <span className="track-detail__num tnum">
                                                        {String(i + 1).padStart(2, "0")}
                                                    </span>
                                                )}
                                            </span>

                                            <span className="track-detail__title truncate">
                                                {problem.title}
                                                {isSolved && (
                                                    <span className="sr-only"> — solved</span>
                                                )}
                                            </span>

                                            <span className="track-detail__tags">
                                                {(problem.tags || []).slice(0, 2).map((tag) => (
                                                    <span key={tag} className="problem-card__tag">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </span>

                                            <DifficultyBadge level={problem.difficulty} />
                                            <Icons.LuArrowRight size={14} aria-hidden="true" />
                                        </Link>
                                    </motion.li>
                                );
                            })}
                        </motion.ul>
                    )}

                    {/* The list is capped rather than paged — say so instead of
                        silently truncating. */}
                    {all.length >= LIMIT && (
                        <p className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                            Showing the first {LIMIT} problems in this bundle.{" "}
                            <button
                                type="button"
                                className="access__link"
                                onClick={() => navigate(MODULE.vault.path)}
                            >
                                Use the archive
                            </button>{" "}
                            to page through the rest.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Exports ───────────────────────────────────────────────────────────── */

export const TopicDetail = () => (
    <TrackDetailPage
        module={MODULE.pathways}
        field="topicCategory"
        progressKey="topics"
        progressField="topic"
        icon="LuRoute"
        backLabel="All topics"
    />
);

export const CompanyDetail = () => (
    <TrackDetailPage
        module={MODULE.constellations}
        field="company"
        progressKey="companies"
        progressField="company"
        icon="LuOrbit"
        backLabel="All companies"
    />
);
