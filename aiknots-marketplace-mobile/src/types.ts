export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export type Role = "ROLE_CUSTOMER" | "ROLE_SELLER" | "ROLE_ADMIN";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: Role;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  icon?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  brand?: string;
  categoryId?: string;
  categoryName?: string;
  images: string[];
  mrp: number;
  price: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  stock: number;
  sizes: string[];
  colors: string[];
  highlights: string[];
  sellerName?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  attributes: Record<string, string>;
  price: number;
  mrpPrice: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  variantId?: string;
}

export interface Address {
  id: string;
  name: string;
  mobile: string;
  pincode: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "PLACED"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

export type PaymentMethod = "COD" | "ONLINE";

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  address: Address;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  colors: [string, string];
  categoryId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export type SortKey = "relevance" | "price_asc" | "price_desc" | "rating" | "new" | "discount";

export interface ProductQuery {
  q?: string;
  categoryId?: string;
  sort?: SortKey;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}

export interface HomeData {
  categories: Category[];
  deals: Product[];
  trending: Product[];
}

export interface CouponResult {
  code: string;
  discount: number;
  message?: string;
}

// ---- navigation ----
export type RootStackParams = {
  Tabs: undefined;
  Products: { q?: string; categoryId?: string; title?: string; focus?: boolean } | undefined;
  ProductDetail: { id: string };
  Checkout: undefined;
  Addresses: undefined;
  Orders: undefined;
  OrderDetail: { id: string };
  OrderSuccess: { orderNumber: string };
  Notifications: undefined;
  AIChat: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type TabParams = {
  Home: undefined;
  Products: undefined;
  Categories: undefined;
  Cart: undefined;
  Wishlist: undefined;
  Profile: undefined;
};
