import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, MODULES, forgePath } from "../config/brand";
import { fetchProblems, fetchTopics, fetchCompanies } from "../services/judge";
import { listThreads } from "../services/nexus";
import { useAuth } from "../context/AuthContext";
import { useAsync, useDebounced } from "../hooks";
import { number as fmtNumber, relativeTime } from "../lib/format";
import {
    Card, Button, Badge, Chip, DifficultyBadge, Input,
    SkeletonGrid, EmptyState, Segmented
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Oracle — unified search
 |==========================================================================
 | Searches four sources at once: problems (server-side), pathways,
 | constellations and Nexus threads (all client-side over already-loaded
 | collections).
 |
 | The command palette is for *jumping* somewhere you already know exists.
 | Oracle is for *finding* — it shows every match, grouped, with counts.
 */

const SCOPES = [
    { id: "all", label: "Everything" },
    { id: "problems", label: "Problems" },
    { id: "pathways", label: "Topics" },
    { id: "constellations", label: "Companies" },
    { id: "threads", label: "Discussions" }
];

const SUGGESTED = [
    "two pointers", "dynamic programming", "binary search",
    "graph", "sliding window", "hash map"
];

const Oracle = () => {
    const [params, setParams] = useSearchParams();
    const { isAdmin } = useAuth();

    const initialQuery = params.get("q") || "";
    const [query, setQuery] = useState(initialQuery);
    const [scope, setScope] = useState(params.get("scope") || "all");

    const debounced = useDebounced(query, 300);
    const active = debounced.trim();

    /* Keep the URL in step so a search is shareable and survives a refresh. */
    useEffect(() => {
        const next = new URLSearchParams();
        if (active) next.set("q", active);
        if (scope !== "all") next.set("scope", scope);
        setParams(next, { replace: true });
    }, [active, scope, setParams]);

    /* ── Sources ───────────────────────────────────────────────────────── */

    const problems = useAsync(
        () =>
            active
                ? fetchProblems({ search: active, limit: 24 })
                : Promise.resolve({ problems: [] }),
        [active]
    );

    // Topic and company groupings are small and rarely change, so they load
    // once and are filtered in memory.
    const topics = useAsync(fetchTopics, []);
    const companies = useAsync(fetchCompanies, []);
    const threads = useAsync(() => listThreads({ query: active }), [active]);

    /* ── Matching ──────────────────────────────────────────────────────── */

    const q = active.toLowerCase();

    const matchedTopics = useMemo(
        () => (q ? (topics.data || []).filter((t) => t._id.toLowerCase().includes(q)) : []),
        [topics.data, q]
    );

    const matchedCompanies = useMemo(
        () => (q ? (companies.data || []).filter((c) => c._id.toLowerCase().includes(q)) : []),
        [companies.data, q]
    );

    const matchedModules = useMemo(() => {
        if (!q) return [];

        return MODULES
            .filter((m) => (m.scope === "admin" ? isAdmin : true))
            .filter(
                (m) =>
                    m.label.toLowerCase().includes(q) ||
                    m.blurb.toLowerCase().includes(q)
            );
    }, [q, isAdmin]);

    const problemHits = problems.data?.problems || [];
    const threadHits = active ? threads.data || [] : [];

    const counts = {
        problems: problemHits.length,
        pathways: matchedTopics.length,
        constellations: matchedCompanies.length,
        threads: threadHits.length,
        modules: matchedModules.length
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const show = (id) => scope === "all" || scope === id;
    const loading = active && (problems.loading || threads.loading);

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.oracle.group}
                title={MODULE.oracle.label}
                description="One query across problems, topics, companies and discussions. For jumping somewhere you already know, press ⌘K instead."
            >
                <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search everything…"
                    leadingIcon={Icons.LuSearch}
                    aria-label="Search CodeJudge"
                    className="oracle__input"
                    autoFocus
                />

                <div className="row row-wrap row-between" style={{ gap: "var(--sp-3)" }}>
                    <Segmented
                        items={SCOPES.map((s) => ({
                            ...s,
                            label:
                                s.id === "all" || !active
                                    ? s.label
                                    : `${s.label} (${counts[s.id] ?? 0})`
                        }))}
                        value={scope}
                        onChange={setScope}
                    />

                    {active && !loading && (
                        <span className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                            {fmtNumber(total)} {total === 1 ? "result" : "results"} for{" "}
                            <strong>{active}</strong>
                        </span>
                    )}
                </div>
            </PageHeader>

            {!active ? (
                <div className="stack stack-6">
                    <div className="stack stack-3">
                        <span className="console__label">Try one of these</span>
                        <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                            {SUGGESTED.map((term) => (
                                <Chip key={term} icon={Icons.LuSearch} onClick={() => setQuery(term)}>
                                    {term}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    <EmptyState
                        icon={Icons.LuTelescope}
                        title="Search everything"
                        body="Type anything — a technique, a problem title, a company, or a phrase from a discussion. Results group themselves."
                    />
                </div>
            ) : loading ? (
                <SkeletonGrid count={6} min={300} lines={2} />
            ) : total === 0 ? (
                <EmptyState
                    icon={Icons.LuSearchX}
                    title={`Nothing matches "${active}"`}
                    body="Try a shorter phrase, a different spelling, or one of the suggested techniques."
                    action={
                        <Button variant="secondary" onClick={() => setQuery("")}>
                            Clear the search
                        </Button>
                    }
                />
            ) : (
                <motion.div
                    className="stack stack-10"
                    variants={staggerParent(0.06)}
                    initial="initial"
                    animate="animate"
                >
                    {/* ── Modules ───────────────────────────────────── */}

                    {scope === "all" && matchedModules.length > 0 && (
                        <motion.section className="stack stack-4" variants={riseChild}>
                            <h2 className="oracle__heading">
                                <Icons.LuCompass size={16} aria-hidden="true" />
                                Modules
                                <Badge tone="neutral">{matchedModules.length}</Badge>
                            </h2>

                            <div className="autogrid" style={{ "--min": "250px" }}>
                                {matchedModules.map((module) => {
                                    const Icon = Icons[module.icon] || Icons.LuCircleDot;
                                    return (
                                        <Card
                                            key={module.id}
                                            to={module.path}
                                            interactive
                                            className="oracle__module"
                                        >
                                            <span className="oracle__module-icon" aria-hidden="true">
                                                <Icon size={16} />
                                            </span>
                                            <div className="stack stack-1" style={{ minWidth: 0 }}>
                                                <strong>{module.label}</strong>
                                                <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                                                    {module.plain}
                                                </span>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </motion.section>
                    )}

                    {/* ── Problems ──────────────────────────────────── */}

                    {show("problems") && problemHits.length > 0 && (
                        <motion.section className="stack stack-4" variants={riseChild}>
                            <h2 className="oracle__heading">
                                <Icons.LuBoxes size={16} aria-hidden="true" />
                                Problems
                                <Badge tone="neutral">{problemHits.length}</Badge>
                            </h2>

                            <div className="autogrid" style={{ "--min": "290px" }}>
                                {problemHits.map((problem) => (
                                    <Card
                                        key={problem._id}
                                        to={forgePath(problem.slug)}
                                        interactive
                                        className="problem-card"
                                    >
                                        <DifficultyBadge level={problem.difficulty} />
                                        <h3 className="problem-card__title">{problem.title}</h3>
                                        <div className="row row-wrap" style={{ gap: 4 }}>
                                            {(problem.tags || []).slice(0, 3).map((tag) => (
                                                <span key={tag} className="problem-card__tag">{tag}</span>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* ── Pathways ──────────────────────────────────── */}

                    {show("pathways") && matchedTopics.length > 0 && (
                        <motion.section className="stack stack-4" variants={riseChild}>
                            <h2 className="oracle__heading">
                                <Icons.LuRoute size={16} aria-hidden="true" />
                                Topics
                                <Badge tone="neutral">{matchedTopics.length}</Badge>
                            </h2>

                            <div className="autogrid" style={{ "--min": "250px" }}>
                                {matchedTopics.map((topic) => (
                                    <Card
                                        key={topic._id}
                                        to={MODULE.pathways.path}
                                        interactive
                                        className="oracle__module"
                                    >
                                        <span className="oracle__module-icon" aria-hidden="true">
                                            <Icons.LuRoute size={16} />
                                        </span>
                                        <div className="stack stack-1" style={{ minWidth: 0 }}>
                                            <strong className="truncate">{topic._id}</strong>
                                            <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                                                {topic.count} problems
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* ── Constellations ────────────────────────────── */}

                    {show("constellations") && matchedCompanies.length > 0 && (
                        <motion.section className="stack stack-4" variants={riseChild}>
                            <h2 className="oracle__heading">
                                <Icons.LuOrbit size={16} aria-hidden="true" />
                                Companies
                                <Badge tone="neutral">{matchedCompanies.length}</Badge>
                            </h2>

                            <div className="autogrid" style={{ "--min": "250px" }}>
                                {matchedCompanies.map((company) => (
                                    <Card
                                        key={company._id}
                                        to={MODULE.constellations.path}
                                        interactive
                                        className="oracle__module"
                                    >
                                        <span className="oracle__module-icon" aria-hidden="true">
                                            <Icons.LuOrbit size={16} />
                                        </span>
                                        <div className="stack stack-1" style={{ minWidth: 0 }}>
                                            <strong className="truncate">{company._id}</strong>
                                            <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                                                {company.count} problems
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* ── Threads ───────────────────────────────────── */}

                    {show("threads") && threadHits.length > 0 && (
                        <motion.section className="stack stack-4" variants={riseChild}>
                            <h2 className="oracle__heading">
                                <Icons.LuMessagesSquare size={16} aria-hidden="true" />
                                Threads
                                <Badge tone="neutral">{threadHits.length}</Badge>
                            </h2>

                            <div className="stack stack-3">
                                {threadHits.map((thread) => (
                                    <Card key={thread.id} to={MODULE.nexus.path} interactive>
                                        <div className="row row-between row-wrap" style={{ gap: "var(--sp-3)" }}>
                                            <strong>{thread.title}</strong>
                                            <span className="text-faint" style={{ fontSize: "var(--fs-xs)" }}>
                                                {relativeTime(thread.at)}
                                            </span>
                                        </div>
                                        <p className="text-muted clamp-2" style={{ fontSize: "var(--fs-sm)", marginTop: "var(--sp-2)" }}>
                                            {thread.body}
                                        </p>
                                    </Card>
                                ))}
                            </div>
                        </motion.section>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Oracle;
