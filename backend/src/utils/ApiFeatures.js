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
     * Full-text search. Uses $text so MongoDB can use the index defined on
     * Problem.title + Problem.description instead of scanning with $regex.
     */
    search() {

        const term = this.queryParams.search;

        if (term && String(term).trim()) {
            this.filterObject.$text = { $search: String(term).trim() };
        }

        return this;
    }

    sort() {

        this.sortObject = SORT_OPTIONS[this.queryParams.sort] || SORT_OPTIONS.newest;

        return this;
    }

    /** Bounds are computed in the constructor; kept for chain readability. */
    paginate() {
        return this;
    }

}

module.exports = ApiFeatures;
