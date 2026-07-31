import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { analyseComplexity, reviewCode, generateHints } from "../../services/sage";
import { askAssistant } from "../../services/ai";
import { errorMessage } from "../../api/client";
import { Button, Badge, Card, EmptyState, Markdown } from "../ui";
import { staggerParent, riseChild } from "../../lib/motion";

/*
 |==========================================================================
 | Sage panels
 |==========================================================================
 | The three analysis surfaces inside the Forge. All three run locally and
 | synchronously — there is no request, so there is no loading state.
 |
 | Every result is framed as an estimate with a stated confidence. Rendering
 | a heuristic as a fact is how a helpful tool becomes a misleading one.
 */

const CONFIDENCE = {
    high:   { tone: "good",     label: "High confidence" },
    medium: { tone: "warning",  label: "Medium confidence" },
    low:    { tone: "critical", label: "Low confidence — verify this yourself" }
};

/* ── Complexity ────────────────────────────────────────────────────────── */

export const ComplexityPanel = ({ code, language }) => {
    const analysis = useMemo(
        () => (code?.trim() ? analyseComplexity(code, language) : null),
        [code, language]
    );

    if (!analysis) {
        return (
            <EmptyState
                icon={Icons.LuGauge}
                title="Nothing to analyse"
                body="Write some code and Sage will estimate its time and space complexity from the structure."
            />
        );
    }

    const confidence = CONFIDENCE[analysis.confidence] || CONFIDENCE.low;

    const signals = [
        { label: "Loop nesting depth", value: analysis.signals.depth, icon: "LuRepeat" },
        { label: "Sorting", value: analysis.signals.hasSort ? "Detected" : "None", icon: "LuArrowDownUp" },
        { label: "Binary search", value: analysis.signals.hasBinarySearch ? "Detected" : "None", icon: "LuSearch" },
        { label: "Recursion", value: analysis.signals.isRecursive ? "Detected" : "None", icon: "LuGitBranch" },
        { label: "Memoisation", value: analysis.signals.hasMemo ? "Detected" : "None", icon: "LuArchive" },
        { label: "Auxiliary containers", value: analysis.signals.hashCount + analysis.signals.arrayCount, icon: "LuBoxes" }
    ];

    return (
        <motion.div
            className="stack stack-5"
            variants={staggerParent(0.05)}
            initial="initial"
            animate="animate"
        >
            <motion.div className="complexity" variants={riseChild}>
                <div className="complexity__cell">
                    <span className="complexity__label">Time</span>
                    <span className="complexity__value mono">{analysis.time}</span>
                    <span className="complexity__reason">{analysis.reason}</span>
                </div>

                <div className="complexity__cell">
                    <span className="complexity__label">Space</span>
                    <span className="complexity__value mono">{analysis.space}</span>
                    <span className="complexity__reason">{analysis.spaceReason}</span>
                </div>
            </motion.div>

            <motion.div variants={riseChild}>
                <Badge tone={confidence.tone} icon={Icons.LuGauge} size="lg">
                    {confidence.label}
                </Badge>
            </motion.div>

            <motion.div className="stack stack-3" variants={riseChild}>
                <span className="console__label">What Sage actually saw</span>

                <div className="signals">
                    {signals.map((signal) => {
                        const Icon = Icons[signal.icon] || Icons.LuCircleDot;
                        return (
                            <div key={signal.label} className="signals__row">
                                <Icon size={13} aria-hidden="true" />
                                <span className="signals__label">{signal.label}</span>
                                <span className="signals__value tnum">{signal.value}</span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            <motion.p className="sage__disclaimer" variants={riseChild}>
                <Icons.LuInfo size={13} aria-hidden="true" />
                This is a structural estimate from loop nesting and library calls — not a
                proof. A tight-looking loop over a sorted set can still be quadratic, and
                Sage will not catch that.
            </motion.p>
        </motion.div>
    );
};

/* ── Review ────────────────────────────────────────────────────────────── */

const SEVERITY = {
    warning: { tone: "warning", icon: Icons.LuTriangleAlert, label: "Warning" },
    info:    { tone: "info",    icon: Icons.LuInfo,          label: "Note" }
};

export const ReviewPanel = ({ code, language }) => {
    const review = useMemo(
        () => (code?.trim() ? reviewCode(code, language) : null),
        [code, language]
    );

    if (!review || review.empty) {
        return (
            <EmptyState
                icon={Icons.LuScanEye}
                title="Nothing to review"
                body="Sage reviews structure, not intent — write a solution and it will flag performance and correctness patterns worth a second look."
            />
        );
    }

    if (!review.findings.length) {
        return (
            <div className="stack stack-4" style={{ alignItems: "center", textAlign: "center", padding: "var(--sp-8) 0" }}>
                <span className="review__clean" aria-hidden="true">
                    <Icons.LuCircleCheck size={26} />
                </span>
                <h3 style={{ fontSize: "var(--fs-md)" }}>No findings</h3>
                <p className="text-muted" style={{ fontSize: "var(--fs-sm)", maxWidth: "42ch" }}>
                    Nothing in Sage's rule set fired against this code. That means it found
                    no <em>known</em> anti-patterns — it is not a statement that the
                    solution is correct.
                </p>
            </div>
        );
    }

    return (
        <motion.div
            className="stack stack-4"
            variants={staggerParent(0.06)}
            initial="initial"
            animate="animate"
        >
            <motion.div className="row row-between row-wrap" variants={riseChild}>
                <span className="console__label">
                    {review.findings.length} finding{review.findings.length === 1 ? "" : "s"}
                </span>
                <Badge
                    tone={review.score >= 80 ? "good" : review.score >= 55 ? "warning" : "critical"}
                    size="lg"
                >
                    Structure score {review.score}
                </Badge>
            </motion.div>

            {review.findings.map((finding) => {
                const meta = SEVERITY[finding.severity] || SEVERITY.info;
                const Icon = meta.icon;

                return (
                    <motion.div key={finding.id} className="finding" variants={riseChild}>
                        <div className="finding__head">
                            <span className={`finding__icon finding__icon--${meta.tone}`} aria-hidden="true">
                                <Icon size={14} />
                            </span>
                            <span className="finding__title">{finding.title}</span>
                            <Badge tone="neutral">{meta.label}</Badge>
                        </div>

                        <p className="finding__body">{finding.detail}</p>

                        <span className="finding__confidence">
                            Confidence: {finding.confidence}
                        </span>
                    </motion.div>
                );
            })}

            <motion.p className="sage__disclaimer" variants={riseChild}>
                <Icons.LuInfo size={13} aria-hidden="true" />
                These are pattern matches over your source text, run locally. Sage cannot
                execute your code, so it cannot tell you whether the logic is right — only
                whether it looks like something that commonly goes wrong.
            </motion.p>
        </motion.div>
    );
};

/* ── Hints ─────────────────────────────────────────────────────────────── */

/*
 | Hints unlock one at a time. The gate is the whole point: someone looking
 | for a nudge should not be able to accidentally scroll into the approach
 | they were trying not to read.
 */
export const HintsPanel = ({ problem, code, language }) => {
    const hints = useMemo(() => generateHints(problem), [problem]);
    const [revealed, setRevealed] = useState(0);

    // Each click asks a fresh question of the real assistant — it isn't a
    // reveal gate like the static hints below, since the AI can tailor an
    // answer to whatever the user's code already looks like.
    const [aiHints, setAiHints] = useState([]);
    const [asking, setAsking] = useState(false);
    const [aiError, setAiError] = useState(null);

    const askForHint = async () => {
        setAsking(true);
        setAiError(null);

        try {
            const { reply } = await askAssistant({
                mode: "hint",
                message: aiHints.length
                    ? "Give me the next hint, one level deeper than the last."
                    : "I'm stuck — give me the first hint.",
                code,
                language,
                problem,
                history: aiHints.flatMap((h, i) => [
                    { role: "user", text: i === 0 ? "I'm stuck — give me the first hint." : "Give me the next hint." },
                    { role: "model", text: h }
                ])
            });

            setAiHints((prev) => [...prev, reply]);
        } catch (error) {
            setAiError(errorMessage(error, "The AI Assistant couldn't respond just now."));
        } finally {
            setAsking(false);
        }
    };

    if (!hints.length) {
        return <EmptyState icon={Icons.LuLightbulb} title="No hints available" />;
    }

    return (
        <div className="stack stack-6">
            {/* ── Real AI hints ─────────────────────────────────────── */}
            <div className="stack stack-3">
                <div className="row row-between">
                    <span className="console__label">Ask the AI Assistant</span>
                    <Badge tone="brand" icon={Icons.LuSparkles}>Gemini</Badge>
                </div>

                {aiHints.map((text, i) => (
                    <div key={i} className="hint hint--open">
                        <div className="hint__head">
                            <span className="hint__level">{i + 1}</span>
                            <span className="hint__label">AI hint</span>
                        </div>
                        <Markdown className="hint__text">{text}</Markdown>
                    </div>
                ))}

                {aiError && (
                    <p className="field__error" role="alert">
                        <Icons.LuTriangleAlert size={13} aria-hidden="true" /> {aiError}
                    </p>
                )}

                <Button
                    variant="secondary"
                    icon={Icons.LuSparkles}
                    onClick={askForHint}
                    loading={asking}
                >
                    {aiHints.length === 0 ? "Ask for a hint" : "Ask for the next hint"}
                </Button>

                <p className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                    Your code and the problem statement are sent to the server to generate
                    this — unlike the static hints below, which stay on your device.
                </p>
            </div>

            <hr className="hairline" />

            {/* ── Static graduated hints ────────────────────────────── */}
            <div className="stack stack-4">
                <p className="console__hint">
                    These escalate and run locally. Each one reveals strictly more than the
                    last, so stop as soon as you have what you need.
                </p>

                <div className="stack stack-3">
                    {hints.map((hint, i) => {
                        const open = i < revealed;

                        return (
                            <div key={hint.level} className={`hint ${open ? "hint--open" : ""}`}>
                                <div className="hint__head">
                                    <span className="hint__level">{i + 1}</span>
                                    <span className="hint__label">{hint.label}</span>
                                    {!open && <Icons.LuLock size={13} aria-hidden="true" />}
                                </div>

                                <AnimatePresence initial={false}>
                                    {open && (
                                        <motion.p
                                            className="hint__text"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            {hint.text}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {revealed < hints.length ? (
                    <Button
                        variant="ghost"
                        icon={Icons.LuLightbulb}
                        onClick={() => setRevealed((r) => r + 1)}
                    >
                        {revealed === 0 ? "Reveal the first hint" : `Reveal hint ${revealed + 1}`}
                    </Button>
                ) : (
                    <Button variant="ghost" icon={Icons.LuRotateCw} onClick={() => setRevealed(0)}>
                        Hide all hints again
                    </Button>
                )}
            </div>
        </div>
    );
};

/* ── Editorial ─────────────────────────────────────────────────────────── */

/*
 | There is no editorial collection on the API. Rather than render an empty
 | tab or invent a solution write-up, this assembles a genuine *method* from
 | the problem's own metadata — the constraints, the tags, and the shape of
 | the examples — and says plainly that it is not a solution.
 */
export const EditorialPanel = ({ problem }) => {
    if (!problem) return null;

    const tags = problem.tags || [];

    const steps = [
        {
            icon: "LuBookOpen",
            title: "Restate the problem",
            body: `Write down what "${problem.title}" returns, in your own words, without looking at the statement. If you can't, you don't have the problem yet — and no algorithm will save you from a misread specification.`
        },
        {
            icon: "LuTestTube",
            title: "Work the examples by hand",
            body: problem.examples?.length
                ? `Take the ${problem.examples.length} provided example${problem.examples.length === 1 ? "" : "s"} and trace them on paper. The pattern you use to get the answer manually is usually the algorithm.`
                : "Invent three inputs yourself: a trivial one, a typical one, and the largest the constraints permit. Solve each by hand before writing code."
        },
        {
            icon: "LuRuler",
            title: "Read the constraints as a budget",
            body: problem.constraints
                ? `The constraints below are the intended complexity, stated indirectly. Time limit here is ${problem.timeLimit || 1000}ms with ${problem.memoryLimit || 256}MB — work backwards from that to what your solution is allowed to cost.`
                : `The time limit is ${problem.timeLimit || 1000}ms and the memory limit ${problem.memoryLimit || 256}MB. Roughly 10⁸ simple operations fit in a second.`
        },
        {
            icon: "LuLayers",
            title: "Brute force first, then remove the waste",
            body: "Write the slow solution you are certain is correct. Then find the work it repeats — the repeated work is exactly what a better algorithm eliminates. This is faster than trying to be clever immediately, and it gives you a reference implementation to diff against."
        },
        {
            icon: "LuShieldCheck",
            title: "Attack your own solution",
            body: "Empty input. Single element. All elements identical. The maximum value the constraints allow, checked for overflow. These four cases catch most wrong answers."
        }
    ];

    return (
        <div className="stack stack-5">
            <div className="editorial__notice">
                <Icons.LuInfo size={15} aria-hidden="true" />
                <span>
                    This is a <strong>method</strong>, not a solution. CodeJudge does not
                    publish worked answers — the value of a problem is entirely in solving it.
                    Once you've solved it, compare approaches in {" "}
                    <strong>Discussions</strong>.
                </span>
            </div>

            <ol className="editorial">
                {steps.map((step, i) => {
                    const Icon = Icons[step.icon] || Icons.LuCircleDot;

                    return (
                        <li key={step.title} className="editorial__step">
                            <span className="editorial__marker" aria-hidden="true">
                                <Icon size={14} />
                            </span>

                            <div className="stack stack-2">
                                <h4 className="editorial__title">
                                    {i + 1}. {step.title}
                                </h4>
                                <p className="editorial__body">{step.body}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>

            {tags.length > 0 && (
                <Card variant="sunk" className="stack stack-3">
                    <span className="console__label">Techniques this problem is tagged with</span>
                    <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                        {tags.map((tag) => (
                            <Badge key={tag} tone="brand" size="lg">{tag}</Badge>
                        ))}
                    </div>
                    <p className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                        Tags are a spoiler of sorts — if you'd rather not know the intended
                        technique, they're the first thing to ignore.
                    </p>
                </Card>
            )}
        </div>
    );
};
