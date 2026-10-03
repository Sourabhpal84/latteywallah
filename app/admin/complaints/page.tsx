"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { dateTime, StatusBadge } from "@/components/order-ui";
import { useToast } from "@/components/toast";

const statuses = ["OPEN", "ACCEPTED", "VERIFYING", "SOLVED", "UNSOLVED"];
type Complaint = {
  id: string;
  customer?: { name?: string; email?: string };
  type?: string;
  description?: string;
  utr?: string;
  orderId?: string;
  status?: string;
  adminNote?: string;
  unsolvedReason?: string;
  createdAt?: string;
  statusHistory?: unknown[];
};
export default function AdminComplaintsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<Complaint[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("OPEN");
  const [editing, setEditing] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!auth) return;
    let stop: (() => void) | undefined;
    return auth.onAuthStateChanged((user) => {
      stop?.();
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      stop = onSnapshot(
        collection(db, "complaints"),
        (snapshot) => {
          setItems(
            snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }) as Complaint)
              .sort((a, b) =>
                String(b.createdAt).localeCompare(String(a.createdAt)),
              ),
          );
          setReady(true);
        },
        () => setReady(true),
      );
    });
  }, []);
  const visible = useMemo(
    () =>
      items.filter(
        (item) => filter === "ALL" || (item.status || "OPEN") === filter,
      ),
    [items, filter],
  );
  const update = async (item: Complaint, status: string) => {
    if (saving) return;
    if (status === "UNSOLVED" && !reason.trim()) {
      notify({ kind: "error", title: "Add an unsolved reason first" });
      return;
    }
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      await updateDoc(doc(db, "complaints", item.id), {
        status,
        adminNote: note.trim(),
        unsolvedReason: status === "UNSOLVED" ? reason.trim() : "",
        updatedAt: timestamp,
        statusHistory: [
          ...(item.statusHistory || []),
          {
            status,
            timestamp,
            note: note.trim() || (status === "UNSOLVED" ? reason.trim() : ""),
          },
        ],
      });
      setEditing("");
      setNote("");
      setReason("");
      notify({
        kind: "success",
        title: "Complaint updated",
        message: `Status changed to ${status}`,
      });
    } catch {
      notify({ kind: "error", title: "Unable to update complaint" });
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">CUSTOMER CARE</p>
          <h1>Complaints</h1>
        </div>
        <div className="admin-header-actions">
          <Link className="button button-outline" href="/admin/orders">
            ORDERS
          </Link>
          <Link className="button button-outline" href="/admin">
            CATALOG
          </Link>
        </div>
      </header>
      <section className="admin-content complaints-admin">
        <div className="orders-heading">
          <div>
            <p className="eyebrow">SUPPORT DESK</p>
            <h2>Resolve every issue.</h2>
          </div>
          <span className="live-indicator">● LIVE</span>
        </div>
        <div className="order-filters">
          {["ALL", ...statuses].map((status) => (
            <button
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
              key={status}
            >
              {status}{" "}
              {status === "ALL"
                ? `(${items.length})`
                : `(${items.filter((item) => (item.status || "OPEN") === status).length})`}
            </button>
          ))}
        </div>
        {!ready ? (
          <div className="orders-state">Loading complaints…</div>
        ) : (
          <div className="admin-complaint-list">
            {visible.length ? (
              visible.map((item) => (
                <article key={item.id}>
                  <div className="admin-complaint-head">
                    <div>
                      <p className="eyebrow">
                        {item.type} · {dateTime(item.createdAt)}
                      </p>
                      <h3>{item.customer?.name || "Customer"}</h3>
                      <small>
                        {item.customer?.email || "—"} · #{item.id.slice(0, 8)}
                      </small>
                    </div>
                    <StatusBadge status={item.status || "OPEN"} />
                  </div>
                  <p>{item.description}</p>
                  {item.utr && (
                    <p>
                      <b>Payment UTR:</b> {item.utr}
                    </p>
                  )}
                  {item.orderId && (
                    <p>
                      <b>Order:</b> {item.orderId}
                    </p>
                  )}
                  {editing === item.id ? (
                    <div className="complaint-admin-edit">
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Visible update for customer (optional)"
                      />
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Required only if marking unsolved"
                      />
                      <div>
                        {statuses
                          .filter(
                            (status) => status !== (item.status || "OPEN"),
                          )
                          .map((status) => (
                            <button
                              className={`button ${status === "UNSOLVED" ? "button-danger" : "button-dark"}`}
                              disabled={saving}
                              key={status}
                              onClick={() => update(item, status)}
                            >
                              {status}
                            </button>
                          ))}
                        <button
                          className="button button-outline"
                          onClick={() => setEditing("")}
                        >
                          CLOSE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="complaint-admin-actions">
                      <button
                        className="button button-dark"
                        onClick={() => {
                          setEditing(item.id);
                          setNote(item.adminNote || "");
                          setReason(item.unsolvedReason || "");
                        }}
                      >
                        UPDATE STATUS
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="orders-state">
                No complaints match this filter.
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
