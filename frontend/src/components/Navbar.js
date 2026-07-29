import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Zap, LogOut, ListChecks, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInitials, getAvatarGradient } from "../utils/avatar";

const Navbar = ({ isStandalone = false }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const navigate  = useNavigate();

    const isActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/")
            ? "active"
            : "";

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="navbar">
            {/* Brand */}
            <Link to="/" className="navbar-brand" style={{ textDecoration: "none" }}>
                <span className="brand-icon"><Zap /></span>
                <span>Code<span className="brand-accent">Judge</span></span>
            </Link>

            {/* Center links - only show if not standalone or unauthenticated */}
            {!isStandalone && !isAuthenticated && (
                <div className="navbar-links">
                    <Link to="/problems"    className={isActive("/problems")}>Problems</Link>
                    <Link to="/leaderboard" className={isActive("/leaderboard")}>Leaderboard</Link>
                </div>
            )}
            {isStandalone && isAuthenticated && (
                <div className="navbar-links">
                    <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ border: 'none' }}>
                        <ArrowLeft size={15} /> Back to Dashboard
                    </Link>
                </div>
            )}

            {/* Right actions */}
            <div className="navbar-actions">
                {isAuthenticated ? (
                    <div className="navbar-user">
                        {!isStandalone && (
                            <>
                                <Link to="/submissions" className="btn btn-ghost btn-sm">
                                    <ListChecks size={15} /> My Submissions
                                </Link>
                                {/* handleLogout existed but was never wired up,
                                    leaving no way to sign out from the navbar. */}
                                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                                    <LogOut size={15} /> Sign Out
                                </button>
                            </>
                        )}
                        <Link to="/profile">
                            <div
                                className="avatar"
                                title={user?.username}
                                style={{ background: getAvatarGradient(user?.username) }}
                            >
                                {getInitials(user?.username)}
                            </div>
                        </Link>
                    </div>
                ) : (
                    <>
                        <Link to="/login"    className="btn btn-ghost btn-sm">Login</Link>
                        <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
