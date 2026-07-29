import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";

const DashboardPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axiosInstance.get("/profile/me");
                setStats(res.data.data.stats);
            } catch {
                // Stats unavailable
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const acceptanceRate = stats?.acceptanceRate || 0;

    return (
        <Layout breadcrumbs={[{ label: "Dashboard", path: "/dashboard", current: true }]}>
            <div className="animate-in">
                {/* Welcome header */}
                <div className="dash-welcome">
                    <div>
                        <h1>Welcome, {user?.username || "Coder"}</h1>
                        <p>Start your coding journey with structured learning.</p>
                    </div>
                    <Link to="/problems" className="btn btn-primary btn-lg">
                        ▶ Start Your First Problem
                    </Link>
                </div>

                {/* Welcome card */}
                <div className="card dash-hero-card">
                    <div className="dash-hero-icon">🧠</div>
                    <h2>Welcome to CodeJudge</h2>
                    <p>
                        Learn programming through structured curriculum. Write solutions, 
                        and our system will trace your execution against expert solutions 
                        to help you understand exactly where your approach diverges.
                    </p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <Link to="/curriculum" className="btn btn-primary">
                            🎓 Browse Curriculum
                        </Link>
                        <Link to="/problems" className="btn btn-secondary">
                            ▶ Try a Problem
                        </Link>
                    </div>
                </div>

                {/* AI-powered learning card */}
                <div className="card dash-ai-card">
                    <div className="dash-ai-left">
                        <div className="dash-ai-label">
                            ✨ AI-Powered Learning
                        </div>
                        <h2>Understand your code<br />like never before.</h2>
                        <p>
                            Write solutions and get instant feedback. Our system analyzes 
                            your execution path, compares it to expert solutions, and shows 
                            you exactly where to improve.
                        </p>
                        <Link to="/problems" className="btn btn-primary">
                            ▶ Try Your First Problem
                        </Link>
                    </div>
                    <div className="pass-rate-circle">
                        <div className="pass-rate-value">{acceptanceRate}%</div>
                        <div className="pass-rate-label">Pass Rate</div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="dash-stats-row">
                    <div className="dash-stat-card">
                        <div>
                            <div className="dash-stat-label">Submissions</div>
                            <div className="dash-stat-value">
                                {loading ? "—" : (stats?.totalSubmissions || 0)}
                            </div>
                        </div>
                        <div className="dash-stat-icon">▶</div>
                    </div>
                    <div className="dash-stat-card">
                        <div>
                            <div className="dash-stat-label">Solved</div>
                            <div className="dash-stat-value">
                                {loading ? "—" : (stats?.problemsSolved || 0)}
                            </div>
                        </div>
                        <div className="dash-stat-icon">✅</div>
                    </div>
                    <div className="dash-stat-card">
                        <div>
                            <div className="dash-stat-label">Accepted</div>
                            <div className="dash-stat-value">
                                {loading ? "—" : (stats?.acceptedSubmissions || 0)}
                            </div>
                        </div>
                        <div className="dash-stat-icon">🎯</div>
                    </div>
                    <div className="dash-stat-card">
                        <div>
                            <div className="dash-stat-label">Acceptance</div>
                            <div className="dash-stat-value">
                                {loading ? "—" : `${acceptanceRate}%`}
                            </div>
                        </div>
                        <div className="dash-stat-icon">💎</div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DashboardPage;
