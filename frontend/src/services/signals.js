import { fetchMySubmissions } from "./judge";

/*
 |==========================================================================
 | Signals — the notification feed
 |==========================================================================
 | There is no notifications table on the API yet, so rather than invent a
 | feed, Signals *derives* one from data that is genuinely the user's: their
 | own submission history. Every entry here corresponds to something that
 | actually happened.
 |
 | Read state is local to the device (localStorage). When a real
 | /api/signals endpoint lands, only `fetchSignals` needs to change.
 */

const READ_KEY = "axiom.signals.read";

const readSet = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch {
        return new Set();
    }
};

const persist = (set) => {
    try {
        localStorage.setItem(READ_KEY, JSON.stringify([...set]));
    } catch { /* private mode — read state simply won't persist */ }
};

const VERDICT_SIGNAL = {
    "Accepted": {
        tone: "good",
        icon: "LuCircleCheck",
        title: (p) => `Accepted — ${p}`,
        body: "Your solution passed every test case."
    },
    "Wrong Answer": {
        tone: "critical",
        icon: "LuCircleX",
        title: (p) => `Wrong Answer — ${p}`,
        body: "Output diverged from the expected result on at least one case."
    },
    "Time Limit Exceeded": {
        tone: "warning",
        icon: "LuTimer",
        title: (p) => `Time Limit Exceeded — ${p}`,
        body: "Correct shape, too slow. Ask Sage for a complexity estimate."
    },
    "Compilation Error": {
        tone: "serious",
        icon: "LuTriangleAlert",
        title: (p) => `Compilation Error — ${p}`,
        body: "The judge could not build your submission."
    },
    "Runtime Error": {
        tone: "serious",
        icon: "LuTriangleAlert",
        title: (p) => `Runtime Error — ${p}`,
        body: "Execution crashed — check bounds and null handling."
    },
    "Memory Limit Exceeded": {
        tone: "warning",
        icon: "LuDatabase",
        title: (p) => `Memory Limit Exceeded — ${p}`,
        body: "Your solution allocated more than the problem allows."
    },
    "Pending": {
        tone: "info",
        icon: "LuLoader",
        title: (p) => `Queued — ${p}`,
        body: "The judge has your submission and is working through the queue."
    }
};

/**
 * Builds the feed from the most recent submissions.
 * @returns {Array<{id, tone, icon, title, body, at, read, href}>}
 */
export const fetchSignals = async ({ limit = 30 } = {}) => {
    const data = await fetchMySubmissions({ limit });
    const seen = readSet();

    return (data?.submissions || []).map((s) => {
        const meta = VERDICT_SIGNAL[s.verdict] || VERDICT_SIGNAL.Pending;
        const problemTitle = s.problemId?.title || "a problem";

        return {
            id: s._id,
            tone: meta.tone,
            icon: meta.icon,
            title: meta.title(problemTitle),
            body: meta.body,
            at: s.createdAt,
            read: seen.has(s._id),
            href: s.problemId?.slug ? `/forge/${s.problemId.slug}` : "/chronicle",
            meta: {
                language: s.language,
                verdict: s.verdict,
                runtime: s.executionTime
            }
        };
    });
};

export const markRead = (ids = []) => {
    const set = readSet();
    ids.forEach((id) => set.add(id));
    persist(set);
};

export const markAllRead = (signals = []) => {
    markRead(signals.map((s) => s.id));
};

export const unreadCount = (signals = []) =>
    signals.filter((s) => !s.read).length;
