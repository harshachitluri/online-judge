import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE } from "../config/brand";
import { fetchTopics, fetchCompanies } from "../services/judge";
import { fetchProgress } from "../services/account";
import { useAsync } from "../hooks";
import { difficultyMeta, DIFFICULTY_ORDER } from "../lib/domain";
import { number as fmtNumber } from "../lib/format";
import {
    Card, Button, Badge, Input, ProgressBar,
    SkeletonGrid, EmptyState, ErrorState, Segmented
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { CompositionBar } from "../components/charts";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Pathways & Constellations
 |==========================================================================
 | Two views over the same archive: by topic (a learning sequence) and by
 | company (an interview target). They share a chunk because they share
 | nearly all of their structure — the difference is the grouping key.
 */

/* ── Shared track card ─────────────────────────────────────────────────── */

const TrackCard = ({ track, progress, to, accentIcon: Icon }) => {
    const solved = progress?.solved ?? 0;
    const total = progress?.total ?? track.count;
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    const complete = total > 0 && solved === total;

    /* Difficulty mix inside this track — how hard the road actually is. */
    const mix = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        track.problems.forEach((p) => {
            if (counts[p.difficulty] !== undefined) counts[p.difficulty] += 1;
        });

        return DIFFICULTY_ORDER.map((level) => ({
            label: level,
            value: counts[level],
            color: difficultyMeta(level).color
        }));
    }, [track.problems]);

    return (
        <motion.div variants={riseChild}>
            <Card size="lg" className={`track ${complete ? "track--complete" : ""}`}>
                <div className="track__head">
                    <span className="track__icon" aria-hidden="true">
                        <Icon size={18} />
                    </span>

                    <div className="stack stack-1" style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="track__title">{track._id}</h3>
                        <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                            {fmtNumber(track.count)} {track.count === 1 ? "problem" : "problems"}
                        </span>
                    </div>

                    {complete ? (
                        <Badge tone="good" icon={Icons.LuCircleCheck} size="lg">
                            Complete
                        </Badge>
                    ) : (
                        <span className="track__pct tnum">{pct}%</span>
                    )}
                </div>

                <div className="stack stack-2">
                    <ProgressBar
                        value={solved}
                        max={total || 1}
                        label={`${solved} of ${total} solved`}
                        color={complete ? "var(--status-good)" : undefined}
                        thin
                    />
                    <div className="row row-between" style={{ fontSize: "var(--fs-2xs)", color: "var(--text-muted)" }}>
                        <span className="tnum">{fmtNumber(solved)} solved</span>
                        <span className="tnum">{fmtNumber(Math.max(0, total - solved))} remaining</span>
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

                {/* A page, not an accordion. Unrolling a hundred problems
                    inside a grid cell reflows every card around it and gives
                    the reader no way to search within what just appeared. */}
                <Button
                    variant="secondary"
                    size="sm"
                    to={to}
                    trailingIcon={Icons.LuArrowRight}
                    block
                >
                    Open {track.count === 1 ? "1 problem" : `${fmtNumber(track.count)} problems`}
                </Button>
            </Card>
        </motion.div>
    );
};

/* ── Shared page frame ─────────────────────────────────────────────────── */

const TrackPage = ({
    module, noun, description, icon, fetcher, progressKey, progressField, emptyBody
}) => {
    const tracks = useAsync(fetcher, []);
    const progress = useAsync(fetchProgress, []);

    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("progress");

    /* Progress rows keyed by track name, so a card can find its own row. */
    const progressMap = useMemo(() => {
        const rows = progress.data?.[progressKey] || [];
        return new Map(rows.map((r) => [r[progressField], r]));
    }, [progress.data, progressKey, progressField]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = (tracks.data || []).filter((t) => t._id.toLowerCase().includes(q));

        const sorted = list.slice();

        if (sort === "progress") {
            // Least-complete first: the point of this page is finding the
            // next thing to work on, not admiring finished tracks.
            sorted.sort((a, b) => {
                const pa = progressMap.get(a._id)?.percentage ?? 0;
                const pb = progressMap.get(b._id)?.percentage ?? 0;
                return pa - pb;
            });
        } else if (sort === "size") {
            sorted.sort((a, b) => b.count - a.count);
        } else {
            sorted.sort((a, b) => a._id.localeCompare(b._id));
        }

        return sorted;
    }, [tracks.data, query, sort, progressMap]);

    const totals = useMemo(() => {
        const rows = progress.data?.[progressKey] || [];
        return {
            complete: rows.filter((r) => r.completed).length,
            started: rows.filter((r) => r.solved > 0 && !r.completed).length,
            all: rows.length
        };
    }, [progress.data, progressKey]);

    const Icon = Icons[icon] || Icons.LuCircleDot;

    return (
        <div className="shell">
            <PageHeader
                eyebrow={module.group}
                title={module.label}
                description={description}
                actions={
                    <Segmented
                        items={[
                            { id: "progress", label: "Least complete" },
                            { id: "size", label: "Largest" },
                            { id: "name", label: "A→Z" }
                        ]}
                        value={sort}
                        onChange={setSort}
                    />
                }
            >
                <div className="row row-wrap" style={{ gap: "var(--sp-3)" }}>
                    <Input
                        type="search"
                        placeholder={`Filter ${noun}…`}
                        leadingIcon={Icons.LuSearch}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label={`Filter ${noun}`}
                        style={{ maxWidth: 380 }}
                    />

                    {totals.all > 0 && (
                        <div className="row" style={{ gap: "var(--sp-2)" }}>
                            <Badge tone="good" icon={Icons.LuCircleCheck}>
                                {totals.complete} complete
                            </Badge>
                            <Badge tone="brand" icon={Icons.LuLoader}>
                                {totals.started} in progress
                            </Badge>
                        </div>
                    )}
                </div>
            </PageHeader>

            {tracks.error ? (
                <ErrorState
                    title={`${module.label} didn't load`}
                    body="The archive grouping couldn't be fetched."
                    onRetry={tracks.reload}
                />
            ) : tracks.loading ? (
                <SkeletonGrid count={6} min={320} lines={3} />
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={Icon}
                    title={query ? "Nothing matches that filter" : `No ${noun} yet`}
                    body={query ? "Try a shorter or different phrase." : emptyBody}
                    action={
                        query ? (
                            <Button variant="secondary" onClick={() => setQuery("")}>
                                Clear filter
                            </Button>
                        ) : (
                            <Button variant="primary" to={MODULE.vault.path}>
                                Browse Problems
                            </Button>
                        )
                    }
                />
            ) : (
                <motion.div
                    className="autogrid"
                    style={{ "--min": "360px", "--gap": "var(--sp-5)" }}
                    variants={staggerParent(0.05)}
                    initial="initial"
                    animate="animate"
                >
                    {visible.map((track) => (
                        <TrackCard
                            key={track._id}
                            track={track}
                            progress={progressMap.get(track._id)}
                            // encodeURIComponent, because a track name is free
                            // text — "C++", "Goldman Sachs" and anything with a
                            // slash in it all have to survive the round trip.
                            to={`${module.path}/${encodeURIComponent(track._id)}`}
                            accentIcon={Icon}
                        />
                    ))}
                </motion.div>
            )}
        </div>
    );
};

/* ── Exports ───────────────────────────────────────────────────────────── */

export const Pathways = () => (
    <TrackPage
        module={MODULE.pathways}
        noun="topics"
        description="Topic tracks that sequence the archive from basics to advanced. Work down a topic and the next problem is always the right next problem."
        icon="LuRoute"
        fetcher={fetchTopics}
        progressKey="topics"
        progressField="topic"
        emptyBody="No problems have been assigned to a topic yet. An admin sets a topic category when authoring a problem."
    />
);

export const Constellations = () => (
    <TrackPage
        module={MODULE.constellations}
        noun="companies"
        description="Problem sets mapped to the companies known to ask them. Useful for a specific interview loop; a poor substitute for actually understanding the technique."
        icon="LuOrbit"
        fetcher={fetchCompanies}
        progressKey="companies"
        progressField="company"
        emptyBody="No problems have been tagged with a company yet."
    />
);
