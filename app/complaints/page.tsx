"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  IndianRupee,
  MessageSquareWarning,
} from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/components/toast";
import { dateTime, StatusBadge } from "@/components/order-ui";

type Complaint = {
  id: string;
  type?: string;
  description?: string;
  utr?: string;
  orderId?: string;
  status?: string;
  adminNote?: string;
  unsolvedReason?: string;
  createdAt?: string;
};
export default function ComplaintsPage() {
  const { notify } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "PAYMENT",
    orderId: "",
    utr: "",
    description: "",
  });
  useEffect(() => {
    if (!auth) return;
    let stop: (() => void) | undefined;
    return auth.onAuthStateChanged((user) => {
      stop?.();
      if (!user) {
        setReady(true);
        return;
      }
      stop = onSnapshot(
        query(
          collection(db, "complaints"),
          where("customerId", "==", user.uid),
        ),
        (snapshot) => {
          setComplaints(
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
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth?.currentUser || saving) {
      window.location.href = "/account/login";
      return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setForm({ type: "PAYMENT", orderId: "", utr: "", description: "" });
      notify({
        kind: "success",
        title: "Complaint submitted",
        message: "Our team will update its status here.",
      });
    } catch (error) {
      notify({
        kind: "error",
        title: "Complaint not submitted",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="order-page">
      <header className="detail-header">
        <Link href="/account" className="back-link">
          <ArrowLeft size={16} /> ACCOUNT
        </Link>
        <span className="logo">HELP & COMPLAINTS</span>
      </header>
      <section className="complaints-page">
        <div className="complaints-intro">
          <p className="eyebrow">WE’RE HERE TO HELP</p>
          <h1>Raise a complaint.</h1>
          <p>
            For missing order details after payment, refund requests, or any
            other issue. You will see every update here.
          </p>
        </div>
        <div className="complaint-layout">
          <form className="complaint-form" onSubmit={submit}>
            <p className="eyebrow">NEW REQUEST</p>
            <label>
              Issue type
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                <option value="PAYMENT">
                  Payment successful, but order missing
                </option>
                <option value="REFUND">Request a payment refund</option>
                <option value="OTHER">Other problem</option>
              </select>
            </label>
            <label>
              Order ID{" "}
              <input
                value={form.orderId}
                onChange={(event) =>
                  setForm({ ...form, orderId: event.target.value })
                }
                placeholder="Optional — e.g. Firestore order ID"
              />
            </label>
            {form.type === "REFUND" && (
              <label>
                Payment UTR / transaction reference *
                <input
                  required
                  value={form.utr}
                  onChange={(event) =>
                    setForm({ ...form, utr: event.target.value })
                  }
                  placeholder="Enter UTR / payment reference"
                />
              </label>
            )}
            <label>
              Tell us what happened *
              <textarea
                required
                minLength={10}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Include payment time, amount, order details, or any helpful information."
              />
            </label>
            <button className="button button-dark" disabled={saving}>
              {saving ? "SUBMITTING…" : "SUBMIT COMPLAINT"}{" "}
              <ArrowRight size={15} />
            </button>
          </form>
          <aside className="complaint-help">
            <MessageSquareWarning size={24} />
            <h2>Payment issue?</h2>
            <p>
              If payment was successful but no order appears, select the payment
              option and add the transaction details. Our team will verify it
              securely.
            </p>
            <IndianRupee size={24} />
            <h2>Need a refund?</h2>
            <p>
              Choose refund and provide the UTR / payment reference. Never share
              card PIN, CVV, or OTP.
            </p>
          </aside>
        </div>
        <div className="complaint-history">
          <div>
            <p className="eyebrow">YOUR REQUESTS</p>
            <h2>Complaint status</h2>
          </div>
          {!ready ? (
            <div className="orders-state">Loading your requests…</div>
          ) : complaints.length ? (
            complaints.map((item) => (
              <article key={item.id}>
                <div>
                  <span className="complaint-icon">
                    <CircleHelp size={18} />
                  </span>
                  <div>
                    <b>
                      {item.type === "REFUND"
                        ? "Refund request"
                        : item.type === "PAYMENT"
                          ? "Payment & order issue"
                          : "Support request"}
                    </b>
                    <small>
                      {dateTime(item.createdAt)} · #{item.id.slice(0, 8)}
                    </small>
                    <p>{item.description}</p>
                    {item.utr && <small>UTR: {item.utr}</small>}
                  </div>
                </div>
                <div className="complaint-status">
                  <StatusBadge status={item.status || "OPEN"} />
                  {item.adminNote && (
                    <p>
                      <b>Team update:</b> {item.adminNote}
                    </p>
                  )}
                  {item.unsolvedReason && (
                    <p className="complaint-unsolved">
                      <b>Unsolved reason:</b> {item.unsolvedReason}
                    </p>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="orders-state">No complaints raised yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
