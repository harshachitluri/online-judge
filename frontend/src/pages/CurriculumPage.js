import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import CURRICULUM from "../data/curriculum";
import Loader from "../components/Loader";
import { Search } from "lucide-react";

const CurriculumPage = () => {
    const [topicsData, setTopicsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await axiosInstance.get("/problems/topics");
                setTopicsData(res.data.data || []);
            } catch {
                // Fallback — use curriculum data without live problem info
            } finally {
                setLoading(false);
            }
        };
        fetchTopics();
    }, []);

    // Build a map: slug → problem data from API
    const problemMap = useMemo(() => {
        const map = {};
        topicsData.forEach((topic) => {
            (topic.problems || []).forEach((p) => {
                map[p.slug] = p;
            });
        });
        return map;
    }, [topicsData]);

    // Filter modules by search
    const filteredModules = useMemo(() => {
        if (!search.trim()) return CURRICULUM;
        const q = search.toLowerCase();
        return CURRICULUM.filter(
            (m) =>
                m.title.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                m.problems.some((slug) => {
                    const p = problemMap[slug];
                    return p && p.title.toLowerCase().includes(q);
                })
        );
    }, [search, problemMap]);

    const totalTopics = CURRICULUM.reduce((sum, m) => sum + m.problems.length, 0);

    return (
        <Layout
            breadcrumbs={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "Curriculum", path: "/curriculum", current: true }
            ]}
        >
            <div className="animate-in">
                {/* Header */}
                <div className="curriculum-header">
                    <div>
                        <h1>Curriculum</h1>
                        <p>Progress through the structured curriculum. Complete modules in sequence to unlock advanced topics.</p>
                    </div>
                    <div className="curriculum-progress">
                        <div className="progress-label">Overall Progress</div>
                        <div className="progress-value">0/{totalTopics} topics</div>
                    </div>
                </div>

                {/* Search */}
                <div className="curriculum-search">
                    <div className="search-field">
                        <Search />
                        <input
                            className="form-input"
                            placeholder="Search modules or topics..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search curriculum"
                        />
                    </div>
                </div>

                {loading ? (
                    <Loader text="Loading curriculum..." />
                ) : (
                    <>
                        {/* Core Computer Science */}
                        <div className="curriculum-section">
                            <div className="curriculum-section-title">
                                🎓 Core Computer Science
                            </div>
                            <div className="curriculum-section-desc">
                                Master the fundamental algorithms and data structures required for technical interviews and systems engineering.
                            </div>

                            <div className="module-grid">
                                {filteredModules.map((module) => (
                                    <div className="module-card" key={module.id}>
                                        <div className="module-card-header">
                                            <div className="module-icon">{module.icon}</div>
                                            <span className="badge badge-accent">Available</span>
                                        </div>
                                        <h3>{module.title}</h3>
                                        <div className="module-desc">{module.description}</div>

                                        <div className="module-progress">
                                            <span>0/{module.problems.length} topics</span>
                                            <span>0%</span>
                                        </div>
                                        <div className="module-progress-bar">
                                            <div className="fill" style={{ width: "0%" }} />
                                        </div>

                                        <div className="module-topics">Topics</div>
                                        <ul className="module-problem-list">
                                            {module.problems.map((slug) => {
                                                const p = problemMap[slug];
                                                const title = p ? p.title : slug
                                                    .split("-")
                                                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                                    .join(" ");
                                                return (
                                                    <li key={slug}>
                                                        <Link
                                                            to={`/problems/${slug}`}
                                                            className="module-problem-item"
                                                        >
                                                            <span className="problem-name">
                                                                <span className="problem-status" />
                                                                {title}
                                                            </span>
                                                            <span className="problem-arrow">→</span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {/* An empty module would otherwise link
                                            to /problems/undefined */}
                                        {module.problems.length > 0 && (
                                            <Link
                                                to={`/problems/${module.problems[0]}`}
                                                className="module-start-btn"
                                            >
                                                ▶ Start Module
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {filteredModules.length === 0 && (
                            <div style={{
                                textAlign: "center",
                                padding: 48,
                                color: "var(--text-muted)"
                            }}>
                                No modules found matching "{search}".
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default CurriculumPage;
