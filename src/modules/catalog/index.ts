// Public interface of the catalog module. Import only from here.
export { availabilityState, createCatalog } from "./internal/catalog";
export type { Catalog, CatalogDeps } from "./internal/catalog";
export type { AvailabilityState, Category, Product, Variant, VariantDetail, ProductImage } from "./types";
