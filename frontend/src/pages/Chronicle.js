import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as Icons from "react-icons/lu";

import { MODULE, forgePath } from "../config/brand";
import { fetchMySubmissions, fetchSubmission } from "../services/judge";
import { useAsync } from "../hooks";
import { verdictMeta, languageMeta, VERDICT_ORDER } from "../lib/domain";
import { duration, memory, relativeTime, dateTime, number as fmtNumber } from "../lib/format";
import {
    Card, Button, Badge, VerdictBadge, Select, Modal, Spinner,
    SkeletonRows, EmptyState, ErrorState, StatTile
} from "../components/ui";
import { PageHeader } from "../components/shell/AppShell";
import { BarSeries } from "../components/charts";

/*
 |==========================================================================
 | Chronicle — submission history
 |==========================================================================
 | Every attempt, with the source code retrievable. Filtering is client-side
 | over the fetched page because the API's submission listing takes no
 | verdict or language filter — doing it here beats not offering it at all,
 | and the page size caps how much is ever in memory.
 */

const PAGE_SIZE = 25;

/* ── Source viewer ─────────────────────────────────────────────────────── */

const SourceModal = ({ submissionId, onClose }) => {
    const { data, loading, error } = useAsync(
        () => (submissionId ? fetchSubmission(submissionId) : Promise.resolve(null)),
        [submissionId]
    );

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(data?.sourceCode || "");
        } catch { /* clipboard blocked — the code is visible and selectable */ }
    };

    return (
        <Modal
            open={Boolean(submissionId)}
            onClose={onClose}
            wide
            title={data?.problemId?.title || "Submission"}
            description={
                data
                    ? `${languageMeta(data.language).label} · ${dateTime(data.createdAt)}`
                    : undefined
            }
            footer={
                data && (
                    <>
                        <Button variant="ghost" icon={Icons.LuCopy} onClick={copy}>
                            Copy source
                        </Button>
                        {data.problemId?.slug && (
                            <Button
                                variant="primary"
                                to={forgePath(data.problemId.slug)}
                                trailingIcon={Icons.LuArrowRight}
                            >
                                Open in editor
                            </Button>
                        )}
                    </>
                )
            }
        >
            {loading ? (
                <div className="row" style={{ justifyContent: "center", padding: "var(--sp-10)" }}>
                    <Spinner size={22} />
                </div>
            ) : error ? (
                <ErrorState
                    title="Couldn't load that submission"
                    body="It may have been removed, or the session expired."
                />
            ) : data ? (
                <div className="stack stack-4">
                    <div className="row row-wrap" style={{ gap: "var(--sp-2)" }}>
                        <VerdictBadge verdict={data.verdict} size="lg" />
                        <Badge tone="neutral" icon={Icons.LuTimer}>
                            {duration(data.executionTime)}
                        </Badge>
                        <Badge tone="neutral" icon={Icons.LuDatabase}>
                            {memory(data.memoryUsed)}
                        </Badge>
                        <Badge tone="neutral" icon={Icons.LuListChecks}>
                            {data.passedTestCases}/{data.totalTestCases} cases
                        </Badge>
                    </div>

                    {data.errorMessage && (
                        <div className="stack stack-2">
                            <span className="console__label">Judge output</span>
                            <pre className="console__out console__out--bad">{data.errorMessage}</pre>
                        </div>
                    )}

                    <div className="stack stack-2">
                        <span className="console__label">Source</span>
                        <pre className="console__out" style={{ maxHeight: 420 }}>
                            {data.sourceCode}
                        </pre>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
};

/* ── Page ──────────────────────────────────────────────────────────────── */

const Chronicle = () => {
    const [page, setPage] = useState(1);
    const [verdict, setVerdict] = useState("");
    const [language, setLanguage] = useState("");
    const [viewing, setViewing] = useState(null);

    const { data, loading, error, reload } = useAsync(
        () => fetchMySubmissions({ page, limit: PAGE_SIZE }),
        [page]
    );

    const all = useMemo(() => data?.submissions || [], [data]);

    const filtered = useMemo(
        () =>
            all
                .filter((s) => !verdict || s.verdict === verdict)
                .filter((s) => !language || s.language === language),
        [all, verdict, language]
    );

    /* Verdict mix over the fetched page — labelled as such, because it is
       not the mix over the user's whole history. */
    const mix = useMemo(() => {
        const counts = {};
        all.forEach((s) => {
            counts[s.verdict] = (counts[s.verdict] || 0) + 1;
        });

        return VERDICT_ORDER
            .filter((v) => counts[v])
            .map((v) => ({ label: v, value: counts[v], color: verdictMeta(v).color }));
    }, [all]);

    const accepted = all.filter((s) => s.verdict === "Accepted").length;
    const totalPages = data?.totalPages || 1;

    return (
        <div className="shell">
            <PageHeader
                eyebrow={MODULE.chronicle.group}
                title={MODULE.chronicle.label}
                description="Every submission you have ever made, with its verdict, timings and the exact source you sent."
                actions={
                    <Button variant="secondary" to={MODULE.telemetry.path} icon={Icons.LuActivity}>
                        Analytics
                    </Button>
                }
            >
                {!loading && all.length > 0 && (
                    <>
                        <div className="autogrid" style={{ "--min": "200px" }}>
                            <StatTile
                                label="Total submissions"
                                value={fmtNumber(data.totalSubmissions)}
                                icon={Icons.LuSend}
                                accent="var(--brand-violet)"
                            />
                            <StatTile
                                label="Accepted on this page"
                                value={fmtNumber(accepted)}
                                icon={Icons.LuCircleCheck}
                                sub={`of ${all.length} shown`}
                                accent="var(--status-good)"
                            />
                            <StatTile
                                label="Pages"
                                value={fmtNumber(totalPages)}
                                icon={Icons.LuLayers}
                                sub={`${PAGE_SIZE} per page`}
                                accent="var(--series-1)"
                            />
                        </div>

                        <Card>
                            <div className="row row-between" style={{ marginBottom: "var(--sp-3)" }}>
                                <span className="console__label">Verdict mix on this page</span>
                                <span className="text-faint" style={{ fontSize: "var(--fs-2xs)" }}>
                                    Page {page} only
                                </span>
                            </div>
                            <BarSeries data={mix} showPercent height={16} />
                        </Card>
                    </>
                )}

                <div className="row row-wrap" style={{ gap: "var(--sp-3)" }}>
                    <Select
                        value={verdict}
                        onChange={(e) => setVerdict(e.target.value)}
                        aria-label="Filter by verdict"
                        style={{ maxWidth: 220 }}
                    >
                        <option value="">All verdicts</option>
                        {VERDICT_ORDER.map((v) => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </Select>

                    <Select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        aria-label="Filter by language"
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">All languages</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                    </Select>

                    {(verdict || language) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Icons.LuX}
                            onClick={() => {
                                setVerdict("");
                                setLanguage("");
                            }}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            </PageHeader>

            {error ? (
                <ErrorState
                    title="Submissions didn't load"
                    body="Your submission history couldn't be fetched."
                    onRetry={reload}
                />
            ) : loading ? (
                <SkeletonRows rows={10} cols={6} />
            ) : all.length === 0 ? (
                <EmptyState
                    icon={Icons.LuHistory}
                    title="No submissions yet"
                    body="Everything you send to the judge is recorded here, permanently and privately."
                    action={<Button variant="primary" to={MODULE.vault.path}>Browse Problems</Button>}
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Icons.LuFilterX}
                    title="Nothing on this page matches"
                    body="These filters apply to the current page only — try another page or clear them."
                    action={
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setVerdict("");
                                setLanguage("");
                            }}
                        >
                            Clear filters
                        </Button>
                    }
                />
            ) : (
                <div className="table-wrap">
                    <table className="table table--rowlink">
                        <thead>
                            <tr>
                                <th scope="col">Problem</th>
                                <th scope="col">Verdict</th>
                                <th scope="col">Language</th>
                                <th scope="col" className="table__num">Runtime</th>
                                <th scope="col" className="table__num">Memory</th>
                                <th scope="col">When</th>
                                <th scope="col" style={{ width: 44 }}>
                                    <span className="sr-only">View source</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr key={s._id}>
                                    <td>
                                        {s.problemId?.slug ? (
                                            <Link
                                                to={forgePath(s.problemId.slug)}
                                                style={{ fontWeight: "var(--fw-medium)" }}
                                            >
                                                {s.problemId.title}
                                            </Link>
                                        ) : (
                                            <span className="text-faint">Deleted problem</span>
                                        )}
                                    </td>
                                    <td><VerdictBadge verdict={s.verdict} /></td>
                                    <td>
                                        <span className="text-secondary" style={{ fontSize: "var(--fs-xs)" }}>
                                            {languageMeta(s.language).label}
                                        </span>
                                    </td>
                                    <td className="table__num tnum">{duration(s.executionTime)}</td>
                                    <td className="table__num tnum">{memory(s.memoryUsed)}</td>
                                    <td
                                        className="text-muted"
                                        style={{ fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}
                                        title={dateTime(s.createdAt)}
                                    >
                                        {relativeTime(s.createdAt)}
                                    </td>
                                    <td>
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            iconOnly
                                            icon={Icons.LuCode}
                                            onClick={() => setViewing(s._id)}
                                            aria-label={`View source for ${s.problemId?.title || "this submission"}`}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && !loading && (
                <nav className="pager" aria-label="Pagination">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={Icons.LuChevronLeft}
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Newer
                    </Button>

                    <span className="text-muted tnum" style={{ fontSize: "var(--fs-xs)" }}>
                        Page {page} of {totalPages}
                    </span>

                    <Button
                        variant="secondary"
                        size="sm"
                        trailingIcon={Icons.LuChevronRight}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Older
                    </Button>
                </nav>
            )}

            <SourceModal submissionId={viewing} onClose={() => setViewing(null)} />
        </div>
    );
};

export default Chronicle;
