import React, {
    useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE } from "../config/brand";
import {
    fetchProblemBySlug, fetchSampleTestCases, runCode,
    createSubmission, pollSubmission, fetchMySubmissions
} from "../services/judge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { useAsync, useHotkey, useLocalStorage, useIsMobile } from "../hooks";
import {
    languageMeta, runnableOnly, FALLBACK_STARTER, verdictMeta
} from "../lib/domain";
import { errorMessage } from "../api/client";
import { setEditorFocused, resetEditorFocus } from "../lib/editorFocus";
import { duration, relativeTime, number as fmtNumber } from "../lib/format";
import {
    Button, Badge, DifficultyBadge, VerdictBadge, Select, Tabs,
    Spinner, ErrorState, EmptyState, ConfirmDialog
} from "../components/ui";
import Splitter from "../components/forge/Splitter";
import { SamplePanel, CustomPanel, JudgePanel } from "../components/forge/Console";
import {
    ComplexityPanel, ReviewPanel, HintsPanel, EditorialPanel
} from "../components/forge/SagePanel";
import { BarSeries } from "../components/charts";

/*
 |==========================================================================
 | The Forge — coding workspace
 |==========================================================================
 | Three resizable regions:
 |
 |   ┌──────────────┬────────────────────────┐
 |   │  Briefing    │  Editor                │
 |   │  (problem,   ├────────────────────────┤
 |   │   hints,     │  Console               │
 |   │   editorial) │  (samples/custom/judge)│
 |   └──────────────┴────────────────────────┘
 |
 | Draft code is persisted per problem *and* per language, so switching
 | languages doesn't destroy work and neither does closing the tab.
 */

// Monaco is ~1MB. Loading it lazily keeps it off every other route.
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

/* ── Editor themes ─────────────────────────────────────────────────────── */

/*
 | Monaco ships vs-dark, which is a different dark from CodeJudge's. Defining
 | our own keeps the editor from looking like a foreign panel dropped into
 | the app.
 */
const defineThemes = (monaco) => {
    monaco.editor.defineTheme("axiom-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "5d6479", fontStyle: "italic" },
            { token: "keyword", foreground: "9c8ffa" },
            { token: "string", foreground: "7ddba8" },
            { token: "number", foreground: "f0a868" },
            { token: "type", foreground: "5eddf5" },
            { token: "function", foreground: "8fb8f5" }
        ],
        colors: {
            "editor.background": "#0f121b",
            "editor.foreground": "#e4e6ee",
            "editorLineNumber.foreground": "#3d4459",
            "editorLineNumber.activeForeground": "#8a8fa3",
            "editor.selectionBackground": "#7f6bf03d",
            "editor.lineHighlightBackground": "#161a26",
            "editorCursor.foreground": "#7f6bf0",
            "editorIndentGuide.background1": "#1e2434",
            "editorWidget.background": "#141824",
            "editorWidget.border": "#2a3042",
            "editorSuggestWidget.selectedBackground": "#7f6bf033"
        }
    });

    monaco.editor.defineTheme("axiom-light", {
        base: "vs",
        inherit: true,
        rules: [
            { token: "comment", foreground: "9698a8", fontStyle: "italic" },
            { token: "keyword", foreground: "5340c0" },
            { token: "string", foreground: "1a7f4e" },
            { token: "number", foreground: "b45309" }
        ],
        colors: {
            "editor.background": "#ffffff",
            "editor.foreground": "#1a1c25",
            "editorLineNumber.foreground": "#c1c3d1",
            "editor.selectionBackground": "#7f6bf026",
            "editor.lineHighlightBackground": "#f6f6fb",
            "editorCursor.foreground": "#5340c0"
        }
    });
};

/* ── Statement rendering ───────────────────────────────────────────────── */

/*
 | Problem statements are stored as markdown-ish text. A full markdown
 | renderer would be another dependency for four constructs, so this handles
 | exactly what the authoring form produces: headings, bold, inline code,
 | fenced blocks and lists.
 |
 | Everything is escaped first, so a statement can never inject markup.
 */
const escapeHtml = (text) =>
    String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const renderStatement = (source = "") => {
    const escaped = escapeHtml(source);

    return escaped
        .replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="statement__pre">${code.trim()}</pre>`)
        .replace(/`([^`\n]+)`/g, '<code class="statement__code">$1</code>')
        .replace(/^###\s+(.+)$/gm, '<h4 class="statement__h">$1</h4>')
        .replace(/^##\s+(.+)$/gm, '<h3 class="statement__h">$1</h3>')
        .replace(/^#\s+(.+)$/gm, '<h3 class="statement__h">$1</h3>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>")
        .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul class="statement__list">$1</ul>')
        .split(/\n{2,}/)
        .map((block) =>
            /^\s*<(pre|h3|h4|ul)/.test(block) ? block : `<p>${block.replace(/\n/g, "<br/>")}</p>`
        )
        .join("");
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Forge = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const { user } = useAuth();
    const toast = useToast();
    const { resolvedScheme, editorFontSize } = useTheme();
    const isMobile = useIsMobile();

    /* ── Data ──────────────────────────────────────────────────────────── */

    const problemQuery = useAsync(() => fetchProblemBySlug(slug), [slug]);
    const problem = problemQuery.data;

    const samplesQuery = useAsync(
        () => (problem?._id ? fetchSampleTestCases(problem._id) : Promise.resolve([])),
        [problem?._id]
    );

    const historyQuery = useAsync(
        () => fetchMySubmissions({ limit: 50 }),
        [problem?._id]
    );

    /* Submissions this user made against *this* problem. */
    const history = useMemo(() => {
        const all = historyQuery.data?.submissions || [];
        return all.filter((s) => s.problemId?._id === problem?._id);
    }, [historyQuery.data, problem?._id]);

    /* ── Language & code ───────────────────────────────────────────────── */

    const languages = useMemo(
        () => runnableOnly(problem?.supportedLanguages || []),
        [problem]
    );

    const [language, setLanguage] = useState(null);

    /*
     | Pick a language once the problem loads: the user's preferred one if
     | this problem supports it, otherwise the first that it does.
     */
    useEffect(() => {
        if (!languages.length || language) return;

        const preferred = user?.preferredLanguage;
        setLanguage(languages.includes(preferred) ? preferred : languages[0]);
    }, [languages, language, user]);

    // Drafts are keyed by problem *and* language, so switching languages
    // parks the previous draft instead of destroying it.
    const draftKey = `axiom.draft.${slug}.${language}`;
    const [code, setCode] = useLocalStorage(draftKey, null);

    /* Seed the editor from the problem's starter code the first time this
       (problem, language) pair is opened. */
    useEffect(() => {
        if (!problem || !language || code !== null) return;

        const starter = problem.starterCode?.[language];
        setCode(starter || FALLBACK_STARTER[language] || "");
    }, [problem, language, code, setCode]);

    /* ── Execution state ───────────────────────────────────────────────── */

    const [customInput, setCustomInput] = useState("");
    const [runResult, setRunResult] = useState(null);
    const [running, setRunning] = useState(false);

    const [submission, setSubmission] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [consoleTab, setConsoleTab] = useState("samples");
    const [briefTab, setBriefTab] = useState("statement");
    const [resetOpen, setResetOpen] = useState(false);

    // Aborts an in-flight poll when the user navigates away mid-judge.
    const pollAbort = useRef(null);
    useEffect(() => () => pollAbort.current?.abort(), []);

    /* ── Actions ───────────────────────────────────────────────────────── */

    const onRun = useCallback(async () => {
        if (!code?.trim()) {
            toast.warn("Nothing to run", "The editor is empty.");
            return;
        }

        setRunning(true);
        setConsoleTab("custom");

        try {
            const result = await runCode({ language, sourceCode: code, input: customInput });
            // `at` gives AnimatePresence a key so consecutive runs animate.
            setRunResult({ ...result, at: Date.now() });

            if (result.error) {
                toast.warn("Execution failed", result.type || "See the console for details.");
            }
        } catch (error) {
            toast.error("Couldn't reach the runner", errorMessage(error));
        } finally {
            setRunning(false);
        }
    }, [code, language, customInput, toast]);

    const onSubmit = useCallback(async () => {
        if (!code?.trim()) {
            toast.warn("Nothing to submit", "The editor is empty.");
            return;
        }

        setSubmitting(true);
        setSubmission(null);
        setConsoleTab("judge");

        const controller = new AbortController();
        pollAbort.current = controller;

        try {
            const created = await createSubmission({
                problemId: problem._id,
                language,
                sourceCode: code
            });

            setSubmission(created);

            const final = await pollSubmission(created._id, {
                onTick: setSubmission,
                signal: controller.signal
            });

            const meta = verdictMeta(final.verdict);

            if (final.verdict === "Accepted") {
                toast.success("Accepted", `All ${final.totalTestCases} test cases passed.`);
            } else {
                toast.warn(final.verdict, meta.blurb);
            }

            historyQuery.reload();
        } catch (error) {
            if (error.name === "AbortError") return;
            toast.error("Submission failed", errorMessage(error));
            setSubmission(null);
        } finally {
            setSubmitting(false);
            pollAbort.current = null;
        }
    }, [code, language, problem, toast, historyQuery]);

    /*
     | Report the editor's focus to the global hotkey layer, so single-key
     | shortcuts ("/" opens the command palette) don't steal keystrokes meant
     | for the code. Monaco's own events are the only reliable signal here —
     | see lib/editorFocus.js for why the DOM can't be inspected instead.
     */
    const handleEditorMount = useCallback((editor) => {
        editor.onDidFocusEditorText(() => setEditorFocused(true));
        editor.onDidBlurEditorText(() => setEditorFocused(false));
    }, []);

    // A editor torn down while focused never fires its blur, which would
    // leave the flag stuck on and disable "/" everywhere else in the app.
    useEffect(() => resetEditorFocus, []);

    const onReset = () => {
        const starter = problem?.starterCode?.[language];
        setCode(starter || FALLBACK_STARTER[language] || "");
        setResetOpen(false);
        toast.info("Editor reset", "Back to the starter template.");
    };

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code || "");
            toast.success("Copied", "Your solution is on the clipboard.");
        } catch {
            toast.error("Copy blocked", "Your browser refused clipboard access.");
        }
    };

    useHotkey("mod+enter", onRun, { allowInInput: true, enabled: !!problem });
    useHotkey("mod+s", (e) => {
        e.preventDefault?.();
        onSubmit();
    }, { allowInInput: true, enabled: !!problem });

    /* ── Loading & error ───────────────────────────────────────────────── */

    if (problemQuery.loading) {
        return (
            <div className="forge forge--centered">
                <Spinner size={24} />
                <span className="text-muted" style={{ fontSize: "var(--fs-sm)" }}>
                    Opening the editor…
                </span>
            </div>
        );
    }

    if (problemQuery.error || !problem) {
        return (
            <div className="shell" style={{ paddingBlock: "var(--sp-16)" }}>
                <ErrorState
                    title="That problem isn't in the archive"
                    body="It may be unpublished, renamed, or removed. The archive is the best place to find what replaced it."
                    onRetry={() => navigate(MODULE.vault.path)}
                />
            </div>
        );
    }

    if (!languages.length) {
        return (
            <div className="shell" style={{ paddingBlock: "var(--sp-16)" }}>
                <EmptyState
                    icon={Icons.LuCircleOff}
                    title="No runnable language"
                    body="This problem lists no language the judge can execute. An admin needs to fix its configuration before it can be attempted."
                    action={<Button variant="secondary" to={MODULE.vault.path}>Back to Problems</Button>}
                />
            </div>
        );
    }

    /* ── Panels ────────────────────────────────────────────────────────── */

    const accepted = history.filter((s) => s.verdict === "Accepted").length;

    const briefing = (
        <div className="brief">
            <div className="brief__head">
                <div className="stack stack-2" style={{ minWidth: 0 }}>
                    <Link to={MODULE.vault.path} className="brief__back">
                        <Icons.LuArrowLeft size={13} aria-hidden="true" /> Problems
                    </Link>

                    <h1 className="brief__title">{problem.title}</h1>

                    <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                        <DifficultyBadge level={problem.difficulty} size="lg" />
                        {accepted > 0 && (
                            <Badge tone="good" icon={Icons.LuCircleCheck}>Solved</Badge>
                        )}
                        {(problem.tags || []).slice(0, 4).map((tag) => (
                            <Badge key={tag} tone="neutral">{tag}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <Tabs
                items={[
                    { id: "statement", label: "Brief", icon: Icons.LuFileText },
                    { id: "hints", label: "Hints", icon: Icons.LuLightbulb },
                    { id: "editorial", label: "Method", icon: Icons.LuScrollText },
                    { id: "history", label: "Runs", icon: Icons.LuHistory, count: history.length }
                ]}
                value={briefTab}
                onChange={setBriefTab}
            />

            <div className="brief__body">
                {briefTab === "statement" && (
                    <div className="stack stack-6">
                        <div
                            className="statement"
                            // Source is escaped in renderStatement before any
                            // markup is introduced, so no author-supplied HTML
                            // can reach the DOM.
                            dangerouslySetInnerHTML={{ __html: renderStatement(problem.description) }}
                        />

                        {(problem.examples || []).length > 0 && (
                            <div className="stack stack-3">
                                <h3 className="statement__h">Examples</h3>

                                {problem.examples.map((example, i) => (
                                    <div key={i} className="example">
                                        <span className="example__num">Example {i + 1}</span>

                                        <div className="example__row">
                                            <span className="example__label">Input</span>
                                            <pre className="example__value">{example.input}</pre>
                                        </div>

                                        <div className="example__row">
                                            <span className="example__label">Output</span>
                                            <pre className="example__value">{example.output}</pre>
                                        </div>

                                        {example.explanation && (
                                            <p className="example__explain">{example.explanation}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {problem.constraints && (
                            <div className="stack stack-3">
                                <h3 className="statement__h">Constraints</h3>
                                <pre className="statement__pre">{problem.constraints}</pre>
                            </div>
                        )}

                        <div className="brief__limits">
                            <span>
                                <Icons.LuTimer size={13} aria-hidden="true" />
                                {problem.timeLimit || 1000} ms limit
                            </span>
                            <span>
                                <Icons.LuDatabase size={13} aria-hidden="true" />
                                {problem.memoryLimit || 256} MB limit
                            </span>
                            <span>
                                <Icons.LuUsers size={13} aria-hidden="true" />
                                {fmtNumber(problem.submissionCount || 0)} attempts
                            </span>
                        </div>
                    </div>
                )}

                {briefTab === "hints" && (
                    <HintsPanel problem={problem} code={code} language={language} />
                )}
                {briefTab === "editorial" && <EditorialPanel problem={problem} />}

                {briefTab === "history" && (
                    history.length === 0 ? (
                        <EmptyState
                            icon={Icons.LuHistory}
                            title="No attempts yet"
                            body="Every submission you make against this problem will be listed here with its verdict and timings."
                        />
                    ) : (
                        <div className="stack stack-5">
                            <BarSeries
                                data={Object.entries(
                                    history.reduce((acc, s) => {
                                        acc[s.verdict] = (acc[s.verdict] || 0) + 1;
                                        return acc;
                                    }, {})
                                ).map(([verdict, count]) => ({
                                    label: verdict,
                                    value: count,
                                    color: verdictMeta(verdict).color
                                }))}
                                showPercent
                                height={16}
                            />

                            <ul className="stack stack-2">
                                {history.map((s) => (
                                    <li key={s._id} className="runrow">
                                        <VerdictBadge verdict={s.verdict} short />
                                        <span className="runrow__lang">
                                            {languageMeta(s.language).label}
                                        </span>
                                        <span className="runrow__time tnum">
                                            {duration(s.executionTime)}
                                        </span>
                                        <span className="runrow__when">
                                            {relativeTime(s.createdAt)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                )}
            </div>
        </div>
    );

    const editor = (
        <div className="editor">
            <div className="editor__bar">
                <Select
                    value={language || ""}
                    onChange={(e) => setLanguage(e.target.value)}
                    aria-label="Language"
                    className="editor__lang"
                    options={languages.map((id) => ({ value: id, label: languageMeta(id).label }))}
                />

                <span className="spacer" />

                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Icons.LuCopy}
                    onClick={onCopy}
                    aria-label="Copy code"
                    title="Copy to clipboard"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Icons.LuRotateCcw}
                    onClick={() => setResetOpen(true)}
                    aria-label="Reset to starter code"
                    title="Reset to starter code"
                />

                <Button
                    variant="secondary"
                    size="sm"
                    icon={Icons.LuPlay}
                    onClick={onRun}
                    loading={running}
                    disabled={submitting}
                    title="Run against your custom input (⌘↵)"
                >
                    Run
                </Button>

                <Button
                    variant="primary"
                    size="sm"
                    icon={Icons.LuSend}
                    onClick={onSubmit}
                    loading={submitting}
                    disabled={running}
                    title="Submit to the judge (⌘S)"
                >
                    Submit
                </Button>
            </div>

            <div className="editor__surface">
                <Suspense
                    fallback={
                        <div className="editor__loading">
                            <Spinner size={20} />
                            <span>Loading the editor…</span>
                        </div>
                    }
                >
                    <MonacoEditor
                        height="100%"
                        language={languageMeta(language).monaco}
                        theme={resolvedScheme === "light" ? "axiom-light" : "axiom-dark"}
                        value={code ?? ""}
                        onChange={(value) => setCode(value ?? "")}
                        beforeMount={defineThemes}
                        onMount={handleEditorMount}
                        options={{
                            fontSize: editorFontSize,
                            fontFamily: "var(--font-mono)",
                            fontLigatures: false,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            smoothScrolling: true,
                            cursorBlinking: "smooth",
                            cursorSmoothCaretAnimation: "on",
                            padding: { top: 16, bottom: 16 },
                            renderLineHighlight: "all",
                            lineNumbersMinChars: 3,
                            automaticLayout: true,
                            tabSize: 4,
                            bracketPairColorization: { enabled: true },
                            // Accessibility: never trap Tab inside the editor
                            // without an escape hatch.
                            tabFocusMode: false,
                            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
                        }}
                    />
                </Suspense>
            </div>
        </div>
    );

    const consoleTabs = [
        { id: "samples", label: "Samples", icon: Icons.LuFlaskConical, count: samplesQuery.data?.length },
        { id: "custom", label: "Custom input", icon: Icons.LuTerminal },
        { id: "judge", label: "Judge", icon: Icons.LuGavel },
        { id: "complexity", label: "Complexity", icon: Icons.LuGauge },
        { id: "review", label: "AI review", icon: Icons.LuScanEye }
    ];

    const consolePanel = (
        <div className="console">
            <div className="console__bar">
                <Tabs items={consoleTabs} value={consoleTab} onChange={setConsoleTab} />
            </div>

            <div className="console__body">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={consoleTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                    >
                        {consoleTab === "samples" && (
                            <SamplePanel samples={samplesQuery.data || []} running={running} />
                        )}

                        {consoleTab === "custom" && (
                            <CustomPanel
                                input={customInput}
                                onInput={setCustomInput}
                                result={runResult}
                                running={running}
                                onRun={onRun}
                            />
                        )}

                        {consoleTab === "judge" && (
                            <JudgePanel submission={submission} submitting={submitting} />
                        )}

                        {consoleTab === "complexity" && (
                            <ComplexityPanel code={code} language={language} />
                        )}

                        {consoleTab === "review" && (
                            <ReviewPanel code={code} language={language} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );

    /* ── Layout ────────────────────────────────────────────────────────── */

    return (
        <div className="forge">
            <Splitter
                direction="horizontal"
                initial={40}
                min={24}
                max={62}
                storageKey="axiom.forge.split.h"
                // On a phone there is no room for two panes; everything
                // stacks and the splitter disappears entirely.
                disabled={isMobile}
                className="forge__main"
                first={briefing}
                second={
                    <Splitter
                        direction="vertical"
                        initial={58}
                        min={25}
                        max={80}
                        storageKey="axiom.forge.split.v"
                        disabled={isMobile}
                        first={editor}
                        second={consolePanel}
                    />
                }
            />

            <ConfirmDialog
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                onConfirm={onReset}
                title="Reset the editor?"
                body="Your current draft for this language will be replaced with the starter template. This can't be undone."
                confirmLabel="Reset"
            />
        </div>
    );
};

export default Forge;
