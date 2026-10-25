import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { visitorId?: string; path?: string };
    const visitorId = String(body.visitorId || "");
    if (!/^[0-9a-f-]{36}$/i.test(visitorId))
      return NextResponse.json({ recorded: false }, { status: 400 });
    const path = String(body.path || "/").slice(0, 180).split("?")[0];
    const ref = getAdminDb().collection("siteVisitors").doc(visitorId);
    const now = new Date().toISOString();
    await getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        transaction.update(ref, {
          lastSeenAt: now,
          lastPath: path,
          visits: Number(snapshot.data()?.visits || 0) + 1,
        });
      } else {
        transaction.create(ref, {
          firstSeenAt: now,
          lastSeenAt: now,
          firstPath: path,
          lastPath: path,
          visits: 1,
        });
      }
    });
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 503 });
  }
}
