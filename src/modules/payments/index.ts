// Public interface of the payments module. Import only from here.
export { createDemoProvider } from "./internal/demo-provider";
export { validateCardFormat } from "./internal/card";
export type { CardFormatError } from "./internal/card";
export type { CardInput, PaymentProvider, PaymentRequest, PaymentResult } from "./types";
