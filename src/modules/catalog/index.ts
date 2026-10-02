// Public interface of the catalog module. Import only from here.
export { availabilityState, createCatalog } from "./internal/catalog";
export type { Catalog, CatalogDeps } from "./internal/catalog";
export type {
  AvailabilityState,
  AttributeDef,
  BrandCount,
  Category,
  CategoryCount,
  Product,
  ProductCriteria,
  ProductImage,
  ProductPage,
  ProductType,
  ProductSort,
  ProductSpec,
  TextMatch,
  Variant,
  VariantDetail,
} from "./types";
export * from "./variants";
