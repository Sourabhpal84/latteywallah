import { getAdminDb } from "@/lib/firebase-admin";

type Checkout = {
  orderId?: string;
  amountPaise?: number;
  status?: string;
  customerId?: string;
  displayOrderId?: string;
};

export async function getRazorpayPayment(paymentId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret)
    throw new Error("Razorpay is not configured on the server");
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      },
      cache: "no-store",
    },
  );
  const payment = (await response.json()) as {
    id?: string;
    order_id?: string;
    status?: string;
    amount?: number;
  };
  if (!response.ok) throw new Error("Unable to verify payment with Razorpay");
  return payment;
}

export async function confirmRazorpayPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
) {
  const adminDb = getAdminDb();
  const checkoutRef = adminDb
    .collection("checkoutRequests")
    .doc(razorpayOrderId);
  return adminDb.runTransaction(async (transaction) => {
    const checkoutSnapshot = await transaction.get(checkoutRef);
    if (!checkoutSnapshot.exists) throw new Error("Payment order not found");
    const checkout = checkoutSnapshot.data() as Checkout;
    if (!checkout.orderId) throw new Error("Payment order is incomplete");
    const orderRef = adminDb.collection("orders").doc(checkout.orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new Error("Order record not found");
    const order = orderSnapshot.data() as {
      paymentStatus?: string;
      statusHistory?: unknown[];
      displayOrderId?: string;
      razorpayPaymentId?: string;
    };
    if (checkout.status === "PAID" && order.paymentStatus === "PAID")
      return { id: orderRef.id, displayOrderId: order.displayOrderId };
    if (
      order.razorpayPaymentId &&
      order.razorpayPaymentId !== razorpayPaymentId
    )
      throw new Error("A different payment is already attached to this order");
    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : [];
    const paymentHistory = history.some(
      (entry: unknown) =>
        (entry as { status?: string })?.status === "PAYMENT CONFIRMED",
    )
      ? history
      : [...history, { status: "PAYMENT CONFIRMED", timestamp: now }];
    const confirmedHistory = paymentHistory.some(
      (entry: unknown) =>
        (entry as { status?: string })?.status === "CONFIRMED",
    )
      ? paymentHistory
      : [...paymentHistory, { status: "CONFIRMED", timestamp: now }];
    transaction.update(orderRef, {
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      razorpayPaymentId,
      paymentVerifiedAt: now,
      updatedAt: now,
      statusHistory: confirmedHistory,
    });
    transaction.update(checkoutRef, {
      status: "PAID",
      razorpayPaymentId,
      paymentVerifiedAt: now,
      updatedAt: now,
    });
    return { id: orderRef.id, displayOrderId: order.displayOrderId };
  });
}

export async function markRazorpayPaymentFailed(
  razorpayOrderId: string,
  razorpayPaymentId?: string,
) {
  const adminDb = getAdminDb();
  const checkoutRef = adminDb
    .collection("checkoutRequests")
    .doc(razorpayOrderId);
  await adminDb.runTransaction(async (transaction) => {
    const checkoutSnapshot = await transaction.get(checkoutRef);
    if (!checkoutSnapshot.exists) return;
    const checkout = checkoutSnapshot.data() as Checkout;
    if (!checkout.orderId || checkout.status === "PAID") return;
    const orderRef = adminDb.collection("orders").doc(checkout.orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists || orderSnapshot.data()?.paymentStatus === "PAID")
      return;
    const now = new Date().toISOString();
    transaction.update(orderRef, { paymentStatus: "FAILED", updatedAt: now });
    transaction.update(checkoutRef, {
      status: "FAILED",
      razorpayPaymentId: razorpayPaymentId || null,
      updatedAt: now,
    });
  });
}
