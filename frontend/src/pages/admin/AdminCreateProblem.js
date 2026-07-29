import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axiosInstance from "../../api/axiosInstance";

const DEFAULT_STARTER = {
    cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
    java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
    python: `def main():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    main()`
};

const AdminCreateProblem = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        title: "",
        difficulty: "Easy",
        functionName: "main",
        timeLimit: 1000,
        memoryLimit: 256,
        tags: "",
        description: "",
        constraints: "",
        isPublished: false
    });

    const [starterCode, setStarterCode] = useState(DEFAULT_STARTER);
    const [activeLang, setActiveLang] = useState("cpp");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleEditorChange = (value) => {
        setStarterCode((prev) => ({
            ...prev,
            [activeLang]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const payload = {
                ...form,
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
                starterCode
            };

            const res = await axiosInstance.post("/problems", payload);
            navigate(`/admin/problems/${res.data.data._id}/edit`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create problem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 1000, paddingTop: 24 }}>
                <div style={{ marginBottom: 20 }}>
                    <Link to="/admin/problems" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="section-header">
                    <h1 className="section-title">Create New Problem</h1>
                </div>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input className="form-input" name="title" value={form.title} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Difficulty *</label>
                            <select className="form-select" name="difficulty" value={form.difficulty} onChange={handleChange}>
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 24 }}>
                        <div className="form-group">
                            <label className="form-label">Time Limit (ms)</label>
                            <input className="form-input" type="number" name="timeLimit" value={form.timeLimit} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Memory Limit (MB)</label>
                            <input className="form-input" type="number" name="memoryLimit" value={form.memoryLimit} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Function Name</label>
                            <input className="form-input" name="functionName" value={form.functionName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label className="form-label">Tags (comma separated)</label>
                        <input className="form-input" name="tags" value={form.tags} onChange={handleChange} placeholder="Array, Hash Table, Dynamic Programming" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label className="form-label">Description * (Markdown supported)</label>
                        <textarea className="form-input" style={{ minHeight: 200, fontFamily: "inherit" }} name="description" value={form.description} onChange={handleChange} required />
                    </div>

                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label className="form-label">Constraints</label>
                        <textarea className="form-input" style={{ minHeight: 100, fontFamily: "inherit" }} name="constraints" value={form.constraints} onChange={handleChange} />
                    </div>

                    <div style={{ marginBottom: 32 }}>
                        <label className="form-label">Starter Code</label>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                            {["cpp", "java", "python"].map((lang) => (
                                <button
                                    type="button"
                                    key={lang}
                                    className={`btn btn-sm ${activeLang === lang ? "btn-primary" : "btn-ghost"}`}
                                    onClick={() => setActiveLang(lang)}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        <div style={{ height: 300, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                            <Editor
                                height="100%"
                                language={activeLang === "cpp" ? "cpp" : activeLang}
                                value={starterCode[activeLang]}
                                onChange={handleEditorChange}
                                theme="vs-dark"
                                options={{ minimap: { enabled: false }, fontSize: 13 }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
                        <input type="checkbox" id="isPublished" name="isPublished" checked={form.isPublished} onChange={handleChange} style={{ width: 18, height: 18 }} />
                        <label htmlFor="isPublished" style={{ fontWeight: 500, cursor: "pointer" }}>Publish Problem (visible to users)</label>
                    </div>

                    <div style={{ display: "flex", gap: 16 }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Saving..." : "Save & Continue to Test Cases"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminCreateProblem;
