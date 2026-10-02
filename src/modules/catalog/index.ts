// Public interface of the catalog module. Import only from here.
export { createCatalog } from "./internal/catalog";
export type { Catalog, CatalogDeps } from "./internal/catalog";
export type { Product, Variant, VariantDetail, ProductImage } from "./types";
