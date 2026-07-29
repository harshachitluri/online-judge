/*
 |==========================================================================
 | Domain vocabulary
 |==========================================================================
 | Verdicts, languages, difficulties and streaks — the shared meaning layer
 | between the API's strings and how the UI renders them.
 |
 | Every entry pairs a colour with an icon *and* a label. Status colour never
 | travels alone: red and green are the same colour to a deuteranopic reader,
 | so the icon and the word are what actually carry the verdict.
 */

import { dayKey } from "./format";

/* ── Verdicts ──────────────────────────────────────────────────────────── */

export const VERDICTS = {
    "Accepted": {
        tone: "good",
        icon: "LuCircleCheck",
        short: "AC",
        color: "var(--status-good)",
        wash: "var(--good-wash)",
        blurb: "Every test case passed."
    },
    "Wrong Answer": {
        tone: "critical",
        icon: "LuCircleX",
        short: "WA",
        color: "var(--status-critical)",
        wash: "var(--critical-wash)",
        blurb: "Output differed from the expected result."
    },
    "Time Limit Exceeded": {
        tone: "warning",
        icon: "LuTimer",
        short: "TLE",
        color: "var(--status-warning)",
        wash: "var(--warning-wash)",
        blurb: "Ran longer than the problem's time budget."
    },
    "Memory Limit Exceeded": {
        tone: "warning",
        icon: "LuDatabase",
        short: "MLE",
        color: "var(--status-warning)",
        wash: "var(--warning-wash)",
        blurb: "Allocated more memory than the problem allows."
    },
    "Runtime Error": {
        tone: "serious",
        icon: "LuTriangleAlert",
        short: "RE",
        color: "var(--status-serious)",
        wash: "var(--serious-wash)",
        blurb: "The program crashed during execution."
    },
    "Compilation Error": {
        tone: "serious",
        icon: "LuFileWarning",
        short: "CE",
        color: "var(--status-serious)",
        wash: "var(--serious-wash)",
        blurb: "The judge could not build the submission."
    },
    "Pending": {
        tone: "info",
        icon: "LuLoader",
        short: "…",
        color: "var(--status-info)",
        wash: "var(--info-wash)",
        blurb: "Waiting for the judge."
    }
};

const UNKNOWN_VERDICT = {
    tone: "neutral",
    icon: "LuCircleHelp",
    short: "?",
    color: "var(--text-muted)",
    wash: "var(--surface-2)",
    blurb: "Unrecognised verdict."
};

export const verdictMeta = (verdict) => VERDICTS[verdict] || UNKNOWN_VERDICT;

/** Verdict order for charts — Accepted first, then failures by frequency. */
export const VERDICT_ORDER = [
    "Accepted",
    "Wrong Answer",
    "Time Limit Exceeded",
    "Runtime Error",
    "Compilation Error",
    "Memory Limit Exceeded",
    "Pending"
];

/* ── Languages ─────────────────────────────────────────────────────────── */

/*
 | Mirrors backend/src/config/languages.js — the judge can only execute what
 | the runner image ships. `javascript` is kept in the label map so that
 | submissions made before it was retired still render with a name.
 */
export const RUNNABLE_LANGUAGES = ["cpp", "java", "python"];

export const LANGUAGES = {
    cpp: {
        label: "C++",
        monaco: "cpp",
        extension: "cpp",
        // Categorical slot 1 — assigned by fixed order, never by rank.
        color: "var(--series-1)",
        comment: "//"
    },
    java: {
        label: "Java",
        monaco: "java",
        extension: "java",
        color: "var(--series-2)",
        comment: "//"
    },
    python: {
        label: "Python",
        monaco: "python",
        extension: "py",
        color: "var(--series-3)",
        comment: "#"
    },
    javascript: {
        label: "JavaScript",
        monaco: "javascript",
        extension: "js",
        color: "var(--series-other)",
        comment: "//"
    }
};

export const languageMeta = (id) =>
    LANGUAGES[id] || { label: id || "Unknown", monaco: "plaintext", extension: "txt", color: "var(--series-other)", comment: "//" };

/** Keeps only the languages this judge can actually execute. */
export const runnableOnly = (languages = []) =>
    languages.filter((l) => RUNNABLE_LANGUAGES.includes(l));

/** Sensible starting code when a problem ships none for a language. */
export const FALLBACK_STARTER = {
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read input, solve, print the answer.

    return 0;
}
`,
    java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

        // Read input, solve, print the answer.
    }
}
`,
    python: `import sys

def main():
    data = sys.stdin.read().split()

    # Solve, then print the answer.

if __name__ == "__main__":
    main()
`
};

/* ── Difficulty ────────────────────────────────────────────────────────── */

/*
 | Difficulty is an ordered severity rather than an identity, so it borrows
 | the status palette. It is always drawn with its text label beside it.
 */
export const DIFFICULTIES = {
    Easy:   { tone: "good",     color: "var(--diff-easy)",   wash: "var(--good-wash)",     weight: 1 },
    Medium: { tone: "warning",  color: "var(--diff-medium)", wash: "var(--warning-wash)",  weight: 2 },
    Hard:   { tone: "critical", color: "var(--diff-hard)",   wash: "var(--critical-wash)", weight: 3 }
};

export const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

export const difficultyMeta = (level) =>
    DIFFICULTIES[level] || { tone: "neutral", color: "var(--text-muted)", wash: "var(--surface-2)", weight: 0 };

/* ── Streaks ───────────────────────────────────────────────────────────── */

/**
 * Derives current and longest daily streaks from the activity series the
 * analytics endpoint returns (`[{ date: "2026-03-12", count: 3 }]`).
 *
 * "Current" tolerates today being empty — a streak shouldn't visibly break
 * at midnight before the user has had a chance to solve anything.
 */
export const deriveStreaks = (activity = []) => {
    const active = new Set(
        activity.filter((a) => a.count > 0).map((a) => a.date)
    );

    if (!active.size) return { current: 0, longest: 0, activeDays: 0 };

    const shift = (days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return dayKey(d);
    };

    /* Current: walk backwards from today (or yesterday, if today is empty). */
    let current = 0;
    let cursor = active.has(shift(0)) ? 0 : 1;

    // Only grant the grace day if yesterday actually has activity.
    if (cursor === 1 && !active.has(shift(1))) {
        current = 0;
    } else {
        while (active.has(shift(cursor))) {
            current += 1;
            cursor += 1;
        }
    }

    /* Longest: the longest run of consecutive calendar days in the series. */
    const sorted = [...active].sort();
    let longest = 1;
    let run = 1;

    for (let i = 1; i < sorted.length; i += 1) {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const gapDays = Math.round((curr - prev) / 86400000);

        run = gapDays === 1 ? run + 1 : 1;
        longest = Math.max(longest, run);
    }

    return { current, longest, activeDays: active.size };
};

/* ── Badges ────────────────────────────────────────────────────────────── */

/*
 | Every badge is *earned from real data* — each predicate reads the user's
 | own stats. Nothing here is decorative or awarded for signing up.
 */
export const BADGES = [
    {
        id: "first-blood",
        label: "First Blood",
        icon: "LuFlame",
        blurb: "Solved your first problem.",
        earned: (s) => s.problemsSolved >= 1
    },
    {
        id: "ten-down",
        label: "Ten Down",
        icon: "LuTarget",
        blurb: "Ten unique problems conquered.",
        earned: (s) => s.problemsSolved >= 10
    },
    {
        id: "half-century",
        label: "Half Century",
        icon: "LuMedal",
        blurb: "Fifty unique problems conquered.",
        earned: (s) => s.problemsSolved >= 50
    },
    {
        id: "centurion",
        label: "Centurion",
        icon: "LuCrown",
        blurb: "One hundred unique problems conquered.",
        earned: (s) => s.problemsSolved >= 100
    },
    {
        id: "sharpshooter",
        label: "Sharpshooter",
        icon: "LuCrosshair",
        blurb: "Acceptance rate above 60% over 20+ submissions.",
        earned: (s) => s.totalSubmissions >= 20 && s.acceptanceRate >= 60
    },
    {
        id: "hard-mode",
        label: "Hard Mode",
        icon: "LuMountain",
        blurb: "Ten Hard problems solved.",
        earned: (s) => (s.difficultyBreakdown?.Hard || 0) >= 10
    },
    {
        id: "polyglot",
        label: "Polyglot",
        icon: "LuLanguages",
        blurb: "Submitted in all three supported languages.",
        earned: (s) => (s.languagesUsed || 0) >= 3
    },
    {
        id: "consistent",
        label: "Metronome",
        icon: "LuCalendarCheck",
        blurb: "A seven-day solving streak.",
        earned: (s) => (s.currentStreak || 0) >= 7
    },
    {
        id: "relentless",
        label: "Relentless",
        icon: "LuZap",
        blurb: "A thirty-day solving streak.",
        earned: (s) => (s.longestStreak || 0) >= 30
    },
    {
        id: "balanced",
        label: "Well Rounded",
        icon: "LuScale",
        blurb: "At least five solved at every difficulty.",
        earned: (s) =>
            (s.difficultyBreakdown?.Easy || 0) >= 5 &&
            (s.difficultyBreakdown?.Medium || 0) >= 5 &&
            (s.difficultyBreakdown?.Hard || 0) >= 5
    }
];

export const evaluateBadges = (stats = {}) =>
    BADGES.map((badge) => ({ ...badge, unlocked: Boolean(badge.earned(stats)) }));
