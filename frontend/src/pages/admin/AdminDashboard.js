import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import Loader from "../../components/Loader";

const AdminDashboard = () => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchProblems = async () => {
        setLoading(true);
        setError("");
        try {
            // /api/problems hides drafts from everyone except admins, and this
            // page is behind AdminRoute, so this returns published + drafts.
            const res = await axiosInstance.get("/problems", {
                params: { limit: 100 }
            });
            setProblems(res.data.data.problems || []);
        } catch (err) {
            setError("Failed to load problems.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProblems();
    }, []);

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            await axiosInstance.delete(`/problems/${id}`);
            fetchProblems();
        } catch (err) {
            alert("Failed to delete problem.");
        }
    };

    return (
        <div className="page">
            <div className="container">
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 className="section-title">Admin Dashboard</h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            Manage problems and test cases
                        </p>
                    </div>
                    <Link to="/admin/problems/new" className="btn btn-primary">
                        + Create Problem
                    </Link>
                </div>

                <div className="card">
                    {loading ? (
                        <Loader text="Loading problems..." />
                    ) : error ? (
                        <div style={{ padding: 32 }}>
                            <div className="alert alert-error">{error}</div>
                        </div>
                    ) : problems.length === 0 ? (
                        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                            No problems found.
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th style={{ width: 120 }}>Difficulty</th>
                                        <th style={{ width: 100 }}>Status</th>
                                        <th style={{ width: 150 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {problems.map((p) => (
                                        <tr key={p._id}>
                                            <td style={{ fontWeight: 500 }}>{p.title}</td>
                                            <td>
                                                <span className={`badge badge-${p.difficulty?.toLowerCase()}`}>
                                                    {p.difficulty}
                                                </span>
                                            </td>
                                            <td>
                                                {p.isPublished ? (
                                                    <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: 600 }}>Published</span>
                                                ) : (
                                                    <span style={{ color: "var(--warning)", fontSize: "0.8rem", fontWeight: 600 }}>Draft</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <Link
                                                        to={`/admin/problems/${p._id}/edit`}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(p._id, p.title)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
