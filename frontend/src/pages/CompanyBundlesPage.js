import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import { Search } from "lucide-react";

const COMPANY_EMOJIS = {
    "Google": "🔵", "Amazon": "📦", "Meta": "🔷", "Microsoft": "🟦",
    "Apple": "🍎", "Netflix": "🔴", "Adobe": "🔺", "Uber": "🚗",
    "Bloomberg": "📰", "Twitter": "🐦", "LinkedIn": "💼", "Salesforce": "☁️",
    "Oracle": "🔮", "Tesla": "⚡", "Spotify": "🎵", "Snapchat": "👻"
};

const DiffBadge = ({ d }) => (
    <span className={`badge badge-${d?.toLowerCase()}`} style={{ fontSize: "0.72rem" }}>{d}</span>
);

const CompanyBundlesPage = () => {
    const [companiesData, setCompaniesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCompany, setExpandedCompany] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await axiosInstance.get("/problems/companies");
                setCompaniesData(res.data.data || []);
            } catch {
                // API might not be available yet
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const filteredCompanies = companiesData.filter((c) =>
        c._id.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = (companyName) => {
        setExpandedCompany((prev) => (prev === companyName ? null : companyName));
    };

    return (
        <Layout
            breadcrumbs={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "Company Bundles", path: "/company-bundles", current: true }
            ]}
        >
            <div className="animate-in">
                <div className="curriculum-header">
                    <div>
                        <h1>🏢 Company Bundles</h1>
                        <p>Top questions frequently asked by leading tech companies.</p>
                    </div>
                </div>

                <div className="curriculum-search" style={{ marginBottom: 24 }}>
                    <div className="search-field" style={{ maxWidth: 400 }}>
                        <Search />
                        <input
                            className="form-input"
                            placeholder="Search companies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search companies"
                        />
                    </div>
                </div>

                {loading ? (
                    <Loader text="Loading company bundles..." />
                ) : filteredCompanies.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: 48,
                        color: "var(--text-muted)"
                    }}>
                        {search
                            ? `No companies found matching "${search}".`
                            : "No company data available. Run the seed script to populate problems."}
                    </div>
                ) : (
                    <div className="company-grid">
                        {filteredCompanies.map((company) => {
                            const isExpanded = expandedCompany === company._id;
                            const emoji = COMPANY_EMOJIS[company._id] || "🏢";

                            return (
                                <div
                                    key={company._id}
                                    className={`company-card ${isExpanded ? "expanded" : ""}`}
                                    onClick={() => handleToggle(company._id)}
                                >
                                    <div className="company-card-header">
                                        <span className="company-logo">{emoji}</span>
                                        <div>
                                            <h3>{company._id}</h3>
                                            <span className="company-count">
                                                {company.count} problem{company.count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div
                                            className="company-problems-list"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="table-wrap">
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Problem</th>
                                                            <th>Difficulty</th>
                                                            <th>Topic</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {company.problems.map((p, i) => (
                                                            <tr key={p._id}>
                                                                <td style={{ color: "var(--text-muted)" }}>
                                                                    {i + 1}
                                                                </td>
                                                                <td>
                                                                    <Link
                                                                        to={`/problems/${p.slug}`}
                                                                        style={{
                                                                            color: "var(--text-primary)",
                                                                            fontWeight: 500
                                                                        }}
                                                                        onMouseEnter={e => e.target.style.color = "var(--accent-light)"}
                                                                        onMouseLeave={e => e.target.style.color = "var(--text-primary)"}
                                                                    >
                                                                        {p.title}
                                                                    </Link>
                                                                </td>
                                                                <td>
                                                                    <DiffBadge d={p.difficulty} />
                                                                </td>
                                                                <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                                                                    {p.topicCategory || "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CompanyBundlesPage;
