// Public interface of the orders module. Import only from here.
export { createOrders } from "./internal/orders";
export type { OrdersModule, OrdersDeps } from "./internal/orders";
export type { NewOrder, Order, OrderItem, OrderStatus, ShippingAddress } from "./types";
