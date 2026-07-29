import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import { SkeletonTable } from "../components/Skeleton";
import { Search, Inbox } from "lucide-react";

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];

const DifficultyBadge = ({ d }) => (
    <span className={`badge badge-${d?.toLowerCase()}`}>{d}</span>
);

const AcceptanceBar = ({ accepted, total }) => {
    const pct = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
                width: 60, height: 4, borderRadius: 2,
                background: "var(--border)", overflow: "hidden"
            }}>
                <div style={{
                    width: `${pct}%`, height: "100%",
                    background: pct >= 50 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--error)",
                    borderRadius: 2
                }} />
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{pct}%</span>
        </div>
    );
};

const ProblemsPage = () => {
    const [problems, setProblems]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState("");
    const [search, setSearch]         = useState("");
    const [difficulty, setDifficulty] = useState("All");
    const [page, setPage]             = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProblems, setTotalProblems] = useState(0);

    const fetchProblems = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            // The API restricts non-admins to published problems; sending the
            // flag keeps the workspace draft-free for admins too.
            const params = { page, limit: 20, isPublished: true };
            if (difficulty !== "All") params.difficulty = difficulty;
            if (search.trim()) params.search = search.trim();

            const res = await axiosInstance.get("/problems", { params });
            const { problems: data, totalPages: tp, totalProblems: total } = res.data.data;
            setProblems(data);
            setTotalPages(tp);
            setTotalProblems(total);
        } catch {
            setError("Failed to load problems.");
        } finally {
            setLoading(false);
        }
    }, [page, difficulty, search]);

    // Reset to page 1 when filters change — must run before the fetch effect
    // below, otherwise changing a filter fires one request for the stale page
    // and a second one for page 1.
    useEffect(() => { setPage(1); }, [difficulty, search]);

    useEffect(() => {
        const t = setTimeout(fetchProblems, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchProblems, search]);

    return (
        <Layout breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Workspace", path: "/problems", current: true }
        ]}>
            <div className="animate-in">
                <div className="section-header" style={{ paddingTop: 0 }}>
                    <div>
                        <h1 className="section-title">Workspace</h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            {totalProblems} problems available
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                    <div className="search-field" style={{ maxWidth: 340, flex: 1 }}>
                        <Search />
                        <input
                            className="form-input"
                            placeholder="Search problems..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search problems"
                        />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {DIFFICULTIES.map((d) => (
                            <button
                                key={d}
                                className={`btn btn-sm ${difficulty === d ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setDifficulty(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="card">
                    {loading ? (
                        <SkeletonTable rows={8} columns={5} />
                    ) : error ? (
                        <div style={{ padding: 32, textAlign: "center" }}>
                            <div className="alert alert-error">{error}</div>
                        </div>
                    ) : problems.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Inbox size={24} /></div>
                            <h3>No problems found</h3>
                            <p>Try a different search term or clear the difficulty filter.</p>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 60 }}>#</th>
                                        <th>Title</th>
                                        <th style={{ width: 120 }}>Difficulty</th>
                                        <th>Tags</th>
                                        <th style={{ width: 130 }}>Acceptance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {problems.map((p, i) => (
                                        <tr key={p._id}>
                                            <td style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                                                {(page - 1) * 20 + i + 1}
                                            </td>
                                            <td>
                                                <Link
                                                    to={`/problems/${p.slug}`}
                                                    style={{
                                                        color: "var(--text-primary)",
                                                        fontWeight: 500,
                                                        transition: "color 0.15s"
                                                    }}
                                                    onMouseEnter={e => e.target.style.color = "var(--accent-light)"}
                                                    onMouseLeave={e => e.target.style.color = "var(--text-primary)"}
                                                >
                                                    {p.title}
                                                </Link>
                                            </td>
                                            <td><DifficultyBadge d={p.difficulty} /></td>
                                            <td>
                                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                    {(p.tags || []).slice(0, 3).map((tag) => (
                                                        <span className="tag-chip" key={tag}>{tag}</span>
                                                    ))}
                                                    {(p.tags || []).length > 3 && (
                                                        <span className="tag-chip">
                                                            +{p.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <AcceptanceBar
                                                    accepted={p.acceptedCount}
                                                    total={p.submissionCount}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
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
                                    >
                                        {p}
                                    </button>
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

export default ProblemsPage;
