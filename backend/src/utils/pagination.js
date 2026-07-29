/*
 |--------------------------------------------------------------------------
 | Pagination Helpers
 |--------------------------------------------------------------------------
 | Every list endpoint clamped page/limit and rebuilt the same response meta
 | by hand, with slightly different bounds each time. These two helpers keep
 | the behaviour identical everywhere.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and clamp pagination query params.
 *
 * @param {object} query           - req.query
 * @param {object} [options]
 * @param {number} [options.defaultLimit]
 * @param {number} [options.maxLimit]
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPagination = (query = {}, options = {}) => {

    const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
    const maxLimit = options.maxLimit || MAX_LIMIT;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));

    return { page, limit, skip: (page - 1) * limit };

};

/**
 * Build the pagination block returned alongside a page of results.
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total - total matching documents
 */
const getPaginationMeta = (page, limit, total) => {

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };

};

module.exports = { getPagination, getPaginationMeta };
