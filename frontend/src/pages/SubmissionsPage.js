import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import { SkeletonTable } from "../components/Skeleton";
import { Inbox } from "lucide-react";
import { getVerdictMeta } from "../constants/verdicts";
import { LANG_COLOR } from "../constants/languages";
import { formatDateTime } from "../utils/formatDate";

const VerdictBadge = ({ verdict }) => {
    const { icon, cls } = getVerdictMeta(verdict);

    return (
        <span className={`verdict-badge ${cls}`}>
            {icon} {verdict}
        </span>
    );
};

const SubmissionsPage = () => {
    const [data, setData]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState("");
    const [page, setPage]         = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal]       = useState(0);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await axiosInstance.get("/submissions/my", {
                    params: { page, limit: 20 }
                });
                const { submissions, totalPages: tp, totalSubmissions } = res.data.data;
                setData(submissions);
                setTotalPages(tp);
                setTotal(totalSubmissions);
            } catch {
                setError("Failed to load submissions.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [page]);

    return (
        <Layout breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Trajectory", path: "/submissions", current: true }
        ]}>
            <div className="animate-in">
                <div className="section-header" style={{ paddingTop: 0 }}>
                    <div>
                        <h1 className="section-title">Trajectory (My Submissions)</h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            {total} total submissions
                        </p>
                    </div>
                </div>

                <div className="card">
                    {loading ? (
                        <SkeletonTable rows={6} columns={5} />
                    ) : error ? (
                        <div style={{ padding: 32 }}>
                            <div className="alert alert-error">{error}</div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Inbox size={24} /></div>
                            <h3>No submissions yet</h3>
                            <p>Solve your first problem and it will show up here.</p>
                            <Link to="/problems" className="btn btn-primary btn-sm mt-4">
                                Start solving
                            </Link>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Problem</th>
                                        <th style={{ width: 220 }}>Verdict</th>
                                        <th style={{ width: 100 }}>Language</th>
                                        <th style={{ width: 120 }}>Time</th>
                                        <th style={{ width: 180 }}>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((s) => (
                                        <tr key={s._id}>
                                            <td>
                                                {s.problemId ? (
                                                    <Link
                                                        to={`/problems/${s.problemId.slug || s.problemId._id}`}
                                                        style={{
                                                            color: "var(--text-primary)",
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {s.problemId.title || "—"}
                                                    </Link>
                                                ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                            </td>
                                            <td><VerdictBadge verdict={s.verdict} /></td>
                                            <td>
                                                <span style={{
                                                    fontFamily: "var(--font-mono)",
                                                    fontSize: "0.8rem",
                                                    color: LANG_COLOR[s.language] || "var(--text-secondary)"
                                                }}>
                                                    {s.language}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                                {s.executionTime > 0 ? `${s.executionTime} ms` : "—"}
                                            </td>
                                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                                {formatDateTime(s.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {totalPages > 1 && !loading && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 24, marginBottom: 32 }}>
                        <div className="pagination">
                            <button
                                className="page-btn"
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 1}
                            >← Prev</button>
                            {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                                const p = idx + 1;
                                return (
                                    <button
                                        key={p}
                                        className={`page-btn ${page === p ? "active" : ""}`}
                                        onClick={() => setPage(p)}
                                    >{p}</button>
                                );
                            })}
                            <button
                                className="page-btn"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page === totalPages}
                            >Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default SubmissionsPage;
