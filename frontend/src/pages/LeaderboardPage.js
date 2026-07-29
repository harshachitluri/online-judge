import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import { SkeletonTable } from "../components/Skeleton";
import { getInitials } from "../utils/avatar";
import { formatDate } from "../utils/formatDate";

const MEDALS = ["🥇", "🥈", "🥉"];

const LeaderboardPage = () => {
    const [data, setData]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState("");

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axiosInstance.get("/leaderboard?limit=50");
                setData(res.data.data);
            } catch {
                setError("Failed to load leaderboard.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return (
        <Layout breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Leaderboard", path: "/leaderboard", current: true }
        ]}>
            <div className="animate-in">
                <div className="section-header" style={{ paddingTop: 0 }}>
                    <div>
                        <h1 className="section-title">🏆 Leaderboard</h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            Ranked by unique problems solved
                        </p>
                    </div>
                </div>

                <div className="card">
                    {loading ? (
                        <SkeletonTable rows={8} columns={4} />
                    ) : error ? (
                        <div style={{ padding: 32 }}>
                            <div className="alert alert-error">{error}</div>
                        </div>
                    ) : data.length === 0 ? (
                        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            No data yet. Be the first to solve a problem!
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 80 }}>Rank</th>
                                        <th>User</th>
                                        <th style={{ width: 160 }}>Problems Solved</th>
                                        <th style={{ width: 160 }}>Total Accepted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((entry) => (
                                        <tr
                                            key={entry.userId}
                                            style={entry.rank <= 3 ? {
                                                background: "rgba(124,58,237,0.04)"
                                            } : {}}
                                        >
                                            <td>
                                                {entry.rank <= 3 ? (
                                                    <span style={{ fontSize: "1.3rem" }}>
                                                        {MEDALS[entry.rank - 1]}
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: "var(--text-muted)"
                                                    }}>
                                                        #{entry.rank}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: "50%",
                                                        background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                                                        display: "flex", alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700, fontSize: "0.8rem", color: "#fff"
                                                    }}>
                                                        {getInitials(entry.username)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{entry.username}</div>
                                                        {entry.joinedAt && (
                                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                                Joined {formatDate(entry.joinedAt)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: "1.1rem", fontWeight: 700,
                                                    color: "var(--accent-light)"
                                                }}>
                                                    {entry.solvedCount}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-secondary)" }}>
                                                {entry.acceptedCount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default LeaderboardPage;
