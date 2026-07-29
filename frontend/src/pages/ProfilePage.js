import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import Layout from "../components/Layout";
import ProgressBar from "../components/ProgressBar";
import ProgressRing from "../components/ProgressRing";
import Skeleton, { SkeletonCards } from "../components/Skeleton";
import { getInitials, getAvatarGradient } from "../utils/avatar";
import { formatMonthYear } from "../utils/formatDate";
import { LANG_LABEL } from "../constants/languages";
import {
    CircleCheck, Send, Target, Gem, GraduationCap, MapPin,
    Code2, CalendarDays, ShieldCheck, Pencil, ExternalLink
} from "lucide-react";

const DIFFICULTY_COLOR = {
    Easy: "var(--easy)",
    Medium: "var(--medium)",
    Hard: "var(--hard)"
};

const COMPANY_EMOJI = {
    Google: "🔵", Amazon: "📦", Meta: "🔷", Microsoft: "🟦",
    Apple: "🍎", Netflix: "🔴", Adobe: "🔺", Uber: "🚗",
    Bloomberg: "📰", Twitter: "🐦", LinkedIn: "💼", Salesforce: "☁️",
    Oracle: "🔮", Tesla: "⚡", Spotify: "🎵", Snapchat: "👻"
};

const TOPIC_EMOJI = {
    Arrays: "🔢", Strings: "🔤", Hashing: "🗝️", Sorting: "↕️",
    "Binary Search": "🔍", "Linked Lists": "🔗", Trees: "🌳", Graphs: "🕸️",
    "Dynamic Programming": "🧩", "Bit Manipulation": "💡", Tries: "🌲",
    "Stack & Queue": "📚"
};

/* ── Sub-components ─────────────────────────────────────────────────── */

const StatTile = ({ label, value, icon, accent }) => (
    <div className="stat-tile">
        <div className="stat-tile-icon" style={accent ? { color: accent } : undefined}>
            {icon}
        </div>
        <div>
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    </div>
);

const BundleCard = ({ emoji, name, solved, total, percentage, completed, to }) => (
    <Link to={to} className={`bundle-card ${completed ? "is-complete" : ""}`}>
        <div className="bundle-card-top">
            <span className="bundle-emoji" aria-hidden="true">{emoji}</span>
            <div className="bundle-name">{name}</div>
            {completed && <span className="bundle-badge">Complete</span>}
        </div>

        <ProgressBar
            value={solved}
            max={total}
            color={completed ? "var(--success)" : "var(--accent-light)"}
            size="sm"
        />

        <div className="bundle-meta">
            <span>{solved} / {total} solved</span>
            <span className="bundle-pct">{percentage}%</span>
        </div>
    </Link>
);

const SectionHeading = ({ title, sub, action }) => (
    <div className="profile-section-head">
        <div>
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
        </div>
        {action}
    </div>
);

/* ── Page ───────────────────────────────────────────────────────────── */

const ProfilePage = () => {
    const { user, updateUser, logout } = useAuth();

    const [stats, setStats] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        username: "", email: "", bio: "", college: "",
        location: "", githubUrl: "", linkedinUrl: "", preferredLanguage: "cpp"
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [bundleTab, setBundleTab] = useState("topics"); // "topics" | "companies"
    const [showAllBundles, setShowAllBundles] = useState(false);

    /* ── Load profile, stats and progress together ──────────────── */
    useEffect(() => {
        const load = async () => {
            try {
                const [meRes, progressRes] = await Promise.all([
                    axiosInstance.get("/profile/me"),
                    axiosInstance.get("/profile/progress")
                ]);

                const { user: u, stats: s } = meRes.data.data;

                setStats(s);
                setProgress(progressRes.data.data);
                setForm({
                    username: u.username || "",
                    email: u.email || "",
                    bio: u.bio || "",
                    college: u.college || "",
                    location: u.location || "",
                    githubUrl: u.githubUrl || "",
                    linkedinUrl: u.linkedinUrl || "",
                    preferredLanguage: u.preferredLanguage || "cpp"
                });

                // The login response carries only the basic fields, so bio /
                // college / social links stay blank until this refresh.
                updateUser(u);
            } catch {
                setMessage({ type: "error", text: "Could not load your profile data." });
            } finally {
                setLoading(false);
            }
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await axiosInstance.put("/profile", form);
            updateUser(res.data.data);
            setEditing(false);
            setMessage({ type: "success", text: "Profile updated." });
        } catch (err) {
            setMessage({
                type: "error",
                text: err.response?.data?.message || "Update failed."
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(
            "Delete your account permanently? This cannot be undone."
        )) return;

        try {
            await axiosInstance.delete("/profile");
            logout();
        } catch {
            setMessage({ type: "error", text: "Failed to delete account." });
        }
    };

    const bundles = useMemo(() => {
        if (!progress) return [];

        const list = bundleTab === "topics"
            ? progress.topics.map((t) => ({
                key: t.topic,
                name: t.topic,
                emoji: TOPIC_EMOJI[t.topic] || "📘",
                to: `/curriculum`,
                ...t
            }))
            : progress.companies.map((c) => ({
                key: c.company,
                name: c.company,
                emoji: COMPANY_EMOJI[c.company] || "🏢",
                to: `/company-bundles`,
                ...c
            }));

        // Started-but-unfinished bundles first — that's what to work on next.
        return [...list].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return b.percentage - a.percentage;
        });
    }, [progress, bundleTab]);

    const visibleBundles = showAllBundles ? bundles : bundles.slice(0, 6);
    const displayUser = user || {};

    return (
        <Layout breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Profile", path: "/profile", current: true }
        ]}>
            <div className="animate-in profile-page">

                {message.text && (
                    <div className={`alert alert-${message.type} mb-4`} role="status">
                        {message.text}
                    </div>
                )}

                {/* ── Identity + overall progress ─────────────────── */}
                <section className="card profile-hero">
                    <div className="profile-hero-main">
                        <div
                            className="profile-avatar-lg"
                            style={{ background: getAvatarGradient(displayUser.username, 40) }}
                        >
                            {getInitials(displayUser.username)}
                        </div>

                        <div className="profile-info">
                            <h2>{displayUser.username || <Skeleton width={160} height={24} />}</h2>
                            <p className="profile-email">{displayUser.email}</p>

                            {displayUser.bio && <p className="profile-bio">{displayUser.bio}</p>}

                            <div className="profile-meta">
                                {displayUser.role === "admin" && (
                                    <span className="profile-meta-item is-admin">
                                        <span className="meta-icon"><ShieldCheck size={14} /></span> Admin
                                    </span>
                                )}
                                {displayUser.college && (
                                    <span className="profile-meta-item">
                                        <span className="meta-icon"><GraduationCap size={14} /></span> {displayUser.college}
                                    </span>
                                )}
                                {displayUser.location && (
                                    <span className="profile-meta-item">
                                        <span className="meta-icon"><MapPin size={14} /></span> {displayUser.location}
                                    </span>
                                )}
                                {displayUser.preferredLanguage && (
                                    <span className="profile-meta-item">
                                        <span className="meta-icon"><Code2 size={14} /></span>
                                        {LANG_LABEL[displayUser.preferredLanguage] || displayUser.preferredLanguage}
                                    </span>
                                )}
                                {displayUser.createdAt && (
                                    <span className="profile-meta-item">
                                        <span className="meta-icon"><CalendarDays size={14} /></span> Joined {formatMonthYear(displayUser.createdAt)}
                                    </span>
                                )}
                            </div>

                            <div className="profile-actions">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setEditing((v) => !v);
                                        setMessage({ type: "", text: "" });
                                    }}
                                >
                                    {editing ? "Cancel" : <><Pencil size={14} /> Edit profile</>}
                                </button>

                                {displayUser.githubUrl && (
                                    <a
                                        href={displayUser.githubUrl}
                                        target="_blank" rel="noreferrer"
                                        className="btn btn-ghost btn-sm"
                                    >
                                        <>GitHub <ExternalLink size={13} /></>
                                    </a>
                                )}
                                {displayUser.linkedinUrl && (
                                    <a
                                        href={displayUser.linkedinUrl}
                                        target="_blank" rel="noreferrer"
                                        className="btn btn-ghost btn-sm"
                                    >
                                        <>LinkedIn <ExternalLink size={13} /></>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Overall solved ring */}
                    <div className="profile-hero-ring">
                        {loading ? (
                            <Skeleton width={132} height={132} radius="50%" />
                        ) : (
                            <>
                                <ProgressRing
                                    value={progress?.overall.solved || 0}
                                    max={progress?.overall.total || 0}
                                />
                                <div className="ring-sub">
                                    {progress?.overall.percentage || 0}% of the catalogue
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ── Edit form ───────────────────────────────────── */}
                {editing && (
                    <section className="card profile-edit">
                        <h3>Edit profile</h3>

                        <form onSubmit={handleSave} className="profile-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="username">Username</label>
                                    <input
                                        id="username" name="username" className="form-input"
                                        value={form.username} onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="email">Email</label>
                                    <input
                                        id="email" name="email" type="email" className="form-input"
                                        value={form.email} onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="college">College</label>
                                    <input
                                        id="college" name="college" className="form-input"
                                        value={form.college} onChange={handleChange}
                                        placeholder="Your institution"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="location">Location</label>
                                    <input
                                        id="location" name="location" className="form-input"
                                        value={form.location} onChange={handleChange}
                                        placeholder="City, Country"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="githubUrl">GitHub URL</label>
                                    <input
                                        id="githubUrl" name="githubUrl" className="form-input"
                                        value={form.githubUrl} onChange={handleChange}
                                        placeholder="https://github.com/you"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="linkedinUrl">LinkedIn URL</label>
                                    <input
                                        id="linkedinUrl" name="linkedinUrl" className="form-input"
                                        value={form.linkedinUrl} onChange={handleChange}
                                        placeholder="https://linkedin.com/in/you"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="preferredLanguage">
                                        Preferred language
                                    </label>
                                    <select
                                        id="preferredLanguage" name="preferredLanguage"
                                        className="form-select"
                                        value={form.preferredLanguage} onChange={handleChange}
                                    >
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                        <option value="python">Python</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio" name="bio" className="form-input"
                                    style={{ minHeight: 90, fontFamily: "inherit" }}
                                    value={form.bio} onChange={handleChange}
                                    maxLength={500}
                                    placeholder="A short introduction (max 500 characters)"
                                />
                                <span className="form-hint">{form.bio.length}/500</span>
                            </div>

                            <div className="form-buttons">
                                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                    {saving ? "Saving..." : "Save changes"}
                                </button>
                                <button
                                    type="button" className="btn btn-ghost btn-sm"
                                    onClick={() => setEditing(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* ── Headline stats ──────────────────────────────── */}
                <div className="stat-tile-row">
                    {loading ? (
                        Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} height={86} radius="var(--radius-lg)" />
                        ))
                    ) : (
                        <>
                            <StatTile
                                icon={<CircleCheck />} accent="var(--success)"
                                label="Problems solved"
                                value={progress?.overall.solved ?? 0}
                            />
                            <StatTile
                                icon={<Send />} label="Submissions"
                                value={stats?.totalSubmissions ?? 0}
                            />
                            <StatTile
                                icon={<Target />} accent="var(--brand)"
                                label="Accepted"
                                value={stats?.acceptedSubmissions ?? 0}
                            />
                            <StatTile
                                icon={<Gem />} accent="var(--info)"
                                label="Acceptance rate"
                                value={`${stats?.acceptanceRate ?? 0}%`}
                            />
                        </>
                    )}
                </div>

                {/* ── Difficulty breakdown ────────────────────────── */}
                <section className="card profile-section">
                    <SectionHeading
                        title="Solved by difficulty"
                        sub="Your progress against every published problem"
                    />

                    {loading ? (
                        <Skeleton height={120} />
                    ) : (
                        <div className="difficulty-progress">
                            {progress?.byDifficulty.map((d) => (
                                <ProgressBar
                                    key={d.difficulty}
                                    label={d.difficulty}
                                    value={d.solved}
                                    max={d.total}
                                    color={DIFFICULTY_COLOR[d.difficulty]}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Bundle tracker ──────────────────────────────── */}
                <section className="card profile-section">
                    <SectionHeading
                        title="Bundle tracker"
                        sub="Progress across curriculum topics and company sets"
                        action={
                            <div className="segmented" role="tablist" aria-label="Bundle type">
                                <button
                                    role="tab"
                                    aria-selected={bundleTab === "topics"}
                                    className={bundleTab === "topics" ? "active" : ""}
                                    onClick={() => { setBundleTab("topics"); setShowAllBundles(false); }}
                                >
                                    Topics
                                </button>
                                <button
                                    role="tab"
                                    aria-selected={bundleTab === "companies"}
                                    className={bundleTab === "companies" ? "active" : ""}
                                    onClick={() => { setBundleTab("companies"); setShowAllBundles(false); }}
                                >
                                    Companies
                                </button>
                            </div>
                        }
                    />

                    {loading ? (
                        <SkeletonCards count={6} height={110} />
                    ) : bundles.length === 0 ? (
                        <p className="empty-hint">No bundles available yet.</p>
                    ) : (
                        <>
                            <div className="bundle-grid">
                                {visibleBundles.map((bundle) => (
                                    <BundleCard key={bundle.key} {...bundle} />
                                ))}
                            </div>

                            {bundles.length > 6 && (
                                <button
                                    className="btn btn-ghost btn-sm show-more"
                                    onClick={() => setShowAllBundles((v) => !v)}
                                >
                                    {showAllBundles
                                        ? "Show less"
                                        : `Show all ${bundles.length} ${bundleTab}`}
                                </button>
                            )}
                        </>
                    )}
                </section>

                {/* ── Danger zone ─────────────────────────────────── */}
                <section className="card danger-zone">
                    <div>
                        <h3>Delete account</h3>
                        <p>Permanently removes your profile. This cannot be undone.</p>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                        Delete account
                    </button>
                </section>
            </div>
        </Layout>
    );
};

export default ProfilePage;
