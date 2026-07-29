import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { getAvatarGradient } from "../utils/avatar";

/**
 * Layout — wraps authenticated pages with sidebar + top bar + content area.
 * Used by Dashboard, Curriculum, Problems, Submissions, Analytics, etc.
 */
const Layout = ({ children, breadcrumbs = [] }) => {
    const { user } = useAuth();
    const location = useLocation();

    // Off-canvas sidebar state (mobile only — CSS ignores it above 768px)
    const [navOpen, setNavOpen] = useState(false);

    // Close the drawer on navigation, otherwise it stays over the new page
    useEffect(() => { setNavOpen(false); }, [location.pathname]);

    // Auto-detect breadcrumb from path if not provided
    const autoBreadcrumbs = breadcrumbs.length > 0
        ? breadcrumbs
        : location.pathname
            .split("/")
            .filter(Boolean)
            .map((segment, idx, arr) => ({
                label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
                path: "/" + arr.slice(0, idx + 1).join("/"),
                current: idx === arr.length - 1
            }));

    return (
        <div className="app-layout">
            <a className="skip-link" href="#main">Skip to content</a>

            <Sidebar className={navOpen ? "open" : ""} />

            {/* Tapping outside the drawer closes it */}
            {navOpen && (
                <button
                    className="sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={() => setNavOpen(false)}
                />
            )}

            <div className="main-content">
                {/* Top bar */}
                <header className="topbar">
                    <div className="topbar-left">
                        <button
                            className="mobile-nav-toggle"
                            aria-label="Open navigation"
                            aria-expanded={navOpen}
                            onClick={() => setNavOpen(true)}
                        >
                            <Menu size={19} />
                        </button>
                        <div className="breadcrumb">
                            {autoBreadcrumbs.map((crumb, i) => (
                                <React.Fragment key={crumb.path || i}>
                                    {i > 0 && <span className="breadcrumb-sep">›</span>}
                                    {crumb.current ? (
                                        <span className="breadcrumb-item current">
                                            {crumb.label}
                                        </span>
                                    ) : (
                                        <Link
                                            to={crumb.path}
                                            className="breadcrumb-item"
                                        >
                                            {crumb.label}
                                        </Link>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="topbar-right">
                        {user && (
                            <div className="topbar-user">
                                <span className="topbar-username">{user.username}</span>
                                <Link to="/profile">
                                    <div
                                        className="topbar-avatar"
                                        style={{ background: getAvatarGradient(user?.username) }}
                                    >
                                        {(user.username || "U")[0].toUpperCase()}
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <div className="page-content" id="main">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
