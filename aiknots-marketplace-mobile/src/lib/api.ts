import type {
  Address,
  AppNotification,
  CartItem,
  Category,
  ChatMessage,
  CouponResult,
  HomeData,
  Order,
  OrderStatus,
  Paged,
  PaymentMethod,
  Product,
  ProductQuery,
  Review,
  User,
} from "../types";
import { discountPct } from "./format";
import {
  MOCK_CATEGORIES,
  MOCK_COUPONS,
  MOCK_NOTIFICATIONS,
  MOCK_PRODUCTS,
  MOCK_REVIEWS,
  mockStore,
  sleep,
} from "./mock";
import { secureGet, secureRemove, secureSet } from "./storage";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
/** API URL set nahi hai (ya USE_MOCK=1) to demo data se app chalti hai. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "1" || API_BASE_URL === "";

export const KEYS = {
  access: "aik_access_token",
  refresh: "aik_refresh_token",
  user: "aik_user",
  cart: "aik_cart",
  wishlist: "aik_wishlist",
  recent: "aik_recent_searches",
};

/** Routes exposed by the NestJS gateway. */
export const ENDPOINTS = {
  signup: "/auth/signup",
  signin: "/auth/signin",
  refresh: "/auth/refresh",
  profile: "/users/me",
  categories: "/categories",
  products: "/products",
  product: (id: string) => `/products/${id}`,
  reviews: (id: string) => `/products/${id}/reviews`,
  cart: "/cart",
  cartAdd: "/cart/items",
  cartItem: (id: string) => `/cart/items/${id}`,
  wishlist: "/wishlist",
  wishlistToggle: (id: string) => `/wishlist/${id}`,
  orders: "/orders",
  orderCreate: "/orders/checkout",
  order: (id: string) => `/orders/${id}`,
  orderCancel: (id: string) => `/orders/${id}/cancel`,
  addresses: "/users/addresses",
  coupon: "/cart/coupon",
};

/* ------------------------------------------------------------------ */
/* HTTP core                                                           */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let onLogout: (() => void) | null = null;
export const setLogoutHandler = (fn: () => void): void => {
  onLogout = fn;
};

interface ReqOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
  retried?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = await secureGet(KEYS.refresh);
      if (!refreshToken) return false;
      const res = await fetch(API_BASE_URL + ENDPOINTS.refresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      const access = json?.data?.accessToken ?? json?.accessToken ?? json?.jwt;
      if (!access) return false;
      await secureSet(KEYS.access, String(access));
      const nextRefresh = json?.data?.refreshToken ?? json?.refreshToken;
      if (nextRefresh) await secureSet(KEYS.refresh, String(nextRefresh));
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;
  const qs = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await secureGet(KEYS.access);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path + qs, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new ApiError(
      aborted ? "Request timed out. Check your connection." : "Network error. Check your connection.",
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && auth && !opts.retried) {
    if (await refreshTokens()) return request<T>(path, { ...opts, retried: true });
    await clearSession();
    onLogout?.();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string; error?: string } | null)?.message ??
      (json as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  const wrapped = json as { data?: T } | null;
  return (wrapped && typeof wrapped === "object" && "data" in wrapped && wrapped.data !== undefined
    ? wrapped.data
    : json) as T;
}

export async function clearSession(): Promise<void> {
  await Promise.all([secureRemove(KEYS.access), secureRemove(KEYS.refresh), secureRemove(KEYS.user)]);
}

/* ------------------------------------------------------------------ */
/* Normalizers (backend field names tolerant)                          */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;
const str = (v: unknown, d = ""): string => (v == null ? d : String(v));
const num = (v: unknown, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const idOf = (r: Raw): string => str(r._id ?? r.id);
const toStr = (v: unknown): string => str(v);
const toRole = (role: unknown): User["role"] => {
  switch (str(role).toUpperCase()) {
    case "ADMIN":
    case "ROLE_ADMIN":
      return "ROLE_ADMIN";
    case "SELLER":
    case "ROLE_SELLER":
      return "ROLE_SELLER";
    default:
      return "ROLE_CUSTOMER";
  }
};

const unavailable = (feature: string): ApiError =>
  new ApiError(`${feature} is not supported by the configured backend yet.`, 501);

export function toProduct(r: Raw): Product {
  const variants = Array.isArray(r.variants)
    ? r.variants.map((v: Raw) => ({
        id: idOf(v),
        attributes: Object.fromEntries(
          Object.entries(v.attributes ?? {}).map(([key, value]) => [key, str(value)])
        ),
        price: num(v.price),
        mrpPrice: num(v.mrpPrice),
        quantity: num(v.quantity),
      }))
    : undefined;
  const images: string[] = Array.isArray(r.images)
    ? r.images.map((i: unknown) => str(typeof i === "object" && i ? (i as Raw).url : i))
    : r.image
      ? [str(r.image)]
      : [];
  const mrp = num(r.mrpPrice ?? r.mrp ?? r.price);
  const price = num(r.sellingPrice ?? r.price ?? mrp);
  const sizes: string[] = Array.isArray(r.sizes)
    ? r.sizes.map(toStr)
    : typeof r.sizes === "string" && r.sizes
      ? r.sizes.split(",").map((s: string) => s.trim())
      : [...new Set(variants?.map((v) => v.attributes.size).filter(Boolean) ?? [])];
  const colors: string[] = Array.isArray(r.colors)
    ? r.colors.map(toStr)
    : r.color
      ? [str(r.color)]
      : [...new Set(variants?.map((v) => v.attributes.color).filter(Boolean) ?? [])];
  return {
    id: idOf(r),
    title: str(r.title ?? r.name, "Untitled"),
    description: str(r.description),
    brand: r.brand ? str(typeof r.brand === "object" ? r.brand.name : r.brand) : undefined,
    categoryId: r.category ? str(typeof r.category === "object" ? idOf(r.category) : r.category) : r.categoryId,
    categoryName: typeof r.category === "object" ? str(r.category?.name) : undefined,
    images,
    mrp,
    price,
    discountPercent: num(r.discountPercent, discountPct(mrp, price)),
    rating: num(typeof r.rating === "object" ? r.rating?.average : r.rating ?? r.averageRating),
    reviewCount: num(typeof r.rating === "object" ? r.rating?.count : r.numRatings ?? r.reviewCount),
    stock: num(r.quantity ?? r.stock, 99),
    sizes,
    colors,
    highlights: Array.isArray(r.highlights) ? r.highlights.map(toStr) : [],
    sellerName: r.seller?.businessDetails?.businessName ?? r.seller?.name ?? r.sellerName,
    variants,
  };
}

export function toCartItem(r: Raw): CartItem {
  const product = r.product ?? {
    id: r.productId,
    title: r.title,
    image: r.image,
    mrpPrice: r.unitMrpPrice,
    sellingPrice: r.unitSellingPrice,
  };
  return {
    id: idOf(r),
    product: toProduct(product),
    quantity: num(r.quantity, 1),
    size: r.size ? str(r.size) : undefined,
    color: r.color ? str(r.color) : undefined,
    variantId: r.variantId ? str(r.variantId) : undefined,
  };
}

export function toAddress(r: Raw): Address {
  return {
    id: idOf(r),
    name: str(r.name ?? r.fullName),
    mobile: str(r.mobile ?? r.phone),
    pincode: str(r.pinCode ?? r.pincode),
    line1: str(r.streetAddress ?? r.address ?? r.line1),
    line2: r.locality ?? r.line2 ? str(r.locality ?? r.line2) : undefined,
    city: str(r.city),
    state: str(r.state),
    isDefault: Boolean(r.isDefault),
  };
}

export function toOrder(r: Raw): Order {
  const items: CartItem[] = (r.orderItems ?? r.items ?? []).map((i: Raw) => toCartItem(i));
  const total = num(r.totalPayable ?? r.totalSellingPrice ?? r.total);
  const discount = num(r.couponPrice ?? r.discount);
  return {
    id: idOf(r),
    orderNumber: str(r.orderId ?? r.orderNumber ?? idOf(r).slice(-8).toUpperCase()),
    items,
    address: toAddress(r.shippingAddress ?? r.address ?? {}),
    subtotal: num(r.totalSellingPrice ?? r.subtotal, total + discount),
    discount,
    shipping: num(r.shipping),
    total,
    status: str(r.orderStatus ?? r.status, "PLACED") as OrderStatus,
    paymentMethod: (str(r.paymentMethod, "COD").toUpperCase() === "COD" ? "COD" : "ONLINE") as PaymentMethod,
    createdAt: str(r.orderDate ?? r.createdAt, new Date().toISOString()),
  };
}

const list = (data: unknown): Raw[] => {
  if (Array.isArray(data)) return data as Raw[];
  const d = data as Raw | null;
  const inner = d?.content ?? d?.items ?? d?.products ?? d?.docs ?? d?.results;
  return Array.isArray(inner) ? (inner as Raw[]) : [];
};

/* ------------------------------------------------------------------ */
/* Mock helpers                                                        */
/* ------------------------------------------------------------------ */

function mockFilter(q: ProductQuery): Product[] {
  let out = [...MOCK_PRODUCTS];
  if (q.categoryId) out = out.filter((p) => p.categoryId === q.categoryId);
  if (q.q) {
    const term = q.q.toLowerCase();
    out = out.filter((p) => `${p.title} ${p.brand} ${p.categoryName}`.toLowerCase().includes(term));
  }
  if (q.minPrice !== undefined) out = out.filter((p) => p.price >= q.minPrice!);
  if (q.maxPrice !== undefined) out = out.filter((p) => p.price <= q.maxPrice!);
  switch (q.sort) {
    case "price_asc": out.sort((a, b) => a.price - b.price); break;
    case "price_desc": out.sort((a, b) => b.price - a.price); break;
    case "rating": out.sort((a, b) => b.rating - a.rating); break;
    case "new": out.reverse(); break;
  }
  return out;
}

const mockUser = (email: string, fullName?: string): User => ({
  _id: "u1",
  fullName: fullName ?? (email.split("@")[0] || "Demo User"),
  email,
  mobile: "9876543210",
  role: "ROLE_CUSTOMER",
});

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

async function finishAuth(data: Raw, email: string): Promise<AuthResult> {
  const accessToken = str(data.jwt ?? data.accessToken ?? data.token);
  const refreshToken = data.refreshToken ? str(data.refreshToken) : undefined;
  let user: User | null = data.user
    ? {
        ...(data.user as User),
        _id: idOf(data.user as Raw),
        role: toRole((data.user as Raw).role),
      }
    : null;
  await secureSet(KEYS.access, accessToken);
  if (refreshToken) await secureSet(KEYS.refresh, refreshToken);
  if (!user) {
    const p = await request<Raw>(ENDPOINTS.profile);
    user = {
      _id: idOf(p),
      fullName: str(p.fullName ?? p.name),
      email: str(p.email, email),
      mobile: p.mobile ? str(p.mobile) : undefined,
      role: toRole(p.role),
    };
  }
  return { user, accessToken, refreshToken };
}

export const api = {
  auth: {
    async sendOtp(email: string): Promise<void> {
      if (USE_MOCK) return sleep();
      void email;
      throw unavailable("Email verification");
    },
    async signUp(p: { fullName: string; email: string; password: string; otp?: string }): Promise<AuthResult> {
      if (USE_MOCK) {
        await sleep();
        if ((p.otp?.length ?? 0) < 4) throw new ApiError("Enter the 6-digit code we sent you.", 400);
        return { user: mockUser(p.email, p.fullName), accessToken: "mock" };
      }
      const { fullName, email, password } = p;
      const data = await request<Raw>(ENDPOINTS.signup, {
        method: "POST",
        auth: false,
        body: { fullName, email, password },
      });
      return finishAuth(data, p.email);
    },
    async signIn(email: string, password: string): Promise<AuthResult> {
      if (USE_MOCK) {
        await sleep();
        if (password.length < 4) throw new ApiError("Wrong email or password.", 401);
        return { user: mockUser(email), accessToken: "mock" };
      }
      const data = await request<Raw>(ENDPOINTS.signin, { method: "POST", auth: false, body: { email, password } });
      return finishAuth(data, email);
    },
    async forgotPassword(email: string): Promise<void> {
      if (USE_MOCK) return sleep();
      void email;
      throw unavailable("Password reset");
    },
    async me(): Promise<User | null> {
      if (USE_MOCK) return null;
      const p = await request<Raw>(ENDPOINTS.profile);
      return {
        _id: idOf(p),
        fullName: str(p.fullName ?? p.name),
        email: str(p.email),
        mobile: p.mobile ? str(p.mobile) : undefined,
        role: toRole(p.role),
      };
    },
  },

  catalog: {
    async categories(): Promise<Category[]> {
      if (USE_MOCK) { await sleep(250); return MOCK_CATEGORIES; }
      const data = await request<unknown>(ENDPOINTS.categories, { auth: false });
      const flatten = (categories: Raw[]): Raw[] =>
        categories.flatMap((category) => [category, ...flatten(list(category.children))]);
      return flatten(list(data)).map((c) => ({
        id: idOf(c),
        name: str(c.name),
        slug: c.categoryId ? str(c.categoryId) : undefined,
        image: c.image ? str(c.image) : undefined,
        icon: "pricetag-outline",
      }));
    },

    async products(q: ProductQuery = {}): Promise<Paged<Product>> {
      const page = q.page ?? 0;
      const limit = q.limit ?? 12;
      if (USE_MOCK) {
        await sleep(350);
        const all = mockFilter(q);
        const items = all.slice(page * limit, page * limit + limit);
        return { items, page, hasMore: (page + 1) * limit < all.length };
      }
      const data = await request<unknown>(ENDPOINTS.products, {
        auth: false,
        query: {
          q: q.q,
          categoryId: q.categoryId,
          sort:
            q.sort === "new"
              ? "newest"
              : q.sort === "price_asc" || q.sort === "price_desc"
                ? q.sort
                : undefined,
          minPrice: q.minPrice,
          maxPrice: q.maxPrice,
          page: page + 1,
          limit,
        },
      });
      const items = list(data).map(toProduct);
      const totalPages = num((data as Raw | null)?.totalPages, 0);
      return { items, page, hasMore: totalPages ? page + 1 < totalPages : items.length >= limit };
    },

    async product(id: string): Promise<Product> {
      if (USE_MOCK) {
        await sleep(300);
        const p = MOCK_PRODUCTS.find((x) => x.id === id);
        if (!p) throw new ApiError("Product not found", 404);
        return p;
      }
      return toProduct(await request<Raw>(ENDPOINTS.product(id), { auth: false }));
    },

    async home(): Promise<HomeData> {
      const [categories, deals, trending] = await Promise.all([
        api.catalog.categories(),
        api.catalog.products({ sort: "price_asc", limit: 8 }),
        api.catalog.products({ sort: "rating", limit: 12 }),
      ]);
      return {
        categories,
        deals: deals.items.filter((p) => p.discountPercent >= 30).slice(0, 8),
        trending: trending.items,
      };
    },

    async reviews(productId: string): Promise<Review[]> {
      if (USE_MOCK) { await sleep(250); return MOCK_REVIEWS; }
      const data = await request<unknown>(ENDPOINTS.reviews(productId), { auth: false });
      return list(data).map((r) => ({
        id: idOf(r),
        userName: str(r.user?.fullName ?? r.userName, "Customer"),
        rating: num(r.rating),
        comment: str(r.reviewText ?? r.comment),
        createdAt: str(r.createdAt, new Date().toISOString()),
      }));
    },
  },

  /** Real-mode only; mock mode me CartContext local rehta hai. */
  cart: {
    async fetch(): Promise<CartItem[]> {
      const data = await request<Raw>(ENDPOINTS.cart);
      return list(data.cartItems ?? data.items ?? data).map(toCartItem);
    },
    async add(p: {
      productId: string;
      quantity: number;
      variantId?: string;
      size?: string;
      color?: string;
    }): Promise<void> {
      await request(ENDPOINTS.cartAdd, {
        method: "POST",
        body: { productId: p.productId, quantity: p.quantity, variantId: p.variantId },
      });
    },
    async update(itemId: string, quantity: number): Promise<void> {
      await request(ENDPOINTS.cartItem(itemId), { method: "PATCH", body: { quantity } });
    },
    async remove(itemId: string): Promise<void> {
      await request(ENDPOINTS.cartItem(itemId), { method: "DELETE" });
    },
    async clear(): Promise<void> {
      await request(ENDPOINTS.cart, { method: "DELETE" });
    },
  },

  wishlist: {
    async fetch(): Promise<Product[]> {
      const data = await request<Raw>(ENDPOINTS.wishlist);
      return list(data.products ?? data).map(toProduct);
    },
    async toggle(productId: string): Promise<void> {
      await request(ENDPOINTS.wishlistToggle(productId), { method: "POST" });
    },
  },

  addresses: {
    async list(): Promise<Address[]> {
      if (USE_MOCK) { await sleep(250); return [...mockStore.addresses]; }
      return list(await request<unknown>(ENDPOINTS.addresses)).map(toAddress);
    },
    async create(a: Omit<Address, "id">): Promise<Address> {
      if (USE_MOCK) {
        await sleep();
        const next: Address = { ...a, id: `a${Date.now()}` };
        if (next.isDefault) mockStore.addresses.forEach((x) => (x.isDefault = false));
        mockStore.addresses.unshift(next);
        return next;
      }
      const res = await request<Raw>(ENDPOINTS.addresses, {
        method: "POST",
        body: {
          name: a.name,
          mobile: a.mobile,
          pinCode: a.pincode,
          streetAddress: a.line1,
          locality: a.line2 || a.city,
          city: a.city,
          state: a.state,
          isDefault: a.isDefault,
        },
      });
      return toAddress(res);
    },
    async remove(id: string): Promise<void> {
      if (USE_MOCK) { mockStore.addresses = mockStore.addresses.filter((a) => a.id !== id); return; }
      await request(`${ENDPOINTS.addresses}/${id}`, { method: "DELETE" });
    },
  },

  coupons: {
    async apply(code: string, subtotal: number): Promise<CouponResult> {
      const c = code.trim().toUpperCase();
      if (USE_MOCK) {
        await sleep(350);
        const rule = MOCK_COUPONS[c];
        if (!rule) throw new ApiError("This coupon code isn't valid.", 400);
        if (subtotal < rule.min) throw new ApiError(`Add items worth ₹${rule.min} to use ${c}.`, 400);
        const discount = rule.type === "pct" ? Math.round((subtotal * rule.value) / 100) : rule.value;
        return { code: c, discount, message: `${c} applied` };
      }
      const r = await request<Raw>(ENDPOINTS.coupon, { method: "POST", body: { code: c } });
      return {
        code: str(r.couponCode, c),
        discount: num(r.couponPrice),
        message: r.message ? str(r.message) : `${c} applied`,
      };
    },
    async remove(): Promise<void> {
      if (!USE_MOCK) await request(ENDPOINTS.coupon, { method: "DELETE" });
    },
  },

  orders: {
    async list(): Promise<Order[]> {
      if (USE_MOCK) { await sleep(300); return [...mockStore.orders]; }
      return list(await request<unknown>(ENDPOINTS.orders)).map(toOrder);
    },
    async get(id: string): Promise<Order> {
      if (USE_MOCK) {
        await sleep(250);
        const o = mockStore.orders.find((x) => x.id === id);
        if (!o) throw new ApiError("Order not found", 404);
        return o;
      }
      return toOrder(await request<Raw>(ENDPOINTS.order(id)));
    },
    async create(p: {
      address: Address;
      paymentMethod: PaymentMethod;
      couponCode?: string;
      items: CartItem[];
      subtotal: number;
      discount: number;
      shipping: number;
    }): Promise<Order> {
      const total = p.subtotal - p.discount + p.shipping;
      if (USE_MOCK) {
        await sleep(700);
        const order: Order = {
          id: `o${Date.now()}`,
          orderNumber: `AIK${Math.floor(100000 + Math.random() * 900000)}`,
          items: p.items,
          address: p.address,
          subtotal: p.subtotal,
          discount: p.discount,
          shipping: p.shipping,
          total,
          status: "PLACED",
          paymentMethod: p.paymentMethod,
          createdAt: new Date().toISOString(),
        };
        mockStore.orders.unshift(order);
        return order;
      }
      if (p.paymentMethod === "ONLINE") throw unavailable("Online payments");
      const res = await request<Raw>(ENDPOINTS.orderCreate, {
        method: "POST",
        body: { addressId: p.address.id, paymentMethod: p.paymentMethod },
      });
      const first = Array.isArray(res.orders) ? (res.orders[0] as Raw) : res;
      if (!first) throw new ApiError("The backend did not return the created order.", 502);
      return toOrder(first);
    },
    async cancel(id: string): Promise<void> {
      if (USE_MOCK) {
        await sleep(350);
        const o = mockStore.orders.find((x) => x.id === id);
        if (o) o.status = "CANCELLED";
        return;
      }
      await request(ENDPOINTS.orderCancel(id), { method: "POST" });
    },
  },

  payments: {
    /** Online payment: backend gateway link return kare to browser me khulta hai. */
    async start(orderId: string, amount: number): Promise<{ paymentUrl?: string }> {
      if (USE_MOCK) { await sleep(400); return {}; }
      void orderId;
      void amount;
      throw unavailable("Online payments");
    },
  },

  notifications: {
    async list(): Promise<AppNotification[]> {
      if (USE_MOCK) { await sleep(250); return MOCK_NOTIFICATIONS; }
      throw unavailable("Notifications");
    },
  },

  ai: {
    async chat(message: string, history: ChatMessage[]): Promise<string> {
      if (USE_MOCK) {
        await sleep(900);
        const m = message.toLowerCase();
        if (m.includes("order")) return "You can track every order from Profile → My orders. Want help with a return?";
        if (m.includes("coupon") || m.includes("offer")) return "Try WELCOME10 for 10% off orders above ₹499, or FLAT200 on orders above ₹1,500.";
        return "I can help you find products, track orders and apply coupons. What are you looking for?";
      }
      void message;
      void history;
      throw unavailable("AI chat");
    },
  },
};
