/**
 * Curriculum data — defines topic modules and their associated problem slugs.
 * Maps to actual problems in the database via slug matching.
 */

const CURRICULUM = [
    {
        id: "arrays",
        title: "Data Structures & Arrays",
        icon: "📦",
        description: "Foundational techniques for arrays, linked lists, and basic data organization.",
        problems: [
            "two-sum",
            "contains-duplicate",
            "best-time-to-buy-and-sell-stock",
            "product-of-array-except-self",
            "maximum-subarray"
        ]
    },
    {
        id: "strings",
        title: "Strings & Palindromes",
        icon: "🔤",
        description: "String manipulation, reversal, and palindrome checking.",
        problems: [
            "valid-palindrome",
            "reverse-string",
            "valid-anagram",
            "longest-common-prefix"
        ]
    },
    {
        id: "hashing",
        title: "Hashing & Hash Maps",
        icon: "🗂️",
        description: "Hash table techniques for efficient lookups and grouping.",
        problems: [
            "group-anagrams",
            "longest-consecutive-sequence",
            "top-k-frequent-elements",
            "subarray-sum-equals-k"
        ]
    },
    {
        id: "sorting",
        title: "Sorting Algorithms",
        icon: "📊",
        description: "Sorting techniques, interval problems, and selection algorithms.",
        problems: [
            "merge-intervals",
            "sort-colors",
            "kth-largest-element"
        ]
    },
    {
        id: "binary-search",
        title: "Binary Search",
        icon: "🔍",
        description: "Divide and conquer search techniques on sorted and rotated arrays.",
        problems: [
            "binary-search",
            "search-in-rotated-sorted-array",
            "find-minimum-rotated-array",
            "search-2d-matrix"
        ]
    },
    {
        id: "linked-lists",
        title: "Linked Lists",
        icon: "🔗",
        description: "Pointer manipulation, list reversal, cycle detection, and merging.",
        problems: [
            "reverse-linked-list",
            "merge-two-sorted-lists",
            "linked-list-cycle",
            "remove-nth-node-from-end"
        ]
    },
    {
        id: "trees",
        title: "Trees & BST",
        icon: "🌳",
        description: "Binary tree traversals, BST validation, and tree construction.",
        problems: [
            "maximum-depth-of-binary-tree",
            "invert-binary-tree",
            "binary-tree-level-order",
            "validate-bst",
            "lowest-common-ancestor-bst"
        ]
    },
    {
        id: "graphs",
        title: "Graph Algorithms",
        icon: "🕸️",
        description: "BFS, DFS, topological sort, and connected components.",
        problems: [
            "number-of-islands",
            "clone-graph",
            "course-schedule",
            "pacific-atlantic-water-flow"
        ]
    },
    {
        id: "dynamic-programming",
        title: "Dynamic Programming",
        icon: "🧩",
        description: "Optimal substructure, memoization, and tabulation techniques.",
        problems: [
            "climbing-stairs",
            "coin-change",
            "longest-increasing-subsequence",
            "house-robber",
            "unique-paths"
        ]
    },
    {
        id: "bit-manipulation",
        title: "Bit Manipulation",
        icon: "⚡",
        description: "Bitwise operations, XOR tricks, and binary counting.",
        problems: [
            "single-number",
            "number-of-1-bits",
            "counting-bits"
        ]
    },
    {
        id: "tries",
        title: "Tries & Word Search",
        icon: "🔠",
        description: "Prefix trees, autocomplete, and word matching in grids.",
        problems: [
            "implement-trie",
            "word-search"
        ]
    },
    {
        id: "stack-queue",
        title: "Stack & Queue",
        icon: "📚",
        description: "Stack-based parsing, monotonic stacks, and queue design patterns.",
        problems: [
            "valid-parentheses",
            "min-stack",
            "daily-temperatures"
        ]
    }
];

export default CURRICULUM;
