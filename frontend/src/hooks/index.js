import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/*
 |==========================================================================
 | Shared hooks
 |==========================================================================
 */

/**
 * Runs an async function on mount (and whenever `deps` change), tracking
 * loading and error state.
 *
 * The result of a superseded request is discarded: without the `active`
 * guard, a slow first request resolving after a fast second one would
 * overwrite newer data with stale data.
 *
 * @returns {{data, loading, error, reload, setData}}
 */
export const useAsync = (fn, deps = [], { immediate = true, initial = null } = {}) => {
    const [data, setData] = useState(initial);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const fnRef = useRef(fn);
    fnRef.current = fn;

    const activeRef = useRef(true);
    const runIdRef = useRef(0);

    const run = useCallback(async () => {
        const runId = ++runIdRef.current;

        setLoading(true);
        setError(null);

        try {
            const result = await fnRef.current();
            if (activeRef.current && runId === runIdRef.current) setData(result);
            return result;
        } catch (err) {
            if (activeRef.current && runId === runIdRef.current) setError(err);
            return undefined;
        } finally {
            if (activeRef.current && runId === runIdRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        activeRef.current = true;
        if (immediate) run();

        return () => {
            activeRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { data, loading, error, reload: run, setData };
};

/** Delays a rapidly-changing value — search inputs, resize handlers. */
export const useDebounced = (value, delay = 300) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);

    return debounced;
};

/** Reactive media query. */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = (event) => setMatches(event.matches);

        // The query can change between renders; re-sync immediately.
        setMatches(list.matches);
        list.addEventListener("change", onChange);

        return () => list.removeEventListener("change", onChange);
    }, [query]);

    return matches;
};

export const useIsMobile = () => useMediaQuery("(max-width: 860px)");

/** State mirrored into localStorage, tolerant of private-mode failures. */
export const useLocalStorage = (key, initialValue) => {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const set = useCallback(
        (next) => {
            setValue((prev) => {
                const resolved = typeof next === "function" ? next(prev) : next;
                try {
                    localStorage.setItem(key, JSON.stringify(resolved));
                } catch { /* quota or private mode — in-memory state still works */ }
                return resolved;
            });
        },
        [key]
    );

    return [value, set];
};

/**
 * Fires when a click lands outside the referenced element.
 * `mousedown` rather than `click` so a dropdown closes before the click
 * reaches whatever is underneath it.
 */
export const useClickOutside = (ref, handler, enabled = true) => {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) return undefined;

        const onDown = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            handlerRef.current(event);
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown, { passive: true });

        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
        };
    }, [ref, enabled]);
};

/**
 * A global keyboard shortcut.
 * @param {string} combo  e.g. "mod+k", "escape", "shift+?"
 */
export const useHotkey = (combo, handler, { enabled = true, allowInInput = false } = {}) => {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) return undefined;

        const parts = combo.toLowerCase().split("+");
        const key = parts[parts.length - 1];
        const needsMod = parts.includes("mod");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");

        const onKey = (event) => {
            // Typing "k" in a search box must not open the command palette.
            if (!allowInInput) {
                const el = event.target;
                const tag = el?.tagName?.toLowerCase();
                if (tag === "input" || tag === "textarea" || el?.isContentEditable) return;
            }

            const mod = event.metaKey || event.ctrlKey;

            if (needsMod !== mod) return;
            if (needsShift !== event.shiftKey) return;
            if (needsAlt !== event.altKey) return;
            if (event.key.toLowerCase() !== key) return;

            event.preventDefault();
            handlerRef.current(event);
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [combo, enabled, allowInInput]);
};

/**
 * Animates a number from 0 to `target` once the element is visible.
 * Uses requestAnimationFrame rather than a transition so the intermediate
 * values are real numbers the DOM can format with separators.
 */
export const useCountUp = (target, { duration = 1200, start = false } = {}) => {
    const [value, setValue] = useState(0);
    const frameRef = useRef();

    useEffect(() => {
        if (!start) return undefined;

        // Reduced motion means the number should simply *be* its value.
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || !Number.isFinite(target)) {
            setValue(target || 0);
            return undefined;
        }

        const from = 0;
        const startedAt = performance.now();

        const tick = (now) => {
            const t = Math.min(1, (now - startedAt) / duration);
            // easeOutExpo — fast start, long settle. Reads as "counting up".
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

            setValue(from + (target - from) * eased);

            if (t < 1) frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration, start]);

    return value;
};

/** True once the element has entered the viewport (stays true afterwards). */
export const useInView = (options = {}) => {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || inView) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.2, ...options }
        );

        observer.observe(node);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView]);

    return [ref, inView];
};

/** Locks body scroll while `locked` is true. Safe to nest. */
const lockCount = { value: 0 };

export const useScrollLock = (locked) => {
    useEffect(() => {
        if (!locked) return undefined;

        lockCount.value += 1;
        document.body.dataset.scrollLocked = "true";

        return () => {
            lockCount.value -= 1;
            // Only the last overlay to close releases the lock.
            if (lockCount.value <= 0) {
                lockCount.value = 0;
                delete document.body.dataset.scrollLocked;
            }
        };
    }, [locked]);
};

/** Traps Tab focus inside a container — required for accessible modals. */
export const useFocusTrap = (ref, active) => {
    useEffect(() => {
        if (!active || !ref.current) return undefined;

        const node = ref.current;
        const previouslyFocused = document.activeElement;

        const focusables = () =>
            [...node.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )].filter((el) => el.offsetParent !== null);

        // Focus the first control so keyboard users start inside the dialog.
        const first = focusables()[0];
        (first || node).focus?.();

        const onKey = (event) => {
            if (event.key !== "Tab") return;

            const items = focusables();
            if (!items.length) return;

            const firstItem = items[0];
            const lastItem = items[items.length - 1];

            if (event.shiftKey && document.activeElement === firstItem) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        };

        node.addEventListener("keydown", onKey);

        return () => {
            node.removeEventListener("keydown", onKey);
            previouslyFocused?.focus?.();
        };
    }, [ref, active]);
};

/** Scroll progress of the whole document, 0 → 1. */
export const useScrollProgress = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let frame = null;

        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                const max = document.documentElement.scrollHeight - window.innerHeight;
                setProgress(max > 0 ? window.scrollY / max : 0);
                frame = null;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        return () => {
            window.removeEventListener("scroll", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    return progress;
};

/** True once the page has scrolled past `offset` — used to condense the nav. */
export const useScrolled = (offset = 12) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > offset);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [offset]);

    return scrolled;
};

/** Live pointer position relative to an element, normalised to 0→1. */
export const usePointerPosition = () => {
    const ref = useRef(null);
    const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

    const onPointerMove = useCallback((event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        setPos({
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height
        });
    }, []);

    return { ref, pos, onPointerMove };
};

/** A ticking clock — for contest countdowns. `interval` in ms. */
export const useNow = (interval = 1000) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), interval);
        return () => clearInterval(id);
    }, [interval]);

    return now;
};

/** Client-side pagination over an in-memory list. */
export const usePagination = (items = [], pageSize = 12) => {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    // A filter change can leave the cursor past the end of the new list.
    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const slice = useMemo(
        () => items.slice((page - 1) * pageSize, page * pageSize),
        [items, page, pageSize]
    );

    return { page, setPage, totalPages, slice, total: items.length };
};

export const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};
