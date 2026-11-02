export const formatINR = (n: number): string =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const discountPct = (mrp: number, price: number): number =>
  mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const initials = (name?: string): string =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "U";

export const isEmail = (v: string): boolean => /^\S+@\S+\.\S+$/.test(v.trim());
