import React, { useState, useMemo, useEffect } from "react";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import {
    fetchProblems, fetchProblemById, createProblem, updateProblem, deleteProblem,
    fetchAllTestCases, createTestCase, updateTestCase, deleteTestCase
} from "../services/judge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks";
import { errorMessage } from "../api/client";
import { RUNNABLE_LANGUAGES, languageMeta, DIFFICULTY_ORDER } from "../lib/domain";
import { number as fmtNumber, relativeTime } from "../lib/format";
import {
    Card, Button, Badge, DifficultyBadge, Input, TextArea, Select,
    Field, Modal, ConfirmDialog, SkeletonRows, EmptyState, ErrorState, Switch, Segmented
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";

/*
 |==========================================================================
 | Architect — problem authoring
 |==========================================================================
 | Admin-only. Lists every problem regardless of publish state, and drives
 | create/edit/test-case management through modals rather than separate
 | routes — an author moves between these constantly and a route change per
 | step would cost more than it clarifies.
 */

const emptyDraft = () => ({
    title: "",
    description: "",
    difficulty: "Easy",
    constraints: "",
    tags: "",
    company: "",
    topicCategory: "",
    functionName: "",
    timeLimit: 1000,
    memoryLimit: 256,
    isPublished: false,
    supportedLanguages: [...RUNNABLE_LANGUAGES],
    starterCode: { cpp: "", java: "", python: "" },
    examples: [{ input: "", output: "", explanation: "" }]
});

/* ── Problem form (create + edit share this) ───────────────────────────── */

const ProblemForm = ({ draft, setDraft, errors }) => {
    const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

    const toggleLanguage = (lang) => {
        setDraft((d) => ({
            ...d,
            supportedLanguages: d.supportedLanguages.includes(lang)
                ? d.supportedLanguages.filter((l) => l !== lang)
                : [...d.supportedLanguages, lang]
        }));
    };

    const setStarter = (lang) => (e) =>
        setDraft((d) => ({ ...d, starterCode: { ...d.starterCode, [lang]: e.target.value } }));

    const setExample = (i, key) => (e) =>
        setDraft((d) => {
            const examples = d.examples.slice();
            examples[i] = { ...examples[i], [key]: e.target.value };
            return { ...d, examples };
        });

    const addExample = () =>
        setDraft((d) => ({
            ...d,
            examples: [...d.examples, { input: "", output: "", explanation: "" }]
        }));

    const removeExample = (i) =>
        setDraft((d) => ({ ...d, examples: d.examples.filter((_, idx) => idx !== i) }));

    return (
        <div className="stack stack-6">
            <div className="autogrid" style={{ "--min": "240px" }}>
                <Field label="Title" error={errors.title} required>
                    {(aria) => <Input {...aria} value={draft.title} onChange={set("title")} />}
                </Field>

                <Field label="Difficulty" required>
                    {(aria) => (
                        <Select {...aria} value={draft.difficulty} onChange={set("difficulty")} options={DIFFICULTY_ORDER} />
                    )}
                </Field>

                <Field label="Function name" error={errors.functionName} required hint="The entry point solvers implement">
                    {(aria) => <Input {...aria} value={draft.functionName} onChange={set("functionName")} placeholder="twoSum" />}
                </Field>

                <Field label="Topic (Pathway)">
                    {(aria) => <Input {...aria} value={draft.topicCategory} onChange={set("topicCategory")} placeholder="Arrays" />}
                </Field>

                <Field label="Tags" hint="Comma-separated">
                    {(aria) => <Input {...aria} value={draft.tags} onChange={set("tags")} placeholder="array, hash table" />}
                </Field>

                <Field label="Companies" hint="Comma-separated">
                    {(aria) => <Input {...aria} value={draft.company} onChange={set("company")} placeholder="Google, Amazon" />}
                </Field>

                <Field label="Time limit (ms)">
                    {(aria) => <Input {...aria} type="number" min={100} value={draft.timeLimit} onChange={set("timeLimit")} />}
                </Field>

                <Field label="Memory limit (MB)">
                    {(aria) => <Input {...aria} type="number" min={16} value={draft.memoryLimit} onChange={set("memoryLimit")} />}
                </Field>
            </div>

            <Field label="Statement" error={errors.description} required hint="Plain text / light markdown — headings, **bold**, `code`, lists">
                {(aria) => (
                    <TextArea {...aria} value={draft.description} onChange={set("description")} style={{ minHeight: 180 }} />
                )}
            </Field>

            <Field label="Constraints">
                {(aria) => <TextArea {...aria} value={draft.constraints} onChange={set("constraints")} style={{ minHeight: 90 }} />}
            </Field>

            <div className="stack stack-3">
                <div className="row row-between">
                    <span className="console__label">Examples</span>
                    <Button variant="ghost" size="xs" icon={Icons.LuPlus} onClick={addExample}>Add example</Button>
                </div>

                {draft.examples.map((ex, i) => (
                    <Card key={i} variant="sunk" className="stack stack-3">
                        <div className="row row-between">
                            <span className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>Example {i + 1}</span>
                            {draft.examples.length > 1 && (
                                <Button variant="ghost" size="xs" iconOnly icon={Icons.LuTrash2} onClick={() => removeExample(i)} aria-label="Remove example" />
                            )}
                        </div>
                        <div className="autogrid" style={{ "--min": "180px" }}>
                            <Field label="Input">
                                {(aria) => <TextArea {...aria} value={ex.input} onChange={setExample(i, "input")} className="mono" style={{ minHeight: 70 }} />}
                            </Field>
                            <Field label="Output">
                                {(aria) => <TextArea {...aria} value={ex.output} onChange={setExample(i, "output")} className="mono" style={{ minHeight: 70 }} />}
                            </Field>
                        </div>
                        <Field label="Explanation">
                            {(aria) => <Input {...aria} value={ex.explanation} onChange={setExample(i, "explanation")} />}
                        </Field>
                    </Card>
                ))}
            </div>

            <div className="stack stack-3">
                <span className="console__label">Supported languages &amp; starter code</span>
                {RUNNABLE_LANGUAGES.map((lang) => (
                    <Card key={lang} variant="sunk" className="stack stack-2">
                        <div className="row row-between">
                            <span className="row" style={{ gap: "var(--sp-2)", fontWeight: "var(--fw-medium)" }}>
                                <span className="progress-row__dot" style={{ background: languageMeta(lang).color }} />
                                {languageMeta(lang).label}
                            </span>
                            <Switch
                                checked={draft.supportedLanguages.includes(lang)}
                                onChange={() => toggleLanguage(lang)}
                                label={`Support ${languageMeta(lang).label}`}
                            />
                        </div>
                        {draft.supportedLanguages.includes(lang) && (
                            <TextArea
                                value={draft.starterCode[lang]}
                                onChange={setStarter(lang)}
                                className="mono"
                                style={{ minHeight: 90 }}
                                placeholder={`Starter code shown to the solver for ${languageMeta(lang).label}`}
                            />
                        )}
                    </Card>
                ))}
            </div>

            <div className="row row-between" style={{ padding: "var(--sp-3) var(--sp-4)", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                <div className="stack stack-1">
                    <span style={{ fontWeight: "var(--fw-medium)" }}>Published</span>
                    <span className="field__hint">Visible in Problems once published and test cases exist.</span>
                </div>
                <Switch
                    checked={draft.isPublished}
                    onChange={(v) => setDraft((d) => ({ ...d, isPublished: v }))}
                    label="Published"
                />
            </div>
        </div>
    );
};

const toPayload = (draft) => ({
    title: draft.title.trim(),
    description: draft.description.trim(),
    difficulty: draft.difficulty,
    constraints: draft.constraints.trim(),
    tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
    company: draft.company.split(",").map((c) => c.trim()).filter(Boolean),
    topicCategory: draft.topicCategory.trim(),
    functionName: draft.functionName.trim(),
    timeLimit: Number(draft.timeLimit) || 1000,
    memoryLimit: Number(draft.memoryLimit) || 256,
    isPublished: draft.isPublished,
    supportedLanguages: draft.supportedLanguages,
    starterCode: draft.starterCode,
    examples: draft.examples.filter((e) => e.input.trim() || e.output.trim())
});

const validateDraft = (draft) => {
    const errors = {};
    if (!draft.title.trim()) errors.title = "A title is required.";
    if (!draft.description.trim()) errors.description = "A statement is required.";
    if (!draft.functionName.trim()) errors.functionName = "A function name is required.";
    return errors;
};

/* ── Test case manager ─────────────────────────────────────────────────── */

const emptyCase = () => ({ input: "", expectedOutput: "", isSample: false, explanation: "" });

const TestCaseManager = ({ problem, onClose }) => {
    const toast = useToast();
    const { data, loading, setData } = useAsync(
        () => fetchAllTestCases(problem._id),
        [problem._id]
    );

    const [draft, setDraft] = useState(emptyCase());
    const [saving, setSaving] = useState(false);

    const add = async (event) => {
        event.preventDefault();
        if (!draft.input.trim() && !draft.expectedOutput.trim()) return;

        setSaving(true);
        try {
            const created = await createTestCase({
                problemId: problem._id,
                order: (data?.length || 0) + 1,
                ...draft
            });
            setData((prev) => [...(prev || []), created]);
            setDraft(emptyCase());
            toast.success("Test case added");
        } catch (error) {
            toast.error("Couldn't add test case", errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        try {
            await deleteTestCase(id);
            setData((prev) => prev.filter((tc) => tc._id !== id));
        } catch (error) {
            toast.error("Couldn't delete test case", errorMessage(error));
        }
    };

    const toggleSample = async (tc) => {
        try {
            const updated = await updateTestCase(tc._id, { isSample: !tc.isSample });
            setData((prev) => prev.map((t) => (t._id === tc._id ? updated : t)));
        } catch (error) {
            toast.error("Couldn't update test case", errorMessage(error));
        }
    };

    const cases = data || [];
    const sampleCount = cases.filter((c) => c.isSample).length;

    return (
        <Modal
            open
            onClose={onClose}
            wide
            title={`Test cases — ${problem.title}`}
            description={`${cases.length} total, ${sampleCount} shown as samples`}
        >
            <div className="stack stack-5">
                <form className="stack stack-3" onSubmit={add}>
                    <div className="autogrid" style={{ "--min": "220px" }}>
                        <Field label="Input">
                            {(aria) => (
                                <TextArea
                                    {...aria}
                                    className="mono"
                                    value={draft.input}
                                    onChange={(e) => setDraft((d) => ({ ...d, input: e.target.value }))}
                                    style={{ minHeight: 70 }}
                                />
                            )}
                        </Field>
                        <Field label="Expected output">
                            {(aria) => (
                                <TextArea
                                    {...aria}
                                    className="mono"
                                    value={draft.expectedOutput}
                                    onChange={(e) => setDraft((d) => ({ ...d, expectedOutput: e.target.value }))}
                                    style={{ minHeight: 70 }}
                                />
                            )}
                        </Field>
                    </div>

                    <div className="row row-between">
                        <label className="row" style={{ gap: "var(--sp-2)", fontSize: "var(--fs-sm)" }}>
                            <Switch
                                checked={draft.isSample}
                                onChange={(v) => setDraft((d) => ({ ...d, isSample: v }))}
                                label="Visible sample case"
                            />
                            Show as a sample to solvers
                        </label>

                        <Button as="button" type="submit" variant="primary" size="sm" icon={Icons.LuPlus} loading={saving}>
                            Add test case
                        </Button>
                    </div>
                </form>

                <hr className="hairline" />

                {loading ? (
                    <SkeletonRows rows={4} cols={3} />
                ) : cases.length === 0 ? (
                    <EmptyState icon={Icons.LuFlaskConical} title="No test cases yet" body="This problem cannot be submitted to until at least one exists." />
                ) : (
                    <ul className="stack stack-2">
                        {cases.map((tc, i) => (
                            <li key={tc._id} className="testcase">
                                <div className="testcase__head">
                                    <span className="testcase__name">Case {i + 1}</span>
                                    <div className="row" style={{ gap: "var(--sp-2)" }}>
                                        {tc.isSample && <Badge tone="brand">Sample</Badge>}
                                        <Button variant="ghost" size="xs" onClick={() => toggleSample(tc)}>
                                            {tc.isSample ? "Hide" : "Show as sample"}
                                        </Button>
                                        <Button variant="ghost" size="xs" iconOnly icon={Icons.LuTrash2} onClick={() => remove(tc._id)} aria-label="Delete test case" />
                                    </div>
                                </div>
                                <div className="testcase__grid">
                                    <div className="testcase__field">
                                        <span className="testcase__label">Input</span>
                                        <pre className="testcase__value">{tc.input || "(empty)"}</pre>
                                    </div>
                                    <div className="testcase__field">
                                        <span className="testcase__label">Expected</span>
                                        <pre className="testcase__value">{tc.expectedOutput}</pre>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Architect = () => {
    const toast = useToast();
    const { user } = useAuth();

    const { data, loading, error, reload, setData } = useAsync(
        () => fetchProblems({ limit: 100, sort: "-createdAt" }),
        []
    );

    const [filter, setFilter] = useState("all");
    const [modal, setModal] = useState(null); // { type: "create"|"edit", problem? }
    const [testCaseTarget, setTestCaseTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const problems = useMemo(() => data?.problems || [], [data]);

    const visible = useMemo(() => {
        if (filter === "published") return problems.filter((p) => p.isPublished);
        if (filter === "draft") return problems.filter((p) => !p.isPublished);
        return problems;
    }, [problems, filter]);

    const onDelete = async () => {
        setDeleting(true);
        try {
            await deleteProblem(deleteTarget._id);
            setData((prev) => ({
                ...prev,
                problems: prev.problems.filter((p) => p._id !== deleteTarget._id)
            }));
            toast.success("Problem deleted");
            setDeleteTarget(null);
        } catch (error) {
            toast.error("Couldn't delete problem", errorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const togglePublish = async (problem) => {
        try {
            const updated = await updateProblem(problem._id, { isPublished: !problem.isPublished });
            setData((prev) => ({
                ...prev,
                problems: prev.problems.map((p) => (p._id === problem._id ? updated : p))
            }));
            toast.success(updated.isPublished ? "Published to Problems" : "Moved back to draft");
        } catch (error) {
            toast.error("Couldn't update publish state", errorMessage(error));
        }
    };

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.architect.group}
                title={MODULE.architect.label}
                description="Author problems, manage test cases, and control what's published to the archive."
                actions={
                    <Button variant="primary" icon={Icons.LuPlus} onClick={() => setModal({ type: "create" })}>
                        New problem
                    </Button>
                }
            >
                <Segmented
                    items={[
                        { id: "all", label: `All (${problems.length})` },
                        { id: "published", label: `Published (${problems.filter((p) => p.isPublished).length})` },
                        { id: "draft", label: `Drafts (${problems.filter((p) => !p.isPublished).length})` }
                    ]}
                    value={filter}
                    onChange={setFilter}
                />
            </PageHeader>

            {error ? (
                <ErrorState title="Couldn't load problems" body="The archive didn't respond." onRetry={reload} />
            ) : loading ? (
                <SkeletonRows rows={8} cols={6} />
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={Icons.LuBoxes}
                    title="Nothing here"
                    body={filter === "all" ? "Create the first problem to populate the archive." : "No problems in this state."}
                    action={<Button variant="primary" icon={Icons.LuPlus} onClick={() => setModal({ type: "create" })}>New problem</Button>}
                />
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Title</th>
                                <th scope="col">Difficulty</th>
                                <th scope="col">Status</th>
                                <th scope="col" className="table__num">Attempts</th>
                                <th scope="col">Updated</th>
                                <th scope="col" style={{ width: 220 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((problem) => (
                                <tr key={problem._id}>
                                    <td style={{ fontWeight: "var(--fw-medium)" }}>{problem.title}</td>
                                    <td><DifficultyBadge level={problem.difficulty} /></td>
                                    <td>
                                        <Badge tone={problem.isPublished ? "good" : "neutral"}>
                                            {problem.isPublished ? "Published" : "Draft"}
                                        </Badge>
                                    </td>
                                    <td className="table__num tnum">{fmtNumber(problem.submissionCount || 0)}</td>
                                    <td className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                        {relativeTime(problem.updatedAt)}
                                    </td>
                                    <td>
                                        <div className="row" style={{ gap: "var(--sp-1)" }}>
                                            <Button variant="ghost" size="xs" iconOnly icon={Icons.LuPencil} onClick={() => setModal({ type: "edit", problem })} aria-label="Edit" title="Edit" />
                                            <Button variant="ghost" size="xs" iconOnly icon={Icons.LuFlaskConical} onClick={() => setTestCaseTarget(problem)} aria-label="Test cases" title="Test cases" />
                                            <Button variant="ghost" size="xs" iconOnly icon={problem.isPublished ? Icons.LuEyeOff : Icons.LuEye} onClick={() => togglePublish(problem)} aria-label="Toggle publish" title={problem.isPublished ? "Unpublish" : "Publish"} />
                                            <Button variant="ghost" size="xs" iconOnly icon={Icons.LuExternalLink} to={forgePath(problem.slug)} aria-label="Open in editor" title="Open in editor" />
                                            <Button variant="ghost" size="xs" iconOnly icon={Icons.LuTrash2} onClick={() => setDeleteTarget(problem)} aria-label="Delete" title="Delete" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <ProblemModal
                    mode={modal.type}
                    problemId={modal.problem?._id}
                    onClose={() => setModal(null)}
                    onSaved={(saved, isNew) => {
                        setData((prev) => ({
                            ...prev,
                            problems: isNew
                                ? [saved, ...(prev?.problems || [])]
                                : prev.problems.map((p) => (p._id === saved._id ? saved : p))
                        }));
                        setModal(null);
                    }}
                    userId={user?._id}
                />
            )}

            {testCaseTarget && (
                <TestCaseManager problem={testCaseTarget} onClose={() => setTestCaseTarget(null)} />
            )}

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={onDelete}
                loading={deleting}
                title="Delete this problem?"
                body={`"${deleteTarget?.title}" and all of its test cases will be permanently removed. Existing submissions against it are kept for the judge's records.`}
                confirmLabel="Delete permanently"
            />
        </div>
    );
};

/* ── Create / Edit modal ───────────────────────────────────────────────── */

const ProblemModal = ({ mode, problemId, onClose, onSaved }) => {
    const toast = useToast();
    const [draft, setDraft] = useState(emptyDraft());
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(mode === "edit");

    useEffect(() => {
        if (mode !== "edit" || !problemId) return;

        fetchProblemById(problemId)
            .then((p) => {
                setDraft({
                    title: p.title || "",
                    description: p.description || "",
                    difficulty: p.difficulty || "Easy",
                    constraints: p.constraints || "",
                    tags: (p.tags || []).join(", "),
                    company: (p.company || []).join(", "),
                    topicCategory: p.topicCategory || "",
                    functionName: p.functionName || "",
                    timeLimit: p.timeLimit || 1000,
                    memoryLimit: p.memoryLimit || 256,
                    isPublished: Boolean(p.isPublished),
                    supportedLanguages: p.supportedLanguages?.length ? p.supportedLanguages : [...RUNNABLE_LANGUAGES],
                    starterCode: {
                        cpp: p.starterCode?.cpp || "",
                        java: p.starterCode?.java || "",
                        python: p.starterCode?.python || ""
                    },
                    examples: p.examples?.length ? p.examples : [{ input: "", output: "", explanation: "" }]
                });
            })
            .catch(() => toast.error("Couldn't load this problem"))
            .finally(() => setLoading(false));
    }, [mode, problemId, toast]);

    const save = async () => {
        const validation = validateDraft(draft);
        setErrors(validation);
        if (Object.keys(validation).length) return;

        setSaving(true);
        try {
            const payload = toPayload(draft);
            const saved = mode === "create"
                ? await createProblem(payload)
                : await updateProblem(problemId, payload);

            toast.success(mode === "create" ? "Problem created" : "Problem updated");
            onSaved(saved, mode === "create");
        } catch (error) {
            toast.error("Couldn't save", errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            wide
            title={mode === "create" ? "New problem" : "Edit problem"}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={save} loading={saving} icon={Icons.LuSave}>
                        {mode === "create" ? "Create problem" : "Save changes"}
                    </Button>
                </>
            }
        >
            {loading ? (
                <SkeletonRows rows={6} cols={2} />
            ) : (
                <ProblemForm draft={draft} setDraft={setDraft} errors={errors} />
            )}
        </Modal>
    );
};

export default Architect;
