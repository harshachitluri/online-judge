/*
 |==========================================================================
 | The Nexus — discussions
 |==========================================================================
 | The API has no discussions collection yet, so the Nexus runs against a
 | local persistence layer. Threads you post are real: they are stored, they
 | survive a reload, and you can reply to and upvote them.
 |
 | What it can't do is share them with anyone else — this is a single-device
 | store, and the UI says so. Swapping in a server means replacing the four
 | functions at the bottom of this file; the shapes are already the shapes a
 | REST resource would return.
 */

const STORE_KEY = "axiom.nexus.threads";

const read = () => {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const write = (threads) => {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(threads));
    } catch { /* private mode — the session still works, it just won't persist */ }
};

const uid = () =>
    `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const CHANNELS = [
    { id: "approaches",  label: "Approaches",  icon: "LuLightbulb",   blurb: "How people actually solved it" },
    { id: "editorials",  label: "Editorials",  icon: "LuScrollText",  blurb: "Long-form written solutions" },
    { id: "debugging",   label: "Debugging",   icon: "LuBug",         blurb: "Stuck on a failing case" },
    { id: "interviews",  label: "Interviews",  icon: "LuBriefcase",   blurb: "What the loop was really like" },
    { id: "meta",        label: "Meta",        icon: "LuCompass",     blurb: "Platform, feedback, everything else" }
];

/*
 | Seeded on first run so a brand-new account doesn't land on an empty page.
 | These are marked `seeded: true` and the UI labels them as sample threads —
 | they are illustrative content, not posts by real users.
 */
const SEED = [
    {
        id: "seed_1",
        channel: "approaches",
        title: "The two-pointer reformulation nobody mentions",
        body:
            "Most write-ups jump straight to the hash map, but if the array is " +
            "already sorted you can drop the auxiliary space entirely. Start one " +
            "index at each end and move whichever side is wrong. It's O(1) space " +
            "and, in my testing, meaningfully faster in practice because it's " +
            "cache-friendly — the map version thrashes on large inputs.",
        author: "sample thread",
        tags: ["two pointers", "arrays"],
        votes: 34,
        replies: [
            {
                id: "r1",
                author: "sample reply",
                body: "The sorted precondition is doing a lot of work here — if you have to sort first you've already paid O(n log n).",
                at: Date.now() - 1000 * 60 * 60 * 20
            }
        ],
        at: Date.now() - 1000 * 60 * 60 * 26,
        seeded: true
    },
    {
        id: "seed_2",
        channel: "debugging",
        title: "TLE on the last case only — what am I missing?",
        body:
            "Everything passes until test 47, then it times out. The algorithm is " +
            "O(n log n) so I don't think the approach is wrong. Is there something " +
            "about I/O speed I should know about?",
        author: "sample thread",
        tags: ["performance", "c++"],
        votes: 12,
        replies: [
            {
                id: "r2",
                author: "sample reply",
                body: "Nine times out of ten it's stream sync. Add ios_base::sync_with_stdio(false) and cin.tie(nullptr) and try again.",
                at: Date.now() - 1000 * 60 * 60 * 8
            }
        ],
        at: Date.now() - 1000 * 60 * 60 * 11,
        seeded: true
    },
    {
        id: "seed_3",
        channel: "interviews",
        title: "What actually gets asked vs. what people grind",
        body:
            "Having now been through six onsite loops: the exotic dynamic " +
            "programming problems basically never came up. What did come up, every " +
            "single time, was a medium-difficulty array or string problem where " +
            "they cared far more about how I talked through the edge cases than " +
            "whether I found the optimal solution in the first five minutes.",
        author: "sample thread",
        tags: ["interviews", "strategy"],
        votes: 88,
        replies: [],
        at: Date.now() - 1000 * 60 * 60 * 52,
        seeded: true
    }
];

const load = () => {
    const stored = read();
    if (stored) return stored;
    write(SEED);
    return SEED;
};

/* ── Public API (mirrors what a REST resource would expose) ────────────── */

export const listThreads = async ({ channel = "all", query = "" } = {}) => {
    const threads = load();
    const q = query.trim().toLowerCase();

    return threads
        .filter((t) => channel === "all" || t.channel === channel)
        .filter(
            (t) =>
                !q ||
                t.title.toLowerCase().includes(q) ||
                t.body.toLowerCase().includes(q) ||
                t.tags.some((tag) => tag.includes(q))
        )
        .sort((a, b) => b.at - a.at);
};

export const createThread = async ({ channel, title, body, tags = [], author }) => {
    const threads = load();

    const thread = {
        id: uid(),
        channel,
        title: title.trim(),
        body: body.trim(),
        tags: tags.filter(Boolean),
        author,
        votes: 0,
        replies: [],
        at: Date.now(),
        seeded: false
    };

    write([thread, ...threads]);
    return thread;
};

export const addReply = async (threadId, { body, author }) => {
    const threads = load().map((t) =>
        t.id === threadId
            ? {
                  ...t,
                  replies: [
                      ...t.replies,
                      { id: uid(), author, body: body.trim(), at: Date.now() }
                  ]
              }
            : t
    );

    write(threads);
    return threads.find((t) => t.id === threadId);
};

/** Toggles this device's vote — a second call removes it. */
export const toggleVote = async (threadId) => {
    const voted = new Set(JSON.parse(localStorage.getItem("axiom.nexus.votes") || "[]"));
    const isVoted = voted.has(threadId);

    isVoted ? voted.delete(threadId) : voted.add(threadId);
    localStorage.setItem("axiom.nexus.votes", JSON.stringify([...voted]));

    const threads = load().map((t) =>
        t.id === threadId ? { ...t, votes: t.votes + (isVoted ? -1 : 1) } : t
    );

    write(threads);
    return { voted: !isVoted, threads };
};

export const votedIds = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem("axiom.nexus.votes") || "[]"));
    } catch {
        return new Set();
    }
};
