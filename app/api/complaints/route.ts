import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      type?: string;
      description?: string;
      orderId?: string;
      utr?: string;
    };
    const type = String(body.type || "").toUpperCase();
    const description = String(body.description || "").trim();
    const utr = String(body.utr || "").trim();
    const orderId = String(body.orderId || "").trim();
    if (
      !["PAYMENT", "REFUND", "OTHER"].includes(type) ||
      description.length < 10 ||
      description.length > 2000
    )
      return NextResponse.json(
        {
          error:
            "Please select a complaint type and describe the issue (minimum 10 characters).",
        },
        { status: 400 },
      );
    if (type === "REFUND" && !utr)
      return NextResponse.json(
        {
          error:
            "Please enter the payment UTR / transaction reference for a refund request.",
        },
        { status: 400 },
      );
    const adminDb = getAdminDb();
    if (orderId) {
      const order = await adminDb.collection("orders").doc(orderId).get();
      if (!order.exists || order.data()?.customerId !== user.uid)
        return NextResponse.json(
          { error: "That order is not available for this account." },
          { status: 403 },
        );
    }
    const now = new Date().toISOString();
    const complaintRef = adminDb.collection("complaints").doc();
    await complaintRef.create({
      customerId: user.uid,
      customer: { name: user.name || "", email: user.email || "" },
      orderId: orderId || null,
      type,
      description,
      utr: utr || null,
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
    return NextResponse.json({ complaintId: complaintRef.id });
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
