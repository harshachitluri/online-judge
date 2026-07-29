import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axiosInstance from "../../api/axiosInstance";
import Loader from "../../components/Loader";

const AdminEditProblem = () => {
    const { id } = useParams();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    const [activeTab, setActiveTab] = useState("details"); // 'details' | 'testcases'
    
    const [form, setForm] = useState(null);
    const [starterCode, setStarterCode] = useState({});
    const [activeLang, setActiveLang] = useState("cpp");

    const [testCases, setTestCases] = useState([]);
    const [newTestCase, setNewTestCase] = useState({
        input: "",
        expectedOutput: "",
        explanation: "",
        isSample: false,
        order: 1,
        weight: 1
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Direct lookup by id. Scanning the paginated list broke as
                // soon as there were more problems than one page (limit is
                // capped at 100 server-side).
                const res = await axiosInstance.get(`/problems/id/${id}`);
                const prob = res.data.data;

                setForm({
                    title: prob.title,
                    difficulty: prob.difficulty,
                    functionName: prob.functionName,
                    timeLimit: prob.timeLimit,
                    memoryLimit: prob.memoryLimit,
                    tags: prob.tags.join(", "),
                    description: prob.description,
                    constraints: prob.constraints || "",
                    isPublished: prob.isPublished
                });
                setStarterCode(prob.starterCode || {});

                const tcRes = await axiosInstance.get(`/testcases/admin/problem/${id}`);
                setTestCases(tcRes.data.data);
                setNewTestCase(prev => ({ ...prev, order: tcRes.data.data.length + 1 }));
                
            } catch (err) {
                setError("Failed to load problem data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // --- Tab: Details Handlers ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleEditorChange = (value) => {
        setStarterCode(prev => ({ ...prev, [activeLang]: value }));
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                ...form,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                starterCode
            };
            await axiosInstance.put(`/problems/${id}`, payload);
            setSuccess("Problem updated successfully!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update problem.");
        } finally {
            setSaving(false);
        }
    };

    // --- Tab: Testcases Handlers ---

    const handleNewTcChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewTestCase(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleAddTestCase = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post("/testcases", {
                ...newTestCase,
                problemId: id
            });
            // Refresh test cases
            const tcRes = await axiosInstance.get(`/testcases/admin/problem/${id}`);
            setTestCases(tcRes.data.data);
            
            // Reset form
            setNewTestCase({
                input: "",
                expectedOutput: "",
                explanation: "",
                isSample: false,
                order: tcRes.data.data.length + 1,
                weight: 1
            });
            setSuccess("Test case added!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to add testcase.");
        }
    };

    const handleDeleteTestCase = async (tcId) => {
        if (!window.confirm("Delete this test case?")) return;
        try {
            await axiosInstance.delete(`/testcases/${tcId}`);
            setTestCases(prev => prev.filter(t => t._id !== tcId));
        } catch (err) {
            alert("Failed to delete testcase");
        }
    };

    if (loading) return <div className="page"><Loader fullPage /></div>;
    if (error && !form) return <div className="page"><div className="container"><div className="alert alert-error">{error}</div></div></div>;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 1000, paddingTop: 24 }}>
                <div style={{ marginBottom: 20 }}>
                    <Link to="/admin/problems" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h1 className="section-title">Edit Problem: {form.title}</h1>
                </div>

                {success && <div className="alert alert-success mb-4">{success}</div>}
                {error && <div className="alert alert-error mb-4">{error}</div>}

                {/* Tabs */}
                <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", marginBottom: 32 }}>
                    <button 
                        className={`btn ${activeTab === "details" ? "btn-primary" : "btn-ghost"}`}
                        style={{ borderRadius: "8px 8px 0 0" }}
                        onClick={() => setActiveTab("details")}
                    >
                        Problem Details
                    </button>
                    <button 
                        className={`btn ${activeTab === "testcases" ? "btn-primary" : "btn-ghost"}`}
                        style={{ borderRadius: "8px 8px 0 0" }}
                        onClick={() => setActiveTab("testcases")}
                    >
                        Test Cases ({testCases.length})
                    </button>
                </div>

                {/* DETAILS TAB */}
                {activeTab === "details" && (
                    <form onSubmit={handleUpdateDetails} className="card" style={{ padding: 32 }}>
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
                            <input className="form-input" name="tags" value={form.tags} onChange={handleChange} />
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">Description *</label>
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
                                    value={starterCode[activeLang] || ""}
                                    onChange={handleEditorChange}
                                    theme="vs-dark"
                                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
                            <input type="checkbox" id="isPublished" name="isPublished" checked={form.isPublished} onChange={handleChange} style={{ width: 18, height: 18 }} />
                            <label htmlFor="isPublished" style={{ fontWeight: 500, cursor: "pointer" }}>Publish Problem</label>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? "Saving..." : "Update Details"}
                        </button>
                    </form>
                )}

                {/* TESTCASES TAB */}
                {activeTab === "testcases" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        
                        {/* List Existing Test Cases */}
                        <div className="card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Existing Test Cases</h2>
                            {testCases.length === 0 ? (
                                <p style={{ color: "var(--text-muted)" }}>No test cases yet.</p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {testCases.map((tc, idx) => (
                                        <div key={tc._id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                    <span style={{ fontWeight: 600 }}>Test Case #{tc.order}</span>
                                                    {tc.isSample && <span className="badge badge-easy">Sample</span>}
                                                </div>
                                                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDeleteTestCase(tc._id)}>
                                                    Delete
                                                </button>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                                <div>
                                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 4 }}>Input</div>
                                                    <pre style={{ background: "var(--surface)", padding: 12, borderRadius: 6, margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{tc.input}</pre>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 4 }}>Expected Output</div>
                                                    <pre style={{ background: "var(--surface)", padding: 12, borderRadius: 6, margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{tc.expectedOutput}</pre>
                                                </div>
                                            </div>
                                            {tc.explanation && (
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 4 }}>Explanation</div>
                                                    <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", margin: 0 }}>{tc.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Test Case Form */}
                        <div className="card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Add New Test Case</h2>
                            <form onSubmit={handleAddTestCase}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Input *</label>
                                        <textarea className="form-input" style={{ minHeight: 120, fontFamily: "monospace" }} name="input" value={newTestCase.input} onChange={handleNewTcChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expected Output *</label>
                                        <textarea className="form-input" style={{ minHeight: 120, fontFamily: "monospace" }} name="expectedOutput" value={newTestCase.expectedOutput} onChange={handleNewTcChange} required />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label className="form-label">Explanation (optional)</label>
                                    <textarea className="form-input" style={{ minHeight: 60, fontFamily: "inherit" }} name="explanation" value={newTestCase.explanation} onChange={handleNewTcChange} placeholder="Only shown if 'Sample' is checked." />
                                </div>
                                
                                <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 24 }}>
                                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                        <label className="form-label">Order</label>
                                        <input className="form-input" type="number" name="order" value={newTestCase.order} onChange={handleNewTcChange} />
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, paddingTop: 24 }}>
                                        <input type="checkbox" id="isSample" name="isSample" checked={newTestCase.isSample} onChange={handleNewTcChange} style={{ width: 18, height: 18 }} />
                                        <label htmlFor="isSample" style={{ cursor: "pointer" }}>Show as Sample Test Case</label>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-secondary">
                                    + Add Test Case
                                </button>
                            </form>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminEditProblem;
