import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const user = authorization.startsWith("Bearer ")
      ? await getAdminAuth().verifyIdToken(authorization.slice(7))
      : null;
    const body = (await request.json()) as {
      type?: string;
      description?: string;
      orderId?: string;
      utr?: string;
      transactionId?: string;
      amount?: string;
      paymentDate?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    const type = String(body.type || "").toUpperCase();
    const description = String(body.description || "").trim();
    const utr = String(body.utr || "").trim();
    const transactionId = String(body.transactionId || "").trim();
    const orderReference = String(body.orderId || "").trim();
    const name = String(body.name || user?.name || "").trim();
    const phone = String(body.phone || "")
      .replace(/\D/g, "")
      .slice(0, 15);
    const email = String(body.email || user?.email || "").trim();
    if (
      !["PAYMENT", "REFUND", "GENERAL"].includes(type) ||
      description.length < 10 ||
      description.length > 2000
    )
      return NextResponse.json(
        {
          error:
            "Please select a request type and describe the issue (minimum 10 characters).",
        },
        { status: 400 },
      );
    if (!user && (!name || phone.length < 10 || !email))
      return NextResponse.json(
        {
          error:
            "Please enter your name, mobile number and email so our team can contact you.",
        },
        { status: 400 },
      );
    if (["PAYMENT", "REFUND"].includes(type) && !utr && !transactionId)
      return NextResponse.json(
        {
          error:
            "Enter your payment UTR or transaction ID so we can verify the payment.",
        },
        { status: 400 },
      );
    const adminDb = getAdminDb();
    let orderId: string | null = null;
    if (orderReference && user) {
      const order = await adminDb
        .collection("orders")
        .doc(orderReference)
        .get();
      if (order.exists && order.data()?.customerId === user.uid)
        orderId = orderReference;
    }
    const now = new Date().toISOString();
    const complaintRef = adminDb.collection("complaints").doc();
    await complaintRef.create({
      customerId: user?.uid || null,
      customer: { name, phone, email },
      orderId,
      orderReference: orderReference || null,
      type,
      description,
      utr: utr || null,
      transactionId: transactionId || null,
      paymentAmount: String(body.amount || "").trim() || null,
      paymentDate: String(body.paymentDate || "").trim() || null,
      status: "OPEN",
      adminNote: "",
      unsolvedReason: "",
      statusHistory: [
        {
          status: "OPEN",
          timestamp: now,
          note: "Complaint submitted by customer.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ complaintId: complaintRef.id, guest: !user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit complaint",
      },
      { status: 400 },
    );
  }
}
