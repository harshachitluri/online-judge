import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE } from "../config/brand";
import {
    CHANNELS, listThreads, createThread, addReply, toggleVote, votedIds
} from "../services/nexus";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDebounced } from "../hooks";
import { relativeTime } from "../lib/format";
import {
    Button, Badge, Avatar, Chip, Input, TextArea, Field,
    Modal, SkeletonGrid, EmptyState, PreviewBadge
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { staggerParent, riseChild } from "../lib/motion";

/*
 |==========================================================================
 | The Nexus — discussions
 |==========================================================================
 | Threads are stored locally on this device (see services/nexus.js). Posting
 | and replying genuinely work and survive a reload; they just aren't shared
 | with anyone else, and the page says so rather than implying a community
 | that isn't there.
 */

const Thread = ({ thread, voted, onVote, onReply, currentUser }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [posting, setPosting] = useState(false);

    const channel = CHANNELS.find((c) => c.id === thread.channel);
    const ChannelIcon = Icons[channel?.icon] || Icons.LuMessageSquare;

    const submitReply = async (event) => {
        event.preventDefault();
        if (!draft.trim()) return;

        setPosting(true);
        await onReply(thread.id, draft);
        setDraft("");
        setPosting(false);
    };

    return (
        <motion.article className="thread" variants={riseChild}>
            <button
                type="button"
                className={`thread__vote ${voted ? "thread__vote--on" : ""}`}
                onClick={() => onVote(thread.id)}
                aria-pressed={voted}
                aria-label={voted ? "Remove your upvote" : "Upvote this thread"}
            >
                <Icons.LuChevronUp size={16} aria-hidden="true" />
                <span className="tnum">{thread.votes}</span>
            </button>

            <div className="stack stack-3" style={{ flex: 1, minWidth: 0 }}>
                <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                    <Badge tone="brand" icon={ChannelIcon}>{channel?.label || thread.channel}</Badge>
                    {thread.seeded && (
                        <PreviewBadge
                            label="Sample thread"
                            title="Seeded illustrative content, not a post by a real user."
                        />
                    )}
                    {thread.tags.map((tag) => (
                        <Badge key={tag} tone="neutral">{tag}</Badge>
                    ))}
                </div>

                <h3 className="thread__title">{thread.title}</h3>

                <p className={`thread__body ${open ? "" : "clamp-3"}`}>{thread.body}</p>

                <div className="thread__foot">
                    <span className="row" style={{ gap: "var(--sp-2)" }}>
                        <Avatar name={thread.author} size="xs" />
                        <span className="text-muted">{thread.author}</span>
                    </span>

                    <span className="text-faint">·</span>
                    <span className="text-faint">{relativeTime(thread.at)}</span>

                    <span className="spacer" />

                    <Button
                        variant="ghost"
                        size="xs"
                        icon={Icons.LuMessageSquare}
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                    >
                        {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
                    </Button>
                </div>

                <AnimatePresence initial={false}>
                    {open && (
                        <motion.div
                            className="thread__replies"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {thread.replies.map((reply) => (
                                <div key={reply.id} className="reply">
                                    <Avatar name={reply.author} size="xs" />
                                    <div className="stack stack-1" style={{ minWidth: 0 }}>
                                        <span className="reply__meta">
                                            <strong>{reply.author}</strong>
                                            <span className="text-faint"> · {relativeTime(reply.at)}</span>
                                        </span>
                                        <p className="reply__body">{reply.body}</p>
                                    </div>
                                </div>
                            ))}

                            <form className="reply-form" onSubmit={submitReply}>
                                <Avatar name={currentUser?.username} size="xs" />
                                <Input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder="Add your take…"
                                    aria-label="Write a reply"
                                />
                                <Button
                                    as="button"
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                    iconOnly
                                    icon={Icons.LuSend}
                                    loading={posting}
                                    disabled={!draft.trim()}
                                    aria-label="Post reply"
                                />
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.article>
    );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Nexus = () => {
    const { user } = useAuth();
    const toast = useToast();

    const [channel, setChannel] = useState("all");
    const [query, setQuery] = useState("");
    const [composing, setComposing] = useState(false);
    const [votes, setVotes] = useState(() => votedIds());

    const debounced = useDebounced(query, 250);

    const { data, loading, setData, reload } = useAsync(
        () => listThreads({ channel, query: debounced }),
        [channel, debounced]
    );

    const threads = useMemo(() => data || [], [data]);

    const onVote = useCallback(
        async (threadId) => {
            const { threads: next, voted } = await toggleVote(threadId);
            setVotes(votedIds());

            // Re-apply the current filter to the fresh list rather than
            // re-fetching — the store is synchronous and local.
            setData(
                next
                    .filter((t) => channel === "all" || t.channel === channel)
                    .sort((a, b) => b.at - a.at)
            );

            return voted;
        },
        [channel, setData]
    );

    const onReply = useCallback(
        async (threadId, body) => {
            await addReply(threadId, { body, author: user?.username || "you" });
            reload();
        },
        [user, reload]
    );

    const counts = useMemo(() => {
        const map = {};
        threads.forEach((t) => {
            map[t.channel] = (map[t.channel] || 0) + 1;
        });
        return map;
    }, [threads]);

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.nexus.group}
                title={MODULE.nexus.label}
                description="Approaches, editorials, and the debugging questions nobody wants to ask out loud."
                actions={
                    <Button variant="primary" icon={Icons.LuPlus} onClick={() => setComposing(true)}>
                        Start a thread
                    </Button>
                }
            >
                <div className="arena__notice">
                    <Icons.LuHardDrive size={16} aria-hidden="true" />
                    <div className="stack stack-1">
                        <strong style={{ fontSize: "var(--fs-sm)" }}>
                            Threads are stored on this device
                        </strong>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                            Discussions has no server behind it yet. What you post here is real —
                            it persists across reloads and you can reply to and vote on it — but
                            it stays on this browser and nobody else can see it.
                        </span>
                    </div>
                </div>

                <div className="row row-wrap" style={{ gap: "var(--sp-3)" }}>
                    <Input
                        type="search"
                        placeholder="Search threads…"
                        leadingIcon={Icons.LuSearch}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search threads"
                        style={{ maxWidth: 340 }}
                    />
                </div>

                <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                    <Chip active={channel === "all"} onClick={() => setChannel("all")}>
                        All channels
                    </Chip>

                    {CHANNELS.map((c) => {
                        const Icon = Icons[c.icon] || Icons.LuHash;
                        return (
                            <Chip
                                key={c.id}
                                icon={Icon}
                                active={channel === c.id}
                                count={counts[c.id]}
                                onClick={() => setChannel(c.id)}
                                title={c.blurb}
                            >
                                {c.label}
                            </Chip>
                        );
                    })}
                </div>
            </PageHeader>

            {loading ? (
                <SkeletonGrid count={3} min={520} lines={3} />
            ) : threads.length === 0 ? (
                <EmptyState
                    icon={Icons.LuMessagesSquare}
                    title={query ? "No threads match that" : "This channel is quiet"}
                    body={
                        query
                            ? "Try a shorter phrase, or search across all channels."
                            : "Be the first to write something here."
                    }
                    action={
                        <Button variant="primary" icon={Icons.LuPlus} onClick={() => setComposing(true)}>
                            Start a thread
                        </Button>
                    }
                />
            ) : (
                <motion.div
                    className="stack stack-4"
                    variants={staggerParent(0.05)}
                    initial="initial"
                    animate="animate"
                >
                    {threads.map((thread) => (
                        <Thread
                            key={thread.id}
                            thread={thread}
                            voted={votes.has(thread.id)}
                            onVote={onVote}
                            onReply={onReply}
                            currentUser={user}
                        />
                    ))}
                </motion.div>
            )}

            <Composer
                open={composing}
                onClose={() => setComposing(false)}
                onCreated={() => {
                    setComposing(false);
                    reload();
                    toast.success("Thread posted", "Saved to this device.");
                }}
                author={user?.username || "you"}
            />
        </div>
    );
};

/* ── Composer ──────────────────────────────────────────────────────────── */

const Composer = ({ open, onClose, onCreated, author }) => {
    const [channel, setChannel] = useState("approaches");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [tags, setTags] = useState("");
    const [posting, setPosting] = useState(false);
    const [touched, setTouched] = useState(false);

    const titleError = touched && title.trim().length < 6 ? "At least 6 characters." : undefined;
    const bodyError = touched && body.trim().length < 20 ? "Say a bit more — at least 20 characters." : undefined;

    const submit = async (event) => {
        event.preventDefault();
        setTouched(true);
        if (title.trim().length < 6 || body.trim().length < 20) return;

        setPosting(true);
        await createThread({
            channel,
            title,
            body,
            tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
            author
        });

        setTitle("");
        setBody("");
        setTags("");
        setTouched(false);
        setPosting(false);
        onCreated();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Start a thread"
            description="Posted to this device only, until the Nexus has a server."
            wide
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={posting} icon={Icons.LuSend}>
                        Post thread
                    </Button>
                </>
            }
        >
            <form className="stack stack-4" onSubmit={submit}>
                <Field label="Channel" required>
                    {() => (
                        <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                            {CHANNELS.map((c) => {
                                const Icon = Icons[c.icon] || Icons.LuHash;
                                return (
                                    <Chip
                                        key={c.id}
                                        icon={Icon}
                                        active={channel === c.id}
                                        onClick={() => setChannel(c.id)}
                                    >
                                        {c.label}
                                    </Chip>
                                );
                            })}
                        </div>
                    )}
                </Field>

                <Field label="Title" error={titleError} required>
                    {(aria) => (
                        <Input
                            {...aria}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What did you figure out?"
                        />
                    )}
                </Field>

                <Field label="Body" error={bodyError} required>
                    {(aria) => (
                        <TextArea
                            {...aria}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Explain the approach, the failing case, or the question. Be specific — vague posts get vague answers."
                            style={{ minHeight: 160 }}
                        />
                    )}
                </Field>

                <Field label="Tags" hint="Comma-separated, e.g. two pointers, c++">
                    {(aria) => (
                        <Input
                            {...aria}
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="dynamic programming, optimisation"
                        />
                    )}
                </Field>
            </form>
        </Modal>
    );
};

export default Nexus;
