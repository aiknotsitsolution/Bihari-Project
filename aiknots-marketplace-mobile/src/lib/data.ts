import type { Banner, OrderStatus, SortKey } from "../types";
import { colors } from "../theme";

// Web frontend ke `data/` folder ka static content (banners, sort options, order steps)
export const BANNERS: Banner[] = [
  {
    id: "b1",
    title: "Festive Fashion Sale",
    subtitle: "Up to 60% off on ethnic & western wear",
    image: "https://picsum.photos/seed/aik-banner1/900/500",
    colors: [colors.primary, colors.pine],
    categoryId: "fashion",
  },
  {
    id: "b2",
    title: "Smart Gadgets",
    subtitle: "Earbuds, watches & more from ₹999",
    image: "https://picsum.photos/seed/aik-banner2/900/500",
    colors: ["#2B5BA8", "#0F2F2A"],
    categoryId: "electronics",
  },
  {
    id: "b3",
    title: "Home Makeover",
    subtitle: "Decor and kitchen essentials, free delivery",
    image: "https://picsum.photos/seed/aik-banner3/900/500",
    colors: [colors.saffron, "#8A4B00"],
    categoryId: "home",
  },
];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Recommended" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "new", label: "Newest" },
  { key: "discount", label: "Biggest discount" },
];

export const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Any price" },
  { label: "Under ₹500", max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹5,000", min: 1000, max: 5000 },
  { label: "Above ₹5,000", min: 5000 },
];

export const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "Order placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: colors.saffron,
  PLACED: colors.info,
  CONFIRMED: colors.info,
  SHIPPED: colors.primary,
  DELIVERED: colors.success,
  CANCELLED: colors.alert,
  PAYMENT_FAILED: colors.alert,
};

export const INDIAN_STATES = [
  "Madhya Pradesh", "Maharashtra", "Delhi", "Karnataka", "Gujarat", "Rajasthan",
  "Uttar Pradesh", "Tamil Nadu", "West Bengal", "Telangana",
];
