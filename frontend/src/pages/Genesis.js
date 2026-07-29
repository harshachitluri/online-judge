import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { gsap } from "gsap";
import * as Icons from "react-icons/lu";

import { BRAND, MODULE } from "../config/brand";
import { Button, MagneticButton, Card, Badge, Avatar } from "../components/ui";
import { Aurora } from "../components/shell/AppShell";
import { Mark } from "../components/shell/Logo";
import { staggerParent, riseChild, revealProps } from "../lib/motion";
import { useCountUp, useInView, useMediaQuery } from "../hooks";
import { fetchLeaderboard } from "../services/account";
import { number as fmtNumber } from "../lib/format";

/*
 |==========================================================================
 | Genesis — the landing page
 |==========================================================================
 | The public face of AXIOM. Everything here is anonymous-safe: the one
 | piece of live data it pulls is the public leaderboard, and it degrades
 | quietly to nothing if the API is unreachable.
 */

/* ── Hero ──────────────────────────────────────────────────────────────── */

/*
 | The headline animates in per-word with GSAP rather than Framer.
 | Splitting text into forty spans and handing each one to Framer means
 | forty React components and forty subscriptions; GSAP animates the DOM
 | nodes directly in a single timeline, which is both simpler and cheaper
 | for a one-shot entrance like this.
 */
const useHeadlineReveal = (ref) => {
    useEffect(() => {
        const root = ref.current;
        if (!root) return undefined;

        // Reduced motion means the headline is simply present.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            gsap.set(root.querySelectorAll(".word > span"), { y: 0, opacity: 1 });
            return undefined;
        }

        const ctx = gsap.context(() => {
            gsap.fromTo(
                ".word > span",
                { yPercent: 118, opacity: 0 },
                {
                    yPercent: 0,
                    opacity: 1,
                    duration: 1.05,
                    ease: "expo.out",
                    stagger: 0.055,
                    delay: 0.15
                }
            );
        }, root);

        // gsap.context() scopes the selectors *and* gives back a single
        // revert() that cleans up every tween it created.
        return () => ctx.revert();
    }, [ref]);
};

const Headline = () => {
    const ref = useRef(null);
    useHeadlineReveal(ref);

    const lines = [
        ["Where", "algorithms"],
        ["become", "instinct."]
    ];

    return (
        <h1 className="hero__title" ref={ref}>
            {lines.map((line, li) => (
                <span className="hero__line" key={li}>
                    {line.map((word, wi) => (
                        <span className="word" key={wi}>
                            <span className={li === 1 && wi === 0 ? "gradient-text" : undefined}>
                                {word}
                            </span>
                        </span>
                    ))}
                </span>
            ))}
        </h1>
    );
};

/*
 | The floating code panel beside the headline. It tilts toward the pointer —
 | a small, continuous signal that the surface is responsive, which is most
 | of what makes an interface feel "alive" rather than printed.
 */
const HeroPanel = () => {
    const ref = useRef(null);
    const isCoarse = useMediaQuery("(pointer: coarse)");

    const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

    const onPointerMove = (event) => {
        if (isCoarse) return;

        const rect = ref.current.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;

        setTilt({ rx: -py * 9, ry: px * 12 });
    };

    return (
        <motion.div
            ref={ref}
            className="hero__panel"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1200 }}
        >
            <motion.div
                className="codepanel"
                animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
                <div className="codepanel__bar">
                    <span className="codepanel__dots" aria-hidden="true">
                        <i /><i /><i />
                    </span>
                    <span className="codepanel__file mono">two_sum.cpp</span>
                    <Badge tone="good" icon={Icons.LuCircleCheck}>Accepted</Badge>
                </div>

                <pre className="codepanel__code" aria-hidden="true">
{`unordered_map<int, int> seen;

for (int i = 0; i < n; ++i) {
    int need = target - a[i];

    if (seen.count(need))
        return {seen[need], i};

    seen[a[i]] = i;
}`}
                </pre>

                <div className="codepanel__foot">
                    <span className="codepanel__stat">
                        <Icons.LuTimer size={13} aria-hidden="true" />
                        <span className="tnum">4 ms</span>
                    </span>
                    <span className="codepanel__stat">
                        <Icons.LuDatabase size={13} aria-hidden="true" />
                        <span className="tnum">9.2 MB</span>
                    </span>
                    <span className="codepanel__stat">
                        <Icons.LuGauge size={13} aria-hidden="true" />
                        <span className="mono">O(n)</span>
                    </span>
                </div>
            </motion.div>

            {/* Two satellite cards that drift on their own timing so the
                composition never sits perfectly still. */}
            <motion.div
                className="hero__chip hero__chip--one"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
                <Icons.LuFlame size={15} style={{ color: "var(--status-warning)" }} aria-hidden="true" />
                <div className="stack">
                    <strong>18-day streak</strong>
                    <span className="text-muted">Personal best</span>
                </div>
            </motion.div>

            <motion.div
                className="hero__chip hero__chip--two"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
                <Icons.LuSparkles size={15} style={{ color: "var(--brand-cyan)" }} aria-hidden="true" />
                <div className="stack">
                    <strong>Sage review</strong>
                    <span className="text-muted">2 findings</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ── Counter ───────────────────────────────────────────────────────────── */

const Counter = ({ value, suffix = "", label, sub }) => {
    const [ref, inView] = useInView();
    const animated = useCountUp(value, { start: inView, duration: 1600 });

    return (
        <div className="counter" ref={ref}>
            <span className="counter__value">
                {fmtNumber(Math.round(animated))}
                {suffix}
            </span>
            <span className="counter__label">{label}</span>
            {sub && <span className="counter__sub">{sub}</span>}
        </div>
    );
};

/* ── Content ───────────────────────────────────────────────────────────── */

const CAPABILITIES = [
    {
        icon: "LuCode",
        module: "Code Editor",
        blurb:
            "Monaco with resizable panels, a real sandboxed judge, custom stdin, and an execution console that streams verdicts as the worker returns them.",
        span: 2,
        accent: "var(--brand-violet)"
    },
    {
        icon: "LuSparkles",
        module: "AI Assistant",
        blurb:
            "Instant local complexity estimates and code review, plus a real Gemini-powered chat for hints, approach discussion and open-ended questions.",
        accent: "var(--brand-cyan)"
    },
    {
        icon: "LuRoute",
        module: "Topics",
        blurb:
            "Topic tracks that sequence the archive from basics to advanced, with your completion measured against what you can actually see.",
        accent: "var(--series-3)"
    },
    {
        icon: "LuActivity",
        module: "Analytics",
        blurb:
            "Verdict distribution, language mix, ninety days of activity and the streaks derived from them. Every figure traces back to a real submission.",
        span: 2,
        accent: "var(--series-4)"
    },
    {
        icon: "LuSwords",
        module: "Contests",
        blurb: "Rated rounds, short sprints and one-problem duels against the clock.",
        accent: "var(--status-critical)"
    },
    {
        icon: "LuTrophy",
        module: "Leaderboard",
        blurb: "Global standings ranked by unique problems conquered, not by volume.",
        accent: "var(--series-2)"
    }
];

/*
 | These are illustrative, not attributed to real people. Inventing named
 | testimonials for a platform that hasn't shipped would be a fabricated
 | endorsement, so the section is framed as what the product is *for*
 | rather than as quotes from users who don't exist.
 */
const PRINCIPLES = [
    {
        icon: "LuGauge",
        title: "Feedback in milliseconds",
        body:
            "A judge you wait on is a judge you stop using. Submissions are queued, executed in an isolated container and streamed back — you watch the verdict land rather than refreshing for it."
    },
    {
        icon: "LuEyeOff",
        title: "Clear about what's local and what isn't",
        body:
            "Complexity and review checks run entirely on your device — nothing leaves it. The AI Assistant's chat is real Gemini, so that traffic does reach a model. We tell you which is which, every time."
    },
    {
        icon: "LuTelescope",
        title: "Progress you can audit",
        body:
            "Every badge, streak and percentage is derived from your own submission record. Nothing is awarded for showing up, and every number can be traced to the rows behind it."
    },
    {
        icon: "LuAccessibility",
        title: "Legible to everyone",
        body:
            "Verdicts carry an icon and a word, never a colour alone. The chart palette is validated for colour-vision deficiency, and every animation respects a reduced-motion preference."
    }
];

const TRAJECTORY = [
    {
        phase: "Shipped",
        status: "done",
        items: [
            "Sandboxed multi-language judge (C++, Java, Python)",
            "Code editor workspace with resizable panels",
            "Topics and Companies problem tracks",
            "Analytics dashboard with derived streaks",
            "AI complexity analysis and code review"
        ]
    },
    {
        phase: "In flight",
        status: "active",
        items: [
            "Contests — live rated rounds",
            "Discussions — shared editorials and threads",
            "Notifications — a real notification pipeline"
        ]
    },
    {
        phase: "Next",
        status: "planned",
        items: [
            "Head-to-head duels with live opponent state",
            "Team rooms and private problem sets",
            "Submission replays and diff-based debugging"
        ]
    }
];

/* ── Page ──────────────────────────────────────────────────────────────── */

const Genesis = () => {
    const heroRef = useRef(null);
    const [leaders, setLeaders] = useState([]);

    /* Parallax on the hero as it scrolls away. `useSpring` smooths the raw
       scroll value so the movement doesn't judder on a trackpad. */
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });

    const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
    const heroY = useTransform(smooth, [0, 1], [0, 90]);
    const heroFade = useTransform(smooth, [0, 0.8], [1, 0]);

    // The single piece of live data on the page. Silent on failure — the
    // landing page must render for an anonymous visitor with no API at all.
    useEffect(() => {
        fetchLeaderboard(5)
            .then(setLeaders)
            .catch(() => setLeaders([]));
    }, []);

    return (
        <div className="landing">
            <Aurora grid />

            {/* ── Hero ──────────────────────────────────────────────── */}

            <section className="hero" ref={heroRef}>
                <motion.div className="shell hero__inner" style={{ y: heroY, opacity: heroFade }}>
                    <div className="hero__copy">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Badge tone="brand" size="lg" icon={Icons.LuSparkles}>
                                {BRAND.descriptor} · v{BRAND.version}
                            </Badge>
                        </motion.div>

                        <Headline />

                        <motion.p
                            className="hero__lede"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.55 }}
                        >
                            {BRAND.name} is a computational proving ground — a real sandboxed
                            judge, a workspace built for thinking, and analytics that tell you
                            the truth about your progress. No streaks for logging in.
                        </motion.p>

                        <motion.div
                            className="hero__cta"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.68 }}
                        >
                            <MagneticButton
                                variant="primary"
                                size="lg"
                                to="/join"
                                trailingIcon={Icons.LuArrowRight}
                            >
                                Claim your handle
                            </MagneticButton>

                            <Button variant="outline" size="lg" to="/enter">
                                Sign in
                            </Button>
                        </motion.div>

                        <motion.div
                            className="hero__meta"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.7, delay: 0.85 }}
                        >
                            <span><Icons.LuCheck size={13} aria-hidden="true" /> Free to start</span>
                            <span><Icons.LuCheck size={13} aria-hidden="true" /> No card required</span>
                            <span><Icons.LuCheck size={13} aria-hidden="true" /> Google sign-in</span>
                        </motion.div>
                    </div>

                    <HeroPanel />
                </motion.div>

                <motion.div
                    className="hero__scroll"
                    animate={{ y: [0, 7, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                >
                    <Icons.LuChevronDown size={18} />
                </motion.div>
            </section>

            {/* ── Counters ──────────────────────────────────────────── */}

            <section className="shell">
                <div className="counters">
                    <Counter value={3} suffix=" languages" label="Executed in a real sandbox" sub="C++ · Java · Python" />
                    <Counter value={90} suffix=" days" label="Of activity history" sub="Per-day, per-verdict" />
                    <Counter value={10} label="Badges you can actually earn" sub="Every one derived from data" />
                    <Counter value={0} suffix="ms" label="Your code leaves the device" sub="AI analysis runs client-side" />
                </div>
            </section>

            {/* ── Capabilities ──────────────────────────────────────── */}

            <section className="section shell" id="capabilities">
                <motion.div className="stack stack-4" {...revealProps} variants={staggerParent()}>
                    <motion.span className="eyebrow" variants={riseChild}>
                        <Icons.LuLayers size={13} /> The system
                    </motion.span>

                    <motion.h2 className="section__title" variants={riseChild}>
                        One platform. Every tool you need.
                    </motion.h2>

                    <motion.p className="section__lede" variants={riseChild}>
                        Every part of {BRAND.name} shares one design system, one keyboard
                        model and one command palette. Nothing here is bolted on.
                    </motion.p>
                </motion.div>

                <motion.div
                    className="bento"
                    {...revealProps}
                    variants={staggerParent(0.07, 0.1)}
                >
                    {CAPABILITIES.map((cap) => {
                        const Icon = Icons[cap.icon] || Icons.LuCircleDot;

                        return (
                            <motion.article
                                key={cap.module}
                                className="bento__cell"
                                style={{ "--span": cap.span || 1 }}
                                variants={riseChild}
                            >
                                <span className="bento__icon" style={{ color: cap.accent }} aria-hidden="true">
                                    <Icon size={20} />
                                </span>

                                <h3 className="bento__title">{cap.module}</h3>

                                <p className="bento__body">{cap.blurb}</p>
                            </motion.article>
                        );
                    })}
                </motion.div>
            </section>

            {/* ── Principles ────────────────────────────────────────── */}

            <section className="section shell" id="proof">
                <motion.div className="stack stack-4" {...revealProps} variants={staggerParent()}>
                    <motion.span className="eyebrow" variants={riseChild}>
                        <Icons.LuShieldCheck size={13} /> What we optimise for
                    </motion.span>

                    <motion.h2 className="section__title" variants={riseChild}>
                        Four commitments, held everywhere.
                    </motion.h2>
                </motion.div>

                <motion.div
                    className="autogrid"
                    style={{ "--min": "300px", "--gap": "var(--sp-4)", marginTop: "var(--sp-8)" }}
                    {...revealProps}
                    variants={staggerParent(0.08, 0.1)}
                >
                    {PRINCIPLES.map((p) => {
                        const Icon = Icons[p.icon] || Icons.LuCircleDot;

                        return (
                            <Card key={p.title} animate size="lg" className="stack stack-3">
                                <span className="principle__icon" aria-hidden="true">
                                    <Icon size={18} />
                                </span>
                                <h3 style={{ fontSize: "var(--fs-md)" }}>{p.title}</h3>
                                <p className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                                    {p.body}
                                </p>
                            </Card>
                        );
                    })}
                </motion.div>
            </section>

            {/* ── Live standings ────────────────────────────────────── */}

            {leaders.length > 0 && (
                <section className="section shell">
                    <motion.div {...revealProps} variants={staggerParent()}>
                        <Card size="lg" className="standings-preview">
                            <motion.div variants={riseChild} className="row row-between row-wrap" style={{ marginBottom: "var(--sp-5)" }}>
                                <div className="stack stack-1">
                                    <span className="eyebrow">
                                        <Icons.LuTrophy size={13} /> Leaderboard · live
                                    </span>
                                    <h2 style={{ fontSize: "var(--fs-xl)" }}>Who is actually ahead</h2>
                                </div>

                                <Button variant="secondary" size="sm" to="/enter" trailingIcon={Icons.LuArrowRight}>
                                    See the full board
                                </Button>
                            </motion.div>

                            <motion.ol className="stack stack-2" variants={staggerParent(0.06)}>
                                {leaders.map((entry) => (
                                    <motion.li
                                        key={entry.userId}
                                        className="standings-preview__row"
                                        variants={riseChild}
                                    >
                                        <span className="standings-preview__rank tnum">
                                            {entry.rank}
                                        </span>
                                        <Avatar name={entry.username} size="sm" />
                                        <span className="truncate" style={{ flex: 1, fontWeight: "var(--fw-medium)" }}>
                                            {entry.username}
                                        </span>
                                        <span className="tnum text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                            {fmtNumber(entry.solvedCount)} solved
                                        </span>
                                    </motion.li>
                                ))}
                            </motion.ol>
                        </Card>
                    </motion.div>
                </section>
            )}

            {/* ── Trajectory ────────────────────────────────────────── */}

            <section className="section shell" id="trajectory">
                <motion.div className="stack stack-4" {...revealProps} variants={staggerParent()}>
                    <motion.span className="eyebrow" variants={riseChild}>
                        <Icons.LuGitBranch size={13} /> Trajectory
                    </motion.span>

                    <motion.h2 className="section__title" variants={riseChild}>
                        Built in the open, shipped in order.
                    </motion.h2>

                    <motion.p className="section__lede" variants={riseChild}>
                        What exists today, what is being built, and what comes after. Modules
                        marked in flight render as designed previews inside the product.
                    </motion.p>
                </motion.div>

                <motion.div
                    className="roadmap"
                    {...revealProps}
                    variants={staggerParent(0.1, 0.1)}
                >
                    {TRAJECTORY.map((phase) => (
                        <motion.div
                            key={phase.phase}
                            className={`roadmap__col roadmap__col--${phase.status}`}
                            variants={riseChild}
                        >
                            <div className="roadmap__head">
                                <span className="roadmap__marker" aria-hidden="true" />
                                <h3 className="roadmap__phase">{phase.phase}</h3>
                                <Badge
                                    tone={
                                        phase.status === "done"
                                            ? "good"
                                            : phase.status === "active"
                                                ? "brand"
                                                : "neutral"
                                    }
                                >
                                    {phase.items.length}
                                </Badge>
                            </div>

                            <ul className="roadmap__list">
                                {phase.items.map((item) => (
                                    <li key={item}>
                                        {phase.status === "done" ? (
                                            <Icons.LuCircleCheck size={14} style={{ color: "var(--status-good)" }} aria-hidden="true" />
                                        ) : phase.status === "active" ? (
                                            <Icons.LuLoader size={14} style={{ color: "var(--brand-violet)" }} aria-hidden="true" />
                                        ) : (
                                            <Icons.LuCircleDashed size={14} style={{ color: "var(--text-faint)" }} aria-hidden="true" />
                                        )}
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────────── */}

            <section className="section shell">
                <motion.div className="finale" {...revealProps} variants={staggerParent()}>
                    <motion.div variants={riseChild}>
                        <Mark size={44} animated />
                    </motion.div>

                    <motion.h2 className="finale__title" variants={riseChild}>
                        Start where you actually are.
                    </motion.h2>

                    <motion.p className="finale__body" variants={riseChild}>
                        Pick a track, solve one problem, and let the numbers tell you what to
                        do next. That's the whole loop.
                    </motion.p>

                    <motion.div className="row" style={{ gap: "var(--sp-3)" }} variants={riseChild}>
                        <MagneticButton variant="primary" size="lg" to="/join" trailingIcon={Icons.LuArrowRight}>
                            Create your account
                        </MagneticButton>
                        <Button variant="ghost" size="lg" to={MODULE.deck.path}>
                            I already have one
                        </Button>
                    </motion.div>
                </motion.div>
            </section>

            {/* ── Footer ────────────────────────────────────────────── */}

            <footer className="footer">
                <div className="shell row row-between row-wrap" style={{ gap: "var(--sp-4)" }}>
                    <div className="row" style={{ gap: "var(--sp-3)" }}>
                        <Mark size={20} />
                        <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                            {BRAND.name} — {BRAND.tagline}
                        </span>
                    </div>

                    <span className="text-faint" style={{ fontSize: "var(--fs-xs)" }}>
                        Built as an original interface. Not affiliated with any existing judge.
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default Genesis;
