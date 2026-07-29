/*
 |==========================================================================
 | CodeJudge — Brand & Navigation
 |==========================================================================
 | Every module's route, icon and sidebar grouping is declared here once, so
 | renaming or regrouping a module is a one-line change that propagates to
 | the sidebar, the command palette, the search index and every page header.
 */

export const BRAND = {
    name: "CodeJudge",
    wordmark: "CodeJudge",
    tagline: "Practice. Submit. Improve.",
    descriptor: "Online Judge Platform",
    version: "2.0"
};

/*
 | `id`     — stable key, used for active-state matching and analytics
 | `label`  — the name shown everywhere in the UI
 | `group`  — the left sidebar section this module is listed under
 | `scope`  — public | private | admin
 */
export const MODULES = [
    {
        id: "deck",
        label: "Dashboard",
        path: "/deck",
        icon: "LuLayoutDashboard",
        scope: "private",
        group: "Overview",
        blurb: "Your streaks, momentum and what to solve next."
    },
    {
        id: "vault",
        label: "Problems",
        path: "/vault",
        icon: "LuBoxes",
        scope: "private",
        group: "Practice",
        blurb: "The full problem archive, filterable by difficulty, topic and tag."
    },
    {
        id: "pathways",
        label: "Topics",
        path: "/pathways",
        icon: "LuRoute",
        scope: "private",
        group: "Practice",
        blurb: "Structured topic tracks that take you from basics to advanced."
    },
    {
        id: "constellations",
        label: "Companies",
        path: "/constellations",
        icon: "LuOrbit",
        scope: "private",
        group: "Practice",
        blurb: "Problem sets mapped to the companies that ask them."
    },
    {
        id: "arena",
        label: "Contests",
        path: "/arena",
        icon: "LuSwords",
        scope: "private",
        group: "Compete",
        blurb: "Timed rounds and head-to-head duels."
    },
    {
        id: "ascendancy",
        label: "Leaderboard",
        path: "/ascendancy",
        icon: "LuTrophy",
        scope: "private",
        group: "Compete",
        blurb: "Global standings ranked by unique problems solved."
    },
    {
        id: "telemetry",
        label: "Analytics",
        path: "/telemetry",
        icon: "LuActivity",
        scope: "private",
        group: "Workspace",
        blurb: "Deep analytics on your verdicts, languages and consistency."
    },
    {
        id: "chronicle",
        label: "Submissions",
        path: "/chronicle",
        icon: "LuHistory",
        scope: "private",
        group: "Workspace",
        blurb: "Every submission you have ever made, with verdicts and timings."
    },
    {
        id: "nexus",
        label: "Discussions",
        path: "/nexus",
        icon: "LuMessagesSquare",
        scope: "private",
        group: "Workspace",
        blurb: "Editorials, approaches and debate with other solvers."
    },
    {
        id: "sage",
        label: "AI Assistant",
        path: "/sage",
        icon: "LuSparkles",
        scope: "private",
        group: "Workspace",
        blurb: "A pair-programmer for hints, reviews and complexity analysis."
    },
    {
        id: "oracle",
        label: "Search",
        path: "/oracle",
        icon: "LuSearch",
        scope: "private",
        group: "Workspace",
        blurb: "Search every problem, topic, contest and discussion at once."
    },
    {
        id: "identity",
        label: "Profile",
        path: "/identity",
        icon: "LuUserRound",
        scope: "private",
        group: "Account",
        blurb: "Your public record — badges, milestones and solve history."
    },
    {
        id: "signals",
        label: "Notifications",
        path: "/signals",
        icon: "LuBell",
        scope: "private",
        group: "Account",
        blurb: "Verdicts, contest reminders and replies, in one feed."
    },
    {
        id: "control",
        label: "Settings",
        path: "/control",
        icon: "LuSettings2",
        scope: "private",
        group: "Account",
        blurb: "Account, appearance, editor and privacy preferences."
    },
    {
        id: "forge",
        label: "Code Editor",
        path: "/forge",
        icon: "LuCode",
        scope: "private",
        group: null,
        blurb: "The coding workspace — editor, judge, AI review and analytics."
    },
    {
        id: "architect",
        label: "Admin",
        path: "/architect",
        icon: "LuShieldCheck",
        scope: "admin",
        group: "Admin",
        blurb: "Author problems, manage test cases and publish to the archive."
    }
];

/** Quick lookup by id — `MODULE.deck.label`. */
export const MODULE = MODULES.reduce((map, m) => {
    map[m.id] = m;
    return map;
}, {});

/** The fixed order sections appear in down the left sidebar. */
export const SIDEBAR_GROUPS = ["Overview", "Practice", "Compete", "Workspace", "Account", "Admin"];

/** Every module that belongs in the sidebar, grouped and in a stable order. */
export const sidebarSections = ({ isAdmin }) => {
    const items = MODULES.filter((m) => {
        if (!m.group) return false;
        if (m.scope === "admin") return isAdmin;
        return true;
    });

    return SIDEBAR_GROUPS
        .map((group) => ({ group, items: items.filter((m) => m.group === group) }))
        .filter((section) => section.items.length > 0);
};

/** Every module reachable from the mobile drawer / command palette, flat. */
export const NAV_MODULES = MODULES.filter((m) => m.group);

/** Deep link into the workspace for a given problem slug. */
export const forgePath = (slug) => `${MODULE.forge.path}/${slug}`;

/*
 | Rank tiers. A user's tier is derived from unique problems solved, so it
 | is computable client-side from data the API already returns.
 */
export const TIERS = [
    { id: "beginner",     label: "Beginner",     min: 0,   accent: "var(--text-muted)" },
    { id: "intermediate", label: "Intermediate", min: 10,  accent: "var(--series-3)" },
    { id: "advanced",     label: "Advanced",     min: 40,  accent: "var(--series-1)" },
    { id: "expert",       label: "Expert",       min: 90,  accent: "var(--brand-violet)" },
    { id: "master",       label: "Master",       min: 175, accent: "var(--series-4)" },
    { id: "grandmaster",  label: "Grandmaster",  min: 300, accent: "var(--brand-cyan)" }
];

/** The tier a solve count falls into, plus progress toward the next one. */
export const tierFor = (solved = 0) => {
    let index = 0;
    for (let i = 0; i < TIERS.length; i += 1) {
        if (solved >= TIERS[i].min) index = i;
    }

    const current = TIERS[index];
    const next = TIERS[index + 1] || null;

    // A maxed-out tier reports 100% rather than dividing by a null ceiling.
    const progress = next
        ? Math.round(((solved - current.min) / (next.min - current.min)) * 100)
        : 100;

    return { current, next, progress, toNext: next ? next.min - solved : 0 };
};
