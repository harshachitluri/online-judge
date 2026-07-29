import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE } from "../config/brand";
import { fetchSignals, markRead, markAllRead } from "../services/signals";
import { useAsync } from "../hooks";
import { relativeTime, dateTime, duration } from "../lib/format";
import { languageMeta } from "../lib/domain";
import {
    Button, Badge, Segmented, SkeletonGrid, EmptyState, ErrorState
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | Signals — the notification feed
 |==========================================================================
 | Derived from the user's own submissions rather than a notifications
 | table, so every entry corresponds to something that genuinely happened.
 | Read state is per-device.
 */

const TONE_ICON = {
    good: "LuCircleCheck",
    critical: "LuCircleX",
    warning: "LuTimer",
    serious: "LuTriangleAlert",
    info: "LuLoader"
};

const Signals = () => {
    const { data, loading, error, reload, setData } = useAsync(
        () => fetchSignals({ limit: 40 }),
        []
    );

    const [filter, setFilter] = useState("all");

    const signals = useMemo(() => data || [], [data]);

    const filtered = useMemo(() => {
        if (filter === "unread") return signals.filter((s) => !s.read);
        if (filter === "accepted") return signals.filter((s) => s.tone === "good");
        if (filter === "failed") return signals.filter((s) => s.tone !== "good" && s.tone !== "info");
        return signals;
    }, [signals, filter]);

    const unread = signals.filter((s) => !s.read).length;

    /* Optimistic: read state is device-local, so there is no request that
       could fail and no reason to wait for one. */
    const readOne = (id) => {
        markRead([id]);
        setData((prev) => prev.map((s) => (s.id === id ? { ...s, read: true } : s)));
    };

    const readAll = () => {
        markAllRead(signals);
        setData((prev) => prev.map((s) => ({ ...s, read: true })));
    };

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.signals.group}
                title={MODULE.signals.label}
                description="Every verdict the judge returned, newest first. Read state is stored on this device."
                actions={
                    <>
                        <Segmented
                            items={[
                                { id: "all", label: "All" },
                                { id: "unread", label: unread ? `Unread (${unread})` : "Unread" },
                                { id: "accepted", label: "Accepted" },
                                { id: "failed", label: "Failed" }
                            ]}
                            value={filter}
                            onChange={setFilter}
                        />

                        <Button
                            variant="secondary"
                            icon={Icons.LuCheckCheck}
                            onClick={readAll}
                            disabled={unread === 0}
                        >
                            Mark all read
                        </Button>
                    </>
                }
            />

            {error ? (
                <ErrorState
                    title="Notifications didn't load"
                    body="The feed is built from your submission history, which couldn't be fetched."
                    onRetry={reload}
                />
            ) : loading ? (
                <SkeletonGrid count={5} min={520} lines={1} showMeta={false} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={signals.length ? Icons.LuInbox : Icons.LuBellOff}
                    title={signals.length ? "Nothing in this filter" : "No notifications yet"}
                    body={
                        signals.length
                            ? "Try a different filter — there are notifications in the other views."
                            : "Notifications are generated from judge verdicts. Submit a solution and the first one arrives immediately."
                    }
                    action={
                        signals.length ? (
                            <Button variant="secondary" onClick={() => setFilter("all")}>
                                Show everything
                            </Button>
                        ) : (
                            <Button variant="primary" to={MODULE.vault.path}>
                                Browse Problems
                            </Button>
                        )
                    }
                />
            ) : (
                <motion.ul
                    className="stack stack-2"
                    variants={staggerParent(0.035)}
                    initial="initial"
                    animate="animate"
                >
                    {filtered.map((signal) => {
                        const Icon = Icons[signal.icon] || Icons[TONE_ICON[signal.tone]] || Icons.LuBell;

                        return (
                            <motion.li key={signal.id} variants={riseChild}>
                                <Link
                                    to={signal.href}
                                    className={`signal signal--${signal.tone} ${signal.read ? "signal--read" : ""}`}
                                    onClick={() => readOne(signal.id)}
                                >
                                    <span className="signal__icon" aria-hidden="true">
                                        <Icon size={16} />
                                    </span>

                                    <div className="stack stack-1" style={{ flex: 1, minWidth: 0 }}>
                                        <span className="signal__title truncate">
                                            {signal.title}
                                        </span>
                                        <span className="signal__body">{signal.body}</span>

                                        <div className="row row-wrap" style={{ gap: "var(--sp-2)", marginTop: 2 }}>
                                            <Badge tone="neutral">
                                                {languageMeta(signal.meta.language).label}
                                            </Badge>
                                            {signal.meta.runtime > 0 && (
                                                <Badge tone="neutral" icon={Icons.LuTimer}>
                                                    {duration(signal.meta.runtime)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="signal__side">
                                        {!signal.read && (
                                            <span className="signal__dot" aria-label="Unread" />
                                        )}
                                        <span
                                            className="signal__when"
                                            title={dateTime(signal.at)}
                                        >
                                            {relativeTime(signal.at)}
                                        </span>
                                    </div>
                                </Link>
                            </motion.li>
                        );
                    })}
                </motion.ul>
            )}

            {signals.length > 0 && (
                <p className="board-note">
                    <Icons.LuInfo size={13} aria-hidden="true" />
                    Notifications are derived from your submission history rather than a
                    separate notification store, so read state lives in this browser and
                    won't follow you to another device.
                </p>
            )}
        </div>
    );
};

export default Signals;
