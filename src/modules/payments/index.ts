// Public interface of the payments module. Import only from here.
export { createDemoProvider } from "./internal/demo-provider";
export { createPayments } from "./internal/payments";
export type { PaymentRecord, PaymentsDeps, PaymentsService, RefundRecord } from "./internal/payments";
export { applyPaymentEvent } from "./internal/state";
export { validateCardFormat } from "./internal/card";
export type { CardFormatError } from "./internal/card";
export type {
  CardInput,
  PaymentEvent,
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  ProviderPayment,
  RefundOutcome,
} from "./types";
