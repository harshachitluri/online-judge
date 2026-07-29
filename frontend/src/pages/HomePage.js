import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Zap, Check, ArrowRight, Play, Terminal, Gauge, Trophy,
    ShieldCheck, BarChart3, Boxes, Sparkles, Timer, ListChecks
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { staggerContainer, fadeUp, revealOnScroll, EASE } from "../motion/variants";

/* ── Content ────────────────────────────────────────────────────────── */

const FEATURES = [
    {
        icon: <ShieldCheck />,
        title: "Sandboxed execution",
        body: "Every submission compiles and runs inside an isolated container with no network access, capped memory, and a hard CPU quota.",
        span: "wide"
    },
    {
        icon: <Timer />,
        title: "Real verdicts, in seconds",
        body: "A concurrent judge worker picks up your submission the moment it lands, then streams the result back as soon as the last test case clears.",
        span: "wide"
    },
    {
        icon: <Terminal />,
        title: "Playground mode",
        body: "Run against your own input before you submit. Same sandbox, instant feedback."
    },
    {
        icon: <ListChecks />,
        title: "Curated curriculum",
        body: "54 problems across 12 topics, each with hidden tests and worked examples."
    },
    {
        icon: <BarChart3 />,
        title: "Progress you can see",
        body: "Solved counts by difficulty, topic and company bundle."
    }
];

const STEPS = [
    { n: "01", title: "Pick a problem", body: "Filter by difficulty, tag, topic, or the company that asks it." },
    { n: "02", title: "Write and run", body: "A full Monaco editor with C++, Java and Python, plus custom input." },
    { n: "03", title: "Submit and learn", body: "Get a verdict against every hidden test case, then watch it land on your profile." }
];

const STATS = [
    { value: "54",  label: "Problems" },
    { value: "202", label: "Test cases" },
    { value: "12",  label: "Topics" },
    { value: "3",   label: "Languages" }
];

const STACK = ["C++", "Java", "Python", "Docker", "MongoDB", "Node.js", "React", "Monaco"];

const CODE_LINES = [
    [{ t: "com", v: "# two_sum.py" }],
    [{ t: "key", v: "def " }, { t: "fn", v: "two_sum" }, { t: "var", v: "(nums, target):" }],
    [{ t: "var", v: "    seen = {}" }],
    [{ t: "key", v: "    for " }, { t: "var", v: "i, n " }, { t: "key", v: "in " }, { t: "fn", v: "enumerate" }, { t: "var", v: "(nums):" }],
    [{ t: "key", v: "        if " }, { t: "var", v: "target - n " }, { t: "key", v: "in " }, { t: "var", v: "seen:" }],
    [{ t: "key", v: "            return " }, { t: "var", v: "seen[target - n], i" }],
    [{ t: "var", v: "        seen[n] = i" }]
];

const TESTS = [
    { label: "Case 1", ms: "12ms" },
    { label: "Case 2", ms: "9ms" },
    { label: "Case 3", ms: "11ms" },
    { label: "Case 4", ms: "10ms" }
];

/* ── Page ───────────────────────────────────────────────────────────── */

const HomePage = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="landing">

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="hero">
                <div className="hero-aurora" aria-hidden="true" />
                <div className="grid-bg" aria-hidden="true" />

                <motion.div
                    className="hero-inner"
                    variants={staggerContainer(0.08)}
                    initial="initial"
                    animate="animate"
                >
                    <motion.div variants={fadeUp}>
                        <span className="eyebrow">
                            <Sparkles size={13} /> Built for competitive programmers
                        </span>
                    </motion.div>

                    <motion.h1 className="hero-title" variants={fadeUp}>
                        Write code.<br />
                        <span className="gradient-text">Get judged in seconds.</span>
                    </motion.h1>

                    <motion.p className="hero-sub" variants={fadeUp}>
                        An online judge that compiles, sandboxes and evaluates your solution
                        against every hidden test case — then shows you exactly how far you've come.
                    </motion.p>

                    <motion.div className="hero-ctas" variants={fadeUp}>
                        <Link to={isAuthenticated ? "/problems" : "/register"} className="btn btn-primary btn-lg">
                            {isAuthenticated ? "Open workspace" : "Start solving free"}
                            <ArrowRight />
                        </Link>
                        <Link to="/problems" className="btn btn-secondary btn-lg">
                            <Play /> Browse problems
                        </Link>
                    </motion.div>

                    <motion.p className="hero-note" variants={fadeUp}>
                        No setup, no toolchain to install — C++, Java and Python run server-side.
                    </motion.p>
                </motion.div>

                {/* Floating editor mockup */}
                <motion.div
                    className="hero-preview"
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.75, ease: EASE }}
                >
                    <div className="code-window">
                        <div className="code-window-bar">
                            <span className="code-dot r" /><span className="code-dot y" /><span className="code-dot g" />
                            <span className="code-window-title">two_sum.py</span>
                            <span className="code-window-badge badge badge-easy">Easy</span>
                        </div>

                        <div className="code-body">
                            <div className="code-lines">
                                {CODE_LINES.map((line, i) => (
                                    <motion.div
                                        className="code-line"
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.55 + i * 0.07, duration: 0.35, ease: EASE }}
                                    >
                                        <span className="code-ln">{i + 1}</span>
                                        <span>
                                            {line.map((tok, j) => (
                                                <span className={`tk-${tok.t}`} key={j}>{tok.v}</span>
                                            ))}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="code-side">
                                <div className="code-side-label">Test cases</div>

                                {TESTS.map((t, i) => (
                                    <motion.div
                                        className="testcase-row"
                                        key={t.label}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.1 + i * 0.16, duration: 0.3, ease: EASE }}
                                    >
                                        <span className="tick"><Check /></span>
                                        {t.label}
                                        <span className="ms">{t.ms}</span>
                                    </motion.div>
                                ))}

                                <motion.div
                                    className="verdict-badge verdict-Accepted"
                                    style={{ justifyContent: "center", marginTop: "auto" }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1.9, duration: 0.45, ease: EASE }}
                                >
                                    <Check size={14} /> Accepted · 4/4
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════ STACK MARQUEE ═══════════════ */}
            <div className="marquee" aria-hidden="true">
                <div className="marquee-track">
                    {[...STACK, ...STACK].map((item, i) => (
                        <span className="marquee-item" key={i}>
                            <Zap size={14} /> {item}
                        </span>
                    ))}
                </div>
            </div>

            {/* ═══════════════ STATS ═══════════════ */}
            <motion.div
                className="stats-band"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.3 }}
                variants={staggerContainer(0.08)}
            >
                {STATS.map((s) => (
                    <motion.div className="stats-band-item" key={s.label} variants={fadeUp}>
                        <div className="stats-band-value">{s.value}</div>
                        <div className="stats-band-label">{s.label}</div>
                    </motion.div>
                ))}
            </motion.div>

            {/* ═══════════════ FEATURES (bento) ═══════════════ */}
            <section className="landing-section">
                <motion.div className="landing-head" {...revealOnScroll}>
                    <span className="eyebrow"><Boxes size={13} /> Platform</span>
                    <h2>Everything a judge should do,<br />done properly.</h2>
                    <p>Isolation, speed, and feedback you can act on — not a toy grader.</p>
                </motion.div>

                <motion.div
                    className="bento"
                    variants={staggerContainer(0.07)}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, amount: 0.15 }}
                >
                    {FEATURES.map((f) => (
                        <motion.div
                            className={`bento-card ${f.span || ""}`}
                            key={f.title}
                            variants={fadeUp}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2, ease: EASE }}
                        >
                            <div className="bento-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.body}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section className="landing-section" style={{ paddingTop: 0 }}>
                <motion.div className="landing-head" {...revealOnScroll}>
                    <span className="eyebrow"><Gauge size={13} /> Workflow</span>
                    <h2>From problem to verdict<br />in three steps.</h2>
                </motion.div>

                <motion.div
                    className="steps"
                    variants={staggerContainer(0.1)}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, amount: 0.25 }}
                >
                    {STEPS.map((s) => (
                        <motion.div className="step" key={s.n} variants={fadeUp}>
                            <div className="step-num">{s.n}</div>
                            <h3>{s.title}</h3>
                            <p>{s.body}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* ═══════════════ CTA ═══════════════ */}
            <motion.section className="cta-band" {...revealOnScroll}>
                <div className="grid-bg" aria-hidden="true" />
                <span className="eyebrow"><Trophy size={13} /> Ready when you are</span>
                <h2 style={{ marginTop: 16 }}>Start your first problem today.</h2>
                <p>Join the leaderboard, build a streak, and watch your solved count climb.</p>
                <div className="hero-ctas" style={{ marginTop: 0 }}>
                    <Link to={isAuthenticated ? "/problems" : "/register"} className="btn btn-primary btn-lg">
                        {isAuthenticated ? "Go to workspace" : "Create free account"} <ArrowRight />
                    </Link>
                    <Link to="/leaderboard" className="btn btn-ghost btn-lg">
                        <Trophy /> View leaderboard
                    </Link>
                </div>
            </motion.section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <Link to="/" className="navbar-brand">
                        <span className="brand-icon"><Zap /></span>
                        <span>Code<span className="brand-accent">Judge</span></span>
                    </Link>
                    <span>Built for people who like hard problems.</span>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
