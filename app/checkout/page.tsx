"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  MessageCircle,
  Trash2,
} from "lucide-react";
import {
  calculateDelivery,
  defaultDeliverySettings,
  defaultServiceArea,
  getBulkOrderUrl,
  isServiceableLocation,
  locationForPincode,
  serviceableLocations,
  serviceableStates,
} from "@/lib/commerce";
import { auth } from "@/lib/firebase";
import { CART_UPDATED_EVENT, CartLine, readCart, writeCart } from "@/lib/cart";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function CheckoutPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    instructions: "",
  });
  const [outside, setOutside] = useState(false);
  const [userId, setUserId] = useState("");
  const [userReady, setUserReady] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    setLines(readCart());
    const sync = () => setLines(readCart());
    window.addEventListener(CART_UPDATED_EVENT, sync);
    return () => window.removeEventListener(CART_UPDATED_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!auth) {
      setUserReady(true);
      return;
    }
    return auth.onAuthStateChanged(async (user) => {
      setUserId(user?.uid || "");
      if (user) {
        const customer = await getDoc(doc(db, "customers", user.uid));
        const data = customer.data() || {};
        const saved =
          (data.addresses || []).find(
            (address: { isDefault?: boolean }) => address.isDefault,
          ) || data;
        if (saved?.address)
          setForm({
            name: String(saved.name || ""),
            phone: String(saved.phone || ""),
            address: String(saved.address || ""),
            city: String(saved.city || ""),
            state: String(saved.state || ""),
            pincode: String(saved.pincode || ""),
            instructions: String(saved.instructions || ""),
          });
      }
      setUserReady(true);
    });
  }, []);
  const updateQuantity = (index: number, amount: number) => {
    const next = lines
      .map((line, itemIndex) =>
        itemIndex === index
          ? { ...line, quantity: Math.max(0, line.quantity + amount) }
          : line,
      )
      .filter((line) => line.quantity > 0);
    setLines(next);
    writeCart(next);
  };
  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.price * line.quantity, 0),
    [lines],
  );
  const settings =
    typeof window !== "undefined"
      ? JSON.parse(
          localStorage.getItem("lattey-wala-delivery-settings") ||
            JSON.stringify(defaultDeliverySettings),
        )
      : defaultDeliverySettings;
  const serviceArea =
    typeof window !== "undefined"
      ? JSON.parse(
          localStorage.getItem("lattey-wala-service-area") ||
            JSON.stringify(defaultServiceArea),
        )
      : defaultServiceArea;
  const delivery = calculateDelivery(subtotal, settings);
  const total = subtotal + delivery;
  const changePincode = (value: string) => {
    const pincode = value.replace(/\D/g, "").slice(0, 6);
    const detected =
      pincode.length === 6 ? locationForPincode(pincode) : undefined;
    setForm((current) => ({
      ...current,
      pincode,
      ...(detected ? { state: detected.state } : {}),
    }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!navigator.onLine) {
      setError("You’re offline. Reconnect before opening payment.");
      return;
    }
    if (!lines.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!userReady || !userId || !auth?.currentUser) {
      window.location.href = "/account/login";
      return;
    }
    if (!isServiceableLocation(form.city, form.pincode, serviceArea)) {
      setOutside(true);
      return;
    }
    setProcessing(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const createResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: lines, address: form }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok)
        throw new Error(created.error || "Unable to start payment");
      if (!(await loadRazorpay()) || !window.Razorpay)
        throw new Error("Payment window could not be loaded");
      const razorpay = new window.Razorpay({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        name: "lattey wala",
        description: "lattey wala order",
        order_id: created.orderId,
        prefill: {
          name: form.name,
          contact: form.phone,
          email: auth.currentUser.email || "",
        },
        theme: { color: "#111111" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verificationToken = await auth.currentUser!.getIdToken();
            const verification = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${verificationToken}`,
              },
              body: JSON.stringify(response),
            });
            const result = await verification.json();
            if (!verification.ok || !result.verified)
              throw new Error(result.error || "Payment verification failed");
            writeCart([]);
            window.location.href = `/order-success/${result.orderId}`;
          } catch (verificationError) {
            setProcessing(false);
            setError(
              verificationError instanceof Error
                ? verificationError.message
                : "Payment verification failed",
            );
          }
        },
      });
      razorpay.open();
    } catch (submitError) {
      setProcessing(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start payment",
      );
    }
  };
  const bulkUrl = getBulkOrderUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999",
    {
      name: form.name,
      phone: form.phone,
      location: `${form.city}, ${form.state}, ${form.pincode}`,
      requirement:
        form.instructions ||
        "Please share available products and delivery options.",
    },
  );
  if (!lines.length)
    return (
      <main className="checkout-page">
        <header className="detail-header">
          <Link href="/#shop" className="back-link">
            <ArrowLeft size={16} /> BROWSE MENU
          </Link>
          <Link href="/" className="logo">
            LATTEY <span>wala</span>
          </Link>
          <span className="eyebrow">CHECKOUT</span>
        </header>
        <section className="checkout-empty">
          <p className="eyebrow">YOUR CART</p>
          <h1>Your cart is empty</h1>
          <p>Add something delicious before continuing.</p>
          <Link className="button button-dark" href="/#shop">
            BROWSE MENU <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    );
  return (
    <main className="checkout-page">
      <header className="detail-header">
        <Link href="/#shop" className="back-link">
          <ArrowLeft size={16} /> BROWSE MENU
        </Link>
        <Link href="/" className="logo">
          LATTEY <span></span>
        </Link>
        <span className="eyebrow">CART → DELIVERY → PAYMENT</span>
      </header>
      <div className="food-checkout">
        <section>
          <p className="eyebrow">DELIVERY DETAILS</p>
          <h1>Place your order</h1>
          <form className="checkout-form" onSubmit={submit}>
            <label>
              Full name *
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
                pattern="[0-9]{10}"
                maxLength={10}
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </label>
            <label className="wide">
              Full address *
              <textarea
                required
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </label>
            <label>
              City *
              <select
                required
                value={form.city}
                onChange={(event) => {
                  const city = serviceableLocations.find(
                    (location) => location.city === event.target.value,
                  );
                  setForm({
                    ...form,
                    city: event.target.value,
                    state: city?.state || "",
                  });
                }}
              >
                <option value="">Select city</option>
                {serviceableLocations.map((location) => (
                  <option key={location.city} value={location.city}>
                    {location.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              State *
              <select
                required
                value={form.state}
                onChange={(event) =>
                  setForm({ ...form, state: event.target.value })
                }
              >
                <option value="">Select state</option>
                {serviceableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pincode *
              <input
                required
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={form.pincode}
                onChange={(event) => changePincode(event.target.value)}
              />
              <small className="field-help">
                Enter your 6-digit pincode. Serviceability is checked
                automatically.
              </small>
            </label>
            <label className="wide">
              Delivery instructions{" "}
              <textarea
                placeholder="Optional"
                value={form.instructions}
                onChange={(event) =>
                  setForm({ ...form, instructions: event.target.value })
                }
              />
            </label>
            {error && <p className="checkout-error wide">{error}</p>}
            <button
              className="button button-dark wide checkout-button"
              disabled={processing}
              type="submit"
            >
              {processing ? "OPENING PAYMENT…" : "PAY WITH RAZORPAY"}{" "}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="bulk-link" onClick={() => setOutside(true)}>
            Bulk order / outside NCR? <span>WhatsApp us →</span>
          </p>
        </section>
        <aside className="summary">
          <p className="eyebrow">ORDER SUMMARY</p>
          {lines.map((line, index) => (
            <div
              className="summary-line"
              key={`${line.productId}-${line.color}-${line.size}-${line.sku}`}
            >
              <img src={line.image} alt="" />
              <div>
                <b>{line.name}</b>
                <span>
                  {line.color} · {line.size || "One size"}
                </span>
                <div className="summary-quantity">
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, -1)}
                  >
                    <Minus size={13} />
                  </button>
                  <b>{line.quantity}</b>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, 1)}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, -line.quantity)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <strong>{money(line.price * line.quantity)}</strong>
            </div>
          ))}
          <div className="summary-total">
            <p>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </p>
            <p>
              <span>Delivery fee</span>
              <b>{delivery ? money(delivery) : "FREE"}</b>
            </p>
            <p className="grand">
              <span>Total</span>
              <b>{money(total)}</b>
            </p>
          </div>
          <small>
            Free delivery on orders above{" "}
            {money(settings.freeDeliveryThreshold)}.
          </small>
        </aside>
      </div>
      {outside && (
        <div className="modal-backdrop">
          <div className="service-modal">
            <button className="modal-close" onClick={() => setOutside(false)}>
              ×
            </button>
            <p className="eyebrow">DELIVERY AREA</p>
            <h2>Sorry, we currently deliver only within Delhi NCR.</h2>
            <p>Need a bulk order or delivery outside our service area?</p>
            <a
              className="button whatsapp full"
              href={bulkUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> BULK ORDER / CONTACT US
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
