import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = getAdminDb();
    const adminSnapshot = await db.collection("admins").doc(user.uid).get();
    if (!adminSnapshot.exists)
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const [visitorSnapshot, attemptSnapshot] = await Promise.all([
      db.collection("siteVisitors").orderBy("lastSeenAt", "desc").limit(1000).get(),
      db.collection("checkoutAttempts").orderBy("updatedAt", "desc").limit(500).get(),
    ]);
    return NextResponse.json(
      {
        visitors: visitorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        attempts: attemptSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load analytics";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
