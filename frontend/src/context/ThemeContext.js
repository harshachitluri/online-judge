import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [editorTheme, setEditorTheme] = useState(() => {
        return localStorage.getItem("editorTheme") || "vs-dark";
    });

    useEffect(() => {
        localStorage.setItem("editorTheme", editorTheme);
    }, [editorTheme]);

    const toggleEditorTheme = () => {
        setEditorTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"));
    };

    return (
        <ThemeContext.Provider value={{ editorTheme, toggleEditorTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export default ThemeContext;
