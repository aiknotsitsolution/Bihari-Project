import type {
  Address,
  AppNotification,
  Category,
  Order,
  Product,
  Review,
} from "../types";
import { discountPct } from "./format";

export const MOCK_CATEGORIES: Category[] = [
  { id: "fashion", name: "Fashion", icon: "shirt-outline" },
  { id: "electronics", name: "Electronics", icon: "headset-outline" },
  { id: "home", name: "Home & Kitchen", icon: "home-outline" },
  { id: "beauty", name: "Beauty", icon: "sparkles-outline" },
  { id: "sports", name: "Sports", icon: "basketball-outline" },
  { id: "books", name: "Books", icon: "book-outline" },
  { id: "toys", name: "Toys", icon: "game-controller-outline" },
  { id: "grocery", name: "Grocery", icon: "basket-outline" },
];

const SIZES = ["S", "M", "L", "XL"];
const COLORS = ["Black", "Teal", "Navy", "Maroon"];

type Seed = [string, string, string, number, number, boolean];
const SEEDS: Seed[] = [
  ["Cotton Kurta Set", "fashion", "Anouk", 1499, 2999, true],
  ["Slim Fit Denim Jacket", "fashion", "Roadster", 1799, 3499, true],
  ["Printed Maxi Dress", "fashion", "Libas", 1199, 2499, true],
  ["Running Shoes Pro", "fashion", "Stride", 2299, 4599, true],
  ["Wireless Earbuds X2", "electronics", "Boatly", 1299, 3990, false],
  ["Smart Watch Active", "electronics", "Noisy", 2499, 6999, false],
  ["Bluetooth Speaker Mini", "electronics", "JBL-ish", 1899, 3299, false],
  ["20000mAh Power Bank", "electronics", "Mi-ish", 1599, 2299, false],
  ["Non-stick Cookware Set", "home", "Prestige", 2199, 4200, false],
  ["Cotton Bedsheet King", "home", "Spaces", 899, 1999, false],
  ["LED Table Lamp", "home", "Philips-ish", 649, 1199, false],
  ["Ceramic Dinner Set 18pc", "home", "Cello", 1999, 3999, false],
  ["Vitamin C Face Serum", "beauty", "Minimal", 549, 799, false],
  ["Matte Lipstick Combo", "beauty", "Lakme-ish", 699, 1299, false],
  ["Hair Dryer 1800W", "beauty", "Havells", 1199, 2195, false],
  ["Yoga Mat 6mm", "sports", "Decathlon-ish", 599, 1299, false],
  ["Adjustable Dumbbell Set", "sports", "Kore", 2799, 4999, false],
  ["Cricket Bat English Willow", "sports", "SG-ish", 3499, 6200, false],
  ["Atomic Habits (Paperback)", "books", "Penguin", 399, 599, false],
  ["The Psychology of Money", "books", "Jaico", 299, 399, false],
  ["Building Blocks 500pc", "toys", "Funskool", 799, 1499, false],
  ["Remote Control Car", "toys", "Hot Wheels-ish", 999, 1799, false],
  ["Basmati Rice 5kg", "grocery", "India Gate", 699, 799, false],
  ["Cold Pressed Olive Oil 1L", "grocery", "Figaro", 749, 999, false],
];

export const MOCK_PRODUCTS: Product[] = SEEDS.map(
  ([title, categoryId, brand, price, mrp, apparel], i) => ({
    id: `p${i + 1}`,
    title,
    description:
      `${title} by ${brand}. Quality checked, fast delivery and 7-day easy returns. ` +
      "Designed for everyday use with durable materials and a clean finish.",
    brand,
    categoryId,
    categoryName: MOCK_CATEGORIES.find((c) => c.id === categoryId)?.name,
    images: [1, 2, 3].map((n) => `https://picsum.photos/seed/aik-${i + 1}-${n}/700/700`),
    mrp,
    price,
    discountPercent: discountPct(mrp, price),
    rating: Math.round((3.6 + ((i * 37) % 14) / 10) * 10) / 10,
    reviewCount: 40 + ((i * 53) % 900),
    stock: i % 9 === 0 ? 3 : 25,
    sizes: apparel ? SIZES : [],
    colors: apparel || i % 3 === 0 ? COLORS.slice(0, 3) : [],
    highlights: [
      "100% genuine product",
      "Free delivery above ₹499",
      "7-day replacement policy",
    ],
    sellerName: `${brand} Official Store`,
  })
);

export const MOCK_REVIEWS: Review[] = [
  { id: "r1", userName: "Aarav S.", rating: 5, comment: "Quality is great for the price. Delivery was quick.", createdAt: "2026-09-12T10:00:00Z" },
  { id: "r2", userName: "Priya M.", rating: 4, comment: "Looks exactly like the photos. Packaging could be better.", createdAt: "2026-09-28T10:00:00Z" },
  { id: "r3", userName: "Rohit K.", rating: 4, comment: "Good value. Would buy again.", createdAt: "2026-10-05T10:00:00Z" },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "Order shipped", body: "Your order is on the way and arrives in 2 days.", createdAt: new Date(Date.now() - 3600_000).toISOString(), read: false },
  { id: "n2", title: "New coupon for you", body: "Use WELCOME10 to get 10% off on your next order.", createdAt: new Date(Date.now() - 86_400_000).toISOString(), read: false },
  { id: "n3", title: "Price drop", body: "An item in your wishlist is now cheaper.", createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), read: true },
];

export const MOCK_COUPONS: Record<string, { type: "pct" | "flat"; value: number; min: number }> = {
  WELCOME10: { type: "pct", value: 10, min: 499 },
  FLAT200: { type: "flat", value: 200, min: 1500 },
};

// in-memory stores (mock mode)
export const mockStore = {
  addresses: [
    {
      id: "a1",
      name: "Demo User",
      mobile: "9876543210",
      pincode: "452001",
      line1: "12, Vijay Nagar",
      city: "Indore",
      state: "Madhya Pradesh",
      isDefault: true,
    },
  ] as Address[],
  orders: [] as Order[],
};

export const sleep = (ms = 450): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
