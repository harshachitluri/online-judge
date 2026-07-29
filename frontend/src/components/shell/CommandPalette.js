import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULES, forgePath } from "../../config/brand";
import { fetchProblems } from "../../services/judge";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useDebounced, useScrollLock } from "../../hooks";
import { overlayVariants, modalVariants } from "../../lib/motion";
import { DifficultyBadge } from "../ui";

/*
 |==========================================================================
 | Command Palette
 |==========================================================================
 | ⌘K / Ctrl-K from anywhere. Three sources feed it:
 |
 |   1. Navigation — every module the current user can reach
 |   2. Actions    — theme, sign out, and other verbs
 |   3. Problems   — live search against the API, debounced
 |
 | The problem search runs only once the query is two characters or longer,
 | so opening the palette doesn't fire a request for an empty string.
 */

/* ── Fuzzy matching ────────────────────────────────────────────────────── */

/*
 | Subsequence match with a contiguity bonus: "cdk" finds "Command Deck",
 | and an exact prefix always outranks a scattered match. Cheap enough to
 | run over a few dozen items on every keystroke.
 */
const fuzzyScore = (query, target) => {
    if (!query) return 1;

    const q = query.toLowerCase();
    const t = target.toLowerCase();

    if (t === q) return 1000;
    if (t.startsWith(q)) return 800;
    if (t.includes(q)) return 600;

    let score = 0;
    let ti = 0;
    let streak = 0;

    for (const char of q) {
        const found = t.indexOf(char, ti);
        if (found === -1) return 0;

        streak = found === ti ? streak + 1 : 0;
        score += 10 + streak * 5;
        ti = found + 1;
    }

    return score;
};

const CommandPalette = ({ open, onClose }) => {
    const [query, setQuery] = useState("");
    const [cursor, setCursor] = useState(0);
    const [problems, setProblems] = useState([]);
    const [searching, setSearching] = useState(false);

    const inputRef = useRef(null);
    const listRef = useRef(null);

    const navigate = useNavigate();
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const { scheme, setScheme } = useTheme();

    const debouncedQuery = useDebounced(query, 220);

    useScrollLock(open);

    /* ── Reset on open ─────────────────────────────────────────────────── */

    useEffect(() => {
        if (!open) return;
        setQuery("");
        setCursor(0);
        setProblems([]);
        // rAF so the input exists and the entry animation has started.
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    /* ── Live problem search ───────────────────────────────────────────── */

    useEffect(() => {
        if (!open || !isAuthenticated || debouncedQuery.trim().length < 2) {
            setProblems([]);
            return undefined;
        }

        let active = true;
        setSearching(true);

        fetchProblems({ search: debouncedQuery.trim(), limit: 6 })
            .then((data) => {
                if (active) setProblems(data?.problems || []);
            })
            .catch(() => {
                if (active) setProblems([]);
            })
            .finally(() => {
                if (active) setSearching(false);
            });

        return () => {
            active = false;
        };
    }, [debouncedQuery, open, isAuthenticated]);

    /* ── Item assembly ─────────────────────────────────────────────────── */

    const items = useMemo(() => {
        const list = [];

        MODULES.filter((m) => {
            if (m.scope === "admin") return isAdmin;
            if (m.scope === "private") return isAuthenticated;
            return true;
        })
            // The Forge has no landing page of its own — it's always entered
            // through a specific problem.
            .filter((m) => m.id !== "forge")
            .forEach((m) => {
                list.push({
                    id: `nav-${m.id}`,
                    group: "Navigate",
                    label: m.label,
                    sub: m.group,
                    icon: m.icon,
                    keywords: `${m.label} ${m.blurb}`,
                    run: () => navigate(m.path)
                });
            });

        list.push({
            id: "action-theme",
            group: "Actions",
            label: scheme === "light" ? "Switch to dark" : "Switch to light",
            sub: "Appearance",
            icon: scheme === "light" ? "LuMoon" : "LuSun",
            keywords: "theme dark light appearance mode",
            run: () => setScheme(scheme === "light" ? "dark" : "light")
        });

        list.push({
            id: "action-system-theme",
            group: "Actions",
            label: "Match system appearance",
            sub: "Appearance",
            icon: "LuMonitor",
            keywords: "system theme auto appearance",
            run: () => setScheme("system")
        });

        if (isAuthenticated) {
            list.push({
                id: "action-logout",
                group: "Actions",
                label: "Sign out",
                sub: "Session",
                icon: "LuLogOut",
                keywords: "sign out logout leave exit",
                run: () => logout()
            });
        }

        return list;
    }, [isAuthenticated, isAdmin, navigate, scheme, setScheme, logout]);

    const results = useMemo(() => {
        const q = query.trim();

        const scored = items
            .map((item) => ({ item, score: fuzzyScore(q, `${item.label} ${item.keywords}`) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((r) => r.item);

        const problemItems = problems.map((p) => ({
            id: `problem-${p._id}`,
            group: "Problems",
            label: p.title,
            sub: p.difficulty,
            icon: "LuFileCode",
            difficulty: p.difficulty,
            run: () => navigate(forgePath(p.slug))
        }));

        return q ? [...scored.slice(0, 8), ...problemItems] : [...scored.slice(0, 9)];
    }, [items, query, problems, navigate]);

    // A shrinking result list can leave the cursor past the end.
    useEffect(() => {
        setCursor((c) => Math.min(c, Math.max(0, results.length - 1)));
    }, [results.length]);

    const activate = useCallback(
        (item) => {
            if (!item) return;
            onClose();
            // Deferred so the exit animation isn't competing with a route
            // change on the same frame.
            setTimeout(() => item.run(), 60);
        },
        [onClose]
    );

    /* ── Keyboard ──────────────────────────────────────────────────────── */

    const onKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setCursor((c) => (c + 1) % Math.max(1, results.length));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setCursor((c) => (c - 1 + results.length) % Math.max(1, results.length));
        } else if (event.key === "Enter") {
            event.preventDefault();
            activate(results[cursor]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
        }
    };

    // Keep the highlighted row in view during keyboard navigation.
    useEffect(() => {
        const node = listRef.current?.querySelector('[data-active="true"]');
        node?.scrollIntoView({ block: "nearest" });
    }, [cursor]);

    if (typeof document === "undefined") return null;

    /* ── Render ────────────────────────────────────────────────────────── */

    let lastGroup = null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="overlay palette-overlay"
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        className="palette"
                        variants={modalVariants}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Command palette"
                    >
                        <div className="palette__search">
                            <Icons.LuSearch size={17} aria-hidden="true" />
                            <input
                                ref={inputRef}
                                className="palette__input"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Jump to a page, search problems, run a command…"
                                aria-label="Search commands and problems"
                                aria-autocomplete="list"
                                aria-controls="palette-results"
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {searching && <span className="spinner" style={{ width: 14, height: 14 }} />}
                            <kbd>Esc</kbd>
                        </div>

                        <div
                            className="palette__results"
                            id="palette-results"
                            role="listbox"
                            ref={listRef}
                        >
                            {results.length === 0 && (
                                <p className="palette__empty">
                                    Nothing matches <strong>{query}</strong>.
                                </p>
                            )}

                            {results.map((item, i) => {
                                const Icon = Icons[item.icon] || Icons.LuCircleDot;
                                const showGroup = item.group !== lastGroup;
                                lastGroup = item.group;

                                return (
                                    <React.Fragment key={item.id}>
                                        {showGroup && (
                                            <div className="palette__group">{item.group}</div>
                                        )}

                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={i === cursor}
                                            data-active={i === cursor}
                                            className="palette__item"
                                            onMouseEnter={() => setCursor(i)}
                                            onClick={() => activate(item)}
                                        >
                                            <span className="palette__icon" aria-hidden="true">
                                                <Icon size={15} />
                                            </span>

                                            <span className="palette__label truncate">
                                                {item.label}
                                            </span>

                                            {item.difficulty ? (
                                                <DifficultyBadge level={item.difficulty} />
                                            ) : (
                                                <span className="palette__sub">{item.sub}</span>
                                            )}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div className="palette__foot">
                            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                            <span><kbd>↵</kbd> open</span>
                            <span><kbd>Esc</kbd> dismiss</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CommandPalette;
