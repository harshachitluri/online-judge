/*
 |==========================================================================
 | Sage — static analysis engine
 |==========================================================================
 | Sage runs entirely in the browser. It is *not* a language model: it is a
 | deterministic set of structural heuristics over the source text, which
 | means it is instant, private (no code leaves the device) and offline.
 |
 | It is also, deliberately, not certain. Every finding carries a confidence,
 | and the complexity estimate is presented as an estimate — the UI must
 | never render these as authoritative. Loop-nesting depth is a good proxy
 | for asymptotic cost, not a proof of it.
 */

/* ── Tokenising ────────────────────────────────────────────────────────── */

/**
 * Strips comments and string literals so the structural passes below can't
 * be fooled by the word "for" inside a comment or a printed message.
 */
const decontaminate = (source = "") =>
    source
        .replace(/\/\*[\s\S]*?\*\//g, " ")     // /* block */
        .replace(/\/\/[^\n]*/g, " ")           // // line
        .replace(/#[^\n]*/g, " ")              // # python / preprocessor
        .replace(/"""[\s\S]*?"""/g, ' "" ')    // python docstrings
        .replace(/'''[\s\S]*?'''/g, " '' ")
        .replace(/"(?:\\.|[^"\\])*"/g, ' "" ')
        .replace(/'(?:\\.|[^'\\])*'/g, " '' ");

const countMatches = (text, pattern) => (text.match(pattern) || []).length;

/*
 | Maximum loop-nesting depth.
 |
 | Braces alone don't work for Python, and indentation alone doesn't work for
 | C++/Java, so each language is measured in its own terms and the two share
 | a single return shape.
 */
const loopDepth = (text, language) => {
    if (language === "python") return pythonLoopDepth(text);
    return braceLoopDepth(text);
};

const LOOP_HEAD = /\b(for|while)\s*[\s(]/;

const braceLoopDepth = (text) => {
    let depth = 0;
    let max = 0;

    // Tracks, for each open brace, whether it belongs to a loop. Only loop
    // braces move the counter, so an `if` inside a loop doesn't inflate it.
    const frames = [];
    const lines = text.split("\n");

    for (const line of lines) {
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];

            if (char === "{") {
                const head = line.slice(0, i);
                const isLoop = LOOP_HEAD.test(head);
                frames.push(isLoop);
                if (isLoop) {
                    depth += 1;
                    max = Math.max(max, depth);
                }
            } else if (char === "}") {
                if (frames.pop()) depth = Math.max(0, depth - 1);
            }
        }
    }

    // A brace-less single-statement loop (`for (…) sum += x;`) never opens a
    // frame, so fall back to the raw loop count when nothing was detected.
    if (max === 0 && LOOP_HEAD.test(text)) return 1;

    return max;
};

const pythonLoopDepth = (text) => {
    const stack = [];
    let max = 0;

    for (const raw of text.split("\n")) {
        if (!raw.trim()) continue;

        const indent = raw.length - raw.replace(/^\s*/, "").length;

        // Dedent closes every loop opened at a deeper indent.
        while (stack.length && indent <= stack[stack.length - 1]) stack.pop();

        if (/^\s*(for|while)\b/.test(raw)) {
            stack.push(indent);
            max = Math.max(max, stack.length);
        }
    }

    return max;
};

/* ── Complexity ────────────────────────────────────────────────────────── */

const TIME_BY_DEPTH = ["O(1)", "O(n)", "O(n²)", "O(n³)"];

/**
 * Estimates asymptotic time and space from structure.
 *
 * Confidence is the honest part: a flat loop with a sort in it is a very
 * different confidence proposition than three nested loops, and the UI
 * shows the difference.
 */
export const analyseComplexity = (source = "", language = "cpp") => {
    const text = decontaminate(source);

    const depth = loopDepth(text, language);
    const hasSort = /\.sort\s*\(|\bsort\s*\(|sorted\s*\(|Arrays\.sort|Collections\.sort/.test(text);
    const hasBinarySearch = /binary_search|bisect|lower_bound|upper_bound|Arrays\.binarySearch/.test(text);
    const isRecursive = detectRecursion(text, language);
    const hasMemo = /\bmemo\b|\bdp\b|lru_cache|cache\[/.test(text);

    const hashCount = countMatches(
        text,
        /unordered_map|unordered_set|\bHashMap\b|\bHashSet\b|\bmap<|\bset<|\bdict\(|\{\}|defaultdict|Counter\(/g
    );
    const arrayCount = countMatches(
        text,
        /vector<|new\s+\w+\[|\[\s*\]|\bArrayList\b|\blist\(|\bdeque\b/g
    );

    /* Time */
    let time;
    let reason;
    let confidence;

    if (isRecursive && !hasMemo) {
        time = "O(2ⁿ) — exponential, likely";
        reason = "Recursive calls without a visible memo table or cache.";
        confidence = "low";
    } else if (isRecursive && hasMemo) {
        time = "O(n·m)";
        reason = "Memoised recursion — cost tracks the size of the state space.";
        confidence = "low";
    } else if (depth >= 3) {
        time = TIME_BY_DEPTH[3];
        reason = `${depth} levels of nested iteration.`;
        confidence = "medium";
    } else if (depth === 2) {
        time = "O(n²)";
        reason = "Two levels of nested iteration.";
        confidence = "high";
    } else if (depth === 1 && hasSort) {
        time = "O(n log n)";
        reason = "A single pass, dominated by the sort.";
        confidence = "high";
    } else if (depth === 1 && hasBinarySearch) {
        time = "O(n log n)";
        reason = "A binary search inside a linear scan.";
        confidence = "medium";
    } else if (depth === 1) {
        time = "O(n)";
        reason = "A single linear pass over the input.";
        confidence = "high";
    } else if (hasSort) {
        time = "O(n log n)";
        reason = "No explicit loop; the sort dominates.";
        confidence = "medium";
    } else {
        time = "O(1)";
        reason = "No iteration or recursion detected.";
        confidence = depth === 0 && source.trim().length > 120 ? "low" : "medium";
    }

    /* Space */
    let space;
    let spaceReason;

    if (hashCount > 0 || arrayCount > 0) {
        space = "O(n)";
        spaceReason = "Auxiliary containers scale with the input.";
    } else if (isRecursive) {
        space = "O(n)";
        spaceReason = "Recursion consumes stack proportional to depth.";
    } else {
        space = "O(1)";
        spaceReason = "Only a constant number of scalars.";
    }

    return {
        time,
        space,
        reason,
        spaceReason,
        confidence,
        signals: { depth, hasSort, hasBinarySearch, isRecursive, hasMemo, hashCount, arrayCount }
    };
};

/** Does any declared function call itself? */
const detectRecursion = (text, language) => {
    const pattern =
        language === "python"
            ? /def\s+(\w+)\s*\(/g
            : /(?:[\w<>,:\s*&]+\s+)(\w+)\s*\([^;{]*\)\s*\{/g;

    const names = new Set();
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        // `if (…) {` and `while (…) {` match the C-style signature shape.
        if (!["if", "for", "while", "switch", "catch", "main"].includes(name)) {
            names.add(name);
        }
    }

    return [...names].some((name) => {
        // Two or more occurrences means at least one call beyond the
        // definition itself.
        const uses = countMatches(text, new RegExp(`\\b${name}\\s*\\(`, "g"));
        return uses >= 2;
    });
};

/* ── Review ────────────────────────────────────────────────────────────── */

const RULES = [
    {
        id: "cin-sync",
        languages: ["cpp"],
        severity: "info",
        title: "Untie the C++ streams",
        test: (t) => /\bcin\b|\bcout\b/.test(t) && !/sync_with_stdio/.test(t),
        detail:
            "cin/cout are synchronised with C's stdio by default, which costs " +
            "real time on large inputs. Adding " +
            "`ios_base::sync_with_stdio(false); cin.tie(nullptr);` at the top of " +
            "main often turns a TLE into an accept.",
        confidence: "high"
    },
    {
        id: "endl-flush",
        languages: ["cpp"],
        severity: "info",
        title: "`endl` flushes on every line",
        test: (t) => countMatches(t, /endl/g) >= 3,
        detail:
            "Each `endl` forces a flush. In a loop that is a syscall per " +
            "iteration — prefer `\\n` and let the stream flush once at exit.",
        confidence: "high"
    },
    {
        id: "scanner-slow",
        languages: ["java"],
        severity: "info",
        title: "Scanner is slow for competitive input",
        test: (t) => /new\s+Scanner\s*\(/.test(t),
        detail:
            "Scanner parses with regular expressions. For inputs above ~10⁵ " +
            "tokens, BufferedReader with a StreamTokenizer or split() is " +
            "an order of magnitude faster.",
        confidence: "high"
    },
    {
        id: "string-concat-loop",
        languages: ["java"],
        severity: "warning",
        title: "String concatenation inside a loop",
        test: (t) => /(for|while)[\s\S]{0,220}?\w+\s*\+=\s*("|\w+\s*\+)/.test(t) &&
                     !/StringBuilder/.test(t),
        detail:
            "Java strings are immutable, so `s += x` in a loop is quadratic — " +
            "it copies the whole string each time. Use StringBuilder.",
        confidence: "medium"
    },
    {
        id: "recursion-no-memo",
        languages: ["cpp", "java", "python"],
        severity: "warning",
        title: "Recursion without memoisation",
        test: (t, lang) => detectRecursion(t, lang) && !/memo|\bdp\b|lru_cache|cache/.test(t),
        detail:
            "Overlapping subproblems recomputed from scratch grow " +
            "exponentially. A dictionary keyed on the arguments — or " +
            "@lru_cache in Python — usually collapses this to polynomial time.",
        confidence: "medium"
    },
    {
        id: "linear-membership",
        languages: ["cpp", "java", "python"],
        severity: "warning",
        title: "Linear membership test inside a loop",
        test: (t) =>
            /(for|while)[\s\S]{0,260}?(\.contains\(|\bin\s+\w*list\b|std::find\(|indexOf\()/.test(t),
        detail:
            "Searching a list inside a loop is O(n²). Hoisting the collection " +
            "into a hash set makes the lookup O(1) and the whole loop linear.",
        confidence: "medium"
    },
    {
        id: "deep-nesting",
        languages: ["cpp", "java", "python"],
        severity: "warning",
        title: "Three or more nested loops",
        test: (t, lang) => loopDepth(t, lang) >= 3,
        detail:
            "Cubic time hits the 1-second limit at roughly n = 500. If the " +
            "constraints allow larger inputs, look for a prefix-sum, hash-map " +
            "or two-pointer reformulation.",
        confidence: "high"
    },
    {
        id: "no-edge-guard",
        languages: ["cpp", "java", "python"],
        severity: "info",
        title: "No empty-input guard",
        test: (t) => t.length > 200 && !/(empty\(\)|\.size\(\)\s*==\s*0|len\(\w+\)\s*==\s*0|== *0|isEmpty)/.test(t),
        detail:
            "Nothing in the code appears to handle an empty or single-element " +
            "input. Those are the two cases judges test first.",
        confidence: "low"
    },
    {
        id: "magic-numbers",
        languages: ["cpp", "java", "python"],
        severity: "info",
        title: "Unexplained literal constants",
        test: (t) => countMatches(t, /(?<![\w.])\d{4,}(?![\w.])/g) >= 2,
        detail:
            "Large bare numbers are hard to review and easy to typo. Naming " +
            "them (`const int MOD = 1e9 + 7;`) makes the intent explicit.",
        confidence: "low"
    },
    {
        id: "long-function",
        languages: ["cpp", "java", "python"],
        severity: "info",
        title: "Long single function",
        test: (t) => t.split("\n").filter((l) => l.trim()).length > 60,
        detail:
            "Over 60 lines of logic in one place is hard to debug under " +
            "contest pressure. Splitting the parse, the solve and the output " +
            "makes failures easier to localise.",
        confidence: "low"
    }
];

/**
 * Runs every rule applicable to the language.
 * @returns {{findings: Array, score: number}}
 */
export const reviewCode = (source = "", language = "cpp") => {
    const text = decontaminate(source);

    if (text.trim().length < 20) {
        return { findings: [], score: null, empty: true };
    }

    const findings = RULES.filter(
        (rule) => rule.languages.includes(language) && rule.test(text, language)
    ).map(({ id, severity, title, detail, confidence }) => ({
        id, severity, title, detail, confidence
    }));

    // A blunt but honest score: warnings cost more than notes, floored at 0.
    const penalty = findings.reduce(
        (sum, f) => sum + (f.severity === "warning" ? 12 : 5),
        0
    );

    return {
        findings,
        score: Math.max(0, 100 - penalty),
        empty: false
    };
};

/* ── Hints ─────────────────────────────────────────────────────────────── */

/*
 | Hints are progressive: each one reveals strictly more than the last, and
 | the UI unlocks them one at a time so a user can't accidentally read the
 | solution while looking for a nudge.
 |
 | They are generated from the problem's own tags and constraints rather
 | than invented, so they are always relevant to the problem at hand.
 */
const TAG_HINTS = {
    array: "Ask what a single left-to-right pass could carry with it.",
    "two pointers": "Two indices moving toward each other often replace a nested loop.",
    "hash table": "A map from value → index turns a search into a lookup.",
    "hash map": "A map from value → index turns a search into a lookup.",
    string: "Consider what a frequency count of the characters would tell you.",
    "dynamic programming": "Name the subproblem precisely, then write the recurrence for it.",
    "binary search": "You can binary search on the *answer*, not just on an array.",
    greedy: "Find the exchange argument: why is the locally best choice never wrong?",
    graph: "Decide first what a node is and what an edge means — the algorithm follows.",
    tree: "Ask what each subtree needs to report upward to its parent.",
    sorting: "Sorting first often makes the invariant you need obvious.",
    stack: "A stack is the right shape when you need the most recent unmatched thing.",
    "linked list": "A slow and a fast pointer resolve most cycle and midpoint questions.",
    math: "Look for the closed form before writing the loop.",
    recursion: "Write the base case first, then trust the recursive call.",
    "bit manipulation": "XOR cancels duplicates; AND with (n-1) clears the lowest set bit.",
    heap: "A heap of size k answers 'top k' in O(n log k).",
    "sliding window": "Grow the window while it stays valid, shrink it the moment it isn't.",
    "prefix sum": "Precompute cumulative totals so any range answers in O(1).",
    backtracking: "Choose, recurse, then undo the choice — the undo is the part people forget."
};

export const generateHints = (problem) => {
    if (!problem) return [];

    const hints = [];
    const tags = (problem.tags || []).map((t) => String(t).toLowerCase());

    hints.push({
        level: 1,
        label: "Orient",
        text:
            `Re-read the statement and write down, in one sentence, exactly what ` +
            `"${problem.title}" is asking you to return. Then work the provided ` +
            `example by hand before writing any code — most wrong answers are ` +
            `misreadings, not bad algorithms.`
    });

    const matched = tags.map((t) => TAG_HINTS[t]).filter(Boolean);

    if (matched.length) {
        hints.push({ level: 2, label: "Approach", text: matched[0] });
    } else {
        hints.push({
            level: 2,
            label: "Approach",
            text:
                "Start with the brute-force solution you know is correct. Then " +
                "look for the work it repeats — that repetition is what a better " +
                "algorithm removes."
        });
    }

    if (problem.constraints) {
        hints.push({
            level: 3,
            label: "Read the constraints",
            text:
                "The constraints name the intended complexity. Roughly: n up to " +
                "10⁶ wants O(n) or O(n log n); n up to 10⁴ tolerates O(n²); n " +
                "below 25 is a hint that exponential search is expected."
        });
    }

    if (matched.length > 1) {
        hints.push({ level: hints.length + 1, label: "Refine", text: matched[1] });
    }

    hints.push({
        level: hints.length + 1,
        label: "Before you submit",
        text:
            "Check the empty input, the single-element input, and the largest " +
            "value the constraints permit — integer overflow at the boundary is " +
            "the single most common cause of a wrong answer here."
    });

    return hints;
};

/* ── Conversational surface ────────────────────────────────────────────── */

/*
 | Sage's chat is intent-routed onto the analysers above rather than being a
 | generative model. It answers what it can actually answer and says so
 | plainly when a question is outside that set — which is better than
 | inventing a confident wrong answer.
 */
export const respond = ({ message, code, language, problem }) => {
    const q = message.toLowerCase();

    if (/complexity|big.?o|time|runtime|space/.test(q)) {
        if (!code?.trim()) {
            return {
                kind: "text",
                text: "Paste or open some code in the Forge and I'll estimate its complexity."
            };
        }
        return { kind: "complexity", data: analyseComplexity(code, language) };
    }

    if (/review|improve|better|optimi|refactor|feedback|wrong/.test(q)) {
        if (!code?.trim()) {
            return { kind: "text", text: "There's no code to review yet — write something first." };
        }
        return { kind: "review", data: reviewCode(code, language) };
    }

    if (/hint|stuck|help|approach|how do i|where do i start/.test(q)) {
        if (!problem) {
            return {
                kind: "text",
                text: "Open a problem in the Forge and I'll give you graduated hints for it."
            };
        }
        return { kind: "hints", data: generateHints(problem) };
    }

    if (/what can you|who are you|capabilities/.test(q)) {
        return {
            kind: "text",
            text:
                "I read your code structurally, right here in the browser — nothing " +
                "is uploaded. I can estimate time and space complexity, review your " +
                "code against a set of performance and correctness heuristics, and " +
                "give graduated hints for the problem you have open. I can't run " +
                "your code or write the solution for you."
        };
    }

    return {
        kind: "text",
        text:
            "I'm a structural analyser rather than a general chatbot, so I'll be " +
            "honest: that's outside what I can answer well. Try asking me for a " +
            "complexity estimate, a code review, or a hint on the current problem."
    };
};
