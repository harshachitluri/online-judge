import React, {
    createContext, useContext, useEffect, useMemo, useState, useCallback
} from "react";

/*
 |==========================================================================
 | ThemeContext
 |==========================================================================
 | Owns appearance: the colour scheme, the editor theme, and the accessibility
 | preferences that need to outlive a page load.
 |
 | Dark is the designed default. "system" is a real third option rather than
 | a synonym for one of the other two — picking it removes the stamp so the
 | OS preference takes over live.
 */

const ThemeContext = createContext(null);

const KEYS = {
    scheme: "axiom.theme",
    editor: "axiom.editorTheme",
    density: "axiom.density",
    motion: "axiom.reduceMotion",
    fontSize: "axiom.editorFontSize"
};

const read = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const write = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { /* private mode — preference just won't survive the session */ }
};

export const ThemeProvider = ({ children }) => {
    const [scheme, setSchemeState] = useState(() => read(KEYS.scheme, "dark"));
    const [editorTheme, setEditorThemeState] = useState(() => read(KEYS.editor, "axiom-dark"));
    const [density, setDensityState] = useState(() => read(KEYS.density, "comfortable"));
    const [reduceMotion, setReduceMotionState] = useState(() => read(KEYS.motion, false));
    const [editorFontSize, setEditorFontSizeState] = useState(() => read(KEYS.fontSize, 14));

    /* ── Stamp the document ────────────────────────────────────────────── */

    useEffect(() => {
        const root = document.documentElement;

        if (scheme === "system") {
            // Removing the attribute is what lets the prefers-color-scheme
            // block in tokens.css take over.
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", scheme);
        }

        write(KEYS.scheme, scheme);
    }, [scheme]);

    useEffect(() => {
        document.documentElement.setAttribute("data-density", density);
        write(KEYS.density, density);
    }, [density]);

    useEffect(() => {
        write(KEYS.editor, editorTheme);
    }, [editorTheme]);

    useEffect(() => {
        write(KEYS.motion, reduceMotion);
    }, [reduceMotion]);

    useEffect(() => {
        write(KEYS.fontSize, editorFontSize);
    }, [editorFontSize]);

    /*
     | Keeps <meta name="theme-color"> in step so mobile browser chrome
     | matches the app rather than flashing white behind it.
     */
    useEffect(() => {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;

        const resolved =
            scheme === "system"
                ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
                : scheme;

        meta.setAttribute("content", resolved === "light" ? "#f7f7fb" : "#0a0b10");
    }, [scheme]);

    /* ── Derived ───────────────────────────────────────────────────────── */

    /** What the user is actually looking at, with "system" resolved. */
    const resolvedScheme = useMemo(() => {
        if (scheme !== "system") return scheme;
        if (typeof window === "undefined") return "dark";
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }, [scheme]);

    const toggleScheme = useCallback(() => {
        setSchemeState((prev) => (prev === "light" ? "dark" : "light"));
    }, []);

    const value = useMemo(
        () => ({
            scheme,
            resolvedScheme,
            setScheme: setSchemeState,
            toggleScheme,
            editorTheme,
            setEditorTheme: setEditorThemeState,
            density,
            setDensity: setDensityState,
            reduceMotion,
            setReduceMotion: setReduceMotionState,
            editorFontSize,
            setEditorFontSize: setEditorFontSizeState
        }),
        [scheme, resolvedScheme, toggleScheme, editorTheme, density, reduceMotion, editorFontSize]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used inside a ThemeProvider.");
    return context;
};

export default ThemeContext;
