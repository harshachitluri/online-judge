import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Zap, LayoutDashboard, BookOpen, Code2, TrendingUp,
    BarChart3, Building2, Settings, LogOut, ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInitials, getAvatarGradient } from "../utils/avatar";

const NAV_ITEMS = [
    { path: "/dashboard",       icon: <LayoutDashboard />, label: "Dashboard" },
    { path: "/curriculum",      icon: <BookOpen />,        label: "Curriculum" },
    { path: "/problems",        icon: <Code2 />,           label: "Workspace" },
    { path: "/submissions",     icon: <TrendingUp />,      label: "Trajectory" },
    { path: "/analytics",       icon: <BarChart3 />,       label: "Analytics" },
    { path: "/company-bundles", icon: <Building2 />,       label: "Company Bundles" }
];

const Sidebar = ({ className = "" }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/");

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <aside className={`sidebar ${className}`}>
            {/* Brand */}
            <Link to="/dashboard" className="sidebar-brand" style={{ textDecoration: "none" }}>
                <span className="brand-icon"><Zap /></span>
                <span>Code<span className="brand-accent">Judge</span></span>
            </Link>

            {/* User info */}
            {user && (
                <div className="sidebar-user">
                    <div
                        className="sidebar-user-avatar"
                        style={{ background: getAvatarGradient(user?.username) }}
                    >
                        {getInitials(user.username)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.username}</div>
                        <div className="sidebar-user-email">{user.email}</div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Menu</div>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}

                {user?.role === "admin" && (
                    <>
                        <hr className="sidebar-divider" />
                        <Link
                            to="/admin/problems"
                            className={`sidebar-link ${isActive("/admin") ? "active" : ""}`}
                        >
                            <span className="sidebar-icon"><ShieldCheck /></span>
                            Admin Panel
                        </Link>
                    </>
                )}
            </nav>

            {/* Bottom section */}
            <div className="sidebar-bottom">
                <Link
                    to="/profile"
                    className={`sidebar-link ${isActive("/profile") ? "active" : ""}`}
                >
                    <span className="sidebar-icon"><Settings /></span>
                    Settings
                </Link>
                <button className="sidebar-link" onClick={handleLogout}>
                    <span className="sidebar-icon"><LogOut /></span>
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
