import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import { fetchProblems } from "../services/judge";
import { fetchProgress } from "../services/account";
import { useAsync, useDebounced } from "../hooks";
import { DIFFICULTY_ORDER, difficultyMeta } from "../lib/domain";
import { number as fmtNumber, percent } from "../lib/format";
import {
    Card, Button, Badge, Chip, DifficultyBadge, Input, Select,
    SkeletonGrid, SkeletonRows, EmptyState, ErrorState, Segmented, ProgressBar
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | The Vault — problem archive
 |==========================================================================
 | Filter state lives in the URL, not in component state. That makes every
 | view shareable and survivable across a refresh, and it means the browser
 | back button walks back through filter changes the way people expect.
 |
 | Pagination is server-side (the API pages), so the list never holds more
 | than one page in memory.
 */

const PAGE_SIZE = 12;

const SORTS = [
    { value: "-createdAt", label: "Newest first" },
    { value: "createdAt", label: "Oldest first" },
    { value: "title", label: "Title A→Z" },
    { value: "-submissionCount", label: "Most attempted" },
    { value: "-acceptedCount", label: "Most solved" }
];

/* ── Problem card ──────────────────────────────────────────────────────── */

const ProblemCard = ({ problem, solved }) => {
    const acceptance =
        problem.submissionCount > 0
            ? Math.round((problem.acceptedCount / problem.submissionCount) * 100)
            : null;

    return (
        <motion.div variants={riseChild}>
            <Card
                to={forgePath(problem.slug)}
                interactive
                className={`problem-card ${solved ? "problem-card--solved" : ""}`}
            >
                <div className="row row-between" style={{ gap: "var(--sp-3)" }}>
                    <DifficultyBadge level={problem.difficulty} />

                    {solved && (
                        <Badge tone="good" icon={Icons.LuCircleCheck}>
                            Solved
                        </Badge>
                    )}
                </div>

                <h3 className="problem-card__title">{problem.title}</h3>

                <div className="row row-wrap" style={{ gap: "var(--sp-1)" }}>
                    {(problem.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="problem-card__tag">{tag}</span>
                    ))}
                    {(problem.tags || []).length > 3 && (
                        <span className="problem-card__tag">
                            +{problem.tags.length - 3}
                        </span>
                    )}
                </div>

                <div className="problem-card__foot">
                    {/* An untouched problem reads as an invitation rather than
                        a dead stat — "0% accepted" would be actively
                        discouraging, and "No attempts" merely flat. */}
                    <span title={acceptance === null ? "Nobody has solved this yet" : "Acceptance rate"}>
                        <Icons.LuCircleCheck size={12} aria-hidden="true" />
                        {acceptance === null ? "Be the first to solve" : `${acceptance}% accepted`}
                    </span>
                    <span title="Total submissions">
                        <Icons.LuUsers size={12} aria-hidden="true" />
                        {fmtNumber(problem.submissionCount || 0)}
                    </span>
                    {problem.topicCategory && (
                        <span title="Pathway">
                            <Icons.LuRoute size={12} aria-hidden="true" />
                            {problem.topicCategory}
                        </span>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Vault = () => {
    const [params, setParams] = useSearchParams();

    const search = params.get("q") || "";
    const difficulty = params.get("difficulty") || "";
    const tag = params.get("tag") || "";
    const sort = params.get("sort") || "-createdAt";
    const view = params.get("view") || "grid";
    const page = Number(params.get("page")) || 1;

    const [searchDraft, setSearchDraft] = useState(search);
    const debouncedSearch = useDebounced(searchDraft, 320);

    /** Merges patches into the query string, resetting to page 1. */
    const update = useCallback(
        (patch, { resetPage = true } = {}) => {
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev);

                    Object.entries(patch).forEach(([key, value]) => {
                        if (value === "" || value === null || value === undefined) {
                            next.delete(key);
                        } else {
                            next.set(key, String(value));
                        }
                    });

                    if (resetPage) next.delete("page");
                    return next;
                },
                { replace: true }
            );
        },
        [setParams]
    );

    // Push the debounced draft into the URL, but only when it actually
    // differs — otherwise this fires a history entry on every mount.
    useEffect(() => {
        if (debouncedSearch !== search) update({ q: debouncedSearch });
    }, [debouncedSearch, search, update]);

    const query = useMemo(
        () => ({
            page,
            limit: PAGE_SIZE,
            sort,
            ...(search ? { search } : {}),
            ...(difficulty ? { difficulty } : {}),
            ...(tag ? { tags: tag } : {})
        }),
        [page, sort, search, difficulty, tag]
    );

    const { data, loading, error, reload } = useAsync(
        () => fetchProblems(query),
        [JSON.stringify(query)]
    );

    const progress = useAsync(fetchProgress, []);

    const problems = useMemo(() => data?.problems || [], [data]);
    const total = data?.totalProblems || 0;
    const totalPages = data?.totalPages || 1;

    /*
     | Which problems the user has solved, by id. This used to be derived
     | per-difficulty — a card was marked solved only when its entire
     | difficulty was cleared — because the progress endpoint returned counts
     | and not ids. It now returns the ids too, so the tick means what it
     | says instead of approximating.
     */
    const solvedIds = useMemo(
        () => new Set(progress.data?.solvedProblemIds || []),
        [progress.data]
    );

    /* Tags present on this page, for the quick-filter row. */
    const visibleTags = useMemo(() => {
        const counts = new Map();
        problems.forEach((p) =>
            (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1))
        );

        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([label, count]) => ({ label, count }));
    }, [problems]);

    const activeFilters = [
        difficulty && { key: "difficulty", label: difficulty },
        tag && { key: "tag", label: tag },
        search && { key: "q", label: `"${search}"` }
    ].filter(Boolean);

    const clearAll = () => {
        setSearchDraft("");
        setParams({}, { replace: true });
    };

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.vault.group}
                title={MODULE.vault.label}
                description={MODULE.vault.blurb}
                actions={
                    <Segmented
                        items={[
                            { id: "grid", label: "", icon: Icons.LuLayoutGrid, title: "Grid view" },
                            { id: "list", label: "", icon: Icons.LuList, title: "List view" }
                        ]}
                        value={view}
                        onChange={(v) => update({ view: v }, { resetPage: false })}
                    />
                }
            >
                {/* ── Overall progress strip ────────────────────────── */}
                {progress.data && (
                    <Card className="vault__progress">
                        <div className="row row-between row-wrap" style={{ gap: "var(--sp-4)" }}>
                            <div className="stack stack-1">
                                <span className="eyebrow">Archive progress</span>
                                <span style={{ fontWeight: "var(--fw-semi)" }}>
                                    {fmtNumber(progress.data.overall.solved)} of{" "}
                                    {fmtNumber(progress.data.overall.total)} solved
                                </span>
                            </div>

                            <div className="row row-wrap" style={{ gap: "var(--sp-5)" }}>
                                {progress.data.byDifficulty.map((row) => (
                                    <div key={row.difficulty} className="vault__progress-item">
                                        <span
                                            className="progress-row__dot"
                                            style={{ background: difficultyMeta(row.difficulty).color }}
                                            aria-hidden="true"
                                        />
                                        <span className="text-secondary" style={{ fontSize: "var(--fs-xs)" }}>
                                            {row.difficulty}
                                        </span>
                                        <span className="tnum" style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)" }}>
                                            {row.solved}/{row.total}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <ProgressBar
                            value={progress.data.overall.percentage}
                            label={`${progress.data.overall.percentage}% of the archive solved`}
                            thin
                        />
                    </Card>
                )}

                {/* ── Filter bar ────────────────────────────────────── */}
                <div className="filterbar">
                    <Input
                        type="search"
                        placeholder="Search the archive by title or statement…"
                        leadingIcon={Icons.LuSearch}
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        aria-label="Search problems"
                        className="filterbar__search"
                    />

                    <Select
                        value={difficulty}
                        onChange={(e) => update({ difficulty: e.target.value })}
                        aria-label="Filter by difficulty"
                        className="filterbar__select"
                    >
                        <option value="">All difficulties</option>
                        {DIFFICULTY_ORDER.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </Select>

                    <Select
                        value={sort}
                        onChange={(e) => update({ sort: e.target.value })}
                        aria-label="Sort problems"
                        className="filterbar__select"
                        options={SORTS}
                    />
                </div>

                {/* ── Tag chips ─────────────────────────────────────── */}
                {visibleTags.length > 0 && (
                    <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                        {visibleTags.map((t) => (
                            <Chip
                                key={t.label}
                                active={tag === t.label}
                                count={t.count}
                                onClick={() => update({ tag: tag === t.label ? "" : t.label })}
                            >
                                {t.label}
                            </Chip>
                        ))}
                    </div>
                )}

                {/* ── Active filters ────────────────────────────────── */}
                <AnimatePresence>
                    {activeFilters.length > 0 && (
                        <motion.div
                            className="row row-wrap"
                            style={{ gap: "var(--sp-2)" }}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                Filtering by
                            </span>

                            {activeFilters.map((f) => (
                                <Chip
                                    key={f.key}
                                    active
                                    onRemove={() => {
                                        if (f.key === "q") setSearchDraft("");
                                        update({ [f.key]: "" });
                                    }}
                                >
                                    {f.label}
                                </Chip>
                            ))}

                            <Button variant="ghost" size="xs" onClick={clearAll}>
                                Clear all
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </PageHeader>

            {/* ── Results ───────────────────────────────────────────── */}

            <div className="row row-between" style={{ marginBottom: "var(--sp-4)" }}>
                <span className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                    {loading
                        ? "Searching the archive…"
                        : `${fmtNumber(total)} ${total === 1 ? "problem" : "problems"}`}
                </span>

                {totalPages > 1 && (
                    <span className="text-faint tnum" style={{ fontSize: "var(--fs-xs)" }}>
                        Page {page} of {totalPages}
                    </span>
                )}
            </div>

            {error ? (
                <ErrorState
                    title="Problems didn't load"
                    body="The archive couldn't be reached. Your filters are preserved in the URL."
                    onRetry={reload}
                />
            ) : loading ? (
                view === "grid" ? <SkeletonGrid count={PAGE_SIZE} min={280} /> : <SkeletonRows rows={8} />
            ) : problems.length === 0 ? (
                <EmptyState
                    icon={Icons.LuSearchX}
                    title="Nothing matches those filters"
                    body="Try widening the difficulty, clearing the tag, or searching for a different phrase."
                    action={
                        activeFilters.length > 0 && (
                            <Button variant="secondary" onClick={clearAll}>
                                Clear all filters
                            </Button>
                        )
                    }
                />
            ) : view === "grid" ? (
                <motion.div
                    className="autogrid"
                    style={{ "--min": "290px" }}
                    variants={staggerParent(0.04)}
                    initial="initial"
                    animate="animate"
                >
                    {problems.map((problem) => (
                        <ProblemCard
                            key={problem._id}
                            problem={problem}
                            solved={solvedIds.has(String(problem._id))}
                        />
                    ))}
                </motion.div>
            ) : (
                <div className="table-wrap">
                    <table className="table table--rowlink">
                        <thead>
                            <tr>
                                <th scope="col">Problem</th>
                                <th scope="col">Difficulty</th>
                                <th scope="col">Tags</th>
                                <th scope="col" className="table__num">Acceptance</th>
                                <th scope="col" className="table__num">Attempts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {problems.map((problem) => {
                                const acceptance =
                                    problem.submissionCount > 0
                                        ? percent(problem.acceptedCount, problem.submissionCount)
                                        : "—";

                                return (
                                    <tr key={problem._id}>
                                        <td>
                                            <Link
                                                to={forgePath(problem.slug)}
                                                style={{ fontWeight: "var(--fw-medium)" }}
                                            >
                                                {problem.title}
                                            </Link>
                                        </td>
                                        <td><DifficultyBadge level={problem.difficulty} /></td>
                                        <td>
                                            <div className="row row-wrap" style={{ gap: 4 }}>
                                                {(problem.tags || []).slice(0, 2).map((t) => (
                                                    <span key={t} className="problem-card__tag">{t}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="table__num tnum">{acceptance}</td>
                                        <td className="table__num tnum">
                                            {fmtNumber(problem.submissionCount || 0)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Pagination ────────────────────────────────────────── */}

            {totalPages > 1 && !loading && (
                <nav className="pager" aria-label="Pagination">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={Icons.LuChevronLeft}
                        disabled={page <= 1}
                        onClick={() => update({ page: page - 1 }, { resetPage: false })}
                    >
                        Previous
                    </Button>

                    <span className="pager__pages">
                        {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                            // Window the page numbers around the current page
                            // so a 40-page archive doesn't render 40 buttons.
                            const half = 3;
                            let start = Math.max(1, page - half);
                            if (start + 6 > totalPages) start = Math.max(1, totalPages - 6);

                            const n = start + i;
                            if (n > totalPages) return null;

                            return (
                                <button
                                    key={n}
                                    type="button"
                                    className={`pager__page ${n === page ? "pager__page--active" : ""}`}
                                    aria-current={n === page ? "page" : undefined}
                                    onClick={() => update({ page: n }, { resetPage: false })}
                                >
                                    {n}
                                </button>
                            );
                        })}
                    </span>

                    <Button
                        variant="secondary"
                        size="sm"
                        trailingIcon={Icons.LuChevronRight}
                        disabled={page >= totalPages}
                        onClick={() => update({ page: page + 1 }, { resetPage: false })}
                    >
                        Next
                    </Button>
                </nav>
            )}
        </div>
    );
};

export default Vault;
