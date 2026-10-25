import { getAdminDb } from "@/lib/firebase-admin";

type Checkout = {
  orderId?: string;
  amountPaise?: number;
  status?: string;
  customerId?: string;
  displayOrderId?: string;
  attemptId?: string;
  orderDraft?: Record<string, unknown>;
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

/**
 * A browser callback is helpful, but it is not a source of truth: customers can
 * close the page or lose their connection after paying.  This asks Razorpay for
 * the payment recorded against our Razorpay order so a signed-in customer can
 * safely recover a pending order later.
 */
export async function getPaidPaymentForRazorpayOrder(
  razorpayOrderId: string,
  expectedAmount?: number,
) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret)
    throw new Error("Razorpay is not configured on the server");
  const response = await fetch(
    `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      },
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as {
    items?: Array<{ id?: string; order_id?: string; status?: string; amount?: number }>;
  };
  if (!response.ok) throw new Error("Unable to check payment with Razorpay");
  return (payload.items || []).find(
    (payment) =>
      payment.id &&
      payment.order_id === razorpayOrderId &&
      payment.status === "captured" &&
      (expectedAmount === undefined || payment.amount === expectedAmount),
  );
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
    const attemptRef = checkout.attemptId
      ? adminDb.collection("checkoutAttempts").doc(checkout.attemptId)
      : undefined;
    const attemptSnapshot = attemptRef ? await transaction.get(attemptRef) : undefined;
    const counterRef = adminDb.collection("counters").doc("orders");
    const counterSnapshot = orderSnapshot.exists
      ? undefined
      : await transaction.get(counterRef);
    const order = (orderSnapshot.data() || {}) as {
      paymentStatus?: string;
      statusHistory?: unknown[];
      displayOrderId?: string;
      razorpayPaymentId?: string;
    };
    if (checkout.status === "PAID" && orderSnapshot.exists && order.paymentStatus === "PAID")
      return { id: orderRef.id, displayOrderId: order.displayOrderId };
    if (
      order.razorpayPaymentId &&
      order.razorpayPaymentId !== razorpayPaymentId
    )
      throw new Error("A different payment is already attached to this order");
    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const confirmedHistory = [
      ...history.filter((entry: unknown) =>
        !["PAYMENT CONFIRMED", "CONFIRMED"].includes(
          String((entry as { status?: string })?.status || ""),
        ),
      ),
      { status: "PAYMENT CONFIRMED", timestamp: now },
      { status: "CONFIRMED", timestamp: now },
    ];
    if (!orderSnapshot.exists) {
      if (!checkout.orderDraft) throw new Error("Order details are unavailable");
      const nextNumber = Number(counterSnapshot?.data()?.nextNumber || 10000) + 1;
      const displayOrderId = `LW-${nextNumber}`;
      transaction.set(counterRef, { nextNumber, updatedAt: now }, { merge: true });
      transaction.create(orderRef, {
        ...checkout.orderDraft,
        displayOrderId,
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        razorpayPaymentId,
        paymentVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
        statusHistory: confirmedHistory,
      });
      transaction.update(checkoutRef, {
        status: "PAID",
        displayOrderId,
        razorpayPaymentId,
        paymentVerifiedAt: now,
        updatedAt: now,
      });
      if (
        attemptRef &&
        attemptSnapshot?.exists &&
        attemptSnapshot.data()?.razorpayOrderId === razorpayOrderId
      )
        transaction.update(attemptRef, { status: "PAID", updatedAt: now });
      return { id: orderRef.id, displayOrderId };
    }
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
    if (
      attemptRef &&
      attemptSnapshot?.exists &&
      attemptSnapshot.data()?.razorpayOrderId === razorpayOrderId
    )
      transaction.update(attemptRef, { status: "PAID", updatedAt: now });
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
    if (checkout.status === "PAID") return;
    const orderRef = checkout.orderId
      ? adminDb.collection("orders").doc(checkout.orderId)
      : undefined;
    const orderSnapshot = orderRef ? await transaction.get(orderRef) : undefined;
    const attemptRef = checkout.attemptId
      ? adminDb.collection("checkoutAttempts").doc(checkout.attemptId)
      : undefined;
    const attemptSnapshot = attemptRef ? await transaction.get(attemptRef) : undefined;
    if (orderSnapshot?.data()?.paymentStatus === "PAID") return;
    const now = new Date().toISOString();
    if (orderRef && orderSnapshot?.exists)
      transaction.update(orderRef, { paymentStatus: "FAILED", updatedAt: now });
    transaction.update(checkoutRef, {
      status: "FAILED",
      razorpayPaymentId: razorpayPaymentId || null,
      updatedAt: now,
    });
    if (
      attemptRef &&
      attemptSnapshot?.exists &&
      attemptSnapshot.data()?.razorpayOrderId === razorpayOrderId
    )
      transaction.update(attemptRef, { status: "FAILED", updatedAt: now });
  });
}
