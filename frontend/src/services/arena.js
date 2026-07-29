import { fetchProblems } from "./judge";

/*
 |==========================================================================
 | The Arena — contests
 |==========================================================================
 | There is no contests collection on the API yet. Rather than render a wall
 | of invented results, the Arena assembles contests out of the *real*
 | published problem catalogue: every round below links to problems that
 | actually exist and can actually be solved.
 |
 | What is synthesised is the schedule and the participant counts. The UI
 | marks these rounds as scheduled previews so nobody reads a start time as
 | a commitment. Replace `listRounds` with a real endpoint and the rest of
 | the Arena keeps working unchanged.
 */

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

/* Weekly cadence, anchored to a fixed epoch so every device agrees on the
   schedule without a server telling them. */
const EPOCH = Date.UTC(2026, 0, 4, 17, 0, 0);   // a Sunday, 17:00 UTC

const ROUND_TEMPLATES = [
    {
        id: "pulse",
        name: "Pulse",
        cadence: "Weekly",
        durationMin: 90,
        size: 4,
        difficulty: null,
        rated: true,
        blurb: "Four problems, ninety minutes, full rating impact.",
        accent: "var(--brand-violet)"
    },
    {
        id: "sprint",
        name: "Sprint",
        cadence: "Twice weekly",
        durationMin: 45,
        size: 3,
        difficulty: "Easy",
        rated: false,
        blurb: "Short, unrated and fast — built for warming up.",
        accent: "var(--series-3)"
    },
    {
        id: "gauntlet",
        name: "Gauntlet",
        cadence: "Monthly",
        durationMin: 180,
        size: 6,
        difficulty: "Hard",
        rated: true,
        blurb: "Six hard problems, three hours, no mercy.",
        accent: "var(--status-critical)"
    },
    {
        id: "duel",
        name: "Duel",
        cadence: "On demand",
        durationMin: 20,
        size: 1,
        difficulty: "Medium",
        rated: false,
        blurb: "One problem, one opponent, first correct submission wins.",
        accent: "var(--brand-cyan)"
    }
];

/* Deterministic pseudo-randomness — the same round shows the same numbers on
   every device and every reload, which a Math.random() would not. */
const seeded = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

/** The nth occurrence of a weekly round, counting from now. */
const occurrenceAt = (weekOffset, dayShift = 0) =>
    EPOCH + Math.ceil((Date.now() - EPOCH) / (7 * DAY)) * 7 * DAY
          + weekOffset * 7 * DAY + dayShift * DAY;

const statusOf = (startsAt, durationMin) => {
    const now = Date.now();
    const endsAt = startsAt + durationMin * 60 * 1000;

    if (now < startsAt) return "upcoming";
    if (now < endsAt) return "live";
    return "finished";
};

/**
 * Builds the round list, hydrating each with real problems.
 * @returns {Array<Round>}
 */
export const listRounds = async () => {
    // One catalogue fetch feeds every round — a request per round would be
    // four round-trips for the same data.
    const data = await fetchProblems({ limit: 50, sort: "-createdAt" });
    const catalogue = data?.problems || [];

    const byDifficulty = (level) =>
        level ? catalogue.filter((p) => p.difficulty === level) : catalogue;

    const rounds = [];

    ROUND_TEMPLATES.forEach((template, ti) => {
        // Past, present and future occurrences of each template.
        [-1, 0, 1].forEach((weekOffset) => {
            const startsAt = occurrenceAt(weekOffset, ti);
            const pool = byDifficulty(template.difficulty);
            const seedBase = ti * 97 + weekOffset * 13;

            const problems = pool
                .slice()
                .sort((a, b) => seeded(seedBase + a.title.length) - seeded(seedBase + b.title.length))
                .slice(0, template.size);

            const status = statusOf(startsAt, template.durationMin);
            const number = 128 + ti * 12 + weekOffset;

            rounds.push({
                key: `${template.id}-${weekOffset}`,
                templateId: template.id,
                name: `${template.name} ${number}`,
                cadence: template.cadence,
                blurb: template.blurb,
                accent: template.accent,
                rated: template.rated,
                startsAt,
                durationMin: template.durationMin,
                endsAt: startsAt + template.durationMin * 60 * 1000,
                status,
                problems,
                // Scheduled rounds have no real registrations behind them.
                entrants: Math.round(400 + seeded(seedBase) * 2600),
                // Only a finished round can have a placement.
                placement: status === "finished"
                    ? Math.round(20 + seeded(seedBase + 5) * 900)
                    : null,
                synthetic: true
            });
        });
    });

    return rounds.sort((a, b) => {
        const order = { live: 0, upcoming: 1, finished: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.status === "finished" ? b.startsAt - a.startsAt : a.startsAt - b.startsAt;
    });
};

/** "2d 4h 12m" / "Starting now" — for the countdown on an upcoming round. */
export const countdown = (target) => {
    const delta = target - Date.now();
    if (delta <= 0) return "Starting now";

    const d = Math.floor(delta / DAY);
    const h = Math.floor((delta % DAY) / HOUR);
    const m = Math.floor((delta % HOUR) / 60000);
    const s = Math.floor((delta % 60000) / 1000);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
};

export { ROUND_TEMPLATES };
