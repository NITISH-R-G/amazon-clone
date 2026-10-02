// Public interface of the search module. Import only from here.
export { createSearch, DEFAULT_PAGE_SIZE } from "./internal/search";
export type { Search, SearchDeps } from "./internal/search";
export { parseSearchParams, toSearchParams } from "./internal/params";
export { SORT_KEYS } from "./types";
export type { CategoryFacet, ProductSummary, SearchQuery, SearchResult, SortKey, Suggestion } from "./types";
