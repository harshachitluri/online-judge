import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { verdictMeta } from "../../lib/domain";
import { duration, memory } from "../../lib/format";
import { Badge, VerdictBadge, Button, ProgressBar, TextArea } from "../ui";

/*
 |==========================================================================
 | Console
 |==========================================================================
 | The output half of the Forge: sample test cases, a custom-input
 | playground, and the judge result for a real submission.
 |
 | The three are distinct on purpose. "Run" executes against input you
 | control and proves nothing; "Submit" executes against hidden test cases
 | and is the only thing that produces a verdict. Blurring them is how
 | people end up surprised by a Wrong Answer.
 */

/* ── Sample cases ──────────────────────────────────────────────────────── */

export const SamplePanel = ({ samples = [], results = [], running }) => {
    if (!samples.length) {
        return (
            <p className="console__hint">
                This problem ships no sample cases. Use <strong>Custom input</strong> to try
                your own, then submit to run against the hidden set.
            </p>
        );
    }

    return (
        <div className="stack stack-3">
            {samples.map((sample, i) => {
                const result = results[i];

                return (
                    <div key={sample._id || i} className="testcase">
                        <div className="testcase__head">
                            <span className="testcase__name">Case {i + 1}</span>

                            {running ? (
                                <Badge tone="info" dot pulse>Running</Badge>
                            ) : result ? (
                                result.passed ? (
                                    <Badge tone="good" icon={Icons.LuCircleCheck}>Passed</Badge>
                                ) : (
                                    <Badge tone="critical" icon={Icons.LuCircleX}>Failed</Badge>
                                )
                            ) : (
                                <Badge tone="neutral">Not run</Badge>
                            )}
                        </div>

                        <div className="testcase__grid">
                            <div className="testcase__field">
                                <span className="testcase__label">Input</span>
                                <pre className="testcase__value">{sample.input || "(empty)"}</pre>
                            </div>

                            <div className="testcase__field">
                                <span className="testcase__label">Expected</span>
                                <pre className="testcase__value">{sample.expectedOutput}</pre>
                            </div>

                            {result && (
                                <div className="testcase__field">
                                    <span className="testcase__label">
                                        Your output
                                        {!result.passed && (
                                            <span className="testcase__diff"> — differs</span>
                                        )}
                                    </span>
                                    <pre
                                        className={`testcase__value ${result.passed ? "" : "testcase__value--bad"}`}
                                    >
                                        {result.output || "(no output)"}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {sample.explanation && (
                            <p className="testcase__explain">
                                <Icons.LuInfo size={12} aria-hidden="true" /> {sample.explanation}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/* ── Custom input ──────────────────────────────────────────────────────── */

export const CustomPanel = ({ input, onInput, result, running, onRun }) => (
    <div className="stack stack-4">
        <div className="stack stack-2">
            <div className="row row-between">
                <span className="console__label">Standard input</span>
                <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                    Fed to your program on stdin
                </span>
            </div>

            <TextArea
                value={input}
                onChange={(e) => onInput(e.target.value)}
                placeholder={"Type the input your program should read…\n\n3\n1 2 3"}
                spellCheck="false"
                className="mono"
                style={{ minHeight: 110 }}
                aria-label="Custom standard input"
            />
        </div>

        <Button
            variant="secondary"
            icon={Icons.LuPlay}
            onClick={onRun}
            loading={running}
            size="sm"
        >
            Run with this input
        </Button>

        <AnimatePresence mode="wait">
            {result && (
                <motion.div
                    key={result.at}
                    className="stack stack-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="row row-between">
                        <span className="console__label">
                            {result.error ? "Execution failed" : "Standard output"}
                        </span>
                        <span className="text-faint tnum" style={{ fontSize: "var(--fs-2xs)" }}>
                            {duration(result.executionTime)}
                        </span>
                    </div>

                    <pre className={`console__out ${result.error ? "console__out--bad" : ""}`}>
                        {result.output || "(no output)"}
                    </pre>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

/* ── Judge result ──────────────────────────────────────────────────────── */

/**
 * The verdict panel.
 *
 * While the worker is still processing, this shows the live queue state
 * rather than a generic spinner — knowing you're at "Running" instead of
 * "Queued" is the difference between waiting and wondering.
 */
export const JudgePanel = ({ submission, submitting }) => {
    if (!submission && !submitting) {
        return (
            <p className="console__hint">
                Nothing submitted this session. <strong>Submit</strong> runs your code
                against every hidden test case and records the verdict against your
                account.
            </p>
        );
    }

    const pending = submitting || submission?.status !== "Completed";
    const meta = verdictMeta(submission?.verdict);
    const passed = submission?.passedTestCases || 0;
    const totalCases = submission?.totalTestCases || 0;

    return (
        <div className="stack stack-4">
            <div className={`judge ${pending ? "judge--pending" : `judge--${meta.tone}`}`}>
                <div className="judge__head">
                    {pending ? (
                        <>
                            <span className="spinner" style={{ width: 18, height: 18 }} />
                            <div className="stack stack-1">
                                <span className="judge__verdict">
                                    {submission?.status === "Running"
                                        ? "Executing against the hidden set"
                                        : "Queued for the judge"}
                                </span>
                                <span className="judge__sub">
                                    {submission?.status === "Running"
                                        ? "Your code is compiled and running."
                                        : "Waiting for a free worker."}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <VerdictBadge verdict={submission.verdict} size="lg" />
                            <div className="stack stack-1">
                                <span className="judge__verdict">{submission.verdict}</span>
                                <span className="judge__sub">{meta.blurb}</span>
                            </div>
                        </>
                    )}
                </div>

                {totalCases > 0 && (
                    <div className="stack stack-2">
                        <div className="row row-between">
                            <span className="console__label">Test cases</span>
                            <span className="tnum" style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)" }}>
                                {passed} / {totalCases} passed
                            </span>
                        </div>
                        <ProgressBar
                            value={passed}
                            max={totalCases}
                            label={`${passed} of ${totalCases} test cases passed`}
                            color={passed === totalCases ? "var(--status-good)" : "var(--status-warning)"}
                            thin
                        />
                    </div>
                )}
            </div>

            {!pending && (
                <>
                    <div className="judge__metrics">
                        <div className="judge__metric">
                            <Icons.LuTimer size={14} aria-hidden="true" />
                            <span className="judge__metric-value tnum">
                                {duration(submission.executionTime)}
                            </span>
                            <span className="judge__metric-label">Runtime</span>
                        </div>

                        <div className="judge__metric">
                            <Icons.LuDatabase size={14} aria-hidden="true" />
                            <span className="judge__metric-value tnum">
                                {memory(submission.memoryUsed)}
                            </span>
                            <span className="judge__metric-label">Memory</span>
                        </div>

                        <div className="judge__metric">
                            <Icons.LuListChecks size={14} aria-hidden="true" />
                            <span className="judge__metric-value tnum">
                                {passed}/{totalCases}
                            </span>
                            <span className="judge__metric-label">Cases</span>
                        </div>
                    </div>

                    {submission.errorMessage && (
                        <div className="stack stack-2">
                            <span className="console__label">Judge output</span>
                            <pre className="console__out console__out--bad">
                                {submission.errorMessage}
                            </pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
