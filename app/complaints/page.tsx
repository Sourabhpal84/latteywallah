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
  transactionId?: string;
  orderReference?: string;
  status?: string;
  adminNote?: string;
  unsolvedReason?: string;
  createdAt?: string;
};
const initialForm = {
  type: "PAYMENT",
  orderId: "",
  utr: "",
  transactionId: "",
  amount: "",
  paymentDate: "",
  name: "",
  phone: "",
  email: "",
  description: "",
};
export default function ComplaintsPage() {
  const { notify } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  useEffect(() => {
    if (!auth) {
      setReady(true);
      return;
    }
    let stop: (() => void) | undefined;
    return auth.onAuthStateChanged((user) => {
      stop?.();
      setSignedIn(Boolean(user));
      if (!user) {
        setReady(true);
        return;
      }
      setForm((current) => ({
        ...current,
        name: current.name || user.displayName || "",
        email: current.email || user.email || "",
      }));
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
  const paymentRequest = form.type === "PAYMENT" || form.type === "REFUND";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const token = auth?.currentUser
        ? await auth.currentUser.getIdToken()
        : "";
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setForm((current) => ({
        ...initialForm,
        name: current.name,
        phone: current.phone,
        email: current.email,
      }));
      notify({
        kind: "success",
        title: "Request submitted",
        message: result.guest
          ? `Reference: #${result.complaintId.slice(0, 8)}. We will contact you.`
          : "Our team will update the status here.",
      });
    } catch (error) {
      notify({
        kind: "error",
        title: "Request not submitted",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="order-page">
      <header className="detail-header">
        <Link href={signedIn ? "/account" : "/"} className="back-link">
          <ArrowLeft size={16} /> {signedIn ? "ACCOUNT" : "STORE"}
        </Link>
        <span className="logo">HELP & COMPLAINTS</span>
      </header>
      <section className="complaints-page">
        <div className="complaints-intro">
          <p className="eyebrow">WE’RE HERE TO HELP</p>
          <h1>Raise a complaint.</h1>
          <p>
            You do not need an order ID. For a payment with no order, share your
            transaction details. General questions are welcome too.
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
                <option value="GENERAL">
                  General question / other problem
                </option>
              </select>
            </label>
            {!signedIn && (
              <>
                <label>
                  Your name *
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Mobile number *
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                </label>
                <label>
                  Email address *
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {paymentRequest && (
              <>
                <p className="payment-details-note">
                  No order ID is needed. Please enter the details from your
                  bank/UPI/Razorpay payment.
                </p>
                <label>
                  Payment UTR / reference number *
                  <input
                    value={form.utr}
                    onChange={(event) =>
                      setForm({ ...form, utr: event.target.value })
                    }
                    placeholder="UTR / UPI reference number"
                    required={!form.transactionId}
                  />
                </label>
                <label>
                  Razorpay payment / transaction ID *
                  <input
                    value={form.transactionId}
                    onChange={(event) =>
                      setForm({ ...form, transactionId: event.target.value })
                    }
                    placeholder="Optional if UTR is available"
                    required={!form.utr}
                  />
                </label>
                <label>
                  Paid amount (₹)
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    placeholder="Example: 798"
                  />
                </label>
                <label>
                  Payment date / time
                  <input
                    type="datetime-local"
                    value={form.paymentDate}
                    onChange={(event) =>
                      setForm({ ...form, paymentDate: event.target.value })
                    }
                  />
                </label>
                <label>
                  Order ID (only if one was shown)
                  <input
                    value={form.orderId}
                    onChange={(event) =>
                      setForm({ ...form, orderId: event.target.value })
                    }
                    placeholder="Leave empty if no order was created"
                  />
                </label>
              </>
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
                placeholder={
                  paymentRequest
                    ? "Mention payment method and any useful details."
                    : "Ask your question or describe the problem."
                }
              />
            </label>
            <button className="button button-dark" disabled={saving}>
              {saving ? "SUBMITTING…" : "SUBMIT REQUEST"}{" "}
              <ArrowRight size={15} />
            </button>
          </form>
          <aside className="complaint-help">
            <MessageSquareWarning size={24} />
            <h2>No order after payment?</h2>
            <p>
              That is exactly what this form is for. Enter the UTR or payment
              reference—an order ID is not required.
            </p>
            <IndianRupee size={24} />
            <h2>Refund or general help</h2>
            <p>
              For refunds, provide the payment reference. For a normal question,
              choose General question—no payment or order details are needed.
              Never share PIN, CVV, or OTP.
            </p>
          </aside>
        </div>
        {signedIn && (
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
                            : "General support request"}
                      </b>
                      <small>
                        {dateTime(item.createdAt)} · #{item.id.slice(0, 8)}
                      </small>
                      <p>{item.description}</p>
                      {(item.utr || item.transactionId) && (
                        <small>
                          Reference: {item.utr || item.transactionId}
                        </small>
                      )}
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
              <div className="orders-state">No requests raised yet.</div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
