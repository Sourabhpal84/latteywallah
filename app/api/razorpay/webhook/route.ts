import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  confirmRazorpayPayment,
  getRazorpayPayment,
  markRazorpayPaymentFailed,
} from "@/lib/razorpay-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret)
      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 503 },
      );
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        order?: { entity?: { id?: string } };
      };
    };
    if (event.event === "payment.failed") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId)
        await markRazorpayPaymentFailed(
          orderId,
          event.payload?.payment?.entity?.id,
        );
      return NextResponse.json({ received: true });
    }
    if (!["payment.captured", "order.paid"].includes(event.event || ""))
      return NextResponse.json({ received: true });
    const paymentId = event.payload?.payment?.entity?.id;
    const razorpayOrderId =
      event.payload?.payment?.entity?.order_id ||
      event.payload?.order?.entity?.id;
    if (!paymentId || !razorpayOrderId)
      return NextResponse.json({ received: true });
    const payment = await getRazorpayPayment(paymentId);
    if (
      payment.order_id !== razorpayOrderId ||
      !["authorized", "captured"].includes(payment.status || "")
    )
      return NextResponse.json({ received: true });
    await confirmRazorpayPayment(razorpayOrderId, paymentId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
