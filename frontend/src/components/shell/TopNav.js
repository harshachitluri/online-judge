import React, { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { BRAND, MODULE, sidebarSections } from "../../config/brand";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useClickOutside, useScrolled, useHotkey } from "../../hooks";
import { fetchSignals, unreadCount } from "../../services/signals";
import { popVariants } from "../../lib/motion";
import { Avatar, Button, Badge, Drawer } from "../ui";
import Logo from "./Logo";
import CommandPalette from "./CommandPalette";

/*
 |==========================================================================
 | TopNav
 |==========================================================================
 | For signed-in pages this is a slim utility bar — search, theme, signals,
 | account — because the left Sidebar owns module navigation. It only shows
 | the logo and a burger (which opens the same navigation in a drawer) below
 | the point where the Sidebar hides itself.
 |
 | For anonymous visitors (the landing page) there is no Sidebar at all, so
 | this renders the full marketing bar instead.
 */

/* ── Account menu ──────────────────────────────────────────────────────── */

const AccountMenu = ({ user, isAdmin, onLogout }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const location = useLocation();

    useClickOutside(ref, () => setOpen(false), open);
    useEffect(() => setOpen(false), [location.pathname]);

    /* Escape closes it, and focus returns to the trigger — otherwise the
       tab order restarts at the top of the page. */
    useEffect(() => {
        if (!open) return;

        const onKey = (event) => {
            if (event.key !== "Escape") return;
            setOpen(false);
            ref.current?.querySelector(".menu__trigger")?.focus();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <div className="menu" ref={ref}>
            <button
                type="button"
                className={`menu__trigger ${open ? "menu__trigger--open" : ""}`}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Account menu"
            >
                <Avatar name={user?.username} size="sm" />
                <Icons.LuChevronDown size={13} className="menu__chevron" aria-hidden="true" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="menu__panel"
                        variants={popVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        role="menu"
                    >
                        <div className="menu__identity">
                            <Avatar name={user?.username} size="md" />
                            <div className="stack" style={{ minWidth: 0 }}>
                                <span className="truncate" style={{ fontWeight: "var(--fw-semi)" }}>
                                    {user?.username}
                                </span>
                                <span className="truncate text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                                    {user?.email}
                                </span>
                            </div>
                        </div>

                        {isAdmin && (
                            <div style={{ padding: "0 var(--sp-2) var(--sp-2)" }}>
                                <Badge tone="brand" icon={Icons.LuShieldCheck}>
                                    Admin access
                                </Badge>
                            </div>
                        )}

                        <hr className="menu__rule" />

                        <Link to={MODULE.identity.path} className="menu__item" role="menuitem">
                            <Icons.LuUserRound size={15} aria-hidden="true" />
                            <span>Profile</span>
                        </Link>
                        <Link to={MODULE.control.path} className="menu__item" role="menuitem">
                            <Icons.LuSettings2 size={15} aria-hidden="true" />
                            <span>Settings</span>
                        </Link>

                        <hr className="menu__rule" />

                        <button
                            type="button"
                            className="menu__item menu__item--danger"
                            role="menuitem"
                            onClick={onLogout}
                        >
                            <Icons.LuLogOut size={15} aria-hidden="true" />
                            <span>Sign out</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ── TopNav ────────────────────────────────────────────────────────────── */

const TopNav = () => {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { scheme, toggleScheme } = useTheme();

    const [paletteOpen, setPaletteOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    const scrolled = useScrolled(8);
    const location = useLocation();

    useHotkey("mod+k", () => setPaletteOpen(true), { allowInInput: true });
    useHotkey("/", () => setPaletteOpen(true), { enabled: isAuthenticated });

    useEffect(() => setDrawerOpen(false), [location.pathname]);

    /* Unread badge. Failure is silent: a missing count is not worth an
       error state in the navigation bar. */
    useEffect(() => {
        if (!isAuthenticated) return;

        let active = true;
        fetchSignals({ limit: 30 })
            .then((signals) => active && setUnread(unreadCount(signals)))
            .catch(() => {});

        return () => {
            active = false;
        };
    }, [isAuthenticated, location.pathname]);

    const sections = isAuthenticated ? sidebarSections({ isAdmin }) : [];

    return (
        <>
            <header className={`topnav ${isAuthenticated ? "topnav--framed" : scrolled ? "topnav--scrolled" : ""}`}>
                <div className={`topnav__inner ${isAuthenticated ? "topnav__inner--app" : ""}`}>
                    <div className="topnav__lead">
                        {isAuthenticated && (
                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={Icons.LuMenu}
                                className="topnav__burger"
                                onClick={() => setDrawerOpen(true)}
                                aria-label="Open navigation"
                            />
                        )}

                        {/* The Sidebar already carries the logo on desktop —
                            this copy only shows on mobile / marketing, via CSS. */}
                        <Logo to={isAuthenticated ? MODULE.deck.path : "/"} className="topnav__logo" />
                    </div>

                    {!isAuthenticated && (
                        <nav className="topnav__modules topnav__modules--marketing" aria-label="Primary">
                            <a href="/#capabilities" className="navitem">
                                <span className="navitem__label">Capabilities</span>
                            </a>
                            <a href="/#proof" className="navitem">
                                <span className="navitem__label">Proof</span>
                            </a>
                            <a href="/#trajectory" className="navitem">
                                <span className="navitem__label">Trajectory</span>
                            </a>
                        </nav>
                    )}

                    <div className="topnav__actions">
                        {isAuthenticated && (
                            <button
                                type="button"
                                className="topnav__search"
                                onClick={() => setPaletteOpen(true)}
                                aria-label="Open command palette"
                            >
                                <Icons.LuSearch size={14} aria-hidden="true" />
                                <span>Search</span>
                                <kbd>⌘K</kbd>
                            </button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={scheme === "light" ? Icons.LuMoon : Icons.LuSun}
                            onClick={toggleScheme}
                            aria-label={
                                scheme === "light" ? "Switch to dark theme" : "Switch to light theme"
                            }
                        />

                        {isAuthenticated ? (
                            <>
                                <Link
                                    to={MODULE.signals.path}
                                    className="topnav__bell"
                                    aria-label={
                                        unread > 0
                                            ? `Notifications, ${unread} unread`
                                            : "Notifications"
                                    }
                                >
                                    <Icons.LuBell size={16} aria-hidden="true" />
                                    {unread > 0 && (
                                        <span className="topnav__count tnum">
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </Link>

                                <AccountMenu user={user} isAdmin={isAdmin} onLogout={logout} />
                            </>
                        ) : (
                            <div className="row" style={{ gap: "var(--sp-2)" }}>
                                <Button variant="ghost" size="sm" to="/enter">
                                    Sign in
                                </Button>
                                <Button variant="primary" size="sm" to="/join">
                                    Get started
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile navigation — mirrors the Sidebar's grouping. */}
            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                side="left"
                title={BRAND.name}
            >
                <nav className="stack stack-5" aria-label="Modules">
                    {sections.map((section) => (
                        <div key={section.group} className="stack stack-1">
                            <span className="drawer-group-label">{section.group}</span>
                            {section.items.map((module) => {
                                const Icon = Icons[module.icon] || Icons.LuCircleDot;

                                return (
                                    <NavLink
                                        key={module.id}
                                        to={module.path}
                                        className={({ isActive }) =>
                                            `drawer-item ${isActive ? "drawer-item--active" : ""}`
                                        }
                                    >
                                        <Icon size={17} aria-hidden="true" />
                                        <span>{module.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </Drawer>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </>
    );
};

export default TopNav;
