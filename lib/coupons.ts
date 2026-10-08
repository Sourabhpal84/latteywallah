export type CouponRecord = {
  code?: string;
  active?: boolean;
  type?: "percent" | "fixed";
  value?: number;
  minOrder?: number;
  maxDiscount?: number;
  startsAt?: string;
  expiresAt?: string;
};

export function calculateCouponDiscount(
  coupon: CouponRecord,
  subtotal: number,
  now = Date.now(),
) {
  if (coupon.active !== true) throw new Error("This coupon is not active.");
  if (coupon.startsAt) {
    const startsAt = Date.parse(coupon.startsAt);
    if (!Number.isFinite(startsAt)) throw new Error("This coupon has an invalid start date.");
    if (startsAt > now) throw new Error("This coupon is not active yet.");
  }
  if (coupon.expiresAt) {
    const expiresAt = Date.parse(coupon.expiresAt);
    if (!Number.isFinite(expiresAt)) throw new Error("This coupon has an invalid expiry date.");
    if (expiresAt < now) throw new Error("This coupon has expired.");
  }
  if (subtotal < Number(coupon.minOrder || 0))
    throw new Error(`Minimum order for this coupon is ₹${Number(coupon.minOrder || 0).toLocaleString("en-IN")}.`);
  const value = Number(coupon.value);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error("This coupon is configured incorrectly.");
  if (coupon.type !== "percent" && coupon.type !== "fixed")
    throw new Error("This coupon is configured incorrectly.");
  if (coupon.type === "percent" && value > 100)
    throw new Error("This coupon is configured incorrectly.");
  const discount = coupon.type === "percent"
    ? Math.round(subtotal * Math.min(value, 100) / 100)
    : Math.round(value);
  const capped = coupon.type === "percent" && Number(coupon.maxDiscount) > 0
    ? Math.min(discount, Number(coupon.maxDiscount))
    : discount;
  return Math.min(subtotal, Math.max(0, capped));
}
