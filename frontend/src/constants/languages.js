/*
 |--------------------------------------------------------------------------
 | Languages
 |--------------------------------------------------------------------------
 | Mirrors backend/src/config/languages.js — the judge can only run what the
 | runner image provides (g++, javac, python3). Keep the two in sync.
 |
 | LANG_COLOR still carries an entry for javascript so that submissions made
 | before it was retired keep rendering with their original colour.
 */

export const RUNNABLE_LANGUAGES = ["cpp", "java", "python"];

export const LANG_LABEL = {
    cpp: "C++",
    java: "Java",
    python: "Python",
    javascript: "JavaScript"
};

export const LANG_COLOR = {
    cpp: "#00b4d8",
    java: "#f97316",
    python: "#22c55e",
    javascript: "#f59e0b"
};

/** Keep only languages this judge can actually execute. */
export const filterRunnable = (languages = []) =>
    languages.filter((lang) => RUNNABLE_LANGUAGES.includes(lang));
