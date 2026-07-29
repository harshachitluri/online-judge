import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, tierFor } from "../config/brand";
import { fetchLeaderboard } from "../services/account";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks";
import { number as fmtNumber, absoluteDate } from "../lib/format";
import {
    Button, Badge, Avatar, Input, StatTile,
    SkeletonRows, EmptyState, ErrorState, Segmented
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Ascendancy — the leaderboard
 |==========================================================================
 | Ranked by *unique problems solved*, with total accepted submissions as the
 | tiebreaker. That ordering is deliberate: ranking by submission volume
 | would reward resubmitting the same solved problem, which is the opposite
 | of what the board should encourage.
 */

/* The top three get a podium. Everyone else gets a row — a podium of ten
   is just a list with extra decoration. */
const MEDALS = [
    { icon: Icons.LuTrophy, color: "var(--series-4)", label: "1st" },
    { icon: Icons.LuMedal,  color: "var(--text-secondary)", label: "2nd" },
    { icon: Icons.LuAward,  color: "var(--series-2)", label: "3rd" }
];

const Podium = ({ entries, currentUserId }) => (
    <motion.div
        className="podium"
        variants={staggerParent(0.1)}
        initial="initial"
        animate="animate"
    >
        {entries.map((entry, i) => {
            const medal = MEDALS[i];
            const MedalIcon = medal.icon;
            const tier = tierFor(entry.solvedCount);
            const isMe = entry.userId === currentUserId;

            return (
                <motion.div
                    key={entry.userId}
                    className={`podium__slot podium__slot--${i + 1} ${isMe ? "podium__slot--me" : ""}`}
                    variants={riseChild}
                >
                    <span className="podium__medal" style={{ color: medal.color }} aria-hidden="true">
                        <MedalIcon size={22} />
                    </span>

                    <Avatar name={entry.username} size="lg" ring={i === 0} />

                    <div className="stack stack-1" style={{ alignItems: "center", minWidth: 0 }}>
                        <span className="podium__name truncate">
                            {entry.username}
                            {isMe && <span className="podium__you"> you</span>}
                        </span>
                        <Badge tone="neutral">{tier.current.label}</Badge>
                    </div>

                    <div className="podium__stats">
                        <span className="podium__solved tnum">{fmtNumber(entry.solvedCount)}</span>
                        <span className="podium__label">problems solved</span>
                    </div>

                    <span className="podium__rank" aria-hidden="true">{medal.label}</span>
                </motion.div>
            );
        })}
    </motion.div>
);

const Ascendancy = () => {
    const { user } = useAuth();
    const [limit, setLimit] = useState(50);
    const [query, setQuery] = useState("");

    const { data, loading, error, reload } = useAsync(
        () => fetchLeaderboard(limit),
        [limit]
    );

    const entries = useMemo(() => data || [], [data]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? entries.filter((e) => e.username.toLowerCase().includes(q)) : entries;
    }, [entries, query]);

    const myEntry = useMemo(
        () => entries.find((e) => e.userId === user?._id),
        [entries, user]
    );

    /* Aggregate figures across the visible board — honest about their scope:
       these describe the ranked users, not every account. */
    const totals = useMemo(
        () => ({
            solvers: entries.length,
            solved: entries.reduce((sum, e) => sum + e.solvedCount, 0),
            accepted: entries.reduce((sum, e) => sum + e.acceptedCount, 0)
        }),
        [entries]
    );

    const podium = query ? [] : filtered.slice(0, 3);
    const rest = query ? filtered : filtered.slice(3);

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.ascendancy.group}
                title={MODULE.ascendancy.label}
                description="Ranked by unique problems conquered — not by how many times you pressed submit. Ties break on total accepted submissions."
                actions={
                    <Segmented
                        items={[
                            { id: 20, label: "Top 20" },
                            { id: 50, label: "Top 50" },
                            { id: 100, label: "Top 100" }
                        ]}
                        value={limit}
                        onChange={setLimit}
                    />
                }
            >
                {!loading && entries.length > 0 && (
                    <div className="autogrid" style={{ "--min": "200px" }}>
                        <StatTile
                            label="Ranked solvers"
                            value={fmtNumber(totals.solvers)}
                            icon={Icons.LuUsers}
                            sub="With at least one accept"
                            accent="var(--brand-violet)"
                        />
                        <StatTile
                            label="Problems solved"
                            value={fmtNumber(totals.solved)}
                            icon={Icons.LuTarget}
                            sub="Across the ranked board"
                            accent="var(--series-3)"
                        />
                        <StatTile
                            label="Accepted submissions"
                            value={fmtNumber(totals.accepted)}
                            icon={Icons.LuCircleCheck}
                            sub="Across the ranked board"
                            accent="var(--series-4)"
                        />
                        <StatTile
                            label="Your standing"
                            value={myEntry ? `#${myEntry.rank}` : "Unranked"}
                            icon={Icons.LuUserRound}
                            sub={
                                myEntry
                                    ? `${fmtNumber(myEntry.solvedCount)} solved`
                                    : "Solve one problem to enter"
                            }
                            accent="var(--brand-cyan)"
                        />
                    </div>
                )}
            </PageHeader>

            {error ? (
                <ErrorState
                    title="The board didn't load"
                    body="Standings couldn't be fetched from the judge."
                    onRetry={reload}
                />
            ) : loading ? (
                <SkeletonRows rows={10} cols={4} />
            ) : entries.length === 0 ? (
                <EmptyState
                    icon={Icons.LuTrophy}
                    title="Nobody has ranked yet"
                    body="The board populates as soon as the first problem is accepted. That could be you."
                    action={<Button variant="primary" to={MODULE.vault.path}>Browse Problems</Button>}
                />
            ) : (
                <>
                    {podium.length === 3 && (
                        <Podium entries={podium} currentUserId={user?._id} />
                    )}

                    <div className="row row-between row-wrap" style={{ margin: "var(--sp-8) 0 var(--sp-4)" }}>
                        <h2 style={{ fontSize: "var(--fs-lg)" }}>
                            {query ? "Matching solvers" : "Full standings"}
                        </h2>

                        <Input
                            type="search"
                            placeholder="Find a handle…"
                            leadingIcon={Icons.LuSearch}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Search the leaderboard"
                            style={{ maxWidth: 260 }}
                        />
                    </div>

                    {rest.length === 0 ? (
                        <EmptyState
                            icon={Icons.LuSearchX}
                            title="No handle matches that"
                            body="Only the ranked window is searchable — try widening it to Top 100."
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th scope="col" style={{ width: 72 }}>Rank</th>
                                        <th scope="col">Solver</th>
                                        <th scope="col">Tier</th>
                                        <th scope="col" className="table__num">Solved</th>
                                        <th scope="col" className="table__num">Accepted</th>
                                        <th scope="col">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rest.map((entry) => {
                                        const tier = tierFor(entry.solvedCount);
                                        const isMe = entry.userId === user?._id;

                                        return (
                                            <tr
                                                key={entry.userId}
                                                className={isMe ? "row--me" : undefined}
                                            >
                                                <td>
                                                    <span className="rank-cell tnum">
                                                        {entry.rank}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="row" style={{ gap: "var(--sp-3)" }}>
                                                        <Avatar name={entry.username} size="sm" />
                                                        <span style={{ fontWeight: "var(--fw-medium)" }}>
                                                            {entry.username}
                                                        </span>
                                                        {isMe && <Badge tone="brand">You</Badge>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span
                                                        className="tier-chip"
                                                        style={{ color: tier.current.accent }}
                                                    >
                                                        <span
                                                            className="progress-row__dot"
                                                            style={{ background: "currentColor" }}
                                                            aria-hidden="true"
                                                        />
                                                        {tier.current.label}
                                                    </span>
                                                </td>
                                                <td className="table__num tnum">
                                                    {fmtNumber(entry.solvedCount)}
                                                </td>
                                                <td className="table__num tnum">
                                                    {fmtNumber(entry.acceptedCount)}
                                                </td>
                                                <td className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                                    {absoluteDate(entry.joinedAt)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <p className="board-note">
                        <Icons.LuInfo size={13} aria-hidden="true" />
                        The board shows the top {limit} solvers. Aggregate figures above
                        describe that window, not every account on the platform.
                    </p>
                </>
            )}
        </div>
    );
};

export default Ascendancy;
