import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as { checkoutKey?: string };
    const checkoutKey = String(body.checkoutKey || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
    if (!checkoutKey)
      return NextResponse.json({ abandoned: false }, { status: 400 });
    const db = getAdminDb();
    const attemptRef = db.collection("checkoutAttempts").doc(`${user.uid}_${checkoutKey}`);
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const attemptSnapshot = await transaction.get(attemptRef);
      if (!attemptSnapshot.exists) return;
      const attempt = attemptSnapshot.data() || {};
      if (attempt.customerId !== user.uid || attempt.status === "PAID") return;
      const razorpayOrderId = String(attempt.razorpayOrderId || "");
      const checkoutRef = razorpayOrderId
        ? db.collection("checkoutRequests").doc(razorpayOrderId)
        : undefined;
      const checkoutSnapshot = checkoutRef
        ? await transaction.get(checkoutRef)
        : undefined;
      if (checkoutSnapshot?.exists && checkoutSnapshot.data()?.status !== "PAID")
        transaction.update(checkoutRef!, { status: "ABANDONED", updatedAt: now });
      transaction.update(attemptRef, { status: "ABANDONED", updatedAt: now });
    });
    return NextResponse.json({ abandoned: true });
  } catch {
    return NextResponse.json({ abandoned: false }, { status: 401 });
  }
}
