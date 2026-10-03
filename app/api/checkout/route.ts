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
    const configuredDeliveryCharge = Number(area.data()?.deliveryCharge);
    const freeDeliveryAbove = Number(area.data()?.freeDeliveryAbove);
    if (
      !area.exists ||
      area.data()?.enabled === false ||
      !Number.isFinite(configuredDeliveryCharge) ||
      configuredDeliveryCharge < 0
    )
      return NextResponse.json(
        { error: "Delivery is currently unavailable at this pincode." },
        { status: 400 },
      );
    const deliveryCharge =
      Number.isFinite(freeDeliveryAbove) &&
      freeDeliveryAbove > 0 &&
      subtotal >= freeDeliveryAbove
        ? 0
        : configuredDeliveryCharge;
    const configuredTaxRate = Number(
      (await getAdminDb().collection("settings").doc("tax").get()).data()?.rate,
    );
    const taxRate =
      Number.isFinite(configuredTaxRate) &&
      configuredTaxRate >= 0 &&
      configuredTaxRate <= 100
        ? configuredTaxRate
        : 0;
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    return NextResponse.json({
      subtotal,
      pincode,
      delivery: deliveryCharge,
      taxRate,
      taxAmount,
      total: subtotal + deliveryCharge + taxAmount,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
