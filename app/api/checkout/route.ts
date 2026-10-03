import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isValidPincode, normalizePincode } from "@/lib/commerce";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subtotal?: number;
      pincode?: string;
    };
    const subtotal = Number(body.subtotal);
    const pincode = normalizePincode(String(body.pincode || ""));
    if (!Number.isFinite(subtotal) || subtotal < 0 || !isValidPincode(pincode))
      return NextResponse.json(
        { error: "Enter a valid 6-digit pincode." },
        { status: 400 },
      );
    const area = await getAdminDb()
      .collection("serviceAreas")
      .doc(pincode)
      .get();
    const deliveryCharge = Number(area.data()?.deliveryCharge);
    if (
      !area.exists ||
      area.data()?.enabled === false ||
      !Number.isFinite(deliveryCharge) ||
      deliveryCharge < 0
    )
      return NextResponse.json(
        { error: "Delivery is currently unavailable at this pincode." },
        { status: 400 },
      );
    return NextResponse.json({
      subtotal,
      pincode,
      delivery: deliveryCharge,
      total: subtotal + deliveryCharge,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
