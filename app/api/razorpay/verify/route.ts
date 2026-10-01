import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminDb, requireUser } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request); const adminDb = getAdminDb()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ verified: false, error: 'Missing payment verification data' }, { status: 400 })
    const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex'); const valid = expected.length === razorpay_signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
    if (!valid) return NextResponse.json({ verified: false, error: 'Invalid payment signature' }, { status: 400 })
    const checkoutRef = adminDb.collection('checkoutRequests').doc(razorpay_order_id); const checkoutSnapshot = await checkoutRef.get(); if (!checkoutSnapshot.exists) return NextResponse.json({ verified: false, error: 'Payment order not found' }, { status: 404 })
    const checkout = checkoutSnapshot.data() as { customerId: string; customer: object; deliveryAddress: object; items: object[]; subtotal: number; deliveryCharge: number; totalAmount: number; amountPaise: number; status?: string; orderId?: string }
    if (checkout.customerId !== user.uid) return NextResponse.json({ verified: false, error: 'Payment owner mismatch' }, { status: 403 })
    if (checkout.status === 'PAID' && checkout.orderId) return NextResponse.json({ verified: true, orderId: checkout.orderId })
    if (!process.env.RAZORPAY_KEY_ID) return NextResponse.json({ verified: false, error: 'Razorpay is not configured' }, { status: 503 })
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}` } }); const payment = await paymentResponse.json() as { status?: string; amount?: number }
    if (!paymentResponse.ok || !['authorized', 'captured'].includes(payment.status || '') || payment.amount !== checkout.amountPaise) return NextResponse.json({ verified: false, error: 'Payment was not captured for the expected amount' }, { status: 400 })
    const now = new Date().toISOString(); const result = await adminDb.runTransaction(async transaction => { const counterRef = adminDb.collection('counters').doc('orders'); const counterSnapshot = await transaction.get(counterRef); const nextNumber = Number(counterSnapshot.data()?.nextNumber || 10000) + 1; const orderRef = adminDb.collection('orders').doc(); const displayOrderId = `LW-${nextNumber}`; transaction.set(counterRef, { nextNumber, updatedAt: now }, { merge: true }); transaction.create(orderRef, { displayOrderId, customerId: checkout.customerId, customer: checkout.customer, deliveryAddress: checkout.deliveryAddress, items: checkout.items, subtotal: checkout.subtotal, discount: 0, deliveryCharge: checkout.deliveryCharge, totalAmount: checkout.totalAmount, paymentMethod: 'RAZORPAY', paymentStatus: 'PAID', orderStatus: 'NEW', statusHistory: [{ status: 'PLACED', timestamp: now }, { status: 'PAYMENT CONFIRMED', timestamp: now }], razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, createdAt: now, updatedAt: now }); return { id: orderRef.id, displayOrderId } })
    await checkoutRef.update({ status: 'PAID', orderId: result.id, updatedAt: now })
    return NextResponse.json({ verified: true, orderId: result.id, displayOrderId: result.displayOrderId })
  } catch (error) { return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : 'Payment verification failed' }, { status: 400 }) }
}
