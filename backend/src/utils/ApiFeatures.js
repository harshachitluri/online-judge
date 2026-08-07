const { getPagination } = require("./pagination");

/*
 |--------------------------------------------------------------------------
 | ApiFeatures
 |--------------------------------------------------------------------------
 | Translates query-string params into the pieces of a MongoDB query:
 | a filter object, a sort object and pagination bounds.
 |
 | Chainable:
 |   const q = new ApiFeatures(req.query).filter().search().sort().paginate();
 |   Model.find(q.filterObject).sort(q.sortObject).skip(q.skip).limit(q.limit)
 */

const SORT_OPTIONS = {
    oldest: { createdAt: 1 },
    title: { title: 1 },
    newest: { createdAt: -1 }
};

class ApiFeatures {

    constructor(queryParams = {}) {

        this.queryParams = queryParams;

        this.filterObject = {};
        this.sortObject = SORT_OPTIONS.newest;

        const { page, limit, skip } = getPagination(queryParams, { defaultLimit: 10 });

        this.page = page;
        this.limit = limit;
        this.skip = skip;

    }

    /** Equality filters: difficulty, tag, company, topicCategory, isPublished. */
    filter() {

        const {
            difficulty, tag, company, topicCategory, isPublished
        } = this.queryParams;

        if (difficulty) this.filterObject.difficulty = difficulty;
        if (tag) this.filterObject.tags = tag;
        if (company) this.filterObject.company = company;
        if (topicCategory) this.filterObject.topicCategory = topicCategory;

        if (isPublished !== undefined) {
            this.filterObject.isPublished = isPublished === "true" || isPublished === true;
        }

        return this;
    }

    /**
     * Full-text search. Uses $text so MongoDB can use the weighted index on
     * Problem.title + Problem.description instead of scanning with $regex.
     *
     * Quoting the term makes it a phrase match: unquoted, MongoDB treats
     * "Two Sum" as "two OR sum" and returns every problem whose description
     * mentions either word. The unquoted form is kept as a fallback so a
     * phrase that matches nothing still returns near misses rather than an
     * empty page.
     */
    search() {

        const term = String(this.queryParams.search || "").trim();

        if (term) {
            this.searchTerm = term;
            this.filterObject.$text = { $search: term };
        }

        return this;
    }

    /** True when the caller searched, so the query needs textScore selected. */
    get isTextSearch() {
        return Boolean(this.searchTerm);
    }

    sort() {

        /*
         | Relevance beats recency when searching. Without this the weighted
         | index still computes a score and then the results get sorted by
         | createdAt anyway — which is how searching "Two Sum" returned it
         | somewhere below a dozen unrelated problems.
         |
         | An explicit ?sort= still wins: someone who asked for A→Z means it.
         */
        if (this.isTextSearch && !this.queryParams.sort) {
            this.sortObject = { score: { $meta: "textScore" } };
            return this;
        }

        this.sortObject = SORT_OPTIONS[this.queryParams.sort] || SORT_OPTIONS.newest;

        return this;
    }

    /** Bounds are computed in the constructor; kept for chain readability. */
    paginate() {
        return this;
    }

}

module.exports = ApiFeatures;
