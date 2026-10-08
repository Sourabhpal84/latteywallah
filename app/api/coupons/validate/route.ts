import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";
import { calculateCouponDiscount, CouponRecord } from "@/lib/coupons";

export const runtime = "nodejs";

// Kept as a server-side validation endpoint for non-checkout clients.
export async function POST(request: Request) {
  try {
    await requireUser(request);
    const body = await request.json() as { code?: unknown; subtotal?: unknown };
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const subtotal = Number(body.subtotal);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !Number.isFinite(subtotal) || subtotal <= 0)
      return NextResponse.json({ error: "Enter a valid coupon code and order subtotal." }, { status: 400 });
    const snapshot = await getAdminDb().collection("coupons").doc(code).get();
    if (!snapshot.exists)
      return NextResponse.json({ error: "Coupon code not found." }, { status: 404 });
    const coupon = snapshot.data() as CouponRecord;
    const discount = calculateCouponDiscount(coupon, subtotal);
    return NextResponse.json({
      code,
      discount,
      message: coupon.type === "percent"
        ? `${Number(coupon.value)}% off applied.`
        : `₹${discount.toLocaleString("en-IN")} off applied.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not validate coupon." }, { status: 400 });
  }
}
