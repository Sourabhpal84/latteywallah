import { NextResponse } from "next/server";
import { getAdminDb, requireUser } from "@/lib/firebase-admin";
import { isValidPincode, normalizePincode } from "@/lib/commerce";
import { calculateCouponDiscount, CouponRecord } from "@/lib/coupons";

export const runtime = "nodejs";
type ClientItem = {
  productId: string;
  name?: string;
  color?: string;
  size?: string;
  quantity?: number;
  sku?: string;
};
type Address = {
  name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  instructions?: string;
};
type VerifiedItem = {
  productId: string;
  name: string;
  image: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
};

const razorpayHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
  "Content-Type": "application/json",
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      items?: ClientItem[];
      address?: Address;
      checkoutKey?: string;
      couponCode?: string;
    };
    const address = body.address || {};
    const items = body.items || [];
    const checkoutKey = String(body.checkoutKey || "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 100);
    if (!checkoutKey)
      return NextResponse.json(
        { error: "Invalid checkout session. Please try again." },
        { status: 400 },
      );
    if (
      !items.length ||
      !address.name ||
      !address.phone ||
      !address.address ||
      !address.pincode
    )
      return NextResponse.json(
        { error: "Complete delivery details are required" },
        { status: 400 },
      );
    const pincode = normalizePincode(address.pincode);
    if (!isValidPincode(pincode))
      return NextResponse.json(
        { error: "Enter a valid 6-digit pincode." },
        { status: 400 },
      );
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      return NextResponse.json(
        { error: "Razorpay is not configured on the server" },
        { status: 503 },
      );

    const adminDb = getAdminDb();
    const verifiedItems: VerifiedItem[] = [];
    for (const item of items) {
      const quantity = Math.floor(Number(item.quantity));
      if (
        !item.productId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      )
        return NextResponse.json(
          { error: "Invalid cart item" },
          { status: 400 },
        );
      const productSnapshot = await adminDb
        .collection("products")
        .doc(item.productId)
        .get();
      if (!productSnapshot.exists)
        return NextResponse.json(
          { error: "A product is no longer available" },
          { status: 400 },
        );
      const product = productSnapshot.data() as {
        name?: string;
        image?: string;
        variants?: Array<{
          color?: string;
          size?: string;
          price?: number;
          stock?: number;
          sku?: string;
        }>;
        price?: number;
        active?: boolean;
      };
      if (product.active === false)
        return NextResponse.json(
          { error: "A product is no longer available" },
          { status: 400 },
        );
      const variant = product.variants?.find(
        (value) =>
          value.sku === item.sku &&
          value.color === item.color &&
          value.size === item.size,
      );
      const unitPrice = Number(variant?.price ?? product.price);
      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        (variant && Number(variant.stock) < quantity)
      )
        return NextResponse.json(
          { error: `${product.name || "Item"} is out of stock` },
          { status: 400 },
        );
      verifiedItems.push({
        productId: item.productId,
        name: product.name || item.name || "Product",
        image: product.image || "",
        color: variant?.color || item.color || "",
        size: variant?.size || item.size || "",
        sku: variant?.sku || item.sku || item.productId,
        quantity,
        price: unitPrice,
        total: unitPrice * quantity,
      });
    }
    const areaSnapshot = await adminDb
      .collection("serviceAreas")
      .doc(pincode)
      .get();
    const configuredDeliveryCharge = Number(
      areaSnapshot.data()?.deliveryCharge,
    );
    const freeDeliveryAbove = Number(areaSnapshot.data()?.freeDeliveryAbove);
    if (
      !areaSnapshot.exists ||
      areaSnapshot.data()?.enabled === false ||
      !Number.isFinite(configuredDeliveryCharge) ||
      configuredDeliveryCharge < 0
    )
      return NextResponse.json(
        { error: "Delivery is currently unavailable at this pincode." },
        { status: 400 },
      );
    const subtotal = verifiedItems.reduce(
      (total, item) => total + item.total,
      0,
    );
    const couponCode = String(body.couponCode || "").trim().toUpperCase();
    let discount = 0;
    if (couponCode) {
      if (!/^[A-Z0-9_-]{3,30}$/.test(couponCode))
        return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });
      const couponSnapshot = await adminDb.collection("coupons").doc(couponCode).get();
      if (!couponSnapshot.exists)
        return NextResponse.json({ error: "Coupon code not found." }, { status: 400 });
      try {
        discount = calculateCouponDiscount(couponSnapshot.data() as CouponRecord, subtotal);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Coupon cannot be applied." }, { status: 400 });
      }
    }
    const deliveryCharge =
      Number.isFinite(freeDeliveryAbove) &&
      freeDeliveryAbove > 0 &&
      subtotal >= freeDeliveryAbove
        ? 0
        : configuredDeliveryCharge;
    const configuredTaxRate = Number(
      (await adminDb.collection("settings").doc("tax").get()).data()?.rate,
    );
    const taxRate =
      Number.isFinite(configuredTaxRate) &&
      configuredTaxRate >= 0 &&
      configuredTaxRate <= 100
        ? configuredTaxRate
        : 0;
    const taxAmount = Math.round((subtotal - discount) * taxRate) / 100;
    const totalAmount = subtotal - discount + deliveryCharge + taxAmount;
    const attemptRef = adminDb
      .collection("checkoutAttempts")
      .doc(`${user.uid}_${checkoutKey}`);
    const now = new Date().toISOString();
    const attempt = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(attemptRef);
      const previous = snapshot.data() as
        | {
            status?: string;
            alreadyPaid?: boolean;
            razorpayOrderId?: string;
            amount?: number;
            currency?: string;
            orderId?: string;
            pincode?: string;
            deliveryCharge?: number;
            taxRate?: number;
            taxAmount?: number;
            couponCode?: string;
            discount?: number;
            fingerprint?: string;
            createdAt?: string;
            updatedAt?: string;
          }
        | undefined;
      if (previous?.status === "PAID" && previous.orderId)
        return { ...previous, alreadyPaid: true };
      if (
        previous?.status === "READY" &&
        previous.razorpayOrderId &&
        previous.orderId &&
        previous.fingerprint === JSON.stringify({ address, verifiedItems, totalAmount, couponCode, discount }) &&
        previous.pincode === pincode &&
        previous.deliveryCharge === deliveryCharge &&
        previous.taxRate === taxRate &&
        previous.taxAmount === taxAmount &&
        (previous.couponCode || "") === couponCode &&
        (previous.discount || 0) === discount
      )
        return previous;
      if (
        previous?.status === "CREATING" &&
        Date.now() - Date.parse(previous.updatedAt || "") < 30_000
      )
        throw new Error(
          "Payment is already being prepared. Please wait a moment.",
        );
      transaction.set(
        attemptRef,
        {
          customerId: user.uid,
          status: "CREATING",
          pincode,
          deliveryCharge,
          taxRate,
          taxAmount,
          couponCode,
          discount,
          subtotal,
          totalAmount,
          customer: {
            name: address.name,
            phone: address.phone,
            email: user.email || "",
          },
          deliveryAddress: {
            name: address.name,
            phone: address.phone,
            address: address.address,
            pincode,
            instructions: address.instructions || "",
          },
          items: verifiedItems,
          fingerprint: JSON.stringify({ address, verifiedItems, totalAmount, couponCode, discount }),
          updatedAt: now,
          createdAt: previous?.createdAt || now,
        },
        { merge: true },
      );
      return undefined;
    });
    if (attempt)
      return NextResponse.json({
        alreadyPaid: attempt.alreadyPaid === true,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: attempt.razorpayOrderId,
        amount: attempt.amount,
        currency: attempt.currency,
        internalOrderId: attempt.orderId,
      });

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: razorpayHeaders(),
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `lw_${Date.now()}`,
        notes: { customerId: user.uid, checkoutKey },
      }),
    });
    if (!razorpayResponse.ok) {
      await attemptRef.set(
        { status: "FAILED", updatedAt: new Date().toISOString() },
        { merge: true },
      );
      return NextResponse.json(
        { error: "Unable to create Razorpay order" },
        { status: 502 },
      );
    }
    const razorpayOrder = (await razorpayResponse.json()) as {
      id: string;
      amount: number;
      currency: string;
    };
    const orderRef = adminDb.collection("orders").doc();
    const createdAt = new Date().toISOString();
    const orderDraft = {
        userId: user.uid,
        customerId: user.uid,
        customer: {
          name: address.name,
          phone: address.phone,
          email: user.email || "",
        },
        deliveryAddress: {
          name: address.name,
          phone: address.phone,
          address: address.address,
          pincode,
          instructions: address.instructions || "",
        },
        items: verifiedItems,
        subtotal,
        discount,
        couponCode: couponCode || null,
        deliveryCharge,
        taxRate,
        taxAmount,
        totalAmount,
        paymentMethod: "RAZORPAY",
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        statusHistory: [
          { status: "PAYMENT CONFIRMED", timestamp: createdAt },
          { status: "CONFIRMED", timestamp: createdAt },
        ],
        razorpayOrderId: razorpayOrder.id,
        razorpayPaymentId: null as string | null,
        createdAt,
        updatedAt: createdAt,
    };
    const created = await adminDb.runTransaction(async (transaction) => {
      const attemptSnapshot = await transaction.get(attemptRef);
      const attemptCreatedAt = String(attemptSnapshot.data()?.createdAt || createdAt);
      transaction.create(
        adminDb.collection("checkoutRequests").doc(razorpayOrder.id),
        {
          orderId: orderRef.id,
          customerId: user.uid,
          customer: orderDraft.customer,
          deliveryAddress: orderDraft.deliveryAddress,
          items: verifiedItems,
          subtotal,
          discount,
          couponCode: couponCode || null,
          deliveryCharge,
          taxRate,
          taxAmount,
          totalAmount,
          amountPaise: razorpayOrder.amount,
          status: "PENDING",
          attemptId: attemptRef.id,
          orderDraft,
          createdAt,
          updatedAt: createdAt,
        },
      );
      transaction.set(
        attemptRef,
        {
          customerId: user.uid,
          status: "READY",
          razorpayOrderId: razorpayOrder.id,
          orderId: orderRef.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          pincode,
          deliveryCharge,
          taxRate,
          taxAmount,
          subtotal,
          discount,
          couponCode: couponCode || null,
          totalAmount,
          customer: orderDraft.customer,
          deliveryAddress: orderDraft.deliveryAddress,
          items: verifiedItems,
          fingerprint: JSON.stringify({ address, verifiedItems, totalAmount, couponCode, discount }),
          createdAt: attemptCreatedAt,
          updatedAt: createdAt,
        },
        { merge: true },
      );
      return { id: orderRef.id };
    });
    return NextResponse.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      internalOrderId: created.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create payment order",
      },
      { status: 400 },
    );
  }
}
