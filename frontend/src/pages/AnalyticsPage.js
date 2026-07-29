import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import { getVerdictMeta } from "../constants/verdicts";
import { LANG_COLOR } from "../constants/languages";
import { formatShortDateTime } from "../utils/formatDate";

const AnalyticsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axiosInstance.get("/profile/analytics");
                setData(res.data.data);
            } catch {
                // Analytics unavailable
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const maxVerdictCount = useMemo(() => {
        if (!data?.verdictDistribution?.length) return 1;
        return Math.max(...data.verdictDistribution.map((v) => v.count), 1);
    }, [data]);

    const maxLangCount = useMemo(() => {
        if (!data?.languageDistribution?.length) return 1;
        return Math.max(...data.languageDistribution.map((l) => l.count), 1);
    }, [data]);

    // Generate activity grid (last 90 days)
    const activityGrid = useMemo(() => {
        if (!data?.activityData) return [];
        const countMap = {};
        data.activityData.forEach((a) => { countMap[a.date] = a.count; });

        const cells = [];
        const today = new Date();
        for (let i = 89; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split("T")[0];
            const count = countMap[key] || 0;
            const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;
            cells.push({ date: key, count, level });
        }
        return cells;
    }, [data]);

    return (
        <Layout
            breadcrumbs={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "Analytics", path: "/analytics", current: true }
            ]}
        >
            <div className="animate-in">
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 24 }}>
                    📊 Analytics
                </h1>

                {loading ? (
                    <Loader text="Loading analytics..." />
                ) : !data ? (
                    <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                        <p>No analytics data available yet.</p>
                        <Link to="/problems" className="btn btn-primary mt-4">
                            Start Solving Problems
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Stats cards */}
                        <div className="analytics-grid">
                            <div className="analytics-stat">
                                <div className="stat-value">{data.totalSubmissions}</div>
                                <div className="stat-label">Total Submissions</div>
                            </div>
                            <div className="analytics-stat">
                                <div className="stat-value">{data.problemsSolved}</div>
                                <div className="stat-label">Problems Solved</div>
                            </div>
                            <div className="analytics-stat">
                                <div className="stat-value">
                                    {data.totalSubmissions > 0
                                        ? Math.round(
                                            ((data.verdictDistribution.find(
                                                (v) => v.verdict === "Accepted"
                                            )?.count || 0) / data.totalSubmissions) * 100
                                        )
                                        : 0}%
                                </div>
                                <div className="stat-label">Acceptance Rate</div>
                            </div>
                        </div>

                        {/* Difficulty breakdown */}
                        <div className="analytics-section">
                            <h3>Difficulty Breakdown</h3>
                            <div className="difficulty-breakdown">
                                <div className="difficulty-stat">
                                    <div className="diff-count" style={{ color: "var(--easy)" }}>
                                        {data.difficultyBreakdown?.Easy || 0}
                                    </div>
                                    <div className="diff-label" style={{ color: "var(--easy)" }}>Easy</div>
                                </div>
                                <div className="difficulty-stat">
                                    <div className="diff-count" style={{ color: "var(--medium)" }}>
                                        {data.difficultyBreakdown?.Medium || 0}
                                    </div>
                                    <div className="diff-label" style={{ color: "var(--medium)" }}>Medium</div>
                                </div>
                                <div className="difficulty-stat">
                                    <div className="diff-count" style={{ color: "var(--hard)" }}>
                                        {data.difficultyBreakdown?.Hard || 0}
                                    </div>
                                    <div className="diff-label" style={{ color: "var(--hard)" }}>Hard</div>
                                </div>
                            </div>
                        </div>

                        {/* Verdict distribution */}
                        {data.verdictDistribution?.length > 0 && (
                            <div className="analytics-section">
                                <h3>Verdict Distribution</h3>
                                <div className="card" style={{ padding: 24 }}>
                                    <div className="chart-bar-container">
                                        {data.verdictDistribution.map((v) => (
                                            <div className="chart-bar-row" key={v.verdict}>
                                                <div className="chart-bar-label">{v.verdict}</div>
                                                <div className="chart-bar-track">
                                                    <div
                                                        className="chart-bar-fill"
                                                        style={{
                                                            width: `${(v.count / maxVerdictCount) * 100}%`,
                                                            background: getVerdictMeta(v.verdict).color
                                                        }}
                                                    >
                                                        {v.count}
                                                    </div>
                                                </div>
                                                <div className="chart-bar-count">{v.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Language distribution */}
                        {data.languageDistribution?.length > 0 && (
                            <div className="analytics-section">
                                <h3>Language Usage</h3>
                                <div className="card" style={{ padding: 24 }}>
                                    <div className="chart-bar-container">
                                        {data.languageDistribution.map((l) => (
                                            <div className="chart-bar-row" key={l.language}>
                                                <div className="chart-bar-label">{l.language}</div>
                                                <div className="chart-bar-track">
                                                    <div
                                                        className="chart-bar-fill"
                                                        style={{
                                                            width: `${(l.count / maxLangCount) * 100}%`,
                                                            background: LANG_COLOR[l.language] || "var(--accent)"
                                                        }}
                                                    >
                                                        {l.count}
                                                    </div>
                                                </div>
                                                <div className="chart-bar-count">{l.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Activity heatmap */}
                        <div className="analytics-section">
                            <h3>Activity (Last 90 Days)</h3>
                            <div className="card" style={{ padding: 24 }}>
                                <div className="activity-grid">
                                    {activityGrid.map((cell) => (
                                        <div
                                            key={cell.date}
                                            className={`activity-cell level-${cell.level}`}
                                            title={`${cell.date}: ${cell.count} submission${cell.count !== 1 ? "s" : ""}`}
                                        />
                                    ))}
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 12,
                                    fontSize: "0.72rem",
                                    color: "var(--text-muted)"
                                }}>
                                    Less
                                    <div className="activity-cell" style={{ width: 10, height: 10 }} />
                                    <div className="activity-cell level-1" style={{ width: 10, height: 10 }} />
                                    <div className="activity-cell level-2" style={{ width: 10, height: 10 }} />
                                    <div className="activity-cell level-3" style={{ width: 10, height: 10 }} />
                                    <div className="activity-cell level-4" style={{ width: 10, height: 10 }} />
                                    More
                                </div>
                            </div>
                        </div>

                        {/* Recent submissions */}
                        {data.recentSubmissions?.length > 0 && (
                            <div className="analytics-section">
                                <h3>Recent Submissions</h3>
                                <div className="card">
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Problem</th>
                                                    <th>Verdict</th>
                                                    <th>Language</th>
                                                    <th>Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.recentSubmissions.map((s) => (
                                                    <tr key={s._id}>
                                                        <td>
                                                            {s.problemId ? (
                                                                <Link
                                                                    to={`/problems/${s.problemId.slug}`}
                                                                    style={{
                                                                        color: "var(--text-primary)",
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    {s.problemId.title}
                                                                </Link>
                                                            ) : "—"}
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                color: getVerdictMeta(s.verdict).color,
                                                                fontWeight: 600,
                                                                fontSize: "0.85rem"
                                                            }}>
                                                                {s.verdict}
                                                            </span>
                                                        </td>
                                                        <td style={{
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: "0.8rem",
                                                            color: LANG_COLOR[s.language] || "var(--text-secondary)"
                                                        }}>
                                                            {s.language}
                                                        </td>
                                                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                                            {formatShortDateTime(s.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default AnalyticsPage;
