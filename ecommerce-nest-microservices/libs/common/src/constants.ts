export enum Role {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export enum PrincipalType {
  USER = 'USER',
  SELLER = 'SELLER',
}

export enum AccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PublishStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  ONLINE = 'ONLINE',
  COD = 'COD',
}

export enum ShipmentStatus {
  UNFULFILLED = 'UNFULFILLED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum CouponOwner {
  PLATFORM = 'PLATFORM',
  SELLER = 'SELLER',
}

/** Injection tokens for the TCP clients. */
export const SERVICES = {
  AUTH: 'AUTH_SERVICE',
  CATALOG: 'CATALOG_SERVICE',
  ORDER: 'ORDER_SERVICE',
  PAYMENT: 'PAYMENT_SERVICE',
} as const;

/** Every message / event pattern used between services lives here. */
export const MSG = {
  // ---- auth-service ----
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN: 'auth.login',
  AUTH_SELLER_REGISTER: 'auth.seller.register',
  AUTH_SELLER_LOGIN: 'auth.seller.login',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_LOGOUT: 'auth.logout',

  USERS_ME: 'users.me',
  USERS_UPDATE: 'users.update',
  USERS_LIST: 'users.list',
  ADDRESS_LIST: 'users.address.list',
  ADDRESS_GET: 'users.address.get',
  ADDRESS_ADD: 'users.address.add',
  ADDRESS_UPDATE: 'users.address.update',
  ADDRESS_DELETE: 'users.address.delete',

  SELLERS_ME: 'sellers.me',
  SELLERS_UPDATE: 'sellers.update',
  SELLERS_LIST: 'sellers.list',
  SELLERS_VERIFY: 'sellers.verify',

  // ---- catalog-service ----
  CATEGORY_CREATE: 'categories.create',
  CATEGORY_TREE: 'categories.tree',
  CATEGORY_GET: 'categories.get',
  CATEGORY_UPDATE: 'categories.update',
  CATEGORY_DELETE: 'categories.delete',

  BRAND_CREATE: 'brands.create',
  BRAND_LIST: 'brands.list',
  BRAND_UPDATE: 'brands.update',
  BRAND_DELETE: 'brands.delete',

  PRODUCT_CREATE: 'products.create',
  PRODUCT_LIST: 'products.list',
  PRODUCT_GET: 'products.get',
  PRODUCT_UPDATE: 'products.update',
  PRODUCT_DELETE: 'products.delete',
  PRODUCT_PUBLISH: 'products.publish',
  PRODUCT_MODERATE: 'products.moderate',
  PRODUCT_SNAPSHOT: 'products.snapshot',
  VARIANT_ADD: 'products.variant.add',
  VARIANT_UPDATE: 'products.variant.update',

  INVENTORY_RESERVE: 'inventory.reserve',
  INVENTORY_RELEASE: 'inventory.release',
  INVENTORY_COMMIT: 'inventory.commit',
  INVENTORY_RESTOCK: 'inventory.restock',

  REVIEW_CREATE: 'reviews.create',
  REVIEW_LIST: 'reviews.list',
  WISHLIST_TOGGLE: 'wishlist.toggle',
  WISHLIST_LIST: 'wishlist.list',

  // ---- order-service ----
  CART_GET: 'cart.get',
  CART_ADD: 'cart.add',
  CART_UPDATE: 'cart.update',
  CART_REMOVE: 'cart.remove',
  CART_CLEAR: 'cart.clear',
  CART_APPLY_COUPON: 'cart.coupon.apply',
  CART_REMOVE_COUPON: 'cart.coupon.remove',

  ORDER_CHECKOUT: 'orders.checkout',
  ORDER_LIST_MINE: 'orders.mine',
  ORDER_GET: 'orders.get',
  ORDER_CANCEL: 'orders.cancel',
  ORDER_LIST_SELLER: 'orders.seller.list',
  ORDER_LIST_ADMIN: 'orders.admin.list',
  ORDER_UPDATE_STATUS: 'orders.status.update',

  COUPON_CREATE: 'coupons.create',
  COUPON_LIST: 'coupons.list',
  COUPON_UPDATE: 'coupons.update',

  // ---- payment-service ----
  PAYMENT_CREATE: 'payments.create',
  PAYMENT_CONFIRM: 'payments.confirm',
  PAYMENT_GET: 'payments.get',
  PAYMENT_LIST_MINE: 'payments.mine',
  REFUND_CREATE: 'refunds.create',
  REFUND_LIST: 'refunds.list',
  TRANSACTION_LIST: 'transactions.list',

  // ---- events (fire & forget) ----
  EVT_PAYMENT_SUCCEEDED: 'payment.succeeded',
  EVT_PAYMENT_FAILED: 'payment.failed',
} as const;
