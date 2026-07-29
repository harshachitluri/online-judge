import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Editor, { loader } from "@monaco-editor/react";
import axiosInstance from "../api/axiosInstance";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LANG_LABEL, LANG_COLOR, RUNNABLE_LANGUAGES, filterRunnable } from "../constants/languages";
import { getVerdictMeta } from "../constants/verdicts";

// Fix CDN load errors by switching from jsdelivr to unpkg
loader.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.43.0/min/vs' } });

/* ── Constants ──────────────────────────────────────────────────────── */

// Default starter code shown when a problem doesn't define one for a language
const DEFAULT_STARTER = {
    cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Your code here

    return 0;
}`,
    java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Your code here
    }
}`,
    python: `import sys
input = sys.stdin.readline

def main():
    # Your code here
    pass

if __name__ == "__main__":
    main()`
};

const POLL_INTERVAL_MS = 2000;

// Stop polling after ~2 minutes so a stuck judge doesn't spin forever
const MAX_POLL_ATTEMPTS = 60;

/* ── Verdict Panel ──────────────────────────────────────────────────── */

// Maps a verdict to the styling variant defined in index.css
const VERDICT_PANEL_CLASS = {
    "Accepted": "accepted",
    "Time Limit Exceeded": "tle",
    "Compilation Error": "re",
    "Runtime Error": "re"
};

const VerdictPanel = ({ verdict }) => {
    if (!verdict) return null;

    const { icon, color } = getVerdictMeta(verdict.verdict);
    const panelClass = VERDICT_PANEL_CLASS[verdict.verdict] || "failed";

    return (
        <div className={`verdict-panel ${panelClass}`}>
            <div className="verdict-title" style={{ color }}>
                {icon} {verdict.verdict}
            </div>
            <div className="verdict-meta">
                {verdict.passedTestCases}/{verdict.totalTestCases} test cases passed
                {verdict.executionTime > 0 && ` · ${verdict.executionTime} ms`}
            </div>
            {verdict.errorMessage && (
                <div className="verdict-error-msg">{verdict.errorMessage}</div>
            )}
        </div>
    );
};

/* ── Run Output Panel ────────────────────────────────────────────────── */

const RunOutput = ({ result }) => {
    if (!result) return null;

    const isError = result.error;
    return (
        <div style={{ padding: "10px 14px", height: "100%", overflow: "auto" }}>
            {isError ? (
                <>
                    <div style={{
                        fontSize: "0.75rem", fontWeight: 600,
                        color: "var(--error)", marginBottom: 6
                    }}>
                        {result.type || "Error"}
                    </div>
                    <pre style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.82rem",
                        color: "var(--error)", whiteSpace: "pre-wrap", margin: 0
                    }}>{result.output}</pre>
                </>
            ) : (
                <>
                    {result.executionTime !== undefined && (
                        <div style={{
                            fontSize: "0.72rem", color: "var(--text-muted)",
                            marginBottom: 6
                        }}>
                            Executed in {result.executionTime} ms
                        </div>
                    )}
                    <pre style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.82rem",
                        color: "var(--success)", whiteSpace: "pre-wrap", margin: 0
                    }}>{result.output || "(no output)"}</pre>
                </>
            )}
        </div>
    );
};

/* ── Main Component ─────────────────────────────────────────────────── */

const ProblemDetailPage = () => {
    const { slug }       = useParams();
    const navigate       = useNavigate();
    const { isAuthenticated } = useAuth();
    const { editorTheme, toggleEditorTheme } = useTheme();

    // ── Problem data
    const [problem, setProblem]   = useState(null);
    const [sampleTestCases, setSampleTestCases] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState("");

    // ── Editor state
    const [language, setLanguage] = useState("cpp");
    const [code, setCode]         = useState(DEFAULT_STARTER.cpp);
    const [codeByLang, setCodeByLang] = useState({ ...DEFAULT_STARTER });

    // ── Tabs (left panel)
    const [leftTab, setLeftTab]   = useState("description"); // "description" | "submissions"

    // ── Run panel
    const [ioTab, setIoTab]       = useState("input"); // "input" | "output"
    const [customInput, setCustomInput] = useState("");
    const [runResult, setRunResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    // ── Submit
    const [isSubmitting, setIsSubmitting]   = useState(false);
    const [verdict, setVerdict]             = useState(null);
    const [submitError, setSubmitError]     = useState("");

    // Keep a ref to the poll timeout so we can clear on unmount
    const pollRef = useRef(null);

    // Latest run/submit handlers, for the keyboard shortcuts below
    const runRef = useRef(null);
    const submitRef = useRef(null);

    /* ── Fetch problem ────────────────────────────────────────────── */
    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await axiosInstance.get(`/problems/${slug}`);
                const p = res.data.data;
                setProblem(p);

                // Fetch sample test cases for this problem
                try {
                    const tcRes = await axiosInstance.get(`/testcases/problem/${p._id}`);
                    setSampleTestCases(tcRes.data.data || []);
                } catch (tcErr) {
                    console.error("Failed to fetch sample test cases");
                }

                // Set default language to the first supported *runnable* one
                const firstLang = filterRunnable(p.supportedLanguages || [])[0] || "cpp";
                setLanguage(firstLang);

                // Build per-language code map: use problem's starter code if set
                const map = { ...DEFAULT_STARTER };
                if (p.starterCode) {
                    Object.keys(p.starterCode).forEach((lang) => {
                        if (p.starterCode[lang]) map[lang] = p.starterCode[lang];
                    });
                }
                setCodeByLang(map);
                setCode(map[firstLang]);

            } catch {
                setError("Problem not found.");
            } finally {
                setLoading(false);
            }
        };
        fetch();

        // Cleanup poll on unmount
        return () => { if (pollRef.current) clearTimeout(pollRef.current); };
    }, [slug]);

    /* ── Language switch — persist code per language ─────────────── */
    const handleLanguageChange = (newLang) => {
        // Save current code for current language
        setCodeByLang((prev) => ({ ...prev, [language]: code }));
        // Switch to new language's code
        setLanguage(newLang);
        setCode(codeByLang[newLang] || DEFAULT_STARTER[newLang] || "");
        setVerdict(null);
        setRunResult(null);
    };

    /* ── Run (playground mode) ──────────────────────────────────── */
    const handleRun = async () => {
        if (!isAuthenticated) { navigate("/login"); return; }
        if (!code.trim()) return;

        setIsRunning(true);
        setRunResult(null);
        setIoTab("output");

        try {
            const res = await axiosInstance.post("/run", {
                language,
                sourceCode: code,
                input: customInput
            });
            setRunResult(res.data.data);
        } catch (err) {
            setRunResult({
                error: true,
                type: "Error",
                output: err.response?.data?.message || "Request failed."
            });
        } finally {
            setIsRunning(false);
        }
    };

    /* ── Poll submission verdict ──────────────────────────────────── */
    const pollVerdict = useCallback((submissionId) => {
        // Drop any poll left running from a previous submission
        if (pollRef.current) clearTimeout(pollRef.current);

        let attempts = 0;

        const poll = async () => {
            try {
                const res = await axiosInstance.get(`/submissions/${submissionId}`);
                const sub = res.data.data;

                if (sub.status === "Completed") {
                    setVerdict(sub);
                    setIsSubmitting(false);
                    return;
                }

                attempts += 1;

                if (attempts >= MAX_POLL_ATTEMPTS) {
                    setIsSubmitting(false);
                    setSubmitError(
                        "The judge is taking longer than expected. Check My Submissions in a moment."
                    );
                    return;
                }

                pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
            } catch {
                setIsSubmitting(false);
                setSubmitError("Failed to fetch submission status.");
            }
        };
        poll();
    }, []);

    /* ── Submit ───────────────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!isAuthenticated) { navigate("/login"); return; }
        if (!code.trim()) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        setVerdict(null);
        setSubmitError("");
        setLeftTab("description");

        try {
            const res = await axiosInstance.post("/submissions", {
                problemId: problem._id,
                language,
                sourceCode: code
            });
            const { _id: submissionId } = res.data.data;
            pollVerdict(submissionId);
        } catch (err) {
            setIsSubmitting(false);
            setSubmitError(
                err.response?.data?.message || "Submission failed. Please try again."
            );
        }
    };

    runRef.current = handleRun;
    submitRef.current = handleSubmit;

    /* ── Keyboard shortcuts ───────────────────────────────────────── */
    /* Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits — the muscle memory
       from every other online judge. Registered on the window so they work
       from inside the Monaco editor too. */
    useEffect(() => {
        const onKeyDown = (e) => {
            const combo = (e.metaKey || e.ctrlKey) && e.key === "Enter";
            if (!combo) return;

            e.preventDefault();
            if (e.shiftKey) {
                submitRef.current?.();
            } else {
                runRef.current?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    /* ── Render ───────────────────────────────────────────────────── */

    if (loading) return <Loader fullPage text="Loading problem..." />;

    if (error) return (
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <p style={{ color: "var(--error)", marginBottom: 16, fontSize: "1.1rem" }}>
                    {error}
                </p>
                <Link to="/problems" className="btn btn-secondary">← Back to Problems</Link>
            </div>
        </div>
    );

    const supportedLangs = filterRunnable(problem?.supportedLanguages || RUNNABLE_LANGUAGES);

    return (
        <div
            className="problem-layout"
            /* Offset the fixed navbar using the token, so the two stay in sync */
            style={{ marginTop: "var(--navbar-h)", height: "calc(100vh - var(--navbar-h))" }}
        >
            {/* ═══════════════ LEFT PANEL ═══════════════ */}
            <div className="problem-left">

                {/* Tabs */}
                <div className="tabs" style={{ padding: "0 16px" }}>
                    <button
                        className={`tab-btn ${leftTab === "description" ? "active" : ""}`}
                        onClick={() => setLeftTab("description")}
                    >Description</button>
                    <button
                        className={`tab-btn ${leftTab === "submissions" ? "active" : ""}`}
                        onClick={() => setLeftTab("submissions")}
                    >Submissions</button>
                </div>

                {leftTab === "description" && (
                    <>
                        {/* Problem header */}
                        <div className="problem-info">
                            <h1 className="problem-title">{problem.title}</h1>
                            <div className="problem-meta">
                                <span className={`badge badge-${problem.difficulty?.toLowerCase()}`}>
                                    {problem.difficulty}
                                </span>
                                {(problem.tags || []).map((tag) => (
                                    <span className="tag-chip" key={tag}>{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* Problem body */}
                        <div className="problem-body">
                            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                                {problem.description}
                            </p>

                            {problem.constraints && (
                                <>
                                    <h3>Constraints</h3>
                                    <div className="example-block" style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                                        <pre>{problem.constraints}</pre>
                                    </div>
                                </>
                            )}

                            {sampleTestCases.length > 0 && (
                                <>
                                    <h3>Examples</h3>
                                    {sampleTestCases.map((tc, i) => (
                                        <div className="example-block" key={tc._id}>
                                            <div className="ex-label">Example {i + 1}</div>
                                            <div style={{ marginBottom: 8 }}>
                                                <strong style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Input:</strong>
                                                <pre>{tc.input}</pre>
                                            </div>
                                            <div>
                                                <strong style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Output:</strong>
                                                <pre>{tc.expectedOutput}</pre>
                                            </div>
                                            {tc.explanation && (
                                                <div style={{ marginTop: 8 }}>
                                                    <strong style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Explanation:</strong>
                                                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                        {tc.explanation}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Verdict panel (shown below description) */}
                            {isSubmitting && (
                                <div style={{ marginTop: 16 }}>
                                    <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        Judging your submission...
                                    </div>
                                </div>
                            )}
                            {submitError && (
                                <div className="alert alert-error mt-4">{submitError}</div>
                            )}
                            {verdict && <VerdictPanel verdict={verdict} />}
                        </div>
                    </>
                )}

                {leftTab === "submissions" && (
                    <div style={{ padding: "16px 24px" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            View all your submissions for this problem in{" "}
                            <Link to="/submissions" style={{ color: "var(--accent-light)" }}>
                                My Submissions
                            </Link>.
                        </p>
                    </div>
                )}
            </div>

            {/* ═══════════════ RIGHT PANEL ═══════════════ */}
            <div className="problem-right">

                {/* Editor toolbar */}
                <div className="editor-toolbar">
                    <div className="editor-toolbar-left">
                        <select
                            className="form-select"
                            style={{ width: "auto", minWidth: 130 }}
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                        >
                            {supportedLangs.map((lang) => (
                                <option key={lang} value={lang}>
                                    {LANG_LABEL[lang] || lang}
                                </option>
                            ))}
                        </select>
                        <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: LANG_COLOR[language] || "var(--text-muted)",
                            display: "inline-block"
                        }} />
                        <button 
                            className="theme-toggle" 
                            onClick={toggleEditorTheme}
                            title={`Switch to ${editorTheme === "vs-dark" ? "Light" : "Dark"} Mode`}
                        >
                            {editorTheme === "vs-dark" ? "☀️" : "🌙"}
                        </button>
                    </div>
                    <div className="editor-toolbar-right">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleRun}
                            disabled={isRunning || isSubmitting}
                            title="Run with custom input (Ctrl/Cmd + Enter)"
                        >
                            {isRunning ? (
                                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running...</>
                            ) : "▶ Run"}
                        </button>
                        <button
                            className="btn btn-success btn-sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRunning || !isAuthenticated}
                            title={!isAuthenticated
                                ? "Login to submit"
                                : "Submit for judging (Ctrl/Cmd + Shift + Enter)"}
                        >
                            {isSubmitting ? (
                                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Judging...</>
                            ) : "Submit"}
                        </button>
                    </div>
                </div>

                {/* Monaco Editor */}
                <div style={{ flex: 1, minHeight: 0 }}>
                    <Editor
                        height="100%"
                        language={language === "cpp" ? "cpp" : language}
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        theme={editorTheme}
                        options={{
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontLigatures: true,
                            minimap: { enabled: false },
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4,
                            insertSpaces: true,
                            wordWrap: "off",
                            renderLineHighlight: "all",
                            smoothScrolling: true,
                            cursorBlinking: "smooth",
                            padding: { top: 12, bottom: 12 }
                        }}
                    />
                </div>

                {/* I/O Panel */}
                <div className="io-panel">
                    <div className="io-tabs">
                        <button
                            className={`tab-btn ${ioTab === "input" ? "active" : ""}`}
                            style={{ fontSize: "0.8rem" }}
                            onClick={() => setIoTab("input")}
                        >
                            Custom Input
                        </button>
                        <button
                            className={`tab-btn ${ioTab === "output" ? "active" : ""}`}
                            style={{ fontSize: "0.8rem" }}
                            onClick={() => setIoTab("output")}
                        >
                            Output {isRunning && "⏳"}
                        </button>
                    </div>
                    <div className="io-content">
                        {ioTab === "input" ? (
                            <textarea
                                className="io-textarea"
                                placeholder="Enter custom input here..."
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                spellCheck={false}
                            />
                        ) : (
                            isRunning ? (
                                <div style={{ padding: "10px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                        Executing...
                                    </div>
                                </div>
                            ) : (
                                <RunOutput result={runResult} />
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemDetailPage;
