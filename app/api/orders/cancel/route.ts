import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";
const cancellableStatuses = new Set(["NEW", "CONFIRMED", "PREPARING", "READY"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const { orderId } = (await request.json()) as { orderId?: string };
    if (!orderId)
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection("orders").doc(orderId);
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order not found");
      const order = snapshot.data() as {
        customerId?: string;
        orderStatus?: string;
        statusHistory?: unknown[];
      };
      if (order.customerId !== user.uid)
        throw new Error("You cannot cancel this order");
      if (!cancellableStatuses.has(order.orderStatus || "NEW"))
        throw new Error(
          "This order has already been dispatched and can no longer be cancelled",
        );
      const now = new Date().toISOString();
      const history = Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [];
      transaction.update(orderRef, {
        orderStatus: "CANCELLED",
        cancelledBy: "CUSTOMER",
        cancelledAt: now,
        updatedAt: now,
        statusHistory: [
          ...history,
          {
            status: "CANCELLED",
            timestamp: now,
            note: "Cancelled by customer before dispatch.",
          },
        ],
      });
    });
    return NextResponse.json({ cancelled: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to cancel order",
      },
      { status: 400 },
    );
  }
}
