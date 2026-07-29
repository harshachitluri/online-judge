import client, { unwrap } from "../api/client";

/*
 |==========================================================================
 | Judge services — problems, test cases, execution, submissions
 |==========================================================================
 */

/* ── Problems ──────────────────────────────────────────────────────────── */

/**
 * @param {object} params  page, limit, difficulty, tags, search, sort…
 * @returns {{problems: Array, totalProblems: number, totalPages: number, page: number}}
 */
export const fetchProblems = async (params = {}) => {
    // Empty strings would be serialised as `?difficulty=` and treated as a
    // real filter by the backend's ApiFeatures, matching nothing.
    const query = Object.fromEntries(
        Object.entries(params).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined
        )
    );

    const res = await client.get("/problems", { params: query });
    return unwrap(res);
};

export const fetchProblemBySlug = async (slug) => {
    const res = await client.get(`/problems/${slug}`);
    return unwrap(res);
};

export const fetchProblemById = async (id) => {
    const res = await client.get(`/problems/id/${id}`);
    return unwrap(res);
};

export const fetchTopics = async () => {
    const res = await client.get("/problems/topics");
    return unwrap(res) || [];
};

export const fetchCompanies = async () => {
    const res = await client.get("/problems/companies");
    return unwrap(res) || [];
};

export const createProblem = async (payload) => {
    const res = await client.post("/problems", payload);
    return unwrap(res);
};

export const updateProblem = async (id, payload) => {
    const res = await client.put(`/problems/${id}`, payload);
    return unwrap(res);
};

export const deleteProblem = async (id) => {
    await client.delete(`/problems/${id}`);
};

/* ── Test cases ────────────────────────────────────────────────────────── */

/** Sample (visible) test cases for a problem. */
export const fetchSampleTestCases = async (problemId) => {
    const res = await client.get(`/testcases/problem/${problemId}`);
    return unwrap(res) || [];
};

/** All test cases including hidden ones — admin only. */
export const fetchAllTestCases = async (problemId) => {
    const res = await client.get(`/testcases/admin/problem/${problemId}`);
    return unwrap(res) || [];
};

export const createTestCase = async (payload) => {
    const res = await client.post("/testcases", payload);
    return unwrap(res);
};

export const updateTestCase = async (id, payload) => {
    const res = await client.put(`/testcases/${id}`, payload);
    return unwrap(res);
};

export const deleteTestCase = async (id) => {
    await client.delete(`/testcases/${id}`);
};

/* ── Execution ─────────────────────────────────────────────────────────── */

/**
 * Playground run against custom input. Compile and runtime failures come
 * back as a 200 with `error: true`, so this never throws for *user* errors —
 * only for transport failures.
 */
export const runCode = async ({ language, sourceCode, input = "" }) => {
    const res = await client.post("/run", { language, sourceCode, input });
    return unwrap(res);
};

/* ── Submissions ───────────────────────────────────────────────────────── */

export const createSubmission = async ({ problemId, language, sourceCode }) => {
    const res = await client.post("/submissions", { problemId, language, sourceCode });
    return unwrap(res);
};

export const fetchSubmission = async (id) => {
    const res = await client.get(`/submissions/${id}`);
    return unwrap(res);
};

export const fetchMySubmissions = async (params = {}) => {
    const res = await client.get("/submissions/my", { params });
    return unwrap(res);
};

export const fetchProblemSubmissions = async (problemId, params = {}) => {
    const res = await client.get(`/submissions/problem/${problemId}`, { params });
    return unwrap(res);
};

/*
 | Judging is asynchronous: the POST returns a Queued submission and a
 | background worker fills in the verdict. This polls until the worker marks
 | it Completed, backing off so a slow judge doesn't produce a request storm.
 |
 | `onTick` receives every intermediate state so the UI can show
 | Queued → Running → verdict rather than a frozen spinner.
 */
export const pollSubmission = async (id, { onTick, signal } = {}) => {
    const startedAt = Date.now();
    const TIMEOUT_MS = 60000;

    let delay = 400;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const submission = await fetchSubmission(id);
        onTick?.(submission);

        if (submission.status === "Completed") return submission;

        if (Date.now() - startedAt > TIMEOUT_MS) {
            throw new Error(
                "The judge is taking longer than expected. Your submission is " +
                "still queued — check Chronicle in a moment."
            );
        }

        const currentDelay = delay;
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        delay = Math.min(delay * 1.35, 2500);
    }
};
