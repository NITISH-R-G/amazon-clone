// Public interface of the checkout module. Import only from here.
export { quoteCart } from "./internal/quote";
export { applyCoupon, couponMessages, normaliseCode } from "./internal/coupons";
export { createCheckout } from "./internal/checkout";
export { HOLD_MINUTES } from "./internal/checkout";
export type {
  Checkout,
  CheckoutDeps,
  OrderView,
  PaymentHandled,
  PlaceOrderInput,
  StartCheckoutError,
  StartCheckoutInput,
  StartedCheckout,
} from "./internal/checkout";
export type { Quote, CheckoutError, AppliedCoupon, CouponError } from "./types";
export { shippingAddressSchema } from "./internal/address";
export { FREE_SHIPPING_THRESHOLD_CENTS, FLAT_SHIPPING_CENTS } from "./internal/pricing-rules";
